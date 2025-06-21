/**
 * Sistema di Logging Centralizzato - Mental Commons
 * Gestisce l'output dei log in base all'ambiente (development/production)
 */

// Determina l'ambiente corrente
const isProduction = () => {
  // Per le API (Node.js/Vercel)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }
  
  // Per il browser (controllo hostname)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('vercel.app');
  }
  
  return false;
};

const PRODUCTION_MODE = isProduction();

/**
 * Logger principale per messaggi informativi
 * Attivo solo in development
 */
export function log(...args) {
  if (!PRODUCTION_MODE) {
    console.log(...args);
  }
}

/**
 * Logger per debug dettagliato
 * Attivo solo in development
 */
export function debug(...args) {
  if (!PRODUCTION_MODE) {
    console.debug(...args);
  }
}

/**
 * Logger per informazioni generali
 * Attivo solo in development
 */
export function info(...args) {
  if (!PRODUCTION_MODE) {
    console.info(...args);
  }
}

/**
 * Logger per warning
 * Attivo solo in development
 */
export function warn(...args) {
  if (!PRODUCTION_MODE) {
    console.warn(...args);
  }
}

/**
 * Logger per errori critici
 * SEMPRE attivo (anche in production)
 * Usa questo solo per errori che devono essere tracciati in produzione
 */
export function error(...args) {
  console.error(...args);
}

/**
 * Logger per errori critici ma solo in development
 * Per errori che non vogliamo vedere in produzione
 */
export function devError(...args) {
  if (!PRODUCTION_MODE) {
    console.error(...args);
  }
}

/**
 * Utility per logging condizionale
 */
export const Logger = {
  log,
  debug,
  info,
  warn,
  error,
  devError,
  isProduction: () => PRODUCTION_MODE,
  
  // Metodi per raggruppamento (solo in dev)
  group: (label) => {
    if (!PRODUCTION_MODE && console.group) {
      console.group(label);
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
      console.time(label);
    }
  },
  
  timeEnd: (label) => {
    if (!PRODUCTION_MODE && console.timeEnd) {
      console.timeEnd(label);
    }
  }
};

// Per retrocompatibilità con CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { log, debug, info, warn, error, devError, Logger };
} 