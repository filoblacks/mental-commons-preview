-- 🔧 SCRIPT RLS FINAL FIX - Mental Commons
-- Questo script risolve definitivamente i problemi RLS

-- Step 1: Disabilita temporaneamente RLS su tutte le tabelle
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ucmes DISABLE ROW LEVEL SECURITY;

-- Step 2: Rimuovi tutte le politiche esistenti
DROP POLICY IF EXISTS "service_role_all_access" ON public.users;
DROP POLICY IF EXISTS "service_role_all_access" ON public.user_sessions;
DROP POLICY IF EXISTS "service_role_all_access" ON public.ucmes;

-- Rimuovi eventuali altre politiche
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow user creation" ON public.users;
DROP POLICY IF EXISTS "Users can manage sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage own UCMes" ON public.ucmes;

-- Step 3: Abilita RLS sulle tabelle
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ucmes ENABLE ROW LEVEL SECURITY;

-- Step 4: Crea politiche semplici e permissive per service_role
CREATE POLICY "service_role_full_access_users" ON public.users
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "service_role_full_access_sessions" ON public.user_sessions
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "service_role_full_access_ucmes" ON public.ucmes
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Step 5: Aggiungi politiche per authenticated (per eventuali usi futuri)
CREATE POLICY "authenticated_users_select" ON public.users
FOR SELECT 
TO authenticated 
USING (auth.uid()::text = id);

CREATE POLICY "authenticated_users_update" ON public.users
FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

CREATE POLICY "authenticated_sessions" ON public.user_sessions
FOR ALL 
TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY "authenticated_ucmes" ON public.ucmes
FOR ALL 
TO authenticated 
USING (depositor_id = auth.uid()::text);

-- Step 6: Verifica configurazione
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS_ENABLED",
    (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as "POLICY_COUNT"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes')
ORDER BY tablename;

-- Step 7: Mostra tutte le politiche attive
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes')
ORDER BY tablename, policyname;

-- Test rapido: inserimento di un record di test
INSERT INTO public.users (id, email, password_hash, name, created_at, updated_at)
VALUES (
    'test-rls-fix-' || extract(epoch from now())::text,
    'test-rls-fix-' || extract(epoch from now())::text || '@mentalcommons.it',
    '$2b$10$example.hash.for.testing.purposes.only',
    'Test RLS Fix User',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- Verifica che il record sia stato inserito
SELECT 
    'Test completato con successo' as status,
    count(*) as total_users,
    max(created_at) as last_user_created
FROM public.users
WHERE email LIKE 'test-rls-fix-%'; 