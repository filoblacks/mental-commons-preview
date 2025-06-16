# 🚀 Guida Deploy - Mental Commons

## 📋 Pre-Deploy Checklist

- [ ] Backup del codice attuale salvato
- [ ] File `google-apps-script-fixed.js` aperto e copiato
- [ ] Accesso a Google Apps Script dell'account proprietario

---

## 🔧 PROCEDURA DEPLOY

### **Step 1: Accesso Google Apps Script**
1. Vai su: `https://script.google.com`
2. Apri il progetto Mental Commons esistente con URL:
   `https://script.google.com/macros/s/AKfycbz3lBoOb5I_e2wtE2gArYdlWH7Vqm-9PHiZtJc4VqwA9TWC7t8jFs_oFFQr4YCDOa8dvg/exec`

### **Step 2: Backup Codice Esistente**
1. Seleziona **TUTTO** il codice attuale
2. Copia in un file locale (es. `backup-apps-script-old.js`)
3. ✅ **CRITICO**: Non perdere il backup!

### **Step 3: Sostituzione Codice**
1. **ELIMINA** tutto il codice esistente
2. **INCOLLA** il contenuto completo di `google-apps-script-fixed.js`
3. Verifica che il codice sia completo (dovrebbe iniziare con il commento header)
4. **SALVA** il progetto (Ctrl+S / Cmd+S)

### **Step 4: Deploy Web App**
1. Clicca **"Deploy"** → **"New deployment"**
2. **CONFIGURAZIONE CRITICA**:
   ```
   Type: Web app
   Description: Mental Commons 3.0 - CORS Fixed
   Execute as: Me (proprietario dello script)
   Who has access: Anyone
   ```
3. ⚠️ **IMPORTANTE**: Seleziona "Anyone" per accesso pubblico
4. Clicca **"Deploy"**

### **Step 5: Verifica URL**
1. Copia il nuovo **Web app URL**
2. Dovrebbe essere simile al precedente ma con nuovo deployment ID
3. **TESTA** immediatamente l'URL in browser

### **Step 6: Test Immediato**
```javascript
// Test manuale in console browser:
fetch('TUO_NUOVO_URL_QUI', {
  method: 'POST',
  mode: 'cors',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'ping',
    key: 'mc_2024_filippo_1201_aB3xY9zK2m'
  })
}).then(r => r.json()).then(console.log)
```

---

## ⚠️ TROUBLESHOOTING

### **Errore "Unauthorized"**
- Verifica che API_KEY sia corretta nel codice
- Controlla che il JSON del test sia valido

### **Errore CORS persistente**
- Verifica che `doOptions()` sia presente
- Controlla che `createResponse()` abbia gli header CORS
- Ricarica la pagina e riprova

### **Errore "Script not found"**
- URL deployment potrebbe essere cambiato
- Controlla il nuovo URL nel deployment info

---

## 🧪 TEST VALIDAZIONE

### **Test 1: Ping Response**
```json
// Risposta attesa:
{
  "success": true,
  "message": "Backend Mental Commons online",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
  "version": "3.0-cors-fixed"
}
```

### **Test 2: CORS Headers**
```javascript
// Check CORS headers in Network tab:
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### **Test 3: Error Handling**
```javascript
// Test con key sbagliata:
{
  "success": false,
  "message": "Accesso non autorizzato",
  "received_key": "presente_ma_errata"
}
```

---

## ✅ CONFERMA DEPLOY RIUSCITO

- [ ] Nuovo URL deployment ottenuto
- [ ] Test ping ritorna `"version": "3.0-cors-fixed"`
- [ ] Nessun errore CORS in console browser
- [ ] Headers `Access-Control-Allow-*` presenti in Network tab

**🎯 Se tutti i test sono ✅, il deploy è riuscito!**

## ✅ **Backend Migrato da Google Apps Script a Vercel**

### **Backend API Vercel**
- **URL Production**: `https://mental-commons.vercel.app`
- **Endpoints disponibili**:
  - `GET /ping` - Test connettività
  - `POST /login` - Login utente
  - `POST /register` - Registrazione utente
  - `POST /` - Endpoint compatibilità legacy

### **Credenziali di Test**
- **Email**: `test@mentalcommons.it`
- **Password**: `test123`

### **Deployment**

#### **Backend API**
```bash
# Configurazione per backend API
npm install
npx vercel --prod
```

#### **Frontend**
```bash
# Build del frontend
npm run build

# Deploy frontend (configurazione separata)
# TODO: Configurare deploy frontend separato
```

### **Struttura Progetto**
```
Mental Commons/
├── src/
│   ├── backend/           # 🆕 Backend Node.js
│   │   └── index.js       # Express server con CORS
│   └── html/              # Frontend files
├── api/
│   └── index.js           # Vercel API handler
├── vercel.json            # Configurazione Vercel
└── package.json           # Dipendenze Node.js
```

### **Migrazione Completata**
- ✅ Backend Node.js deployato su Vercel
- ✅ CORS configurato correttamente  
- ✅ Endpoint funzionanti e testati
- ✅ Frontend aggiornato con nuovi URL
- ✅ Compatibilità mantenuta

### **URL Funzionanti**
- **Backend API**: https://mental-commons.vercel.app
- **Test Connettività**: https://mental-commons.vercel.app/ping
- **Login**: https://mental-commons.vercel.app/login
- **Registrazione**: https://mental-commons.vercel.app/register

### **Note Tecniche**
- Express.js con middleware CORS completo
- Gestione preflight OPTIONS requests
- Logging dettagliato per debug
- Endpoint mock per test e sviluppo
- Gestione errori centralizzata

### **Prossimi Passi**
1. Configurare deploy frontend separato
2. Integrare database reale (sostituire mock)
3. Implementare autenticazione JWT completa
4. Aggiungere rate limiting e sicurezza
5. Monitoring e analytics 