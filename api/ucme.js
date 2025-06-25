// ================================================================
// MENTAL COMMONS - UCME ENDPOINT (MVP)
// ================================================================
// GET  /api/ucme            → elenco UCMe dell'utente autenticato
// POST /api/ucme            → salva nuova UCMe per l'utente autenticato
// ================================================================

const {
  saveUCMe,
  getUserUCMes,
  verifyJWT
} = require('../lib/supabase.js');
const {
  validateAndSanitize,
  createUcmeSchema
} = require('../lib/validation.js');

module.exports = async function handler(req, res) {
  // CORS di base per l'MVP
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa GET o POST.' });
    }
  } catch (err) {
    console.error('❌ UCME API error:', err);
    return res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
};

// ================================================================
// HELPERS
// ================================================================

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.query.token) return req.query.token;
  if (req.body && typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
}

function authenticate(req) {
  const token = extractToken(req);
  if (!token) return null;
  return verifyJWT(token);
}

// ================================================================
// HANDLERS
// ================================================================

async function handleGet(req, res) {
  const payload = authenticate(req);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Token mancante o non valido' });
  }

  const ucmes = await getUserUCMes(payload.userId);
  return res.status(200).json({ success: true, data: ucmes });
}

async function handlePost(req, res) {
  const payload = authenticate(req);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Token mancante o non valido' });
  }

  // Validazione input UCMe
  const validation = await validateAndSanitize(req.body, createUcmeSchema);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: 'Dati UCMe non validi', errors: validation.errors });
  }

  const { content, title } = validation.data;

  const saved = await saveUCMe(payload.userId, content, title);
  return res.status(201).json({ success: true, data: saved });
} 