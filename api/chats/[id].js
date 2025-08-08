// ================================================================
// MENTAL COMMONS – API Chat Update Status (Sprint 6)
// ================================================================
// Endpoint: PATCH /api/chats/:id  → status: accepted | rejected
// ================================================================

const Joi = require('joi');
const {
  verifyJWT,
  updateChatStatus,
  getSupabaseClient,
} = require('../../lib/supabase.js');

// Schema di validazione corpo PATCH
const patchSchema = Joi.object({
  status: Joi.string().valid('accepted', 'rejected').required(),
}).required();

module.exports = async function handler(req, res) {
  // CORS coerente
  const ORIGIN = process.env.PUBLIC_BASE_URL || 'https://mental-commons.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'PATCH') {
    return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa PATCH.' });
  }

  // === 1. Autenticazione ===
  const token = extractToken(req);
  if (!token) return res.status(401).json({ status: 'error', message: 'Token mancante' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ status: 'error', message: 'Token non valido o scaduto' });

  // === 2. Validazione input ===
  const { error: vErr, value } = patchSchema.validate(req.body);
  if (vErr) return res.status(400).json({ status: 'error', message: vErr.message });

  const chatId = req.query.id;
  if (!chatId) return res.status(400).json({ status: 'error', message: 'ID chat mancante' });

      try {
      // Ricava l'id del portatore associato all'utente loggato
      const { data: portatoreRow, error: portatoreErr } = await getSupabaseClient()
        .from('portatori')
        .select('id')
        .eq('user_id', payload.userId)
        .single();

      if (portatoreErr) throw portatoreErr;
      if (!portatoreRow) {
        return res.status(403).json({ status: 'error', message: 'Utente non è un Portatore' });
      }

      const updated = await updateChatStatus(chatId, portatoreRow.id, value.status);
      return res.status(200).json({ status: 'success', data: updated });
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