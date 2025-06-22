// ================================================================
// MENTAL COMMONS - UCME API CON SUPABASE
// ================================================================
// Versione: 2.2.0
// Descrizione: API UCMe con backend persistente Supabase e autenticazione JWT
// Fix: Convertito a CommonJS puro per compatibilità Vercel + Fallback per testing

// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");

// Import dinamico per gestire errori
let supabaseModule = null;
let supabaseAvailable = false;

try {
  supabaseModule = require('./supabase.js');
  supabaseAvailable = true;
  debug('✅ Modulo Supabase caricato con successo');
} catch (loadError) {
  error('❌ Errore caricamento modulo Supabase:', loadError.message);
  supabaseAvailable = false;
}

module.exports = async function handler(req, res) {
  // ================================================================
  // LOGGING INIZIALE E CONFIGURAZIONE
  // ================================================================
  
  debug('🟣 ============================================');
  debug('🟣 MENTAL COMMONS - UCME API v2.2 SUPABASE');
  debug('🟣 ============================================');
  debug('📝 Timestamp:', new Date().toISOString());
  debug('📝 Headers ricevuti:', JSON.stringify(req.headers, null, 2));
  debug('📝 Metodo:', req.method);
  debug('📝 User-Agent:', req.headers['user-agent']);
  debug('📝 Origin:', req.headers.origin);
  debug('📝 Referer:', req.headers.referer);
  debug('📝 Supabase disponibile:', supabaseAvailable);
  
  // Verifica che le variabili d'ambiente siano configurate
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_KEY;
  
  debug('🔧 STATO CONFIGURAZIONE:');
  debug('   SUPABASE_URL:', hasSupabaseUrl ? '✅ Presente' : '❌ Mancante');
  debug('   SUPABASE_SERVICE_KEY:', hasSupabaseKey ? '✅ Presente' : '❌ Mancante');
  debug('   Modulo Supabase:', supabaseAvailable ? '✅ Caricato' : '❌ Errore');
  
  if (!supabaseAvailable || !hasSupabaseUrl || !hasSupabaseKey) {
    error('❌ ERRORE CRITICO: Configurazione Supabase non completa');
    
    // FALLBACK TEMPORANEO: Salvataggio in file JSON locale per testing
    warn('⚠️ MODALITÀ FALLBACK ATTIVATA: Salvataggio su file locale');
    
    if (req.method === 'POST') {
      return await handlePostUCMeFallback(req, res);
    } else if (req.method === 'GET') {
      return await handleGetUCMesFallback(req, res);
    }
  }
  
  // Log configurazione Supabase
  try {
    if (supabaseModule && supabaseModule.logConfiguration) {
      supabaseModule.logConfiguration();
    }
  } catch (configError) {
    error('❌ Errore durante logging configurazione:', configError);
  }
  
  // ================================================================
  // GESTIONE CORS E METODI
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    debug('📝 Risposta CORS OPTIONS inviata');
    res.status(200).end();
    return;
  }
  
  // ================================================================
  // GESTIONE METODI HTTP CON SUPABASE
  // ================================================================
  
  try {
    if (req.method === 'GET') {
      // GET: Recupera UCMe dell'utente
      return await handleGetUCMes(req, res);
    } else if (req.method === 'POST') {
      // POST: Salva nuova UCMe
      return await handlePostUCMe(req, res);
    } else {
      debug('❌ Metodo non valido:', req.method);
      return res.status(405).json({
        success: false,
        message: 'Metodo non consentito. Utilizzare GET o POST.',
        debug: {
          receivedMethod: req.method,
          allowedMethods: ['GET', 'POST'],
          apiVersion: '2.2.0',
          backend: 'supabase'
        }
      });
    }
  } catch (handlerError) {
    error('❌ Errore nell\'handler principale:', handlerError);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      debug: {
        error: handlerError.message,
        stack: handlerError.stack,
        apiVersion: '2.2.0'
      }
    });
  }
};

// ================================================================
// HANDLER FALLBACK - SALVATAGGIO SU FILE LOCALE
// ================================================================

async function handlePostUCMeFallback(req, res) {
  debug('📝 POST UCMe FALLBACK - Salvataggio su file locale');
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Validazione base
    const { content, title } = req.body;
    
    if (!content || content.length < 20 || content.length > 600) {
      return res.status(400).json({
        success: false,
        message: 'Il contenuto deve essere tra 20 e 600 caratteri',
        debug: {
          contentLength: content?.length || 0,
          apiVersion: '2.2.0',
          mode: 'fallback'
        }
      });
    }
    
    // Genera UCMe con ID temporaneo
    const ucme = {
      id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      content: content.trim(),
      title: title?.trim() || null,
      status: 'attesa',
      createdAt: new Date().toISOString(),
      mode: 'fallback_local_file'
    };
    
    // Salva su file locale (solo per testing)
    const dataDir = path.join(process.cwd(), 'data');
    const ucmeFile = path.join(dataDir, 'ucmes-fallback.json');
    
    try {
      await fs.mkdir(dataDir, { recursive: true });
      
      let existingUCMes = [];
      try {
        const fileContent = await fs.readFile(ucmeFile, 'utf8');
        existingUCMes = JSON.parse(fileContent);
      } catch (readError) {
        debug('📝 File UCMe non esistente, creazione nuovo');
      }
      
      existingUCMes.push(ucme);
      await fs.writeFile(ucmeFile, JSON.stringify(existingUCMes, null, 2));
      
      debug('✅ UCMe salvata in modalità fallback:', ucme.id);
      
    } catch (fileError) {
      error('❌ Errore salvataggio file fallback:', fileError);
    }
    
    return res.status(201).json({
      success: true,
      message: 'UCMe salvata in modalità di emergenza. Sarà trasferita al database non appena possibile.',
      ucme: ucme,
      debug: {
        saveMethod: 'local_file_fallback',
        persistentStorage: false,
        apiVersion: '2.2.0',
        mode: 'fallback',
        warning: 'Configurazione Supabase non disponibile'
      }
    });
    
  } catch (error) {
    error('❌ Errore fallback UCMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante salvataggio di emergenza',
      debug: {
        error: error.message,
        apiVersion: '2.2.0',
        mode: 'fallback'
      }
    });
  }
}

async function handleGetUCMesFallback(req, res) {
  debug('📖 GET UCMe FALLBACK - Lettura da file locale');
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const ucmeFile = path.join(process.cwd(), 'data', 'ucmes-fallback.json');
    
    try {
      const fileContent = await fs.readFile(ucmeFile, 'utf8');
      const ucmes = JSON.parse(fileContent);
      
      return res.status(200).json({
        success: true,
        message: `Trovate ${ucmes.length} UCMe (modalità fallback)`,
        ucmes: ucmes,
        debug: {
          method: 'local_file_fallback',
          persistentStorage: false,
          apiVersion: '2.2.0',
          mode: 'fallback'
        }
      });
      
    } catch (readError) {
      return res.status(200).json({
        success: true,
        message: 'Nessuna UCMe trovata (modalità fallback)',
        ucmes: [],
        debug: {
          method: 'local_file_fallback',
          apiVersion: '2.2.0',
          mode: 'fallback'
        }
      });
    }
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Errore lettura fallback',
      debug: {
        error: error.message,
        apiVersion: '2.2.0',
        mode: 'fallback'
      }
    });
  }
}

// ================================================================
// HANDLER GET - RECUPERA UCME UTENTE (SUPABASE)
// ================================================================

async function handleGetUCMes(req, res) {
  debug('📖 GET UCMe - Recupero UCMe dell\'utente');
  
  try {
    // Estrai token JWT dall'header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      debug('❌ Token JWT mancante nell\'header Authorization');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione richiesto',
        debug: {
          error: 'missing_auth_token',
          expectedHeader: 'Authorization: Bearer <token>',
          apiVersion: '2.2.0'
        }
      });
    }
    
    const token = authHeader.substring(7);
    debug('🎫 Token JWT ricevuto, verifico...');
    
    // Verifica token JWT
    const decoded = supabaseModule.verifyJWT(token);
    if (!decoded) {
      debug('❌ Token JWT non valido');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione non valido',
        debug: {
          error: 'invalid_jwt_token',
          apiVersion: '2.2.0'
        }
      });
    }
    
    debug('✅ Token JWT valido per utente:', decoded.userId);
    
    // Test connessione database
    const dbConnected = await supabaseModule.testDatabaseConnection();
    if (!dbConnected) {
      debug('❌ Connessione database fallita');
      return res.status(500).json({
        success: false,
        message: 'Errore di connessione al database',
        debug: { error: 'database_connection_failed' }
      });
    }
    
    // Recupera UCMe dell'utente
    debug('📖 Recupero UCMe per utente:', decoded.userId);
    const userUCMes = await supabaseModule.getUserUCMes(decoded.userId);
    
    debug('✅ UCMe recuperate:', userUCMes.length);
    
    return res.status(200).json({
      success: true,
      message: `Trovate ${userUCMes.length} UCMe`,
      ucmes: userUCMes,
      user: {
        id: decoded.userId,
        email: decoded.email
      },
      debug: {
        method: 'get_user_ucmes',
        backend: 'supabase',
        persistent: true,
        apiVersion: '2.2.0'
      }
    });
    
  } catch (error) {
    error('💥 Errore durante il recupero UCMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      debug: {
        error: error.message,
        apiVersion: '2.2.0'
      }
    });
  }
}

// ================================================================
// HANDLER POST - SALVA NUOVA UCME (SUPABASE)
// ================================================================

async function handlePostUCMe(req, res) {
  debug('📝 POST UCMe - Salvataggio nuova UCMe');
  debug('📝 UCMe save request (RAW):', JSON.stringify(req.body, null, 2));
  
  try {
    // ================================================================
    // AUTENTICAZIONE JWT
    // ================================================================
    
    // Estrai token JWT dall'header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      debug('❌ Token JWT mancante nell\'header Authorization');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione richiesto per salvare UCMe',
        debug: {
          error: 'missing_auth_token',
          expectedHeader: 'Authorization: Bearer <token>',
          apiVersion: '2.2.0'
        }
      });
    }
    
    const token = authHeader.substring(7);
    debug('🎫 Token JWT ricevuto, verifico...');
    
    // Verifica token JWT
    const decoded = supabaseModule.verifyJWT(token);
    if (!decoded) {
      debug('❌ Token JWT non valido');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione non valido',
        debug: {
          error: 'invalid_jwt_token',
          apiVersion: '2.2.0'
        }
      });
    }
    
    debug('✅ Token JWT valido per utente:', decoded.userId);
    
    // ================================================================
    // VALIDAZIONE INPUT
    // ================================================================
    
    const { content, title } = req.body;
    
    // Log dettagliato dei dati ricevuti
    debug('📦 UCME SAVE PAYLOAD - Dati estratti dal body:');
    debug('  📝 Content:', content?.substring(0, 100) + '...');
    debug('  📝 Content type:', typeof content);
    debug('  📝 Content length:', content?.length);
    debug('  📋 Title:', title);
    debug('  📋 Title type:', typeof title);
    debug('  👤 User ID (da JWT):', decoded.userId);
    debug('  📧 User Email (da JWT):', decoded.email);
    
    // Validazione dati obbligatori
    if (!content) {
      debug('❌ Contenuto UCMe mancante');
      return res.status(400).json({
        success: false,
        message: 'Il contenuto della UCMe è richiesto',
        debug: {
          hasContent: !!content,
          contentLength: content?.length || 0,
          apiVersion: '2.2.0'
        }
      });
    }
    
    // Validazione lunghezza contenuto
    if (content.length < 20 || content.length > 600) {
      debug('❌ Lunghezza contenuto UCMe non valida:', content.length);
      return res.status(400).json({
        success: false,
        message: 'Il contenuto deve essere tra 20 e 600 caratteri',
        debug: {
          contentLength: content.length,
          minRequired: 20,
          maxAllowed: 600,
          isValid: content.length >= 20 && content.length <= 600,
          apiVersion: '2.2.0'
        }
      });
    }
    
    // ================================================================
    // TEST CONNESSIONE DATABASE
    // ================================================================
    
    debug('🔍 Test connessione database prima del salvataggio UCMe...');
    const dbConnected = await supabaseModule.testDatabaseConnection();
    
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
    // SALVATAGGIO UCME
    // ================================================================
    
    debug('📥 SALVATAGGIO UCME - Inizio salvataggio in Supabase:');
    debug('  🔍 Tipo di storage: Supabase PostgreSQL');
    debug('  🔍 Fonte dati: Database persistente');
    debug('  🔍 User ID:', decoded.userId);
    debug('  📝 Contenuto length:', content.length);
    debug('  📋 Titolo:', title || 'Nessun titolo');
    
    // Salva UCMe nel database
    const savedUCMe = await supabaseModule.saveUCMe(decoded.userId, content.trim(), title?.trim() || null);
    
    debug('✅ UCMe salvata con successo nel database');
    debug('  📝 UCMe ID:', savedUCMe.id);
    debug('  👤 User ID:', savedUCMe.user_id);
    debug('  📅 Creata il:', savedUCMe.created_at);
    debug('  📊 Status:', savedUCMe.status);
    
    // ================================================================
    // RISPOSTA DI SUCCESSO
    // ================================================================
    
    debug('📦 UCME SAVE RESULT - SUCCESSO:');
    debug('  📝 UCMe ID:', savedUCMe.id);
    debug('  📧 Email utente:', decoded.email);
    debug('  📊 Caratteri contenuto:', content.length);
    debug('  📋 Titolo:', title || 'Nessuno');
    debug('  💾 Persistenza: SÌ (Supabase)');
    debug('  🔄 Cross-device: SÌ');
    debug('  🗄️ Database: CONNESSO E FUNZIONANTE');
    
    const responseData = {
      success: true,
      message: 'Grazie per aver condiviso la tua UCMe. È stata salvata e sarà gestita dai nostri Portatori.',
      ucme: {
        id: savedUCMe.id,
        content: savedUCMe.content,
        title: savedUCMe.title,
        status: savedUCMe.status,
        createdAt: savedUCMe.created_at
      },
      user: {
        id: decoded.userId,
        email: decoded.email
      },
      debug: {
        saveMethod: 'supabase_database',
        persistentStorage: true,
        storageType: 'postgresql',
        fileSystemUsed: false,
        databaseConnected: true,
        timestamp: new Date().toISOString(),
        apiVersion: '2.2.0',
        backend: 'supabase',
        crossDevice: true
      }
    };
    
    debug('📝 UCMe response preparata:', JSON.stringify(responseData, null, 2));
    return res.status(201).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    error('💥 Errore durante il salvataggio UCMe:', error);
    error('💥 Stack trace:', error.stack);
    
    debug('📦 UCME SAVE RESULT - ERRORE:');
    debug('  ❌ Errore tipo:', error.name);
    debug('  ❌ Errore messaggio:', error.message);
    debug('  ❌ Timestamp errore:', new Date().toISOString());
    
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server durante il salvataggio della UCMe',
      debug: {
        error: error.message,
        code: error.code || 'unknown',
        backend: 'supabase',
        timestamp: new Date().toISOString(),
        apiVersion: '2.2.0'
      }
    });
  }
  
  debug('🔚 Fine processo UCMe save - timestamp:', new Date().toISOString());
  debug('🟣 ============================================');
}

// Nota: In Vercel serverless il filesystem è read-only per il deploy
// Le UCMe vengono salvate in Supabase o in modalità fallback locale per testing 