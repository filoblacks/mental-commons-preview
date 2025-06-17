// ================================================================
// MENTAL COMMONS - PING API CON TEST COMPLETI
// ================================================================
// Versione: 3.0.0
// Descrizione: API ping con test sistematici per tutte le fasi

import { 
  testDatabaseConnection, 
  logConfiguration, 
  testRLSPolicies,
  checkRLSBlocking 
} from './supabase.js';

export default async function handler(req, res) {
  // ================================================================
  // LOGGING INIZIALE E CONFIGURAZIONE
  // ================================================================
  
  console.log('🟣 ============================================');
  console.log('🟣 MENTAL COMMONS - PING API v3.0 CON TEST');
  console.log('🟣 ============================================');
  console.log('📡 Timestamp:', new Date().toISOString());
  console.log('📡 Method:', req.method);
  console.log('📡 User-Agent:', req.headers['user-agent']);
  
  // ================================================================
  // GESTIONE CORS
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log('📡 Risposta CORS OPTIONS inviata');
    res.status(200).end();
    return;
  }
  
  // ================================================================
  // ESECUZIONE TEST SISTEMATICI
  // ================================================================
  
  const testResults = {
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    environment: 'vercel-serverless',
    fase1_configurazione: {},
    fase2_connessione: {},
    fase4_rls: {},
    summary: {}
  };
  
  try {
    // 🟣 FASE 1 - Verifica configurazione
    console.log('📡 Esecuzione FASE 1 - Configurazione...');
    logConfiguration(); // Questo logga automaticamente
    testResults.fase1_configurazione = {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      jwtSecret: !!process.env.JWT_SECRET,
      urlFormat: process.env.SUPABASE_URL?.includes('supabase.co') || false
    };
    
    // 🟣 FASE 2 - Test connessione database
    console.log('📡 Esecuzione FASE 2 - Connessione database...');
    const dbConnection = await testDatabaseConnection();
    testResults.fase2_connessione = {
      connected: dbConnection,
      tested: true
    };
    
    // 🟣 FASE 4 - Test RLS e permessi
    console.log('📡 Esecuzione FASE 4 - RLS e permessi...');
    const rlsResults = await testRLSPolicies();
    testResults.fase4_rls = rlsResults;
    
    // Summary finale
    const allTestsPassed = (
      testResults.fase1_configurazione.supabaseUrl &&
      testResults.fase1_configurazione.supabaseServiceKey &&
      testResults.fase2_connessione.connected &&
      testResults.fase4_rls.serviceKeyWorking
    );
    
    testResults.summary = {
      allTestsPassed,
      criticalIssues: !allTestsPassed,
      readyForProduction: allTestsPassed
    };
    
    console.log('📡 ============================================');
    console.log('📡 RISULTATI TEST COMPLETI:');
    console.log('   - Configurazione OK:', testResults.fase1_configurazione.supabaseUrl && testResults.fase1_configurazione.supabaseServiceKey);
    console.log('   - Connessione DB OK:', testResults.fase2_connessione.connected);
    console.log('   - Service Key OK:', testResults.fase4_rls.serviceKeyWorking);
    console.log('   - Tutti i test OK:', allTestsPassed);
    console.log('📡 ============================================');
    
    // Risposta HTTP
    res.status(200).json({
      status: allTestsPassed ? 'ok' : 'warning',
      message: allTestsPassed 
        ? 'Mental Commons Backend - Tutti i test superati' 
        : 'Mental Commons Backend - Alcuni test falliti',
      ...testResults
    });
    
  } catch (error) {
    console.error('❌ Errore durante test ping:', error);
    
    testResults.summary = {
      allTestsPassed: false,
      criticalIssues: true,
      readyForProduction: false,
      error: error.message
    };
    
    res.status(500).json({
      status: 'error',
      message: 'Errore durante test backend',
      error: error.message,
      ...testResults
    });
  }
} 