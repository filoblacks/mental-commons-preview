// ================================================================
// MENTAL COMMONS - UCMe ENDPOINT UNIFICATO
// ================================================================
// Versione: 1.0.0
// GET  ?action=list      → elenco UCMe per utente (ex-ucme-list)
// POST (senza action)     → salva nuova UCMe (ex-ucme)
// ================================================================

const ucmeSaveHandler = require('../lib/ucme-save.js');
const ucmeListHandler = require('../lib/ucme-list.js');

module.exports = async function handler(req, res) {
  const action = (req.query.action || '').toLowerCase();

  if (req.method === 'GET') {
    // di default, GET esegue lista
    return await ucmeListHandler(req, res);
  }

  if (req.method === 'POST') {
    // se specificato action=list con POST, inoltra comunque a list handler
    if (action === 'list') {
      return await ucmeListHandler(req, res);
    }
    return await ucmeSaveHandler(req, res);
  }

  // altri metodi non supportati
  return res.status(405).json({
    success: false,
    message: 'Metodo non supportato. Usa GET per lista o POST per salvataggio.'
  });
}; 