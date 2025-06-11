#!/bin/bash

# Mental Commons - Script di Build Base
# Questo script prepara il progetto per il deployment

echo "🏗️  Mental Commons - Build Script"
echo "==============================="

# Verifica che tutti i file essenziali esistano
echo "📋 Verifica integrità file..."

essential_files=(
    "index.html"
    "login.html" 
    "dashboard.html"
    "src/css/style.css"
    "src/js/script.js"
    "src/js/login.js"
    "src/js/dashboard.js"
    "public/logo.svg"
    "data/data.json"
    "data/risposte.json"
    "data/portatori.json"
)

missing_files=()

for file in "${essential_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "❌ File mancanti:"
    printf '%s\n' "${missing_files[@]}"
    exit 1
fi

echo "✅ Tutti i file essenziali presenti"

# Controlla che i riferimenti nei file HTML siano corretti
echo "🔗 Verifica riferimenti..."

if grep -q 'href="src/css/style.css' index.html && 
   grep -q 'src="src/js/script.js' index.html &&
   grep -q 'href="public/logo.svg' index.html; then
    echo "✅ Riferimenti index.html corretti"
else
    echo "❌ Riferimenti index.html non corretti"
    exit 1
fi

# Crea una versione minimale (opzionale)
echo "📦 Preparazione build..."

# Se esiste una cartella dist, la pulisce
if [ -d "dist" ]; then
    rm -rf dist
fi

mkdir -p dist

# Copia i file necessari per il deployment
cp index.html login.html dashboard.html reset-user.html dist/
cp -r src dist/
cp -r public dist/
cp -r data dist/

echo "✅ Build completato in /dist"
echo "📁 File pronti per il deployment"

# Statistiche finali
echo ""
echo "📊 Statistiche progetto:"
echo "HTML: $(find . -name "*.html" | wc -l | tr -d ' ') file"
echo "CSS: $(find . -name "*.css" | wc -l | tr -d ' ') file"  
echo "JS: $(find . -name "*.js" | wc -l | tr -d ' ') file"
echo "JSON: $(find . -name "*.json" | wc -l | tr -d ' ') file"

echo ""
echo "🚀 Mental Commons è pronto!" 