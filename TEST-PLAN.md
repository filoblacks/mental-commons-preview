# 🧪 Piano Test Completo - Database Centralizzato Mental Commons

## 📋 OVERVIEW

Questo piano di test verifica sistematicamente il database centralizzato dopo il deploy del fix CORS.

### 🎯 **Obiettivi**
- ✅ Verificare connettività backend
- ✅ Testare operazioni CRUD utenti
- ✅ Validare fallback localStorage
- ✅ Confermare compatibilità cross-platform
- ✅ Eliminare problemi cache/CORS

---

## 🚀 FASE 1: DEPLOY E CONFIGURAZIONE

### **1.1 Deploy Google Apps Script**
- [ ] Backup codice esistente salvato
- [ ] Codice da `google-apps-script-fixed.js` copiato
- [ ] Deploy effettuato con configurazione:
  ```
  Execute as: Me
  Who has access: Anyone
  Description: Mental Commons 3.0 - CORS Fixed
  ```
- [ ] Nuovo URL Web App ottenuto

### **1.2 Configurazione Debug Tool**
- [ ] `debug-backend.html` aperto: `http://localhost:8000/debug-backend.html`
- [ ] Nuovo URL backend aggiornato nella sezione "Aggiorna URL Backend"
- [ ] Test nuovo URL eseguito con successo

---

## 🧪 FASE 2: TEST CONNETTIVITÀ E CORS

### **2.1 Test Base**
- [ ] **Test Connessione** → Status: ✅ Verde
  - Risposta contiene `"version": "3.0-cors-fixed"`
  - Nessun errore CORS in console
- [ ] **Test CORS** → Status: ✅ Verde
  - Headers `Access-Control-Allow-*` presenti
  - OPTIONS request funziona

### **2.2 Test Headers**
Verifica presenza headers in Network tab:
- [ ] `Access-Control-Allow-Origin: *`
- [ ] `Access-Control-Allow-Methods: POST, GET, OPTIONS`
- [ ] `Access-Control-Allow-Headers: Content-Type`

---

## 👤 FASE 3: TEST GESTIONE UTENTI

### **3.1 Test Registrazione**
- [ ] **Test Registrazione** → Status: ✅ Verde
  - Email: `test@mentalcommons.it`
  - Password: `test123`
  - Nome: `Test User`
  - Risposta: `"success": true`

### **3.2 Test Login**
- [ ] **Test Login** → Status: ✅ Verde
  - Stesse credenziali registrazione
  - Risposta include dati utente corretti
  - `lastLogin` aggiornato

### **3.3 Test Sincronizzazione**
- [ ] **Crea Utenti Test Locali** → 3 utenti creati
- [ ] **Test Sincronizzazione** → Status: ✅ Verde
  - Utenti migrati da localStorage a Google Sheet
  - Stats: `created: 3, skipped: 0, errors: 0`

---

## 🔄 FASE 4: TEST CACHE E BROWSER

### **4.1 Test Cache**
- [ ] **Test Cache Headers** → Status: ✅ Verde
  - Cache-Control headers configurati
  - Requests con timestamp unico
- [ ] **Clear All Cache** → Dati locali puliti

### **4.2 Test Modalità Incognito**
- [ ] Apri `debug-backend.html` in finestra incognito
- [ ] **Test Modalità Incognito** → Rileva correttamente incognito
- [ ] **Test Connessione** in incognito → Status: ✅ Verde
- [ ] **Test Login** in incognito → Status: ✅ Verde

---

## 📱💻 FASE 5: TEST CROSS-PLATFORM

### **5.1 Test Ambiente Desktop**
- [ ] **Rileva Ambiente** → Configurazione desktop corretta
- [ ] **Test Desktop** → Score >= 6/8
- [ ] **Test Login** da browser desktop → Funziona

### **5.2 Test Ambiente Mobile**
- [ ] Apri `debug-backend.html` su mobile/tablet
- [ ] **Rileva Ambiente** → Configurazione mobile corretta
- [ ] **Test Mobile** → Score >= 4/7
- [ ] **Test Login** da mobile → Funziona

### **5.3 Test Cross-Environment**
- [ ] Registra utente su desktop
- [ ] Login stesso utente da mobile → Successo
- [ ] Dashboard accessibile da entrambi → Dati sincronizzati

---

## 🌐 FASE 6: TEST INTEGRAZIONE FRONTEND

### **6.1 Test Login System**
- [ ] Vai a: `http://localhost:8000/login.html`
- [ ] Registra nuovo utente
- [ ] Login con utente registrato
- [ ] Redirect a dashboard funziona

### **6.2 Test Dashboard**
- [ ] Vai a: `http://localhost:8000/dashboard.html`
- [ ] Dashboard carica dati utente
- [ ] UCMe dell'utente visualizzate
- [ ] Logout funziona

### **6.3 Test UCMe Flow**
- [ ] Vai a: `http://localhost:8000/`
- [ ] Crea nuova UCMe
- [ ] Verifica salvata in Google Sheet
- [ ] Visibile in dashboard utente

---

## 🚨 FASE 7: TEST FALLBACK E ERRORI

### **7.1 Test Fallback localStorage**
- [ ] Temporaneamente cambia URL backend → URL non valido
- [ ] Prova login → Deve usare fallback localStorage
- [ ] Ripristina URL corretto → Deve tornare a backend

### **7.2 Test Gestione Errori**
- [ ] Test con API key sbagliata → Errore informativo
- [ ] Test con dati non validi → Validazione corretta
- [ ] Test con rete offline → Fallback appropriato

---

## 📊 CRITERI SUCCESSO

### **✅ TUTTI I TEST VERDI**
Ogni sezione del debug tool deve mostrare status verde:
- 🟢 Connettività: ✅
- 🟢 Registrazione: ✅
- 🟢 Login: ✅
- 🟢 Sincronizzazione: ✅
- 🟢 Database: ✅
- 🟢 Cache: ✅
- 🟢 Cross-Platform: ✅

### **📝 LOG DEBUGGING**
- Nessun errore CORS in console
- Response headers corretti
- Timing requests accettabile (<2s)
- Dati persistenti tra sessioni

### **🎯 FUNZIONALITÀ END-TO-END**
- Login unificato desktop ↔ mobile
- Dashboard sincronizzata
- UCMe salvate correttamente
- Fallback robusto offline

---

## 🛟 TROUBLESHOOTING RAPIDO

### **❌ Se Test Connessione fallisce:**
1. Verifica URL deployment corretto
2. Controlla configurazione "Anyone" access
3. Verifica presenza `doOptions()` nel codice
4. Riprova in incognito

### **❌ Se CORS persiste:**
1. Verifica header `createResponse()`
2. Flusso deploy → hard refresh browser
3. Controlla console Network tab per headers

### **❌ Se Registrazione fallisce:**
1. Verifica API_KEY corretta
2. Controlla formato JSON request
3. Verifica permessi Google Sheet creation

---

## 📞 SUPPORT CHECKLIST

Se incontri problemi, verifica:
- [ ] Server sviluppo attivo: `localhost:8000`
- [ ] Debug tool aperto e aggiornato
- [ ] URL backend corretto nel tool
- [ ] Console browser senza errori critici
- [ ] Google Apps Script logs per errori backend

**🎯 Goal: Tutti i test ✅ verdi = Database centralizzato funzionante al 100%!** 