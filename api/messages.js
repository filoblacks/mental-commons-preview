// ================================================================
// MENTAL COMMONS – API Messages (unificata) – Sprint 6
// ================================================================
//   GET  /api/messages?chat_id=...    → lista messaggi
//   POST /api/messages                → invio messaggio
// ================================================================

const Joi = require('joi');
const {
  verifyJWT,
  sendMessage,
  getChatMessages,
} = require('../lib/supabase.js');

const getSchema = Joi.object({
  chat_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
}).required();

const postSchema = Joi.object({
  chat_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  text: Joi.string().min(1).max(4000).required(),
}).required();

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Autenticazione
  const token = extractToken(req);
  if (!token) return res.status(401).json({ status: 'error', message: 'Token mancante' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ status: 'error', message: 'Token non valido o scaduto' });

  try {
    if (req.method === 'GET') {
      const { error: qsErr, value: qs } = getSchema.validate(req.query);
      if (qsErr) throw qsErr;
      const messages = await getChatMessages(qs.chat_id, payload.userId);
      return res.status(200).json({ status: 'success', data: messages });
    }

    if (req.method === 'POST') {
      const { error: vErr, value } = postSchema.validate(req.body);
      if (vErr) throw vErr;
      const msg = await sendMessage(value.chat_id, payload.userId, null, value.text);
      return res.status(200).json({ status: 'success', data: msg });
    }

    return res.status(405).json({ status: 'error', message: 'Metodo non supportato. Usa GET o POST.' });
  } catch (err) {
    const safe = err.message || 'Errore interno';
    const statusCode = safe === 'Non autorizzato' ? 403 : 400;
    return res.status(statusCode).json({ status: 'error', message: safe });
  }
};

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query.token) return req.query.token;
  if (req.body && typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
} 