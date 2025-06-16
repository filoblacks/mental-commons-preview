// ✅ Endpoint register per Vercel Serverless
export default function handler(req, res) {
  // Gestione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Metodo non consentito. Utilizzare POST.'
    });
  }
  
  console.log('📝 Tentativo di registrazione ricevuto');
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, password e nome sono richiesti'
    });
  }
  
  // Mock registrazione sempre successo (per ora)
  res.status(200).json({
    success: true,
    message: 'Registrazione completata con successo',
    user: {
      id: 'user_' + Date.now(),
      email: email,
      name: name,
      role: 'user',
      createdAt: new Date().toISOString()
    }
  });
} 