/* ================================================================
   MENTAL COMMONS – API PORTATORE UCMe STATUS UPDATE (FASE 3)
   ================================================================
   PATCH /api/portatore/ucme/status
   Payload: { ucme_id: UUID, new_status: string }
   Richiede autenticazione JWT (Bearer)
================================================================ */

const Joi = require('joi');
const {
  verifyJWT,
  updateUcmeStatusByPortatore,
} = require('../../../lib/supabase.js');

// Schema validazione
const payloadSchema = Joi.object({
  ucme_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  new_status: Joi.string().valid('ricevuta', 'in lavorazione', 'completata', 'richiesta supporto').required(),
}).required();

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'PATCH') {
    return res
      .status(405)
      .json({ success: false, message: 'Metodo non supportato. Usa PATCH.' });
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

    // Validazione input
    const { error: validationErr, value: validated } = payloadSchema.validate(req.body);
    if (validationErr) {
      return res.status(400).json({ success: false, message: validationErr.message });
    }

    const { ucme_id, new_status } = validated;

    const updated = await updateUcmeStatusByPortatore(ucme_id, payload.userId, new_status);

    return res.status(200).json({ success: true, data: updated, message: 'Status aggiornato' });
  } catch (err) {
    console.error('❌ Portatore UCMe status error:', err);
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Errore interno' });
  }
}; 