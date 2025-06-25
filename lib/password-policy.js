// ================================================================
// MENTAL COMMONS - PASSWORD POLICY VALIDATION
// ================================================================
// Versione: 1.0.0
// Descrizione: Sistema di validazione password avanzato per sicurezza

// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");

// ================================================================
// CONFIGURAZIONE POLICY PASSWORD
// ================================================================

const PASSWORD_POLICY = {
  minLength: 6,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  blacklistedPasswords: [
    'password', '123456', 'password123', 'admin', 'letmein',
    'welcome', 'monkey', 'qwerty', 'abc123', 'password1'
  ]
};

// ================================================================
// FUNZIONI DI VALIDAZIONE
// ================================================================

/**
 * Valida una password secondo la policy di sicurezza
 * @param {string} password - La password da validare
 * @returns {Promise<Object>} Oggetto con risultato validazione
 */
async function validatePassword(password) {
  debug('🔐 Starting password policy validation...');
  
  const result = {
    valid: true,
    score: 0,
    failedRequirements: [],
    summary: '',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      numbers: false,
      specialChars: false,
      notBlacklisted: false
    }
  };

  try {
    // ================================================================
    // CONTROLLO LUNGHEZZA
    // ================================================================
    
    if (!password || typeof password !== 'string') {
      result.valid = false;
      result.failedRequirements.push('Password must be a valid string');
      result.summary = 'Password non valida';
      return result;
    }

    if (password.length < PASSWORD_POLICY.minLength) {
      result.valid = false;
      result.failedRequirements.push(`Minimo ${PASSWORD_POLICY.minLength} caratteri`);
    } else if (password.length > PASSWORD_POLICY.maxLength) {
      result.valid = false;
      result.failedRequirements.push(`Massimo ${PASSWORD_POLICY.maxLength} caratteri`);
    } else {
      result.requirements.length = true;
      result.score += 20;
    }

    // ================================================================
    // CONTROLLO CARATTERI (OPZIONALI)
    // ================================================================
    
    // Maiuscole
    if (PASSWORD_POLICY.requireUppercase) {
      if (!/[A-Z]/.test(password)) {
        result.valid = false;
        result.failedRequirements.push('Almeno una lettera maiuscola');
      } else {
        result.requirements.uppercase = true;
        result.score += 15;
      }
    } else {
      result.requirements.uppercase = true;
      if (/[A-Z]/.test(password)) {
        result.score += 10; // Bonus se presente anche se non richiesto
      }
    }

    // Minuscole
    if (PASSWORD_POLICY.requireLowercase) {
      if (!/[a-z]/.test(password)) {
        result.valid = false;
        result.failedRequirements.push('Almeno una lettera minuscola');
      } else {
        result.requirements.lowercase = true;
        result.score += 15;
      }
    } else {
      result.requirements.lowercase = true;
      if (/[a-z]/.test(password)) {
        result.score += 10; // Bonus se presente anche se non richiesto
      }
    }

    // Numeri
    if (PASSWORD_POLICY.requireNumbers) {
      if (!/[0-9]/.test(password)) {
        result.valid = false;
        result.failedRequirements.push('Almeno un numero');
      } else {
        result.requirements.numbers = true;
        result.score += 15;
      }
    } else {
      result.requirements.numbers = true;
      if (/[0-9]/.test(password)) {
        result.score += 10; // Bonus se presente anche se non richiesto
      }
    }

    // Caratteri speciali
    if (PASSWORD_POLICY.requireSpecialChars) {
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        result.valid = false;
        result.failedRequirements.push('Almeno un carattere speciale');
      } else {
        result.requirements.specialChars = true;
        result.score += 15;
      }
    } else {
      result.requirements.specialChars = true;
      if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        result.score += 10; // Bonus se presente anche se non richiesto
      }
    }

    // ================================================================
    // CONTROLLO BLACKLIST
    // ================================================================
    
    const passwordLower = password.toLowerCase();
    const isBlacklisted = PASSWORD_POLICY.blacklistedPasswords.some(blacklisted => 
      passwordLower.includes(blacklisted.toLowerCase())
    );

    if (isBlacklisted) {
      result.valid = false;
      result.failedRequirements.push('Password troppo comune');
    } else {
      result.requirements.notBlacklisted = true;
      result.score += 25;
    }

    // ================================================================
    // BONUS SCORE PER LUNGHEZZA EXTRA
    // ================================================================
    
    if (password.length > 8) {
      result.score += Math.min((password.length - 8) * 2, 20);
    }

    // ================================================================
    // NORMALIZZAZIONE SCORE E SUMMARY
    // ================================================================
    
    result.score = Math.min(result.score, 100);

    if (result.valid) {
      if (result.score >= 80) {
        result.summary = 'Password molto sicura';
      } else if (result.score >= 60) {
        result.summary = 'Password sicura';
      } else {
        result.summary = 'Password accettabile';
      }
    } else {
      result.summary = `Password non valida: ${result.failedRequirements.join(', ')}`;
    }

    debug('✅ Password validation completed');
    debug('📊 Score:', result.score);
    debug('📋 Requirements:', result.requirements);
    debug('💬 Summary:', result.summary);

    return result;

  } catch (err) {
    console.error('❌ Errore durante validazione password:', err);
    
    // Ritorna un fallback sicuro
    return {
      valid: false,
      score: 0,
      failedRequirements: ['Errore interno durante validazione'],
      summary: 'Errore durante validazione password',
      requirements: {
        length: false,
        uppercase: false,
        lowercase: false,
        numbers: false,
        specialChars: false,
        notBlacklisted: false
      }
    };
  }
}

// ================================================================
// FUNZIONI HELPER
// ================================================================

/**
 * Aggiorna la policy delle password
 * @param {Object} newPolicy - Nuova configurazione policy
 */
function updatePasswordPolicy(newPolicy) {
  Object.assign(PASSWORD_POLICY, newPolicy);
  debug('🔐 Password policy updated:', PASSWORD_POLICY);
}

/**
 * Ottieni la policy corrente
 * @returns {Object} Policy corrente
 */
function getPasswordPolicy() {
  return { ...PASSWORD_POLICY };
}

// ================================================================
// EXPORT
// ================================================================

module.exports = {
  validatePassword,
  updatePasswordPolicy,
  getPasswordPolicy
}; 