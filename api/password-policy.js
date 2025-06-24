// ================================================================
// MENTAL COMMONS - PASSWORD POLICY AVANZATA
// ================================================================
// Versione: 1.0.0 - SECURITY HARDENING SPRINT 2
// Descrizione: Password policy conforme alle best practices di sicurezza

const axios = require('axios');
const crypto = require('crypto');
const { debug, warn, error } = require('../logger.js');

// ================================================================
// CONFIGURAZIONE PASSWORD POLICY
// ================================================================

const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  maxConsecutiveChars: 3,
  commonPasswordsCheck: true,
  breachCheck: true
};

// Lista delle password più comuni da bloccare
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'admin123', 'root', 'toor', 'pass', 'test', 'guest',
  'user', 'login', 'master', 'secret', 'access', 'demo', 'temp',
  'password12', 'password1234', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
];

// ================================================================
// VALIDAZIONI PASSWORD POLICY
// ================================================================

/**
 * Valida la lunghezza minima della password
 */
function validateLength(password) {
  const result = {
    valid: password.length >= PASSWORD_POLICY.minLength,
    message: `Password deve essere di almeno ${PASSWORD_POLICY.minLength} caratteri`,
    requirement: `Minimo ${PASSWORD_POLICY.minLength} caratteri`,
    current: password.length
  };
  
  debug(`🔍 Password length check: ${result.current}/${PASSWORD_POLICY.minLength} - ${result.valid ? '✅' : '❌'}`);
  return result;
}

/**
 * Valida la presenza di caratteri maiuscoli
 */
function validateUppercase(password) {
  const hasUppercase = /[A-Z]/.test(password);
  const result = {
    valid: !PASSWORD_POLICY.requireUppercase || hasUppercase,
    message: 'Password deve contenere almeno una lettera maiuscola',
    requirement: 'Almeno 1 maiuscola (A-Z)',
    current: hasUppercase ? '✅ Presente' : '❌ Mancante'
  };
  
  debug(`🔍 Uppercase check: ${result.current} - ${result.valid ? '✅' : '❌'}`);
  return result;
}

/**
 * Valida la presenza di caratteri minuscoli
 */
function validateLowercase(password) {
  const hasLowercase = /[a-z]/.test(password);
  const result = {
    valid: !PASSWORD_POLICY.requireLowercase || hasLowercase,
    message: 'Password deve contenere almeno una lettera minuscola',
    requirement: 'Almeno 1 minuscola (a-z)',
    current: hasLowercase ? '✅ Presente' : '❌ Mancante'
  };
  
  debug(`🔍 Lowercase check: ${result.current} - ${result.valid ? '✅' : '❌'}`);
  return result;
}

/**
 * Valida la presenza di numeri
 */
function validateNumbers(password) {
  const hasNumbers = /[0-9]/.test(password);
  const result = {
    valid: !PASSWORD_POLICY.requireNumbers || hasNumbers,
    message: 'Password deve contenere almeno un numero',
    requirement: 'Almeno 1 numero (0-9)',
    current: hasNumbers ? '✅ Presente' : '❌ Mancante'
  };
  
  debug(`🔍 Numbers check: ${result.current} - ${result.valid ? '✅' : '❌'}`);
  return result;
}

/**
 * Valida la presenza di simboli speciali
 */
function validateSymbols(password) {
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const result = {
    valid: !PASSWORD_POLICY.requireSymbols || hasSymbols,
    message: 'Password deve contenere almeno un simbolo speciale',
    requirement: 'Almeno 1 simbolo (!@#$%^&*...)',
    current: hasSymbols ? '✅ Presente' : '❌ Mancante'
  };
  
  debug(`🔍 Symbols check: ${result.current} - ${result.valid ? '✅' : '❌'}`);
  return result;
}

/**
 * Valida che non ci siano troppi caratteri consecutivi uguali
 */
function validateConsecutiveChars(password) {
  const maxConsecutive = PASSWORD_POLICY.maxConsecutiveChars;
  let consecutiveCount = 1;
  let maxFound = 1;
  
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      consecutiveCount++;
      maxFound = Math.max(maxFound, consecutiveCount);
    } else {
      consecutiveCount = 1;
    }
  }
  
  const result = {
    valid: maxFound <= maxConsecutive,
    message: `Password non può avere più di ${maxConsecutive} caratteri consecutivi uguali`,
    requirement: `Max ${maxConsecutive} caratteri consecutivi`,
    current: `${maxFound} caratteri consecutivi trovati`
  };
  
  debug(`🔍 Consecutive chars check: ${result.current} - ${result.valid ? '✅' : '❌'}`);
  return result;
}

/**
 * Verifica se la password è nella lista delle password comuni
 */
function validateCommonPasswords(password) {
  const passwordLower = password.toLowerCase();
  const isCommon = COMMON_PASSWORDS.some(common => 
    passwordLower === common || 
    passwordLower.includes(common) ||
    common.includes(passwordLower)
  );
  
  const result = {
    valid: !PASSWORD_POLICY.commonPasswordsCheck || !isCommon,
    message: 'Password troppo comune o prevedibile',
    requirement: 'Evitare password comuni',
    current: isCommon ? '❌ Password comune' : '✅ Password unica'
  };
  
  debug(`🔍 Common password check: ${result.current} - ${result.valid ? '✅' : '❌'}`);
  return result;
}

// ================================================================
// HAVEIBEENPWNED API INTEGRATION
// ================================================================

/**
 * Controlla se la password è stata compromessa usando HaveIBeenPwned API
 * Utilizza k-anonymity per non inviare la password completa
 */
async function checkPasswordBreach(password) {
  if (!PASSWORD_POLICY.breachCheck) {
    return {
      valid: true,
      message: 'Controllo breach disabilitato',
      requirement: 'Password non compromessa',
      current: '🔄 Controllo saltato'
    };
  }

  try {
    debug('🔍 Checking password against HaveIBeenPwned database...');
    
    // Genera SHA-1 hash della password
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    debug(`🔒 Using k-anonymity: checking prefix ${prefix}`);
    
    // Chiama API HaveIBeenPwned con prefisso (k-anonymity)
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mental-Commons-Security-Check/1.0'
      }
    });
    
    // Controlla se il suffixo è presente nei risultati
    const lines = response.data.split('\n');
    const found = lines.some(line => {
      const [hashSuffix, count] = line.split(':');
      return hashSuffix.trim() === suffix;
    });
    
    const result = {
      valid: !found,
      message: found ? 'Password è stata compromessa in una violazione di dati' : 'Password non compromessa',
      requirement: 'Password non presente in database breach',
      current: found ? '❌ Compromessa' : '✅ Sicura',
      breachCount: found ? lines.find(l => l.startsWith(suffix))?.split(':')[1]?.trim() : 0
    };
    
    if (found) {
      warn(`🚨 Password found in ${result.breachCount} breaches`);
    } else {
      debug('✅ Password not found in breach database');
    }
    
    return result;
    
  } catch (err) {
    // In caso di errore, non blocchiamo la validazione ma logghiamo l'errore
    error('❌ Errore controllo HaveIBeenPwned:', err.message);
    
    return {
      valid: true, // Non blocchiamo se il servizio è down
      message: 'Impossibile verificare breach (servizio temporaneamente non disponibile)',
      requirement: 'Controllo breach fallito',
      current: '⚠️ Servizio non disponibile',
      error: err.message
    };
  }
}

// ================================================================
// VALIDAZIONE COMPLETA PASSWORD
// ================================================================

/**
 * Esegue tutte le validazioni password policy
 */
async function validatePassword(password) {
  debug('🔐 Starting comprehensive password validation...');
  
  const validations = [
    validateLength(password),
    validateUppercase(password),
    validateLowercase(password),
    validateNumbers(password),
    validateSymbols(password),
    validateConsecutiveChars(password),
    validateCommonPasswords(password)
  ];
  
  // Controllo breach asincrono
  const breachCheck = await checkPasswordBreach(password);
  validations.push(breachCheck);
  
  // Calcola validità complessiva
  const allValid = validations.every(v => v.valid);
  const failedValidations = validations.filter(v => !v.valid);
  
  const result = {
    valid: allValid,
    score: Math.round((validations.filter(v => v.valid).length / validations.length) * 100),
    validations: validations,
    failedRequirements: failedValidations.map(v => v.message),
    summary: {
      total: validations.length,
      passed: validations.filter(v => v.valid).length,
      failed: failedValidations.length
    }
  };
  
  debug(`🔐 Password validation complete: ${result.score}% (${result.summary.passed}/${result.summary.total})`);
  
  if (!allValid) {
    debug('❌ Failed requirements:', result.failedRequirements);
  } else {
    debug('✅ All password requirements met');
  }
  
  return result;
}

/**
 * Genera suggerimenti per migliorare la password
 */
function generatePasswordSuggestions(validationResult) {
  const suggestions = [];
  
  if (!validationResult.valid) {
    suggestions.push('📋 Requisiti password mancanti:');
    
    validationResult.validations.forEach(validation => {
      if (!validation.valid) {
        suggestions.push(`• ${validation.requirement}: ${validation.current}`);
      }
    });
    
    suggestions.push('');
    suggestions.push('💡 Suggerimenti:');
    suggestions.push('• Usa una passphrase: "Amo-Camminare-Nel-Bosco-2024!"');
    suggestions.push('• Combina parole con numeri e simboli');
    suggestions.push('• Evita informazioni personali o date di nascita');
    suggestions.push('• Usa un password manager per generare password sicure');
  }
  
  return suggestions;
}

// ================================================================
// EXPORT FUNCTIONS
// ================================================================

module.exports = {
  validatePassword,
  generatePasswordSuggestions,
  PASSWORD_POLICY,
  checkPasswordBreach,
  
  // Validazioni individuali esportate per testing
  validateLength,
  validateUppercase,
  validateLowercase,
  validateNumbers,
  validateSymbols,
  validateConsecutiveChars,
  validateCommonPasswords
}; 