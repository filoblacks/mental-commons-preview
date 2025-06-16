#!/bin/bash

# Script di deploy con aggiornamento automatico delle versioni
echo "🚀 Preparazione deploy Mental Commons..."

# Aggiorna le versioni dei file CSS e JS
echo "📦 Generando nuova versione..."
npm run bump-version

# Esegui il build completo
echo "🔨 Eseguendo build..."
npm run build

echo "✅ Deploy preparato con successo!"
echo ""
echo "🔄 Modifiche apportate:"
echo "  • Nuova versione generata per CSS e JS"
echo "  • File HTML aggiornati con nuove versioni"
echo "  • Asset copiati nella directory di output"
echo ""
echo "📝 Prossimi passi:"
echo "  1. Verifica le modifiche con: git status"
echo "  2. Commit delle modifiche: git add . && git commit -m 'Update asset versions'"
echo "  3. Deploy: git push (se configurato con Vercel)"
echo "" 