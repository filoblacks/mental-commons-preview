# 🏗️ Backend Centralizzato - Mental Commons

## 🎯 **PROBLEMA RISOLTO**

**Problema identificato**: Il sistema creava account separati per ogni ambiente invece di usare un database unificato.

### **Architettura Problematica Precedente:**
- ✅ **UCMe**: Backend centralizzato (Google Apps Script + Sheet)
- ❌ **Utenti**: localStorage locale per ogni dominio/ambiente
- ❌ **Risultato**: Utenti isolati tra desktop, mobile, dev, produzione

---

## 🚀 **SOLUZIONE IMPLEMENTATA**

### **1. 📋 Estensione Google Apps Script**

**File**: `scripts/google-apps-script-users.js`

**Nuove API aggiunte:**
```javascript
POST /login     → Verifica credenziali centralizzate
POST /register  → Crea utente nel Google Sheet
GET /getUser    → Recupera dati utente
POST /syncUsers → Migra utenti localStorage → Sheet
```

**Nuovo Google Sheet**: `mental_commons_users`
```
| ID | Email | Password | Nome | Data Creazione | Ultimo Login | Stato | Portatore |
```

### **2. 🔄 Frontend Ibrido con Fallback**

**Nuova logica Login/Registrazione:**
```javascript
// 1. Prova backend centralizzato
try {
    result = await loginWithBackend(email, password)
    if (success) → Login immediato
} catch {
    // 2. Fallback localStorage locale
    fallback_to_localStorage()
}
```

**Vantaggi:**
- ✅ **Utenti unificati** tra tutti gli ambienti quando backend disponibile
- ✅ **Fallback robusto** a localStorage se backend offline
- ✅ **Migrazione graduale** senza perdere utenti esistenti
- ✅ **Backward compatibility** totale

---

## 🛠️ **SETUP BACKEND**

### **Passo 1: Aggiorna Google Apps Script**

1. Apri il Google Apps Script esistente: 
   `https://script.google.com/macros/s/AKfycbwBV2QrQpzKtmC-_w1fG8lPy3V_d04SLPxnpSOBwfXi9qLXhTGCR95qym85Qlpuwu2ozQ/exec`

2. **Aggiungi** il codice da `scripts/google-apps-script-users.js` 

3. **Modifica la funzione `doPost` esistente** per gestire le nuove azioni:
   ```javascript
   // Aggiungi PRIMA della gestione UCMe esistente:
   if (requestData.action === 'register') return handleUserRegistration(requestData);
   if (requestData.action === 'login') return handleUserLogin(requestData);
   if (requestData.action === 'getUser') return handleGetUser(requestData);
   if (requestData.action === 'syncUsers') return handleSyncUsers(requestData);
   
   // ... resto del codice UCMe esistente
   ```

4. **Rideploy** il Web App

### **Passo 2: Test Backend**

```javascript
// Console browser
await testBackendLogin() // Test login centralizzato
await syncUsersToBackendDebug() // Migra utenti localStorage
```

---

## 📱 **COMANDI DEBUG MOBILE**

### **Triplo Tap → Debug Panel:**
- **Debug**: Log completo sistema  
- **Users**: Mostra utenti localStorage
- **Crea**: Crea utente test rapido
- **Sync ⬆️**: Sincronizza localStorage → Backend  
- **Test Backend**: Test login backend

### **Console Commands:**
```javascript
debugMC.showPanel()           // Debug panel
await loginWithBackend(email, pwd) // Test login diretto
await syncUsersToBackend()    // Sync programmatico
```

---

## 🔄 **PROCESSO MIGRAZIONE**

### **Scenario A: Backend Funzionante**
1. **Utente prova login** → Cerca nel backend centralizzato
2. **Se trovato** → Login immediato cross-ambiente  
3. **Se non trovato** → Fallback localStorage  

### **Scenario B: Backend Offline**
1. **Utente prova login** → Errore connessione backend
2. **Fallback automatico** → localStorage locale
3. **Login funziona** come prima

### **Scenario C: Migrazione Dati**
1. **Triplo tap** → Debug panel → **"Sync ⬆️"**
2. **Carica utenti** localStorage → Google Sheet
3. **Futuro login** usa backend centralizzato

---

## 📊 **RISULTATI ATTESI**

### **✅ Login Unificato**
```
Desktop (chrome.com) + Mobile (preview.com) + Dev (localhost)
              ↓
    Stesso account Google Sheet
              ↓
        Login cross-ambiente
```

### **✅ Migrazione Trasparente**
- **Utenti esistenti**: Funzionano come prima (localStorage)
- **Nuovi utenti**: Creati nel backend centralizzato  
- **Sync manuale**: Migra vecchi utenti quando voluto

### **✅ Debug Avanzato**
```javascript
// Log console attesi:
🌐 Tentativo login con backend centralizzato...
✅ Login backend riuscito: { user: { email, id, name } }

// Se backend offline:
⚠️ Backend non disponibile, fallback a localStorage
📱 Fallback a login localStorage...
```

---

## ⚠️ **SICUREZZA**

**Nota**: Il sistema attuale salva password in chiaro per semplicità di sviluppo.

**Per produzione**, modifica `handleUserRegistration`:
```javascript
// Invece di:
data.password

// Usa:
const hashedPassword = Utilities.computeDigest(
  Utilities.DigestAlgorithm.SHA_256, 
  data.password
);
```

---

## 🎯 **TEST FINALE**

### **Test 1: Cross-Ambiente**
1. Registra utente su **desktop**
2. Prova login da **mobile** → Dovrebbe funzionare!

### **Test 2: Fallback**  
1. Disattiva internet
2. Prova login → Dovrebbe usare localStorage

### **Test 3: Sincronizzazione**
1. Utente esistente localStorage
2. Triplo tap → "Sync ⬆️"  
3. Verifica nel Google Sheet

---

## 🌟 **VANTAGGI FINALI**

- ✅ **Database unificato** per utenti (come per UCMe)
- ✅ **Login cross-ambiente** Desktop ↔ Mobile ↔ Dev
- ✅ **Fallback robusto** se backend offline
- ✅ **Migrazione graduale** senza perdita dati
- ✅ **Debug tools** avanzati mobile-friendly
- ✅ **Backward compatibility** al 100%

**Il sistema ora ha architettura coerente**: Database centralizzato sia per UCMe che per Utenti! 🎉 