### Mental Commons – i18n Sprint 0

Contenuti prodotti:
- `inventory.md`: inventario pagine e moduli con stringhe
- `extracted-html.csv`: testi visibili da HTML con chiavi proposte
- `extracted-js.csv`: testi runtime da JS con chiavi proposte
- `key-styleguide.md`: convenzioni chiavi i18n
- `coverage.md`: stato copertura

Dizionari:
- `locales/it.json`: valori italiani
- `locales/en.json`: parità chiavi, valori placeholder IT

Tooling:
- `scripts/i18n-check.js`: verifica parità chiavi `it.json` vs `en.json`
- NPM: `npm run i18n:check`
