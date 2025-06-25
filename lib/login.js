// ================================================================
// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");
// Sistema di rate limiting
const { rateLimitMiddleware, checkRateLimitByIdentifier } = require('./rate-limiter.js');
// MENTAL COMMONS - LOGIN API CON SUPABASE
// ================================================================
// Versione: 2.1.0 - SECURITY UPDATE
// Descrizione: API login con backend persistente Supabase + Rate Limiting

const { 
  findUserByEmail, 
  verifyPassword, 
  generateJWT, 
  updateLastLogin,
  saveUserSession,
  testDatabaseConnection,
  logConfiguration
} = require('./supabase.js');

// ================================================================
// MENTAL COMMONS - LOGIN API SECURITY HARDENED
// ================================================================
// Versione: 3.0.0 - SECURITY HARDENING SPRINT 2 - COMPLETO
// Descrizione: API login con sicurezza avanzata integrata

// ================================================================
// SECURITY IMPORTS
// ================================================================
const { validateAndSanitize, loginSchema } = require('./validation.js');
const { createSession, setSecureSessionCookie } = require('./session-manager.js');
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

module.exports = asyncErrorHandler(async function handler(req, res) {
  // ================================================================
  // SECURITY HEADERS E CORS
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://mental-commons.vercel.app' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    debug('🔑 CORS OPTIONS response sent');
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
  
  const rateLimitCheck = rateLimitMiddleware('login');
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
  debug('🟣 LOGIN API v3.0 - SECURITY HARDENED');
  debug('🟣 ============================================');
  debug('🔑 Correlation ID:', req.correlationId);
  debug('🔑 Timestamp:', new Date().toISOString());
  debug('🔑 Method:', req.method);
  debug('🔑 User-Agent:', req.headers['user-agent']);
  debug('🔑 Origin:', req.headers.origin);
  
  logConfiguration();
  
  // ================================================================
  // INPUT VALIDATION E SANITIZZAZIONE
  // ================================================================
  
  debug('🔍 Starting input validation and sanitization...');
  
  const validationResult = await validateAndSanitize(req.body, loginSchema);
  
  if (!validationResult.valid) {
    throw new ValidationError(
      'Dati di login non validi',
      'LOGIN_DATA_INVALID',
      { 
        validationErrors: validationResult.errors,
        correlationId: req.correlationId
      }
    );
  }
  
  const { email, password } = validationResult.data;
  
  debug('✅ Input validation passed');
  debug('📦 Validated data:', {
    email: email,
    passwordLength: password.length
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
  // PROCESSO DI AUTENTICAZIONE
  // ================================================================
  
  debug('🔐 Starting authentication process...');
  
  // 1. Ricerca utente nel database
  debug('📥 Searching user in database...');
  const user = await findUserByEmail(email);
  
  if (!user) {
    debug('❌ User not found in database');
    // Delay artificiale per prevenire timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    
    throw new AuthenticationError(
      'Credenziali non valide',
      'INVALID_CREDENTIALS',
      { 
        reason: 'user_not_found',
        correlationId: req.correlationId
      }
    );
  }
  
  debug('✅ User found in database');
  debug('📦 User info:', {
    userId: user.id,
    name: user.name,
    role: user.role,
    isActive: user.is_active,
    lastLogin: user.last_login
  });
  
  // Verifica se l'account è attivo
  if (!user.is_active) {
    debug('❌ User account is inactive');
    throw new AuthenticationError(
      'Account disabilitato',
      'ACCOUNT_DISABLED',
      { 
        userId: user.id,
        correlationId: req.correlationId
      }
    );
  }
  
  // 2. Verifica password
  debug('🔐 Verifying password...');
  const isPasswordValid = await verifyPassword(password, user.password_hash);
  
  if (!isPasswordValid) {
    debug('❌ Password verification failed');
    // Delay artificiale per prevenire timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    
    throw new AuthenticationError(
      'Credenziali non valide',
      'INVALID_CREDENTIALS',
      { 
        reason: 'invalid_password',
        userId: user.id,
        correlationId: req.correlationId
      }
    );
  }
  
  debug('✅ Password verification successful');
  
  // ================================================================
  // CREAZIONE SESSIONE SICURA
  // ================================================================
  
  debug('🔐 Creating secure session...');
  
  const sessionResult = await createSession(user.id, user.email, req);
  
  // Configura cookie sicuro
  setSecureSessionCookie(res, sessionResult.token);
  
  debug('✅ Secure session created');
  debug('📦 Session info:', {
    sessionId: sessionResult.sessionId,
    expiresAt: new Date(sessionResult.expiresAt).toISOString()
  });
  
  // ================================================================
  // AGGIORNAMENTO ULTIMO LOGIN
  // ================================================================
  
  debug('📅 Updating last login timestamp...');
  await updateLastLogin(user.id);
  debug('✅ Last login timestamp updated');
  
  // ================================================================
  // RISPOSTA DI SUCCESSO
  // ================================================================
  
  const responseData = createSuccessResponse(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
        lastLogin: new Date().toISOString()
      },
      session: {
        expiresAt: sessionResult.expiresAt
      }
    },
    'Login completato con successo',
    {
      correlationId: req.correlationId,
      securityLevel: 'high',
      authenticationMethod: 'password'
    }
  );
  
  // Log successo
  logSuccess('User login completed successfully', req, {
    userId: user.id,
    email: user.email,
    correlationId: req.correlationId,
    sessionId: sessionResult.sessionId
  });
  
  debug('✅ Login process completed successfully');
  debug('📤 Sending success response');
  
  return res.status(200).json(responseData);
});

// ================================================================
// EXPORT CON MIDDLEWARE DI SICUREZZA
// ================================================================

// Il gestore degli errori viene applicato automaticamente da asyncErrorHandler 