-- ================================================================
-- Migration: 2024-12-20 – Aggiunta Scuola Esempio
-- ================================================================
-- Questo script aggiunge la "Scuola Esempio" nella tabella schools
-- con un codice di riferimento semplice per test e dimostrazione.
-- ================================================================

-- Inserimento della Scuola Esempio
INSERT INTO schools (name, code, package_type, is_active)
VALUES (
  'Scuola Esempio',
  'SCUOLA001',
  'essenziale',
  TRUE
)
ON CONFLICT (code) DO NOTHING;

-- Verifica inserimento
SELECT 
  name as "Nome Scuola",
  code as "Codice Riferimento",
  package_type as "Tipo Pacchetto",
  is_active as "Attiva",
  created_at as "Data Creazione"
FROM schools 
WHERE code = 'SCUOLA001';

-- ================================================================
-- Fine migration
-- ================================================================ 