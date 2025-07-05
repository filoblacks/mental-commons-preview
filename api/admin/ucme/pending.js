/* ================================================================
   MENTAL COMMONS – API ADMIN UCMe PENDING
   ================================================================
   GET /api/admin/ucme/pending
   Ritorna elenco UCMe senza portatore assegnato (pending)
   Richiede autenticazione JWT con ruolo admin (role = 'admin' o is_admin = true)
================================================================ */

const { verifyJWT, getPendingUCMes, getSupabaseClient } = require('../../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa GET.' });
  }

  try {
    // Estrai token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    // Verifica ruolo admin
    const { data: user, error } = await getSupabaseClient()
      .from('users')
      .select('role, is_admin')
      .eq('id', payload.userId)
      .single();
    if (error) throw error;
    if (!user || (!(user.is_admin) && user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Permessi insufficienti' });
    }

    const pending = await getPendingUCMes();
    return res.status(200).json({ success: true, data: pending });
  } catch (err) {
    console.error('❌ Admin UCMe Pending error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno server' });
  }
}; 