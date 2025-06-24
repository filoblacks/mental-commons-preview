// ================================================================
// MENTAL COMMONS - SESSION MANAGER SICURO
// ================================================================
// Versione: 1.0.0 - SECURITY HARDENING SPRINT 2
// Descrizione: Gestione sessioni sicura con protezioni avanzate

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { debug, warn, error, info } = require('../logger.js');

// ================================================================
// CONFIGURAZIONE SESSIONI
// ================================================================

const SESSION_CONFIG = {
  // Timeout sessione in millisecondi (default 30 minuti)
  defaultTimeout: 30 * 60 * 1000, // 30 min
  maxTimeout: 24 * 60 * 60 * 1000, // 24 ore
  
  // Configurazione cookie
  cookieName: 'mc_session',
  cookieOptions: {
    httpOnly: true,        // Non accessibile via JavaScript
    secure: true,          // Solo HTTPS in produzione
    sameSite: 'strict',    // Protezione CSRF
    maxAge: 30 * 60 * 1000, // 30 minuti
    path: '/'
  },
  
  // Configurazione JWT
  jwtOptions: {
    expiresIn: '30m',
    issuer: 'mental-commons',
    audience: 'mental-commons-users'
  },
  
  // Rotazione automatica sessioni
  rotationInterval: 15 * 60 * 1000, // 15 minuti
  
  // Limite sessioni attive per utente
  maxActiveSessions: 5
};

// Storage delle sessioni attive (in produzione usare Redis)
const activeSessions = new Map();
const userSessions = new Map(); // userId -> Set di sessionId

// ================================================================
// UTILITÀ SICUREZZA
// ================================================================

/**
 * Genera un ID sessione sicuro
 */
function generateSecureSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Genera un fingerprint del dispositivo/browser
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${userAgent}:${acceptLanguage}:${acceptEncoding}:${ip}`)
    .digest('hex');
  
  return fingerprint.substring(0, 16); // Primi 16 caratteri
}

/**
 * Ottiene il JWT secret con validazione
 */
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  return secret;
}

/**
 * Determina se siamo in ambiente produzione
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

// ================================================================
// GESTIONE SESSIONI
// ================================================================

/**
 * Crea una nuova sessione sicura
 */
async function createSession(userId, email, req, options = {}) {
  try {
    debug(`🔐 Creating new session for user: ${userId}`);
    
    const sessionId = generateSecureSessionId();
    const deviceFingerprint = generateDeviceFingerprint(req);
    const now = Date.now();
    const timeout = options.timeout || SESSION_CONFIG.defaultTimeout;
    
    // Dati della sessione
    const sessionData = {
      sessionId,
      userId,
      email,
      deviceFingerprint,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + timeout,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      isActive: true,
      rotationCount: 0
    };
    
    // Payload JWT
    const jwtPayload = {
      sessionId,
      userId,
      email,
      deviceFingerprint,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + timeout) / 1000),
      iss: SESSION_CONFIG.jwtOptions.issuer,
      aud: SESSION_CONFIG.jwtOptions.audience
    };
    
    // Genera JWT token
    const token = jwt.sign(jwtPayload, getJWTSecret());
    
    // Gestisce limite sessioni per utente
    await enforceSessionLimit(userId, sessionId);
    
    // Salva sessione
    activeSessions.set(sessionId, sessionData);
    
    // Traccia sessioni utente
    if (!userSessions.has(userId)) {
      userSessions.set(userId, new Set());
    }
    userSessions.get(userId).add(sessionId);
    
    debug(`✅ Session created: ${sessionId} for user ${userId}`);
    
    return {
      sessionId,
      token,
      expiresAt: sessionData.expiresAt,
      sessionData
    };
    
  } catch (err) {
    error(`❌ Error creating session for user ${userId}:`, err);
    throw new Error('Failed to create session');
  }
}

/**
 * Applica il limite di sessioni attive per utente
 */
async function enforceSessionLimit(userId, newSessionId) {
  const userSessionSet = userSessions.get(userId);
  
  if (!userSessionSet) {
    return;
  }
  
  const activeSesCount = Array.from(userSessionSet).filter(sessionId => {
    const session = activeSessions.get(sessionId);
    return session && session.isActive && session.expiresAt > Date.now();
  }).length;
  
  if (activeSesCount >= SESSION_CONFIG.maxActiveSessions) {
    debug(`⚠️ User ${userId} has ${activeSesCount} active sessions, cleaning oldest`);
    
    // Ordina per ultima attività e rimuove le più vecchie
    const sessions = Array.from(userSessionSet)
      .map(sessionId => activeSessions.get(sessionId))
      .filter(session => session && session.isActive)
      .sort((a, b) => a.lastActivity - b.lastActivity);
    
    const sessionsToRemove = sessions.slice(0, activeSesCount - SESSION_CONFIG.maxActiveSessions + 1);
    
    for (const session of sessionsToRemove) {
      if (session.sessionId !== newSessionId) {
        await invalidateSession(session.sessionId, 'session_limit_exceeded');
      }
    }
  }
}

/**
 * Valida una sessione esistente
 */
async function validateSession(token, req) {
  try {
    debug('🔍 Validating session token');
    
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }
    
    // Verifica JWT
    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
    } catch (jwtError) {
      debug(`❌ JWT verification failed: ${jwtError.message}`);
      return { valid: false, error: 'Invalid token' };
    }
    
    const { sessionId, userId, deviceFingerprint } = decoded;
    
    // Verifica sessione nel storage
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      debug(`❌ Session not found: ${sessionId}`);
      return { valid: false, error: 'Session not found' };
    }
    
    // Verifica se la sessione è scaduta
    if (session.expiresAt <= Date.now()) {
      debug(`❌ Session expired: ${sessionId}`);
      await invalidateSession(sessionId, 'expired');
      return { valid: false, error: 'Session expired' };
    }
    
    // Verifica se la sessione è attiva
    if (!session.isActive) {
      debug(`❌ Session is inactive: ${sessionId}`);
      return { valid: false, error: 'Session inactive' };
    }
    
    // Verifica device fingerprint per prevenire session hijacking
    const currentFingerprint = generateDeviceFingerprint(req);
    if (session.deviceFingerprint !== currentFingerprint) {
      warn(`🚨 Device fingerprint mismatch for session ${sessionId}`);
      warn(`Expected: ${session.deviceFingerprint}, Got: ${currentFingerprint}`);
      await invalidateSession(sessionId, 'device_mismatch');
      return { valid: false, error: 'Device mismatch' };
    }
    
    // Aggiorna ultima attività
    session.lastActivity = Date.now();
    activeSessions.set(sessionId, session);
    
    debug(`✅ Session validated: ${sessionId}`);
    
    return {
      valid: true,
      session: session,
      userId: session.userId,
      email: session.email
    };
    
  } catch (err) {
    error('❌ Error validating session:', err);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Rinnova una sessione (rotazione token)
 */
async function refreshSession(sessionId, req) {
  try {
    debug(`🔄 Refreshing session: ${sessionId}`);
    
    const session = activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }
    
    // Crea nuova sessione
    const newSessionResult = await createSession(
      session.userId,
      session.email,
      req,
      { timeout: SESSION_CONFIG.defaultTimeout }
    );
    
    // Invalida la vecchia sessione
    await invalidateSession(sessionId, 'rotated');
    
    debug(`✅ Session refreshed: ${sessionId} -> ${newSessionResult.sessionId}`);
    
    return newSessionResult;
    
  } catch (err) {
    error(`❌ Error refreshing session ${sessionId}:`, err);
    throw new Error('Failed to refresh session');
  }
}

/**
 * Invalida una sessione
 */
async function invalidateSession(sessionId, reason = 'manual') {
  try {
    debug(`🗑️ Invalidating session: ${sessionId} (reason: ${reason})`);
    
    const session = activeSessions.get(sessionId);
    
    if (session) {
      // Marca come inattiva
      session.isActive = false;
      session.invalidatedAt = Date.now();
      session.invalidationReason = reason;
      
      // Rimuove dal tracking utente
      const userSessionSet = userSessions.get(session.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        
        if (userSessionSet.size === 0) {
          userSessions.delete(session.userId);
        }
      }
      
      // Rimuove dal storage
      activeSessions.delete(sessionId);
      
      debug(`✅ Session invalidated: ${sessionId}`);
    }
    
  } catch (err) {
    error(`❌ Error invalidating session ${sessionId}:`, err);
  }
}

/**
 * Invalida tutte le sessioni di un utente
 */
async function invalidateAllUserSessions(userId, excludeSessionId = null) {
  try {
    debug(`🗑️ Invalidating all sessions for user: ${userId}`);
    
    const userSessionSet = userSessions.get(userId);
    
    if (!userSessionSet) {
      debug(`No sessions found for user: ${userId}`);
      return 0;
    }
    
    let invalidatedCount = 0;
    
    for (const sessionId of userSessionSet) {
      if (sessionId !== excludeSessionId) {
        await invalidateSession(sessionId, 'user_logout_all');
        invalidatedCount++;
      }
    }
    
    debug(`✅ Invalidated ${invalidatedCount} sessions for user ${userId}`);
    
    return invalidatedCount;
    
  } catch (err) {
    error(`❌ Error invalidating all sessions for user ${userId}:`, err);
    throw new Error('Failed to invalidate user sessions');
  }
}

/**
 * Configura cookie di sessione sicuri
 */
function setSecureSessionCookie(res, token, options = {}) {
  const cookieOptions = {
    ...SESSION_CONFIG.cookieOptions,
    ...options,
    secure: isProduction() // Solo HTTPS in produzione
  };
  
  debug('🍪 Setting secure session cookie');
  
  res.cookie(SESSION_CONFIG.cookieName, token, cookieOptions);
}

/**
 * Rimuove cookie di sessione
 */
function clearSessionCookie(res) {
  debug('🗑️ Clearing session cookie');
  
  res.clearCookie(SESSION_CONFIG.cookieName, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/'
  });
}

/**
 * Ottiene token dalla richiesta (cookie o header)
 */
function extractTokenFromRequest(req) {
  // Prima controlla nei cookie
  const tokenFromCookie = req.cookies?.[SESSION_CONFIG.cookieName];
  
  if (tokenFromCookie) {
    debug('🍪 Token found in cookie');
    return tokenFromCookie;
  }
  
  // Poi controlla nell'header Authorization
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    debug('📤 Token found in Authorization header');
    return authHeader.substring(7);
  }
  
  debug('❌ No token found in request');
  return null;
}

// ================================================================
// PULIZIA AUTOMATICA SESSIONI SCADUTE
// ================================================================

/**
 * Pulisce sessioni scadute
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.expiresAt <= now || !session.isActive) {
      activeSessions.delete(sessionId);
      
      const userSessionSet = userSessions.get(session.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          userSessions.delete(session.userId);
        }
      }
      
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    debug(`🧹 Cleaned up ${cleanedCount} expired sessions`);
  }
  
  return cleanedCount;
}

// Avvia pulizia automatica ogni 5 minuti
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

// ================================================================
// MIDDLEWARE AUTENTICAZIONE
// ================================================================

/**
 * Middleware per proteggere endpoint autenticati
 */
function requireAuthentication(options = {}) {
  return async (req, res, next) => {
    try {
      const token = extractTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token di autenticazione richiesto',
          error: 'authentication_required'
        });
      }
      
      const validation = await validateSession(token, req);
      
      if (!validation.valid) {
        clearSessionCookie(res);
        
        return res.status(401).json({
          success: false,
          message: 'Sessione non valida o scaduta',
          error: validation.error
        });
      }
      
      // Aggiunge informazioni utente alla richiesta
      req.user = {
        userId: validation.userId,
        email: validation.email,
        sessionId: validation.session.sessionId
      };
      
      // Controlla se è necessaria la rotazione della sessione
      const sessionAge = Date.now() - validation.session.createdAt;
      if (sessionAge > SESSION_CONFIG.rotationInterval) {
        debug('🔄 Session rotation needed');
        // Nota: rotazione implementabile qui se necessario
      }
      
      next();
      
    } catch (err) {
      error('❌ Authentication middleware error:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Errore interno di autenticazione',
        error: 'internal_error'
      });
    }
  };
}

// ================================================================
// FUNZIONI DI UTILITÀ
// ================================================================

/**
 * Ottiene statistiche delle sessioni
 */
function getSessionStats() {
  const totalSessions = activeSessions.size;
  const totalUsers = userSessions.size;
  const now = Date.now();
  
  let activeSes = 0;
  let expiredSes = 0;
  
  for (const session of activeSessions.values()) {
    if (session.isActive && session.expiresAt > now) {
      activeSes++;
    } else {
      expiredSes++;
    }
  }
  
  return {
    totalSessions,
    activeSessions: activeSes,
    expiredSessions: expiredSes,
    totalUsers,
    averageSessionsPerUser: totalUsers > 0 ? totalSessions / totalUsers : 0
  };
}

// ================================================================
// EXPORT FUNCTIONS
// ================================================================

module.exports = {
  // Gestione sessioni
  createSession,
  validateSession,
  refreshSession,
  invalidateSession,
  invalidateAllUserSessions,
  
  // Cookie management
  setSecureSessionCookie,
  clearSessionCookie,
  extractTokenFromRequest,
  
  // Middleware
  requireAuthentication,
  
  // Utilità
  generateDeviceFingerprint,
  getSessionStats,
  cleanupExpiredSessions,
  
  // Configurazione
  SESSION_CONFIG
}; 