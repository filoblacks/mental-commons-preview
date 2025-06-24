# Mental Commons

Mental Commons è una piattaforma peer-to-peer per la riflessione condivisa. Permette a chiunque di condividere un pensiero difficile, confuso o importante (una "UCMe") e ricevere una risposta autentica da un'altra persona.

**Niente diagnosi, niente terapia, niente guru. Solo umani che si pensano a vicenda.**

## 🏗️ Struttura del Progetto

```
/mental-commons/
│
├── api/                   # API Serverless (Vercel Functions)
│   ├── login.js          # Endpoint autenticazione
│   ├── register.js       # Endpoint registrazione
│   ├── ucme.js           # Endpoint gestione UCMe
│   ├── ucmes.js          # Endpoint elenco UCMe
│   ├── ping.js           # Endpoint health check
│   ├── users.js          # Endpoint gestione utenti
│   └── supabase.js       # Configurazione database
│
├── data/                 # Dati statici (JSON)
│   ├── data.json        # UCMe (pensieri) degli utenti
│   ├── risposte.json    # Risposte dei portatori
│   └── portatori.json   # Dati dei portatori
│
├── scripts/              # Script utilità
│   ├── deploy.sh        # Script di deploy
│   ├── generate-favicons.sh # Generazione favicon
│   └── update-versions.js # Aggiornamento versioni
│
├── docs/                 # Documentazione
│   ├── PROJECT-DOCUMENTATION.md
│   ├── README.md
│   ├── DASHBOARD_UPGRADE_README.md
│   ├── VERSIONING.md
│   ├── legacy-tests/     # File di test archiviati
│   ├── legacy-sql/       # File SQL archiviati
│   └── legacy-notes/     # Documentazione legacy
│
├── index.html           # Homepage principale
├── login.html           # Pagina di login
├── dashboard.html       # Dashboard utente
├── reset-user.html      # Utility reset dati
├── script.js            # JavaScript principale
├── style.css            # Stili CSS
├── logo.svg             # Logo del progetto
├── favicon.svg          # Favicon SVG
├── favicon-16x16.svg    # Favicon 16x16
├── favicon-32x32.svg    # Favicon 32x32
├── favicon.ico          # Favicon ICO
├── supabase-schema.sql  # Schema database consolidato
├── vercel.json          # Configurazione Vercel
├── package.json         # Dipendenze Node.js
├── version.json         # Versione del progetto
└── env-template.txt     # Template variabili ambiente
```

## 🚀 Deploy e Sviluppo

### Prerequisiti
- Node.js >= 18.0.0
- Account Vercel
- Database Supabase

### Setup Locale
```bash
# Installa dipendenze
npm install

# Copia template environment
cp env-template.txt .env

# Avvia server di sviluppo
npm run dev
```

### Deploy
```bash
# Deploy su Vercel
npm run deploy
```

## 🚀 NOVITÀ SPRINT 2: Real-Time Sync & Conflict Resolution

### ✨ Sistema di Sincronizzazione Real-Time
- **📡 Supabase Realtime**: Notifiche istantanee per tutte le operazioni UCMe
- **🔄 Cross-Device Sync**: UCMe sincronizzate automaticamente tra tutti i dispositivi entro 2 secondi
- **📱 Background Sync Worker**: Gestione automatica offline/online con coda persistente
- **⚔️ Conflict Resolution**: Risoluzione automatica conflitti con policy "last write wins"
- **🧪 Testing Tools**: Tool completo per verifica sincronizzazione multi-device (`test-realtime-sync.html`)

### 🛡️ Robustezza & Sicurezza
- **🔄 Retry Automatico**: Exponential backoff per operazioni fallite
- **📋 Fallback Mode**: Polling automatico quando Realtime non disponibile  
- **💾 Persistenza Dati**: Coda sync salvata in localStorage per zero perdite dati
- **🎯 User Isolation**: Ogni utente vede solo le proprie UCMe in real-time

---

## 📋 Funzionalità principali

### 🔄 Flusso Base
1. **Deposita**: L'utente scrive una UCMe (Unità Cognitiva Mentale)
2. **Assegna**: Il sistema abbina la UCMe a un Portatore
3. **Risposta**: Il Portatore risponde entro 48h
4. **Chiusura**: Il Depositor riceve la risposta

### 🤝 Ruoli
- **Depositor**: Chiunque con un pensiero da condividere
- **Portatore**: Utente formato per rispondere con empatia

### 💰 Caratteristiche
- **Freemium**: Accesso gratuito per tutti
- **Microdonazioni**: Ringraziamenti opzionali 1-5€
- **B2B**: Pacchetti aziendali e scolastici

## 🔧 Architettura Tecnica

### Stack Tecnologico
- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Backend**: Node.js serverless (Vercel Functions)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Autenticazione**: JWT + bcrypt

### API Endpoints
- `POST /api/register` - Registrazione utente
- `POST /api/login` - Login utente
- `POST /api/ucme` - Creazione UCMe
- `GET /api/ucmes` - Elenco UCMe
- `GET /api/ping` - Health check

### Database
Il database è strutturato con:
- **users**: Utenti registrati
- **ucmes**: Pensieri condivisi
- **user_sessions**: Sessioni di login

Schema completo in `supabase-schema.sql`

## 📊 Metriche Chiave
- % di UCMe con risposta entro 48h
- Utenti attivi mensili (Depositor/Portatori)
- Portamenti completati
- Tasso di donazioni per UCMe

## 🌟 Filosofia

Mental Commons non è terapia né self-help. È uno strumento cognitivo per l'epoca dell'overload informativo. Le persone hanno bisogno di pensare insieme, e questa piattaforma offre uno spazio digitale dove i pensieri fragili vengono contenuti da umani reali.

---

*Il contrario di un social. Il prototipo di una mente comune.* 