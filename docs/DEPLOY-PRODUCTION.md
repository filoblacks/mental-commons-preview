# 🛠️ Deployment Production – Mental Commons

## Root Cause
Il dominio `mentalcommons.xyz` non veniva ri-assegnato automaticamente all’ultimo deployment **Production** su Vercel.

Motivi individuati:
1. **Auto-alias disabilitato** nel progetto Vercel (o rimosso manualmente), quindi il dominio restava puntato al vecchio deployment anche dopo build riuscite su `main`.
2. Nessuna guardia in CI/CD per verificare che gli asset chiave (i18n, footer, JSON lingue) fossero serviti: l’errore passava inosservato finché qualcuno non lo notava a mano.

## Fix Implementato
1. **Script potenziato** `scripts/check-prod-domain.sh`
   * Aggiunta flag `--fix` che, se i sentinel asset mancano, usa Vercel CLI per aliasare `mentalcommons.xyz` all’ultimo deployment Production individuato con `vercel ls --prod`.
2. **Workflow GitHub `domain-guard.yml`**
   * Esegue lo script dopo ogni push su `main` **e** ogni ora via `cron`.
   * Se il check fallisce, scatta l’auto-alias.
   * Fallisce il job se non riesce a sistemare l’alias, rendendo evidente il problema nel feed CI.
3. Variabili d’ambiente richieste: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (da impostare nei repo secrets).

## Come funziona ora (📝 in 10 righe)
1. Push su `main` → GitHub Action `domain-guard.yml`.
2. Lo script scarica l’ultimo deployment Production e verifica tre asset sentinella (footer, JS, JSON).
3. Se tutto OK → job verde, nessuna azione.
4. Se uno o più asset mancano → attiva **auto-fix**.
5. Auto-fix aliasa `mentalcommons.xyz` all’ultimo deployment Production.
6. Rilancia il check per conferma.
7. Se la correzione va a buon fine → job verde, dominio aggiornato.
8. Se fallisce (CLI mancante, token errato, ecc.) → job rosso con log diagnostici.
9. Inoltre il workflow gira ogni ora per intercettare regressioni manuali.
10. Risultato: il dominio principale riflette sempre l’ultima build Production senza interventi manuali.
