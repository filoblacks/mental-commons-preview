/**
 * Sistema di Logging Centralizzato - Mental Commons
 * Gestisce l'output dei log in base all'ambiente (development/production)
 * CON SANITIZZAZIONE DATI SENSIBILI
 */

// Determina l'ambiente corrente
const isProduction = () => {
  // Per le API (Node.js/Vercel) - Solo server-side
  if (typeof process !== 'undefined' && process.env && typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production';
  }
  
  // Per il browser (controllo hostname)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('local');
  }
  
  return false;
};

const PRODUCTION_MODE = isProduction();

// Lista di chiavi sensibili da mascherare nei log
const SENSITIVE_KEYS = [
  'password', 'password_hash', 'token', 'jwt', 'secret', 'key', 'apikey', 'api_key',
  'authorization', 'auth', 'credential', 'session', 'cookie', 'email', 'user_id',
  'userId', 'id', 'uuid', 'ssn', 'pin', 'code', 'otp', 'refresh_token'
];

// Pattern per identificare dati sensibili nel testo
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, // JWT tokens
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // Email addresses
  /password["\s]*:["\s]*[^"\s,}]+/gi, // Password fields in JSON
  /token["\s]*:["\s]*[^"\s,}]+/gi, // Token fields in JSON
];

/**
 * Sanitizza un oggetto rimuovendo/mascherando dati sensibili
 */
function sanitizeObject(obj, maxDepth = 5) {
  if (maxDepth <= 0) return '[MAX_DEPTH_REACHED]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
      // Maschera i valori sensibili
      if (typeof value === 'string') {
        sanitized[key] = value.length > 0 ? '[REDACTED]' : '';
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, maxDepth - 1);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitizza una stringa rimuovendo pattern sensibili
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  let sanitized = str;
  
  // Applica pattern di sanitizzazione
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}

/**
 * Sanitizza gli argomenti del log
 */
function sanitizeLogArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return sanitizeObject(arg);
    } else {
      return arg;
    }
  });
}

/**
 * Logger principale per messaggi informativi
 * Attivo solo in development
 */
function log(...args) {
  if (!PRODUCTION_MODE) {
    const sanitizedArgs = sanitizeLogArgs(args);
    console.log(...sanitizedArgs);
  }
}

/**
 * Logger per debug dettagliato
 * Attivo solo in development
 */
function debug(...args) {
  if (!PRODUCTION_MODE) {
    const sanitizedArgs = sanitizeLogArgs(args);
    console.debug(...sanitizedArgs);
  }
}

/**
 * Logger per informazioni generali
 * Attivo solo in development
 */
function info(...args) {
  if (!PRODUCTION_MODE) {
    const sanitizedArgs = sanitizeLogArgs(args);
    console.info(...sanitizedArgs);
  }
}

/**
 * Logger per warning
 * Attivo solo in development
 */
function warn(...args) {
  if (!PRODUCTION_MODE) {
    const sanitizedArgs = sanitizeLogArgs(args);
    console.warn(...sanitizedArgs);
  }
}

/**
 * Logger per errori critici
 * SEMPRE attivo (anche in production) MA SANITIZZATO
 * Usa questo solo per errori che devono essere tracciati in produzione
 */
function error(...args) {
  const sanitizedArgs = sanitizeLogArgs(args);
  console.error(...sanitizedArgs);
}

/**
 * Logger per errori critici ma solo in development
 * Per errori che non vogliamo vedere in produzione
 */
function devError(...args) {
  if (!PRODUCTION_MODE) {
    const sanitizedArgs = sanitizeLogArgs(args);
    console.error(...sanitizedArgs);
  }
}

/**
 * Logger SICURO per production - Rimuove TUTTI i dati sensibili
 */
function secureLog(...args) {
  const sanitizedArgs = sanitizeLogArgs(args);
  
  if (PRODUCTION_MODE) {
    // In production, logga solo il minimo necessario
    const timestamp = new Date().toISOString();
    const level = 'INFO';
    const message = sanitizedArgs.join(' ');
    console.log(`[${timestamp}] ${level}: ${message}`);
  } else {
    // In development, comportati come log normale
    console.log(...sanitizedArgs);
  }
}

/**
 * Utility per logging condizionale
 */
const Logger = {
  log,
  debug,
  info,
  warn,
  error,
  devError,
  secureLog,
  isProduction: () => PRODUCTION_MODE,
  
  // Metodi per sanitizzazione manuale
  sanitize: sanitizeObject,
  sanitizeString,
  
  // Metodi per raggruppamento (solo in dev)
  group: (label) => {
    if (!PRODUCTION_MODE && console.group) {
      console.group(sanitizeString(label));
    }
  },
  
  groupEnd: () => {
    if (!PRODUCTION_MODE && console.groupEnd) {
      console.groupEnd();
    }
  },
  
  // Timer per performance (solo in dev)
  time: (label) => {
    if (!PRODUCTION_MODE && console.time) {
      console.time(sanitizeString(label));
    }
  },
  
  timeEnd: (label) => {
    if (!PRODUCTION_MODE && console.timeEnd) {
      console.timeEnd(sanitizeString(label));
    }
  },
  
  // Test di sanitizzazione
  testSanitization: () => {
    if (!PRODUCTION_MODE) {
      const testData = {
        password: 'secret123',
        email: 'user@example.com',
        token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
        normalField: 'this should not be redacted',
        user_id: '12345'
      };
      
      console.log('Original:', testData);
      console.log('Sanitized:', sanitizeObject(testData));
    }
  }
};

// Per retrocompatibilità con CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    log, debug, info, warn, error, devError, secureLog, Logger,
    sanitizeObject, sanitizeString
  };
} 