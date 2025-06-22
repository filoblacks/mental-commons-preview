// ================================================================
// MENTAL COMMONS - SUPABASE UTILITY LIBRARY
// ================================================================
// Versione: 1.1.0
// Descrizione: Libreria per operazioni database Supabase
// Fix: Convertito a CommonJS puro per compatibilità Vercel

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require('../logger.js');

// ================================================================
// CONFIGURAZIONE SUPABASE
// ================================================================

// ================================================================
// 🟣 LAZY LOADING - RISOLUZIONE PROBLEMA IMPORT/ENV
// ================================================================
// Il client Supabase viene creato solo quando necessario, 
// dopo che le variabili d'ambiente sono state caricate

let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    // ================================================================
    // 🟣 FASE 1 - VERIFICA CONNESSIONE BACKEND ↔ DATABASE
    // ================================================================
    debug('🟣 ============================================');
    debug('🟣 FASE 1 - VERIFICA CONNESSIONE SUPABASE');
    debug('🟣 ============================================');
    debug("🔑 Supabase URL:", supabaseUrl);
    debug("🔑 Supabase KEY (masked):", supabaseServiceKey ? supabaseServiceKey.slice(0, 10) + '...' + supabaseServiceKey.slice(-5) : 'MANCANTE');
    debug("🔑 URL Type:", typeof supabaseUrl);
    debug("🔑 KEY Type:", typeof supabaseServiceKey);
    debug("🔑 URL Length:", supabaseUrl?.length || 0);
    debug("🔑 KEY Length:", supabaseServiceKey?.length || 0);
    debug("🔍 URL Match Pattern:", supabaseUrl?.includes('supabase.co') ? '✅ VALIDO' : '❌ FORMATO ERRATO');

    if (!supabaseUrl || !supabaseServiceKey) {
      error('❌ ERRORE: Variabili ambiente Supabase mancanti');
      error('   SUPABASE_URL:', supabaseUrl ? '✅ Presente' : '❌ Mancante');
      error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Presente' : '❌ Mancante');
      throw new Error('Variabili ambiente Supabase mancanti');
    }

    // Client Supabase con service key (bypass RLS)
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      }
    });

    // 🟣 FASE 1 - VERIFICA CLIENT SUPABASE CONFIGURAZIONE
    debug("🔍 Client Supabase configurato:");
    debug("  - Auth auto refresh:", false);
    debug("  - Persist session:", false);
    debug("  - Global headers set:", true);
    debug("  - Service key in use:", !!supabaseServiceKey);
  }
  
  return supabase;
}

// ================================================================
// UTILITÀ PASSWORD E JWT
// ================================================================

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'mental-commons-secret-key-change-in-production';

// Hash password con bcrypt
async function hashPassword(password) {
  try {
    debug('🔐 Hashing password...');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    debug('✅ Password hashata con successo');
    return hash;
  } catch (error) {
    error('❌ Errore hashing password:', error);
    throw error;
  }
}

// Verifica password
async function verifyPassword(password, hash) {
  try {
    debug('🔐 Verificando password...');
    const isValid = await bcrypt.compare(password, hash);
    debug('🔐 Password valida:', isValid);
    return isValid;
  } catch (error) {
    error('❌ Errore verifica password:', error);
    throw error;
  }
}

// Genera JWT token
function generateJWT(userId, email) {
  try {
    debug('🎫 Generando JWT per utente:', userId);
    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 giorni
    };
    
    const token = jwt.sign(payload, JWT_SECRET);
    debug('✅ JWT generato con successo (scadenza: 30 giorni)');
    return token;
  } catch (error) {
    error('❌ Errore generazione JWT:', error);
    throw error;
  }
}

// Verifica JWT token
function verifyJWT(token) {
  try {
    debug('🎫 Verificando JWT...');
    const decoded = jwt.verify(token, JWT_SECRET);
    debug('✅ JWT valido per utente:', decoded.userId);
    return decoded;
  } catch (error) {
    error('❌ JWT non valido:', error.message);
    return null;
  }
}

// ================================================================
// OPERAZIONI DATABASE - UTENTI
// ================================================================

// Recupera tutti gli utenti
async function getAllUsers() {
  try {
    debug('👥 Recuperando tutti gli utenti dal database...');
    
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('id, email, name, surname, role, is_active, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) {
      error('❌ Errore recupero utenti:', error);
      throw error;
    }
    
    debug('✅ Recuperati', data?.length || 0, 'utenti');
    return data || [];
  } catch (error) {
    error('❌ Errore recupero tutti gli utenti:', error);
    throw error;
  }
}

// Trova utente per email
async function findUserByEmail(email) {
  try {
    // 🟣 FASE 2 - TRACCIAMENTO COMPLETO API
    debug('🟣 ============================================');
    debug('🟣 FASE 2 - TRACCIAMENTO findUserByEmail');
    debug('🟣 ============================================');
    debug('📥 Input ricevuto:', { email, emailType: typeof email, emailLength: email?.length });
    
    // Query da eseguire
    const queryInfo = {
      table: 'users',
      select: '*',
      filter: { email: email },
      operation: 'SELECT'
    };
    debug('📤 Query generata:', JSON.stringify(queryInfo, null, 2));
    
    debug('👤 Ricerca utente per email:', email);
    
    // Prima prova con .single() per ottenere un solo risultato
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle(); // Usa maybeSingle() invece di single() per evitare errori quando non trova nulla
    
    // Log del risultato completo
    debug('📥 Query result RAW:', { data, error });
    debug('📊 Risultato analisi:'); 
    debug('  - Data presente:', !!data);
    debug('  - Error presente:', !!error);
    debug('  - Error code:', error?.code);
    debug('  - Error message:', error?.message);
    debug('  - Error details:', error?.details);
    
    if (error) {
      debug('⚠ Query error completo:', JSON.stringify(error, null, 2));
      // Con maybeSingle(), non dovremmo avere errori PGRST116
      error('❌ Errore inaspettato nella ricerca utente:', error);
      throw error;
    }
    
    if (data) {
      debug('✅ Utente trovato:', data.id);
      debug('📊 Dati utente trovati:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
      return data;
    } else {
      debug('👤 Utente non trovato per email:', email);
      return null;
    }
  } catch (error) {
    error('❌ Errore ricerca utente completo:', JSON.stringify(error, null, 2));
    
    // Se l'errore è di connessione o configurazione, rilancialo
    // Se è un errore di "not found", restituisci null
    if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
      debug('👤 Utente non trovato (errore catch)');
      return null;
    }
    
    throw error;
  }
}

// Crea nuovo utente
async function createUser(email, password, name, surname = null) {
  try {
    // 🟣 FASE 2 - TRACCIAMENTO COMPLETO API
    debug('🟣 ============================================');
    debug('🟣 FASE 2 - TRACCIAMENTO createUser');
    debug('🟣 ============================================');
    debug('📥 Input ricevuto:', { 
      email, 
      name,
      surname,
      emailType: typeof email, 
      nameType: typeof name,
      surnameType: typeof surname,
      passwordPresent: !!password,
      passwordLength: password?.length 
    });
    
    debug('👤 Creando nuovo utente:', email);
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Dati da inserire
    const insertData = {
      email,
      password_hash: passwordHash,
      name,
      surname: surname || null,
      role: 'user',
      is_active: true
    };
    
    debug('📤 Query INSERT da eseguire:');
    debug('  - Table: users');
    debug('  - Operation: INSERT');
    debug('  - Data:', JSON.stringify({ ...insertData, password_hash: '[HIDDEN]' }, null, 2));
    
    // Inserisci utente
    const { data, error } = await getSupabaseClient()
      .from('users')
      .insert(insertData)
      .select()
      .single();
    
    // Log del risultato completo
    debug('📥 Query INSERT result RAW:', { data: data ? '[USER_DATA]' : null, error });
    debug('📊 Risultato analisi:'); 
    debug('  - Data presente:', !!data);
    debug('  - Error presente:', !!error);
    debug('  - Error code:', error?.code);
    debug('  - Error message:', error?.message);
    debug('  - Error details:', error?.details);
    debug('  - Error hint:', error?.hint);
    
    if (error) {
      error('❌ Errore creazione utente completo:', JSON.stringify(error, null, 2));
      
      // Gestione specifica per errori di duplicazione
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
        error('❌ ERRORE DUPLICAZIONE: Utente con questa email già esiste');
        const duplicateError = new Error('Un account con questa email esiste già');
        duplicateError.code = 'DUPLICATE_EMAIL';
        duplicateError.statusCode = 409;
        throw duplicateError;
      }
      
      throw error;
    }
    
    debug('✅ Utente creato con successo:', data.id);
    debug('📊 Dati utente creato:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
    return data;
  } catch (error) {
    error('❌ Errore creazione utente completo:', JSON.stringify(error, null, 2));
    
    // Rilanciare l'errore così com'è per mantenere le informazioni
    throw error;
  }
}

// Aggiorna ultimo login
async function updateLastLogin(userId) {
  try {
    debug('👤 Aggiornando ultimo login per:', userId);
    
    const { error } = await getSupabaseClient()
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) throw error;
    debug('✅ Ultimo login aggiornato');
  } catch (error) {
    error('❌ Errore aggiornamento login:', error);
    // Non bloccare il login per questo errore
  }
}

// Aggiorna profilo utente (nome e cognome)
async function updateUserProfile(userId, name, surname = null) {
  try {
    debug('👤 Aggiornando profilo utente:', { userId, name, surname: surname || 'NON SPECIFICATO' });
    
    const updateData = {
      name: name.trim(),
      surname: surname ? surname.trim() : null,
      updated_at: new Date().toISOString()
    };
    
    debug('📤 Dati aggiornamento profilo:', JSON.stringify(updateData, null, 2));
    
    const { data, error } = await getSupabaseClient()
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      error('❌ Errore aggiornamento profilo:', error);
      throw error;
    }
    
    debug('✅ Profilo utente aggiornato con successo');
    debug('📊 Dati utente aggiornato:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
    return data;
  } catch (error) {
    error('❌ Errore aggiornamento profilo utente:', error);
    throw error;
  }
}

// ================================================================
// OPERAZIONI DATABASE - UCME
// ================================================================

// Salva nuova UCMe
async function saveUCMe(userId, content, title = null) {
  try {
    debug('📝 Salvando nuova UCMe per utente:', userId);
    debug('📝 Contenuto length:', content?.length);
    debug('📝 Titolo:', title);
    
    // 🟣 FASE 2 - LOGGING PAYLOAD DETTAGLIATO UCMe
    const insertPayload = {
      user_id: userId,
      content,
      title,
      status: 'attesa'
    };
    
    debug('📤 Supabase UCMe insert payload:', insertPayload);
    debug('📤 Query target table: ucmes');
    debug('📤 Query type: INSERT');
    
    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .insert(insertPayload)
      .select()
      .single();
    
    debug('📥 Supabase UCMe insert result:', data);
    debug('⚠ Supabase UCMe insert error:', error);
    
    if (error) {
      error('❌ DETTAGLIO ERRORE SUPABASE UCMe:');
      error('   Codice:', error.code);
      error('   Messaggio:', error.message);
      error('   Dettagli:', error.details);
      error('   Hint:', error.hint);
      throw error;
    }
    
    debug('✅ UCMe salvata con successo:', data.id);
    return data;
  } catch (error) {
    error('❌ Errore salvataggio UCMe:', error);
    throw error;
  }
}

// Recupera UCMe di un utente
async function getUserUCMes(userId) {
  try {
    debug('📝 Recuperando UCMe per utente:', userId);
    
    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      error('❌ Errore recupero UCMe:', error);
      throw error;
    }
    
    debug('✅ UCMe recuperate:', data?.length || 0);
    return data || [];
  } catch (error) {
    error('❌ Errore recupero UCMe:', error);
    throw error;
  }
}

// ================================================================
// OPERAZIONI DATABASE - SESSIONI
// ================================================================

// Salva sessione token
async function saveUserSession(userId, token, deviceInfo = null) {
  try {
    debug('🎫 Salvando sessione per utente:', userId);
    
    // Hash del token per sicurezza
    const tokenHash = await bcrypt.hash(token, 5);
    
    const { data, error } = await getSupabaseClient()
      .from('user_sessions')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 ore
        device_info: deviceInfo
      })
      .select()
      .single();
    
    if (error) throw error;
    
    debug('✅ Sessione salvata:', data.id);
    return data;
  } catch (error) {
    error('❌ Errore salvataggio sessione:', error);
    // Non bloccare il login per questo errore
  }
}

// ================================================================
// UTILITÀ DI DEBUG
// ================================================================

// Test connessione database
async function testDatabaseConnection() {
  try {
    debug('🔍 Test connessione database...');
    
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      error('❌ Connessione database fallita:', error);
      return false;
    }
    
    debug('✅ Connessione database OK');
    return true;
  } catch (error) {
    error('❌ Errore test connessione:', error);
    return false;
  }
}

// Log configurazione
function logConfiguration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  debug('🔧 CONFIGURAZIONE SUPABASE:');
  debug('   URL:', supabaseUrl ? '✅ Configurato' : '❌ Mancante');
  debug('   Service Key:', supabaseServiceKey ? '✅ Configurato' : '❌ Mancante');
  debug('   JWT Secret:', JWT_SECRET !== 'mental-commons-secret-key-change-in-production' ? '✅ Personalizzato' : '⚠️ Default');
}

// ================================================================
// 🟣 FASE 4 - TEST RLS E PERMESSI
// ================================================================

async function testRLSPolicies() {
  try {
    debug('🟣 ============================================');
    debug('🟣 FASE 4 - TEST RLS E PERMESSI');
    debug('🟣 ============================================');
    
    // Test 1: Verifica connessione con service key
    debug('🔍 Test 1: Verifica connessione service key...');
    const { data: testSelect, error: testError } = await getSupabaseClient()
      .from('users')
      .select('*', { count: 'exact' })
      .limit(1);
    
    debug('📊 Service key test result:');
    debug('  - Query eseguita:', 'SELECT count(*) FROM users LIMIT 1');
    debug('  - Dati ricevuti:', !!testSelect);
    debug('  - Errore presente:', !!testError);
    debug('  - Errore dettaglio:', testError ? JSON.stringify(testError, null, 2) : 'Nessuno');
    
    // Test 2: Verifica RLS status sulle tabelle principali
    const tables = ['users', 'ucmes', 'user_sessions'];
    const rlsTests = {};
    
    for (const table of tables) {
      debug(`🔍 Test RLS per tabella: ${table}`);
      const testResult = await checkRLSBlocking(table, 'SELECT');
      rlsTests[table] = testResult;
    }
    
    return {
      serviceKeyWorking: !testError,
      rlsTests,
      errors: {
        serviceKey: testError
      }
    };
  } catch (error) {
    error('❌ Errore test RLS completo:', JSON.stringify(error, null, 2));
    return {
      serviceKeyWorking: false,
      rlsTests: {},
      errors: { general: error }
    };
  }
}

// Funzione helper per verificare se una query è bloccata da RLS
async function checkRLSBlocking(tableName, operation = 'SELECT') {
  try {
    debug(`🔍 Verifica RLS blocking per ${tableName} (${operation})...`);
    
    let query;
    switch (operation.toUpperCase()) {
      case 'SELECT':
        query = getSupabaseClient().from(tableName).select('*').limit(1);
        break;
      case 'COUNT':
        query = getSupabaseClient().from(tableName).select('*', { count: 'exact' }).limit(0);
        break;
      default:
        query = getSupabaseClient().from(tableName).select('*').limit(1);
    }
    
    const { data, error } = await query;
    
    const isBlocked = error && (
      error.message?.includes('row-level security') ||
      error.message?.includes('permission denied') ||
      error.message?.includes('policy') ||
      error.code === '42501' ||
      error.code === 'PGRST301'
    );
    
    debug(`📊 RLS Check ${tableName}:${operation}:`);
    debug('  - Query eseguita:', !!data || !!error);
    debug('  - Bloccata da RLS:', isBlocked);
    debug('  - Errore RLS:', isBlocked ? error.message : 'No');
    debug('  - Dati ricevuti:', !!data);
    debug('  - Errore completo:', error ? JSON.stringify(error, null, 2) : 'Nessuno');
    
    return {
      table: tableName,
      operation,
      blocked: isBlocked,
      error: error,
      hasData: !!data
    };
  } catch (error) {
    error(`❌ Errore check RLS per ${tableName}:`, error);
    return {
      table: tableName,
      operation,
      blocked: true,
      error: error,
      hasData: false
    };
  }
}

// ================================================================
// ESPORTAZIONI COMMONJS
// ================================================================

module.exports = {
  // Utilità client e configurazione
  getSupabaseClient,
  logConfiguration,
  
  // Utilità password e JWT
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  
  // Operazioni utenti
  getAllUsers,
  findUserByEmail,
  createUser,
  updateLastLogin,
  updateUserProfile,
  
  // Operazioni UCMe
  saveUCMe,
  getUserUCMes,
  
  // Operazioni sessioni
  saveUserSession,
  
  // Utilità debug e test
  testDatabaseConnection,
  testRLSPolicies,
  checkRLSBlocking
}; 