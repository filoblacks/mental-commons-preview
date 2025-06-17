-- ================================================================
-- MENTAL COMMONS - SCHEMA DATABASE SUPABASE
-- ================================================================
-- Versione: 1.0.0
-- Data: 2024
-- Descrizione: Schema completo per backend persistente Mental Commons

-- ================================================================
-- TABELLE PRINCIPALI
-- ================================================================

-- Tabella utenti
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text,
  surname text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  is_active boolean DEFAULT true
);

-- Tabella UCMe (Unità Cognitive Mentali)
CREATE TABLE ucmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  title text,
  status text DEFAULT 'attesa', -- 'attesa', 'assegnata', 'risposta', 'completata'
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  response_content text,
  response_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella sessioni (per gestire JWT e logout)
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  device_info text,
  ip_address inet
);

-- ================================================================
-- INDICI PER PERFORMANCE
-- ================================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_ucmes_user_id ON ucmes(user_id);
CREATE INDEX idx_ucmes_assigned_to ON ucmes(assigned_to);
CREATE INDEX idx_ucmes_status ON ucmes(status);
CREATE INDEX idx_ucmes_created_at ON ucmes(created_at DESC);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);

-- ================================================================
-- TRIGGER PER UPDATED_AT AUTOMATICO
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ucmes_updated_at BEFORE UPDATE ON ucmes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ucmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy per users: gli utenti possono vedere solo i propri dati
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy per UCMe: gli utenti possono vedere le proprie UCMe e quelle assegnate a loro
CREATE POLICY "Users can view own ucmes" ON ucmes
  FOR SELECT USING (
    auth.uid()::text = user_id::text OR 
    auth.uid()::text = assigned_to::text
  );

CREATE POLICY "Users can insert own ucmes" ON ucmes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own ucmes" ON ucmes
  FOR UPDATE USING (
    auth.uid()::text = user_id::text OR 
    auth.uid()::text = assigned_to::text
  );

-- Policy per sessioni: gli utenti possono vedere solo le proprie sessioni
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions" ON user_sessions
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ================================================================
-- POLICY PER SERVICE KEY (BYPASS RLS)
-- ================================================================

-- Per permettere alle API server-side di operare senza restrizioni RLS
-- Queste policy si attivano quando si usa la service key

CREATE POLICY "Service role can do everything on users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on ucmes" ON ucmes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on sessions" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================================
-- DATI DI TEST (OPZIONALE)
-- ================================================================

-- Utente di test (password: test123 -> hash bcrypt)
INSERT INTO users (email, password_hash, name, role) VALUES 
('test@mentalcommons.it', '$2b$10$N9qo8uLOickgx2ZMRZoMye2FRDvhkJg5XGJoSGOWB6eW6J.QKPUWC', 'Test User', 'user');

-- UCMe di test
INSERT INTO ucmes (user_id, content, title) VALUES 
((SELECT id FROM users WHERE email = 'test@mentalcommons.it'), 
 'Questo è un pensiero di test per verificare il salvataggio delle UCMe.', 
 'Test UCMe');

-- ================================================================
-- CONFIGURAZIONI FINALI
-- ================================================================

-- Imposta timezone
SET timezone = 'Europe/Rome';

-- Commenti per documentazione
COMMENT ON TABLE users IS 'Tabella utenti registrati sulla piattaforma Mental Commons';
COMMENT ON TABLE ucmes IS 'Tabella delle UCMe (Unità Cognitive Mentali) condivise dagli utenti';
COMMENT ON TABLE user_sessions IS 'Tabella per gestire le sessioni di login e logout';

COMMENT ON COLUMN users.password_hash IS 'Password hashata con bcrypt (salt rounds: 10)';
COMMENT ON COLUMN users.surname IS 'Cognome dell''utente (campo opzionale per compatibilità retroattiva)';
COMMENT ON COLUMN ucmes.status IS 'Stati possibili: attesa, assegnata, risposta, completata';
COMMENT ON COLUMN user_sessions.token_hash IS 'Hash del JWT token per sicurezza aggiuntiva'; 