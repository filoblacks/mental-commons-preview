// ================================================================
// MENTAL COMMONS - UCME API SECURITY HARDENED
// ================================================================
// Versione: 3.0.0 - SECURITY HARDENING SPRINT 2 - COMPLETO
// Descrizione: API UCMe con sicurezza avanzata integrata

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
import { 
  saveUCMe, 
  saveAnonymousUCMe,
  testDatabaseConnection,
  logConfiguration
} from './supabase.js';

export default asyncErrorHandler(async function handler(req, res) {
  // ================================================================
  // SECURITY HEADERS E CORS
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://mental-commons.vercel.app' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    debug('📝 CORS OPTIONS response sent');
    return res.status(200).end();
  }
  
  // ================================================================
  // METODO VALIDATION
  // ================================================================
  
  if (req.method !== 'POST') {
    throw new ValidationError(
      'Metodo non consentito. Utilizzare POST.',
      'METHOD_NOT_ALLOWED',
      { receivedMethod: req.method, expectedMethod: 'POST' }
    );
  }
  
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
  // CORRELATION ID E LOGGING INIZIALE
  // ================================================================
  
  correlationMiddleware(req, res, () => {});
  
  debug('🟣 ============================================');
  debug('🟣 UCME API v3.0 - SECURITY HARDENED');
  debug('🟣 ============================================');
  debug('📝 Correlation ID:', req.correlationId);
  debug('📝 Timestamp:', new Date().toISOString());
  debug('📝 Method:', req.method);
  debug('📝 User-Agent:', req.headers['user-agent']);
  debug('📝 Origin:', req.headers.origin);
  
  logConfiguration();
  
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
});

// ================================================================
// EXPORT CON MIDDLEWARE DI SICUREZZA
// ================================================================

// Il gestore degli errori viene applicato automaticamente da asyncErrorHandler 