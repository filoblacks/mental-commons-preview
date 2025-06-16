// ================================================================
// DEBUG USERS ENDPOINT - CHECK USERS TABLE
// ================================================================

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  console.log('🔍 DEBUG USERS - CONTROLLO TABELLA UTENTI');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Test 1: Verifica se la tabella users esiste
    console.log('🔍 Verificando esistenza tabella users...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    if (tablesError) {
      console.error('❌ Errore accesso tabella users:', tablesError);
      return res.status(500).json({
        debug: true,
        status: 'ERROR',
        error: 'Table access failed',
        details: tablesError.message,
        recommendation: 'Check if users table exists and RLS policies are correct'
      });
    }
    
    // Test 2: Cerca specificatamente l'utente di test
    console.log('🔍 Cercando utente test@mentalcommons.it...');
    
    const { data: testUser, error: testUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@mentalcommons.it')
      .single();
    
    // Test 3: Conta tutti gli utenti
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const response = {
      debug: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      usersTable: {
        accessible: !tablesError,
        totalUsers: count || 0,
        sampleUsers: tables?.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          created_at: u.created_at,
          is_active: u.is_active
        })) || []
      },
      testUser: {
        exists: !testUserError && !!testUser,
        data: testUser ? {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          role: testUser.role,
          created_at: testUser.created_at,
          is_active: testUser.is_active,
          password_hash_present: !!testUser.password_hash,
          password_hash_length: testUser.password_hash?.length || 0
        } : null,
        error: testUserError?.message || null
      },
      recommendations: []
    };
    
    // Add recommendations
    if (count === 0) {
      response.recommendations.push('Database is empty - run INSERT statements to add test user');
    }
    if (testUserError || !testUser) {
      response.recommendations.push('Test user (test@mentalcommons.it) not found - run INSERT statement for test user');
    }
    if (tables && tables.length > 0 && !testUser) {
      response.recommendations.push('Users table exists with data, but test user is missing - check email exactly');
    }
    
    console.log('🔍 Debug users info:', JSON.stringify(response, null, 2));
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Debug users error:', error);
    res.status(500).json({
      debug: true,
      status: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  }
} 