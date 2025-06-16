#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Legge la configurazione delle versioni
function readVersionConfig() {
    try {
        const versionData = fs.readFileSync('version.json', 'utf8');
        return JSON.parse(versionData);
    } catch (error) {
        console.error('❌ Errore nella lettura di version.json:', error.message);
        process.exit(1);
    }
}

// Aggiorna le versioni in un file HTML
function updateVersionsInFile(filePath, cssVersion, jsVersion) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Aggiorna CSS version
        content = content.replace(
            /href="\/style\.css\?v=[\w\d]+"/g,
            `href="/style.css?v=${cssVersion}"`
        );
        
        // Aggiorna JS version
        content = content.replace(
            /src="\/script\.js(\?v=[\w\d]+)?"/g,
            `src="/script.js?v=${jsVersion}"`
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Aggiornato: ${filePath}`);
        
    } catch (error) {
        console.error(`❌ Errore nell'aggiornamento di ${filePath}:`, error.message);
    }
}

// Genera una nuova versione basata su timestamp
function generateNewVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}`;
}

// Aggiorna il file version.json
function updateVersionConfig(newVersion) {
    const config = {
        version: newVersion,
        last_updated: new Date().toISOString(),
        assets: {
            css: newVersion,
            js: newVersion
        }
    };
    
    fs.writeFileSync('version.json', JSON.stringify(config, null, 2), 'utf8');
    console.log(`✅ version.json aggiornato alla versione: ${newVersion}`);
}

// Main function
function main() {
    const args = process.argv.slice(2);
    const shouldGenerateNew = args.includes('--new');
    
    console.log('🔄 Aggiornamento versioni file CSS e JS...\n');
    
    let config = readVersionConfig();
    
    // Genera nuova versione se richiesto
    if (shouldGenerateNew) {
        const newVersion = generateNewVersion();
        updateVersionConfig(newVersion);
        config = readVersionConfig(); // Rilegge la configurazione aggiornata
        console.log(`🆕 Nuova versione generata: ${newVersion}\n`);
    }
    
    const cssVersion = config.assets.css;
    const jsVersion = config.assets.js;
    
    console.log(`📦 Versione CSS: ${cssVersion}`);
    console.log(`📦 Versione JS: ${jsVersion}\n`);
    
    // Lista dei file HTML da aggiornare
    const htmlFiles = [
        'src/html/index.html',
        'src/html/login.html',
        'src/html/dashboard.html',
        'src/html/reset-user.html'
    ];
    
    // Aggiorna ogni file HTML
    htmlFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            updateVersionsInFile(filePath, cssVersion, jsVersion);
        } else {
            console.log(`⚠️  File non trovato: ${filePath}`);
        }
    });
    
    console.log('\n✅ Processo completato!\n');
    
    // Mostra come usare lo script
    if (!shouldGenerateNew) {
        console.log('💡 Per generare una nuova versione, usa: npm run update-versions --new');
    }
}

// Esegui lo script
main(); 