/**
 * Mental Commons 2.0 - Google Apps Script per UCMe
 * 
 * Questo script riceve le UCMe dal frontend e le salva in un Google Sheet.
 * Versione 2.0: Aggiunge gestione tono, candidatura portatore e notifiche email.
 * 
 * Setup:
 * 1. Crea un nuovo Google Sheet chiamato "mental_commons_ucme"
 * 2. Crea un nuovo Google Apps Script
 * 3. Incolla questo codice
 * 4. Sostituisci YOUR_API_KEY con una chiave sicura
 * 5. Configura l'email del team MC in TEAM_EMAIL
 * 6. Pubblica come Web App con:
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 7. Copia l'URL del Web App nel frontend
 * 
 * IMPORTANTE: Google Apps Script gestisce CORS automaticamente per Web Apps 
 * pubblicate con accesso "Anyone". Non serve impostare header CORS manualmente.
 */

// Configurazione
const API_KEY = 'mc_2024_filippo_1201_aB3xY9zK2m'; // ✅ Chiave sincronizzata con frontend
const SHEET_NAME = 'mental_commons_ucme';
const PORTATORI_SHEET_NAME = 'mental_commons_portatori';
const TEAM_EMAIL = 'filippo@mentalcommons.xyz'; // ✅ Email del team MC per notifiche

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

/**
 * Valida i dati della UCMe ricevuti (aggiornato per v2.0)
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
  
  // Validazione tono (nuovo in v2.0)
  const validTones = ['calmo', 'poetico', 'neutro', 'diretto'];
  if (!data.tone || !validTones.includes(data.tone)) {
    return { valid: false, error: 'Tono della risposta non valido' };
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
 * Salva la UCMe nel Google Sheet (aggiornato per v2.0)
 */
function saveUcmeToSheet(data) {
  // Genera ID univoco
  const ucmeId = generateUniqueId();
  
  // Ottieni o crea il foglio
  const sheet = getOrCreateSheet();
  
  // Prepara i dati per il foglio (aggiornato con nuovi campi)
  const rowData = [
    ucmeId,                           // A: ID
    data.email,                       // B: Email
    data.text.trim(),                 // C: Testo UCMe
    data.tone,                        // D: Tono richiesto (nuovo)
    data.portatore ? 'SI' : 'NO',     // E: Candidatura Portatore (nuovo)
    new Date(),                       // F: Timestamp
    'in_attesa',                      // G: Stato
    '',                               // H: Portatore Assegnato
    '',                               // I: Risposta
    '',                               // J: Data Risposta
    data.text.length,                 // K: Lunghezza Testo
    getCurrentDateString(),           // L: Data Creazione (formato leggibile)
    data.metadata?.version || '2.0'   // M: Versione (nuovo)
  ];
  
  // Aggiungi la riga al foglio
  sheet.appendRow(rowData);
  
  console.log(`UCMe salvata con ID: ${ucmeId}`);
  return ucmeId;
}

/**
 * Salva candidatura Portatore (nuovo in v2.0)
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
    // Non fermiamo il processo principale per questo errore
  }
}

/**
 * Invia notifica email al team MC (nuovo in v2.0)
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
🎚️ Tono richiesto: ${data.tone}
🤝 Candidatura Portatore: ${data.portatore ? 'SI' : 'NO'}

📝 Testo UCMe:
"${data.text}"

---
Caratteri: ${data.text.length}/600
Versione: ${data.metadata?.version || '2.0'}

Vai al Google Sheet per gestire la risposta:
https://docs.google.com/spreadsheets/d/[ID_FOGLIO]

Mental Commons Team
    `;
    
    // Invia email
    MailApp.sendEmail({
      to: TEAM_EMAIL,
      subject: subject,
      body: body,
      noReply: true
    });
    
    console.log(`Notifica email inviata al team per UCMe: ${ucmeId}`);
    
  } catch (error) {
    console.error('Errore nell\'invio notifica email:', error);
    // Non fermiamo il processo principale per questo errore
  }
}

/**
 * Ottiene il foglio esistente o ne crea uno nuovo (aggiornato per v2.0)
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
 * Ottiene/crea il foglio per i candidati Portatore (nuovo in v2.0)
 */
function getOrCreatePortatoriSheet() {
  let spreadsheet;
  
  try {
    const files = DriveApp.getFilesByName(PORTATORI_SHEET_NAME);
    
    if (files.hasNext()) {
      const file = files.next();
      spreadsheet = SpreadsheetApp.openById(file.getId());
    } else {
      spreadsheet = SpreadsheetApp.create(PORTATORI_SHEET_NAME);
      console.log(`Creato nuovo foglio portatori: ${PORTATORI_SHEET_NAME}`);
    }
    
    const sheet = spreadsheet.getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      setupPortatoriSheetHeaders(sheet);
    }
    
    return sheet;
    
  } catch (error) {
    console.error('Errore nell\'accesso al foglio portatori:', error);
    throw new Error('Impossibile accedere al Google Sheet portatori');
  }
}

/**
 * Configura gli header del foglio UCMe (aggiornato per v2.0)
 */
function setupSheetHeaders(sheet) {
  const headers = [
    'ID',
    'Email',
    'Testo UCMe',
    'Tono Richiesto',       // Nuovo
    'Candidatura Portatore', // Nuovo
    'Timestamp',
    'Stato',
    'Portatore Assegnato',
    'Risposta',
    'Data Risposta',
    'Lunghezza',
    'Data Creazione',
    'Versione'              // Nuovo
  ];
  
  // Aggiungi header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Formattazione header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');
  headerRange.setBorder(true, true, true, true, true, true);
  
  // Imposta larghezza colonne (aggiornato)
  sheet.setColumnWidth(1, 120);   // ID
  sheet.setColumnWidth(2, 200);   // Email
  sheet.setColumnWidth(3, 400);   // Testo UCMe
  sheet.setColumnWidth(4, 100);   // Tono Richiesto
  sheet.setColumnWidth(5, 120);   // Candidatura Portatore
  sheet.setColumnWidth(6, 150);   // Timestamp
  sheet.setColumnWidth(7, 100);   // Stato
  sheet.setColumnWidth(8, 150);   // Portatore Assegnato
  sheet.setColumnWidth(9, 400);   // Risposta
  sheet.setColumnWidth(10, 150);  // Data Risposta
  sheet.setColumnWidth(11, 80);   // Lunghezza
  sheet.setColumnWidth(12, 120);  // Data Creazione
  sheet.setColumnWidth(13, 80);   // Versione
  
  console.log('Header del foglio UCMe configurati (v2.0)');
}

/**
 * Configura gli header del foglio Portatori (nuovo in v2.0)
 */
function setupPortatoriSheetHeaders(sheet) {
  const headers = [
    'ID',
    'Email',
    'Interesse',
    'Timestamp',
    'Data Creazione'
  ];
  
  // Aggiungi header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Formattazione header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e3f2fd');
  headerRange.setBorder(true, true, true, true, true, true);
  
  // Imposta larghezza colonne
  sheet.setColumnWidth(1, 120);  // ID
  sheet.setColumnWidth(2, 250);  // Email
  sheet.setColumnWidth(3, 100);  // Interesse
  sheet.setColumnWidth(4, 150);  // Timestamp
  sheet.setColumnWidth(5, 120);  // Data Creazione
  
  console.log('Header del foglio Portatori configurati');
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
 * Crea una risposta HTTP standardizzata (Google Apps Script gestisce CORS automaticamente)
 */
function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Gestisce le richieste OPTIONS per CORS (Google Apps Script gestisce automaticamente)
 */
function doOptions() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Funzione di utilità per testare lo script (aggiornata per v2.0)
 */
function testScript() {
  const testData = {
    email: 'test@example.com',
    text: 'Questo è un pensiero di test per verificare che tutto funzioni correttamente con le nuove funzionalità della versione 2.0.',
    tone: 'neutro',
    portatore: true,
    key: API_KEY,
    metadata: {
      version: '2.0'
    }
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  try {
    const result = doPost(mockEvent);
    console.log('Test riuscito:', result.getContent());
  } catch (error) {
    console.error('Test fallito:', error);
  }
}

/**
 * Ottieni statistiche UCMe (nuovo in v2.0)
 */
function getUcmeStats() {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { totalUcmes: 0, message: 'Nessuna UCMe trovata' };
    }
    
    // Rimuovi header row
    const ucmeData = data.slice(1);
    
    const stats = {
      totalUcmes: ucmeData.length,
      byTone: {},
      portatoreCandidates: 0,
      lastWeek: 0
    };
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    ucmeData.forEach(row => {
      // Conta per tono
      const tone = row[3] || 'neutro';
      stats.byTone[tone] = (stats.byTone[tone] || 0) + 1;
      
      // Conta candidati portatore
      if (row[4] === 'SI') {
        stats.portatoreCandidates++;
      }
      
      // Conta UCMe ultima settimana
      const ucmeDate = new Date(row[5]);
      if (ucmeDate > oneWeekAgo) {
        stats.lastWeek++;
      }
    });
    
    console.log('Statistiche Mental Commons:', stats);
    return stats;
    
  } catch (error) {
    console.error('Errore nel calcolo statistiche:', error);
    return { error: error.message };
  }
}

/**
 * Esporta dati per backup (nuovo in v2.0)
 */
function exportBackupData() {
  try {
    const ucmeSheet = getOrCreateSheet();
    const portatoreSheet = getOrCreatePortatoriSheet();
    
    const ucmeData = ucmeSheet.getDataRange().getValues();
    const portatoreData = portatoreSheet.getDataRange().getValues();
    
    const backup = {
      ucmes: ucmeData,
      portatori: portatoreData,
      exported: new Date().toISOString(),
      version: '2.0'
    };
    
    console.log('Backup dati creato:', backup);
    return backup;
    
  } catch (error) {
    console.error('Errore nell\'esportazione backup:', error);
    return { error: error.message };
  }
} 