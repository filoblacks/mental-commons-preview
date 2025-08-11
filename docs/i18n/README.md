### Mental Commons – i18n

Ordine di priorità della lingua (dal più forte):
- `?lang` nella URL, se presente e valido (`it`|`en`)
- `localStorage.mc_locale` (persistenza)
- locale del browser (`navigator.language[s]`)
- fallback: `it`

Lifecycle bootstrap:
1) `core/i18n.js` legge la lingua (senza pulire l'URL)
2) carica `/locales/{lang}.json` con `cache: 'no-store'`
3) applica le traduzioni al DOM e imposta `<html lang>`
4) emette l'evento `mc:i18n:ready` con `{ locale }`
5) se c'era `?lang`, lo rimuove con `history.replaceState`

Cambio lingua runtime:
- chiamare `window.__mc_setLocale('en')` oppure importare `setLocale('en', { apply: true })`
- all'applicazione emette `mc:i18n:changed`

Percorsi e cache:
- i dizionari sono serviti da `/locales/*.json` (percorso assoluto)
- headers Vercel per `/locales/*.json`: `Cache-Control: public, max-age=0, must-revalidate`

Toggle lingua:
- Header: `src/ui/lang-toggle.js` (ESM)
- Footer: `public/scripts/lang-toggle-footer.js` (standalone, no import)
  - ascolta `mc:i18n:ready/changed`
  - se l'API globale non è disponibile, forza reload con `?lang=`

Tooling:
- `scripts/i18n-check.js`: verifica parità chiavi `it.json` vs `en.json`
- NPM: `npm run i18n:check`
