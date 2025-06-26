// ================================================================
// MENTAL COMMONS - SUPABASE UTILITY LIBRARY
// ================================================================
// Versione: 1.1.0
// Descrizione: Libreria per operazioni database Supabase
// Fix: Convertito a CommonJS puro per compatibilità Vercel

// ================================================================
// 🟣 LAZY LOADING - RISOLUZIONE PROBLEMA IMPORT/ENV
// ================================================================
// Il client Supabase viene creato solo quando necessario, 
// dopo che le variabili d'ambiente sono state caricate

let supabase = null;

// Import dipendenze
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require('../logger.js');

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
      },
      db: {
        schema: 'public'
      },
      realtime: {
        enabled: false
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
// UTILITÀ TIMEOUT E GESTIONE ERRORI
// ================================================================

// Wrapper per aggiungere timeout alle operazioni database
async function withTimeout(promise, timeoutMs = 8000, operation = 'Database operation') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.error(`⏰ Timeout: ${operation} took longer than ${timeoutMs}ms`);
    }
    throw error;
  }
}

// ================================================================
// UTILITÀ PASSWORD E JWT
// ================================================================

const SALT_ROUNDS = 10;

// 🔐 SICUREZZA CRITICA: Controlla JWT_SECRET all'avvio
function validateJWTSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('🚨 SECURITY ERROR: JWT_SECRET environment variable is required but not set');
  }
  
  if (jwtSecret === 'mental-commons-secret-key-change-in-production') {
    throw new Error('🚨 SECURITY ERROR: JWT_SECRET is still using default value. Change it immediately in production');
  }
  
  if (jwtSecret.length < 32) {
    throw new Error('🚨 SECURITY ERROR: JWT_SECRET must be at least 32 characters long for security');
  }
  
  return jwtSecret;
}

// Ottieni JWT_SECRET con validazione
function getJWTSecret() {
  try {
    return validateJWTSecret();
  } catch (error) {
    error('❌ JWT Secret validation failed:', error.message);
    process.exit(1); // Blocca l'avvio se il JWT_SECRET non è sicuro
  }
}

const JWT_SECRET = getJWTSecret();

// Hash password con bcrypt
async function hashPassword(password) {
  try {
    debug('🔐 Hashing password...');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    debug('✅ Password hashata con successo');
    return hash;
  } catch (err) {
    error('❌ Errore hashing password:', err);
    throw err;
  }
}

// Verifica password
async function verifyPassword(password, hash) {
  try {
    debug('🔐 Verificando password...');
    const isValid = await bcrypt.compare(password, hash);
    debug('🔐 Password valida:', isValid);
    return isValid;
  } catch (err) {
    error('❌ Errore verifica password:', err);
    throw err;
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
  } catch (err) {
    error('❌ Errore generazione JWT:', err);
    throw err;
  }
}

// Verifica JWT token
function verifyJWT(token) {
  try {
    debug('🎫 Verificando JWT...');
    const decoded = jwt.verify(token, JWT_SECRET);
    debug('✅ JWT valido per utente:', decoded.userId);
    return decoded;
  } catch (err) {
    error('❌ JWT non valido:', err.message);
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
      error('❌ Errore recupero utenti:', err);
      throw err;
    }
    
    debug('✅ Recuperati', data?.length || 0, 'utenti');
    return data || [];
  } catch (err) {
    error('❌ Errore recupero tutti gli utenti:', err);
    throw err;
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
    
    // Prima prova con .single() per ottenere un solo risultato con timeout
    const { data, error } = await withTimeout(
      getSupabaseClient()
        .from('users')
        .select('*')
        .eq('email', email)
        .single(),
      5000,
      'Find user by email'
    );
    
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
      // Con single(), non dovremmo avere errori PGRST116
      error('❌ Errore inaspettato nella ricerca utente:', err);
      throw err;
    }
    
    if (data) {
      debug('✅ Utente trovato:', data.id);
      debug('📊 Dati utente trovati:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
      return data;
    } else {
      debug('👤 Utente non trovato per email:', email);
      return null;
    }
  } catch (err) {
    error('❌ Errore ricerca utente completo:', JSON.stringify(error, null, 2));
    
    // Se l'errore è di connessione o configurazione, rilancialo
    // Se è un errore di "not found", restituisci null
    if (err.code === 'PGRST116' || err.message?.includes('No rows')) {
      debug('👤 Utente non trovato (errore catch)');
      return null;
    }
    
    throw err;
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
      is_active: true,
      is_admin: false
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
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('already exists')) {
        error('❌ ERRORE DUPLICAZIONE: Utente con questa email già esiste');
        const duplicateError = new Error('Un account con questa email esiste già');
        duplicateError.code = 'DUPLICATE_EMAIL';
        duplicateError.statusCode = 409;
        throw duplicateError;
      }
      
      throw err;
    }
    
    debug('✅ Utente creato con successo:', data.id);
    debug('📊 Dati utente creato:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
    return data;
  } catch (err) {
    error('❌ Errore creazione utente completo:', JSON.stringify(error, null, 2));
    
    // Rilanciare l'errore così com'è per mantenere le informazioni
    throw err;
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
  } catch (err) {
    error('❌ Errore aggiornamento login:', err);
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
      error('❌ Errore aggiornamento profilo:', err);
      throw err;
    }
    
    debug('✅ Profilo utente aggiornato con successo');
    debug('📊 Dati utente aggiornato:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
    return data;
  } catch (err) {
    error('❌ Errore aggiornamento profilo utente:', err);
    throw err;
  }
}

// ================================================================
// OPERAZIONI DATABASE - UCME
// ================================================================

// Salva nuova UCMe (autenticata)
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
  } catch (err) {
    error('❌ Errore salvataggio UCMe:', err);
    throw err;
  }
}

// Salva nuova UCMe anonima
async function saveAnonymousUCMe(email, content, title = null) {
  try {
    debug('👤 Salvando nuova UCMe anonima per email:', email);
    debug('📝 Contenuto length:', content?.length);
    debug('📝 Titolo:', title);
    
    const insertPayload = {
      user_id: null, // NULL per UCMe anonime
      anonymous_email: email, // Email per ricevere la risposta
      content,
      title,
      status: 'attesa',
      is_anonymous: true
    };
    
    debug('📤 Supabase UCMe anonima insert payload:', insertPayload);
    debug('📤 Query target table: ucmes');
    debug('📤 Query type: INSERT ANONYMOUS');
    
    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .insert(insertPayload)
      .select()
      .single();
    
    debug('📥 Supabase UCMe anonima insert result:', data);
    debug('⚠ Supabase UCMe anonima insert error:', error);
    
    if (error) {
      error('❌ DETTAGLIO ERRORE SUPABASE UCMe ANONIMA:');
      error('   Codice:', error.code);
      error('   Messaggio:', error.message);
      error('   Dettagli:', error.details);
      error('   Hint:', error.hint);
      throw error;
    }
    
    debug('✅ UCMe anonima salvata con successo:', data.id);
    return data;
  } catch (err) {
    error('❌ Errore salvataggio UCMe anonima:', err);
    throw err;
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
  } catch (err) {
    error('❌ Errore recupero UCMe:', err);
    throw err;
  }
}

// Aggiorna UCMe esistente
async function updateUCMe(ucmeId, userId, updateData) {
  try {
    debug('🔄 Aggiornando UCMe:', { ucmeId, userId });
    debug('📝 Dati aggiornamento:', updateData);
    
    // Crea payload di aggiornamento sicuro
    const updatePayload = {};
    
    // Solo questi campi sono aggiornabili
    if (updateData.content !== undefined) {
      updatePayload.content = updateData.content;
    }
    if (updateData.title !== undefined) {
      updatePayload.title = updateData.title;
    }
    if (updateData.status !== undefined) {
      updatePayload.status = updateData.status;
    }
    
    // Aggiorna solo se appartiene all'utente
    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .update(updatePayload)
      .eq('id', ucmeId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      error('❌ Errore aggiornamento UCMe:', error);
      throw error;
    }
    
    debug('✅ UCMe aggiornata con successo:', data?.id);
    return data;
  } catch (err) {
    error('❌ Errore aggiornamento UCMe:', err);
    throw err;
  }
}

// Elimina UCMe
async function deleteUCMe(ucmeId, userId) {
  try {
    debug('🗑️ Eliminando UCMe:', { ucmeId, userId });
    
    // Elimina solo se appartiene all'utente
    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .delete()
      .eq('id', ucmeId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      error('❌ Errore eliminazione UCMe:', error);
      throw error;
    }
    
    debug('✅ UCMe eliminata con successo:', data?.id);
    return data;
  } catch (err) {
    error('❌ Errore eliminazione UCMe:', err);
    throw err;
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
  } catch (err) {
    error('❌ Errore salvataggio sessione:', err);
    // Non bloccare il login per questo errore
  }
}

// ================================================================
// UTILITÀ DI DEBUG
// ================================================================

// Test connessione database con timeout
async function testDatabaseConnection() {
  try {
    debug('🔍 Test connessione database con timeout...');
    
    // Implementiamo un timeout manuale di 5 secondi
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout after 5 seconds')), 5000);
    });
    
    const queryPromise = getSupabaseClient()
      .from('users')
      .select('count')
      .limit(1);
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    
    if (error) {
      console.error('❌ Connessione database fallita:', error);
      return false;
    }
    
    debug('✅ Connessione database OK');
    return true;
  } catch (err) {
    console.error('❌ Errore test connessione:', err);
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
  } catch (err) {
    error('❌ Errore test RLS completo:', JSON.stringify(err, null, 2));
    return {
      serviceKeyWorking: false,
      rlsTests: {},
      errors: { general: err }
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
      err.message?.includes('row-level security') ||
      err.message?.includes('permission denied') ||
      err.message?.includes('policy') ||
      err.code === '42501' ||
      err.code === 'PGRST301'
    );
    
    debug(`📊 RLS Check ${tableName}:${operation}:`);
    debug('  - Query eseguita:', !!data || !!error);
    debug('  - Bloccata da RLS:', isBlocked);
    debug('  - Errore RLS:', isBlocked ? err.message : 'No');
    debug('  - Dati ricevuti:', !!data);
    debug('  - Errore completo:', error ? JSON.stringify(error, null, 2) : 'Nessuno');
    
    return {
      table: tableName,
      operation,
      blocked: isBlocked,
      error: error,
      hasData: !!data
    };
  } catch (err) {
    error(`❌ Errore check RLS per ${tableName}:`, err);
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
// OPERAZIONI DATABASE - PORTATORI (SPRINT-4)
// ================================================================

// Registra o aggiorna un Portatore
async function registerPortatore(userId, bio) {
  try {
    debug('🤝 Registrazione/aggiornamento Portatore…', { userId, bioLen: bio?.length });

    if (typeof bio !== 'string' || bio.trim().length === 0) {
      throw new Error('Bio obbligatoria');
    }
    const sanitizedBio = require('./validation.js').sanitizeString(bio.trim()).slice(0, 300);

    // Verifica se esiste già
    const { data: existing, error: searchErr } = await getSupabaseClient()
      .from('portatori')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (searchErr && searchErr.code !== 'PGRST116' && searchErr.code !== '406') {
      throw searchErr;
    }

    let opRes;
    if (existing && existing.id) {
      // Update
      const { data, error } = await getSupabaseClient()
        .from('portatori')
        .update({ bio: sanitizedBio, attivo: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      opRes = data;
    } else {
      // Insert
      const { data, error } = await getSupabaseClient()
        .from('portatori')
        .insert({ user_id: userId, bio: sanitizedBio, attivo: true })
        .select()
        .single();
      if (error) throw error;
      opRes = data;
    }

    // Assicura flag utente
    await getSupabaseClient().from('users').update({ is_portatore: true }).eq('id', userId);

    debug('✅ Portatore registrato/aggiornato', opRes.id);
    return opRes;
  } catch (err) {
    error('❌ Errore registerPortatore:', err);
    throw err;
  }
}

// Recupera stato Portatore per un utente
async function getPortatoreStatus(userId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('portatori')
      .select('bio')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116' && error.code !== '406') throw error;

    return {
      is_portatore: !!data,
      bio: data ? data.bio : null,
    };
  } catch (err) {
    error('❌ Errore getPortatoreStatus:', err);
    throw err;
  }
}

// Revoca stato Portatore
async function revokePortatore(userId) {
  try {
    debug('🗑️ Revoca Portatore per', userId);

    const { error } = await getSupabaseClient().from('portatori').delete().eq('user_id', userId);
    if (error && error.code !== 'PGRST116' && error.code !== '406') throw error;

    // Aggiorna flag utente
    await getSupabaseClient().from('users').update({ is_portatore: false }).eq('id', userId);

    debug('✅ Candidatura Portatore revocata');
    return { revoked: true };
  } catch (err) {
    error('❌ Errore revokePortatore:', err);
    throw err;
  }
}

// ================================================================
// OPERAZIONI DATABASE - ADMIN (FASE 2 – ASSEGNA MANUALE)
// ================================================================

// Recupera tutte le UCMe pendenti (senza portatore)
async function getPendingUCMes() {
  try {
    debug('📋 Recupero UCMe pendenti per assegnazione manuale');

    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .select(`
        id,
        content,
        title,
        created_at,
        user:user_id(id, name, email)
      `)
      .is('portatore_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    debug('✅ UCMe pendenti recuperate:', data?.length || 0);
    return data || [];
  } catch (err) {
    error('❌ Errore getPendingUCMes:', err);
    throw err;
  }
}

// Recupera elenco Portatori attivi (user + bio)
async function getActivePortatori() {
  try {
    debug('📋 Recupero Portatori attivi');

    const { data, error } = await getSupabaseClient()
      .from('portatori')
      .select(`id, bio, attivo, user:users(id, name, email)`) // Usando supabase join implicita
      .eq('attivo', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    debug('✅ Portatori attivi recuperati:', data?.length || 0);
    return data || [];
  } catch (err) {
    error('❌ Errore getActivePortatori:', err);
    throw err;
  }
}

// Assegna manualmente una UCMe a un Portatore
async function assignUcmeToPortatore(ucmeId, portatoreId) {
  try {
    debug('🤝 Assegnazione UCMe → Portatore', { ucmeId, portatoreId });

    // 1. Verifica UCMe esiste ed è ancora pendente
    const { data: ucme, error: ucmeErr } = await getSupabaseClient()
      .from('ucmes')
      .select('*')
      .eq('id', ucmeId)
      .single();
    if (ucmeErr) throw ucmeErr;
    if (!ucme) throw new Error('UCMe non trovata');
    if (ucme.portatore_id) throw new Error('UCMe già assegnata');

    // 2. Verifica Portatore attivo
    const { data: portatore, error: portatoreErr } = await getSupabaseClient()
      .from('portatori')
      .select('id, attivo')
      .eq('id', portatoreId)
      .eq('attivo', true)
      .single();
    if (portatoreErr) throw portatoreErr;
    if (!portatore) throw new Error('Portatore non trovato o non attivo');

    // 3. Update UCMe
    const { data: updated, error: updErr } = await getSupabaseClient()
      .from('ucmes')
      .update({ portatore_id: portatoreId, status: 'assegnata' })
      .eq('id', ucmeId)
      .select()
      .single();

    if (updErr) throw updErr;

    debug('✅ UCMe assegnata con successo');
    return updated;
  } catch (err) {
    error('❌ Errore assignUcmeToPortatore:', err);
    throw err;
  }
}

// ================================================================
// OPERAZIONI PORTATORE – UCMe assegnate (FASE 3)
// ================================================================

// Recupera UCMe assegnate a un Portatore (utente corrente)
async function getAssignedUCMesForPortatore(userId) {
  try {
    debug('📥 Recupero UCMe assegnate per portatore user_id:', userId);

    // 1. Trova l'id del portatore collegato all'utente
    const { data: portatoreRow, error: portatoreErr } = await getSupabaseClient()
      .from('portatori')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (portatoreErr && portatoreErr.code !== 'PGRST116' && portatoreErr.code !== '406') {
      throw portatoreErr;
    }
    if (!portatoreRow) {
      // Utente non è portatore (nessuna riga). Restituisci array vuoto per coerenza.
      return [];
    }

    const portatoreId = portatoreRow.id;

    // 2. Recupera le UCMe con portatore_id = portatoreId
    const { data: ucmes, error: ucmeErr } = await getSupabaseClient()
      .from('ucmes')
      .select('id, content, created_at, status')
      .eq('portatore_id', portatoreId)
      .order('created_at', { ascending: true });

    if (ucmeErr) throw ucmeErr;

    debug('✅ UCMe assegnate recuperate:', ucmes?.length || 0);
    return ucmes || [];
  } catch (err) {
    error('❌ Errore getAssignedUCMesForPortatore:', err);
    throw err;
  }
}

// Aggiorna lo status di una UCMe (solo se appartiene al portatore)
async function updateUcmeStatusByPortatore(ucmeId, userId, newStatus) {
  try {
    debug('🔄 Aggiornamento status UCMe da portatore', { ucmeId, userId, newStatus });

    const ALLOWED_STATUS = ['ricevuta', 'in lavorazione', 'completata', 'richiesta supporto'];
    if (!ALLOWED_STATUS.includes(newStatus)) {
      throw new Error('Status non valido');
    }

    // Identifica portatore id
    const { data: portatoreRow, error: portatoreErr } = await getSupabaseClient()
      .from('portatori')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (portatoreErr) throw portatoreErr;
    if (!portatoreRow) throw new Error('Utente non è un Portatore');

    const portatoreId = portatoreRow.id;

    // Verifica che UCMe appartenga al portatore
    const { data: ucmeRow, error: ucmeFetchErr } = await getSupabaseClient()
      .from('ucmes')
      .select('id, portatore_id')
      .eq('id', ucmeId)
      .single();

    if (ucmeFetchErr) throw ucmeFetchErr;
    if (!ucmeRow || ucmeRow.portatore_id !== portatoreId) {
      throw new Error('UCMe non appartiene a questo Portatore');
    }

    // Aggiorna status
    const { data: updated, error: updErr } = await getSupabaseClient()
      .from('ucmes')
      .update({ status: newStatus })
      .eq('id', ucmeId)
      .select()
      .single();

    if (updErr) throw updErr;

    debug('✅ Status UCMe aggiornato con successo');
    return updated;
  } catch (err) {
    error('❌ Errore updateUcmeStatusByPortatore:', err);
    throw err;
  }
}

// ================================================================
// NUOVA FUNZIONE – Salvataggio risposta UCMe (FASE 4)
// ================================================================
async function respondToUcme(ucmeId, userId, contenutoRisposta) {
  try {
    debug('📝 Salvataggio risposta UCMe', { ucmeId, userId });

    if (!contenutoRisposta || typeof contenutoRisposta !== 'string' || !contenutoRisposta.trim()) {
      throw new Error('Contenuto risposta mancante');
    }
    if (contenutoRisposta.length > 3000) {
      throw new Error('La risposta supera i 3000 caratteri');
    }

    // 1. Ricava id portatore dall'utente
    const { data: portatoreRow, error: portatoreErr } = await getSupabaseClient()
      .from('portatori')
      .select('id')
      .eq('user_id', userId)
      .eq('attivo', true)
      .single();

    if (portatoreErr) throw portatoreErr;
    if (!portatoreRow) throw new Error('Utente non è un Portatore attivo');

    const portatoreId = portatoreRow.id;

    // 2. Verifica che la UCMe appartenga al portatore
    const { data: ucmeRow, error: ucmeErr } = await getSupabaseClient()
      .from('ucmes')
      .select('id, portatore_id, status')
      .eq('id', ucmeId)
      .single();

    if (ucmeErr) throw ucmeErr;
    if (!ucmeRow) throw new Error('UCMe non trovata');
    if (ucmeRow.portatore_id !== portatoreId) {
      throw new Error('UCMe non assegnata a questo Portatore');
    }

    // 3. Verifica che non esista già una risposta per questa UCMe da questo portatore
    const { data: existingResp, error: existErr } = await getSupabaseClient()
      .from('risposte')
      .select('id')
      .eq('ucme_id', ucmeId)
      .eq('portatore_id', portatoreId)
      .maybeSingle();

    if (existErr) throw existErr;
    if (existingResp) {
      throw new Error('Risposta già inviata per questa UCMe');
    }

    // 4. Inserisci la risposta
    const { data: inserted, error: insertErr } = await getSupabaseClient()
      .from('risposte')
      .insert({ ucme_id: ucmeId, portatore_id: portatoreId, testo: contenutoRisposta })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 5. Aggiorna status UCMe → "risposta inviata"
    const { error: updStatusErr } = await getSupabaseClient()
      .from('ucmes')
      .update({ status: 'risposta inviata' })
      .eq('id', ucmeId);

    if (updStatusErr) throw updStatusErr;

    debug('✅ Risposta salvata e status UCMe aggiornato');
    return inserted;
  } catch (err) {
    error('❌ Errore respondToUcme:', err);
    throw err;
  }
}

// === NUOVA FUNZIONE – UCMe con Risposte (FASE 5) ===
async function getUserUCMesWithResponses(userId) {
  try {
    debug('📝 Recuperando UCMe + Risposte per utente:', userId);

    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .select(`
        id,
        content,
        title,
        status,
        created_at,
        risposte:risposte (
          id,
          testo,
          created_at,
          letto_da_utente
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      error('❌ Errore recupero UCMe con risposte:', error);
      throw error;
    }

    // Mappa il risultato per restituire un oggetto "risposta" semplificato
    const mapped = (data || []).map((row) => {
      const rispostaRow = Array.isArray(row.risposte) && row.risposte.length > 0 ? row.risposte[0] : null;
      return {
        id: row.id,
        content: row.content,
        title: row.title,
        status: row.status,
        created_at: row.created_at,
        risposta: rispostaRow
          ? {
              contenuto: rispostaRow.testo,
              timestamp: rispostaRow.created_at,
              letta: rispostaRow.letto_da_utente === true
            }
          : null
      };
    });

    return mapped;
  } catch (err) {
    error('❌ Errore getUserUCMesWithResponses:', err);
    throw err;
  }
}

// === NUOVA FUNZIONE – Segna Risposta come Letta (FASE 5) ===
async function markUcmeResponseAsRead(ucmeId, userId) {
  try {
    debug('📖 Segnando risposta come letta', { ucmeId, userId });

    // Verifica che la UCMe appartenga all'utente
    const { data: ucmeRow, error: ucmeErr } = await getSupabaseClient()
      .from('ucmes')
      .select('id')
      .eq('id', ucmeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (ucmeErr) throw ucmeErr;
    if (!ucmeRow) {
      throw new Error('UCMe non trovata o non appartiene all\'utente');
    }

    // Aggiorna la riga nella tabella risposte
    const { data, error } = await getSupabaseClient()
      .from('risposte')
      .update({ letto_da_utente: true })
      .eq('ucme_id', ucmeId)
      .select()
      .single();

    if (error) throw error;

    debug('✅ Risposta marcata come letta');
    return data;
  } catch (err) {
    error('❌ Errore markUcmeResponseAsRead:', err);
    throw err;
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
  saveAnonymousUCMe,
  getUserUCMes,
  getUserUCMesWithResponses,
  updateUCMe,
  deleteUCMe,
  markUcmeResponseAsRead,
  
  // Operazioni sessioni
  saveUserSession,
  
  // Utilità debug e test
  testDatabaseConnection,
  testRLSPolicies,
  checkRLSBlocking,
  
  // Operazioni Portatori
  registerPortatore,
  getPortatoreStatus,
  revokePortatore,
  
  // Admin
  getPendingUCMes,
  getActivePortatori,
  assignUcmeToPortatore,
  getAssignedUCMesForPortatore,
  updateUcmeStatusByPortatore,
  respondToUcme
}; 