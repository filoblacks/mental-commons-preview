/* ================================================================
   MENTAL COMMONS – API ADMIN UNIFICATO
   ================================================================
   GET  /api/admin?action=portatori-active   → lista Portatori attivi
   GET  /api/admin?action=ucme-pending       → UCMe pendenti (senza portatore)
   POST /api/admin?action=ucme-assign        → assegna UCMe ad un Portatore
   ----------------------------------------------------------------
   Sicurezza:
   • Richiede autenticazione JWT con ruolo admin (role = 'admin' o is_admin = true)
   • Filtra tutto lato backend
================================================================ */

const {
  verifyJWT,
  getActivePortatori,
  getPendingUCMes,
  assignUcmeToPortatore,
  getSupabaseClient
} = require('../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const action = (req.query.action || '').toLowerCase();

    // 1. Autenticazione
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    // 2. Verifica permessi admin
    const { data: user, error } = await getSupabaseClient()
      .from('users')
      .select('role, is_admin')
      .eq('id', payload.userId)
      .single();
    if (error) throw error;
    if (!user || (!(user.is_admin) && user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Permessi insufficienti' });
    }

    // 3. Routing azioni
    if (action === 'portatori-active') {
      if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Usa GET per portatori-active' });
      const portatori = await getActivePortatori();
      return res.status(200).json({ success: true, data: portatori });
    }

    if (action === 'ucme-pending') {
      if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Usa GET per ucme-pending' });
      const pending = await getPendingUCMes();
      return res.status(200).json({ success: true, data: pending });
    }

    if (action === 'ucme-assign') {
      if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Usa POST per ucme-assign' });
      const { ucme_id, portatore_id } = req.body || {};
      if (!ucme_id || !portatore_id) {
        return res.status(400).json({ success: false, message: 'ucme_id e portatore_id richiesti' });
      }
      const updated = await assignUcmeToPortatore(ucme_id, portatore_id);
      return res.status(200).json({ success: true, message: 'UCMe assegnata con successo', data: updated });
    }

    return res.status(400).json({ success: false, message: 'Azione non riconosciuta' });
  } catch (err) {
    console.error('❌ Admin API error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno server' });
  }
}; 