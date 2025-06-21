// ================================================================
// MENTAL COMMONS - REGISTER API CON SUPABASE
// ================================================================
// Versione: 2.0.0
// Descrizione: API registrazione con backend persistente Supabase

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
  
  console.log('🟣 ============================================');
  console.log('🟣 MENTAL COMMONS - REGISTER API v2.0 SUPABASE');
  console.log('🟣 ============================================');
  console.log('📝 Timestamp:', new Date().toISOString());
  console.log('📝 Headers ricevuti:', JSON.stringify(req.headers, null, 2));
  console.log('📝 Metodo:', req.method);
  console.log('📝 User-Agent:', req.headers['user-agent']);
  console.log('📝 Origin:', req.headers.origin);
  console.log('📝 Referer:', req.headers.referer);
  
  // Log configurazione Supabase
  logConfiguration();
  
  // ================================================================
  // GESTIONE CORS E METODI
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log('📝 Risposta CORS OPTIONS inviata');
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
  
  console.log('📝 Tentativo di registrazione ricevuto - BACKEND SUPABASE');
  console.log('📝 Body ricevuto (RAW):', JSON.stringify(req.body, null, 2));
  
  const { email, password, name, surname } = req.body;
  
  // Log dettagliato dei dati ricevuti
  console.log('📦 REGISTER PAYLOAD - Dati estratti dal body:');
  console.log('  📧 Email:', email);
  console.log('  📧 Email type:', typeof email);
  console.log('  📧 Email length:', email?.length);
  console.log('  🔑 Password presente:', !!password);
  console.log('  🔑 Password type:', typeof password);
  console.log('  🔑 Password length:', password?.length);
  console.log('  👤 Name:', name);
  console.log('  👤 Name type:', typeof name);
  console.log('  👤 Name length:', name?.length);
  console.log('  👤 Surname:', surname);
  console.log('  👤 Surname type:', typeof surname);
  console.log('  👤 Surname length:', surname?.length);
  
  // Validazione campi obbligatori
  if (!email || !password || !name) {
    console.log('❌ Dati mancanti nella registrazione');
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
    console.log('❌ Cognome troppo lungo:', surname.length, 'caratteri');
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
      console.log('❌ Formato cognome non valido:', surname);
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
    console.log('❌ Formato email non valido:', email);
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
    console.log('❌ Password troppo corta:', password.length, 'caratteri');
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
  
  console.log('🔍 Test connessione database prima della registrazione...');
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
  // PROCESSO DI REGISTRAZIONE
  // ================================================================
  
  try {
    // 1. Verifica se l'utente esiste già
    console.log('📥 VERIFICA UTENTE ESISTENTE - Controllo in Supabase:');
    console.log('  🔍 Tipo di storage: Supabase PostgreSQL');
    console.log('  🔍 Fonte dati: Database persistente');
    console.log('  🔍 Email da verificare:', email);
    
    let existingUser = null;
    
    try {
      existingUser = await findUserByEmail(email);
      console.log('✅ Controllo utente esistente completato:', existingUser ? 'TROVATO' : 'NON TROVATO');
    } catch (searchError) {
      console.error('❌ Errore durante la ricerca utente esistente:', searchError);
      
      // Se c'è un errore nella ricerca, procediamo comunque con la creazione
      // L'eventuale duplicato verrà catturato dal database
      console.log('⚠ Procedo comunque con la creazione utente (gestione errore ricerca)');
    }
    
    if (existingUser) {
      console.log('❌ Utente già esistente nel database');
      console.log('📦 REGISTER RESULT - FALLIMENTO:');
      console.log('  📧 Email:', email);
      console.log('  👤 Account già esistente: SÌ');
      console.log('  🆔 User ID esistente:', existingUser.id);
      
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
    
    console.log('✅ Email disponibile, procedo con la creazione');
    
    // 2. Crea nuovo utente
    console.log('👤 CREAZIONE UTENTE - Salvataggio in Supabase:');
    console.log('  📧 Email:', email);
    console.log('  👤 Nome:', name);
    console.log('  👤 Cognome:', surname || 'NON SPECIFICATO');
    console.log('  🔐 Password: [HASHATA CON BCRYPT]');
    
    const newUser = await createUser(email, password, name, surname);
    
    console.log('✅ Utente creato con successo nel database');
    console.log('  👤 User ID:', newUser.id);
    console.log('  👤 Email:', newUser.email);
    console.log('  👤 Nome:', newUser.name);
    console.log('  👤 Cognome:', newUser.surname || 'NON SPECIFICATO');
    console.log('  👤 Ruolo:', newUser.role);
    console.log('  📅 Creato il:', newUser.created_at);
    
    // 3. Genera JWT token per login automatico
    console.log('🎫 Generazione token JWT per login automatico...');
    const token = generateJWT(newUser.id, newUser.email);
    
    // 4. Salva sessione (opzionale, non bloccante)
    const deviceInfo = req.headers['user-agent'];
    await saveUserSession(newUser.id, token, deviceInfo);
    
    // ================================================================
    // RISPOSTA DI SUCCESSO
    // ================================================================
    
    console.log('📦 REGISTER RESULT - SUCCESSO:');
    console.log('  📧 Email salvata:', newUser.email);
    console.log('  👤 Nome salvato:', newUser.name);
    console.log('  👤 Cognome salvato:', newUser.surname || 'NON SPECIFICATO');
    console.log('  🔐 Password hash: SALVATO');
    console.log('  💾 Persistenza: SÌ (Supabase)');
    console.log('  🔄 Cross-device: SÌ');
    console.log('  🎫 Login automatico: SÌ');
    
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
    
    console.log('📝 Registration response preparata:', JSON.stringify(responseData, null, 2));
    res.status(201).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    console.error('💥 Errore durante il processo di registrazione:', error);
    console.error('💥 Stack trace:', error.stack);
    console.error('💥 Error code:', error.code);
    console.error('💥 Error statusCode:', error.statusCode);
    
    // Gestione errori specifici
    let errorMessage = 'Errore interno del server durante la registrazione';
    let statusCode = 500;
    
    // Errore di duplicazione email
    if (error.code === 'DUPLICATE_EMAIL' || error.statusCode === 409) {
      console.log('❌ Rilevato errore di duplicazione email');
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
      console.log('❌ Rilevato errore di duplicazione (fallback)');
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
  
  console.log('🔚 Fine processo registrazione - timestamp:', new Date().toISOString());
  console.log('🟣 ============================================');
} 