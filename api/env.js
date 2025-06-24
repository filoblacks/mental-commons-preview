// ================================================================
// MENTAL COMMONS - ENV PUBLIC ENDPOINT
// ================================================================
// Versione: 1.0.0
// Descrizione: Rende disponibili al frontend le variabili ambiente
//             pubbliche (anon key e URL Supabase) senza hardcoding.
//             Viene servito come script JS presso /api/env.js.
// ================================================================

module.exports = function handler(req, res) {
  // Imposta headers di sicurezza base
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  if (!supabaseUrl || !supabaseAnonKey) {
    // Risponde con messaggio di errore lato client per debug
    return res.status(200).send(
      `console.error('🚨 Variabili ambiente Supabase mancanti: verifica la configurazione su Vercel');`
    );
  }

  // Esporta le variabili su window
  const script = `window.SUPABASE_URL = "${supabaseUrl}";
window.SUPABASE_ANON_KEY = "${supabaseAnonKey}";
window.isProduction = ${isProduction};`;

  return res.status(200).send(script);
}; 