// ================================================================
// MENTAL COMMONS – API Le mie Chat (Sprint 6)
// ================================================================
// Endpoint: GET /api/chats/my-chats
// Restituisce tutte le chat in stato "accepted" dove l'utente
// coinvolto è il creatore della UCMe (user) o il Portatore assegnato.
// ================================================================

const { verifyJWT, getMyChats } = require('../../lib/supabase.js');


module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Metodo non consentito. Usa GET.' });
  }

  // === 1. Autenticazione ===
  const token = extractToken(req);
  if (!token) return res.status(401).json({ status: 'error', message: 'Token mancante' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ status: 'error', message: 'Token non valido o scaduto' });

  try {
    const list = await getMyChats(payload.userId);
    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    const safeMessage = err.message || 'Errore interno';
    return res.status(400).json({ status: 'error', message: safeMessage });
  }
};

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query.token) return req.query.token;
  return null;
}
