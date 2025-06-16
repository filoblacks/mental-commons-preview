#!/bin/bash

# Script per copiare gli asset dalla cartella public alla directory di output
echo "🔄 Copiando asset dalla cartella public..."

# Copia tutti i file dalla cartella public direttamente nella directory src/html
cp public/* src/html/ 2>/dev/null || true

# Copia la directory data mantenendo la struttura delle directory
echo "🔄 Copiando directory data..."
cp -r data src/html/ 2>/dev/null || true

echo "✅ Asset copiati con successo!"

# Lista i file nella directory di output
echo "📋 File nella directory di output:"
ls -la src/html/ 