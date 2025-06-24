// ================================================================
// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");
// Sistema di rate limiting
const { rateLimitMiddleware, checkRateLimitByIdentifier } = require('./rate-limiter.js');
// MENTAL COMMONS - LOGIN API CON SUPABASE
// ================================================================
// Versione: 2.1.0 - SECURITY UPDATE
// Descrizione: API login con backend persistente Supabase + Rate Limiting

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
  
  debug('🟣 ============================================');
  debug('🟣 MENTAL COMMONS - LOGIN API v2.1 SECURITY');
  debug('🟣 ============================================');
  debug('🔑 Timestamp:', new Date().toISOString());
  debug('🔑 Metodo:', req.method);
  debug('🔑 User-Agent:', req.headers['user-agent']);
  debug('🔑 Origin:', req.headers.origin);
  
  // Log configurazione Supabase
  logConfiguration();
  
  // ================================================================
  // RATE LIMITING SECURITY CHECK
  // ================================================================
  
  const rateLimitCheck = rateLimitMiddleware('login');
  const rateLimitResult = await new Promise((resolve) => {
    rateLimitCheck(req, res, () => resolve({ allowed: true }));
  });
  
  if (!rateLimitResult.allowed) {
    // La risposta è già stata inviata dal middleware
    return;
  }
  
  // ================================================================
  // GESTIONE CORS E METODI
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://mental-commons.vercel.app' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (req.method === 'OPTIONS') {
    debug('🔑 Risposta CORS OPTIONS inviata');
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    debug('❌ Metodo non valido:', req.method);
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
  
  debug('🔐 Tentativo di login ricevuto - BACKEND SUPABASE');
  debug('🔑 Body ricevuto (RAW):', JSON.stringify(req.body, null, 2));
  
  const { email, password } = req.body;
  
  // Log dettagliato dei dati ricevuti
  debug('📦 LOGIN PAYLOAD - Dati estratti dal body:');
  debug('  📧 Email:', email);
  debug('  📧 Email type:', typeof email);
  debug('  📧 Email length:', email?.length);
  debug('  🔑 Password presente:', !!password);
  debug('  🔑 Password type:', typeof password);
  debug('  🔑 Password length:', password?.length);
  
  if (!email || !password) {
    debug('❌ Dati mancanti nel login');
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
  
  debug('🔍 Test connessione database prima del login...');
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    debug('❌ Connessione database fallita');
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
    debug('📥 RICERCA UTENTE - Inizio ricerca in Supabase:');
    debug('  🔍 Tipo di storage: Supabase PostgreSQL');
    debug('  🔍 Fonte dati: Database persistente');
    debug('  🔍 Account ricercato:', email);
    
    const user = await findUserByEmail(email);
    
    if (!user) {
      debug('❌ Account non trovato nel database');
      debug('📦 LOGIN RESULT - FALLIMENTO:');
      debug('  📧 Email ricevuta:', email);
      debug('  👤 Account esistente: NO');
      debug('  🔍 Ricerca completata in database persistente');
      
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
    
    debug('✅ Account trovato nel database');
    debug('  👤 User ID:', user.id);
    debug('  👤 Nome:', user.name);
    debug('  👤 Ruolo:', user.role);
    debug('  👤 Attivo:', user.is_active);
    debug('  👤 Ultimo login:', user.last_login);
    
    // 2. Verifica password
    debug('🔐 Verifica password...');
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      debug('❌ Password non valida');
      debug('📦 LOGIN RESULT - FALLIMENTO:');
      debug('  📧 Email match: SÌ');
      debug('  🔑 Password match: NO');
      debug('  👤 Account esistente: SÌ');
      
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
    
    debug('✅ Password valida');
    
    // 3. Genera JWT token
    debug('🎫 Generazione token JWT...');
    const token = generateJWT(user.id, user.email);
    
    // 4. Salva sessione (opzionale, non bloccante)
    const deviceInfo = req.headers['user-agent'];
    await saveUserSession(user.id, token, deviceInfo);
    
    // 5. Aggiorna ultimo login
    await updateLastLogin(user.id);
    
    // ================================================================
    // RISPOSTA DI SUCCESSO
    // ================================================================
    
    debug('📦 LOGIN RESULT - SUCCESSO:');
    debug('  📧 Email match: ESATTO');
    debug('  🔑 Password match: ESATTO');
    debug('  👤 Account esistente: SÌ');
    debug('  🎫 JWT Token: GENERATO');
    debug('  💾 Persistenza: SÌ (Supabase)');
    debug('  🔄 Cross-device: SÌ');
    
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
    
    debug('🔑 Login response preparata:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    error('💥 Errore durante il processo di login:', error);
    error('💥 Stack trace:', error.stack);
    
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
  
  debug('🔚 Fine processo login - timestamp:', new Date().toISOString());
  debug('🟣 ============================================');
} 