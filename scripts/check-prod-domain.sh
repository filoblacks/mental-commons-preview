#!/usr/bin/env bash

# Guardrail: verifica che mentalcommons.xyz serva l'ultimo deployment Production
# Usa Vercel CLI se disponibile + VERCEL_TOKEN per mostrare l'URL dell'ultimo prod
# ma continua anche se la CLI non è configurata (best-effort).

set -euo pipefail

DOMAIN="https://mentalcommons.xyz"
SENTINEL_PATHS=(
  "/partials/footer.html"
  "/scripts/inject-footer.js"
  "/locales/en.json"
)

# Mostra info sull'ultimo production (opzionale)
if command -v vercel >/dev/null 2>&1 && [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "🔍 Recupero ultimo deployment production tramite Vercel CLI…"
  LAST_PROD_URL=$(vercel ls --prod --json | jq -r '.[0].url') || true
  if [[ -n "$LAST_PROD_URL" ]]; then
    echo "Ultimo deployment production: $LAST_PROD_URL"
  fi
else
  echo "ℹ️  Vercel CLI non disponibile o VERCEL_TOKEN non impostato; salto verifica URL prod."
fi

echo "🚦 Verifica asset sentinella su $DOMAIN …"
FAILED=0
for path in "${SENTINEL_PATHS[@]}"; do
  url="$DOMAIN$path"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  echo "  $path -> $code"
  if [[ "$code" != "200" ]]; then
    echo "❌  Asset mancante o non servito correttamente: $path"
    FAILED=1
  fi
done

if [[ $FAILED -eq 1 ]]; then
  echo "❌  Production NON in linea: alcune risorse non risultano disponibili."
  exit 1
fi

echo "✅  Production domain servito correttamente. Tutto ok!"
