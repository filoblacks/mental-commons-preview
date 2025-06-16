#!/bin/bash

# Script per generare favicon PNG e ICO dai file SVG
# Richiede ImageMagick (convert) o Inkscape

echo "🎨 Generazione favicon Mental Commons..."

# Directory
PUBLIC_DIR="public"
FAVICON_DIR="$PUBLIC_DIR"

# Controlla se ImageMagick è installato
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick trovato, conversione SVG → PNG/ICO..."
    
    # Converte favicon-32x32.svg → favicon-32x32.png
    convert "$FAVICON_DIR/favicon-32x32.svg" "$FAVICON_DIR/favicon-32x32.png"
    echo "✅ Creato favicon-32x32.png"
    
    # Converte favicon-16x16.svg → favicon-16x16.png
    convert "$FAVICON_DIR/favicon-16x16.svg" "$FAVICON_DIR/favicon-16x16.png"
    echo "✅ Creato favicon-16x16.png"
    
    # Crea favicon.ico con entrambe le dimensioni
    convert "$FAVICON_DIR/favicon-32x32.png" "$FAVICON_DIR/favicon-16x16.png" "$FAVICON_DIR/favicon.ico"
    echo "✅ Creato favicon.ico (multi-size)"
    
elif command -v inkscape &> /dev/null; then
    echo "✅ Inkscape trovato, conversione SVG → PNG..."
    
    # Converte con Inkscape (migliore qualità)
    inkscape --export-type="png" --export-filename="$FAVICON_DIR/favicon-32x32.png" --export-width=32 --export-height=32 "$FAVICON_DIR/favicon-32x32.svg"
    inkscape --export-type="png" --export-filename="$FAVICON_DIR/favicon-16x16.png" --export-width=16 --export-height=16 "$FAVICON_DIR/favicon-16x16.svg"
    
    echo "✅ File PNG creati con Inkscape"
    echo "❗ Per creare favicon.ico, installa ImageMagick: brew install imagemagick"
    
else
    echo "❌ Nessun tool di conversione trovato!"
    echo ""
    echo "Installa uno di questi tool:"
    echo "• ImageMagick: brew install imagemagick (macOS) o apt install imagemagick (Linux)"
    echo "• Inkscape: brew install inkscape (macOS) o apt install inkscape (Linux)"
    echo ""
    echo "Alternative online:"
    echo "• https://convertio.co/svg-png/"
    echo "• https://cloudconvert.com/svg-to-ico"
    exit 1
fi

echo ""
echo "🎉 Favicon generate con successo!"
echo ""
echo "File creati:"
echo "• favicon.svg (principale, scalabile)"
echo "• favicon-32x32.png (compatibilità)"
echo "• favicon-16x16.png (compatibilità)"
echo "• favicon.ico (browser legacy)"
echo ""
echo "✅ Sfondo nero (#000000) + simbolo bianco (#ffffff)"
echo "✅ Design: due cerchi sovrapposti con punto centrale"
echo "✅ Link HTML già aggiornati nei file src/html/" 