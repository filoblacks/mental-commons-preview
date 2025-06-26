// api/ucme/mark-as-read.js - POST { ucme_id }
// ================================================================
// MENTAL COMMONS – FASE 5
// Marca la risposta di una UCMe come letta (solo dal mittente)
// ================================================================

const {
  markUcmeResponseAsRead,
  verifyJWT
} = require('../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // Abilitazione CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa POST.' });
  }

  try {
    const token = extractToken(req);
    const payload = token ? verifyJWT(token) : null;
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token mancante o non valido' });
    }

    const { ucme_id } = req.body || {};
    if (!ucme_id) {
      return res.status(400).json({ success: false, message: 'ucme_id mancante' });
    }

    await markUcmeResponseAsRead(ucme_id, payload.userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ mark-as-read error:', err);
    return res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
};

// Helper per estrarre token (duplicato per evitare import circolare)
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.query.token) return req.query.token;
  if (req.body && typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
} 