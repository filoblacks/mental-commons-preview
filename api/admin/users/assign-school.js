/* ================================================================
   MENTAL COMMONS – API ADMIN USERS ASSIGN SCHOOL
   ================================================================
   POST /api/admin/users/assign-school { user_id, school_code }
   Aggiorna il campo school_code di un utente specifico.
   Richiede autenticazione JWT admin
================================================================ */

const { verifyJWT, updateUserSchoolCode, getSupabaseClient } = require('../../../lib/supabase.js');

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
    // Token estratto da Authorization
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    // Verifica ruolo admin nel database
    const { data: adminUser, error: adminErr } = await getSupabaseClient()
      .from('users')
      .select('role, is_admin')
      .eq('id', payload.userId)
      .single();
    if (adminErr) throw adminErr;
    if (!adminUser || (!(adminUser.is_admin) && adminUser.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Permessi insufficienti' });
    }

    const { user_id, school_code } = req.body || {};
    if (!user_id || typeof school_code !== 'string') {
      return res.status(400).json({ success: false, message: 'user_id e school_code sono richiesti' });
    }

    const updated = await updateUserSchoolCode(user_id, school_code || null);
    return res.status(200).json({ success: true, message: 'School code aggiornato', data: updated });
  } catch (err) {
    console.error('❌ Admin Users Assign School error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno server' });
  }
}; 