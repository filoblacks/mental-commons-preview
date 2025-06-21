// ================================================================
// MENTAL COMMONS - SUPABASE UTILITY LIBRARY
// ================================================================
// Versione: 1.0.0
// Descrizione: Libreria per operazioni database Supabase

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
    console.log('🟣 ============================================');
    console.log('🟣 FASE 1 - VERIFICA CONNESSIONE SUPABASE');
    console.log('🟣 ============================================');
    console.log("🔑 Supabase URL:", supabaseUrl);
    console.log("🔑 Supabase KEY (masked):", supabaseServiceKey ? supabaseServiceKey.slice(0, 10) + '...' + supabaseServiceKey.slice(-5) : 'MANCANTE');
    console.log("🔑 URL Type:", typeof supabaseUrl);
    console.log("🔑 KEY Type:", typeof supabaseServiceKey);
    console.log("🔑 URL Length:", supabaseUrl?.length || 0);
    console.log("🔑 KEY Length:", supabaseServiceKey?.length || 0);
    console.log("🔍 URL Match Pattern:", supabaseUrl?.includes('supabase.co') ? '✅ VALIDO' : '❌ FORMATO ERRATO');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ ERRORE: Variabili ambiente Supabase mancanti');
      console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Presente' : '❌ Mancante');
      console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Presente' : '❌ Mancante');
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
    console.log("🔍 Client Supabase configurato:");
    console.log("  - Auth auto refresh:", false);
    console.log("  - Persist session:", false);
    console.log("  - Global headers set:", true);
    console.log("  - Service key in use:", !!supabaseServiceKey);
  }
  
  return supabase;
}

// ================================================================
// UTILITÀ PASSWORD E JWT
// ================================================================

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'mental-commons-secret-key-change-in-production';

// Hash password con bcrypt
export async function hashPassword(password) {
  try {
    console.log('🔐 Hashing password...');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('✅ Password hashata con successo');
    return hash;
  } catch (error) {
    console.error('❌ Errore hashing password:', error);
    throw error;
  }
}

// Verifica password
export async function verifyPassword(password, hash) {
  try {
    console.log('🔐 Verificando password...');
    const isValid = await bcrypt.compare(password, hash);
    console.log('🔐 Password valida:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ Errore verifica password:', error);
    throw error;
  }
}

// Genera JWT token
export function generateJWT(userId, email) {
  try {
    console.log('🎫 Generando JWT per utente:', userId);
    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 giorni
    };
    
    const token = jwt.sign(payload, JWT_SECRET);
    console.log('✅ JWT generato con successo (scadenza: 30 giorni)');
    return token;
  } catch (error) {
    console.error('❌ Errore generazione JWT:', error);
    throw error;
  }
}

// Verifica JWT token
export function verifyJWT(token) {
  try {
    console.log('🎫 Verificando JWT...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ JWT valido per utente:', decoded.userId);
    return decoded;
  } catch (error) {
    console.error('❌ JWT non valido:', error.message);
    return null;
  }
}

// ================================================================
// OPERAZIONI DATABASE - UTENTI
// ================================================================

// Recupera tutti gli utenti
export async function getAllUsers() {
  try {
    console.log('👥 Recuperando tutti gli utenti dal database...');
    
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('id, email, name, surname, role, is_active, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Errore recupero utenti:', error);
      throw error;
    }
    
    console.log('✅ Recuperati', data?.length || 0, 'utenti');
    return data || [];
  } catch (error) {
    console.error('❌ Errore recupero tutti gli utenti:', error);
    throw error;
  }
}

// Trova utente per email
export async function findUserByEmail(email) {
  try {
    // 🟣 FASE 2 - TRACCIAMENTO COMPLETO API
    console.log('🟣 ============================================');
    console.log('🟣 FASE 2 - TRACCIAMENTO findUserByEmail');
    console.log('🟣 ============================================');
    console.log('📥 Input ricevuto:', { email, emailType: typeof email, emailLength: email?.length });
    
    // Query da eseguire
    const queryInfo = {
      table: 'users',
      select: '*',
      filter: { email: email },
      operation: 'SELECT'
    };
    console.log('📤 Query generata:', JSON.stringify(queryInfo, null, 2));
    
    console.log('👤 Ricerca utente per email:', email);
    
    // Prima prova con .single() per ottenere un solo risultato
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle(); // Usa maybeSingle() invece di single() per evitare errori quando non trova nulla
    
    // Log del risultato completo
    console.log('📥 Query result RAW:', { data, error });
    console.log('📊 Risultato analisi:'); 
    console.log('  - Data presente:', !!data);
    console.log('  - Error presente:', !!error);
    console.log('  - Error code:', error?.code);
    console.log('  - Error message:', error?.message);
    console.log('  - Error details:', error?.details);
    
    if (error) {
      console.log('⚠ Query error completo:', JSON.stringify(error, null, 2));
      // Con maybeSingle(), non dovremmo avere errori PGRST116
      console.error('❌ Errore inaspettato nella ricerca utente:', error);
      throw error;
    }
    
    if (data) {
      console.log('✅ Utente trovato:', data.id);
      console.log('📊 Dati utente trovati:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
      return data;
    } else {
      console.log('👤 Utente non trovato per email:', email);
      return null;
    }
  } catch (error) {
    console.error('❌ Errore ricerca utente completo:', JSON.stringify(error, null, 2));
    
    // Se l'errore è di connessione o configurazione, rilancialo
    // Se è un errore di "not found", restituisci null
    if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
      console.log('👤 Utente non trovato (errore catch)');
      return null;
    }
    
    throw error;
  }
}

// Crea nuovo utente
export async function createUser(email, password, name, surname = null) {
  try {
    // 🟣 FASE 2 - TRACCIAMENTO COMPLETO API
    console.log('🟣 ============================================');
    console.log('🟣 FASE 2 - TRACCIAMENTO createUser');
    console.log('🟣 ============================================');
    console.log('📥 Input ricevuto:', { 
      email, 
      name,
      surname,
      emailType: typeof email, 
      nameType: typeof name,
      surnameType: typeof surname,
      passwordPresent: !!password,
      passwordLength: password?.length 
    });
    
    console.log('👤 Creando nuovo utente:', email);
    
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
    
    console.log('📤 Query INSERT da eseguire:');
    console.log('  - Table: users');
    console.log('  - Operation: INSERT');
    console.log('  - Data:', JSON.stringify({ ...insertData, password_hash: '[HIDDEN]' }, null, 2));
    
    // Inserisci utente
    const { data, error } = await getSupabaseClient()
      .from('users')
      .insert(insertData)
      .select()
      .single();
    
    // Log del risultato completo
    console.log('📥 Query INSERT result RAW:', { data: data ? '[USER_DATA]' : null, error });
    console.log('📊 Risultato analisi:'); 
    console.log('  - Data presente:', !!data);
    console.log('  - Error presente:', !!error);
    console.log('  - Error code:', error?.code);
    console.log('  - Error message:', error?.message);
    console.log('  - Error details:', error?.details);
    console.log('  - Error hint:', error?.hint);
    
    if (error) {
      console.error('❌ Errore creazione utente completo:', JSON.stringify(error, null, 2));
      
      // Gestione specifica per errori di duplicazione
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
        console.error('❌ ERRORE DUPLICAZIONE: Utente con questa email già esiste');
        const duplicateError = new Error('Un account con questa email esiste già');
        duplicateError.code = 'DUPLICATE_EMAIL';
        duplicateError.statusCode = 409;
        throw duplicateError;
      }
      
      throw error;
    }
    
    console.log('✅ Utente creato con successo:', data.id);
    console.log('📊 Dati utente creato:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Errore creazione utente completo:', JSON.stringify(error, null, 2));
    
    // Rilanciare l'errore così com'è per mantenere le informazioni
    throw error;
  }
}

// Aggiorna ultimo login
export async function updateLastLogin(userId) {
  try {
    console.log('👤 Aggiornando ultimo login per:', userId);
    
    const { error } = await getSupabaseClient()
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) throw error;
    console.log('✅ Ultimo login aggiornato');
  } catch (error) {
    console.error('❌ Errore aggiornamento login:', error);
    // Non bloccare il login per questo errore
  }
}

// Aggiorna profilo utente (nome e cognome)
export async function updateUserProfile(userId, name, surname = null) {
  try {
    console.log('👤 Aggiornando profilo utente:', { userId, name, surname: surname || 'NON SPECIFICATO' });
    
    const updateData = {
      name: name.trim(),
      surname: surname ? surname.trim() : null,
      updated_at: new Date().toISOString()
    };
    
    console.log('📤 Dati aggiornamento profilo:', JSON.stringify(updateData, null, 2));
    
    const { data, error } = await getSupabaseClient()
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Errore aggiornamento profilo:', error);
      throw error;
    }
    
    console.log('✅ Profilo utente aggiornato con successo');
    console.log('📊 Dati utente aggiornato:', JSON.stringify({ ...data, password_hash: '[HIDDEN]' }, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Errore aggiornamento profilo utente:', error);
    throw error;
  }
}

// ================================================================
// OPERAZIONI DATABASE - UCME
// ================================================================

// Salva nuova UCMe
export async function saveUCMe(userId, content, title = null) {
  try {
    console.log('📝 Salvando nuova UCMe per utente:', userId);
    console.log('📝 Contenuto length:', content?.length);
    console.log('📝 Titolo:', title);
    
    // 🟣 FASE 2 - LOGGING PAYLOAD DETTAGLIATO UCMe
    const insertPayload = {
      user_id: userId,
      content,
      title,
      status: 'attesa'
    };
    
    console.log('📤 Supabase UCMe insert payload:', insertPayload);
    console.log('📤 Query target table: ucmes');
    console.log('📤 Query type: INSERT');
    
    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .insert(insertPayload)
      .select()
      .single();
    
    console.log('📥 Supabase UCMe insert result:', data);
    console.log('⚠ Supabase UCMe insert error:', error);
    
    if (error) {
      console.error('❌ DETTAGLIO ERRORE SUPABASE UCMe:');
      console.error('   Codice:', error.code);
      console.error('   Messaggio:', error.message);
      console.error('   Dettagli:', error.details);
      console.error('   Hint:', error.hint);
      throw error;
    }
    
    console.log('✅ UCMe salvata con successo:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Errore salvataggio UCMe:', error);
    throw error;
  }
}

// Recupera UCMe di un utente
export async function getUserUCMes(userId) {
  try {
    console.log('📝 Recuperando UCMe per utente:', userId);
    
    const { data, error } = await getSupabaseClient()
      .from('ucmes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Errore recupero UCMe:', error);
      throw error;
    }
    
    console.log('✅ UCMe recuperate:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Errore recupero UCMe:', error);
    throw error;
  }
}

// ================================================================
// OPERAZIONI DATABASE - SESSIONI
// ================================================================

// Salva sessione token
export async function saveUserSession(userId, token, deviceInfo = null) {
  try {
    console.log('🎫 Salvando sessione per utente:', userId);
    
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
    
    console.log('✅ Sessione salvata:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Errore salvataggio sessione:', error);
    // Non bloccare il login per questo errore
  }
}

// ================================================================
// UTILITÀ DI DEBUG
// ================================================================

// Test connessione database
export async function testDatabaseConnection() {
  try {
    console.log('🔍 Test connessione database...');
    
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connessione database fallita:', error);
      return false;
    }
    
    console.log('✅ Connessione database OK');
    return true;
  } catch (error) {
    console.error('❌ Errore test connessione:', error);
    return false;
  }
}

// Log configurazione
export function logConfiguration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  console.log('🔧 CONFIGURAZIONE SUPABASE:');
  console.log('   URL:', supabaseUrl ? '✅ Configurato' : '❌ Mancante');
  console.log('   Service Key:', supabaseServiceKey ? '✅ Configurato' : '❌ Mancante');
  console.log('   JWT Secret:', JWT_SECRET !== 'mental-commons-secret-key-change-in-production' ? '✅ Personalizzato' : '⚠️ Default');
}

// ================================================================
// 🟣 FASE 4 - TEST RLS E PERMESSI
// ================================================================

export async function testRLSPolicies() {
  try {
    console.log('🟣 ============================================');
    console.log('🟣 FASE 4 - TEST RLS E PERMESSI');
    console.log('🟣 ============================================');
    
    // Test 1: Verifica connessione con service key
    console.log('🔍 Test 1: Verifica connessione service key...');
    const { data: testSelect, error: testError } = await getSupabaseClient()
      .from('users')
      .select('*', { count: 'exact' })
      .limit(1);
    
    console.log('📊 Service key test result:');
    console.log('  - Query eseguita:', 'SELECT count(*) FROM users LIMIT 1');
    console.log('  - Dati ricevuti:', !!testSelect);
    console.log('  - Errore presente:', !!testError);
    console.log('  - Errore dettaglio:', testError ? JSON.stringify(testError, null, 2) : 'Nessuno');
    
    // Test 2: Verifica RLS status sulle tabelle principali
    const tables = ['users', 'ucmes', 'user_sessions'];
    const rlsTests = {};
    
    for (const table of tables) {
      console.log(`🔍 Test RLS per tabella: ${table}`);
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
    console.error('❌ Errore test RLS completo:', JSON.stringify(error, null, 2));
    return {
      serviceKeyWorking: false,
      rlsTests: {},
      errors: { general: error }
    };
  }
}

// Funzione helper per verificare se una query è bloccata da RLS
export async function checkRLSBlocking(tableName, operation = 'SELECT') {
  try {
    console.log(`🔍 Verifica RLS blocking per ${tableName} (${operation})...`);
    
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
    
    console.log(`📊 RLS Check ${tableName}:${operation}:`);
    console.log('  - Query eseguita:', !!data || !!error);
    console.log('  - Bloccata da RLS:', isBlocked);
    console.log('  - Errore RLS:', isBlocked ? error.message : 'No');
    console.log('  - Dati ricevuti:', !!data);
    console.log('  - Errore completo:', error ? JSON.stringify(error, null, 2) : 'Nessuno');
    
    return {
      table: tableName,
      operation,
      blocked: isBlocked,
      error: error,
      hasData: !!data
    };
  } catch (error) {
    console.error(`❌ Errore check RLS per ${tableName}:`, error);
    return {
      table: tableName,
      operation,
      blocked: true,
      error: error,
      hasData: false
    };
  }
} 