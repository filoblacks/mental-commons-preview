### Convenzione chiavi i18n

- Schema: `section.subsection.element` in inglese, snake-case per parole multiple.
- Profondità consigliata: 2–3 livelli; evitare nidificazioni eccessive.
- Riutilizzo: usare `common.*` per azioni e label ricorrenti.
- Plurali: prevedere `*_one`, `*_many` (anche se non implementiamo le regole ora).
- Placeholder: `{name}`, `{count}`, `{date}`; non interpolare direttamente stringhe.

### Esempi
- `nav.home`, `nav.how_it_works`, `nav.schools`, `nav.premium`
- `home.hero.title`, `home.hero.subtitle`, `home.hero.cta`
- `pricing.plans.premium.cta.monthly`, `pricing.billing.annual`
- `chat.list.card.status.days_ago` con `{count}`
- `errors.auth.invalid_credentials`

### Anti‑pattern
- Chiavi in italiano: NO (valori possono essere italiani; chiavi SEMPRE in inglese).
- Chiavi monolitiche: `home.full_paragraph_long` – evitare; preferire chiavi granulari.
- Mescolare camelCase e snake_case: NO; usare solo snake-case per elementi.
- Duplicare sinonimi: preferire una sola chiave riusabile (`common.ok`, `common.cancel`).

### Sezioni standard
- `common.*` es.: `ok`, `cancel`, `back`, `learn_more`, `loading`, `save`, `delete`, `today`, `yesterday`.
- `errors.*` es.: `network.timeout`, `auth.required`, `unexpected`.

### Ordinamento
- I dizionari JSON devono essere ordinati alfabeticamente per chiave per stabilità dei diff.
