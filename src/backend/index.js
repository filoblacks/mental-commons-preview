const express = require('express');
const cors = require('cors');

const app = express();

// ✅ Gestione CORS completa
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// ✅ Gestione esplicita OPTIONS per preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.status(200).send();
});

// ✅ Middleware per parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Logging per debug
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'N/A'}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ✅ Endpoint di test connettività
app.get('/ping', (req, res) => {
  console.log('📡 Ping ricevuto');
  res.json({
    status: 'ok',
    message: 'Mental Commons Backend attivo',
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ✅ Endpoint mock login
app.post('/login', (req, res) => {
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
    res.json({
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
});

// ✅ Endpoint mock registrazione
app.post('/register', (req, res) => {
  console.log('📝 Tentativo di registrazione ricevuto');
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, password e nome sono richiesti'
    });
  }
  
  // Mock registrazione sempre successo (per ora)
  res.json({
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
});

// ✅ Endpoint per gestione utenti (compatibilità con Google Apps Script)
app.post('/', (req, res) => {
  console.log('📋 Richiesta generica ricevuta (compatibilità GAS)');
  const { action } = req.body;
  
  switch (action) {
    case 'ping':
    case 'test':
      res.json({
        status: 'ok',
        message: 'Backend attivo',
        time: new Date().toISOString()
      });
      break;
      
    case 'login':
      // Richiama la logica di login
      const loginResult = req.body;
      if (loginResult.email === 'test@mentalcommons.it' && loginResult.password === 'test123') {
        res.json({
          success: true,
          message: 'Login effettuato con successo',
          user: { id: 'user_123', email: loginResult.email, name: 'Test User' }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Credenziali non valide'
        });
      }
      break;
      
    case 'register':
      res.json({
        success: true,
        message: 'Registrazione completata con successo',
        user: {
          id: 'user_' + Date.now(),
          email: req.body.email,
          name: req.body.name
        }
      });
      break;
      
    default:
      res.status(400).json({
        success: false,
        message: 'Azione non riconosciuta: ' + action
      });
  }
});

// ✅ Gestione 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint non trovato',
    path: req.path,
    method: req.method
  });
});

// ✅ Gestione errori globali
app.use((err, req, res, next) => {
  console.error('❌ Errore server:', err);
  res.status(500).json({
    success: false,
    message: 'Errore interno del server',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Errore generico'
  });
});

// Per Vercel, esportiamo l'app
module.exports = app;

// Per sviluppo locale
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Mental Commons Backend attivo su porta ${PORT}`);
    console.log(`📡 Endpoint disponibili:`);
    console.log(`   GET  /ping - Test connettività`);
    console.log(`   POST /login - Login utente`);
    console.log(`   POST /register - Registrazione utente`);
    console.log(`   POST / - Endpoint compatibilità GAS`);
  });
} 