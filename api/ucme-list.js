// ENDPOINT ALTERNATIVE UCME LIST
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json({
    success: true,
    message: "UCME-LIST endpoint funziona - Deploy riuscito!",
    method: req.method,
    timestamp: new Date().toISOString(),
    redirect_note: "Questo endpoint sostituisce /api/ucmes",
    data: []
  });
}; 