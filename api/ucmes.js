// ================================================================
// MENTAL COMMONS - UCMES PLURAL ENDPOINT
// ================================================================
// Versione: 1.0.0 - GET UCMES LIST
// Descrizione: Endpoint semplificato per elencare UCMe utente

const { debug, info, warn, error } = require("../logger.js");
const { requireAuthentication } = require('./session-manager.js');
const { getUserUCMes } = require('./supabase.js');
const { 
  createSuccessResponse,
  logSuccess,
  DatabaseError,
  asyncErrorHandler
} = require('./error-handler.js');

// TEST ENDPOINT MINIMAL
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json({
    success: true,
    message: "UCMES endpoint test - FUNZIONA!",
    method: req.method,
    timestamp: new Date().toISOString(),
    data: []
  });
}; 