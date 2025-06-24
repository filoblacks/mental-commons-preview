// ================================================================
// MENTAL COMMONS - RATE LIMITING SYSTEM
// ================================================================
// Versione: 1.0.0
// Descrizione: Sistema di rate limiting per proteggere endpoint critici

const { debug, error } = require('../logger.js');

// In-memory storage per semplicità (in produzione usare Redis)
const rateLimitStore = new Map();

// Configurazioni rate limiting per endpoint
const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minuti
    errorMessage: 'Troppi tentativi di login. Riprova tra 15 minuti.'
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 ora
    errorMessage: 'Troppi tentativi di registrazione. Riprova tra 1 ora.'
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minuto
    errorMessage: 'Troppi tentativi. Riprova tra 1 minuto.'
  },
  ucme: {
    maxAttempts: 20,
    windowMs: 60 * 1000, // 1 minuto
    errorMessage: 'Troppi tentativi di invio UCMe. Riprova tra 1 minuto.'
  }
};

/**
 * Ottieni la chiave identificativa per il rate limiting
 */
function getRateLimitKey(identifier, endpoint) {
  return `${endpoint}:${identifier}`;
}

/**
 * Pulisce i record scaduti dal store
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Verifica e applica rate limiting
 */
function checkRateLimit(identifier, endpoint) {
  cleanupExpiredRecords();
  
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    debug(`⚠️ Rate limit config non trovata per endpoint: ${endpoint}`);
    return { allowed: true };
  }
  
  const key = getRateLimitKey(identifier, endpoint);
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record) {
    // Prima richiesta in questo window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      firstAttempt: now
    });
    
    debug(`🔄 Rate limit inizializzato per ${identifier} su ${endpoint}`);
    return { 
      allowed: true, 
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs
    };
  }
  
  if (now > record.resetTime) {
    // Window scaduto, reset
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      firstAttempt: now
    });
    
    debug(`🔄 Rate limit window reset per ${identifier} su ${endpoint}`);
    return { 
      allowed: true, 
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs
    };
  }
  
  // Incrementa counter
  record.count++;
  rateLimitStore.set(key, record);
  
  const remaining = Math.max(0, config.maxAttempts - record.count);
  const isAllowed = record.count <= config.maxAttempts;
  
  if (!isAllowed) {
    error(`🚫 Rate limit superato per ${identifier} su ${endpoint}: ${record.count}/${config.maxAttempts}`);
  } else {
    debug(`📊 Rate limit check per ${identifier} su ${endpoint}: ${record.count}/${config.maxAttempts}`);
  }
  
  return {
    allowed: isAllowed,
    remaining,
    resetTime: record.resetTime,
    errorMessage: config.errorMessage
  };
}

/**
 * Middleware di rate limiting per express/vercel
 */
function rateLimitMiddleware(endpoint) {
  return (req, res, next) => {
    // Ottieni identificatore (IP + User-Agent per più precisione)
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress ||
                     'unknown';
                     
    const userAgent = req.headers['user-agent'] || 'unknown';
    const identifier = `${clientIP}:${userAgent.substring(0, 50)}`;
    
    debug(`🔍 Rate limit check per ${identifier} su endpoint ${endpoint}`);
    
    const result = checkRateLimit(identifier, endpoint);
    
    // Aggiungi headers informativi
    res.setHeader('X-RateLimit-Limit', RATE_LIMITS[endpoint]?.maxAttempts || 'unknown');
    res.setHeader('X-RateLimit-Remaining', result.remaining || 0);
    res.setHeader('X-RateLimit-Reset', result.resetTime || 0);
    
    if (!result.allowed) {
      debug(`🚫 Richiesta bloccata da rate limiting per ${identifier}`);
      
      return res.status(429).json({
        success: false,
        error: 'rate_limit_exceeded',
        message: result.errorMessage,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        debug: {
          identifier: identifier.substring(0, 20) + '...',
          endpoint,
          resetTime: new Date(result.resetTime).toISOString()
        }
      });
    }
    
    debug(`✅ Rate limit check passed per ${identifier} su ${endpoint}`);
    
    // Continua con la richiesta
    if (next) {
      next();
    }
  };
}

/**
 * Rate limiting per identificatori specifici (es. email)
 */
function checkRateLimitByIdentifier(identifier, endpoint) {
  return checkRateLimit(identifier, endpoint);
}

/**
 * Reset manuale rate limit (per testing o admin)
 */
function resetRateLimit(identifier, endpoint) {
  const key = getRateLimitKey(identifier, endpoint);
  const deleted = rateLimitStore.delete(key);
  
  debug(`🔄 Rate limit reset manuale per ${identifier} su ${endpoint}: ${deleted ? 'success' : 'not found'}`);
  return deleted;
}

/**
 * Statistiche rate limiting
 */
function getRateLimitStats() {
  cleanupExpiredRecords();
  
  const stats = {
    totalActiveKeys: rateLimitStore.size,
    endpoints: {},
    cleanupTime: new Date().toISOString()
  };
  
  for (const [key, record] of rateLimitStore.entries()) {
    const [endpoint] = key.split(':');
    if (!stats.endpoints[endpoint]) {
      stats.endpoints[endpoint] = { count: 0, records: [] };
    }
    stats.endpoints[endpoint].count++;
    stats.endpoints[endpoint].records.push({
      key: key.substring(0, 30) + '...',
      attempts: record.count,
      resetTime: new Date(record.resetTime).toISOString()
    });
  }
  
  return stats;
}

module.exports = {
  rateLimitMiddleware,
  checkRateLimit,
  checkRateLimitByIdentifier,
  resetRateLimit,
  getRateLimitStats,
  RATE_LIMITS
}; 