// ✅ Endpoint UCMes (recupero) per Vercel Serverless con DEBUG COMPLETO

export default async function handler(req, res) {
  // Log request iniziale FASE 2 - RECUPERO
  console.log('🟣 FASE 2 DEBUG - UCMES LOAD REQUEST RICEVUTO');
  console.log('📥 Timestamp:', new Date().toISOString());
  console.log('📥 Headers ricevuti:', JSON.stringify(req.headers, null, 2));
  console.log('📥 Metodo:', req.method);
  console.log('📥 Query params:', JSON.stringify(req.query, null, 2));
  console.log('📥 User-Agent:', req.headers['user-agent']);
  console.log('📥 Origin:', req.headers.origin);
  console.log('📥 Referer:', req.headers.referer);
  
  // Gestione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log('📥 Risposta CORS OPTIONS inviata');
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    console.log('❌ Metodo non valido:', req.method);
    return res.status(405).json({
      success: false,
      message: 'Metodo non consentito. Utilizzare GET.',
      debug: {
        receivedMethod: req.method,
        expectedMethod: 'GET'
      }
    });
  }
  
  console.log('📥 Richiesta recupero UCMe ricevuta');
  
  try {
    // Estrai parametri query
    const { email, limit, offset } = req.query;
    
    console.log('📦 UCMe load - Parametri ricevuti:');
    console.log('  📧 Email filter:', email);
    console.log('  📊 Limit:', limit);
    console.log('  📊 Offset:', offset);
    
    // 🔍 SIMULAZIONE RECUPERO UCMe
    console.log('📥 UCMe load result - INIZIO RECUPERO SIMULATO:');
    console.log('  🔍 Tipo di storage: MOCK (nessun database connesso)');
    console.log('  🔍 Recupero da: File JSON statico (non aggiornabile)');
    console.log('  🔍 Filesystem Vercel: READ-ONLY');
    console.log('  🔍 Database: NON CONNESSO');
    
    // Tenta di leggere da file statico (se esiste)
    let ucmes = [];
    let dataSource = 'empty';
    
    try {
      // In ambiente Vercel, possiamo solo leggere file statici inclusi nel build
      // Il file data.json è statico e non si aggiorna con le nuove UCMe
      const fs = require('fs');
      const path = require('path');
      const dataPath = path.join(process.cwd(), 'data', 'data.json');
      
      console.log('  🔍 Tentativo lettura file statico:', dataPath);
      
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const data = JSON.parse(fileContent);
        ucmes = data.ucmes || [];
        dataSource = 'static_file';
        console.log('  ✅ File statico letto con successo');
        console.log('  📊 UCMe nel file statico:', ucmes.length);
      } else {
        console.log('  ❌ File statico non trovato');
      }
    } catch (fileError) {
      console.log('  ❌ Errore lettura file statico:', fileError.message);
    }
    
    // Filtra per email se specificata
    let filteredUcmes = ucmes;
    if (email) {
      filteredUcmes = ucmes.filter(ucme => ucme.email === email);
      console.log('  🔍 Filtro email applicato:', email);
      console.log('  📊 UCMe dopo filtro email:', filteredUcmes.length);
    }
    
    // Applica paginazione
    const limitNum = parseInt(limit) || 10;
    const offsetNum = parseInt(offset) || 0;
    const paginatedUcmes = filteredUcmes.slice(offsetNum, offsetNum + limitNum);
    
    console.log('✅ UCMe recuperate da mock storage');
    console.log('📦 UCMe load result - DETTAGLI RECUPERO:');
    console.log('  📊 Totale UCMe disponibili:', ucmes.length);
    console.log('  📊 UCMe dopo filtri:', filteredUcmes.length);
    console.log('  📊 UCMe ritornate (paginazione):', paginatedUcmes.length);
    console.log('  📁 Fonte dati:', dataSource);
    console.log('  💾 Persistenza: NO (file statico dal build)');
    console.log('  📁 File system: READ-ONLY (Vercel serverless)');
    console.log('  🗄️ Database: NON CONNESSO');
    console.log('  ⚠️ Le UCMe salvate via API NON sono incluse (solo file statico)');
    
    const responseData = {
      success: true,
      data: paginatedUcmes,
      pagination: {
        total: filteredUcmes.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < filteredUcmes.length
      },
      debug: {
        dataSource: dataSource,
        staticFileOnly: true,
        newUcmesIncluded: false,
        totalAvailable: ucmes.length,
        afterFilter: filteredUcmes.length,
        returned: paginatedUcmes.length,
        persistentStorage: false,
        databaseConnected: false,
        vercelEnvironment: 'serverless_readonly',
        warning: 'UCMe salvate via API non incluse - solo dati statici dal build'
      }
    };
    
    console.log('📥 UCMe load response preparata');
    console.log('⚠️ CRITICO: UCMe salvate dinamicamente NON incluse (solo file statico)');
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ Errore nel recuperare UCMe:', error);
    console.error('❌ Stack trace:', error.stack);
    console.log('📦 UCMe load result - ERRORE:');
    console.log('  ❌ Errore tipo:', error.name);
    console.log('  ❌ Errore messaggio:', error.message);
    console.log('  ❌ Timestamp errore:', new Date().toISOString());
    
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le UCMe. Riprova più tardi.',
      debug: {
        errorType: error.name,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  console.log('🔚 Fine processo UCMe load - timestamp:', new Date().toISOString());
} 