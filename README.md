# Mental Commons

Mental Commons è una piattaforma peer-to-peer per la riflessione condivisa. Permette a chiunque di condividere un pensiero difficile, confuso o importante (una "UCMe") e ricevere una risposta autentica da un'altra persona.

## 🏗️ Struttura del Progetto

```
/mental-commons/
│
├── public/                # File pubblici statici
│   ├── logo.svg          # Logo del progetto
│   └── favicon.ico       # Favicon
│
├── src/                   # Codice sorgente front-end
│   ├── assets/            # Fonts, immagini, icone extra
│   ├── css/
│   │   └── style.css     # Stili principali
│   ├── js/
│   │   ├── script.js     # Script principale homepage
│   │   ├── dashboard.js  # Script dashboard utente
│   │   ├── login.js      # Script autenticazione
│   │   └── test-ucme-function.js # Script di test
│   └── html/             # Template HTML (backup)
│       ├── index.html
│       ├── login.html
│       ├── dashboard.html
│       ├── reset-user.html
│       └── components/   # Componenti riutilizzabili (futuro)
│
├── data/                 # Archivi e database statici (JSON)
│   ├── data.json        # UCMe (pensieri) degli utenti
│   ├── risposte.json    # Risposte dei portatori
│   └── portatori.json   # Dati dei portatori
│
├── scripts/              # Script esterni (GAS, CLI, ecc.)
│   └── google-apps-script.js # Integrazione Google Sheets
│
├── docs/                 # Documentazione del progetto
│   ├── README.md         # Documentazione tecnica originale
│   ├── CORS_FIX_INSTRUCTIONS.md
│   ├── DASHBOARD_UPGRADE_README.md
│   └── SETUP_GOOGLE_INTEGRATION.md
│
├── index.html           # Homepage (punto di accesso)
├── login.html           # Pagina di login
├── dashboard.html       # Dashboard utente
├── reset-user.html      # Utility reset dati
├── .gitignore
└── README.md            # Questo file
```

## 🚀 Come iniziare

1. Apri `index.html` nel browser per accedere all'applicazione
2. Compila una UCMe (Unità Cognitiva Mentale) - un pensiero autentico
3. Ricevi una risposta da un Portatore entro 48 ore

## 📋 Funzionalità principali

- **Deposita pensieri**: Condividi riflessioni private e importanti
- **Portatori umani**: Ricevi risposte autentiche, non automatiche
- **Dashboard personale**: Gestisci i tuoi pensieri e risposte
- **Sistema di autenticazione**: Accesso sicuro ai tuoi dati

## 🔧 Sviluppo

La struttura è stata riorganizzata per essere modulare e scalabile:

- I file HTML principali sono accessibili dalla root per compatibilità
- I sorgenti sono organizzati in `src/` per chiarezza
- I dati JSON sono separati in `data/` per facilità di gestione
- La documentazione è raccolta in `docs/`

## 📖 Documentazione

Per informazioni tecniche dettagliate, consulta i file in `docs/`:

- [Setup Google Integration](docs/SETUP_GOOGLE_INTEGRATION.md)
- [Dashboard Upgrade](docs/DASHBOARD_UPGRADE_README.md) 
- [CORS Fix Instructions](docs/CORS_FIX_INSTRUCTIONS.md)

---

*Mental Commons - Il contrario di un social. Il prototipo di una mente comune.* 