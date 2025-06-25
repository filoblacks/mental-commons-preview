/* ================================================================
   MENTAL COMMONS – API PORTATORE UCMe ASSEGNATE (FASE 3)
   ================================================================
   GET /api/portatore/ucme
   Richiede autenticazione JWT (Bearer)
   Ritorna lista UCMe dove portatore_id appartiene all'utente corrente
================================================================ */

const {
  verifyJWT,
  getAssignedUCMesForPortatore,
} = require('../../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ success: false, message: 'Metodo non supportato. Usa GET.' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res
        .status(401)
        .json({ success: false, message: 'Token non valido o scaduto' });
    }

    const ucmes = await getAssignedUCMesForPortatore(payload.userId);
    return res.status(200).json({ success: true, data: ucmes });
  } catch (err) {
    console.error('❌ Portatore UCMe error:', err);
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Errore interno' });
  }
}; 