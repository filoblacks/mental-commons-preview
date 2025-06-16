// ================================================================
// MENTAL COMMONS - API UCMES (CARICAMENTO)
// ================================================================
// Endpoint per recuperare UCMe salvate nel database Supabase

import { 
  verifyJWT, 
  getUserUCMes, 
  testDatabaseConnection
} from './supabase.js';

export default async function handler(req, res) {
  console.log('🟣 ============================================');
  console.log('🟣 MENTAL COMMONS - API UCMES (LOAD)');
  console.log('🟣 ============================================');
  console.log('📥 Request timestamp:', new Date().toISOString());
  console.log('📥 Method:', req.method);
  console.log('📥 Headers:', JSON.stringify(req.headers, null, 2));
  
  // ================================================================
  // CORS HEADERS
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log('📥 CORS preflight handled');
    res.status(200).end();
    return;
  }
  
  // ================================================================
  // VALIDAZIONE METODO
  // ================================================================
  
  if (req.method !== 'GET') {
    console.log('❌ Metodo non valido:', req.method);
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
  
  console.log('📥 UCMe load request ricevuto');
  
  // ================================================================
  // AUTENTICAZIONE JWT
  // ================================================================
  
  const authHeader = req.headers.authorization;
  console.log('🎫 Auth header:', authHeader ? 'PRESENTE' : 'MANCANTE');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Token di autenticazione mancante o formato errato');
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
  console.log('🎫 Token estratto, lunghezza:', token.length);
  
  // Verifica JWT
  const decoded = verifyJWT(token);
  if (!decoded) {
    console.log('❌ Token JWT non valido');
    return res.status(401).json({
      success: false,
      message: 'Token di autenticazione non valido o scaduto',
      debug: {
        error: 'invalid_jwt_token',
        apiVersion: '2.0.0'
      }
    });
  }
  
  console.log('✅ Utente autenticato:', decoded.userId);
  
  // ================================================================
  // TEST CONNESSIONE DATABASE
  // ================================================================
  
  console.log('🔍 Test connessione database...');
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
  // RECUPERO UCME DAL DATABASE
  // ================================================================
  
  try {
    console.log('📝 RECUPERO UCME - Caricamento da Supabase:');
    console.log('  🔍 Tipo di storage: Supabase PostgreSQL');
    console.log('  🔍 User ID:', decoded.userId);
    console.log('  🔍 Email:', decoded.email);
    
    // Recupera UCMe dell'utente dal database
    const ucmes = await getUserUCMes(decoded.userId);
    
    console.log('✅ UCMe recuperate dal database:', ucmes?.length || 0);
    
    // Parametri query per paginazione
    const { limit, offset } = req.query;
    const limitNum = parseInt(limit) || 10;
    const offsetNum = parseInt(offset) || 0;
    
    // Applica paginazione
    const paginatedUcmes = ucmes.slice(offsetNum, offsetNum + limitNum);
    
    console.log('📦 UCME LOAD RESULT - SUCCESSO:');
    console.log('  📊 Totale UCMe utente:', ucmes.length);
    console.log('  📊 UCMe ritornate (paginazione):', paginatedUcmes.length);
    console.log('  💾 Persistenza: SÌ (Supabase)');
    console.log('  🔄 Cross-device: SÌ');
    console.log('  🗄️ Database connesso: SÌ');
    
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
    
    console.log('📝 UCMe load response preparata');
    res.status(200).json(responseData);
    
  } catch (error) {
    // ================================================================
    // GESTIONE ERRORI
    // ================================================================
    
    console.error('💥 Errore durante il recupero UCMe:', error);
    console.error('💥 Stack trace:', error.stack);
    
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
  
  console.log('🔚 Fine processo UCMe load - timestamp:', new Date().toISOString());
  console.log('🟣 ============================================');
} 