// ================================================================
// MENTAL COMMONS - AUTH ENDPOINT UNIFICATO
// ================================================================
// Versione: 1.0.0
// Gestisce login, registrazione e validazione token.
// L'azione viene scelta tramite query string ?action=login|register|validate-token
// (vedi rewrites in vercel.json per retro-compatibilità con /api/login ecc.)
// ================================================================

const loginHandler = require('../lib/login.js');
const registerHandler = require('../lib/register.js');
const validateTokenHandler = require('../lib/validate-token.js');

module.exports = async function handler(req, res) {
  const action = (req.query.action || '').toLowerCase();

  switch (action) {
    case 'login':
      return await loginHandler(req, res);
    case 'register':
      return await registerHandler(req, res);
    case 'validate-token':
    case 'validatetoken':
      return await validateTokenHandler(req, res);
    default:
      res.status(400).json({
        success: false,
        message: 'Azione auth non valida. Usa action=login | register | validate-token.'
      });
  }
}; 