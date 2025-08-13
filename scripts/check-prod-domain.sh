#!/usr/bin/env bash

# Guardrail: verifica che mentalcommons.xyz serva l'ultimo deployment Production.
# Opzionalmente, con l'argomento --fix (-f), tenta di correggere
# automaticamente l'alias verso l'ultimo deployment production tramite
# Vercel CLI. Richiede che la CLI sia installata e che le variabili
# d'ambiente VERCEL_TOKEN, VERCEL_ORG_ID e VERCEL_PROJECT_ID siano
# configurate.

set -euo pipefail

# Flag di auto-riparazione (disabled by default)
AUTO_FIX=0

# Parse argomenti
for arg in "$@"; do
  case $arg in
    -f|--fix)
      AUTO_FIX=1
      shift
      ;;
  esac
done

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

  if [[ $AUTO_FIX -eq 1 ]]; then
    echo "🔧  Tentativo di auto-riparazione dell'alias tramite Vercel CLI…"

    if command -v vercel >/dev/null 2>&1 && [[ -n "${VERCEL_TOKEN:-}" ]]; then
      # Recupera l'ultimo deployment production URL
      LATEST_PROD=$(vercel ls --prod --json | jq -r '.[0].url') || true

      if [[ -z "$LATEST_PROD" ]]; then
        echo "⚠️  Impossibile determinare l'ultimo deployment production. Abort."
        exit 1
      fi

      echo "🛠  Aggancio mentalcommons.xyz → $LATEST_PROD …"
      vercel alias set --yes "$LATEST_PROD" mentalcommons.xyz

      echo "🔄  Rieseguo controllo sentinelle dopo alias…"
      exec "$0" "$@"   # riesegue lo script senza perdere flag
    else
      echo "⚠️  Vercel CLI non disponibile o VERCEL_TOKEN mancante. Impossibile auto-fix."
      exit 1
    fi
  else
    exit 1
  fi
fi

echo "✅  Production domain servito correttamente. Tutto ok!"
