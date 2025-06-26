/* ================================================================
   MENTAL COMMONS – API PORTATORE RISPOSTA UCMe (FASE 4)
   ================================================================
   POST /api/portatore/rispondi
   Richiede autenticazione JWT (Bearer)
   Body JSON: { ucme_id: UUID, contenuto: string }
================================================================ */

const Joi = require('joi');
const { verifyJWT, respondToUcme } = require('../../lib/supabase.js');

// Schema di validazione input
const payloadSchema = Joi.object({
  ucme_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  contenuto: Joi.string().min(1).max(3000).required(),
}).required();

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, message: 'Metodo non supportato. Usa POST.' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    // Validazione body
    const { error: validationErr, value: validated } = payloadSchema.validate(req.body);
    if (validationErr) {
      return res.status(400).json({ success: false, message: validationErr.message });
    }

    const { ucme_id, contenuto } = validated;

    const risposta = await respondToUcme(ucme_id, payload.userId, contenuto);

    return res
      .status(201)
      .json({ success: true, data: risposta, message: 'Risposta salvata' });
  } catch (err) {
    console.error('❌ Portatore rispondi UCMe error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno' });
  }
}; 