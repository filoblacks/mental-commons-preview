# 🔧 DEBUG-CHECKLIST - Mental Commons

## ✅ **AGGIORNATO PER BACKEND VERCEL**

### **🎯 Backend Migrato a Vercel**
- **URL Production**: `https://mental-commons.vercel.app`
- **Tipo**: Node.js Express Server su Vercel
- **CORS**: Configurato e funzionante ✅

### **📡 Test Connettività Backend**

#### **1. Test Ping**
```bash
curl -X GET "https://mental-commons.vercel.app/ping"
```
**Risposta attesa**:
```json
{
  "status": "ok",
  "message": "Mental Commons Backend attivo",
  "time": "2025-06-16T18:19:56.971Z",
  "version": "1.0.0"
}
```

#### **2. Test Login**
```bash
curl -X POST "https://mental-commons.vercel.app/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mentalcommons.it","password":"test123"}'
```
**Risposta attesa**:
```json
{
  "success": true,
  "message": "Login effettuato con successo",
  "user": {
    "id": "user_123",
    "email": "test@mentalcommons.it",
    "name": "Test User",
    "role": "user"
  },
  "token": "mock_jwt_token_..."
}
```

#### **3. Test Registrazione**
```bash
curl -X POST "https://mental-commons.vercel.app/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"nuovo@test.it","password":"test123","name":"Nuovo Utente"}'
```

### **🌐 Debug CORS**

#### **Headers CORS Attesi**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization`

#### **Test Preflight**
```bash
curl -X OPTIONS "https://mental-commons.vercel.app/login" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

### **🔍 Debug Frontend**

#### **1. Verifica URL Backend**
- Apri `debug-backend.html`
- Controlla che l'URL sia: `https://mental-commons.vercel.app`
- Testa connettività dal browser

#### **2. Console Browser**
- Verifica logs del tipo: `📡 URL: https://mental-commons.vercel.app`
- Nessun errore CORS
- Response status 200

### **📱 Debug Mobile**

#### **Problemi Comuni Risolti**
- ✅ CORS configurato correttamente
- ✅ Headers HTTP appropriati
- ✅ Support per preflight requests
- ✅ Gestione errori migliorata

#### **Test Mobile Chrome**
1. Apri `https://mental-commons-9saew5t2q-filippos-projects-185ecdda.vercel.app/debug-backend.html`
2. Testa connettività
3. Verifica login con `test@mentalcommons.it / test123`

### **🚨 Troubleshooting**

#### **Se Backend Non Risponde**
1. Controlla status su: https://vercel.com/filippos-projects-185ecdda/mental-commons
2. Verifica logs di deploy
3. Riprova deploy: `npx vercel --prod`

#### **Se CORS Non Funziona**
1. Il backend Vercel gestisce CORS automaticamente
2. Verifica che l'endpoint esista
3. Controlla logs di rete nel browser

#### **Se Login Fallisce**
1. Usa credenziali test: `test@mentalcommons.it / test123`
2. Verifica formato JSON della richiesta
3. Controlla response status e body

### **✅ Stato Migrazione**
- 🟢 Backend Node.js deployato su Vercel
- 🟢 CORS funzionante
- 🟢 Endpoint testati e operativi
- 🟢 Frontend aggiornato
- 🟢 Debug tools funzionanti

### **📞 Supporto**
- URL Backend: `https://mental-commons.vercel.app`
- Dashboard Vercel: `https://vercel.com/filippos-projects-185ecdda/mental-commons`
- Test rapido: `curl https://mental-commons.vercel.app/ping`

## 📋 Riepilogo Problemi Identificati

### ❌ PROBLEMA PRINCIPALE: CORS NON CONFIGURATO
**Causa**: Google Apps Script non ha gli header CORS necessari
**Impatto**: Frontend non riesce a connettersi al backend
**Status**: 🔧 **FIX DISPONIBILE** in `google-apps-script-fixed.js`

---

## ✅ CHECKLIST RISOLUZIONE

### 🎯 FASE 1: Fix Backend Google Apps Script

- [ ] **1.1 Backup Script Esistente**
  - Copia il codice attuale del Google Apps Script
  - Salva come backup locale

- [ ] **1.2 Applica Fix CORS**
  - Sostituisci **TUTTO** il codice con `google-apps-script-fixed.js`
  - Verifica presenza funzione `doOptions()` con header CORS
  - Verifica funzione `createResponse()` con header CORS

- [ ] **1.3 Rideploy Web App**
  - Salva il nuovo codice
  - Deploy → New deployment
  - Tipo: Web app
  - Execute as: Me
  - Who has access: Anyone

- [ ] **1.4 Test Connettività**
  - Usa `debug-backend.html` per testare
  - Test "Connessione" deve essere ✅ verde
  - Test CORS deve essere ✅ verde

### 🎯 FASE 2: Verifica Database Structure

- [ ] **2.1 Controllo Fogli Google Sheets**
  - [ ] Foglio `mental_commons_ucme` esiste
  - [ ] Foglio `mental_commons_users` esiste  
  - [ ] Foglio `mental_commons_portatori` esiste
  - [ ] Header corretti in tutti i fogli

- [ ] **2.2 Test Operazioni Database**
  - [ ] Registrazione nuovo utente ✅
  - [ ] Login utente esistente ✅
  - [ ] Recupero dati utente ✅
  - [ ] Sincronizzazione localStorage ✅

### 🎯 FASE 3: Test Frontend Integration

- [ ] **3.1 Test Login System**
  - Prova registrazione da `login.html`
  - Prova login da `login.html`
  - Verifica redirect a dashboard

- [ ] **3.2 Test Dashboard**
  - Dashboard carica correttamente
  - Dati utente visualizzati
  - UCMe dell'utente mostrate

- [ ] **3.3 Test Cross-Environment**
  - Login su desktop funziona
  - Login su mobile funziona
  - Stesso utente tra ambienti

### 🎯 FASE 4: Test Edge Cases

- [ ] **4.1 Fallback localStorage**
  - Con backend offline, sistema usa localStorage
  - Con backend online, sistema usa backend
  - Migrazione trasparente tra i due

- [ ] **4.2 Gestione Errori**
  - Errori rete gestiti correttamente
  - Messaggi utente informativi
  - Log debug disponibili

---

## 🚨 PROBLEMI SPECIFICI IDENTIFICATI

### 1. **CORS Headers Mancanti**
```javascript
// ❌ PROBLEMA: doOptions() vuota
function doOptions() {
  return ContentService.createTextOutput('');
}

// ✅ SOLUZIONE: doOptions() con CORS
function doOptions() {
  return ContentService
    .createTextOutput('')
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}
```

### 2. **Response Headers Mancanti** 
```javascript
// ❌ PROBLEMA: createResponse() senza CORS
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ✅ SOLUZIONE: createResponse() con CORS
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}
```

### 3. **Frontend Fallback Incompleto**
```javascript
// ⚠️ MIGLIORAMENTO: Gestione errori più robusta nel frontend
async function loginWithBackend(email, password) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors', // ← CRITICO: mode CORS
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Backend error:', error);
    // Fallback a localStorage se CORS fallisce
    return loginWithLocalStorage(email, password);
  }
}
```

---

## 🧪 COMANDI DEBUG RAPIDI

### **Debug Panel Mobile**
```javascript
// Triplo tap su mobile per aprire debug panel
debugMC.showPanel()

// Test funzioni specifiche
await testBackendLogin()
await syncUsersToBackendDebug()
showUsers()
```

### **Debug Browser Console**
```javascript
// Test connessione diretta
fetch('https://script.google.com/.../exec', {
  method: 'POST',
  mode: 'cors',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'ping',
    key: 'mc_2024_filippo_1201_aB3xY9zK2m'
  })
}).then(r => r.json()).then(console.log)

// Verifica localStorage
console.log('Utenti locali:', JSON.parse(localStorage.getItem('mc-users') || '[]'))
console.log('Utente corrente:', JSON.parse(localStorage.getItem('mc-current-user') || 'null'))
```

---

## 📊 STATUS ATTUALE

| Componente | Status | Note |
|------------|---------|------|
| 🖥️ Server di sviluppo | ✅ **ONLINE** | `localhost:8000` |
| 🔧 Debug tool | ✅ **CREATO** | `debug-backend.html` |
| 🐛 Fix CORS | ✅ **PRONTO** | `google-apps-script-fixed.js` |
| 📱 Frontend | ⚠️ **PARZIALE** | Deve usare backend fisso |
| 🗄️ Database | ❌ **NON TESTATO** | Richiede deploy fix |

---

## 🎯 PROSSIMI PASSI

1. **IMMEDIATO**: Deploy `google-apps-script-fixed.js` su Google Apps Script
2. **TEST**: Usa `debug-backend.html` per verificare connettività
3. **VERIFICA**: Test completo flusso registrazione/login
4. **OTTIMIZZAZIONE**: Miglioramenti prestazioni e UX

---

## 📞 SUPPORTO

Se incontri problemi:
1. Controlla i log del debug tool
2. Verifica console browser per errori CORS
3. Controlla log Google Apps Script per errori backend
4. Usa funzioni test integrate per isolamento problemi

**Il problema principale è CORS - una volta risolto, tutto il sistema dovrebbe funzionare! 🚀** 