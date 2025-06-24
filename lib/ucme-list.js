// ================================================================
// MENTAL COMMONS - UCME LIST ENDPOINT
// ================================================================
// Versione: 1.0.0 - GET UCME LIST PRODUCTION
// Descrizione: Endpoint per elencare UCMe utente (sostituisce /api/ucmes)

const { debug, info, warn, error } = require("../logger.js");
const { requireAuthentication } = require('./session-manager.js');
const { getUserUCMes } = require('./supabase.js');
const { 
  createSuccessResponse,
  logSuccess,
  DatabaseError,
  asyncErrorHandler
} = require('./error-handler.js');

module.exports = asyncErrorHandler(async function handler(req, res) {
  debug('📋 UCME-LIST Endpoint chiamato');
  debug('📍 Method:', req.method);
  
  // ================================================================
  // CORS HEADERS
  // ================================================================
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://mental-commons.vercel.app' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  if (req.method === 'OPTIONS') {
    debug('📝 CORS OPTIONS response sent');
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Solo GET supportato. Per altre operazioni usa /api/ucme'
    });
  }
  
  // ================================================================
  // AUTENTICAZIONE
  // ================================================================
  await new Promise((resolve, reject) => {
    requireAuthentication()(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const userId = req.user.userId;
  const userEmail = req.user.email;
  
  debug('✅ User autenticato per UCMe list:', { userId, email: userEmail });
  
  // ================================================================
  // RECUPERO UCME DAL DATABASE
  // ================================================================
  try {
    const ucmes = await getUserUCMes(userId);
    
    debug('✅ UCMe recuperate dal database:', ucmes?.length || 0);
    
    // Log dettagliato per debug
    if (ucmes && ucmes.length > 0) {
      debug('📝 UCMe dettagli:');
      ucmes.forEach((ucme, index) => {
        debug(`  UCMe ${index + 1}:`, {
          id: ucme.id,
          content_preview: ucme.content?.substring(0, 50) + '...',
          created_at: ucme.created_at,
          status: ucme.status
        });
      });
    }
    
    const responseData = createSuccessResponse(
      ucmes || [],
      `UCMe caricate con successo per ${userEmail}`,
      {
        count: ucmes?.length || 0,
        userEmail,
        userId,
        timestamp: new Date().toISOString(),
        endpoint: '/api/ucme-list',
        note: 'Deploy riuscito - Limite Vercel risolto!'
      }
    );
    
    logSuccess('UCMe list recuperata via /api/ucme-list', req, {
      userId,
      email: userEmail,
      count: ucmes?.length || 0
    });
    
    debug('🚀 Inviando risposta con', ucmes?.length || 0, 'UCMe');
    return res.status(200).json(responseData);
    
  } catch (err) {
    throw new DatabaseError(
      'Errore nel caricamento UCMe',
      'UCME_FETCH_FAILED',
      { userId, error: err.message }
    );
  }
}); 