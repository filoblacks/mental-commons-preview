#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔨 Build Mental Commons 3.0 - Copy Assets');

// Legge la configurazione delle versioni
function getVersionConfig() {
    try {
        const versionData = fs.readFileSync('version.json', 'utf8');
        return JSON.parse(versionData);
    } catch (error) {
        console.error('❌ Errore nella lettura di version.json:', error.message);
        // Genera versione di fallback
        const fallbackVersion = Date.now().toString();
        return {
            version: fallbackVersion,
            assets: { css: fallbackVersion, js: fallbackVersion }
        };
    }
}

// Aggiorna le versioni nei file HTML
function updateHTMLVersions(config) {
    const htmlFiles = [
        'index.html',
        'login.html', 
        'dashboard.html',
        'reset-user.html'
    ];
    
    htmlFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            try {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Aggiorna CSS version
                content = content.replace(
                    /href="[^"]*style\.css[^"]*"/g,
                    `href="/style.css?v=${config.assets.css}"`
                );
                
                // Aggiorna JS version  
                content = content.replace(
                    /src="[^"]*script\.js[^"]*"/g,
                    `src="/script.js?v=${config.assets.js}"`
                );
                
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Aggiornato: ${filePath}`);
                
            } catch (error) {
                console.error(`❌ Errore nell'aggiornamento di ${filePath}:`, error.message);
            }
        } else {
            console.log(`⚠️  File non trovato: ${filePath}`);
        }
    });
}

// Main build process
function main() {
    console.log('📦 Inizio processo di build...\n');
    
    // Legge configurazione versioni
    const config = getVersionConfig();
    console.log(`📋 Versione CSS: ${config.assets.css}`);
    console.log(`📋 Versione JS: ${config.assets.js}\n`);
    
    // Aggiorna versioni nei file HTML
    updateHTMLVersions(config);
    
    console.log('\n✅ Build completato con successo!');
    console.log('🚀 Ready for deploy');
}

// Esegui build
main(); 