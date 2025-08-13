### Inventario i18n – Sprint 0

- Versione: 2025-08-10
- Ambito: testi utente statici (HTML) e dinamici (JS)
- Esclusioni deliberate: contenuti legali lunghi (privacy/termini/cookie) – solo titoli e intestazioni mappati in questo sprint; corpo completo da classificare in Sprint 1 Legal.

## Pagine HTML nella root
- `index.html`
- `come-funziona.html`
- `mc-per-le-scuole.html`
- `premium.html`
- `dashboard.html`
- `chat.html`
- `login.html`
- `profile.html`
- `admin.html`
- `privacy-policy.html` (solo titoli/heading in Sprint 0)
- `termini-di-servizio.html` (solo titoli/heading in Sprint 0)
- `cookie-policy.html` (solo titoli/heading in Sprint 0)

## Moduli JS con stringhe utente
- `ui/chat.js`
- `ui/dashboard.js`
- `ui/login.js`
- `ui/premium.js`
- `ui/profile.js` (messaggi minimi; la maggior parte dei testi è in HTML)
- `ui/admin.js`
- `ui/portatore.js`
- `ui/portatore-requests.js`
- `ui/ucme-portatore.js`
- `ui/dashboard-docente.js`
- `ui/form.js`
- `core/auth.js` (solo messaggi immediatamente visibili all’utente)
- `core/api.js` (messaggi di errore generici che possono propagare in UI)
- `core/logger.js` (nessun messaggio utente – escluso)

## Struttura chiavi i18n (albero sintetico)
- `nav.*` – navigazione primaria e azioni utente
- `footer.*` – didascalie, link, social
- `home.*` – homepage (hero, trust, form, demo, info)
- `how_it_works.*` – pagina come-funziona (hero, flow, portatore, diventare)
- `schools.*` – pagina MC per le scuole (hero + testi)
- `pricing.*` – pagina premium (hero, billing, plans, faq)
- `dashboard.*` – pagina dashboard (header, loading, filters, states, actions)
- `chat.*` – pagina chat (titoli, placeholder, stati, tooltip)
- `auth.*` – login/registrazione (etichette, errori)
- `profile.*` – profilo (header, sezioni, azioni, portatore)
- `admin.*` – amministrazione (tabelle, azioni, messaggi)
- `docente.*` – dashboard docente (statistiche, liste, grafici)
- `errors.*` – messaggi di errore comuni
- `common.*` – testi riusabili (ok, cancel, back, loading, new, today, yesterday, etc.)
- `legal.*` – pagine legali (solo heading in Sprint 0)

## Note
- Placeholder dinamici: `{count}`, `{date}`, `{name}` mantenuti.
- Plurali: chiavi separate `*_one`, `*_many` quando utile.
- Encoding: preservati `&nbsp;` dove presenti in origine`.
