# 📚 Mental Commons - Documentazione Tecnica Consolidata

## 📋 Indice dei Contenuti

1. [🎯 Panoramica Progetto](#-panoramica-progetto)
2. [🏗️ Architettura e Struttura](#️-architettura-e-struttura)
3. [🚀 Guida Deploy e Setup](#-guida-deploy-e-setup)
4. [💾 Configurazione Database Supabase](#-configurazione-database-supabase)
5. [🧪 Piano di Test](#-piano-di-test)
6. [📦 Sistema di Versionamento](#-sistema-di-versionamento)
7. [🔧 Configurazioni](#-configurazioni)
8. [❓ Troubleshooting](#-troubleshooting)

---

## 🎯 Panoramica Progetto

### Visione
Mental Commons è una piattaforma peer-to-peer per la riflessione condivisa. Permette a chiunque di condividere un pensiero difficile, confuso o importante (una "UCMe") e ricevere una risposta autentica da un'altra persona.

### Flusso Base
1. **Deposita**: L'utente scrive una UCMe (Unità Cognitiva Mentale)
2. **Assegna**: Il sistema abbina la UCMe a un Portatore
3. **Risposta**: Il Portatore risponde entro 48h
4. **Chiusura**: Il Depositor riceve la risposta

### Funzionalità Principali
- **Deposita pensieri**: Condividi riflessioni private e importanti
- **Portatori umani**: Ricevi risposte autentiche, non automatiche
- **Dashboard personale**: Gestisci i tuoi pensieri e risposte
- **Sistema di autenticazione**: Accesso sicuro ai tuoi dati

---

## 🏗️ Architettura e Struttura

### Stack Tecnologico
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js + Express.js su Vercel (serverless)
- **Database**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Autenticazione**: Supabase Auth

### Struttura Directory

```
/mental-commons/
│
├── api/                      # Funzioni serverless Vercel
│   ├── index.js             # Handler principale compatibilità
│   ├── login.js             # Endpoint login
│   ├── register.js          # Endpoint registrazione  
│   ├── ucme.js              # Gestione UCMe
│   ├── ucmes.js             # Lista UCMe
│   ├── supabase.js          # Client Supabase
│   └── ping.js              # Test connettività
│
├── public/                   # Asset statici serviti direttamente
│   ├── script.js            # JavaScript principale
│   ├── style.css            # CSS principale
│   ├── favicon.ico          # Favicon
│   ├── favicon.svg          # Favicon SVG
│   ├── favicon-16x16.svg    # Favicon 16x16
│   ├── favicon-32x32.svg    # Favicon 32x32
│   └── logo.svg             # Logo del progetto
│
├── src/                     # Codice sorgente
│   ├── html/                # File HTML + asset di sviluppo
│   │   ├── index.html       # Homepage
│   │   ├── login.html       # Pagina login
│   │   ├── dashboard.html   # Dashboard utente
│   │   ├── reset-user.html  # Reset dati utente
│   │   ├── components/      # Componenti riutilizzabili
│   │   └── data/           # Dati sviluppo locale
│   ├── assets/              # Media e risorse
│   └── api/                 # API client-side (utility)
│
├── docs/                    # Documentazione consolidata
│   ├── PROJECT-DOCUMENTATION.md  # Questo file
│   ├── README.md           # Documentazione tecnica
│   └── VERSIONING.md       # Sistema versionamento
│
├── scripts/                 # Script di utilità
├── data/                    # Dati JSON legacy (mantenuti per backup)
├── index.html              # Entry point (redirect a src/html/)
├── package.json            # Dipendenze e script NPM
├── vercel.json             # Configurazione Vercel
├── supabase-schema.sql     # Schema database
└── env-template.txt        # Template variabili ambiente
```

---

## 🚀 Guida Deploy e Setup

### URL Funzionanti
- **Production**: https://mental-commons.vercel.app
- **Backend API**: https://mental-commons.vercel.app/api
- **Test Connettività**: https://mental-commons.vercel.app/api/ping

### Prerequisiti
```bash
# Node.js 18+ e npm
node --version
npm --version

# Vercel CLI
npm i -g vercel
```

### Deploy Backend

1. **Clone e Setup**
```bash
git clone https://github.com/filippodelministro/mental-commons
cd mental-commons
npm install
```

2. **Configurazione Variabili Ambiente**
```bash
# Copia template e configura
cp env-template.txt .env.local

# Aggiungi le tue chiavi Supabase:
SUPABASE_URL=https://tuo-progetto.supabase.co  
SUPABASE_SERVICE_KEY=tua-service-key-qui
```

3. **Deploy su Vercel**
```bash
# Login Vercel
vercel login

# Deploy
vercel --prod

# Configura variabili ambiente su Vercel dashboard
```

### Credenziali Test
- **Email**: test@mentalcommons.it
- **Password**: test123

### Endpoint API Disponibili

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/ping` | GET | Test connettività |
| `/api/login` | POST | Login utente |
| `/api/register` | POST | Registrazione |
| `/api/ucme` | POST | Crea/aggiorna UCMe |
| `/api/ucmes` | GET | Lista UCMe utente |

---

## 💾 Configurazione Database Supabase

### Setup Iniziale

1. **Creazione Progetto**
   - Vai su [supabase.com](https://supabase.com)
   - Crea nuovo progetto: `mental-commons-prod`
   - Regione: Europe (Frankfurt)
   - Salva password database

2. **Configurazione Schema**
   ```sql
   -- Esegui in SQL Editor Supabase
   -- Copia contenuto da supabase-schema.sql
   ```

3. **Tabelle Create**
   - ✅ `users` (9 colonne) - Dati utenti
   - ✅ `ucmes` (10 colonne) - Pensieri degli utenti  
   - ✅ `user_sessions` (7 colonne) - Sessioni attive

### Configurazione Autenticazione

```bash
# Impostazioni Auth in Supabase Dashboard:
# - Disabilita email confirmations (per ora)
# - Site URL: https://tuo-dominio.vercel.app
# - Redirect URLs: localhost + production
```

### Variabili Ambiente Richieste

```bash
# SUPABASE CONFIGURATION
SUPABASE_URL=https://tuo-progetto-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...  # Service role key
SUPABASE_DB_PASSWORD=la-tua-password-db
```

### Sicurezza e RLS

- **Row Level Security** abilitato su tutte le tabelle
- **Service key** usata solo server-side 
- **Password hashing** con bcrypt (10 rounds)
- **Policy** configurate per accesso sicuro dati utente

### Monitoraggio

Dashboard Supabase → "Settings" → "Usage":
- 📊 Database storage: 500MB (free tier)
- 📊 API requests: 2M/mese
- 📊 Auth users: 50K
- 📊 Bandwidth: 5GB/mese

---

## 🧪 Piano di Test

### Test Connettività

```javascript
// Test ping backend
fetch('https://mental-commons.vercel.app/api/ping')
  .then(r => r.json())
  .then(console.log)

// Risposta attesa:
{
  "success": true,
  "message": "Backend Mental Commons online",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
  "version": "3.0-supabase"
}
```

### Test CORS e Headers

Verifica presenza headers in Network tab:
- ✅ `Access-Control-Allow-Origin: *`
- ✅ `Access-Control-Allow-Methods: POST, GET, OPTIONS`
- ✅ `Access-Control-Allow-Headers: Content-Type`

### Test Autenticazione

```javascript
// Test registrazione
fetch('https://mental-commons.vercel.app/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User'
  })
}).then(r => r.json()).then(console.log)

// Test login
fetch('https://mental-commons.vercel.app/api/login', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123'
  })
}).then(r => r.json()).then(console.log)
```

### Test Cross-Platform

- ✅ **Desktop**: Browser Chrome/Firefox/Safari
- ✅ **Mobile**: iOS Safari, Android Chrome
- ✅ **Tablet**: Interfaccia responsiva
- ✅ **Offline**: Fallback localStorage

### Criteri Successo

| Test | Status | Descrizione |
|------|--------|-------------|
| Connettività | 🟢 | API risponde < 2s |
| CORS | 🟢 | Headers corretti |
| Registrazione | 🟢 | Nuovo utente creato |
| Login | 🟢 | Autenticazione OK |
| Database | 🟢 | Dati persistenti |
| Cross-device | 🟢 | Sync tra dispositivi |

---

## 📦 Sistema di Versionamento

### Strategia Cache

```javascript
// File HTML - No cache
Cache-Control: no-cache, no-store, must-revalidate

// File CSS/JS - Cache lunga con versioning
Cache-Control: public, max-age=31536000, immutable

// File statici - Cache giornaliera  
Cache-Control: public, max-age=86400
```

### Script NPM Disponibili

```bash
# Aggiorna versioni file senza generarne di nuove
npm run update-versions

# Genera nuova versione e aggiorna tutti i file
npm run bump-version

# Build completo con versionamento
npm run build

# Deploy completo (versione + build)
npm run deploy
```

### File di Configurazione

- **`version.json`**: Versioni correnti CSS/JS
- **`scripts/update-versions.js`**: Script aggiornamento versioni
- **`vercel.json`**: Configurazione cache Vercel

### Esempio Versionamento

```html
<!-- Prima -->
<link rel="stylesheet" href="/style.css?v=2025012305">

<!-- Dopo bump-version -->  
<link rel="stylesheet" href="/style.css?v=2025012310">
```

---

## 🔧 Configurazioni

### package.json

```json
{
  "name": "mental-commons",
  "version": "3.0.0",
  "scripts": {
    "dev": "vercel dev",
    "build": "node scripts/copy-assets.js",
    "deploy": "npm run bump-version && npm run build && vercel --prod",
    "bump-version": "node scripts/update-versions.js bump",
    "update-versions": "node scripts/update-versions.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  }
}
```

### vercel.json

```json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    },
    {
      "source": "/(.*\\.(css|js))$",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "routes": [
    { "src": "/", "dest": "/src/html/index.html" },
    { "src": "/login", "dest": "/src/html/login.html" },
    { "src": "/dashboard", "dest": "/src/html/dashboard.html" }
  ]
}
```

---

## ❓ Troubleshooting

### Errori Comuni

#### ❌ CORS Errors
```bash
# Causa: Headers mancanti o configurazione errata
# Soluzione: Verifica vercel.json e preflight OPTIONS

# Test manual CORS:
curl -X OPTIONS https://mental-commons.vercel.app/api/ping \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

#### ❌ Database Connection Failed
```bash
# Causa: Variabili ambiente mancanti o errate
# Soluzione: Verifica SUPABASE_URL e SUPABASE_SERVICE_KEY

# Test connessione:
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
console.log('Connected:', !!supabase);
"
```

#### ❌ Authentication Errors
```bash
# Causa: Password hash non corretti o RLS policy
# Soluzione: Verifica bcrypt e policy Supabase

# Test SQL diretto:
SELECT email, password_hash FROM users WHERE email = 'test@mentalcommons.it';
```

#### ❌ Cache Issues
```bash
# Causa: Browser cache o CDN
# Soluzione: Hard refresh e bump version

npm run bump-version
# Poi Ctrl+F5 nel browser
```

### Debug Tools

```javascript
// Console debugging
window.MC_DEBUG = true;

// Network monitoring  
console.log('Backend URL:', window.BACKEND_URL);

// Storage check
console.log('LocalStorage:', localStorage.getItem('mc_user'));
```

### Log Monitoring

```bash
# Vercel logs
vercel logs --follow

# Supabase logs
# Dashboard → Logs → Database/API
```

---

## 🚧 Roadmap Tecnico

### ✅ Completato
- Backend Node.js + Express su Vercel
- Database Supabase con RLS
- Sistema autenticazione completo
- CORS configurato correttamente
- Fallback localStorage robusto
- Sistema versionamento asset

### 🔄 In Corso
- Integrazione complete Supabase Auth
- Dashboard avanzata con statistiche
- Sistema notifiche real-time

### 📅 Pianificato
- [ ] API rate limiting
- [ ] Monitoring e analytics avanzati
- [ ] Testing automatizzato (Jest/Cypress)
- [ ] PWA (Progressive Web App)
- [ ] Integrazione sistema pagamenti
- [ ] Dashboard admin

---

## 📞 Supporto e Contributi

### Link Utili
- 📚 [Documentazione Supabase](https://supabase.com/docs)
- 📚 [Documentazione Vercel](https://vercel.com/docs)
- 💬 [Community Discord Supabase](https://discord.supabase.com)

### Segnalazione Bug
1. Verifica questa documentazione
2. Controlla logs Vercel/Supabase  
3. Testa in modalità incognito
4. Apri issue dettagliata su GitHub

### Contributi
1. Fork del repository
2. Branch feature: `git checkout -b feature/nome-feature`
3. Commit: `git commit -m 'Add: descrizione'`
4. Push: `git push origin feature/nome-feature`
5. Pull Request con descrizione dettagliata

---

*Mental Commons - Il contrario di un social. Il prototipo di una mente comune.*

**Ultimo aggiornamento**: Gennaio 2025  
**Versione documentazione**: 3.0  
**Autore**: Mental Commons Team 