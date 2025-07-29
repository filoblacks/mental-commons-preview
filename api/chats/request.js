// ================================================================
// MENTAL COMMONS – API Chat Request (Sprint 6)
// ================================================================
// Endpoint: POST /api/chats/request
// ================================================================

const Joi = require('joi');
const {
  verifyJWT,
  requestChatOnUcme,
} = require('../../lib/supabase.js');

// Schema di validazione input
const requestSchema = Joi.object({
  ucme_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required(),
}).required();

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Metodo non consentito. Usa POST.' });
  }

  // === 1. Autenticazione ===
  const token = extractToken(req);
  if (!token) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Token mancante' });
  }
  const payload = verifyJWT(token);
  if (!payload) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Token non valido o scaduto' });
  }

  // === 2. Validazione input ===
  const { error: vErr, value } = requestSchema.validate(req.body);
  if (vErr) {
    return res.status(400).json({ status: 'error', message: vErr.message });
  }

  try {
    await requestChatOnUcme(value.ucme_id, payload.userId);
    return res
      .status(200)
      .json({ status: 'success', message: 'Richiesta inviata' });
  } catch (err) {
    // Gestione casi specifici con messaggi dedicati
    const safeMessage = err.message || 'Errore interno';
    const statusCode =
      safeMessage === 'Hai già chiesto di continuare' ? 400 :
      safeMessage === 'Accesso riservato a utenti premium' ? 403 : 400;
    return res.status(statusCode).json({ status: 'error', message: safeMessage });
  }
};

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query.token) return req.query.token;
  if (req.body && typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
} 