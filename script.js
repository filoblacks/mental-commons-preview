// Mental Commons 2.0 - Script principale
// Variabili globali
let ucmeData = [];
let portatoreData = [];

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Mostra onboarding se necessario
    checkAndShowOnboarding();
    
    // Carica dati esistenti dal localStorage
    loadExistingData();
    
    // Verifica parametri URL per storico email
    checkEmailParameter();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup form validation
    setupFormValidation();
    
    // Setup mobile optimizations
    setupMobileOptimizations();
    
    console.log('Mental Commons 2.0 inizializzato');
}

// ========================================
// GESTIONE ONBOARDING
// ========================================

function checkAndShowOnboarding() {
    const hasOnboarded = localStorage.getItem('mc-onboarded');
    if (hasOnboarded !== 'true') {
        showOnboardingModal();
    }
}

function showOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    modal.style.display = 'flex';
    
    // Prevenzione scroll del body quando modal è aperto
    document.body.style.overflow = 'hidden';
}

function completeOnboarding() {
    // Salva stato onboarding
    localStorage.setItem('mc-onboarded', 'true');
    
    // Nascondi modal con animazione
    const modal = document.getElementById('onboarding-modal');
    modal.style.animation = 'fadeOut 0.3s ease-out';
    
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
    
    console.log('Onboarding completato');
}

// ========================================
// GESTIONE STORICO UCME
// ========================================

function checkEmailParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    if (email && isValidEmail(email)) {
        // Popola campo email
        const emailInput = document.getElementById('email');
        emailInput.value = email;
        
        // Mostra storico per questa email
        displayUcmeHistory(email);
        
        // Valida form dopo aver impostato l'email
        validateForm();
    }
}

function displayUcmeHistory(email) {
    const userUcmes = ucmeData.filter(ucme => ucme.email === email);
    
    if (userUcmes.length === 0) {
        return; // Non mostrare sezione se non ci sono UCMe
    }
    
    // Ordina per timestamp (più recenti prima) e prendi massimo 5
    const recentUcmes = userUcmes
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    const historySection = document.getElementById('ucme-history');
    const historyList = document.getElementById('history-list');
    
    // Pulisci contenuto esistente
    historyList.innerHTML = '';
    
    // Crea elementi per ogni UCMe
    recentUcmes.forEach((ucme, index) => {
        const historyItem = createHistoryItem(ucme, index);
        historyList.appendChild(historyItem);
    });
    
    // Mostra sezione storico
    historySection.style.display = 'block';
}

function createHistoryItem(ucme, index) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.style.animationDelay = `${index * 0.1}s`;
    
    const date = new Date(ucme.timestamp);
    const formattedDate = date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    item.innerHTML = `
        <div class="history-item-text">${ucme.text}</div>
        <div class="history-item-meta">
            <span class="history-item-date">${formattedDate}</span>
            <span class="history-item-tone">${ucme.tone || 'neutro'}</span>
        </div>
    `;
    
    return item;
}

// ========================================
// GESTIONE DATI
// ========================================

function loadExistingData() {
    // Carica UCMe dal localStorage
    const savedUcmes = localStorage.getItem('mentalCommons_ucmes');
    if (savedUcmes) {
        try {
            ucmeData = JSON.parse(savedUcmes);
            console.log(`Caricate ${ucmeData.length} UCMe dal localStorage`);
        } catch (error) {
            console.error('Errore nel caricamento UCMe:', error);
            ucmeData = [];
        }
    }
    
    // Carica candidature Portatore dal localStorage
    const savedPortatori = localStorage.getItem('mentalCommons_portatori');
    if (savedPortatori) {
        try {
            portatoreData = JSON.parse(savedPortatori);
            console.log(`Caricate ${portatoreData.length} candidature Portatore dal localStorage`);
        } catch (error) {
            console.error('Errore nel caricamento candidature Portatore:', error);
            portatoreData = [];
        }
    }
}

function saveUcmeDataLocal(newUcme) {
    // Aggiungi la nuova UCMe all'array
    ucmeData.push(newUcme);
    
    // Salva nel localStorage
    try {
        localStorage.setItem('mentalCommons_ucmes', JSON.stringify(ucmeData));
        console.log('UCMe salvata nel localStorage');
    } catch (error) {
        console.error('Errore nel salvataggio UCMe:', error);
        throw new Error('Errore nel salvataggio locale');
    }
}

function savePortatoreData(email) {
    // Verifica se l'email è già presente
    const exists = portatoreData.some(portatore => portatore.email === email);
    
    if (!exists) {
        const newPortatore = {
            email: email,
            interesse: true,
            timestamp: new Date().toISOString()
        };
        
        portatoreData.push(newPortatore);
        
        try {
            localStorage.setItem('mentalCommons_portatori', JSON.stringify(portatoreData));
            console.log('Candidatura Portatore salvata');
        } catch (error) {
            console.error('Errore nel salvataggio candidatura Portatore:', error);
        }
    }
}

// ========================================
// GESTIONE FORM
// ========================================

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
        
        validateForm();
    });
    
    // Email validation e aggiornamento storico
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('input', function() {
        validateForm();
        
        // Aggiorna storico se email valida
        if (isValidEmail(this.value)) {
            displayUcmeHistory(this.value);
        } else {
            // Nascondi storico se email non valida
            document.getElementById('ucme-history').style.display = 'none';
        }
    });
    
    // Validazione altri campi
    const toneSelect = document.getElementById('tone');
    const acceptanceCheckbox = document.getElementById('acceptance');
    
    toneSelect.addEventListener('change', validateForm);
    acceptanceCheckbox.addEventListener('change', validateForm);
    
    // Form submission
    const form = document.getElementById('ucme-form');
    form.addEventListener('submit', handleFormSubmission);
    
    // Mobile-specific optimizations
    setupMobileTextareaHandling();
}

function setupMobileTextareaHandling() {
    const textarea = document.getElementById('ucme-text');
    
    textarea.addEventListener('focus', function() {
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    });
}

function setupFormValidation() {
    validateForm(); // Validazione iniziale
}

function validateForm() {
    const textarea = document.getElementById('ucme-text');
    const email = document.getElementById('email');
    const tone = document.getElementById('tone');
    const checkbox = document.getElementById('acceptance');
    const submitButton = document.getElementById('submit-button');
    
    const textValid = textarea.value.length >= 20 && textarea.value.length <= 600;
    const emailValid = email.value && isValidEmail(email.value);
    const toneValid = tone.value !== '';
    const checkboxValid = checkbox.checked;
    
    const isFormValid = textValid && emailValid && toneValid && checkboxValid;
    
    submitButton.disabled = !isFormValid;
    
    return isFormValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ========================================
// GESTIONE INVIO FORM
// ========================================

async function handleFormSubmission(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        showMobileFriendlyAlert('Per favore completa correttamente tutti i campi.');
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
        
        // Gestione candidatura Portatore
        if (formData.portatore) {
            savePortatoreData(formData.email);
        }
        
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
    const tone = document.getElementById('tone');
    const portatore = document.getElementById('portatore');
    
    return {
        id: generateUniqueId(),
        email: email.value.trim(),
        text: textarea.value.trim(),
        tone: tone.value,
        portatore: portatore.checked,
        timestamp: new Date().toISOString(),
        status: 'pending',
        response: null,
        metadata: {
            characterCount: textarea.value.length,
            userAgent: navigator.userAgent,
            language: navigator.language,
            isMobile: window.innerWidth <= 768,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            version: '2.0'
        }
    };
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========================================
// INTEGRAZIONE GOOGLE APPS SCRIPT
// ========================================

async function submitUCMeToGoogleSheet(formData) {
    // Configurazione Google Apps Script
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbze7pDyLOD_1lrg5v8hO6VC3Y9YXoTIZTcXlGZxeUFh8RNdCAJ1G7LweMWgBdZNOFZ4/exec';
    const API_KEY = 'mc_2024_filippo_1201_aB3xY9zK2m';
    
    const payload = {
        ...formData,
        key: API_KEY
    };
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore sconosciuto dal server');
        }
        
        console.log('Risposta Google Apps Script:', result);
        return result;
        
    } catch (error) {
        console.error('Errore nella comunicazione con Google Apps Script:', error);
        throw new Error('Errore di connessione. Riprova più tardi.');
    }
}

// ========================================
// UI FEEDBACK
// ========================================

function showLoadingState() {
    const submitButton = document.getElementById('submit-button');
    submitButton.classList.add('loading');
    submitButton.textContent = 'Affidando il pensiero...';
    submitButton.disabled = true;
}

function hideLoadingState() {
    const submitButton = document.getElementById('submit-button');
    submitButton.classList.remove('loading');
    submitButton.textContent = 'Affida il pensiero';
    validateForm(); // Ricalcola lo stato disabled
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

function showErrorMessage(message) {
    // Crea e mostra messaggio di errore temporaneo
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #ff6b6b;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 1001;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideInDown 0.3s ease-out;
        max-width: 90vw;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Rimuovi dopo 5 secondi
    setTimeout(() => {
        errorDiv.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 5000);
}

function resetForm() {
    const form = document.getElementById('ucme-form');
    form.reset();
    
    // Reset del contatore caratteri
    document.getElementById('char-count').textContent = '0';
    document.getElementById('char-count').style.color = '#999';
    
    // Reset select tono al valore di default
    document.getElementById('tone').value = 'neutro';
    
    // Nascondi storico se presente
    document.getElementById('ucme-history').style.display = 'none';
    
    // Disabilita il submit button
    document.getElementById('submit-button').disabled = true;
}

// ========================================
// NAVIGAZIONE E SCROLL
// ========================================

function scrollToForm() {
    const formSection = document.getElementById('form-section');
    formSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Focus sulla textarea dopo lo scroll
    const delay = window.innerWidth <= 768 ? 1000 : 800;
    setTimeout(() => {
        const textarea = document.getElementById('ucme-text');
        textarea.focus();
        
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, delay);
}

// ========================================
// OTTIMIZZAZIONI MOBILE
// ========================================

function setupMobileOptimizations() {
    handleResize();
    preventZoomOnFocus();
    handleViewportHeight();
    improveTouchInteractions();
    handleKeyboardVisibility();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        setTimeout(handleViewportHeight, 500);
    });
}

function handleResize() {
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('mobile', isMobile);
}

function preventZoomOnFocus() {
    if (isMobileDevice()) {
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.style.fontSize !== '16px') {
                input.style.fontSize = '16px';
            }
        });
    }
}

function handleViewportHeight() {
    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setVH();
    window.addEventListener('resize', setVH);
}

function improveTouchInteractions() {
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // Migliora il feedback visivo sui touch
        const touchElements = document.querySelectorAll('button, .checkbox-label, select');
        touchElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.opacity = '0.7';
            });
            
            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.opacity = '';
                }, 150);
            });
        });
    }
}

function handleKeyboardVisibility() {
    if (isMobileDevice()) {
        let initialViewportHeight = window.innerHeight;
        
        function handleViewportChange() {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-visible');
            } else {
                document.body.classList.remove('keyboard-visible');
                initialViewportHeight = currentHeight;
            }
        }
        
        window.addEventListener('resize', handleViewportChange);
        
        // Handle focus/blur events
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(handleViewportChange, 300);
            });
            
            input.addEventListener('blur', () => {
                setTimeout(() => {
                    document.body.classList.remove('keyboard-visible');
                }, 300);
            });
        });
    }
}

function showMobileFriendlyAlert(message) {
    showErrorMessage(message);
}

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ========================================
// UTILITY E FUNZIONI AMMINISTRATIVE
// ========================================

// Funzioni utility per debug e amministrazione
function getUcmeById(id) {
    return ucmeData.find(ucme => ucme.id === id);
}

function exportAllData() {
    const allData = {
        ucmes: ucmeData,
        portatori: portatoreData,
        exported: new Date().toISOString(),
        version: '2.0'
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mental_commons_export_${Date.now()}.json`;
    link.click();
    
    console.log('Dati esportati:', allData);
}

function clearAllData() {
    if (confirm('Sei sicuro di voler cancellare tutti i dati locali?')) {
        localStorage.removeItem('mentalCommons_ucmes');
        localStorage.removeItem('mentalCommons_portatori');
        localStorage.removeItem('mc-onboarded');
        ucmeData = [];
        portatoreData = [];
        console.log('Tutti i dati locali sono stati cancellati');
    }
}

function getStats() {
    return {
        totalUcmes: ucmeData.length,
        totalPortatori: portatoreData.length,
        ucmesByTone: ucmeData.reduce((acc, ucme) => {
            acc[ucme.tone || 'neutro'] = (acc[ucme.tone || 'neutro'] || 0) + 1;
            return acc;
        }, {}),
        lastUcme: ucmeData[ucmeData.length - 1],
        version: '2.0'
    };
}

// Animazioni CSS aggiuntive via JavaScript
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
    }
    
    @keyframes slideInDown {
        0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Esposizione funzioni globali per debugging
window.MCDebug = {
    getStats,
    exportAllData,
    clearAllData,
    getUcmeById,
    ucmeData: () => ucmeData,
    portatoreData: () => portatoreData
}; 