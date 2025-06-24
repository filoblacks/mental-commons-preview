// ================================================================
// MENTAL COMMONS - UCMES PLURAL ENDPOINT
// ================================================================
// Versione: 1.0.0 - REDIRECT TO UNIFIED UCME API
// Descrizione: Endpoint legacy che reindirizza a /api/ucme per compatibilità

const { debug, info, warn, error } = require("../logger.js");

// Import della logica unificata
const ucmeHandler = require('./ucme.js');

module.exports = async function handler(req, res) {
  debug('🔄 UCMES Plural Endpoint called');
  debug('📍 Method:', req.method);
  debug('📍 URL:', req.url);
  
  // Supporta solo GET per compatibilità
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return res.status(405).json({
      success: false,
      message: 'Metodo non supportato. Usa GET /api/ucmes o il nuovo endpoint unificato GET /api/ucme',
      redirect: 'Usa /api/ucme per tutte le operazioni UCMe'
    });
  }
  
  debug('🔀 Redirecting to unified ucme handler...');
  
  // Delega al handler unificato
  return ucmeHandler(req, res);
}; 