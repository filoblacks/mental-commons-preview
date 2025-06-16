# 🚀 Guida Rapida - Sistema Versionamento

## Prima Volta? Setup Veloce

```bash
# 1. Installa Node.js se non presente
# 2. Rendi eseguibili gli script
chmod +x scripts/update-versions.js
chmod +x scripts/deploy.sh
```

## 📱 Comandi Essenziali

### Deploy Completo (Uso Normale)
```bash
npm run deploy
git add .
git commit -m "Update asset versions"
git push
```

### Solo Aggiornamento Versioni
```bash
npm run bump-version    # Nuova versione
npm run update-versions # Aggiorna HTML con versioni esistenti
```

## ✅ Risultato

**Prima:**
```html
<script src="/script.js"></script>
```

**Dopo:**
```html
<script src="/script.js?v=202506161656"></script>
```

## 🔧 Cache Headers Configurati

- **HTML**: No cache (sempre fresco)
- **CSS/JS**: Cache 1 anno (con versioning)
- **SVG/ICO**: Cache 1 giorno

## 🆘 Problem? 

1. Browser mostra ancora vecchia versione? → `Ctrl+F5` (force refresh)
2. Script error? → Verifica che Node.js sia installato
3. File non aggiornati? → `npm run update-versions`

**Documentazione completa:** `docs/VERSIONING.md` 