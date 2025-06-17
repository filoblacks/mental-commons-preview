-- 🧹 SCRIPT RLS CLEANUP & FIX FINALE - Mental Commons
-- Questo script pulisce tutto e ricrea le politiche RLS da zero

-- Step 1: Disabilita RLS per permettere la pulizia completa
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ucmes DISABLE ROW LEVEL SECURITY;

-- Step 2: Rimuovi TUTTE le politiche esistenti (anche quelle con nomi diversi)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Rimuovi tutte le policy della tabella users
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;
    
    -- Rimuovi tutte le policy della tabella user_sessions
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_sessions' AND schemaname = 'public' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_sessions';
    END LOOP;
    
    -- Rimuovi tutte le policy della tabella ucmes
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'ucmes' AND schemaname = 'public' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ucmes';
    END LOOP;
END $$;

-- Step 3: Verifica che tutte le policy siano state rimosse
SELECT 
    'Politiche rimaste dopo cleanup:' as status,
    tablename,
    count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes')
GROUP BY tablename;

-- Step 4: Ri-abilita RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ucmes ENABLE ROW LEVEL SECURITY;

-- Step 5: Crea nuove politiche con nomi unici basati su timestamp
DO $$ 
DECLARE 
    suffix TEXT := extract(epoch from now())::bigint::text;
BEGIN
    -- Politiche per service_role (accesso completo)
    EXECUTE 'CREATE POLICY service_role_users_' || suffix || ' ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY service_role_sessions_' || suffix || ' ON public.user_sessions FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY service_role_ucmes_' || suffix || ' ON public.ucmes FOR ALL TO service_role USING (true) WITH CHECK (true)';
    
    -- Politiche per authenticated (accesso limitato ai propri dati)
    EXECUTE 'CREATE POLICY auth_users_select_' || suffix || ' ON public.users FOR SELECT TO authenticated USING (auth.uid()::text = id)';
    EXECUTE 'CREATE POLICY auth_users_update_' || suffix || ' ON public.users FOR UPDATE TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id)';
    EXECUTE 'CREATE POLICY auth_sessions_' || suffix || ' ON public.user_sessions FOR ALL TO authenticated USING (user_id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY auth_ucmes_' || suffix || ' ON public.ucmes FOR ALL TO authenticated USING (depositor_id = auth.uid()::text)';
END $$;

-- Step 6: Verifica finale
SELECT 
    'Configurazione finale:' as status,
    schemaname, 
    tablename, 
    rowsecurity as "RLS_ENABLED",
    (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename AND pg_policies.schemaname = 'public') as "POLICY_COUNT"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes')
ORDER BY tablename;

-- Step 7: Mostra tutte le nuove politiche
SELECT 
    'Politiche create:' as status,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'ucmes')
ORDER BY tablename, policyname;

-- Step 8: Test di inserimento
INSERT INTO public.users (id, email, password_hash, name, created_at, updated_at)
VALUES (
    'test-cleanup-' || extract(epoch from now())::text,
    'test-cleanup-' || extract(epoch from now())::text || '@mentalcommons.it',
    '$2b$10$example.hash.for.testing.purposes.only',
    'Test Cleanup User',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- Step 9: Verifica successo
SELECT 
    '✅ Test completato con successo!' as status,
    count(*) as total_users,
    count(*) FILTER (WHERE email LIKE 'test-cleanup-%') as test_users_created
FROM public.users; 