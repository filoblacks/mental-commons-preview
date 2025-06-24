// ================================================================
// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");
// Sistema di rate limiting
const { rateLimitMiddleware, checkRateLimitByIdentifier } = require('./rate-limiter.js');
// MENTAL COMMONS - REGISTER API CON SUPABASE
// ================================================================
// Versione: 2.1.0 - SECURITY UPDATE
// Descrizione: API registrazione con backend persistente Supabase + Rate Limiting

import { 
  findUserByEmail, 
  createUser, 
  generateJWT, 
  saveUserSession,
  testDatabaseConnection,
  logConfiguration
} from './supabase.js';

// ================================================================
// MENTAL COMMONS - REGISTER API SECURITY HARDENED
// ================================================================
// Versione: 3.0.0 - SECURITY HARDENING SPRINT 2 - COMPLETO
// Descrizione: API registrazione con sicurezza avanzata integrata

// ================================================================
// SECURITY IMPORTS
// ================================================================
const { validatePassword } = require('./password-policy.js');
const { validateAndSanitize, registerSchema } = require('./validation.js');
const { createSession, setSecureSessionCookie } = require('./session-manager.js');
const { 
  ValidationError, 
  ConflictError, 
  DatabaseError,
  createSuccessResponse,
  createErrorResponse,
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
  
  const rateLimitCheck = rateLimitMiddleware('register');
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
  debug('🟣 REGISTER API v3.0 - SECURITY HARDENED');
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
  
  const validationResult = await validateAndSanitize(req.body, registerSchema);
  
  if (!validationResult.valid) {
    throw new ValidationError(
      'Dati di registrazione non validi',
      'REGISTRATION_DATA_INVALID',
      { 
        validationErrors: validationResult.errors,
        correlationId: req.correlationId
      }
    );
  }
  
  const { email, password, name, surname } = validationResult.data;
  
  debug('✅ Input validation passed');
  debug('📦 Validated data:', {
    email: email,
    name: name,
    surname: surname || 'N/A',
    passwordLength: password.length
  });
  
  // ================================================================
  // PASSWORD POLICY VALIDATION
  // ================================================================
  
  debug('🔐 Starting advanced password policy validation...');
  
  const passwordValidation = await validatePassword(password);
  
  if (!passwordValidation.valid) {
    throw new ValidationError(
      'Password non conforme ai requisiti di sicurezza',
      'PASSWORD_POLICY_VIOLATION',
      {
        passwordScore: passwordValidation.score,
        failedRequirements: passwordValidation.failedRequirements,
        summary: passwordValidation.summary,
        correlationId: req.correlationId
      }
    );
  }
  
  debug(`✅ Password policy validation passed (score: ${passwordValidation.score}%)`);
  
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
  // VERIFICA UTENTE ESISTENTE
  // ================================================================
  
  debug('🔍 Checking if user already exists...');
  
  const existingUser = await findUserByEmail(email);
  
  if (existingUser) {
    debug('❌ User already exists with this email');
    throw new ConflictError(
      'Account già esistente con questa email',
      'USER_ALREADY_EXISTS',
      { 
        email: email,
        correlationId: req.correlationId
      }
    );
  }
  
  debug('✅ Email is available for registration');
  
  // ================================================================
  // CREAZIONE UTENTE
  // ================================================================
  
  debug('👤 Creating new user account...');
  
  const newUser = await createUser(email, password, name, surname);
  
  if (!newUser) {
    throw new DatabaseError(
      'Errore durante la creazione dell\'account',
      'USER_CREATION_FAILED',
      { correlationId: req.correlationId }
    );
  }
  
  debug('✅ User account created successfully');
  debug('📦 User created:', {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role
  });
  
  // ================================================================
  // CREAZIONE SESSIONE SICURA
  // ================================================================
  
  debug('🔐 Creating secure session...');
  
  const sessionResult = await createSession(newUser.id, newUser.email, req);
  
  // Configura cookie sicuro
  setSecureSessionCookie(res, sessionResult.token);
  
  debug('✅ Secure session created');
  debug('📦 Session info:', {
    sessionId: sessionResult.sessionId,
    expiresAt: new Date(sessionResult.expiresAt).toISOString()
  });
  
  // ================================================================
  // RISPOSTA DI SUCCESSO
  // ================================================================
  
  const responseData = createSuccessResponse(
    {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        surname: newUser.surname,
        role: newUser.role,
        createdAt: newUser.created_at
      },
      session: {
        expiresAt: sessionResult.expiresAt
      }
    },
    'Registrazione completata con successo',
    {
      correlationId: req.correlationId,
      passwordScore: passwordValidation.score,
      securityLevel: 'high'
    }
  );
  
  // Log successo
  logSuccess('User registration completed successfully', req, {
    userId: newUser.id,
    email: newUser.email,
    passwordScore: passwordValidation.score,
    correlationId: req.correlationId
  });
  
  debug('✅ Registration process completed successfully');
  debug('📤 Sending success response');
  
  return res.status(201).json(responseData);
});

// ================================================================
// EXPORT CON MIDDLEWARE DI SICUREZZA
// ================================================================

// Il gestore degli errori viene applicato automaticamente da asyncErrorHandler 