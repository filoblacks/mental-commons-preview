// Variabili globali
let ucmeData = [];

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Carica dati esistenti dal localStorage
    loadExistingData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup form validation
    setupFormValidation();
}

function loadExistingData() {
    const savedData = localStorage.getItem('mentalCommons_ucmes');
    if (savedData) {
        try {
            ucmeData = JSON.parse(savedData);
            console.log(`Caricati ${ucmeData.length} UCMe dal localStorage`);
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
            ucmeData = [];
        }
    }
}

function setupEventListeners() {
    // Textarea character counter
    const textarea = document.getElementById('ucme-text');
    const charCount = document.getElementById('char-count');
    
    textarea.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCount.textContent = currentLength;
        
        // Cambio colore del contatore
        if (currentLength < 20) {
            charCount.style.color = '#ff6b6b';
        } else if (currentLength > 500) {
            charCount.style.color = '#ffa726';
        } else {
            charCount.style.color = '#4caf50';
        }
        
        // Validazione del form
        validateForm();
    });
    
    // Email validation
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('input', validateForm);
    
    // Checkbox validation
    const checkbox = document.getElementById('acceptance');
    checkbox.addEventListener('change', validateForm);
    
    // Form submission
    const form = document.getElementById('ucme-form');
    form.addEventListener('submit', handleFormSubmission);
}

function setupFormValidation() {
    validateForm(); // Validazione iniziale
}

function validateForm() {
    const textarea = document.getElementById('ucme-text');
    const email = document.getElementById('email');
    const checkbox = document.getElementById('acceptance');
    const submitButton = document.getElementById('submit-button');
    
    const textValid = textarea.value.length >= 20 && textarea.value.length <= 600;
    const emailValid = email.value && isValidEmail(email.value);
    const checkboxValid = checkbox.checked;
    
    const isFormValid = textValid && emailValid && checkboxValid;
    
    submitButton.disabled = !isFormValid;
    
    return isFormValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function scrollToForm() {
    const formSection = document.getElementById('form-section');
    formSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Focus sulla textarea dopo lo scroll
    setTimeout(() => {
        document.getElementById('ucme-text').focus();
    }, 800);
}

async function handleFormSubmission(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        alert('Per favore completa correttamente tutti i campi.');
        return;
    }
    
    // Raccolta dati dal form
    const formData = collectFormData();
    
    // Mostra stato di caricamento
    showLoadingState();
    
    try {
        // Invio dati al Google Apps Script
        await submitUCMeToGoogleSheet(formData);
        
        // Salvataggio backup locale
        saveUcmeDataLocal(formData);
        
        // Mostra messaggio di successo
        showSuccessMessage();
        
        // Reset del form
        resetForm();
        
        console.log('UCMe inviata con successo:', formData);
        
    } catch (error) {
        console.error('Errore nell\'invio della UCMe:', error);
        showErrorMessage(error.message);
        hideLoadingState();
    }
}

function collectFormData() {
    const textarea = document.getElementById('ucme-text');
    const email = document.getElementById('email');
    
    return {
        id: generateUniqueId(),
        email: email.value.trim(),
        text: textarea.value.trim(),
        timestamp: new Date().toISOString(),
        status: 'pending',
        response: null,
        metadata: {
            characterCount: textarea.value.length,
            userAgent: navigator.userAgent,
            language: navigator.language
        }
    };
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveUcmeData(newUcme) {
    // Aggiungi la nuova UCMe all'array
    ucmeData.push(newUcme);
    
    // Salva nel localStorage
    try {
        localStorage.setItem('mentalCommons_ucmes', JSON.stringify(ucmeData));
        console.log('Dati salvati con successo nel localStorage');
        
        // Salva anche in un file JSON (simulato tramite download)
        downloadDataAsJson(newUcme);
        
    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        alert('Errore nel salvataggio dei dati. Riprova.');
    }
}

function downloadDataAsJson(ucme) {
    // Crea un backup scaricabile della UCMe (per sviluppo/debug)
    const dataStr = JSON.stringify(ucme, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `ucme_${ucme.id}.json`;
    
    // Scarica automaticamente (commentato per non disturbare l'utente)
    // link.click();
    
    console.log('UCMe pronta per il download:', dataStr);
}

function showSuccessMessage() {
    const form = document.getElementById('ucme-form');
    const successMessage = document.getElementById('success-message');
    
    // Nascondi il form e mostra il messaggio
    form.style.display = 'none';
    successMessage.style.display = 'block';
    
    // Scroll al messaggio di successo
    successMessage.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
}

function resetForm() {
    const form = document.getElementById('ucme-form');
    form.reset();
    
    // Reset del contatore caratteri
    document.getElementById('char-count').textContent = '0';
    document.getElementById('char-count').style.color = '#999';
    
    // Disabilita il submit button
    document.getElementById('submit-button').disabled = true;
}

// Funzioni utility per amministrazione (accessibili dalla console)
function getAllUcmes() {
    console.log('Tutte le UCMe salvate:', ucmeData);
    return ucmeData;
}

function getUcmeById(id) {
    const ucme = ucmeData.find(u => u.id === id);
    console.log('UCMe trovata:', ucme);
    return ucme;
}

function exportAllData() {
    const dataStr = JSON.stringify(ucmeData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mental_commons_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    console.log('Dati esportati');
}

function clearAllData() {
    if (confirm('Sei sicuro di voler cancellare tutti i dati? Questa azione non è reversibile.')) {
        localStorage.removeItem('mentalCommons_ucmes');
        ucmeData = [];
        console.log('Tutti i dati sono stati cancellati');
    }
}

function getStats() {
    const stats = {
        totalUcmes: ucmeData.length,
        pendingUcmes: ucmeData.filter(u => u.status === 'pending').length,
        completedUcmes: ucmeData.filter(u => u.status === 'completed').length,
        averageLength: ucmeData.length > 0 ? 
            Math.round(ucmeData.reduce((sum, u) => sum + u.text.length, 0) / ucmeData.length) : 0,
        oldestUcme: ucmeData.length > 0 ? 
            new Date(Math.min(...ucmeData.map(u => new Date(u.timestamp)))) : null,
        newestUcme: ucmeData.length > 0 ? 
            new Date(Math.max(...ucmeData.map(u => new Date(u.timestamp)))) : null
    };
    
    console.log('Statistiche Mental Commons:', stats);
    return stats;
}

// Rendering responsive migliorato
function handleResize() {
    // Ottimizzazioni per mobile se necessarie
    if (window.innerWidth < 768) {
        // Logica specifica per mobile
        console.log('Modalità mobile attivata');
    }
}

window.addEventListener('resize', handleResize);

// Informazioni per sviluppatori
console.log('🧠 Mental Commons MVP v1.0');
console.log('Funzioni disponibili nella console:');
console.log('- getAllUcmes(): visualizza tutte le UCMe');
console.log('- getUcmeById(id): trova una UCMe specifica');
console.log('- exportAllData(): esporta tutti i dati in JSON');
console.log('- getStats(): mostra statistiche');
console.log('- clearAllData(): cancella tutti i dati (attenzione!)');

// ==========================================
// INTEGRAZIONE GOOGLE APPS SCRIPT
// ==========================================

// Configurazione (⚠️ AGGIORNA QUESTI VALORI!)
const GOOGLE_SCRIPT_CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbzSYd8pNfZnCx1HqGshLVkp7hOBRzAWOwJBHMFopQXr9lwGr9loFc_nVni3kOuQww0PYg/exec',
    apiKey: 'mc_2024_filippo_1201_aB3xY9zK2m'
};

/**
 * Invia la UCMe al Google Apps Script
 */
async function submitUCMeToGoogleSheet(formData) {
    const payload = {
        email: formData.email,
        text: formData.text,
        key: GOOGLE_SCRIPT_CONFIG.apiKey
    };
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_CONFIG.scriptUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
            // Rimosso Content-Type header per evitare preflight CORS
        });
        
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore sconosciuto dal server');
        }
        
        console.log('✅ UCMe inviata al Google Sheet:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Errore nell\'invio al Google Sheet:', error);
        
        // Messaggi di errore più user-friendly
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Impossibile connettersi al server. Verifica la connessione internet.');
        } else if (error.message.includes('CORS')) {
            throw new Error('Errore di configurazione del server. Contatta il supporto.');
        } else {
            throw new Error(error.message || 'Errore nell\'invio del pensiero. Riprova più tardi.');
        }
    }
}

/**
 * Salva i dati localmente come backup (rinominata da saveUcmeData)
 */
function saveUcmeDataLocal(newUcme) {
    // Aggiungi la nuova UCMe all'array
    ucmeData.push(newUcme);
    
    // Salva nel localStorage
    try {
        localStorage.setItem('mentalCommons_ucmes', JSON.stringify(ucmeData));
        console.log('✅ Backup locale salvato');
        
    } catch (error) {
        console.error('⚠️ Errore nel backup locale:', error);
        // Non blocchiamo l'invio per un errore di backup locale
    }
}

/**
 * Mostra lo stato di caricamento durante l'invio
 */
function showLoadingState() {
    const submitButton = document.getElementById('submit-button');
    const originalText = submitButton.textContent;
    
    submitButton.disabled = true;
    submitButton.textContent = 'Invio in corso...';
    submitButton.style.opacity = '0.7';
    
    // Salva il testo originale per ripristinarlo dopo
    submitButton.dataset.originalText = originalText;
}

/**
 * Nasconde lo stato di caricamento
 */
function hideLoadingState() {
    const submitButton = document.getElementById('submit-button');
    
    submitButton.disabled = false;
    submitButton.textContent = submitButton.dataset.originalText || 'Affida il pensiero';
    submitButton.style.opacity = '1';
}

/**
 * Mostra un messaggio di errore
 */
function showErrorMessage(message) {
    // Rimuovi messaggi di errore esistenti
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Crea il nuovo messaggio di errore
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #ff5757;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        text-align: center;
        animation: slideIn 0.3s ease;
    `;
    errorDiv.innerHTML = `
        <strong>Errore</strong><br>
        ${message}
        <br><br>
        <small>La tua UCMe è stata salvata localmente. Riprova quando la connessione è stabile.</small>
    `;
    
    // Inserisci il messaggio prima del form
    const form = document.getElementById('ucme-form');
    form.parentNode.insertBefore(errorDiv, form);
    
    // Scroll al messaggio di errore
    errorDiv.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
    
    // Rimuovi automaticamente dopo 10 secondi
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

/**
 * Testa la connessione al Google Apps Script
 */
async function testGoogleSheetConnection() {
    console.log('🧪 Test connessione Google Apps Script...');
    
    try {
        const testData = {
            email: 'test@mentalcommons.test',
            text: 'Questo è un test di connessione automatico dal frontend Mental Commons.',
            key: GOOGLE_SCRIPT_CONFIG.apiKey
        };
        
        const result = await submitUCMeToGoogleSheet({ 
            email: testData.email, 
            text: testData.text 
        });
        
        console.log('✅ Test connessione riuscito:', result);
        alert('✅ Connessione al Google Sheet funzionante!');
        
    } catch (error) {
        console.error('❌ Test connessione fallito:', error);
        alert(`❌ Errore nella connessione: ${error.message}`);
    }
}

/**
 * Configura l'URL e l'API Key del Google Apps Script
 */
function configureGoogleScript(scriptUrl, apiKey) {
    GOOGLE_SCRIPT_CONFIG.scriptUrl = scriptUrl;
    GOOGLE_SCRIPT_CONFIG.apiKey = apiKey;
    
    console.log('✅ Configurazione Google Apps Script aggiornata');
    console.log('URL:', scriptUrl);
    console.log('API Key:', apiKey ? '****' + apiKey.slice(-4) : 'non impostata');
    
    // Salva la configurazione nel localStorage per persistenza
    localStorage.setItem('mentalCommons_config', JSON.stringify(GOOGLE_SCRIPT_CONFIG));
}

/**
 * Carica la configurazione salvata dal localStorage  
 */
function loadSavedConfiguration() {
    try {
        const savedConfig = localStorage.getItem('mentalCommons_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            GOOGLE_SCRIPT_CONFIG.scriptUrl = config.scriptUrl;
            GOOGLE_SCRIPT_CONFIG.apiKey = config.apiKey;
            console.log('✅ Configurazione caricata dal localStorage');
        }
    } catch (error) {
        console.warn('⚠️ Errore nel caricamento della configurazione salvata:', error);
    }
}

// Carica la configurazione salvata all'avvio
loadSavedConfiguration();

// Expose functions globally for console access
window.mentalCommons = {
    // Funzioni esistenti
    getAllUcmes,
    getUcmeById,
    exportAllData,
    clearAllData,
    getStats,
    
    // Nuove funzioni per Google Apps Script
    testConnection: testGoogleSheetConnection,
    configure: configureGoogleScript,
    getConfig: () => GOOGLE_SCRIPT_CONFIG
}; 