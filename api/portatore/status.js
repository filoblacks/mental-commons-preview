/* ================================================================
   MENTAL COMMONS – API PORTATORE STATUS
   ================================================================
   GET /api/portatore/status
   Richiede autenticazione JWT (Bearer)
   Ritorna { is_portatore: boolean, bio: string|null }
================================================================ */

const { verifyJWT, getPortatoreStatus } = require('../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa GET.' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    const status = await getPortatoreStatus(payload.userId);
    return res.status(200).json({ success: true, data: status });
  } catch (err) {
    console.error('❌ Portatore Status Error:', err);
    return res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
  }
}; 