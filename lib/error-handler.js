// ================================================================
// MENTAL COMMONS - ERROR HANDLER UNIFORME
// ================================================================
// Versione: 1.0.0 - SECURITY HARDENING SPRINT 2
// Descrizione: Gestione errori standardizzata e sicura

const { debug, warn, error, info } = require('../logger.js');

// ================================================================
// CONFIGURAZIONE ERROR HANDLER
// ================================================================

const ERROR_CONFIG = {
  // Livelli di logging
  logLevels: {
    DEBUG: 'debug',
    INFO: 'info', 
    WARN: 'warn',
    ERROR: 'error',
    CRITICAL: 'critical'
  },
  
  // Categorie di errori
  categories: {
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    DATABASE: 'database',
    NETWORK: 'network',
    INTERNAL: 'internal',
    RATE_LIMIT: 'rate_limit',
    SECURITY: 'security'
  },
  
  // Codici di errore standardizzati
  codes: {
    // Validazione (400)
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    
    // Autenticazione (401)
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    
    // Autorizzazione (403)
    ACCESS_DENIED: 'ACCESS_DENIED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    
    // Non trovato (404)
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    ENDPOINT_NOT_FOUND: 'ENDPOINT_NOT_FOUND',
    
    // Conflitto (409)
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
    
    // Rate limiting (429)
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    
    // Errori server (500)
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
  }
};

// ================================================================
// CLASSI DI ERRORE PERSONALIZZATE
// ================================================================

/**
 * Classe base per errori dell'applicazione
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode, category = 'internal', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.category = category;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errori di validazione (400)
 */
class ValidationError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.INVALID_INPUT, details = {}) {
    super(message, 400, errorCode, ERROR_CONFIG.categories.VALIDATION, details);
  }
}

/**
 * Errori di autenticazione (401)
 */
class AuthenticationError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.AUTHENTICATION_REQUIRED, details = {}) {
    super(message, 401, errorCode, ERROR_CONFIG.categories.AUTHENTICATION, details);
  }
}

/**
 * Errori di autorizzazione (403)
 */
class AuthorizationError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.ACCESS_DENIED, details = {}) {
    super(message, 403, errorCode, ERROR_CONFIG.categories.AUTHORIZATION, details);
  }
}

/**
 * Errori risorsa non trovata (404)
 */
class NotFoundError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.RESOURCE_NOT_FOUND, details = {}) {
    super(message, 404, errorCode, ERROR_CONFIG.categories.INTERNAL, details);
  }
}

/**
 * Errori di conflitto (409)
 */
class ConflictError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.RESOURCE_ALREADY_EXISTS, details = {}) {
    super(message, 409, errorCode, ERROR_CONFIG.categories.INTERNAL, details);
  }
}

/**
 * Errori di rate limiting (429)
 */
class RateLimitError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.RATE_LIMIT_EXCEEDED, details = {}) {
    super(message, 429, errorCode, ERROR_CONFIG.categories.RATE_LIMIT, details);
  }
}

/**
 * Errori interni del server (500)
 */
class InternalServerError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.INTERNAL_SERVER_ERROR, details = {}) {
    super(message, 500, errorCode, ERROR_CONFIG.categories.INTERNAL, details);
  }
}

/**
 * Errori di database (500)
 */
class DatabaseError extends AppError {
  constructor(message, errorCode = ERROR_CONFIG.codes.DATABASE_ERROR, details = {}) {
    super(message, 500, errorCode, ERROR_CONFIG.categories.DATABASE, details);
  }
}

// ================================================================
// UTILITÀ DI SANITIZZAZIONE
// ================================================================

/**
 * Determina se siamo in ambiente produzione
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Sanitizza dettagli dell'errore per evitare leak di informazioni
 */
function sanitizeErrorDetails(details) {
  if (!details || typeof details !== 'object') {
    return {};
  }
  
  const sanitized = {};
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'credential', 'hash',
    'jwt', 'session', 'cookie', 'authorization', 'auth'
  ];
  
  for (const [key, value] of Object.entries(details)) {
    const keyLower = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 100) {
      // Trunca stringhe troppo lunghe
      sanitized[key] = value.substring(0, 97) + '...';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeErrorDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitizza stack trace per produzione
 */
function sanitizeStackTrace(stack) {
  if (!stack || isProduction()) {
    return undefined;
  }
  
  // Rimuove path assoluti e informazioni sensibili
  return stack
    .split('\n')
    .map(line => {
      return line
        .replace(/\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+\//g, '/')
        .replace(/at\s+[^(]+\(([^)]+)\)/g, 'at [function] ($1)')
    })
    .slice(0, 10) // Limita a 10 righe
    .join('\n');
}

// ================================================================
// FORMATO STANDARDIZZATO DELLE RISPOSTE
// ================================================================

/**
 * Crea una risposta di errore standardizzata
 */
function createErrorResponse(err, req = {}) {
  const isAppError = err instanceof AppError;
  const isProd = isProduction();
  
  // Informazioni base sempre presenti
  const response = {
    success: false,
    error: {
      message: isAppError ? err.message : 'Errore interno del server',
      code: isAppError ? err.errorCode : ERROR_CONFIG.codes.INTERNAL_SERVER_ERROR,
      category: isAppError ? err.category : ERROR_CONFIG.categories.INTERNAL,
      timestamp: new Date().toISOString()
    }
  };
  
  // In development, aggiungi informazioni extra
  if (!isProd) {
    response.error.details = isAppError ? sanitizeErrorDetails(err.details) : {};
    
    if (err.stack) {
      response.error.stack = sanitizeStackTrace(err.stack);
    }
    
    // Informazioni di debug
    response.debug = {
      originalError: err.message,
      statusCode: isAppError ? err.statusCode : 500,
      endpoint: req.url || 'unknown',
      method: req.method || 'unknown',
      userAgent: req.headers?.['user-agent'] || 'unknown'
    };
  }
  
  return response;
}

/**
 * Crea una risposta di successo standardizzata
 */
function createSuccessResponse(data = null, message = 'Operazione completata con successo', meta = {}) {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

// ================================================================
// LOGGING STRUTTURATO
// ================================================================

/**
 * Logga un errore con formato strutturato
 */
function logError(err, req = {}, context = {}) {
  const isAppError = err instanceof AppError;
  const logLevel = isAppError && err.statusCode < 500 ? 'warn' : 'error';
  
  const logData = {
    timestamp: new Date().toISOString(),
    level: logLevel.toUpperCase(),
    category: isAppError ? err.category : ERROR_CONFIG.categories.INTERNAL,
    errorCode: isAppError ? err.errorCode : ERROR_CONFIG.codes.INTERNAL_SERVER_ERROR,
    message: err.message,
    statusCode: isAppError ? err.statusCode : 500,
    
    // Informazioni richiesta (sanitizzate)
    request: {
      method: req.method || 'unknown',
      url: req.url || 'unknown',
      userAgent: req.headers?.['user-agent'] || 'unknown',
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userId: req.user?.userId || 'anonymous'
    },
    
    // Context aggiuntivo
    context: sanitizeErrorDetails(context),
    
    // Stack trace solo in development
    stack: !isProduction() ? sanitizeStackTrace(err.stack) : undefined
  };
  
  // Log con il livello appropriato
  if (logLevel === 'error') {
    error('🚨 ERROR:', logData);
  } else {
    warn('⚠️ WARNING:', logData);
  }
  
  return logData;
}

/**
 * Logga un evento di successo
 */
function logSuccess(message, req = {}, data = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    category: 'success',
    message,
    
    request: {
      method: req.method || 'unknown',
      url: req.url || 'unknown',
      userId: req.user?.userId || 'anonymous'
    },
    
    data: sanitizeErrorDetails(data)
  };
  
  info('✅ SUCCESS:', logData);
  return logData;
}

// ================================================================
// MIDDLEWARE ERROR HANDLER
// ================================================================

/**
 * Middleware per gestione centralizzata degli errori
 */
function errorHandlerMiddleware(err, req, res, next) {
  // Logga l'errore
  const logData = logError(err, req);
  
  // Determina status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  
  // Crea risposta standardizzata
  const response = createErrorResponse(err, req);
  
  // Aggiunge ID di correlazione per il tracking
  const correlationId = req.correlationId || generateCorrelationId();
  response.error.correlationId = correlationId;
  
  // Invia risposta
  res.status(statusCode).json(response);
  
  // Non chiamare next() per evitare ulteriori gestioni
}

/**
 * Middleware per gestire errori asincroni
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Genera un ID di correlazione per il tracking degli errori
 */
function generateCorrelationId() {
  return require('crypto').randomBytes(8).toString('hex');
}

/**
 * Middleware per aggiungere correlation ID alle richieste
 */
function correlationMiddleware(req, res, next) {
  req.correlationId = generateCorrelationId();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
}

// ================================================================
// GESTORI DI ERRORE SPECIFICI
// ================================================================

/**
 * Gestore per errori di validazione Joi
 */
function handleJoiValidationError(joiError) {
  const details = joiError.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
  
  return new ValidationError(
    'Dati di input non validi',
    ERROR_CONFIG.codes.INVALID_INPUT,
    { validationErrors: details }
  );
}

/**
 * Gestore per errori di database Supabase
 */
function handleSupabaseError(supabaseError) {
  const { code, message, details } = supabaseError;
  
  switch (code) {
    case '23505': // Unique violation
      return new ConflictError(
        'Risorsa già esistente',
        ERROR_CONFIG.codes.RESOURCE_ALREADY_EXISTS,
        { dbCode: code }
      );
      
    case '23503': // Foreign key violation
      return new ValidationError(
        'Riferimento non valido',
        ERROR_CONFIG.codes.INVALID_INPUT,
        { dbCode: code }
      );
      
    default:
      return new DatabaseError(
        'Errore di database',
        ERROR_CONFIG.codes.DATABASE_ERROR,
        { dbCode: code, dbMessage: message }
      );
  }
}

/**
 * Gestore per errori di autenticazione JWT
 */
function handleJWTError(jwtError) {
  switch (jwtError.name) {
    case 'TokenExpiredError':
      return new AuthenticationError(
        'Token scaduto',
        ERROR_CONFIG.codes.TOKEN_EXPIRED
      );
      
    case 'JsonWebTokenError':
      return new AuthenticationError(
        'Token non valido',
        ERROR_CONFIG.codes.TOKEN_INVALID
      );
      
    default:
      return new AuthenticationError(
        'Errore di autenticazione',
        ERROR_CONFIG.codes.AUTHENTICATION_REQUIRED
      );
  }
}

// ================================================================
// EXPORT FUNCTIONS
// ================================================================

module.exports = {
  // Classi di errore
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  
  // Funzioni di gestione errori
  createErrorResponse,
  createSuccessResponse,
  logError,
  logSuccess,
  
  // Middleware
  errorHandlerMiddleware,
  asyncErrorHandler,
  correlationMiddleware,
  
  // Gestori specifici
  handleJoiValidationError,
  handleSupabaseError,
  handleJWTError,
  
  // Utilità
  sanitizeErrorDetails,
  sanitizeStackTrace,
  generateCorrelationId,
  
  // Configurazione
  ERROR_CONFIG
}; 