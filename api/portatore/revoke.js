/* ================================================================
   MENTAL COMMONS – API PORTATORE REVOKE
   ================================================================
   DELETE /api/portatore/revoke
   Richiede autenticazione JWT (Bearer)
   Azione: elimina riga portatore e imposta users.is_portatore = false
================================================================ */

const { verifyJWT, revokePortatore } = require('../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa DELETE.' });
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

    await revokePortatore(payload.userId);
    return res.status(200).json({ success: true, message: 'Candidatura revocata' });
  } catch (err) {
    console.error('❌ Portatore Revoke Error:', err);
    return res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
  }
}; 