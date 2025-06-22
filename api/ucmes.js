// ================================================================
// Sistema di logging per ambiente produzione
import { log, debug, info, warn, error } from "../logger.js";
// MENTAL COMMONS - API UCMES (CARICAMENTO)
// ================================================================
// Endpoint per recuperare UCMe salvate nel database Supabase

import {
  verifyJWT,
  getUserUCMes,
  testDatabaseConnection
} from './supabase.js';

export default async function handler(req, res) {
  debug('🟣 ============================================');
  debug('🟣 MENTAL COMMONS - API UCMES (LOAD)');
  debug('🟣 ============================================');
  debug('📥 Request timestamp:', new Date().toISOString());
  debug('📥 Method:', req.method);
  debug('📥 Headers:', JSON.stringify(req.headers, null, 2));
  
  // ================================================================
  // CORS HEADERS
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    debug('📥 CORS preflight handled');
    res.status(200).end();
    return;
  }
  
  // ================================================================
  // VALIDAZIONE METODO
  // ================================================================
  
  if (req.method !== 'GET') {
    debug('❌ Metodo non valido:', req.method);
    return res.status(405).json({
      success: false,
      message: 'Metodo non consentito. Utilizzare GET.',
      debug: {
        receivedMethod: req.method,
        expectedMethod: 'GET',
        apiVersion: '2.0.0'
      }
    });
  }
  
  debug('📥 UCMe load request ricevuto');
  
  // ================================================================
  // AUTENTICAZIONE JWT
  // ================================================================
  
  const authHeader = req.headers.authorization;
  debug('🎫 Auth header:', authHeader ? 'PRESENTE' : 'MANCANTE');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    debug('❌ Token di autenticazione mancante o formato errato');
    return res.status(401).json({
      success: false,
      message: 'Token di autenticazione richiesto per recuperare UCMe',
      debug: {
        error: 'missing_auth_token',
        expectedHeader: 'Authorization: Bearer <token>',
        apiVersion: '2.0.0'
      }
    });
  }
  
  const token = authHeader.substring(7);
  debug('🎫 Token estratto, lunghezza:', token.length);
  
  // Verifica JWT
  const decoded = verifyJWT(token);
  if (!decoded) {
    debug('❌ Token JWT non valido');
    return res.status(401).json({
      success: false,
      message: 'Token di autenticazione non valido o scaduto',
      debug: {
        error: 'invalid_jwt_token',
        apiVersion: '2.0.0'
      }
    });
  }
  
  debug('✅ Utente autenticato:', decoded.userId);
  
  // ================================================================
  // TEST CONNESSIONE DATABASE
  // ================================================================
  
  debug('🔍 Test connessione database...');
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
  // RECUPERO UCME DAL DATABASE
  // ================================================================
  
  try {
    debug('📝 RECUPERO UCME - Caricamento da Supabase:');
    debug('  🔍 Tipo di storage: Supabase PostgreSQL');
    debug('  🔍 User ID:', decoded.userId);
    debug('  🔍 Email:', decoded.email);
    
    // Recupera UCMe dell'utente dal database
    const ucmes = await getUserUCMes(decoded.userId);
    
    debug('✅ UCMe recuperate dal database:', ucmes?.length || 0);
    
    // Parametri query per paginazione
    const { limit, offset } = req.query;
    const limitNum = parseInt(limit) || 10;
    const offsetNum = parseInt(offset) || 0;
    
    // Applica paginazione
    const paginatedUcmes = ucmes.slice(offsetNum, offsetNum + limitNum);
    
    debug('📦 UCME LOAD RESULT - SUCCESSO:');
    debug('  📊 Totale UCMe utente:', ucmes.length);
    debug('  📊 UCMe ritornate (paginazione):', paginatedUcmes.length);
    debug('  💾 Persistenza: SÌ (Supabase)');
    debug('  🔄 Cross-device: SÌ');
    debug('  🗄️ Database connesso: SÌ');
    
    const responseData = {
      success: true,
      data: paginatedUcmes.map(ucme => ({
        id: ucme.id,
        content: ucme.content,
        title: ucme.title,
        status: ucme.status,
        createdAt: ucme.created_at,
        updatedAt: ucme.updated_at,
        assignedTo: ucme.assigned_to,
        responseContent: ucme.response_content,
        responseAt: ucme.response_at
      })),
      pagination: {
        total: ucmes.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < ucmes.length
      },
      user: {
        id: decoded.userId,
        email: decoded.email
      },
      debug: {
        loadMethod: 'supabase_database',
        dataSource: 'persistent_database',
        persistentStorage: true,
        storageType: 'postgresql',
        databaseConnected: true,
        timestamp: new Date().toISOString(),
        apiVersion: '2.0.0',
        backend: 'supabase',
        crossDevice: true
      }
    };
    
    debug('📝 UCMe load response preparata');
    res.status(200).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    error('💥 Errore durante il recupero UCMe:', error);
    error('💥 Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server durante il recupero UCMe',
      debug: {
        error: error.message,
        code: error.code || 'unknown',
        backend: 'supabase',
        timestamp: new Date().toISOString(),
        apiVersion: '2.0.0'
      }
    });
  }
  
  debug('🔚 Fine processo UCMe load - timestamp:', new Date().toISOString());
  debug('🟣 ============================================');
} 