// ================================================================
// MENTAL COMMONS - AUTH ENDPOINT UNIFICATO (MVP)
// ================================================================
// Gestisce login, registrazione e validazione token in un singolo file.
// Azione selezionata tramite query string ?action=login|register|validate-token
// ================================================================

const {
  findUserByEmail,
  verifyPassword,
  generateJWT,
  createUser,
  verifyJWT
} = require('../lib/supabase.js');
const {
  validateAndSanitize,
  loginSchema,
  registerSchema
} = require('../lib/validation.js');

module.exports = async function handler(req, res) {
  // CORS & Security headers (semplici per MVP)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Evita risposte 304 su chiamate POST di login/registrazione
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metodo non consentito. Usa POST.' });
  }

  const action = (req.query.action || 'login').toLowerCase();

  try {
    switch (action) {
      case 'login':
        return await handleLogin(req, res);
      case 'register':
        return await handleRegister(req, res);
      case 'validate-token':
      case 'validatetoken':
        return await handleValidateToken(req, res);
      default:
        return res.status(400).json({ success: false, message: 'Azione non valida. Usa login, register o validate-token.' });
    }
  } catch (err) {
    console.error('❌ AUTH ERROR:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno del server' });
  }
};

// ================================================================
// HANDLERS
// ================================================================

async function handleLogin(req, res) {
  // Validazione input
  const validation = await validateAndSanitize(req.body, loginSchema);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: 'Dati di login non validi', errors: validation.errors });
  }

  const { email, password } = validation.data;

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Credenziali non valide' });
  }

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ success: false, message: 'Credenziali non valide' });
  }

  const token = generateJWT(user.id, user.email);
  return res.status(200).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role, is_admin: user.is_admin } });
}

async function handleRegister(req, res) {
  // Validazione input
  const validation = await validateAndSanitize(req.body, registerSchema);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: 'Dati di registrazione non validi', errors: validation.errors });
  }

  const { email, password, name, surname } = validation.data;

  // Crea utente (gestisce errori internamente)
  const newUser = await createUser(email, password, name, surname);
  const token = generateJWT(newUser.id, newUser.email);

  return res.status(201).json({ success: true, token, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, is_admin: newUser.is_admin } });
}

async function handleValidateToken(req, res) {
  const authHeader = req.headers.authorization || '';
  let token = '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.body === 'object' && req.body.token) {
    token = req.body.token;
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token mancante' });
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
  }

  return res.status(200).json({ success: true, user: { id: payload.userId, email: payload.email }, tokenValid: true });
} 