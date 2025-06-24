-- ================================================================
-- MENTAL COMMONS - AGGIUNTA SUPPORTO UCMe ANONIME
-- ================================================================
-- Versione: 2.3.0
-- Data: 2025-01-21
-- Descrizione: Aggiunge supporto per UCMe anonime al database esistente

-- ================================================================
-- MODIFICA TABELLA UCMe PER SUPPORTO ANONIMO
-- ================================================================

-- Aggiungi colonne per supportare UCMe anonime
ALTER TABLE ucmes 
ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS anonymous_email text;

-- Crea indice per email anonime per performance
CREATE INDEX IF NOT EXISTS idx_ucmes_anonymous_email ON ucmes(anonymous_email);
CREATE INDEX IF NOT EXISTS idx_ucmes_is_anonymous ON ucmes(is_anonymous);

-- ================================================================
-- AGGIORNAMENTO RLS POLICIES PER UCMe ANONIME
-- ================================================================

-- Modifica la policy di selezione per permettere la lettura delle UCMe anonime agli assigned_to
DROP POLICY IF EXISTS "Users can view own ucmes" ON ucmes;

CREATE POLICY "Users can view own ucmes" ON ucmes
  FOR SELECT USING (
    -- UCMe dell'utente autenticato
    auth.uid()::text = user_id::text OR 
    -- UCMe assegnate all'utente (come Portatore)
    auth.uid()::text = assigned_to::text OR
    -- UCMe anonime possono essere lette solo dai Portatori assegnati
    (is_anonymous = true AND auth.uid()::text = assigned_to::text)
  );

-- Modifica la policy di inserimento per permettere UCMe anonime
DROP POLICY IF EXISTS "Users can insert own ucmes" ON ucmes;

CREATE POLICY "Users can insert own ucmes" ON ucmes
  FOR INSERT WITH CHECK (
    -- UCMe autenticate: user_id deve corrispondere all'utente loggato
    (is_anonymous = false AND auth.uid()::text = user_id::text) OR
    -- UCMe anonime: user_id deve essere NULL e deve avere email anonima
    (is_anonymous = true AND user_id IS NULL AND anonymous_email IS NOT NULL)
  );

-- Modifica la policy di aggiornamento per UCMe anonime
DROP POLICY IF EXISTS "Users can update own ucmes" ON ucmes;

CREATE POLICY "Users can update own ucmes" ON ucmes
  FOR UPDATE USING (
    -- UCMe autenticate: proprietario o assegnato
    (is_anonymous = false AND (auth.uid()::text = user_id::text OR auth.uid()::text = assigned_to::text)) OR
    -- UCMe anonime: solo l'assegnato può aggiornare (per inserire risposte)
    (is_anonymous = true AND auth.uid()::text = assigned_to::text)
  );

-- ================================================================
-- VALIDAZIONE DATI
-- ================================================================

-- Constraint per assicurarsi che le UCMe anonime abbiano email
ALTER TABLE ucmes 
ADD CONSTRAINT check_anonymous_email 
CHECK (
  (is_anonymous = false) OR 
  (is_anonymous = true AND anonymous_email IS NOT NULL AND user_id IS NULL)
);

-- Constraint per assicurarsi che le UCMe autenticate abbiano user_id
ALTER TABLE ucmes 
ADD CONSTRAINT check_authenticated_user 
CHECK (
  (is_anonymous = true AND user_id IS NULL) OR 
  (is_anonymous = false AND user_id IS NOT NULL)
);

-- ================================================================
-- AGGIORNAMENTO DATI ESISTENTI
-- ================================================================

-- Aggiorna tutte le UCMe esistenti per essere non-anonime
UPDATE ucmes 
SET is_anonymous = false 
WHERE is_anonymous IS NULL;

-- ================================================================
-- COMMENTI PER DOCUMENTAZIONE
-- ================================================================

COMMENT ON COLUMN ucmes.is_anonymous IS 'Indica se la UCMe è stata inviata in modalità anonima (senza registrazione)';
COMMENT ON COLUMN ucmes.anonymous_email IS 'Email fornita per UCMe anonime per ricevere la risposta';

-- ================================================================
-- VERIFICA FINALE
-- ================================================================

-- Query di test per verificare che lo schema sia corretto
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'ucmes' 
  AND column_name IN ('is_anonymous', 'anonymous_email')
ORDER BY column_name;

-- Verifica constraints (query corretta senza ambiguità)
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'ucmes' 
  AND tc.constraint_type = 'CHECK'
  AND (cc.check_clause LIKE '%anonymous%' OR cc.check_clause LIKE '%user_id%'); 