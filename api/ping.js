// ✅ Endpoint ping per Vercel Serverless
export default function handler(req, res) {
  // Gestione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  console.log('📡 Ping ricevuto');
  
  res.status(200).json({
    status: 'ok',
    message: 'Mental Commons Backend attivo',
    time: new Date().toISOString(),
    version: '1.0.0',
    environment: 'vercel-unified'
  });
} 