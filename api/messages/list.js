// ================================================================
// MENTAL COMMONS – API List Messages (Sprint 6)
// ================================================================
// Endpoint: GET /api/messages/list?chat_id=...
// ================================================================

const {
  verifyJWT,
  getChatMessages,
} = require('../../lib/supabase.js');
const Joi = require('joi');

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa GET.' });
  }

  // Validazione query param
  const qsSchema = Joi.object({
    chat_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }).required();

  const { error: qsErr, value: qs } = qsSchema.validate(req.query);
  if (qsErr) return res.status(400).json({ status: 'error', message: qsErr.message });

  const token = extractToken(req);
  if (!token) return res.status(401).json({ status: 'error', message: 'Token mancante' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ status: 'error', message: 'Token non valido o scaduto' });

  try {
    const messages = await getChatMessages(qs.chat_id, payload.userId);
    return res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    const safeMessage = err.message || 'Errore interno';
    const statusCode = safeMessage === 'Non autorizzato' ? 403 : 400;
    return res.status(statusCode).json({ status: 'error', message: safeMessage });
  }
};

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query.token) return req.query.token;
  return null;
} 