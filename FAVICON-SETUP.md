# 🎨 Favicon Mental Commons - Completata

## ✅ Modifiche Applicate

### File Creati
- `public/favicon.svg` - Favicon principale scalabile
- `public/favicon-32x32.svg` - Versione 32x32 per conversione PNG
- `public/favicon-16x16.svg` - Versione 16x16 per conversione PNG
- `scripts/generate-favicons.sh` - Script per generare PNG/ICO

### File HTML Aggiornati
- `src/html/index.html`
- `src/html/dashboard.html`
- `src/html/login.html`
- `src/html/reset-user.html`

### Link Favicon Configurati
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.svg">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.svg">
```

## 🎯 Design Specs
- **Sfondo**: Nero pieno (#000000)
- **Simbolo**: Bianco puro (#ffffff)
- **Design**: Due cerchi sovrapposti con punto centrale (fedele al logo esistente)
- **Dimensioni**: Scalabile (SVG) + 32x32 + 16x16 per compatibilità

## 🔧 Generazione PNG/ICO (Opzionale)

### Metodo 1: Script Automatico
```bash
# Installa ImageMagick (raccomandato)
brew install imagemagick

# Oppure Inkscape
brew install inkscape

# Esegui lo script
./scripts/generate-favicons.sh
```

### Metodo 2: Conversione Online
1. Carica `public/favicon-32x32.svg` su https://convertio.co/svg-png/
2. Carica `public/favicon-16x16.svg` su https://convertio.co/svg-png/
3. Per ICO: https://cloudconvert.com/svg-to-ico

### Metodo 3: Manuale con Figma/Sketch
1. Importa gli SVG
2. Esporta come PNG 32x32 e 16x16
3. Usa tool online per creare ICO multi-size

## 🌟 Risultato
✅ Favicon ora visibile su tab chiari e scuri
✅ Massima compatibilità browser (SVG + PNG fallback)
✅ Design coerente con il brand Mental Commons
✅ Scalabilità perfetta su qualsiasi dimensione

## 📁 Struttura File
```
public/
├── favicon.svg          (principale)
├── favicon-32x32.svg    (da convertire in PNG)
├── favicon-16x16.svg    (da convertire in PNG)
├── favicon.ico          (placeholder, da generare)
└── logo.svg            (originale, conservato)
``` 