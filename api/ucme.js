// ================================================================
// MENTAL COMMONS - UCME ENDPOINT (MVP)
// ================================================================
// GET  /api/ucme            → elenco UCMe dell'utente autenticato
// POST /api/ucme            → salva nuova UCMe per l'utente autenticato
// ================================================================

const {
  saveUCMe,
  saveAnonymousUCMe,
  getUserUCMesWithResponses,
  markUcmeResponseAsRead,
  verifyJWT,
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
    // Supporto azioni via query (?action=...)
    const action = req.query?.action;

    if (action === 'mark-read') {
      return await handleMarkAsRead(req, res);
    }

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

  const ucmes = await getUserUCMesWithResponses(payload.userId);
  return res.status(200).json({ success: true, data: ucmes });
}

async function handlePost(req, res) {
  // 1. Valida input prima di qualsiasi operazione
  const validation = await validateAndSanitize(req.body, createUcmeSchema);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: 'Dati UCMe non validi', errors: validation.errors });
  }

  const { content, title, email, tone } = validation.data;

  // 2. Prova ad autenticare l'utente (JWT opzionale)
  const jwtPayload = authenticate(req);

  try {
    let saved;

    if (jwtPayload) {
      // Utente autenticato → UCMe associata all'account
      saved = await saveUCMe(jwtPayload.userId, content, title, tone);
    } else {
      // Utente guest → salva come UCMe anonima (richiede email)
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email richiesta per invio anonimo' });
      }
      saved = await saveAnonymousUCMe(email, content, title, tone);
    }

    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('❌ UCME POST error:', err);
    return res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
}

// Gestione marca come letta
async function handleMarkAsRead(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Usa POST per mark-read' });
  }

  const payload = authenticate(req);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Token mancante o non valido' });
  }

  const { ucme_id } = req.body || {};
  if (!ucme_id) {
    return res.status(400).json({ success: false, message: 'ucme_id mancante' });
  }

  await markUcmeResponseAsRead(ucme_id, payload.userId);
  return res.status(200).json({ success: true });
} 