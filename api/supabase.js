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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRORE: Variabili ambiente Supabase mancanti');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Presente' : '❌ Mancante');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Presente' : '❌ Mancante');
}

// Client Supabase con service key (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ================================================================
// UTILITÀ PASSWORD E JWT
// ================================================================

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'mental-commons-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

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
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 ore
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log('✅ JWT generato con successo');
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

// Trova utente per email
export async function findUserByEmail(email) {
  try {
    console.log('👤 Ricerca utente per email:', email);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('👤 Utente non trovato');
        return null;
      }
      throw error;
    }
    
    console.log('✅ Utente trovato:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Errore ricerca utente:', error);
    throw error;
  }
}

// Crea nuovo utente
export async function createUser(email, password, name) {
  try {
    console.log('👤 Creando nuovo utente:', email);
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Inserisci utente
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role: 'user',
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Errore creazione utente:', error);
      throw error;
    }
    
    console.log('✅ Utente creato con successo:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Errore creazione utente:', error);
    throw error;
  }
}

// Aggiorna ultimo login
export async function updateLastLogin(userId) {
  try {
    console.log('👤 Aggiornando ultimo login per:', userId);
    
    const { error } = await supabase
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

// ================================================================
// OPERAZIONI DATABASE - UCME
// ================================================================

// Salva nuova UCMe
export async function saveUCMe(userId, content, title = null) {
  try {
    console.log('📝 Salvando nuova UCMe per utente:', userId);
    console.log('📝 Contenuto length:', content?.length);
    console.log('📝 Titolo:', title);
    
    const { data, error } = await supabase
      .from('ucmes')
      .insert({
        user_id: userId,
        content,
        title,
        status: 'attesa'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Errore salvataggio UCMe:', error);
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
    
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
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
  console.log('🔧 CONFIGURAZIONE SUPABASE:');
  console.log('   URL:', supabaseUrl ? '✅ Configurato' : '❌ Mancante');
  console.log('   Service Key:', supabaseServiceKey ? '✅ Configurato' : '❌ Mancante');
  console.log('   JWT Secret:', JWT_SECRET !== 'mental-commons-secret-key-change-in-production' ? '✅ Personalizzato' : '⚠️ Default');
} 