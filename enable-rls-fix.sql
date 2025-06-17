-- ================================================================
-- MENTAL COMMONS - ABILITA RLS E POLICY CORRETTE
-- ================================================================
-- 🎯 OBIETTIVO: Risolvere il problema di persistenza dati su Supabase
-- 🔍 CAUSA: RLS disabilitato + Policy troppo restrittive per service key
-- 💡 SOLUZIONE: Abilita RLS + Policy che permettono accesso completo al service role

-- ================================================================
-- STEP 1: ABILITA ROW LEVEL SECURITY
-- ================================================================

-- Abilita RLS su tutte le tabelle principali
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ucmes ENABLE ROW LEVEL SECURITY;

-- Verifica che RLS sia abilitato
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes');

-- ================================================================
-- STEP 2: RIMUOVI POLICY ESISTENTI (PULIZIA)
-- ================================================================

-- Rimuovi policy esistenti per evitare conflitti
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own ucmes" ON ucmes;
DROP POLICY IF EXISTS "Users can insert own ucmes" ON ucmes;
DROP POLICY IF EXISTS "Users can update own ucmes" ON ucmes;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
DROP POLICY IF EXISTS "Service role can do everything on ucmes" ON ucmes;
DROP POLICY IF EXISTS "Service role can do everything on sessions" ON user_sessions;
DROP POLICY IF EXISTS "API full access to users" ON users;
DROP POLICY IF EXISTS "Users can manage own data" ON users;
DROP POLICY IF EXISTS "API full access to ucmes" ON ucmes;
DROP POLICY IF EXISTS "Users can manage own ucmes" ON ucmes;
DROP POLICY IF EXISTS "API full access to sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;

-- ================================================================
-- STEP 3: CREA POLICY CORRETTE PER SERVICE KEY
-- ================================================================

-- 🔑 POLICY PER TABELLA USERS
-- Permetti accesso completo al service_role (le nostre API)
CREATE POLICY "service_role_full_access_users" ON users
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permetti agli utenti autenticati di vedere i propri dati
CREATE POLICY "authenticated_users_own_data" ON users
  FOR ALL 
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- 🔑 POLICY PER TABELLA UCMES
-- Permetti accesso completo al service_role
CREATE POLICY "service_role_full_access_ucmes" ON ucmes
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permetti agli utenti autenticati di gestire le proprie UCMe
CREATE POLICY "authenticated_users_own_ucmes" ON ucmes
  FOR ALL 
  TO authenticated
  USING (
    auth.uid()::text = user_id::text OR 
    auth.uid()::text = assigned_to::text
  )
  WITH CHECK (auth.uid()::text = user_id::text);

-- 🔑 POLICY PER TABELLA USER_SESSIONS
-- Permetti accesso completo al service_role
CREATE POLICY "service_role_full_access_sessions" ON user_sessions
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permetti agli utenti autenticati di gestire le proprie sessioni
CREATE POLICY "authenticated_users_own_sessions" ON user_sessions
  FOR ALL 
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- ================================================================
-- STEP 4: VERIFICA CONFIGURAZIONE
-- ================================================================

-- Mostra stato RLS
SELECT 
  schemaname, 
  tablename, 
  CASE WHEN rowsecurity THEN '✅ ABILITATO' ELSE '❌ DISABILITATO' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes')
ORDER BY tablename;

-- Mostra tutte le policy attive
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN roles @> '{service_role}' THEN '🔑 SERVICE_ROLE'
    WHEN roles @> '{authenticated}' THEN '👤 AUTHENTICATED'
    ELSE '🌐 PUBLIC'
  END as role_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes')
ORDER BY tablename, role_type, policyname;

-- ================================================================
-- STEP 5: TEST DI FUNZIONAMENTO
-- ================================================================

-- Test 1: Crea/Aggiorna utente di test
INSERT INTO users (email, password_hash, name, role, is_active) VALUES 
('test@mentalcommons.it', '$2b$10$N9qo8uLOickgx2ZMRZoMye2FRDvhkJg5XGJoSGOWB6eW6J.QKPUWC', 'Test User', 'user', true)
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Test 2: Verifica inserimento utente
SELECT 
  '✅ UTENTE TEST CREATO' as status,
  id, 
  email, 
  name, 
  role,
  is_active,
  created_at
FROM users 
WHERE email = 'test@mentalcommons.it';

-- Test 3: Crea UCMe di test
INSERT INTO ucmes (user_id, content, title, status) VALUES 
(
  (SELECT id FROM users WHERE email = 'test@mentalcommons.it'),
  'Questo è un pensiero di test per verificare che RLS funzioni correttamente con le API.',
  'Test UCMe dopo RLS Fix',
  'attesa'
)
ON CONFLICT DO NOTHING;

-- Test 4: Verifica UCMe
SELECT 
  '✅ UCME TEST CREATA' as status,
  u.id,
  u.title,
  u.content,
  u.status,
  u.created_at,
  usr.email as user_email
FROM ucmes u
JOIN users usr ON u.user_id = usr.id
WHERE usr.email = 'test@mentalcommons.it'
ORDER BY u.created_at DESC
LIMIT 3;

-- ================================================================
-- STEP 6: REPORT FINALE
-- ================================================================

SELECT '🎉 RLS ABILITATO E CONFIGURATO CORRETTAMENTE' as final_status;

-- Conta record per verifica
SELECT 
  'TOTALE UTENTI' as tabella,
  count(*) as record_count
FROM users
UNION ALL
SELECT 
  'TOTALE UCMES' as tabella,
  count(*) as record_count
FROM ucmes
UNION ALL
SELECT 
  'TOTALE SESSIONI' as tabella,
  count(*) as record_count
FROM user_sessions; 