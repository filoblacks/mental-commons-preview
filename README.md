# Mental Commons 2.0 - Estensione Avanzata

> **🧠 Ogni mente è un mondo. Mental Commons è il loro ponte.**

Una piattaforma web avanzata per la riflessione condivisa, con onboarding silenzioso, storico personale, scelta del tono e sistema di candidatura per Portatori.

## 🎯 Obiettivo

Mental Commons 2.0 mantiene l'anima del progetto originale aggiungendo funzionalità per migliorare l'esperienza utente e facilitare l'attivazione dei Portatori, rimanendo fedele ai principi di intimità, lentezza e semplicità.

## 🆕 Novità della versione 2.0

### ✨ Onboarding silenzioso
- Modal di benvenuto alla prima visita
- Messaggio: "Mental Commons è uno spazio per pensieri difficili. Non è terapia. Non è commento. È presenza."
- Memorizzazione automatica in localStorage
- Design minimal non invasivo

### 📚 Storico personale UCMe
- Visualizzazione delle UCMe precedenti filtrando per email (locale)
- Accesso diretto via URL: `mentalcommons.xyz?email=utente@email.com`
- Massimo 5 UCMe più recenti
- Layout diario con data e tono selezionato

### 🎚️ Scelta del tono della risposta
- 4 opzioni disponibili: Calmo, Poetico, Neutro, Diretto
- Select integrato nel form
- Tono incluso nei dati salvati e nelle notifiche

### 🤝 Candidatura a Portatore
- Checkbox opzionale "Mi piacerebbe diventare un Portatore"
- Salvataggio automatico in file separato `portatori.json`
- Registrazione silenziosa senza invii aggiuntivi

### 📧 Notifiche email automatiche
- Email immediata al team MC per ogni nuova UCMe
- Oggetto: "📥 Nuova UCMe ricevuta da [email]"
- Include: testo, tono, candidatura portatore, metadati
- Integrata nel Google Apps Script

## 🚀 Come utilizzare

### 1. Apertura dell'applicazione
```bash
# Navigare nella directory del progetto
cd mental-commons

# Aprire index.html nel browser oppure accedere a mentalcommons.xyz
open index.html
```

### 2. Flusso utente migliorato
1. **Primo accesso**: Modal di onboarding (una volta sola)
2. **Storico email**: Se si accede con `?email=`, visualizza UCMe precedenti
3. **Compilazione form**: Pensiero, email, tono, opzione Portatore
4. **Invio**: Salvataggio locale + Google Sheet + notifica email team
5. **Conferma**: Messaggio di successo e reset form

### 3. Interfaccia utente 2.0
- Stesso design minimalista, dark mode coerente
- Nuovi componenti: modal, select customizzato, sezione storico
- Animazioni leggere per storico e onboarding
- Mobile-first ottimizzato per tutti i nuovi elementi

## 🔧 Funzionalità tecniche avanzate

### Salvataggio dati (aggiornato)
```json
{
  "id": "unique_id",
  "email": "user@email.com",
  "text": "Testo della UCMe...",
  "tone": "calmo",
  "portatore": false,
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "pending",
  "response": null,
  "metadata": {
    "characterCount": 387,
    "userAgent": "Mozilla/5.0...",
    "language": "it-IT",
    "version": "2.0"
  }
}
```

### File Portatori separato
```json
{
  "portatori": [
    {
      "id": "unique_id",
      "email": "portatore@email.com",
      "interesse": true,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Console Debug 2.0
```javascript
// Statistiche complete
MCDebug.getStats()

// Esporta tutti i dati (UCMe + Portatori)
MCDebug.exportAllData()

// Accesso diretto ai dati
MCDebug.ucmeData()
MCDebug.portatoreData()

// Pulizia completa (include onboarding)
MCDebug.clearAllData()
```

## 📁 Struttura del progetto (aggiornata)

```
mental-commons/
├── index.html              # Pagina principale con nuovi elementi
├── style.css               # Stili + modal, storico, select
├── script.js               # Logica completa v2.0
├── google-apps-script.js   # Backend con notifiche email
├── data.json               # UCMe con nuovi campi
├── portatori.json          # Candidature Portatore
├── logo.svg                # Logo Mental Commons
└── README.md               # Documentazione aggiornata
```

## 🎨 Design 2.0

### Componenti aggiuntivi
- **Modal onboarding**: Overlay scuro, contenuto centrato
- **Storico UCMe**: Card scure con metadati
- **Select tono**: Dropdown personalizzato dark mode
- **Animazioni**: fadeIn, slideUp, stagger per storico

### Accessibilità
- Focus states per tutti i nuovi elementi
- Supporto keyboard navigation
- Font size 16px per prevenire zoom mobile
- Outline visibili solo per navigazione da tastiera

## 🔒 Privacy e sicurezza 2.0

### Gestione dati
- **UCMe precedenti**: Visualizzate solo con email corrispondente
- **Candidature Portatore**: Salvate separatamente
- **Onboarding**: Solo flag boolean in localStorage
- **Google Apps Script**: API key sicura, validazione server-side

### Email notifications
- Solo metadati inviati al team (no identificatori personali extra)
- Testo UCMe incluso per facilità di gestione
- Email team configurabile nel Google Apps Script

## 📊 Metriche ampliate

### Nuove metriche v2.0
- Distribuzione per tono delle risposte
- Numero candidature Portatore
- Tasso di completamento onboarding
- UCMe per utente (via email matching)

### Analytics automatico
```javascript
{
  totalUcmes: 150,
  totalPortatori: 23,
  ucmesByTone: {
    calmo: 45,
    poetico: 32,
    neutro: 58,
    diretto: 15
  },
  lastUcme: {...},
  version: "2.0"
}
```

## 🛠 Setup Google Apps Script 2.0

### 1. Aggiornamento script
- Copiare il nuovo `google-apps-script.js`
- Configurare `TEAM_EMAIL` con email del team
- Ripubblicare come Web App

### 2. Nuove funzionalità backend
- Validazione tono della risposta
- Salvataggio candidature Portatore in foglio separato
- Invio automatico notifiche email
- Headers aggiornati per tutti i nuovi campi

### 3. Testing
```javascript
// Testare nel Google Apps Script
testScript() // Testa invio con tutti i nuovi campi
getUcmeStats() // Statistiche complete
exportBackupData() // Backup completo
```

## 🔄 Migrazione da v1.0 a v2.0

### Dati esistenti
- UCMe v1.0 compatibili (campi mancanti valorizzati di default)
- localStorage mantiene dati precedenti
- Nuovi campi aggiunti automaticamente

### Retrocompatibilità
- Form funziona anche senza selezione tono (default: neutro)
- Onboarding non interferisce con utenti esistenti
- Storico vuoto se non ci sono UCMe precedenti

## ⚙️ Configurazione avanzata

### URL Parameters
```
# Mostra storico per email specifica
mentalcommons.xyz?email=utente@example.com

# Reset onboarding (solo per test)
localStorage.removeItem('mc-onboarded')
```

### Personalizzazione toni
Modificare in `script.js` e `google-apps-script.js`:
```javascript
const validTones = ['calmo', 'poetico', 'neutro', 'diretto'];
```

## 🚀 Roadmap post-2.0

### Prossime funzionalità
1. **Matching automatico**: Sistema di assegnazione UCMe-Portatore
2. **Dashboard Portatori**: Interfaccia per gestire risposte
3. **Notifiche progressive**: System di notifiche non invadenti
4. **Analytics avanzati**: Visualizzazione dati aggregati
5. **Mobile App**: Progressive Web App

### Integrazioni future
- **Calendly**: Booking call con Portatori
- **Stripe**: Sistema microdonazioni
- **WebSocket**: Notifiche real-time
- **AI Sentiment**: Analisi tono UCMe (opzionale)

## ⚠️ Note importanti v2.0

- **Onboarding una volta**: Cancellare localStorage per rivedere modal
- **Storico locale**: Solo UCMe con email corrispondente
- **Candidature automatiche**: Nessuna conferma richiesta per Portatori
- **Email team**: Configurare indirizzo corretto in Google Apps Script
- **Backward compatibility**: Tutti i dati v1.0 continuano a funzionare

## 📞 Troubleshooting 2.0

### Modal non appare
```javascript
localStorage.removeItem('mc-onboarded')
location.reload()
```

### Storico non carica
- Verificare email nel localStorage: `MCDebug.ucmeData()`
- Testare con URL parameter: `?email=test@email.com`

### Notifiche email non arrivano
- Controllare configurazione `TEAM_EMAIL` in Google Apps Script
- Verificare permessi MailApp in Google Apps Script
- Testare con `testScript()` nella console GAS

---

**Mental Commons v2.0** - L'evoluzione naturale della riflessione condivisa.
*Non è terapia. Non è commento. È presenza.* 