/**
 * Mental Commons - Google Apps Script per UCMe
 * 
 * Questo script riceve le UCMe dal frontend e le salva in un Google Sheet.
 * 
 * Setup:
 * 1. Crea un nuovo Google Sheet chiamato "mental_commons_ucme"
 * 2. Crea un nuovo Google Apps Script
 * 3. Incolla questo codice
 * 4. Sostituisci YOUR_API_KEY con una chiave sicura
 * 5. Pubblica come Web App con accesso "Anyone"
 * 6. Copia l'URL del Web App nel frontend
 */

// Configurazione
const API_KEY = 'mc_2024_filippo_1201_aB3xY9zK2m'; // ✅ Chiave sincronizzata con frontend
const SHEET_NAME = 'mental_commons_ucme';

/**
 * Funzione principale che gestisce le richieste POST
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
    
    // Validazione dati richiesti
    const validation = validateUcmeData(requestData);
    if (!validation.valid) {
      return createResponse({
        success: false,
        message: validation.error
      }, 400);
    }
    
    // Salva la UCMe nel Google Sheet
    const ucmeId = saveUcmeToSheet(requestData);
    
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
  
  // Ottieni o crea il foglio
  const sheet = getOrCreateSheet();
  
  // Prepara i dati per il foglio
  const rowData = [
    ucmeId,                           // A: ID
    data.email,                       // B: Email
    data.text.trim(),                 // C: Testo UCMe
    new Date(),                       // D: Timestamp
    'in_attesa',                      // E: Stato
    '',                               // F: Portatore Assegnato
    '',                               // G: Risposta
    '',                               // H: Data Risposta
    data.text.length,                 // I: Lunghezza Testo
    getCurrentDateString()            // J: Data Creazione (formato leggibile)
  ];
  
  // Aggiungi la riga al foglio
  sheet.appendRow(rowData);
  
  console.log(`UCMe salvata con ID: ${ucmeId}`);
  return ucmeId;
}

/**
 * Ottiene il foglio esistente o ne crea uno nuovo
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
 * Configura gli header del foglio
 */
function setupSheetHeaders(sheet) {
  const headers = [
    'ID',
    'Email',
    'Testo UCMe',
    'Timestamp',
    'Stato',
    'Portatore',
    'Risposta',
    'Data Risposta',
    'Lunghezza',
    'Data Creazione'
  ];
  
  // Aggiungi header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Formattazione header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');
  headerRange.setBorder(true, true, true, true, true, true);
  
  // Imposta larghezza colonne
  sheet.setColumnWidth(1, 120);  // ID
  sheet.setColumnWidth(2, 200);  // Email
  sheet.setColumnWidth(3, 400);  // Testo UCMe
  sheet.setColumnWidth(4, 150);  // Timestamp
  sheet.setColumnWidth(5, 100);  // Stato
  sheet.setColumnWidth(6, 150);  // Portatore
  sheet.setColumnWidth(7, 400);  // Risposta
  sheet.setColumnWidth(8, 150);  // Data Risposta
  sheet.setColumnWidth(9, 80);   // Lunghezza
  sheet.setColumnWidth(10, 120); // Data Creazione
  
  console.log('Header del foglio configurati');
}

/**
 * Genera un ID univoco per la UCMe
 */
function generateUniqueId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `ucme_${timestamp}_${random}`;
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
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    
  // Aggiungi header CORS per permettere le richieste cross-origin
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Access-Control-Max-Age', '3600');
}

/**
 * Gestisce le richieste OPTIONS per CORS (preflight requests)
 */
function doOptions() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Access-Control-Max-Age', '3600');
}

/**
 * Funzione di utilità per testare lo script
 */
function testScript() {
  const testData = {
    email: 'test@example.com',
    text: 'Questo è un pensiero di test per verificare che tutto funzioni correttamente.',
    key: API_KEY
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Risultato test:', result.getContent());
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
    
    const statusColumn = sheet.getRange(2, 5, lastRow - 1, 1).getValues();
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