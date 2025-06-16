# Sistema di Versionamento CSS/JS - Mental Commons

## 📋 Panoramica

Il sistema di versionamento garantisce che gli utenti vedano sempre l'ultima versione dei file CSS e JavaScript, evitando problemi di cache del browser.

## 🎯 Obiettivi

- **Niente cache stale**: Gli utenti vedono sempre l'ultima versione
- **Automatizzazione**: Il versionamento avviene automaticamente
- **Performance**: Cache ottimizzata per diversi tipi di file
- **Trasparenza**: Versioni chiare e tracciabili

## 🏗️ Architettura

### File di Configurazione

- **`version.json`**: Contiene le versioni correnti di CSS e JS
- **`scripts/update-versions.js`**: Script per aggiornare le versioni nei file HTML
- **`scripts/deploy.sh`**: Script completo di deploy con versionamento

### Strategia di Cache

#### File HTML
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

#### File CSS/JS Versionati
```
Cache-Control: public, max-age=31536000, immutable
```

#### File Statici (SVG, ICO)
```
Cache-Control: public, max-age=86400
```

## 🚀 Utilizzo

### Comandi Disponibili

```bash
# Aggiorna versioni senza generarne di nuove
npm run update-versions

# Genera una nuova versione e aggiorna tutti i file
npm run bump-version

# Build completo con versionamento
npm run build

# Deploy completo (genera versione + build)
npm run deploy
```

### Flusso di Lavoro Tipico

1. **Modifiche al codice CSS/JS**
   ```bash
   # Edita src/html/style.css o src/html/script.js
   ```

2. **Deploy**
   ```bash
   npm run deploy
   ```

3. **Commit**
   ```bash
   git add .
   git commit -m "Update asset versions"
   git push
   ```

## 📁 Struttura File

```
/
├── version.json              # Configurazione versioni
├── package.json             # Script NPM
├── vercel.json              # Configurazione cache Vercel
├── scripts/
│   ├── update-versions.js   # Script aggiornamento versioni
│   └── deploy.sh           # Script deploy completo
├── src/html/               # File sorgente HTML
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── style.css          # CSS principale
│   └── script.js          # JavaScript principale
└── public/                # Asset statici
    ├── style.css         # Copiato da src/html/
    └── script.js         # Copiato da src/html/
```

## 🔄 Come Funziona

1. **Generazione Versione**: Basata su timestamp (YYYYMMDDHHMM)
2. **Aggiornamento HTML**: Regex sostituisce le versioni nei link CSS/JS
3. **Build**: Copia asset da `public/` a `src/html/`
4. **Deploy**: Vercel usa la configurazione cache ottimizzata

### Esempio di Versionamento

**Prima:**
```html
<link rel="stylesheet" href="/style.css?v=2025012305">
<script src="/script.js"></script>
```

**Dopo npm run bump-version:**
```html
<link rel="stylesheet" href="/style.css?v=2025012310">
<script src="/script.js?v=2025012310"></script>
```

## 🛠️ Troubleshooting

### Cache non aggiornata?
1. Verifica che i file HTML contengano le nuove versioni
2. Controlla che `vercel.json` abbia la configurazione corretta
3. Forza refresh del browser con `Ctrl+F5` (o `Cmd+Shift+R` su Mac)

### Script non funziona?
1. Verifica che Node.js sia installato
2. Controlla che i permessi di esecuzione siano impostati:
   ```bash
   chmod +x scripts/update-versions.js
   chmod +x scripts/deploy.sh
   ```

### Versioni non sincronizzate?
```bash
npm run update-versions
```

## 🎯 Best Practices

1. **Sempre** usa `npm run deploy` prima del push
2. **Non** modificare manualmente le versioni nei file HTML
3. **Verifica** sempre che le versioni siano aggiornate prima del deploy
4. **Usa** branch separati per modifiche significative

## 📊 Monitoraggio

Controlla che il sistema funzioni:

1. **Network tab**: Verifica che CSS/JS abbiano query string version
2. **Response headers**: Conferma cache-control appropriati
3. **Timeline**: Assicurati che le modifiche si vedano immediatamente

## 🔮 Futuri Miglioramenti

- [ ] Hash-based versioning invece di timestamp
- [ ] Versionamento automatico su git commit/push
- [ ] Monitoring della cache hit rate
- [ ] Integrazione con CI/CD pipeline 