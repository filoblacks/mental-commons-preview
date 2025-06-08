# 🧠 Mental Commons - Integrazione Google Apps Script

Questa guida ti aiuterà a collegare il modulo UCMe frontend a Google Sheets tramite Google Apps Script.

## 📋 Prerequisiti

- Account Google
- Access a Google Drive e Google Sheets
- Il progetto Mental Commons MVP locale funzionante

## 🚀 Setup Google Apps Script

### 1. Crea il Google Sheet

1. Vai su [Google Sheets](https://sheets.google.com)
2. Crea un nuovo foglio di calcolo
3. Rinominalo `mental_commons_ucme`
4. Lascia il foglio vuoto - gli header verranno creati automaticamente

### 2. Crea il Google Apps Script

1. Vai su [Google Apps Script](https://script.google.com)
2. Crea un nuovo progetto
3. Rinomina il progetto in `Mental Commons UCMe API`
4. Sostituisci tutto il codice con quello contenuto nel file `google-apps-script.js`

### 3. Configura l'API Key

Nel file Google Apps Script, modifica questa linea:

```javascript
const API_KEY = 'mc_2024_secure_key_change_this'; // ⚠️ CAMBIA QUESTA CHIAVE!
```

Sostituisci con una chiave sicura, ad esempio:
```javascript
const API_KEY = 'mc_2024_prod_Tu4_KeY_sIcUrA_hErE';
```

**⚠️ Importante:** Conserva questa chiave in un luogo sicuro!

### 4. Pubblica il Web App

1. Nell'editor Google Apps Script, clicca su "Pubblica" → "Pubblica come app web"
2. Configura:
   - **Versione**: Nuova
   - **Esegui come**: Me
   - **Chi può accedere**: Chiunque
3. Clicca "Pubblica"
4. **Copia l'URL del Web App** - ti servirà per il frontend

### 5. Testa lo Script

1. Nell'editor, esegui la funzione `testScript()` per verificare che tutto funzioni
2. Controlla i log per eventuali errori
3. Verifica che sia stato creato il foglio con gli header corretti

## 🔧 Configurazione Frontend

### 1. Aggiorna la Configurazione

Nel file `mentalcommons-mvp-local/script.js`, trova questa sezione:

```javascript
const GOOGLE_SCRIPT_CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    apiKey: 'mc_2024_secure_key_change_this'
};
```

Sostituisci:
- `YOUR_SCRIPT_ID` con l'URL del tuo Web App
- `mc_2024_secure_key_change_this` con la tua API Key

### 2. Configurazione Tramite Console (Alternativa)

Puoi anche configurare tramite la console del browser:

```javascript
// Apri la console del browser e esegui:
mentalCommons.configure(
    'https://script.google.com/macros/s/TUO_SCRIPT_ID/exec',
    'la_tua_api_key_sicura'
);
```

### 3. Testa la Connessione

Apri la console del browser ed esegui:

```javascript
mentalCommons.testConnection();
```

Se tutto è configurato correttamente, vedrai un messaggio di successo.

## 📊 Struttura del Google Sheet

Il foglio avrà automaticamente queste colonne:

| Colonna | Descrizione |
|---------|-------------|
| A - ID | ID univoco della UCMe |
| B - Email | Email dell'utente |
| C - Testo UCMe | Il contenuto del pensiero |
| D - Timestamp | Data e ora di creazione |
| E - Stato | `in_attesa`, `assegnata`, `completata` |
| F - Portatore | Nome del portatore assegnato |
| G - Risposta | La risposta del portatore |
| H - Data Risposta | Quando è stata data la risposta |
| I - Lunghezza | Numero di caratteri del testo |
| J - Data Creazione | Data leggibile per gli umani |

## 🔧 Funzionalità Avanzate

### Gestione degli Stati

Per gestire manualmente gli stati delle UCMe:

```javascript
// Nel Google Apps Script
function assignUcmeToPortatore(ucmeId, portatoreName) {
    const sheet = getOrCreateSheet(); 
    // Logica per assegnare UCMe...
}

function markUcmeCompleted(ucmeId, response) {
    const sheet = getOrCreateSheet();
    // Logica per completare UCMe...
}
```

### Statistiche

Per ottenere statistiche dal Google Sheet:

```javascript
// Nel Google Apps Script, esegui:
getUcmeStats();
```

### Backup e Export

Il sistema salva automaticamente:
- **Backup locale**: nel localStorage del browser
- **Google Sheet**: storage principale
- **Log**: nella console di Google Apps Script

## 🚨 Risoluzione Problemi

### Errore "Accesso non autorizzato"
- Verifica che l'API Key nel frontend corrisponda a quella nel Google Apps Script

### Errore CORS
- Assicurati che il Web App sia pubblicato con accesso "Chiunque"
- Verifica che l'URL del Web App sia corretto

### UCMe non salvate
- Controlla i log nella console del browser
- Verifica la connessione internet
- Controlla i log di Google Apps Script

### Permessi Google
- Autorizza tutte le richieste di permesso quando pubblichi il Web App
- Verifica di avere accesso al foglio Google Sheets

## 🔄 Flusso Completo

1. **Utente compila form** → Frontend valida i dati
2. **Invio al Google Apps Script** → Verifica API Key e valida dati
3. **Salvataggio nel Google Sheet** → Genera ID e salva con timestamp
4. **Backup locale** → Salva copia nel localStorage
5. **Conferma all'utente** → Mostra messaggio di successo

## 📱 Test in Produzione

Per testare tutto il flusso:

1. Apri `mentalcommons-mvp-local/index.html`
2. Compila il form con un pensiero di test
3. Invia il form
4. Verifica che:
   - Appaia il messaggio di successo
   - La UCMe sia salvata nel Google Sheet
   - Il backup locale sia presente nella console

## 🔒 Sicurezza

- **API Key**: Usa una chiave complessa e non condividerla
- **Accesso Sheet**: Solo tu puoi modificare il Google Sheet
- **Validazione**: Tutti i dati vengono validati lato server
- **Log**: Tutte le operazioni sono registrate nei log

## 📞 Supporto

Per problemi o domande:
1. Controlla i log della console del browser
2. Controlla i log di Google Apps Script
3. Verifica la configurazione seguendo questa guida
4. Testa la connessione con `mentalCommons.testConnection()`

---

**🧠 Mental Commons** - Ogni mente è un mondo. Mental Commons è il loro ponte. 