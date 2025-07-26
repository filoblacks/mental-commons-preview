// ================================================================
// MENTAL COMMONS - SISTEMA DI VALIDAZIONE COMPLETO
// ================================================================
// Versione: 1.0.0 - SECURITY HARDENING SPRINT 2
// Descrizione: Input validation e sanitizzazione completa

const Joi = require('joi');
const { debug, warn, error } = require('../logger.js');

// ================================================================
// CONFIGURAZIONE SANITIZZAZIONE
// ================================================================

// Pattern pericolosi da rimuovere o sanitizzare
const DANGEROUS_PATTERNS = [
  // SQL Injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(['";]|\-\-|\/\*|\*\/)/g,
  
  // XSS patterns
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  
  // HTML injection patterns
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  /<input\b[^<]*>/gi,
  /<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi,
  
  // Command injection patterns
  /(\||&|;|\$\(|\`)/g,
  /(rm\s|del\s|format\s)/gi,
  
  // Path traversal patterns
  /(\.\.[\/\\]|\.\.%2f|\.\.%5c)/gi,
  
  // NoSQL injection patterns
  /(\$where|\$ne|\$gt|\$lt|\$regex)/gi
];

// Caratteri HTML da encodare
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

// ================================================================
// FUNZIONI DI SANITIZZAZIONE
// ================================================================

/**
 * Sanitizza una stringa rimuovendo pattern pericolosi
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  let sanitized = input;
  
  // Rimuove pattern pericolosi
  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Encode HTML entities
  sanitized = sanitized.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitizza un oggetto ricorsivamente
 */
function sanitizeObject(obj, maxDepth = 10) {
  if (maxDepth <= 0) {
    warn('⚠️ Max sanitization depth reached');
    return obj;
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value, maxDepth - 1);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Verifica se una stringa contiene pattern pericolosi
 */
function containsDangerousPatterns(input) {
  if (typeof input !== 'string') {
    return false;
  }
  
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

// ================================================================
// SCHEMI DI VALIDAZIONE JOI
// ================================================================

// Schema per email con validazione RFC completa
const emailSchema = Joi.string()
  .email({ 
    minDomainSegments: 2,
    tlds: { allow: true }
  })
  .min(5)
  .max(254)
  .lowercase()
  .trim()
  .required()
  .custom((value, helpers) => {
    // Validazione aggiuntiva RFC 5322
    const rfcEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!rfcEmailRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    
    // Controlla pattern pericolosi
    if (containsDangerousPatterns(value)) {
      return helpers.error('any.unsafe');
    }
    
    return value;
  })
  .messages({
    'string.email': 'Formato email non valido',
    'string.min': 'Email troppo corta (minimo 5 caratteri)',
    'string.max': 'Email troppo lunga (massimo 254 caratteri)',
    'any.required': 'Email è richiesta',
    'any.invalid': 'Email non conforme agli standard RFC',
    'any.unsafe': 'Email contiene caratteri non sicuri'
  });

// Schema per password con policy avanzata
const passwordSchema = Joi.string()
  .min(12)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).*$/)
  .required()
  .custom((value, helpers) => {
    // Controlla pattern pericolosi
    if (containsDangerousPatterns(value)) {
      return helpers.error('any.unsafe');
    }
    
    // Controlla caratteri consecutivi
    let consecutiveCount = 1;
    for (let i = 1; i < value.length; i++) {
      if (value[i] === value[i - 1]) {
        consecutiveCount++;
        if (consecutiveCount > 3) {
          return helpers.error('password.consecutive');
        }
      } else {
        consecutiveCount = 1;
      }
    }
    
    return value;
  })
  .messages({
    'string.min': 'Password deve essere di almeno 12 caratteri',
    'string.max': 'Password troppo lunga (massimo 128 caratteri)',
    'string.pattern.base': 'Password deve contenere almeno: 1 maiuscola, 1 minuscola, 1 numero, 1 simbolo',
    'any.required': 'Password è richiesta',
    'any.unsafe': 'Password contiene caratteri non sicuri',
    'password.consecutive': 'Password non può avere più di 3 caratteri consecutivi uguali'
  });

// Schema per nome utente
const nameSchema = Joi.string()
  .min(1)
  .max(50)
  .pattern(/^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\s\-']+$/)
  .trim()
  .required()
  .custom((value, helpers) => {
    if (containsDangerousPatterns(value)) {
      return helpers.error('any.unsafe');
    }
    return sanitizeString(value);
  })
  .messages({
    'string.min': 'Nome deve contenere almeno 1 carattere',
    'string.max': 'Nome troppo lungo (massimo 50 caratteri)',
    'string.pattern.base': 'Nome può contenere solo lettere, spazi, apostrofi e trattini',
    'any.required': 'Nome è richiesto',
    'any.unsafe': 'Nome contiene caratteri non sicuri'
  });

// Schema per cognome (opzionale)
const surnameSchema = Joi.string()
  .min(1)
  .max(50)
  .pattern(/^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\s\-']+$/)
  .trim()
  .allow('')
  .optional()
  .custom((value, helpers) => {
    if (value && containsDangerousPatterns(value)) {
      return helpers.error('any.unsafe');
    }
    return value ? sanitizeString(value) : value;
  })
  .messages({
    'string.min': 'Cognome deve contenere almeno 1 carattere',
    'string.max': 'Cognome troppo lungo (massimo 50 caratteri)',
    'string.pattern.base': 'Cognome può contenere solo lettere, spazi, apostrofi e trattini',
    'any.unsafe': 'Cognome contiene caratteri non sicuri'
  });

// Schema per contenuto UCMe
const ucmeContentSchema = Joi.string()
  .min(10)
  .max(5000)
  .trim()
  .required()
  .custom((value, helpers) => {
    if (containsDangerousPatterns(value)) {
      return helpers.error('any.unsafe');
    }
    return sanitizeString(value);
  })
  .messages({
    'string.min': 'Contenuto UCMe deve essere di almeno 10 caratteri',
    'string.max': 'Contenuto UCMe troppo lungo (massimo 5000 caratteri)',
    'any.required': 'Contenuto UCMe è richiesto',
    'any.unsafe': 'Contenuto contiene elementi non sicuri'
  });

// Schema per titolo UCMe (opzionale)
const ucmeTitleSchema = Joi.string()
  .min(3)
  .max(100)
  .trim()
  .allow('')
  .optional()
  .custom((value, helpers) => {
    if (value && containsDangerousPatterns(value)) {
      return helpers.error('any.unsafe');
    }
    return value ? sanitizeString(value) : value;
  })
  .messages({
    'string.min': 'Titolo UCMe deve essere di almeno 3 caratteri',
    'string.max': 'Titolo UCMe troppo lungo (massimo 100 caratteri)',
    'any.unsafe': 'Titolo contiene elementi non sicuri'
  });

// Aggiungo schema per tono UCMe (obbligatorio)
const allowedTones = ['calmo', 'poetico', 'neutro', 'diretto'];
const toneSchema = Joi.string()
  .valid(...allowedTones)
  .required()
  .messages({
    'any.only': `Tono non valido. Valori permessi: ${allowedTones.join(', ')}`,
    'any.required': 'Il tono è richiesto'
  });

// Schema per JWT token
const jwtTokenSchema = Joi.string()
  .pattern(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Token JWT non valido',
    'any.required': 'Token di autenticazione richiesto'
  });

// ================================================================
// SCHEMI COMPLETI PER ENDPOINT
// ================================================================

// Schema per registrazione utente
const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  surname: surnameSchema
}).required();

// Schema per login utente
const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().min(1).max(128).required().messages({
    'string.min': 'Password è richiesta',
    'string.max': 'Password troppo lunga',
    'any.required': 'Password è richiesta'
  })
}).required();

// Schema per creazione UCMe
const createUcmeSchema = Joi.object({
  content: ucmeContentSchema,
  title: ucmeTitleSchema,
  tone: toneSchema,
  anonymous: Joi.boolean().optional().default(false),
  email: Joi.when('anonymous', {
    is: true,
    then: emailSchema,
    otherwise: Joi.optional()
  })
}).required();

// Schema per aggiornamento profilo
const updateProfileSchema = Joi.object({
  name: nameSchema,
  surname: surnameSchema
}).required();

// ================================================================
// FUNZIONI DI VALIDAZIONE
// ================================================================

/**
 * Valida e sanitizza i dati usando uno schema Joi
 */
async function validateAndSanitize(data, schema, options = {}) {
  const defaultOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  };
  
  const validationOptions = { ...defaultOptions, ...options };
  
  try {
    debug('🔍 Starting validation for schema:', schema.describe().type);
    
    // Pre-sanitizzazione per sicurezza extra
    const sanitizedData = sanitizeObject(data);
    
    // Validazione con Joi
    const { error, value } = schema.validate(sanitizedData, validationOptions);
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      debug('❌ Validation failed:', details);
      
      return {
        valid: false,
        errors: details,
        data: null
      };
    }
    
    debug('✅ Validation successful');
    
    return {
      valid: true,
      errors: [],
      data: value
    };
    
  } catch (err) {
    error('❌ Validation error:', err);
    
    return {
      valid: false,
      errors: [{ field: 'general', message: 'Errore di validazione interno', value: null }],
      data: null
    };
  }
}

/**
 * Middleware per validazione endpoint
 */
function createValidationMiddleware(schema) {
  return async (req, res, next) => {
    const result = await validateAndSanitize(req.body, schema);
    
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: 'Dati di input non validi',
        errors: result.errors,
        debug: {
          endpoint: req.url,
          method: req.method,
          timestamp: new Date().toISOString(),
          validationFailed: true
        }
      });
    }
    
    // Sostituisce req.body con i dati validati e sanitizzati
    req.body = result.data;
    next();
  };
}

// ================================================================
// EXPORT FUNCTIONS
// ================================================================

module.exports = {
  // Funzioni di validazione
  validateAndSanitize,
  createValidationMiddleware,
  
  // Funzioni di sanitizzazione
  sanitizeString,
  sanitizeObject,
  containsDangerousPatterns,
  
  // Schemi per endpoint
  registerSchema,
  loginSchema,
  createUcmeSchema,
  updateProfileSchema,
  
  // Schemi individuali
  emailSchema,
  passwordSchema,
  nameSchema,
  surnameSchema,
  ucmeContentSchema,
  ucmeTitleSchema,
  jwtTokenSchema,
  
  // Costanti
  DANGEROUS_PATTERNS,
  HTML_ENTITIES
}; 