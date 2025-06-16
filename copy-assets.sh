#!/bin/bash

# Script per copiare gli asset dalla cartella public alla directory di output
echo "🔄 Copiando asset dalla cartella public..."

# Copia tutti i file dalla cartella public direttamente nella directory src/html
cp public/* src/html/ 2>/dev/null || true

# Copia la directory data mantenendo la struttura delle directory
echo "🔄 Copiando directory data..."
cp -r data src/html/ 2>/dev/null || true

echo "✅ Asset copiati con successo!"

# Aggiorna automaticamente le versioni dei file CSS e JS
echo "🔄 Aggiornando versioni CSS e JS..."
if command -v node >/dev/null 2>&1; then
    node scripts/update-versions.js
    echo "✅ Versioni aggiornate!"
else
    echo "⚠️  Node.js non trovato, salta aggiornamento versioni"
fi

# Lista i file nella directory di output
echo "📋 File nella directory di output:"
ls -la src/html/ 