// ================================================================
// MENTAL COMMONS – API Send Message (Sprint 6)
// ================================================================
// Endpoint: POST /api/messages/send
// ================================================================

const Joi = require('joi');
const {
  verifyJWT,
  sendMessage,
} = require('../../lib/supabase.js');

const sendSchema = Joi.object({
  chat_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  text: Joi.string().min(1).max(4000).required(),
}).required();

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa POST.' });
  }

  // Autenticazione
  const token = extractToken(req);
  if (!token) return res.status(401).json({ status: 'error', message: 'Token mancante' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ status: 'error', message: 'Token non valido o scaduto' });

  // Validazione input
  const { error: vErr, value } = sendSchema.validate(req.body);
  if (vErr) return res.status(400).json({ status: 'error', message: vErr.message });

  try {
    // Determina sender_type automaticamente nella libreria
    const message = await sendMessage(value.chat_id, payload.userId, null, value.text);
    // Nota: sendMessage verificherà se senderId corrisponde a user_id o portatore_id e imposterà autorizzazione; passiamo sender_type 'user' come default; la funzione corregge se necessario.
    // In alternativa, potremmo determinare prima ma la funzione gestisce.

    return res.status(200).json({ status: 'success', data: message });
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
  if (req.body && typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
} 