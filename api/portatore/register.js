/* ================================================================
   MENTAL COMMONS – API PORTATORE REGISTER
   ================================================================
   POST /api/portatore/register
   Richiede autenticazione JWT (Bearer)
   Payload: { bio: string }
   Azione: inserisce o aggiorna la riga nella tabella "portatori"
            e imposta users.is_portatore = true
================================================================ */

const { verifyJWT, registerPortatore } = require('../../lib/supabase.js');
const { validateAndSanitize } = require('../../lib/validation.js');
const Joi = require('joi');

// Schema validazione bio (max 300 caratteri)
const bioSchema = Joi.object({
  bio: Joi.string().min(10).max(300).required().messages({
    'string.min': 'La bio deve avere almeno 10 caratteri',
    'string.max': 'La bio può avere massimo 300 caratteri',
    'any.required': 'Bio obbligatoria'
  })
}).required();

module.exports = async function handler(req, res) {
  // CORS di base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metodo non supportato. Usa POST.' });
  }

  try {
    /* 1. Auth */
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    /* 2. Validazione input */
    const validation = await validateAndSanitize(req.body, bioSchema);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: 'Dati non validi', errors: validation.errors });
    }
    const { bio } = validation.data;

    /* 3. Operazione DB */
    const portatore = await registerPortatore(payload.userId, bio);

    return res.status(201).json({ success: true, message: 'Registrazione portatore avvenuta con successo', data: portatore });
  } catch (err) {
    console.error('❌ Portatore Register Error:', err);
    return res.status(500).json({ success: false, message: 'Errore interno del server', error: err.message });
  }
}; 