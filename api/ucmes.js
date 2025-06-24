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

module.exports = asyncErrorHandler(async function handler(req, res) {
  debug('🔄 UCMES Plural Endpoint called');
  debug('📍 Method:', req.method);
  debug('📍 URL:', req.url);
  
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
  
  // Supporta solo GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Metodo non supportato. Usa GET /api/ucmes per elencare UCMe',
      redirect: 'Per altre operazioni usa /api/ucme'
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
  
  debug('✅ User authenticated for GET UCMes:', { userId, email: userEmail });
  
  // ================================================================
  // RECUPERO UCME
  // ================================================================
  try {
    const ucmes = await getUserUCMes(userId);
    
    debug('✅ UCMes retrieved from database:', ucmes?.length || 0);
    
    const responseData = createSuccessResponse(
      ucmes || [],
      `Trovate ${ucmes?.length || 0} UCMe per l'utente`,
      {
        count: ucmes?.length || 0,
        userEmail,
        userId,
        timestamp: new Date().toISOString(),
        endpoint: '/api/ucmes (GET)'
      }
    );
    
    logSuccess('UCMes retrieved successfully via /api/ucmes', req, {
      userId,
      email: userEmail,
      count: ucmes?.length || 0
    });
    
    debug('🚀 Sending response with', ucmes?.length || 0, 'UCMes');
    return res.status(200).json(responseData);
    
  } catch (err) {
    throw new DatabaseError(
      'Errore nel caricamento UCMe',
      'UCME_FETCH_FAILED',
      { userId, error: err.message }
    );
  }
}); 