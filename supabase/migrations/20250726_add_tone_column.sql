-- ================================================================
-- Migration: 2025-07-26 – Add `tone` column to `ucmes`
-- ================================================================
-- Questo script aggiunge la colonna `tone` alla tabella `ucmes`
-- ed un indice dedicato per query di analisi e filtro.
-- La colonna è facoltativa e può essere popolata in un secondo
-- momento. Le statistiche Docente useranno 'non_definito' quando
-- il valore è NULL.
-- ================================================================

-- 1. Aggiunta colonna `tone` se non presente
ALTER TABLE ucmes
  ADD COLUMN IF NOT EXISTS tone TEXT;

-- 2. Indicizzazione su `tone` e `created_at` per query efficienti
CREATE INDEX IF NOT EXISTS idx_ucmes_tone_created
  ON ucmes (tone, created_at DESC); 