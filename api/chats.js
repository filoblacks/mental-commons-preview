// ================================================================
// MENTAL COMMONS – API Chats (unificata)
// ================================================================
//  Rotte supportate (via action o rewrite):
//  - GET  /api/chats                           → richieste chat (status=requested)
//  - POST /api/chats                           → richiedi chat su una UCMe
//  - GET  /api/chats?action=my-chats           → le mie chat accettate
//  - PATCH /api/chats?action=update&id=:id     → aggiorna stato chat (accepted|rejected)
//  Nota: i vecchi path /api/chats/my-chats e /api/chats/:id
//        sono mantenuti via rewrite in vercel.json
// ================================================================

const Joi = require('joi');
const {
  verifyJWT,
  getPendingChatRequests,
  requestChatOnUcme,
  updateChatStatus,
  getMyChats,
  getSupabaseClient,
} = require('../lib/supabase.js');

const patchSchema = Joi.object({
  status: Joi.string().valid('accepted', 'rejected').required(),
}).required();

module.exports = async function handler(req, res) {
  // CORS coerente con gli altri endpoint
  const ORIGIN = process.env.PUBLIC_BASE_URL || 'https://mental-commons.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Autenticazione (richiesta per tutte le azioni)
  const token = extractToken(req);
  if (!token) return res.status(401).json({ status: 'error', message: 'Token mancante' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ status: 'error', message: 'Token non valido o scaduto' });

  // Routing azioni
  const { action, id } = parseRouting(req);

  try {
    // === LISTA RICHIESTE CHAT ===
    if (!action || action === 'list') {
      if (req.method === 'GET') {
        const statusFilter = (req.query.status || 'requested').toLowerCase();
        if (statusFilter !== 'requested') {
          return res.status(400).json({ status: 'error', message: 'Per ora è supportato solo status=requested' });
        }

        const portatoreId = await getPortatoreIdForUser(payload.userId);
        if (!portatoreId) {
          return res.status(403).json({ status: 'error', message: 'Utente non è un Portatore' });
        }

        const list = await getPendingChatRequests(portatoreId);
        return res.status(200).json({ status: 'success', data: list });
      }

      if (req.method === 'POST') {
        const schema = Joi.object({
          ucme_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
        }).required();

        const { error: vErr, value } = schema.validate(req.body);
        if (vErr) return res.status(400).json({ status: 'error', message: vErr.message });

        await requestChatOnUcme(value.ucme_id, payload.userId);
        return res.status(200).json({ status: 'success', message: 'Richiesta inviata' });
      }

      return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa GET o POST.' });
    }

    // === LE MIE CHAT ===
    if (action === 'my-chats') {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa GET.' });
      }
      const list = await getMyChats(payload.userId);
      return res.status(200).json({ status: 'success', data: list });
    }

    // === AGGIORNA STATO CHAT ===
    if (action === 'update') {
      if (req.method !== 'PATCH') {
        return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa PATCH.' });
      }

      const { error: vErr, value } = patchSchema.validate(req.body);
      if (vErr) return res.status(400).json({ status: 'error', message: vErr.message });

      const chatId = id || req.query.id;
      if (!chatId) return res.status(400).json({ status: 'error', message: 'ID chat mancante' });

      const portatoreId = await getPortatoreIdForUser(payload.userId);
      if (!portatoreId) {
        return res.status(403).json({ status: 'error', message: 'Utente non è un Portatore' });
      }

      const updated = await updateChatStatus(chatId, portatoreId, value.status);
      return res.status(200).json({ status: 'success', data: updated });
    }

    return res.status(400).json({ status: 'error', message: 'Azione non riconosciuta' });
  } catch (err) {
    const safe = err && err.message ? err.message : 'Errore interno';
    const statusCode = safe === 'Non autorizzato' ? 403 : 400;
    return res.status(statusCode).json({ status: 'error', message: safe });
  }
};

// ================================================================
// Helpers
// ================================================================

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query && req.query.token) return req.query.token;
  if (req.body && typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
}

function parseRouting(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname || '';
    const action = (url.searchParams.get('action') || '').toLowerCase();
    const idFromQuery = url.searchParams.get('id') || undefined;

    // Compat: se path è /api/chats/my-chats
    if (!action && /\/api\/chats\/my-chats$/.test(pathname)) {
      return { action: 'my-chats', id: undefined };
    }
    // Compat: se path è /api/chats/:id
    const match = pathname.match(/\/api\/chats\/([0-9a-fA-F-]{16,})$/);
    if (!action && match && match[1]) {
      return { action: 'update', id: match[1] };
    }

    return { action: action || 'list', id: idFromQuery };
  } catch {
    return { action: 'list', id: undefined };
  }
}

async function getPortatoreIdForUser(userId) {
  const { data: row, error } = await getSupabaseClient()
    .from('portatori')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return row && row.id ? row.id : null;
}


