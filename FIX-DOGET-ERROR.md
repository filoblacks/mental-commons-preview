# 🚨 FIX URGENTE: Errore "Script function not found: doGet"

## ❌ **PROBLEMA RILEVATO**

URL: `https://script.google.com/macros/s/AKfycbz3lBoOb5I_e2wtE2gArYdlWH7Vqm-9PHiZtJc4VqwA9TWC7t8jFs_oFFQr4YCDOa8dvg/exec`

**Errore**: `Script function not found: doGet`

## 🎯 **CAUSA DEL PROBLEMA**

Il Google Apps Script è stato deployato ma ha un problema di configurazione:
1. **Possibile causa 1**: Il codice non è stato incollato correttamente
2. **Possibile causa 2**: Il deployment è configurato in modo errato
3. **Possibile causa 3**: La funzione `doPost` non è riconosciuta

---

## 🔧 **SOLUZIONI IMMEDIATE**

### **SOLUZIONE 1: Verifica Codice Script**

1. **Vai su Google Apps Script**:
   - https://script.google.com
   - Apri il progetto Mental Commons

2. **Verifica il codice**:
   - Il file deve iniziare con:
   ```javascript
   /**
    * Mental Commons 3.0 - Google Apps Script CORRETTO con CORS
    */
   ```
   - Deve contenere la funzione `doPost(e)` (NON `doGet`)
   - Deve contenere la funzione `doOptions(e)`

3. **Se il codice è incompleto**:
   - Cancella TUTTO
   - Incolla TUTTO il contenuto da `google-apps-script-fixed.js`
   - **SALVA** (Ctrl+S / Cmd+S)

### **SOLUZIONE 2: Re-Deploy Corretto**

1. **Nuovo Deployment**:
   - Deploy → **"New deployment"** (non "Manage deployments")
   - **Type**: Web app
   - **Description**: Mental Commons 3.0 - Fix doGet
   - **Execute as**: Me (owner of the script)  
   - **Who has access**: Anyone
   
2. **⚠️ CRITICO**: Assicurati che sia "Anyone", non "Anyone with Google account"

3. **Deploy** e copia il **NUOVO URL**

### **SOLUZIONE 3: Aggiungi funzione doGet (Workaround)**

Se continua a dare errore, aggiungi questa funzione **SOPRA** a `doPost()`:

```javascript
/**
 * Gestisce richieste GET (redirect a POST per compatibilità)
 */
function doGet(e) {
  return ContentService
    .createTextOutput('Mental Commons Backend is running. Use POST requests for API calls.')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}
```

---

## 🧪 **TEST IMMEDIATO**

### **Test 1: Verifica doGet risolto**
Apri in browser: `https://script.google.com/macros/s/AKfycbz3lBoOb5I_e2wtE2gArYdlWH7Vqm-9PHiZtJc4VqwA9TWC7t8jFs_oFFQr4YCDOa8dvg/exec`

**Risultato atteso**: 
- ✅ **Successo**: "Mental Commons Backend is running..."
- ❌ **Fallimento**: Stesso errore doGet

### **Test 2: Verifica doPost funziona**
Console browser:
```javascript
fetch('https://script.google.com/macros/s/AKfycbz3lBoOb5I_e2wtE2gArYdlWH7Vqm-9PHiZtJc4VqwA9TWC7t8jFs_oFFQr4YCDOa8dvg/exec', {
  method: 'POST',
  mode: 'cors',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'ping',
    key: 'mc_2024_filippo_1201_aB3xY9zK2m'
  })
}).then(r => r.json()).then(console.log)
```

**Risultato atteso**:
```json
{
  "success": true,
  "message": "Backend Mental Commons online",
  "version": "3.0-cors-fixed"
}
```

---

## 🚨 **SE IL PROBLEMA PERSISTE**

### **Diagnostica Avanzata**

1. **Controlla Google Apps Script Logs**:
   - Vai in Google Apps Script
   - View → "Executions" per vedere errori

2. **Verifica Permessi**:
   - Il deployment deve avere permessi di esecuzione
   - Account deve avere permessi di creazione Sheets

3. **Re-create completo**:
   - Crea un NUOVO Google Apps Script project
   - Incolla il codice completo
   - Deploy come nuovo Web App

---

## ✅ **CONFERMA FIX RIUSCITO**

- [ ] URL in browser non mostra errore doGet
- [ ] Test POST ritorna JSON con `"success": true`
- [ ] Debug tool si connette con successo
- [ ] Test registrazione/login funzionano

**🎯 Una volta risolto doGet, tutto il resto dovrebbe funzionare immediatamente!**

---

## 📞 **SUPPORTO URGENTE**

Se nessuna soluzione funziona:
1. Controlla che il codice `google-apps-script-fixed.js` sia completo
2. Verifica la configurazione deployment "Execute as: Me, Access: Anyone"
3. Prova a creare un nuovo progetto Google Apps Script da zero

**Il problema doGet è solo una configurazione - il fix CORS è corretto! 🚀** 