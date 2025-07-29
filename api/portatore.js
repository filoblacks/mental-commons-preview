// ================================================================
// MENTAL COMMONS – API PORTATORE (endpoint unificato)
// ================================================================
// Path:  /api/portatore
// Gestione azioni tramite query string ?action=
//   - status   (GET)   → stato portatore
//   - register (POST)  → registrazione/aggiornamento
//   - revoke   (DELETE)→ revoca candidatura
//   - ucme     (GET)   → UCMe assegnate
//               (PATCH)→ aggiorna status UCMe
//   - rispondi (POST)  → invia risposta UCMe
// ================================================================

const Joi = require('joi');
const {
  verifyJWT,
  getPortatoreStatus,
  registerPortatore,
  revokePortatore,
  getAssignedUCMesForPortatore,
  updateUcmeStatusByPortatore,
  respondToUcme,
} = require('../lib/supabase.js');

// === Schemi Joi riciclati ===
const bioSchema = Joi.object({
  bio: Joi.string().min(10).max(300).required(),
}).required();

const ucmeStatusSchema = Joi.object({
  ucme_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  new_status: Joi.string().valid('ricevuta', 'in lavorazione', 'completata', 'richiesta supporto').required(),
}).required();

const rispostaSchema = Joi.object({
  ucme_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  contenuto: Joi.string().min(1).max(3000).required(),
}).required();

// ================================================================
module.exports = async function handler(req, res) {
  // CORS minimal
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = (req.query.action || '').toLowerCase();
  if (!action) {
    return res.status(400).json({ success: false, message: 'Azione mancante' });
  }

  // === Auth comune ===
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token mancante' });
  }
  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
  }

  try {
    switch (action) {
      case 'status': {
        if (req.method !== 'GET') break;
        const status = await getPortatoreStatus(payload.userId);
        return res.status(200).json({ success: true, data: status });
      }

      case 'register': {
        if (req.method !== 'POST') break;
        const { error: vErr, value } = bioSchema.validate(req.body);
        if (vErr) return res.status(400).json({ success: false, message: vErr.message });
        const portatore = await registerPortatore(payload.userId, value.bio);
        return res.status(201).json({ success: true, data: portatore, message: 'Registrazione completata' });
      }

      case 'revoke': {
        if (req.method !== 'DELETE') break;
        await revokePortatore(payload.userId);
        return res.status(200).json({ success: true, message: 'Candidatura revocata' });
      }

      case 'ucme': {
        if (req.method === 'GET') {
          const ucmes = await getAssignedUCMesForPortatore(payload.userId);
          return res.status(200).json({ success: true, data: ucmes });
        }
        if (req.method === 'PATCH') {
          const { error: vErr, value } = ucmeStatusSchema.validate(req.body);
          if (vErr) return res.status(400).json({ success: false, message: vErr.message });
          const updated = await updateUcmeStatusByPortatore(value.ucme_id, payload.userId, value.new_status);
          return res.status(200).json({ success: true, data: updated, message: 'Status aggiornato' });
        }
        break;
      }

      case 'rispondi': {
        if (req.method !== 'POST') break;
        const { error: vErr, value } = rispostaSchema.validate(req.body);
        if (vErr) return res.status(400).json({ success: false, message: vErr.message });
        const risposta = await respondToUcme(value.ucme_id, payload.userId, value.contenuto);
        return res.status(201).json({ success: true, data: risposta, message: 'Risposta salvata' });
      }

      default:
        return res.status(400).json({ success: false, message: 'Azione non riconosciuta' });
    }
  } catch (err) {
    console.error('❌ Portatore API error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno' });
  }

  // Se non corrisponde a nessuna combinazione
  return res.status(405).json({ success: false, message: 'Metodo non supportato per questa azione' });
};

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query.token) return req.query.token;
  if (req.body && typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
} 