// ================================================================
// MENTAL COMMONS - ENV PUBLIC ENDPOINT
// ================================================================
// Versione: 1.0.0
// Descrizione: Rende disponibili al frontend le variabili ambiente
//             pubbliche (anon key e URL Supabase) senza hardcoding.
//             Viene servito come script JS presso /api/env.js.
// ================================================================

;(function () {
  // Esegui la logica server-side solo se siamo in un contesto Node
  // (module definito e con exports). In tutti gli altri casi il file è
  // stato caricato come asset statico: evitiamo ReferenceError e usciamo.
  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    if (typeof console !== 'undefined') {
      console.warn('⚠️  /api/env.js è stato caricato come script client: nessuna variabile ambiente viene esposta. Assicurati di servire questo endpoint da una funzione serverless o simile.');
    }
    return;
  }

  module.exports = function handler(req, res) {
    // Imposta headers di sicurezza base
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    // Ottieni chiave pubblica tramite stripeConfig (rispetta STRIPE_USE_TEST)
    const { getPublicKey, isTest } = require('../lib/stripeConfig');
    const stripePublishableKey = getPublicKey();

    // Log debug modalità test
    if (!isProduction || isTest) {
      console.info(`[env.js] Modalità Stripe TEST attiva (${isTest}) - chiave publishable fornita`);
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      // Risponde con messaggio di errore lato client per debug
      return res.status(200).send(
        `console.error('🚨 Variabili ambiente Supabase mancanti: verifica la configurazione su Vercel');`
      );
    }

    // Esporta le variabili su window (inclusa chiave Stripe corretta)
    const script = `window.SUPABASE_URL = "${supabaseUrl}";
window.SUPABASE_ANON_KEY = "${supabaseAnonKey}";
window.STRIPE_PUBLISHABLE_KEY = "${stripePublishableKey}";
window.isProduction = ${isProduction};`;

    return res.status(200).send(script);
  };
})(); 