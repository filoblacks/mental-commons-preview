-- ================================================================
-- MENTAL COMMONS - AGGIUNTA COLONNA SURNAME
-- ================================================================
-- Data: 2024
-- Descrizione: Aggiunge il campo surname alla tabella users

-- Aggiunge la colonna surname dopo name (Postgres non supporta AFTER, 
-- ma la colonna verrà aggiunta logicamente dopo name nello schema)
ALTER TABLE public.users ADD COLUMN surname text NULL;

-- Verifica che la colonna sia stata aggiunta correttamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Commento per documentazione
COMMENT ON COLUMN public.users.surname IS 'Cognome dell''utente (campo opzionale per compatibilità retroattiva)'; 