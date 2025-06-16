// ✅ Endpoint login per Vercel Serverless
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
  
  console.log('🔐 Tentativo di login ricevuto');
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e password sono richiesti'
    });
  }
  
  // Mock logic - accetta "test@mentalcommons.it" con password "test123"
  if (email === 'test@mentalcommons.it' && password === 'test123') {
    res.status(200).json({
      success: true,
      message: 'Login effettuato con successo',
      user: {
        id: 'user_123',
        email: email,
        name: 'Test User',
        role: 'user'
      },
      token: 'mock_jwt_token_' + Date.now()
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenziali non valide'
    });
  }
} 