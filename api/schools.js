/* ================================================================
   MENTAL COMMONS – API SCHOOLS LIST
   ================================================================
   GET /api/schools
   Restituisce elenco scuole (code, name)
================================================================ */

const { getSupabaseClient } = require('../lib/supabase.js');

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
    const { data, error } = await getSupabaseClient()
      .from('schools')
      .select('code, name')
      .order('name', { ascending: true });
    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('❌ API Schools error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno' });
  }
}; 