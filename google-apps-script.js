/**
 * Mental Commons 3.0 - Google Apps Script Completo
 * 
 * Gestisce sia UCMe che Utenti in modo centralizzato.
 * 
 * Setup:
 * 1. Sostituisci TUTTO il codice del Google Apps Script con questo
 * 2. Salva e rideploy il Web App
 * 3. Test dal frontend con await testBackendLogin()
 */

// ========================================
// CONFIGURAZIONE
// ========================================
const API_KEY = 'mc_2024_filippo_1201_aB3xY9zK2m';
const SHEET_NAME = 'mental_commons_ucme';
const USERS_SHEET_NAME = 'mental_commons_users';
const PORTATORI_SHEET_NAME = 'mental_commons_portatori';
const TEAM_EMAIL = 'filippo@mentalcommons.xyz';

// ========================================
// FUNZIONE PRINCIPALE UNIFICATA
// ========================================
/**
 * Funzione principale che gestisce TUTTE le richieste POST
 */
function doPost(e) {
  try {
    // Log della richiesta per debug
    console.log('Ricevuta richiesta POST:', e.postData.contents);
    
    // Parsing dei dati JSON
    const requestData = JSON.parse(e.postData.contents);
    
    // Verifica API Key
    if (!requestData.key || requestData.key !== API_KEY) {
      return createResponse({
        success: false,
        message: 'Accesso non autorizzato'
      }, 401);
    }
    
    // ========================================
    // GESTIONE UTENTI CENTRALIZZATI
    // ========================================
    if (requestData.action === 'register') {
      return handleUserRegistration(requestData);
    }
    
    if (requestData.action === 'login') {
      return handleUserLogin(requestData);
    }
    
    if (requestData.action === 'getUser') {
      return handleGetUser(requestData);
    }
    
    if (requestData.action === 'syncUsers') {
      return handleSyncUsers(requestData);
    }
    
    if (requestData.action === 'ping') {
      return createResponse({
        success: true,
        message: 'Server raggiungibile',
        timestamp: new Date().toISOString(),
        version: '3.0'
      });
    }
    
    // ========================================
    // GESTIONE UCMe ESISTENTE
    // ========================================
    
    // Validazione dati UCMe richiesti
    const validation = validateUcmeData(requestData);
    if (!validation.valid) {
      return createResponse({
        success: false,
        message: validation.error
      }, 400);
    }
    
    // Salva la UCMe nel Google Sheet
    const ucmeId = saveUcmeToSheet(requestData);
    
    // Gestione candidatura Portatore se presente
    if (requestData.portatore) {
      savePortatoreCandidate(requestData.email);
    }
    
    // Invia notifica email al team MC
    sendTeamNotification(requestData, ucmeId);
    
    // Risposta di successo
    return createResponse({
      success: true,
      message: 'Grazie per aver condiviso la tua UCMe. Riceverai una risposta autentica entro 48 ore.',
      ucmeId: ucmeId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Errore nel processare la richiesta:', error);
    return createResponse({
      success: false,
      message: 'Errore interno del server. Riprova più tardi.'
    }, 500);
  }
}

// ========================================
// FUNZIONI GESTIONE UTENTI
// ========================================

/**
 * 🆕 Gestisce registrazione utente
 */
function handleUserRegistration(data) {
  try {
    if (!data.email || !data.password) {
      return createResponse({
        success: false,
        message: 'Email e password sono richiesti'
      }, 400);
    }
    
    if (!isValidEmail(data.email)) {
      return createResponse({
        success: false,
        message: 'Email non valida'
      }, 400);
    }
    
    const sheet = getOrCreateUsersSheet();
    
    // Controlla se utente esiste già
    const existingUser = findUserByEmail(sheet, data.email);
    if (existingUser) {
      return createResponse({
        success: false,
        message: 'Un account con questa email esiste già'
      }, 409);
    }
    
    // Crea nuovo utente
    const userId = generateUniqueId();
    const userData = [
      userId,                           // A: ID
      data.email,                       // B: Email
      data.password,                    // C: Password (in produzione: hash!)
      data.name || data.email.split('@')[0], // D: Nome
      new Date(),                       // E: Data Creazione
      new Date(),                       // F: Ultimo Login
      'attivo',                         // G: Stato
      data.isPortatore || false         // H: È Portatore
    ];
    
    sheet.appendRow(userData);
    
    console.log(`Utente registrato: ${data.email}`);
    
    return createResponse({
      success: true,
      message: 'Registrazione completata',
      user: {
        id: userId,
        email: data.email,
        name: data.name || data.email.split('@')[0],
        createdAt: new Date().toISOString(),
        isPortatore: data.isPortatore || false
      }
    });
    
  } catch (error) {
    console.error('Errore registrazione:', error);
    return createResponse({
      success: false,
      message: 'Errore durante la registrazione'
    }, 500);
  }
}

/**
 * 🆕 Gestisce login utente
 */
function handleUserLogin(data) {
  try {
    if (!data.email || !data.password) {
      return createResponse({
        success: false,
        message: 'Email e password sono richiesti'
      }, 400);
    }
    
    const sheet = getOrCreateUsersSheet();
    const user = findUserByEmail(sheet, data.email);
    
    if (!user || user.password !== data.password) {
      return createResponse({
        success: false,
        message: 'Email o password non corretti'
      }, 401);
    }
    
    // Aggiorna ultimo login
    updateUserLastLogin(sheet, user.row, data.email);
    
    console.log(`Login riuscito: ${data.email}`);
    
    return createResponse({
      success: true,
      message: 'Login completato',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastLogin: new Date().toISOString(),
        isPortatore: user.isPortatore
      }
    });
    
  } catch (error) {
    console.error('Errore login:', error);
    return createResponse({
      success: false,
      message: 'Errore durante il login'
    }, 500);
  }
}

/**
 * 🆕 Recupera dati utente
 */
function handleGetUser(data) {
  try {
    if (!data.email) {
      return createResponse({
        success: false,
        message: 'Email richiesta'
      }, 400);
    }
    
    const sheet = getOrCreateUsersSheet();
    const user = findUserByEmail(sheet, data.email);
    
    if (!user) {
      return createResponse({
        success: false,
        message: 'Utente non trovato'
      }, 404);
    }
    
    return createResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isPortatore: user.isPortatore
      }
    });
    
  } catch (error) {
    console.error('Errore recupero utente:', error);
    return createResponse({
      success: false,
      message: 'Errore durante il recupero utente'
    }, 500);
  }
}

/**
 * 🆕 Sincronizza utenti dal localStorage
 */
function handleSyncUsers(data) {
  try {
    if (!data.users || !Array.isArray(data.users)) {
      return createResponse({
        success: false,
        message: 'Lista utenti non valida'
      }, 400);
    }
    
    const sheet = getOrCreateUsersSheet();
    let syncedCount = 0;
    let errorCount = 0;
    
    data.users.forEach(user => {
      try {
        if (!findUserByEmail(sheet, user.email)) {
          const userData = [
            user.id || generateUniqueId(),
            user.email,
            user.password || 'migrated_user',
            user.name || user.email.split('@')[0],
            new Date(user.createdAt || Date.now()),
            new Date(user.lastLogin || Date.now()),
            'migrato',
            user.isPortatore || false
          ];
          
          sheet.appendRow(userData);
          syncedCount++;
        }
      } catch (e) {
        errorCount++;
        console.error(`Errore sync utente ${user.email}:`, e);
      }
    });
    
    return createResponse({
      success: true,
      message: `Sincronizzazione completata: ${syncedCount} utenti sincronizzati, ${errorCount} errori`,
      syncedCount: syncedCount,
      errorCount: errorCount
    });
    
  } catch (error) {
    console.error('Errore sincronizzazione:', error);
    return createResponse({
      success: false,
      message: 'Errore durante la sincronizzazione'
    }, 500);
  }
}

// ========================================
// FUNZIONI GESTIONE SHEETS UTENTI
// ========================================

/**
 * 🆕 Ottieni o crea sheet utenti
 */
function getOrCreateUsersSheet() {
  let spreadsheet;
  
  try {
    // Cerca un foglio esistente con il nome specificato
    const files = DriveApp.getFilesByName(SHEET_NAME);
    
    if (files.hasNext()) {
      const file = files.next();
      spreadsheet = SpreadsheetApp.openById(file.getId());
    } else {
      // Crea un nuovo foglio principale
      spreadsheet = SpreadsheetApp.create(SHEET_NAME);
      console.log(`Creato nuovo foglio principale: ${SHEET_NAME}`);
    }
    
    // Cerca o crea il tab utenti
    let sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    
    if (!sheet) {
      console.log('Creazione nuovo sheet utenti...');
      sheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
      setupUsersSheetHeaders(sheet);
    }
    
    return sheet;
    
  } catch (error) {
    console.error('Errore nell\'accesso al sheet utenti:', error);
    throw new Error('Impossibile accedere al Google Sheet utenti');
  }
}

/**
 * 🆕 Setup header sheet utenti
 */
function setupUsersSheetHeaders(sheet) {
  const headers = [
    'ID',
    'Email', 
    'Password',
    'Nome',
    'Data Creazione',
    'Ultimo Login',
    'Stato',
    'Portatore'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8f5e8');
  headerRange.setBorder(true, true, true, true, true, true);
  
  // Imposta larghezza colonne
  sheet.setColumnWidth(1, 120);  // ID
  sheet.setColumnWidth(2, 200);  // Email
  sheet.setColumnWidth(3, 100);  // Password
  sheet.setColumnWidth(4, 150);  // Nome
  sheet.setColumnWidth(5, 150);  // Data Creazione
  sheet.setColumnWidth(6, 150);  // Ultimo Login
  sheet.setColumnWidth(7, 80);   // Stato
  sheet.setColumnWidth(8, 80);   // Portatore
  
  console.log('Headers utenti configurati');
}

/**
 * 🆕 Trova utente per email
 */
function findUserByEmail(sheet, email) {
  try {
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) { // Skip header
      const row = data[i];
      if (row[1] === email) { // Colonna B = Email
        return {
          row: i + 1,
          id: row[0],
          email: row[1],
          password: row[2],
          name: row[3],
          createdAt: row[4],
          lastLogin: row[5],
          status: row[6],
          isPortatore: row[7]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Errore ricerca utente:', error);
    return null;
  }
}

/**
 * 🆕 Aggiorna ultimo login
 */
function updateUserLastLogin(sheet, rowNumber, email) {
  try {
    sheet.getRange(rowNumber, 6).setValue(new Date()); // Colonna F = Ultimo Login
    console.log(`Ultimo login aggiornato per: ${email}`);
  } catch (error) {
    console.error('Errore aggiornamento ultimo login:', error);
  }
}

// ========================================
// FUNZIONI GESTIONE UCMe (ESISTENTI)
// ========================================

/**
 * Valida i dati della UCMe ricevuti
 */
function validateUcmeData(data) {
  if (!data.email || !isValidEmail(data.email)) {
    return { valid: false, error: 'Email non valida' };
  }
  
  if (!data.text || data.text.trim().length < 20) {
    return { valid: false, error: 'Il pensiero deve contenere almeno 20 caratteri' };
  }
  
  if (data.text.trim().length > 600) {
    return { valid: false, error: 'Il pensiero non può superare i 600 caratteri' };
  }
  
  // Validazione tono se presente
  if (data.tone) {
    const validTones = ['calmo', 'poetico', 'neutro', 'diretto'];
    if (!validTones.includes(data.tone)) {
      return { valid: false, error: 'Tono della risposta non valido' };
    }
  }
  
  return { valid: true };
}

/**
 * Verifica se l'email è valida
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Salva la UCMe nel Google Sheet
 */
function saveUcmeToSheet(data) {
  // Genera ID univoco
  const ucmeId = generateUniqueId();
  
  // Ottieni o crea il foglio UCMe
  const sheet = getOrCreateSheet();
  
  // Prepara i dati per il foglio
  const rowData = [
    ucmeId,                           // A: ID
    data.email,                       // B: Email
    data.text.trim(),                 // C: Testo UCMe
    data.tone || 'neutro',            // D: Tono richiesto
    data.portatore ? 'SI' : 'NO',     // E: Candidatura Portatore
    new Date(),                       // F: Timestamp
    'in_attesa',                      // G: Stato
    '',                               // H: Portatore Assegnato
    '',                               // I: Risposta
    '',                               // J: Data Risposta
    data.text.length,                 // K: Lunghezza Testo
    getCurrentDateString(),           // L: Data Creazione (formato leggibile)
    data.metadata?.version || '3.0'   // M: Versione
  ];
  
  // Aggiungi la riga al foglio
  sheet.appendRow(rowData);
  
  console.log(`UCMe salvata con ID: ${ucmeId}`);
  return ucmeId;
}

/**
 * Salva candidatura Portatore
 */
function savePortatoreCandidate(email) {
  try {
    const sheet = getOrCreatePortatoriSheet();
    
    // Verifica se l'email è già presente
    const existingData = sheet.getDataRange().getValues();
    const emailExists = existingData.some(row => row[1] === email);
    
    if (!emailExists) {
      const candidateData = [
        generateUniqueId(),             // A: ID
        email,                          // B: Email
        'SI',                           // C: Interesse
        new Date(),                     // D: Timestamp
        getCurrentDateString()          // E: Data Creazione
      ];
      
      sheet.appendRow(candidateData);
      console.log(`Candidatura Portatore salvata per: ${email}`);
    }
    
  } catch (error) {
    console.error('Errore nel salvare candidatura Portatore:', error);
  }
}

/**
 * Invia notifica email al team MC
 */
function sendTeamNotification(data, ucmeId) {
  try {
    const subject = `📥 Nuova UCMe ricevuta da ${data.email}`;
    
    const body = `
Nuova UCMe ricevuta su Mental Commons:

---
📧 Email: ${data.email}
🆔 ID UCMe: ${ucmeId}
⏰ Timestamp: ${new Date().toLocaleString('it-IT')}
🎚️ Tono richiesto: ${data.tone || 'neutro'}
🤝 Candidatura Portatore: ${data.portatore ? 'SI' : 'NO'}

📝 Testo UCMe:
"${data.text}"

---
Accedi al Google Sheet per gestire l'assegnazione: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
    `;
    
    if (TEAM_EMAIL && TEAM_EMAIL !== 'your-email@domain.com') {
      MailApp.sendEmail({
        to: TEAM_EMAIL,
        subject: subject,
        body: body
      });
      console.log(`Notifica email inviata a: ${TEAM_EMAIL}`);
    }
    
  } catch (error) {
    console.error('Errore nell\'invio notifica email:', error);
  }
}

/**
 * Ottiene il foglio UCMe esistente o ne crea uno nuovo
 */
function getOrCreateSheet() {
  let spreadsheet;
  
  try {
    // Cerca un foglio esistente con il nome specificato
    const files = DriveApp.getFilesByName(SHEET_NAME);
    
    if (files.hasNext()) {
      const file = files.next();
      spreadsheet = SpreadsheetApp.openById(file.getId());
    } else {
      // Crea un nuovo foglio
      spreadsheet = SpreadsheetApp.create(SHEET_NAME);
      console.log(`Creato nuovo foglio: ${SHEET_NAME}`);
    }
    
    const sheet = spreadsheet.getActiveSheet();
    
    // Se il foglio è vuoto, aggiungi gli header
    if (sheet.getLastRow() === 0) {
      setupSheetHeaders(sheet);
    }
    
    return sheet;
    
  } catch (error) {
    console.error('Errore nell\'accesso al foglio:', error);
    throw new Error('Impossibile accedere al Google Sheet');
  }
}

/**
 * Ottieni o crea sheet portatori
 */
function getOrCreatePortatoriSheet() {
  let spreadsheet;
  
  try {
    const files = DriveApp.getFilesByName(SHEET_NAME);
    
    if (files.hasNext()) {
      const file = files.next();
      spreadsheet = SpreadsheetApp.openById(file.getId());
    } else {
      spreadsheet = SpreadsheetApp.create(SHEET_NAME);
    }
    
    let sheet = spreadsheet.getSheetByName(PORTATORI_SHEET_NAME);
    
    if (!sheet) {
      console.log('Creazione nuovo sheet portatori...');
      sheet = spreadsheet.insertSheet(PORTATORI_SHEET_NAME);
      setupPortatoriSheetHeaders(sheet);
    }
    
    return sheet;
    
  } catch (error) {
    console.error('Errore nell\'accesso al sheet portatori:', error);
    throw new Error('Impossibile accedere al Google Sheet portatori');
  }
}

/**
 * Configura gli header del foglio UCMe
 */
function setupSheetHeaders(sheet) {
  const headers = [
    'ID',
    'Email',
    'Testo UCMe',
    'Tono',
    'Portatore',
    'Timestamp',
    'Stato',
    'Portatore Assegnato',
    'Risposta',
    'Data Risposta',
    'Lunghezza',
    'Data Creazione',
    'Versione'
  ];
  
  // Aggiungi header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Formattazione header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f8ff');
  headerRange.setBorder(true, true, true, true, true, true);
  
  // Imposta larghezza colonne
  sheet.setColumnWidth(1, 120);  // ID
  sheet.setColumnWidth(2, 200);  // Email
  sheet.setColumnWidth(3, 400);  // Testo UCMe
  sheet.setColumnWidth(4, 80);   // Tono
  sheet.setColumnWidth(5, 80);   // Portatore
  sheet.setColumnWidth(6, 150);  // Timestamp
  sheet.setColumnWidth(7, 100);  // Stato
  sheet.setColumnWidth(8, 150);  // Portatore Assegnato
  sheet.setColumnWidth(9, 400);  // Risposta
  sheet.setColumnWidth(10, 150); // Data Risposta
  sheet.setColumnWidth(11, 80);  // Lunghezza
  sheet.setColumnWidth(12, 120); // Data Creazione
  sheet.setColumnWidth(13, 80);  // Versione
  
  console.log('Header del foglio UCMe configurati');
}

/**
 * Setup header sheet portatori
 */
function setupPortatoriSheetHeaders(sheet) {
  const headers = [
    'ID',
    'Email',
    'Interesse',
    'Timestamp',
    'Data Creazione'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#fff8dc');
  
  console.log('Headers portatori configurati');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Genera un ID univoco
 */
function generateUniqueId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `mc_${timestamp}_${random}`;
}

/**
 * Ottiene la data corrente in formato leggibile
 */
function getCurrentDateString() {
  const now = new Date();
  return now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT');
}

/**
 * Crea una risposta HTTP standardizzata con header CORS
 */
function createResponse(data, statusCode = 200) {
  console.log('Creazione risposta con CORS headers:', data);
  
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * Gestisce le richieste OPTIONS per CORS (versione completa)
 */
function doOptions(e) {
  console.log('Richiesta OPTIONS ricevuta per CORS');
  
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '3600'
    });
}

// ========================================
// FUNZIONI DI TEST
// ========================================

/**
 * Funzione di test per UCMe
 */
function testScript() {
  const testData = {
    email: 'test@example.com',
    text: 'Questo è un pensiero di test per verificare che tutto funzioni correttamente.',
    tone: 'neutro',
    key: API_KEY
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Risultato test UCMe:', result.getContent());
}

/**
 * 🆕 Funzione di test per utenti
 */
function testUserFunctions() {
  console.log('=== TEST FUNZIONI UTENTI ===');
  
  // Test registrazione
  const registerData = {
    action: 'register',
    email: 'test@mentalcommons.it',
    password: 'test123',
    name: 'Test User',
    key: API_KEY
  };
  
  const registerEvent = {
    postData: { contents: JSON.stringify(registerData) }
  };
  
  const registerResult = doPost(registerEvent);
  console.log('Test registrazione:', registerResult.getContent());
  
  // Test login
  const loginData = {
    action: 'login',
    email: 'test@mentalcommons.it',
    password: 'test123',
    key: API_KEY
  };
  
  const loginEvent = {
    postData: { contents: JSON.stringify(loginData) }
  };
  
  const loginResult = doPost(loginEvent);
  console.log('Test login:', loginResult.getContent());
  
  console.log('=== FINE TEST ===');
}

/**
 * 🧪 Funzione di test CORS per debugging
 */
function testCorsResponse() {
  console.log('=== TEST CORS ===');
  
  const testResponse = createResponse({
    success: true,
    message: 'Test CORS funzionante',
    timestamp: new Date().toISOString()
  });
  
  console.log('Test response creata:', testResponse.getContent());
  return testResponse;
}

/**
 * Funzione per ottenere statistiche delle UCMe
 */
function getUcmeStats() {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        totale: 0,
        in_attesa: 0,
        assegnate: 0,
        completate: 0
      };
    }
    
    const statusColumn = sheet.getRange(2, 7, lastRow - 1, 1).getValues(); // Colonna G = Stato
    const stats = {
      totale: lastRow - 1,
      in_attesa: 0,
      assegnate: 0,
      completate: 0
    };
    
    statusColumn.forEach(row => {
      const status = row[0];
      if (status === 'in_attesa') stats.in_attesa++;
      else if (status === 'assegnata') stats.assegnate++;
      else if (status === 'completata') stats.completate++;
    });
    
    console.log('Statistiche UCMe:', stats);
    return stats;
    
  } catch (error) {
    console.error('Errore nel calcolo delle statistiche:', error);
    return null;
  }
} 