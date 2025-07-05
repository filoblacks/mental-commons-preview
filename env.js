// ================================================================
// MENTAL COMMONS - ENVIRONMENT CONFIGURATION (STATIC)
// ================================================================
// Versione: 1.0.0
// Descrizione: Configurazione ambiente statica per il frontend
//             Fornisce fallback per le variabili Supabase quando
//             il serverless function /api/env non è disponibile.
// ================================================================

(function() {
  'use strict';
  
  // Configurazione di fallback per sviluppo locale
  // In produzione, queste verranno sovrascritte dal serverless function
  const fallbackConfig = {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    isProduction: false
  };
  
  // Rileva modalità produzione
  const isProduction = (
    location.hostname !== 'localhost' && 
    location.hostname !== '127.0.0.1' && 
    !location.hostname.includes('local')
  );
  
  // Applica configurazione con fallback
  window.SUPABASE_URL = window.SUPABASE_URL || fallbackConfig.SUPABASE_URL;
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || fallbackConfig.SUPABASE_ANON_KEY;
  window.isProduction = window.isProduction !== undefined ? window.isProduction : isProduction;
  
  // Log per debug (solo in sviluppo)
  if (!window.isProduction) {
    console.log('🔧 [ENV] Configurazione ambiente caricata:', {
      hasSupabaseUrl: !!window.SUPABASE_URL,
      hasSupabaseKey: !!window.SUPABASE_ANON_KEY,
      isProduction: window.isProduction,
      source: 'static-fallback'
    });
    
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      console.warn('⚠️ [ENV] Variabili Supabase mancanti. Alcune funzionalità potrebbero non essere disponibili.');
      console.info('💡 [ENV] Per abilitare tutte le funzionalità, configura le variabili ambiente in produzione.');
    }
  }
})(); 