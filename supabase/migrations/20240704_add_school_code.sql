-- ================================================================
-- Migration: 2024-07-04 – School Code per utenti e UCMe
-- ================================================================
-- Questo script crea (se mancante) la tabella `schools`, aggiunge il
-- campo `school_code` a `users` e `ucmes` e imposta una policy RLS
-- per garantire coerenza tra lʼutente autenticato e il codice scuola.
-- ================================================================

-- 1. Tabella `schools` -------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  code         TEXT    UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  package_type TEXT    DEFAULT 'essenziale',
  is_active    BOOLEAN DEFAULT TRUE
);

-- 2. Colonna `school_code` in `users` ---------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS school_code TEXT REFERENCES schools(code);

-- 3. Colonna `school_code` in `ucmes` ---------------------------------------
ALTER TABLE ucmes
  ADD COLUMN IF NOT EXISTS school_code TEXT REFERENCES schools(code);

-- 4. Indicizzazione per query efficienti ------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_school_code ON users(school_code);
CREATE INDEX IF NOT EXISTS idx_ucmes_school_code ON ucmes(school_code);

-- 5. RLS – inserimento coerente di UCMe -------------------------------------
-- Abilita RLS se non già attiva
ALTER TABLE ucmes ENABLE ROW LEVEL SECURITY;

-- Rimuovi policy precedente se esiste (idempotente)
DROP POLICY IF EXISTS "Students insert UCMe with own school_code" ON ucmes;

-- Crea nuova policy con controllo school_code
CREATE POLICY "Students insert UCMe with own school_code" ON ucmes
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'                 -- Deve essere loggato
    AND (user_id = auth.uid())                    -- UCMe a proprio nome
    AND (
      school_code IS NULL                         -- Studente non scolastico
      OR school_code = (SELECT school_code FROM users WHERE id = auth.uid())
    )
  );

-- 6. Fine migration ---------------------------------------------------------- 