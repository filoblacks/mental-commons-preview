/**
 * 🧪 Funzione di Test per Mental Commons UCMe
 * 
 * Questa è la funzione JavaScript che puoi usare per testare
 * l'invio di UCMe al Google Apps Script.
 */

// ⚠️ CONFIGURAZIONE - Aggiorna questi valori!
const SCRIPT_CONFIG = {
    scriptUrl: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    apiKey: "YOUR_API_KEY"
};

/**
 * Invia una UCMe al Google Apps Script
 * @param {string} email - L'email dell'utente
 * @param {string} text - Il testo della UCMe
 * @returns {Promise} Promise che risolve con la risposta del server
 */
async function submitUCMe(email, text) {
    try {
        console.log('🚀 Invio UCMe...');
        console.log('Email:', email);
        console.log('Testo:', text.substring(0, 50) + '...');
        
        const response = await fetch(SCRIPT_CONFIG.scriptUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                text,
                key: SCRIPT_CONFIG.apiKey
            })
        });
        
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ UCMe inviata con successo!');
            console.log('Messaggio:', result.message);
            console.log('ID UCMe:', result.ucmeId);
            alert(result.message); // "Grazie per aver inviato la tua UCMe"
        } else {
            console.error('❌ Errore dal server:', result.message);
            alert('Errore: ' + result.message);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Errore nell\'invio:', error);
        alert('Errore nella connessione: ' + error.message);
        throw error;
    }
}

// ==========================================
// 🧪 ESEMPI DI TEST
// ==========================================

/**
 * Test con dati di esempio
 */
async function testWithSampleData() {
    await submitUCMe(
        "test@mentalcommons.it",
        "Questo è un pensiero di test per verificare che tutto funzioni correttamente con Mental Commons."
    );
}

/**
 * Test interattivo - chiede i dati all'utente
 */
async function testInteractive() {
    const email = prompt("Inserisci la tua email:");
    const text = prompt("Inserisci il tuo pensiero:");
    
    if (email && text) {
        await submitUCMe(email, text);
    } else {
        alert("Email e pensiero sono obbligatori!");
    }
}

/**
 * Test multipli per verificare la robustezza
 */
async function runMultipleTests() {
    console.log('🧪 Avvio test multipli...');
    
    const testCases = [
        {
            email: "test1@example.com",
            text: "Primo pensiero di test per Mental Commons."
        },
        {
            email: "test2@example.com", 
            text: "Secondo pensiero di test con più caratteri per verificare che anche i testi più lunghi vengano gestiti correttamente dal sistema."
        },
        {
            email: "test3@example.com",
            text: "Terzo test con emoji 🧠💭 e caratteri speciali àèìòù per verificare la compatibilità."
        }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        console.log(`\n--- Test ${i + 1}/3 ---`);
        try {
            await submitUCMe(testCases[i].email, testCases[i].text);
            console.log(`✅ Test ${i + 1} completato`);
        } catch (error) {
            console.log(`❌ Test ${i + 1} fallito:`, error.message);
        }
        
        // Pausa tra i test
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏁 Test multipli completati!');
}

/**
 * Configura l'URL e l'API Key
 */
function configure(scriptUrl, apiKey) {
    SCRIPT_CONFIG.scriptUrl = scriptUrl;
    SCRIPT_CONFIG.apiKey = apiKey;
    
    console.log('✅ Configurazione aggiornata:');
    console.log('URL:', scriptUrl);
    console.log('API Key:', apiKey ? '****' + apiKey.slice(-4) : 'non impostata');
}

// ==========================================
// 📖 ISTRUZIONI D'USO
// ==========================================

console.log(`
🧠 Mental Commons - Test UCMe Function

📋 Prima di iniziare:
1. Aggiorna SCRIPT_CONFIG con i tuoi valori reali
2. Oppure usa: configure("TUO_URL", "TUA_API_KEY")

🧪 Funzioni disponibili:
- submitUCMe(email, text) - Invia una UCMe
- testWithSampleData() - Test con dati di esempio  
- testInteractive() - Test interattivo
- runMultipleTests() - Test multipli automatici
- configure(url, key) - Configura URL e API Key

🚀 Esempio d'uso:
configure("https://script.google.com/macros/s/TUO_ID/exec", "tua_api_key");
await submitUCMe("test@example.com", "Il mio primo pensiero test!");
`);

// Esporta le funzioni se in ambiente Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        submitUCMe,
        testWithSampleData,
        testInteractive,
        runMultipleTests,
        configure
    };
} 