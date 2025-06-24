-- Mental Commons - Schema Ottimizzato con Performance Enhancements
-- Versione 3.0 - Ottimizzazioni per performance

-- ================================================================
-- STORED PROCEDURES PER QUERY FREQUENTI
-- ================================================================

-- Funzione per statistiche platform aggregate
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'ucme_count', (SELECT COUNT(*) FROM ucmes),
        'risposte_count', (SELECT COUNT(*) FROM responses),
        'portatori_count', (SELECT COUNT(DISTINCT user_id) FROM responses),
        'users_active_last_week', (
            SELECT COUNT(*) 
            FROM users 
            WHERE last_login > NOW() - INTERVAL '7 days'
        ),
        'ucmes_last_24h', (
            SELECT COUNT(*) 
            FROM ucmes 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        ),
        'avg_response_time_hours', (
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM (r.created_at - u.created_at)) / 3600)::numeric, 2)
            FROM responses r
            JOIN ucmes u ON r.ucme_id = u.id
            WHERE r.created_at > NOW() - INTERVAL '30 days'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Funzione per analytics utente specifico
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_ucmes', (
            SELECT COUNT(*) 
            FROM ucmes 
            WHERE user_id = p_user_id
        ),
        'responses_received', (
            SELECT COUNT(*) 
            FROM responses r
            JOIN ucmes u ON r.ucme_id = u.id
            WHERE u.user_id = p_user_id
        ),
        'avg_response_time_hours', (
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM (r.created_at - u.created_at)) / 3600)::numeric, 2)
            FROM responses r
            JOIN ucmes u ON r.ucme_id = u.id
            WHERE u.user_id = p_user_id
        ),
        'days_since_first_ucme', (
            SELECT EXTRACT(DAYS FROM NOW() - MIN(created_at))
            FROM ucmes 
            WHERE user_id = p_user_id
        ),
        'most_used_tone', (
            SELECT tone
            FROM ucmes 
            WHERE user_id = p_user_id AND tone IS NOT NULL
            GROUP BY tone
            ORDER BY COUNT(*) DESC
            LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Funzione per matching UCMe-Portatore ottimizzato
CREATE OR REPLACE FUNCTION assign_ucme_to_portatore(p_ucme_id UUID)
RETURNS UUID AS $$
DECLARE
    selected_portatore UUID;
BEGIN
    -- Selezione portatore con algoritmo bilanciato
    -- Priorità: meno UCMes assegnate, attivo di recente, diverso tono preferito
    
    SELECT u.id INTO selected_portatore
    FROM users u
    LEFT JOIN (
        SELECT r.portatore_id, COUNT(*) as ucme_count
        FROM responses r
        WHERE r.created_at > NOW() - INTERVAL '30 days'
        GROUP BY r.portatore_id
    ) recent_responses ON u.id = recent_responses.portatore_id
    WHERE u.role = 'portatore' 
    AND u.is_active = true
    AND u.last_login > NOW() - INTERVAL '7 days'
    -- Evita autoassegnazione
    AND u.id != (SELECT user_id FROM ucmes WHERE id = p_ucme_id)
    ORDER BY 
        COALESCE(recent_responses.ucme_count, 0) ASC,
        u.last_login DESC,
        RANDOM()
    LIMIT 1;
    
    RETURN selected_portatore;
END;
$$ LANGUAGE plpgsql;

-- Funzione per pulizia dati obsoleti
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Cleanup sessioni scadute
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Cleanup UCMes anonime molto vecchie (oltre 1 anno)
    DELETE FROM ucmes 
    WHERE anonymous = true 
    AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND id NOT IN (SELECT ucme_id FROM responses);
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- INDICI OTTIMIZZATI PER PERFORMANCE
-- ================================================================

-- Indici per query frequenti con CONCURRENTLY per non bloccare
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
ON users (LOWER(email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_login 
ON users (is_active, last_login DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucmes_user_created_desc 
ON ucmes (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucmes_anonymous_created 
ON ucmes (anonymous, created_at DESC) 
WHERE anonymous = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucmes_tone_created 
ON ucmes (tone, created_at DESC) 
WHERE tone IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_responses_ucme_created 
ON responses (ucme_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_responses_portatore_recent 
ON responses (portatore_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token_expires 
ON user_sessions (token, expires_at) 
WHERE expires_at > NOW();

-- Indice composito per ricerche complesse
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucmes_complex_search 
ON ucmes (user_id, tone, anonymous, created_at DESC);

-- ================================================================
-- CONSTRAINTS E TRIGGERS OTTIMIZZATI
-- ================================================================

-- Trigger per aggiornamento automatico last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Aggiorna solo se l'ultimo login è > 1 ora fa per ridurre scritture
    IF OLD.last_login IS NULL OR OLD.last_login < NOW() - INTERVAL '1 hour' THEN
        NEW.last_login = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger solo se necessario
DROP TRIGGER IF EXISTS trigger_update_last_login ON users;
CREATE TRIGGER trigger_update_last_login
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
    EXECUTE FUNCTION update_last_login();

-- Trigger per conteggio automatico risposte
CREATE OR REPLACE FUNCTION update_response_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET response_count = response_count + 1 
        WHERE id = NEW.portatore_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET response_count = response_count - 1 
        WHERE id = OLD.portatore_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_response_count ON responses;
CREATE TRIGGER trigger_response_count
    AFTER INSERT OR DELETE ON responses
    FOR EACH ROW
    EXECUTE FUNCTION update_response_count();

-- ================================================================
-- PARTITIONING PER PERFORMANCE (per datasets grandi)
-- ================================================================

-- Partizionamento per UCMes per mese (se necessario in futuro)
-- CREATE TABLE ucmes_y2025m01 PARTITION OF ucmes
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ================================================================
-- VIEWS OTTIMIZZATE PER QUERY COMUNI
-- ================================================================

-- View per UCMes con response status
CREATE OR REPLACE VIEW ucmes_with_status AS
SELECT 
    u.*,
    CASE 
        WHEN r.id IS NOT NULL THEN 'risposto'
        WHEN u.created_at < NOW() - INTERVAL '48 hours' THEN 'scaduto'
        ELSE 'in-attesa'
    END as status,
    r.content as risposta,
    r.created_at as risposta_data,
    r.portatore_id,
    EXTRACT(EPOCH FROM (COALESCE(r.created_at, NOW()) - u.created_at)) / 3600 as response_time_hours
FROM ucmes u
LEFT JOIN responses r ON u.id = r.ucme_id;

-- View per statistiche utenti
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.*,
    COALESCE(ucme_stats.total_ucmes, 0) as total_ucmes,
    COALESCE(response_stats.responses_given, 0) as responses_given,
    COALESCE(response_stats.responses_received, 0) as responses_received,
    CASE 
        WHEN u.last_login > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN u.last_login > NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'dormant'
    END as activity_status
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) as total_ucmes
    FROM ucmes
    GROUP BY user_id
) ucme_stats ON u.id = ucme_stats.user_id
LEFT JOIN (
    SELECT 
        u.id as user_id,
        COUNT(r1.id) as responses_given,
        COUNT(r2.id) as responses_received
    FROM users u
    LEFT JOIN responses r1 ON u.id = r1.portatore_id
    LEFT JOIN ucmes uc ON u.id = uc.user_id
    LEFT JOIN responses r2 ON uc.id = r2.ucme_id
    GROUP BY u.id
) response_stats ON u.id = response_stats.user_id;

-- ================================================================
-- ANALYZE TABLES PER OTTIMIZZAZIONE QUERY
-- ================================================================

-- Funzione per analyze programmato
CREATE OR REPLACE FUNCTION analyze_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE 'ANALYZE ' || quote_ident(table_name);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- CONFIGURAZIONE PERFORMANCE
-- ================================================================

-- Aumenta work_mem per query complesse (da configurare a livello database)
-- SET work_mem = '256MB';

-- Abilita parallel query per tabelle grandi
-- SET max_parallel_workers_per_gather = 4;

-- Ottimizza parametri per SSD
-- SET random_page_cost = 1.1;
-- SET effective_cache_size = '4GB';

-- ================================================================
-- COMMENTI E DOCUMENTAZIONE
-- ================================================================

COMMENT ON FUNCTION get_platform_stats() IS 
'Restituisce statistiche aggregate della piattaforma in formato JSON ottimizzato';

COMMENT ON FUNCTION get_user_analytics(UUID) IS 
'Analytics specifiche per utente con metriche di engagement';

COMMENT ON FUNCTION assign_ucme_to_portatore(UUID) IS 
'Algoritmo ottimizzato per assegnazione UCMe a Portatore con bilanciamento carico';

COMMENT ON FUNCTION cleanup_old_data(INTEGER) IS 
'Pulizia automatica dati obsoleti per mantenere performance';

-- Aggiorna statistiche dopo creazione indici
ANALYZE users;
ANALYZE ucmes;
ANALYZE responses;
ANALYZE user_sessions; 