/**
 * 🔧 CORREZIONE CORS - Aggiungi/Sostituisci nel Google Apps Script
 */

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

/**
 * Versione aggiornata createResponse con header CORS espliciti
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