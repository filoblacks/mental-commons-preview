// ================================================================
// MENTAL COMMONS – API Chats Listing (Sprint 6)
// ================================================================
// Endpoint: GET /api/chats?status=requested
// ================================================================

const Joi = require('joi');
const {
  verifyJWT,
  getPendingChatRequests,
  requestChatOnUcme,
  getSupabaseClient,
} = require('../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Autenticazione (richiesta sia per GET sia per POST)
  const token = extractToken(req);
  if (!token) return res.status(401).json({ status: 'error', message: 'Token mancante' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ status: 'error', message: 'Token non valido o scaduto' });

  if (req.method === 'GET') {
    const statusFilter = (req.query.status || 'requested').toLowerCase();
    if (statusFilter !== 'requested') {
      return res.status(400).json({ status: 'error', message: 'Per ora è supportato solo status=requested' });
    }

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

      const list = await getPendingChatRequests(portatoreRow.id);
      return res.status(200).json({ status: 'success', data: list });
    } catch (err) {
      const safeMessage = err.message || 'Errore interno';
      return res.status(400).json({ status: 'error', message: safeMessage });
    }
  }

  if (req.method === 'POST') {
    // === Validazione input ===
    const schema = Joi.object({
      ucme_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
    }).required();

    const { error: vErr, value } = schema.validate(req.body);
    if (vErr) {
      return res.status(400).json({ status: 'error', message: vErr.message });
    }

    try {
      await requestChatOnUcme(value.ucme_id, payload.userId);
      return res.status(200).json({ status: 'success', message: 'Richiesta inviata' });
    } catch (err) {
      const safeMessage = err.message || 'Errore interno';
      const statusCode =
        safeMessage === 'Hai già chiesto di continuare' ? 400 :
        safeMessage === 'Accesso riservato a utenti premium' ? 403 : 400;
      return res.status(statusCode).json({ status: 'error', message: safeMessage });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa GET o POST.' });
};

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query.token) return req.query.token;
  return null;
} 