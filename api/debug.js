// ================================================================
// DEBUG ENDPOINT - SUPABASE CONNECTION TEST
// ================================================================

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  console.log('🔍 DEBUG ENDPOINT - CONTROLLO CONFIGURAZIONE');
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      vercelEnv: process.env.VERCEL_ENV
    },
    supabaseConfig: {
      url: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      urlValue: process.env.SUPABASE_URL?.substring(0, 30) + '...',
      serviceKey: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING',
      serviceKeyLength: process.env.SUPABASE_SERVICE_KEY?.length || 0
    },
    jwtConfig: {
      secret: process.env.JWT_SECRET ? 'SET' : 'MISSING (using default)',
      secretLength: process.env.JWT_SECRET?.length || 0
    }
  };
  
  // Test Supabase Connection
  let supabaseTest = {
    connectionStatus: 'FAILED',
    error: null,
    tablesCount: 0
  };
  
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      console.log('🔍 Testing Supabase connection...');
      
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
      
      // Test 1: Basic connection
      const { data: tables, error: tablesError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (tablesError) {
        throw new Error(`Users table error: ${tablesError.message}`);
      }
      
      // Test 2: Check if users table exists and has data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, name')
        .limit(5);
      
      if (usersError) {
        throw new Error(`Users query error: ${usersError.message}`);
      }
      
      supabaseTest = {
        connectionStatus: 'SUCCESS',
        error: null,
        usersFound: usersData?.length || 0,
        sampleUsers: usersData?.map(u => ({ id: u.id, email: u.email, name: u.name }))
      };
      
      console.log('✅ Supabase connection successful');
      
    } else {
      throw new Error('Supabase environment variables missing');
    }
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    supabaseTest = {
      connectionStatus: 'FAILED',
      error: error.message,
      usersFound: 0
    };
  }
  
  const response = {
    debug: true,
    status: supabaseTest.connectionStatus === 'SUCCESS' ? 'OK' : 'ERROR',
    ...debugInfo,
    supabaseTest,
    recommendations: []
  };
  
  // Add recommendations based on issues found
  if (!process.env.SUPABASE_URL) {
    response.recommendations.push('Set SUPABASE_URL environment variable');
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    response.recommendations.push('Set SUPABASE_SERVICE_KEY environment variable');
  }
  if (supabaseTest.connectionStatus === 'FAILED') {
    response.recommendations.push('Check Supabase configuration and network connectivity');
  }
  if (supabaseTest.usersFound === 0) {
    response.recommendations.push('Database appears empty - run schema setup');
  }
  
  console.log('🔍 Debug info collected:', JSON.stringify(response, null, 2));
  
  const statusCode = response.status === 'OK' ? 200 : 500;
  res.status(statusCode).json(response);
} 