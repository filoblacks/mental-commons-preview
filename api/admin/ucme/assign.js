/* ================================================================
   MENTAL COMMONS – API ADMIN UCMe ASSIGN
   ================================================================
   POST /api/admin/ucme/assign { ucme_id, portatore_id }
   Assegna UCMe pendente a un Portatore attivo
   Richiede autenticazione JWT admin
================================================================ */

const { verifyJWT, assignUcmeToPortatore, getSupabaseClient } = require('../../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa POST.' });
  }

  try {
    // Token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    // Admin check
    const { data: user, error } = await getSupabaseClient()
      .from('users')
      .select('role, is_admin')
      .eq('id', payload.userId)
      .single();
    if (error) throw error;
    if (!user || (!(user.is_admin) && user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Permessi insufficienti' });
    }

    const { ucme_id, portatore_id } = req.body || {};
    if (!ucme_id || !portatore_id) {
      return res.status(400).json({ success: false, message: 'ucme_id e portatore_id richiesti' });
    }

    const updated = await assignUcmeToPortatore(ucme_id, portatore_id);
    return res.status(200).json({ success: true, message: 'UCMe assegnata con successo', data: updated });
  } catch (err) {
    console.error('❌ Admin UCMe Assign error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno server' });
  }
}; 