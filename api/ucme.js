// ================================================================
// MENTAL COMMONS - UCME API CON SUPABASE
// ================================================================
// Versione: 2.0.0
// Descrizione: API UCMe con backend persistente Supabase e autenticazione JWT

import { 
  saveUCMe, 
  getUserUCMes, 
  verifyJWT,
  testDatabaseConnection,
  logConfiguration
} from './supabase.js';

export default async function handler(req, res) {
  // ================================================================
  // LOGGING INIZIALE E CONFIGURAZIONE
  // ================================================================
  
  console.log('🟣 ============================================');
  console.log('🟣 MENTAL COMMONS - UCME API v2.0 SUPABASE');
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
  
  // ================================================================
  // GESTIONE METODI HTTP
  // ================================================================
  
  if (req.method === 'GET') {
    // GET: Recupera UCMe dell'utente
    return await handleGetUCMes(req, res);
  } else if (req.method === 'POST') {
    // POST: Salva nuova UCMe
    return await handlePostUCMe(req, res);
  } else {
    console.log('❌ Metodo non valido:', req.method);
    return res.status(405).json({
      success: false,
      message: 'Metodo non consentito. Utilizzare GET o POST.',
      debug: {
        receivedMethod: req.method,
        allowedMethods: ['GET', 'POST'],
        apiVersion: '2.0.0',
        backend: 'supabase'
      }
    });
  }
}

// ================================================================
// HANDLER GET - RECUPERA UCME UTENTE
// ================================================================

async function handleGetUCMes(req, res) {
  console.log('📖 GET UCMe - Recupero UCMe dell\'utente');
  
  try {
    // Estrai token JWT dall'header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token JWT mancante nell\'header Authorization');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione richiesto',
        debug: {
          error: 'missing_auth_token',
          expectedHeader: 'Authorization: Bearer <token>',
          apiVersion: '2.0.0'
        }
      });
    }
    
    const token = authHeader.substring(7);
    console.log('🎫 Token JWT ricevuto, verifico...');
    
    // Verifica token JWT
    const decoded = verifyJWT(token);
    if (!decoded) {
      console.log('❌ Token JWT non valido');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione non valido',
        debug: {
          error: 'invalid_jwt_token',
          apiVersion: '2.0.0'
        }
      });
    }
    
    console.log('✅ Token JWT valido per utente:', decoded.userId);
    
    // Test connessione database
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.log('❌ Connessione database fallita');
      return res.status(500).json({
        success: false,
        message: 'Errore di connessione al database',
        debug: { error: 'database_connection_failed' }
      });
    }
    
    // Recupera UCMe dell'utente
    console.log('📖 Recupero UCMe per utente:', decoded.userId);
    const userUCMes = await getUserUCMes(decoded.userId);
    
    console.log('✅ UCMe recuperate:', userUCMes.length);
    
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
        apiVersion: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('💥 Errore durante il recupero UCMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      debug: {
        error: error.message,
        apiVersion: '2.0.0'
      }
    });
  }
}

// ================================================================
// HANDLER POST - SALVA NUOVA UCME
// ================================================================

async function handlePostUCMe(req, res) {
  console.log('📝 POST UCMe - Salvataggio nuova UCMe');
  console.log('📝 UCMe save request (RAW):', JSON.stringify(req.body, null, 2));
  
  try {
    // ================================================================
    // AUTENTICAZIONE JWT
    // ================================================================
    
    // Estrai token JWT dall'header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token JWT mancante nell\'header Authorization');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione richiesto per salvare UCMe',
        debug: {
          error: 'missing_auth_token',
          expectedHeader: 'Authorization: Bearer <token>',
          apiVersion: '2.0.0'
        }
      });
    }
    
    const token = authHeader.substring(7);
    console.log('🎫 Token JWT ricevuto, verifico...');
    
    // Verifica token JWT
    const decoded = verifyJWT(token);
    if (!decoded) {
      console.log('❌ Token JWT non valido');
      return res.status(401).json({
        success: false,
        message: 'Token di autenticazione non valido',
        debug: {
          error: 'invalid_jwt_token',
          apiVersion: '2.0.0'
        }
      });
    }
    
    console.log('✅ Token JWT valido per utente:', decoded.userId);
    
    // ================================================================
    // VALIDAZIONE INPUT
    // ================================================================
    
    const { content, title } = req.body;
    
    // Log dettagliato dei dati ricevuti
    console.log('📦 UCME SAVE PAYLOAD - Dati estratti dal body:');
    console.log('  📝 Content:', content?.substring(0, 100) + '...');
    console.log('  📝 Content type:', typeof content);
    console.log('  📝 Content length:', content?.length);
    console.log('  📋 Title:', title);
    console.log('  📋 Title type:', typeof title);
    console.log('  👤 User ID (da JWT):', decoded.userId);
    console.log('  📧 User Email (da JWT):', decoded.email);
    
    // Validazione dati obbligatori
    if (!content) {
      console.log('❌ Contenuto UCMe mancante');
      return res.status(400).json({
        success: false,
        message: 'Il contenuto della UCMe è richiesto',
        debug: {
          hasContent: !!content,
          contentLength: content?.length || 0,
          apiVersion: '2.0.0'
        }
      });
    }
    
    // Validazione lunghezza contenuto
    if (content.length < 20 || content.length > 600) {
      console.log('❌ Lunghezza contenuto UCMe non valida:', content.length);
      return res.status(400).json({
        success: false,
        message: 'Il contenuto deve essere tra 20 e 600 caratteri',
        debug: {
          contentLength: content.length,
          minRequired: 20,
          maxAllowed: 600,
          isValid: content.length >= 20 && content.length <= 600,
          apiVersion: '2.0.0'
        }
      });
    }
    
    // ================================================================
    // TEST CONNESSIONE DATABASE
    // ================================================================
    
    console.log('🔍 Test connessione database prima del salvataggio UCMe...');
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
    // SALVATAGGIO UCME
    // ================================================================
    
    console.log('📥 SALVATAGGIO UCME - Inizio salvataggio in Supabase:');
    console.log('  🔍 Tipo di storage: Supabase PostgreSQL');
    console.log('  🔍 Fonte dati: Database persistente');
    console.log('  🔍 User ID:', decoded.userId);
    console.log('  📝 Contenuto length:', content.length);
    console.log('  📋 Titolo:', title || 'Nessun titolo');
    
    // Salva UCMe nel database
    const savedUCMe = await saveUCMe(decoded.userId, content.trim(), title?.trim() || null);
    
    console.log('✅ UCMe salvata con successo nel database');
    console.log('  📝 UCMe ID:', savedUCMe.id);
    console.log('  👤 User ID:', savedUCMe.user_id);
    console.log('  📅 Creata il:', savedUCMe.created_at);
    console.log('  📊 Status:', savedUCMe.status);
    
    // ================================================================
    // RISPOSTA DI SUCCESSO
    // ================================================================
    
    console.log('📦 UCME SAVE RESULT - SUCCESSO:');
    console.log('  📝 UCMe ID:', savedUCMe.id);
    console.log('  📧 Email utente:', decoded.email);
    console.log('  📊 Caratteri contenuto:', content.length);
    console.log('  📋 Titolo:', title || 'Nessuno');
    console.log('  💾 Persistenza: SÌ (Supabase)');
    console.log('  🔄 Cross-device: SÌ');
    console.log('  🗄️ Database: CONNESSO E FUNZIONANTE');
    
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
        apiVersion: '2.0.0',
        backend: 'supabase',
        crossDevice: true
      }
    };
    
    console.log('📝 UCMe response preparata:', JSON.stringify(responseData, null, 2));
    res.status(201).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    console.error('💥 Errore durante il salvataggio UCMe:', error);
    console.error('💥 Stack trace:', error.stack);
    
    console.log('📦 UCME SAVE RESULT - ERRORE:');
    console.log('  ❌ Errore tipo:', error.name);
    console.log('  ❌ Errore messaggio:', error.message);
    console.log('  ❌ Timestamp errore:', new Date().toISOString());
    
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server durante il salvataggio della UCMe',
      debug: {
        error: error.message,
        code: error.code || 'unknown',
        backend: 'supabase',
        timestamp: new Date().toISOString(),
        apiVersion: '2.0.0'
      }
    });
  }
  
  console.log('🔚 Fine processo UCMe save - timestamp:', new Date().toISOString());
  console.log('🟣 ============================================');
}

// Nota: In Vercel serverless il filesystem è read-only
// Le UCMe vengono loggate e possono essere salvate in database in futuro 