/**
 * Mental Commons 3.0 - Estensione per Gestione Utenti
 * 
 * Questo script estende il Google Apps Script esistente per gestire
 * login e registrazione utenti in modo centralizzato.
 * 
 * AGGIUNGI QUESTO CODICE al Google Apps Script esistente per avere
 * un database utenti unificato tra tutti gli ambienti.
 */

// Configurazione utenti
const USERS_SHEET_NAME = 'mental_commons_users';

/**
 * Funzione principale estesa per gestire richieste utenti
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    
    // Verifica API Key
    if (!requestData.key || requestData.key !== API_KEY) {
      return createResponse({
        success: false,
        message: 'Accesso non autorizzato'
      }, 401);
    }
    
    // 🆕 NUOVE ROTTE PER UTENTI
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
    
    // Gestione UCMe esistente (mantieni codice originale)
    // ... resto del codice originale ...
    
  } catch (error) {
    console.error('Errore nel processare la richiesta:', error);
    return createResponse({
      success: false,
      message: 'Errore interno del server. Riprova più tardi.'
    }, 500);
  }
}

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

/**
 * 🆕 Ottieni o crea sheet utenti
 */
function getOrCreateUsersSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
  
  if (!sheet) {
    console.log('Creazione nuovo sheet utenti...');
    sheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
    setupUsersSheetHeaders(sheet);
  }
  
  return sheet;
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
  headerRange.setBackground('#f0f0f0');
  
  console.log('Headers utenti configurati');
}

/**
 * 🆕 Trova utente per email
 */
function findUserByEmail(sheet, email) {
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

/**
 * 🆕 Funzione di test per utenti
 */
function testUserFunctions() {
  console.log('=== TEST FUNZIONI UTENTI ===');
  
  // Test registrazione
  const registerResult = handleUserRegistration({
    email: 'test@mentalcommons.it',
    password: 'test123',
    name: 'Test User'
  });
  console.log('Test registrazione:', registerResult);
  
  // Test login
  const loginResult = handleUserLogin({
    email: 'test@mentalcommons.it',
    password: 'test123'
  });
  console.log('Test login:', loginResult);
  
  console.log('=== FINE TEST ===');
} 