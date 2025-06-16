-- ================================================================
-- DISABILITA RLS TEMPORANEAMENTE PER TEST
-- ================================================================
-- Esegui questo nel SQL Editor di Supabase per testare il backend

-- Disabilita RLS temporaneamente
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE ucmes DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- Verifica che l'utente di test esista
SELECT id, email, name, role, is_active FROM users WHERE email = 'test@mentalcommons.it';

-- Se non esiste, crealo
INSERT INTO users (email, password_hash, name, role) VALUES 
('test@mentalcommons.it', '$2b$10$N9qo8uLOickgx2ZMRZoMye2FRDvhkJg5XGJoSGOWB6eW6J.QKPUWC', 'Test User', 'user')
ON CONFLICT (email) DO NOTHING;

-- Verifica inserimento
SELECT 'User created successfully' as status, id, email, name FROM users WHERE email = 'test@mentalcommons.it'; 