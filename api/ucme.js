// ================================================================
// MENTAL COMMONS - UNIFIED UCME API
// ================================================================
// Versione: 4.0.0 - UNIFIED RESTful ENDPOINT
// Descrizione: Endpoint unificato per tutte le operazioni UCMe (GET, POST, PUT, DELETE)

// ================================================================
// SECURITY IMPORTS
// ================================================================
const { validateAndSanitize, createUcmeSchema } = require('./validation.js');
const { requireAuthentication } = require('./session-manager.js');
const { 
  ValidationError, 
  AuthenticationError, 
  DatabaseError,
  createSuccessResponse,
  logError,
  logSuccess,
  asyncErrorHandler,
  correlationMiddleware
} = require('./error-handler.js');

// Sistema di logging e rate limiting
const { debug, info, warn, error } = require("../logger.js");
const { rateLimitMiddleware } = require('./rate-limiter.js');

// Database operations
const { 
  saveUCMe, 
  saveAnonymousUCMe,
  getUserUCMes,
  updateUCMe,
  deleteUCMe,
  testDatabaseConnection,
  logConfiguration
} = require('./supabase.js');

module.exports = asyncErrorHandler(async function handler(req, res) {
  // ================================================================
  // SECURITY HEADERS E CORS
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://mental-commons.vercel.app' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    debug('📝 CORS OPTIONS response sent');
    return res.status(200).end();
  }
  
  // ================================================================
  // CORRELATION ID E LOGGING INIZIALE
  // ================================================================
  
  correlationMiddleware(req, res, () => {});
  
  debug('🟣 ============================================');
  debug('🟣 UNIFIED UCME API v4.0');
  debug('🟣 ============================================');
  debug('📝 Correlation ID:', req.correlationId);
  debug('📝 Timestamp:', new Date().toISOString());
  debug('📝 Method:', req.method);
  debug('📝 User-Agent:', req.headers['user-agent']);
  debug('📝 Origin:', req.headers.origin);
  
  logConfiguration();
  
  // ================================================================
  // RATE LIMITING CHECK
  // ================================================================
  
  const rateLimitCheck = rateLimitMiddleware('ucme');
  await new Promise((resolve, reject) => {
    rateLimitCheck(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  // ================================================================
  // DATABASE CONNECTION TEST
  // ================================================================
  
  debug('🔍 Testing database connection...');
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    throw new DatabaseError(
      'Servizio temporaneamente non disponibile',
      'DATABASE_CONNECTION_FAILED',
      { correlationId: req.correlationId }
    );
  }
  
  debug('✅ Database connection verified');
  
  // ================================================================
  // ROUTING BASATO SU METODO HTTP
  // ================================================================
  
  switch (req.method) {
    case 'GET':
      return handleGetUCMes(req, res);
    case 'POST':
      return handleCreateUCMe(req, res);
    case 'PUT':
      return handleUpdateUCMe(req, res);
    case 'DELETE':
      return handleDeleteUCMe(req, res);
    default:
      throw new ValidationError(
        'Metodo HTTP non supportato',
        'METHOD_NOT_ALLOWED',
        { receivedMethod: req.method, supportedMethods: ['GET', 'POST', 'PUT', 'DELETE'] }
      );
  }
});

// ================================================================
// HANDLER GET - RECUPERA UCME
// ================================================================

async function handleGetUCMes(req, res) {
  debug('📥 GET UCMes request');
  debug('🔍 Request headers:', {
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    xUserEmail: req.headers['x-user-email']
  });
  
  // Autenticazione richiesta per GET
  await new Promise((resolve, reject) => {
    requireAuthentication()(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const userId = req.user.userId;
  const userEmail = req.user.email;
  
  debug('✅ User authenticated for GET:', { userId, email: userEmail });
  debug('🔍 About to query UCMes for userId:', userId);
  
  try {
    const ucmes = await getUserUCMes(userId);
    
    debug('✅ UCMes retrieved from database:', ucmes?.length || 0);
    
    // Log dettagliato delle UCMe per debug cross-device
    if (ucmes && ucmes.length > 0) {
      debug('📝 UCMes details:');
      ucmes.forEach((ucme, index) => {
        debug(`  UCMe ${index + 1}:`, {
          id: ucme.id,
          user_id: ucme.user_id,
          content_preview: ucme.content?.substring(0, 50) + '...',
          created_at: ucme.created_at,
          status: ucme.status
        });
      });
    } else {
      debug('📝 No UCMes found for user:', userId);
    }
    
    const responseData = createSuccessResponse(
      ucmes || [],
      `Trovate ${ucmes?.length || 0} UCMe per l'utente`,
      {
        correlationId: req.correlationId,
        count: ucmes?.length || 0,
        userEmail,
        userId,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: req.headers['user-agent']?.substring(0, 100),
          isMobile: req.headers['user-agent']?.toLowerCase().includes('mobile')
        }
      }
    );
    
    logSuccess('UCMes retrieved successfully', req, {
      userId,
      email: userEmail,
      count: ucmes?.length || 0,
      correlationId: req.correlationId
    });
    
    debug('🚀 Sending response with', ucmes?.length || 0, 'UCMes');
    return res.status(200).json(responseData);
    
  } catch (err) {
    throw new DatabaseError(
      'Errore nel caricamento UCMe',
      'UCME_FETCH_FAILED',
      { userId, correlationId: req.correlationId, originalError: err.message }
    );
  }
}

// ================================================================
// HANDLER POST - CREA UCME
// ================================================================

async function handleCreateUCMe(req, res) {
  debug('📝 POST UCMe request');
  
  // ================================================================
  // INPUT VALIDATION E SANITIZZAZIONE
  // ================================================================
  
  debug('🔍 Starting input validation and sanitization...');
  
  const validationResult = await validateAndSanitize(req.body, createUcmeSchema);
  
  if (!validationResult.valid) {
    throw new ValidationError(
      'Dati UCMe non validi',
      'UCME_DATA_INVALID',
      { 
        validationErrors: validationResult.errors,
        correlationId: req.correlationId
      }
    );
  }
  
  const { content, title, anonymous, email } = validationResult.data;
  
  debug('✅ Input validation passed');
  debug('📦 Validated data:', {
    contentLength: content.length,
    hasTitle: !!title,
    titleLength: title?.length || 0,
    isAnonymous: anonymous,
    hasEmail: !!email
  });
  
  // ================================================================
  // GESTIONE AUTENTICAZIONE / ANONIMO
  // ================================================================
  
  let userId = null;
  let userEmail = null;
  
  if (anonymous) {
    debug('👤 Processing anonymous UCMe...');
    
    if (!email) {
      throw new ValidationError(
        'Email richiesta per UCMe anonime',
        'ANONYMOUS_EMAIL_REQUIRED',
        { correlationId: req.correlationId }
      );
    }
    
    userEmail = email;
    debug('📧 Anonymous email provided:', email);
    
  } else {
    debug('🔐 Processing authenticated UCMe...');
    
    // Middleware di autenticazione per UCMe non anonime
    await new Promise((resolve, reject) => {
      requireAuthentication()(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    userId = req.user.userId;
    userEmail = req.user.email;
    
    debug('✅ User authenticated:', {
      userId: userId,
      email: userEmail
    });
  }
  
  // ================================================================
  // SALVATAGGIO UCME
  // ================================================================
  
  debug('💾 Saving UCMe to database...');
  
  let savedUCMe;
  
  if (anonymous) {
    debug('💾 Saving anonymous UCMe...');
    savedUCMe = await saveAnonymousUCMe(userEmail, content, title);
  } else {
    debug('💾 Saving authenticated UCMe...');
    savedUCMe = await saveUCMe(userId, content, title);
  }
  
  if (!savedUCMe) {
    throw new DatabaseError(
      'Errore durante il salvataggio della UCMe',
      'UCME_SAVE_FAILED',
      { 
        anonymous: anonymous,
        correlationId: req.correlationId
      }
    );
  }
  
  debug('✅ UCMe saved successfully');
  debug('📦 Saved UCMe info:', {
    ucmeId: savedUCMe.id,
    userId: savedUCMe.user_id,
    contentLength: savedUCMe.content?.length || 0,
    hasTitle: !!savedUCMe.title,
    isAnonymous: savedUCMe.is_anonymous,
    createdAt: savedUCMe.created_at
  });
  
  // ================================================================
  // RISPOSTA DI SUCCESSO
  // ================================================================
  
  const responseData = createSuccessResponse(
    {
      ucme: {
        id: savedUCMe.id,
        content: savedUCMe.content,
        title: savedUCMe.title,
        isAnonymous: savedUCMe.is_anonymous,
        status: savedUCMe.status,
        createdAt: savedUCMe.created_at
      },
      user: anonymous ? null : {
        id: userId,
        email: userEmail
      }
    },
    anonymous ? 'UCMe anonima salvata con successo' : 'UCMe salvata con successo',
    {
      correlationId: req.correlationId,
      securityLevel: 'high',
      ucmeType: anonymous ? 'anonymous' : 'authenticated'
    }
  );
  
  // Log successo
  logSuccess('UCMe created successfully', req, {
    ucmeId: savedUCMe.id,
    userId: userId || 'anonymous',
    email: userEmail,
    isAnonymous: anonymous,
    contentLength: content.length,
    correlationId: req.correlationId
  });
  
  debug('✅ UCMe creation process completed successfully');
  debug('📤 Sending success response');
  
  return res.status(201).json(responseData);
}

// ================================================================
// HANDLER PUT - AGGIORNA UCME
// ================================================================

async function handleUpdateUCMe(req, res) {
  debug('🔄 PUT UCMe request');
  
  // Autenticazione richiesta per PUT
  await new Promise((resolve, reject) => {
    requireAuthentication()(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const userId = req.user.userId;
  const userEmail = req.user.email;
  const ucmeId = req.query.id || req.body.id;
  
  if (!ucmeId) {
    throw new ValidationError(
      'ID UCMe richiesto per l\'aggiornamento',
      'UCME_ID_REQUIRED',
      { correlationId: req.correlationId }
    );
  }
  
  debug('✅ User authenticated for PUT:', { userId, email: userEmail, ucmeId });
  
  try {
    const updatedUCMe = await updateUCMe(ucmeId, userId, req.body);
    
    if (!updatedUCMe) {
      throw new DatabaseError(
        'UCMe non trovata o non autorizzato',
        'UCME_NOT_FOUND_OR_UNAUTHORIZED',
        { ucmeId, userId, correlationId: req.correlationId }
      );
    }
    
    const responseData = createSuccessResponse(
      { ucme: updatedUCMe },
      'UCMe aggiornata con successo',
      {
        correlationId: req.correlationId,
        ucmeId: updatedUCMe.id,
        timestamp: new Date().toISOString()
      }
    );
    
    logSuccess('UCMe updated successfully', req, {
      ucmeId: updatedUCMe.id,
      userId,
      email: userEmail,
      correlationId: req.correlationId
    });
    
    return res.status(200).json(responseData);
    
  } catch (err) {
    throw new DatabaseError(
      'Errore nell\'aggiornamento UCMe',
      'UCME_UPDATE_FAILED',
      { ucmeId, userId, correlationId: req.correlationId, originalError: err.message }
    );
  }
}

// ================================================================
// HANDLER DELETE - ELIMINA UCME
// ================================================================

async function handleDeleteUCMe(req, res) {
  debug('🗑️ DELETE UCMe request');
  
  // Autenticazione richiesta per DELETE
  await new Promise((resolve, reject) => {
    requireAuthentication()(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const userId = req.user.userId;
  const userEmail = req.user.email;
  const ucmeId = req.query.id || req.body.id;
  
  if (!ucmeId) {
    throw new ValidationError(
      'ID UCMe richiesto per l\'eliminazione',
      'UCME_ID_REQUIRED',
      { correlationId: req.correlationId }
    );
  }
  
  debug('✅ User authenticated for DELETE:', { userId, email: userEmail, ucmeId });
  
  try {
    const deleted = await deleteUCMe(ucmeId, userId);
    
    if (!deleted) {
      throw new DatabaseError(
        'UCMe non trovata o non autorizzato',
        'UCME_NOT_FOUND_OR_UNAUTHORIZED',
        { ucmeId, userId, correlationId: req.correlationId }
      );
    }
    
    const responseData = createSuccessResponse(
      { ucmeId },
      'UCMe eliminata con successo',
      {
        correlationId: req.correlationId,
        ucmeId,
        timestamp: new Date().toISOString()
      }
    );
    
    logSuccess('UCMe deleted successfully', req, {
      ucmeId,
      userId,
      email: userEmail,
      correlationId: req.correlationId
    });
    
    return res.status(200).json(responseData);
    
  } catch (err) {
    throw new DatabaseError(
      'Errore nell\'eliminazione UCMe',
      'UCME_DELETE_FAILED',
      { ucmeId, userId, correlationId: req.correlationId, originalError: err.message }
    );
  }
} 