// ================================================================
// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");
// Sistema di rate limiting
const { rateLimitMiddleware, checkRateLimitByIdentifier } = require('./rate-limiter.js');
// MENTAL COMMONS - REGISTER API CON SUPABASE
// ================================================================
// Versione: 2.1.0 - SECURITY UPDATE
// Descrizione: API registrazione con backend persistente Supabase + Rate Limiting

import { 
  findUserByEmail, 
  createUser, 
  generateJWT, 
  saveUserSession,
  testDatabaseConnection,
  logConfiguration
} from './supabase.js';

export default async function handler(req, res) {
  // ================================================================
  // LOGGING INIZIALE E CONFIGURAZIONE
  // ================================================================
  
  debug('🟣 ============================================');
  debug('🟣 MENTAL COMMONS - REGISTER API v2.1 SECURITY');
  debug('🟣 ============================================');
  debug('📝 Timestamp:', new Date().toISOString());
  debug('📝 Metodo:', req.method);
  debug('📝 User-Agent:', req.headers['user-agent']);
  debug('📝 Origin:', req.headers.origin);
  
  // Log configurazione Supabase
  logConfiguration();
  
  // ================================================================
  // RATE LIMITING SECURITY CHECK
  // ================================================================
  
  const rateLimitCheck = rateLimitMiddleware('register');
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
  
  if (req.method === 'OPTIONS') {
    debug('📝 Risposta CORS OPTIONS inviata');
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
  
  debug('📝 Tentativo di registrazione ricevuto - BACKEND SUPABASE');
  debug('📝 Body ricevuto (RAW):', JSON.stringify(req.body, null, 2));
  
  const { email, password, name, surname } = req.body;
  
  // Log dettagliato dei dati ricevuti
  debug('📦 REGISTER PAYLOAD - Dati estratti dal body:');
  debug('  📧 Email:', email);
  debug('  📧 Email type:', typeof email);
  debug('  📧 Email length:', email?.length);
  debug('  🔑 Password presente:', !!password);
  debug('  🔑 Password type:', typeof password);
  debug('  🔑 Password length:', password?.length);
  debug('  👤 Name:', name);
  debug('  👤 Name type:', typeof name);
  debug('  👤 Name length:', name?.length);
  debug('  👤 Surname:', surname);
  debug('  👤 Surname type:', typeof surname);
  debug('  👤 Surname length:', surname?.length);
  
  // Validazione campi obbligatori
  if (!email || !password || !name) {
    debug('❌ Dati mancanti nella registrazione');
    return res.status(400).json({
      success: false,
      message: 'Email, password e nome sono richiesti',
      debug: {
        hasEmail: !!email,
        hasPassword: !!password,
        hasName: !!name,
        hasSurname: !!surname,
        emailValue: email || 'MISSING',
        nameValue: name || 'MISSING',
        surnameValue: surname || 'OPTIONAL',
        passwordPresent: !!password,
        apiVersion: '2.0.0',
        backend: 'supabase'
      }
    });
  }
  
  // Validazione surname opzionale
  if (surname && surname.length > 100) {
    debug('❌ Cognome troppo lungo:', surname.length, 'caratteri');
    return res.status(400).json({
      success: false,
      message: 'Il cognome deve essere massimo 100 caratteri',
      debug: {
        surnameLength: surname.length,
        maximumLength: 100,
        apiVersion: '2.0.0',
        backend: 'supabase'
      }
    });
  }
  
  // Validazione formato surname (solo lettere, spazi, apostrofi, trattini)
  if (surname && surname.trim() !== '') {
    const surnameRegex = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\s\-']+$/;
    if (!surnameRegex.test(surname.trim())) {
      debug('❌ Formato cognome non valido:', surname);
      return res.status(400).json({
        success: false,
        message: 'Il cognome può contenere solo lettere, spazi, apostrofi e trattini',
        debug: {
          receivedSurname: surname,
          surnameValid: false,
          apiVersion: '2.0.0',
          backend: 'supabase'
        }
      });
    }
  }
  
  // Validazione formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    debug('❌ Formato email non valido:', email);
    return res.status(400).json({
      success: false,
      message: 'Formato email non valido',
      debug: {
        receivedEmail: email,
        emailValid: false,
        apiVersion: '2.0.0',
        backend: 'supabase'
      }
    });
  }
  
  // Validazione lunghezza password
  if (password.length < 6) {
    debug('❌ Password troppo corta:', password.length, 'caratteri');
    return res.status(400).json({
      success: false,
      message: 'La password deve essere di almeno 6 caratteri',
      debug: {
        passwordLength: password.length,
        minimumLength: 6,
        apiVersion: '2.0.0',
        backend: 'supabase'
      }
    });
  }
  
  // ================================================================
  // TEST CONNESSIONE DATABASE
  // ================================================================
  
  debug('🔍 Test connessione database prima della registrazione...');
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
  // PROCESSO DI REGISTRAZIONE
  // ================================================================
  
  try {
    // 1. Verifica se l'utente esiste già
    debug('📥 VERIFICA UTENTE ESISTENTE - Controllo in Supabase:');
    debug('  🔍 Tipo di storage: Supabase PostgreSQL');
    debug('  🔍 Fonte dati: Database persistente');
    debug('  🔍 Email da verificare:', email);
    
    let existingUser = null;
    
    try {
      existingUser = await findUserByEmail(email);
      debug('✅ Controllo utente esistente completato:', existingUser ? 'TROVATO' : 'NON TROVATO');
    } catch (searchError) {
      error('❌ Errore durante la ricerca utente esistente:', searchError);
      
      // Se c'è un errore nella ricerca, procediamo comunque con la creazione
      // L'eventuale duplicato verrà catturato dal database
      debug('⚠ Procedo comunque con la creazione utente (gestione errore ricerca)');
    }
    
    if (existingUser) {
      debug('❌ Utente già esistente nel database');
      debug('📦 REGISTER RESULT - FALLIMENTO:');
      debug('  📧 Email:', email);
      debug('  👤 Account già esistente: SÌ');
      debug('  🆔 User ID esistente:', existingUser.id);
      
      return res.status(409).json({
        success: false,
        message: 'Un account con questa email esiste già. Prova a fare login.',
        debug: {
          error: 'user_already_exists',
          receivedEmail: email,
          existingUserId: existingUser.id,
          backend: 'supabase',
          suggestion: 'try_login',
          timestamp: new Date().toISOString(),
          apiVersion: '2.0.0'
        }
      });
    }
    
    debug('✅ Email disponibile, procedo con la creazione');
    
    // 2. Crea nuovo utente
    debug('👤 CREAZIONE UTENTE - Salvataggio in Supabase:');
    debug('  📧 Email:', email);
    debug('  👤 Nome:', name);
    debug('  👤 Cognome:', surname || 'NON SPECIFICATO');
    debug('  🔐 Password: [HASHATA CON BCRYPT]');
    
    const newUser = await createUser(email, password, name, surname);
    
    debug('✅ Utente creato con successo nel database');
    debug('  👤 User ID:', newUser.id);
    debug('  👤 Email:', newUser.email);
    debug('  👤 Nome:', newUser.name);
    debug('  👤 Cognome:', newUser.surname || 'NON SPECIFICATO');
    debug('  👤 Ruolo:', newUser.role);
    debug('  📅 Creato il:', newUser.created_at);
    
    // 3. Genera JWT token per login automatico
    debug('🎫 Generazione token JWT per login automatico...');
    const token = generateJWT(newUser.id, newUser.email);
    
    // 4. Salva sessione (opzionale, non bloccante)
    const deviceInfo = req.headers['user-agent'];
    await saveUserSession(newUser.id, token, deviceInfo);
    
    // ================================================================
    // RISPOSTA DI SUCCESSO
    // ================================================================
    
    debug('📦 REGISTER RESULT - SUCCESSO:');
    debug('  📧 Email salvata:', newUser.email);
    debug('  👤 Nome salvato:', newUser.name);
    debug('  👤 Cognome salvato:', newUser.surname || 'NON SPECIFICATO');
    debug('  🔐 Password hash: SALVATO');
    debug('  💾 Persistenza: SÌ (Supabase)');
    debug('  🔄 Cross-device: SÌ');
    debug('  🎫 Login automatico: SÌ');
    
    const responseData = {
      success: true,
      message: 'Registrazione completata con successo',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        surname: newUser.surname,
        role: newUser.role,
        createdAt: newUser.created_at
      },
      token: token, // Login automatico dopo registrazione
      debug: {
        registrationMethod: 'supabase_database',
        persistentStorage: true,
        storageType: 'postgresql',
        timestamp: new Date().toISOString(),
        apiVersion: '2.0.0',
        backend: 'supabase',
        crossDevice: true,
        autoLogin: true
      }
    };
    
    debug('📝 Registration response preparata:', JSON.stringify(responseData, null, 2));
    res.status(201).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    error('💥 Errore durante il processo di registrazione:', error);
    error('💥 Stack trace:', error.stack);
    error('💥 Error code:', error.code);
    error('💥 Error statusCode:', error.statusCode);
    
    // Gestione errori specifici
    let errorMessage = 'Errore interno del server durante la registrazione';
    let statusCode = 500;
    
    // Errore di duplicazione email
    if (error.code === 'DUPLICATE_EMAIL' || error.statusCode === 409) {
      debug('❌ Rilevato errore di duplicazione email');
      return res.status(409).json({
        success: false,
        message: 'Un account con questa email esiste già. Prova a fare login.',
        debug: {
          error: 'user_already_exists',
          code: 'DUPLICATE_EMAIL',
          backend: 'supabase',
          suggestion: 'try_login',
          timestamp: new Date().toISOString(),
          apiVersion: '2.0.0'
        }
      });
    }
    
    // Altri errori di duplicazione (fallback)
    if (error.message && (error.message.includes('duplicate key') || error.message.includes('already exists'))) {
      debug('❌ Rilevato errore di duplicazione (fallback)');
      return res.status(409).json({
        success: false,
        message: 'Un account con questa email esiste già. Prova a fare login.',
        debug: {
          error: 'user_already_exists_fallback',
          backend: 'supabase',
          suggestion: 'try_login',
          timestamp: new Date().toISOString(),
          apiVersion: '2.0.0'
        }
      });
    }
    
    // Errori di connessione database
    if (error.message && (error.message.includes('connection') || error.message.includes('network'))) {
      errorMessage = 'Errore di connessione al database. Riprova tra qualche momento.';
      statusCode = 503;
    }
    
    // Errori di validazione
    if (error.message && error.message.includes('validation')) {
      errorMessage = 'Dati non validi forniti';
      statusCode = 400;
    }
    
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      debug: {
        error: error.message || 'unknown_error',
        code: error.code || 'unknown',
        backend: 'supabase',
        timestamp: new Date().toISOString(),
        apiVersion: '2.0.0'
      }
    });
  }
  
  debug('🔚 Fine processo registrazione - timestamp:', new Date().toISOString());
  debug('🟣 ============================================');
} 