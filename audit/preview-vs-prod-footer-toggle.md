# Audit: Discrepanza footer / toggle lingua – Preview vs Produzione

**Data**: 13 ago 2025

---

## 1. Mappa deployment ↔︎ domini

| Dominio | Deployment Vercel | `target` | `created` | Age |
|---------|-------------------|----------|-----------|------|
| `mentalcommons.xyz` & `www.mentalcommons.xyz` | `mental-commons-preview-nlxm3vr6m-…` (`dpl_7i9vW3yH6mrwz9cghCzQBfjdYAKp`) | `production` | 08 ago 2025 16:57 | ~5 giorni |
| `mental-commons-preview-git-ch-e1a8a4-….vercel.app` *(preview)* | `mental-commons-preview-ioxgpgp6q-…` (`dpl_2rS3HPEYtCPk6F9LxLnnnki6X6z2`) | `preview` | 13 ago 2025 17:47 | ~6 min |

> **Evidenza**: output `vercel alias ls` mostra che **il custom domain è ancora puntato a un deployment vecchio (production)** e non all’ultima build di preview.

---

## 2. Diff asset critici

_Per ogni path è indicato status / Content-Type / Cache-Control._

| Path | Preview (➕) | Produzione (➖) |
|------|--------------|----------------|
| `/partials/footer.html` | `200 OK` `text/html; charset=utf-8` `max-age=0, s-maxage=31536000` | `307 → 404` (redirect verso `www.` poi 404) |
| `/scripts/inject-footer.js` | `200 OK` `application/javascript` `s-maxage=31536000, immutable` | `404` |
| `/scripts/i18n.runtime.js` | `200 OK` | `404` |
| `/locales/it.json` | `200 OK` | `404` |
| `/locales/en.json` | `200 OK` | `404` |
| `/mc-per-le-scuole.html` | `401 Password Protect` *(Vercel Protection per branch preview)* | `200 OK` |

_Vedi log completi in_ `audit/artifacts/curl-logs/*`.

---

## 3. HTML – inclusione script

Nel file scaricato da **produzione**:
```html
<link rel="stylesheet" href="/style.css?v=20250801" />
<script type="module" src="/api/env.js"></script>
<script defer src="/scripts/header-menu.js"></script>
```

Mancano:
```html
<script defer src="/scripts/inject-footer.js"></script>
<script defer src="/scripts/i18n.runtime.js"></script>
```

Questi ultimi sono invece presenti nella build di **preview** (visibili una volta bypassata la password protection).

---

## 4. Footer nel DOM

* Preview – `footer.site-footer` contiene il **language-toggle `<select id="lang-toggle-footer">`**.
* Produzione – il footer viene servito statico dall’HTML; non esiste alcun toggle lingua.

_Dump completi in_ `audit/artifacts/dom-dumps/`.

---

## 5. Headers & Cache

* Su produzione molti asset restituiscono **`404` o redirezionano**. Il CDN di Vercel quindi non ha contenuto per quei percorsi.
* Header `x-vercel-id` differiscono indicando **edge server diversi** ma non ci sono anomalie di cache (assenza di `age` alto su 404 indica non sticky-cache).

---

## 6. Config `vercel.json`

L’ispezione del deployment production non mostra headers/rewrites custom; sembra usare la stessa config del repo.

---

## 🚩 Conclusione (root cause)

> **Il dominio `mentalcommons.xyz` è aliasato a un deployment di 5 giorni fa che non include i nuovi asset (`inject-footer.js`, JSON i18n, footer con toggle lingua`).** La preview punta invece all’ultima build (branch `ch-e1a8a4`). Nessuna evidenza di problemi di cache o differenze di configurazione.

In sintesi, **“preview ≠ produzione” perché il custom domain non è stato riallineato all’ultimo deployment**.

---

## 🌱 Piano di correzione (no-code)

1. **Aggiornare l’alias**: eseguire `vercel alias set mentalcommons.xyz <nuovo-deployment-url>` (o trigger deploy production) per far puntare il dominio alla build più recente.
2. **Automatizzare**: configurare GitHub Action / Vercel Git Integration così che ogni merge in `main` generi una build production e aggiorni automaticamente l’alias.
3. **Monitoraggio**: aggiungere step di CI che verifica la presenza di asset chiave (`/partials/footer.html`, JSON locale) post-deploy.
4. **Pulizia alias**: rimuovere alias vecchi “preview-*” per evitare confusione.

---

### Allegati

* **curl-logs**: header completi di tutte le richieste.
* **dom-dumps**: HTML estratto del footer (preview vs prod).
* `vercel inspect` raw output.

_(Fine report)_
