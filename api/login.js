// ================================================================
// MENTAL COMMONS - LOGIN API CON SUPABASE
// ================================================================
// Versione: 2.0.0
// Descrizione: API login con backend persistente Supabase

import { 
  findUserByEmail, 
  verifyPassword, 
  generateJWT, 
  updateLastLogin,
  saveUserSession,
  testDatabaseConnection,
  logConfiguration
} from './supabase.js';

export default async function handler(req, res) {
  // ================================================================
  // LOGGING INIZIALE E CONFIGURAZIONE
  // ================================================================
  
  console.log('🟣 ============================================');
  console.log('🟣 MENTAL COMMONS - LOGIN API v2.0 SUPABASE');
  console.log('🟣 ============================================');
  console.log('🔑 Timestamp:', new Date().toISOString());
  console.log('🔑 Headers ricevuti:', JSON.stringify(req.headers, null, 2));
  console.log('🔑 Metodo:', req.method);
  console.log('🔑 User-Agent:', req.headers['user-agent']);
  console.log('🔑 Origin:', req.headers.origin);
  console.log('🔑 Referer:', req.headers.referer);
  
  // Log configurazione Supabase
  logConfiguration();
  
  // ================================================================
  // GESTIONE CORS E METODI
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log('🔑 Risposta CORS OPTIONS inviata');
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    console.log('❌ Metodo non valido:', req.method);
    return res.status(405).json({
      success: false,
      message: 'Metodo non consentito. Utilizzare POST.',
      debug: {
        receivedMethod: req.method,
        expectedMethod: 'POST',
        apiVersion: '2.0.0',
        backend: 'supabase'
      }
    });
  }
  
  // ================================================================
  // VALIDAZIONE INPUT
  // ================================================================
  
  console.log('🔐 Tentativo di login ricevuto - BACKEND SUPABASE');
  console.log('🔑 Body ricevuto (RAW):', JSON.stringify(req.body, null, 2));
  
  const { email, password } = req.body;
  
  // Log dettagliato dei dati ricevuti
  console.log('📦 LOGIN PAYLOAD - Dati estratti dal body:');
  console.log('  📧 Email:', email);
  console.log('  📧 Email type:', typeof email);
  console.log('  📧 Email length:', email?.length);
  console.log('  🔑 Password presente:', !!password);
  console.log('  🔑 Password type:', typeof password);
  console.log('  🔑 Password length:', password?.length);
  
  if (!email || !password) {
    console.log('❌ Dati mancanti nel login');
    return res.status(400).json({
      success: false,
      message: 'Email e password sono richiesti',
      debug: {
        hasEmail: !!email,
        hasPassword: !!password,
        emailValue: email || 'MISSING',
        passwordPresent: !!password,
        apiVersion: '2.0.0',
        backend: 'supabase'
      }
    });
  }
  
  // ================================================================
  // TEST CONNESSIONE DATABASE
  // ================================================================
  
  console.log('🔍 Test connessione database prima del login...');
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.log('❌ Connessione database fallita');
    return res.status(500).json({
      success: false,
      message: 'Errore di connessione al database',
      debug: {
        error: 'database_connection_failed',
        backend: 'supabase',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // ================================================================
  // PROCESSO DI AUTENTICAZIONE
  // ================================================================
  
  try {
    // 1. Ricerca utente nel database
    console.log('📥 RICERCA UTENTE - Inizio ricerca in Supabase:');
    console.log('  🔍 Tipo di storage: Supabase PostgreSQL');
    console.log('  🔍 Fonte dati: Database persistente');
    console.log('  🔍 Account ricercato:', email);
    
    const user = await findUserByEmail(email);
    
    if (!user) {
      console.log('❌ Account non trovato nel database');
      console.log('📦 LOGIN RESULT - FALLIMENTO:');
      console.log('  📧 Email ricevuta:', email);
      console.log('  👤 Account esistente: NO');
      console.log('  🔍 Ricerca completata in database persistente');
      
      return res.status(401).json({
        success: false,
        message: 'Account non trovato. Registrati per accedere.',
        debug: {
          error: 'user_not_found',
          receivedEmail: email,
          searchCompleted: true,
          backend: 'supabase',
          suggestion: 'register_first'
        }
      });
    }
    
    console.log('✅ Account trovato nel database');
    console.log('  👤 User ID:', user.id);
    console.log('  👤 Nome:', user.name);
    console.log('  👤 Ruolo:', user.role);
    console.log('  👤 Attivo:', user.is_active);
    console.log('  👤 Ultimo login:', user.last_login);
    
    // 2. Verifica password
    console.log('🔐 Verifica password...');
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      console.log('❌ Password non valida');
      console.log('📦 LOGIN RESULT - FALLIMENTO:');
      console.log('  📧 Email match: SÌ');
      console.log('  🔑 Password match: NO');
      console.log('  👤 Account esistente: SÌ');
      
      return res.status(401).json({
        success: false,
        message: 'Password non corretta',
        debug: {
          error: 'invalid_password',
          userExists: true,
          emailMatch: true,
          passwordMatch: false,
          backend: 'supabase'
        }
      });
    }
    
    console.log('✅ Password valida');
    
    // 3. Genera JWT token
    console.log('🎫 Generazione token JWT...');
    const token = generateJWT(user.id, user.email);
    
    // 4. Salva sessione (opzionale, non bloccante)
    const deviceInfo = req.headers['user-agent'];
    await saveUserSession(user.id, token, deviceInfo);
    
    // 5. Aggiorna ultimo login
    await updateLastLogin(user.id);
    
    // ================================================================
    // RISPOSTA DI SUCCESSO
    // ================================================================
    
    console.log('📦 LOGIN RESULT - SUCCESSO:');
    console.log('  📧 Email match: ESATTO');
    console.log('  🔑 Password match: ESATTO');
    console.log('  👤 Account esistente: SÌ');
    console.log('  🎫 JWT Token: GENERATO');
    console.log('  💾 Persistenza: SÌ (Supabase)');
    console.log('  🔄 Cross-device: SÌ');
    
    const responseData = {
      success: true,
      message: 'Login effettuato con successo',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token: token,
      debug: {
        loginMethod: 'supabase_database',
        accountSource: 'persistent_database',
        timestamp: new Date().toISOString(),
        apiVersion: '2.0.0',
        backend: 'supabase',
        crossDevice: true,
        persistent: true
      }
    };
    
    console.log('🔑 Login response preparata:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    console.error('💥 Errore durante il processo di login:', error);
    console.error('💥 Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server durante il login',
      debug: {
        error: error.message,
        code: error.code || 'unknown',
        backend: 'supabase',
        timestamp: new Date().toISOString(),
        apiVersion: '2.0.0'
      }
    });
  }
  
  console.log('🔚 Fine processo login - timestamp:', new Date().toISOString());
  console.log('🟣 ============================================');
} 