/* ================================================================
   MENTAL COMMONS – API DOCENTE UCMe & STATISTICHE
   ================================================================
   GET /api/docente/ucme               → Lista UCMe filtrata per scuola
   GET /api/docente/ucme?action=stats  → Statistiche aggregate UCMe
   ----------------------------------------------------------------
   Sicurezza:
   • Richiede autenticazione JWT (Bearer)
   • L'utente deve avere role = 'docente' oppure essere admin
   • Il filtro per school_code è applicato lato backend
================================================================ */

const {
  verifyJWT,
  getUCMesBySchool,
  getUCMeStats,
  getSupabaseClient
} = require('../../lib/supabase.js');

module.exports = async function handler(req, res) {
  // CORS minimale (MVP)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa GET.' });
  }

  try {
    // 1. Autenticazione JWT
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const jwtPayload = verifyJWT(token);
    if (!jwtPayload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    // 2. Recupera profilo utente per ruolo e school_code
    const { data: userProfile, error: profileErr } = await getSupabaseClient()
      .from('users')
      .select('role, school_code')
      .eq('id', jwtPayload.userId)
      .single();

    if (profileErr) throw profileErr;
    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    const { role, school_code } = userProfile;
    if (role !== 'docente' && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accesso negato: ruolo non autorizzato' });
    }
    if (!school_code) {
      return res.status(400).json({ success: false, message: 'Utente privo di school_code' });
    }

    // 3. Gestione azione (lista o stats)
    const action = (req.query.action || 'list').toLowerCase();

    if (action === 'stats') {
      const stats = await getUCMeStats(school_code);
      return res.status(200).json({ success: true, data: stats });
    }

    // Default: lista UCMe
    const ucmes = await getUCMesBySchool(school_code);
    return res.status(200).json({ success: true, data: ucmes });
  } catch (err) {
    console.error('❌ Docente UCMe API error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno del server' });
  }
}; 