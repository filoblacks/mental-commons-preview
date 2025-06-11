// Mental Commons 3.0 - Sistema Completo con Login e Area Utente
// Variabili globali
let ucmeData = [];
let portatoreData = [];
let currentUser = null;
let currentScreen = 'home';

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Mostra onboarding se necessario
    checkAndShowOnboarding();
    
    // Carica dati esistenti dal localStorage
    loadExistingData();
    
    // Controlla se utente già loggato
    checkExistingUser();
    
    // Inizializza schermata home
    showScreen('home');
    
    // Carica e mostra contatori poetici
    loadRitualStats();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup form validation
    setupFormValidation();
    
    // Setup mobile optimizations
    setupMobileOptimizations();
    
    console.log('Mental Commons 3.0 inizializzato');
}

// ========================================
// GESTIONE NAVIGAZIONE
// ========================================

function showScreen(screenName) {
    // Nascondi tutte le schermate
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Mostra schermata richiesta
    const targetScreen = document.getElementById(screenName + '-screen');
    if (targetScreen) {
        targetScreen.style.display = 'block';
    }
    
    // Aggiorna navigazione
    updateNavigation(screenName);
    
    currentScreen = screenName;
    console.log('Passaggio a schermata:', screenName);
}

function updateNavigation(activeScreen) {
    // La navigazione ora è gestita tramite nav-buttons semplici
    // Non ci sono più elementi da aggiornare per l'header
    // Questa funzione è mantenuta per compatibilità
    
    // Se l'utente è loggato, potremmo aggiornare i link nella nav-buttons
    // ma per ora manteniamo semplice con i due link fissi
    
    currentScreen = activeScreen;
}

// ========================================
// GESTIONE UTENTI E AUTENTICAZIONE
// ========================================

function checkExistingUser() {
    const savedUser = localStorage.getItem('mc-user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('Utente trovato:', currentUser.email);
            updateUIForLoggedUser();
            updateNavigation(currentScreen);
        } catch (error) {
            console.error('Errore nel caricamento utente:', error);
            localStorage.removeItem('mc-user');
        }
    } else {
        updateUIForGuestUser();
    }
}

function createUser(email, name = null, accessCode = null) {
    const user = {
        id: generateUniqueId(),
        email: email,
        name: name || 'Anonimo',
        accessCode: accessCode || generateAccessCode(),
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isPortatore: false
    };
    
    // Salva utente
    currentUser = user;
    localStorage.setItem('mc-user', JSON.stringify(user));
    
    console.log('Nuovo utente creato:', email);
    return user;
}

function loginUser(email, accessCode) {
    // In un'implementazione reale, questo dovrebbe verificare con un server
    // Per ora, creiamo/troviamo l'utente localmente
    
    const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
    let user = users.find(u => u.email === email);
    
    if (!user) {
        // Se non esiste, chiedi se vuole registrarsi
        return { error: 'Email non trovata. Vuoi registrarti?' };
    }
    
    if (user.accessCode !== accessCode) {
        return { error: 'Codice di accesso non valido.' };
    }
    
    // Login riuscito
    user.lastLogin = new Date().toISOString();
    currentUser = user;
    localStorage.setItem('mc-user', JSON.stringify(user));
    
    // Aggiorna nella lista utenti
    const userIndex = users.findIndex(u => u.id === user.id);
    users[userIndex] = user;
    localStorage.setItem('mc-users', JSON.stringify(users));
    
    console.log('Login riuscito per:', email);
    return { success: true, user: user };
}

function registerUser(email, name) {
    const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
    
    // Controlla se email già esiste
    if (users.find(u => u.email === email)) {
        return { error: 'Email già registrata. Prova ad accedere.' };
    }
    
    // Crea nuovo utente
    const user = createUser(email, name);
    
    // Aggiungi alla lista utenti
    users.push(user);
    localStorage.setItem('mc-users', JSON.stringify(users));
    
    // Simula invio email con codice di accesso
    console.log('Codice di accesso per', email, ':', user.accessCode);
    
    return { 
        success: true, 
        user: user,
        message: `Registrazione completata! Il tuo codice di accesso è: ${user.accessCode}`
    };
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('mc-user');
    localStorage.removeItem('mc-email'); // Rimuove anche l'email per la dashboard
    updateUIForGuestUser();
    showScreen('home');
    console.log('Logout completato');
}

// ========================================
// GESTIONE UI BASED SU LOGIN STATE
// ========================================

function updateUIForLoggedUser() {
    if (!currentUser) return;
    
    // Aggiorna navigazione
    const navLogin = document.getElementById('nav-login');
    const navDashboard = document.getElementById('nav-dashboard');
    const navLogout = document.getElementById('nav-logout');
    
    if (navLogin) navLogin.style.display = 'none';
    if (navDashboard) navDashboard.style.display = 'block';
    if (navLogout) {
        navLogout.style.display = 'block';
        navLogout.onclick = logoutUser;
    }
    
    // Salva email per dashboard
    localStorage.setItem('mc-email', currentUser.email);
    
    // Aggiorna sezione di benvenuto nella homepage
    const userWelcome = document.getElementById('user-welcome');
    const mainCta = document.getElementById('main-cta');
    const welcomeMessage = document.getElementById('welcome-message');
    
    if (userWelcome && mainCta) {
        userWelcome.style.display = 'block';
        mainCta.style.display = 'none';
        
        if (welcomeMessage) {
            const name = currentUser.name !== 'Anonimo' ? `, ${currentUser.name}` : '';
            welcomeMessage.textContent = `Bentornato${name}`;
        }
    }
    
    // Pre-popola email nel form se presente
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = currentUser.email;
        emailInput.readOnly = true;
        emailInput.style.backgroundColor = '#1a1a1a';
        emailInput.style.opacity = '0.7';
    }
    
    console.log('UI aggiornata per utente loggato:', currentUser.email);
}

function updateUIForGuestUser() {
    // Aggiorna navigazione
    const navLogin = document.getElementById('nav-login');
    const navDashboard = document.getElementById('nav-dashboard');
    const navLogout = document.getElementById('nav-logout');
    
    if (navLogin) navLogin.style.display = 'block';
    if (navDashboard) navDashboard.style.display = 'none';
    if (navLogout) navLogout.style.display = 'none';
    
    // Mostra sezione guest nella homepage
    const userWelcome = document.getElementById('user-welcome');
    const mainCta = document.getElementById('main-cta');
    
    if (userWelcome && mainCta) {
        userWelcome.style.display = 'none';
        mainCta.style.display = 'block';
    }
    
    // Reset email field
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = '';
        emailInput.readOnly = false;
        emailInput.style.backgroundColor = '';
        emailInput.style.opacity = '';
    }
    
    console.log('UI aggiornata per utente guest');
}

function generateAccessCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ========================================
// GESTIONE AREA UTENTE
// ========================================

function loadUserDashboard() {
    if (!currentUser) return;
    
    // Aggiorna nome utente
    document.getElementById('user-welcome').textContent = 
        `Bentornato${currentUser.name !== 'Anonimo' ? ', ' + currentUser.name : ''}`;
    
    // Carica UCMe dell'utente
    const userUcmes = ucmeData.filter(ucme => ucme.email === currentUser.email);
    
    // Aggiorna statistiche
    updateUserStats(userUcmes);
    
    // Mostra UCMe
    displayUserUcmes(userUcmes);
}

function updateUserStats(userUcmes) {
    const totalUcmes = userUcmes.length;
    const responsesReceived = userUcmes.filter(ucme => ucme.response).length;
    const daysSinceFirst = userUcmes.length > 0 ? 
        Math.floor((new Date() - new Date(userUcmes[0].timestamp)) / (1000 * 60 * 60 * 24)) : 0;
    
    document.getElementById('total-ucmes').textContent = totalUcmes;
    document.getElementById('responses-received').textContent = responsesReceived;
    document.getElementById('days-since-first').textContent = daysSinceFirst;
}

function displayUserUcmes(userUcmes) {
    const container = document.getElementById('user-ucmes');
    container.innerHTML = '';
    
    if (userUcmes.length === 0) {
        container.innerHTML = `
            <div class="no-ucmes">
                <p>Non hai ancora scritto nessun pensiero.</p>
                <button onclick="showScreen('home')" class="auth-button">Scrivi la tua prima UCMe</button>
            </div>
        `;
        return;
    }
    
    // Ordina per timestamp (più recenti prima)
    const sortedUcmes = userUcmes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedUcmes.forEach((ucme, index) => {
        const ucmeElement = createUserUcmeElement(ucme, index);
        container.appendChild(ucmeElement);
    });
}

function createUserUcmeElement(ucme, index) {
    const element = document.createElement('div');
    element.className = 'user-ucme-item';
    element.style.animationDelay = `${index * 0.1}s`;
    
    const date = new Date(ucme.timestamp);
    const formattedDate = date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusClass = ucme.response ? 'completed' : 'pending';
    const statusText = ucme.response ? 'Risposta ricevuta' : 'In attesa di risposta';
    
    element.innerHTML = `
        <div class="ucme-text">${ucme.text}</div>
        <div class="ucme-meta">
            <span>${formattedDate} • Tono: ${ucme.tone}</span>
            <span class="ucme-status ${statusClass}">${statusText}</span>
        </div>
        ${ucme.response ? `<div class="ucme-response">${ucme.response}</div>` : ''}
    `;
    
    return element;
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
    modal.style.animation = 'fadeIn 0.5s ease-out';
    
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
        if (emailInput) {
            emailInput.value = email;
            validateForm();
        }
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
    
    if (historySection && historyList) {
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
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Navigazione header
    setupNavigationListeners();
    
    // Form di autenticazione
    setupAuthFormListeners();
    
    // Form UCMe principale
    setupMainFormListeners();
    
    // Area utente
    setupUserAreaListeners();
}

function setupNavigationListeners() {
    // La navigazione ora è gestita tramite semplici link in nav-buttons
    // Gestiamo solo l'area utente se necessario
    document.getElementById('nav-user')?.addEventListener('click', () => {
        showScreen('user');
        loadUserDashboard();
    });
    document.getElementById('nav-logout')?.addEventListener('click', logoutUser);
}

function setupAuthFormListeners() {
    // Le funzioni di autenticazione sono ora gestite in login.js
    // Questa funzione è mantenuta per compatibilità ma può essere vuota
}

function setupMainFormListeners() {
    // Textarea character counter
    const textarea = document.getElementById('ucme-text');
    const charCount = document.getElementById('char-count');
    
    if (textarea && charCount) {
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
    }
    
    // Form validation
    const form = document.getElementById('ucme-form');
    if (form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('input', validateForm);
            input.addEventListener('change', validateForm);
        });
        
        form.addEventListener('submit', handleFormSubmission);
    }
}

function setupUserAreaListeners() {
    document.getElementById('edit-profile')?.addEventListener('click', editProfile);
    document.getElementById('export-data')?.addEventListener('click', exportUserData);
    document.getElementById('delete-account')?.addEventListener('click', deleteAccount);
}

// ========================================
// GESTIONE FORM AUTENTICAZIONE
// ========================================
// (Rimosso - ora gestito in login.js)

// ========================================
// GESTIONE AREA UTENTE - AZIONI
// ========================================

function editProfile() {
    if (!currentUser) return;
    
    const newName = prompt('Inserisci il tuo nome:', currentUser.name);
    if (newName !== null && newName.trim() !== '') {
        currentUser.name = newName.trim();
        localStorage.setItem('mc-user', JSON.stringify(currentUser));
        
        // Aggiorna anche nella lista utenti
        const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            localStorage.setItem('mc-users', JSON.stringify(users));
        }
        
        loadUserDashboard(); // Ricarica dashboard
        showMobileFriendlyAlert('Profilo aggiornato!');
    }
}

function exportUserData() {
    if (!currentUser) return;
    
    const userUcmes = ucmeData.filter(ucme => ucme.email === currentUser.email);
    const exportData = {
        user: currentUser,
        ucmes: userUcmes,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mental-commons-${currentUser.email}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showMobileFriendlyAlert('Dati esportati!');
}

function deleteAccount() {
    if (!currentUser) return;
    
    if (confirm('Sei sicuro di voler eliminare il tuo account? Questa azione non può essere annullata.')) {
        // Rimuovi utente dalla lista
        const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
        const filteredUsers = users.filter(u => u.id !== currentUser.id);
        localStorage.setItem('mc-users', JSON.stringify(filteredUsers));
        
        // Rimuovi UCMe dell'utente (opzionale - potresti volerle mantenere anonime)
        ucmeData = ucmeData.filter(ucme => ucme.email !== currentUser.email);
        localStorage.setItem('mentalCommons_ucmes', JSON.stringify(ucmeData));
        
        // Logout
        logoutUser();
        
        showMobileFriendlyAlert('Account eliminato.');
    }
}

// ========================================
// GESTIONE FORM
// ========================================

function setupFormValidation() {
    validateForm(); // Validazione iniziale
}

function validateForm() {
    const textarea = document.getElementById('ucme-text');
    const email = document.getElementById('email');
    const tone = document.getElementById('tone');
    const checkbox = document.getElementById('acceptance');
    const submitButton = document.getElementById('submit-button');
    
    if (!textarea || !email || !tone || !checkbox || !submitButton) {
        return false;
    }
    
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
        
        // Se utente loggato, aggiorna la dashboard
        if (currentUser && currentUser.email === formData.email) {
            loadUserDashboard();
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
    
    // Se l'utente è loggato, usa la sua email
    const userEmail = currentUser ? currentUser.email : email.value.trim();
    
    return {
        id: generateUniqueId(),
        email: userEmail,
        text: textarea.value.trim(),
        tone: tone.value,
        portatore: portatore ? portatore.checked : false,
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
            version: '3.0',
            userId: currentUser ? currentUser.id : null
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
    if (submitButton) {
        submitButton.classList.add('loading');
        submitButton.textContent = 'Affidando il pensiero...';
        submitButton.disabled = true;
    }
}

function hideLoadingState() {
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.classList.remove('loading');
        submitButton.textContent = 'Affida il pensiero';
        validateForm(); // Ricalcola lo stato disabled
    }
}

function showSuccessMessage() {
    const form = document.getElementById('ucme-form');
    const successMessage = document.getElementById('success-message');
    
    if (form && successMessage) {
        // Nascondi il form e mostra il messaggio
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Scroll al messaggio di successo
        successMessage.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        
        // Dopo 5 secondi, rimostra il form
        setTimeout(() => {
            successMessage.style.display = 'none';
            form.style.display = 'block';
        }, 5000);
    }
}

function showErrorMessage(message) {
    showMobileFriendlyAlert('Errore: ' + message);
}

function resetForm() {
    const form = document.getElementById('ucme-form');
    if (!form) return;
    
    form.reset();
    
    // Reset del contatore caratteri
    const charCount = document.getElementById('char-count');
    if (charCount) {
        charCount.textContent = '0';
        charCount.style.color = '#999';
    }
    
    // Reset select tono al valore di default
    const toneSelect = document.getElementById('tone');
    if (toneSelect) {
        toneSelect.value = 'neutro';
    }
    
    // Se utente loggato, mantieni la sua email
    if (currentUser) {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = currentUser.email;
            emailInput.disabled = true;
        }
    }
    
    // Disabilita il submit button
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.disabled = true;
    }
}

// ========================================
// NAVIGAZIONE E SCROLL
// ========================================

function scrollToForm() {
    const formSection = document.getElementById('form-section');
    if (formSection) {
        formSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ========================================
// MOBILE OPTIMIZATIONS
// ========================================

function setupMobileOptimizations() {
    setupMobileTextareaHandling();
    handleResize();
    preventZoomOnFocus();
    handleViewportHeight();
    improveTouchInteractions();
    handleKeyboardVisibility();
}

function setupMobileTextareaHandling() {
    const textarea = document.getElementById('ucme-text');
    
    if (textarea) {
        textarea.addEventListener('focus', function() {
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
    }
}

function handleResize() {
    window.addEventListener('resize', () => {
        handleViewportHeight();
    });
}

function preventZoomOnFocus() {
    const inputs = document.querySelectorAll('input[type="email"], input[type="text"], textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (window.innerWidth <= 768) {
                this.style.fontSize = '16px';
            }
        });
    });
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
    // Miglioramenti per dispositivi touch
    const buttons = document.querySelectorAll('button, .nav-button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
        });
    });
}

function handleKeyboardVisibility() {
    if (window.innerWidth <= 768) {
        function handleViewportChange() {
            const currentHeight = window.innerHeight;
            const initialHeight = window.screen.height;
            
            if (currentHeight < initialHeight * 0.75) {
                document.body.classList.add('keyboard-visible');
            } else {
                document.body.classList.remove('keyboard-visible');
            }
        }
        
        window.addEventListener('resize', handleViewportChange);
        
        // Initial check
        handleViewportChange();
    }
}

function showMobileFriendlyAlert(message) {
    // Versione mobile-friendly degli alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'mobile-alert';
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 10001;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideInDown 0.3s ease-out;
        max-width: 90vw;
        text-align: center;
    `;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    // Rimuovi dopo 4 secondi
    setTimeout(() => {
        alertDiv.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 300);
    }, 4000);
}

// ========================================
// UTILITY E HELPERS
// ========================================

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getStats() {
    return {
        totalUcmes: ucmeData.length,
        totalPortatori: portatoreData.length,
        totalUsers: JSON.parse(localStorage.getItem('mc-users') || '[]').length,
        currentUser: currentUser,
        ucmeData: () => ucmeData,
        portatoreData: () => portatoreData
    };
}

function exportAllData() {
    const data = {
        ucmes: ucmeData,
        portatori: portatoreData,
        users: JSON.parse(localStorage.getItem('mc-users') || '[]'),
        currentUser: currentUser,
        exportDate: new Date().toISOString(),
        version: '3.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mental-commons-full-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function clearAllData() {
    if (confirm('Sei sicuro di voler cancellare tutti i dati? Questa azione non può essere annullata.')) {
        localStorage.removeItem('mentalCommons_ucmes');
        localStorage.removeItem('mentalCommons_portatori');
        localStorage.removeItem('mc-users');
        localStorage.removeItem('mc-user');
        localStorage.removeItem('mc-onboarded');
        console.log('Tutti i dati cancellati');
        location.reload();
    }
}

// ========================================
// FUNZIONI DI DEBUG E TEST
// ========================================

function createTestData() {
    // Crea utenti di test
    const testUsers = [
        {
            id: 'test_user_1',
            email: 'test@email.com',
            name: 'Marco',
            accessCode: 'ABC123',
            createdAt: '2024-12-10T10:00:00Z',
            lastLogin: '2024-12-11T14:30:00Z',
            isPortatore: false
        },
        {
            id: 'test_user_2',
            email: 'altro@email.com',
            name: 'Sofia',
            accessCode: 'XYZ789',
            createdAt: '2024-12-08T15:20:00Z',
            lastLogin: '2024-12-11T09:15:00Z',
            isPortatore: true
        }
    ];
    
    // Dati di test per verificare il funzionamento
    const testUcmes = [
        {
            id: "test_1",
            email: "test@email.com",
            text: "Ho un pensiero che non riesco a dire a voce. È come se avessi dentro qualcosa di importante ma ogni volta che provo a condividerlo con qualcuno, le parole si perdono. Non so se è paura del giudizio o semplicemente non so come esprimermi.",
            tone: "calmo",
            portatore: false,
            timestamp: "2024-12-11T10:30:00Z",
            status: "pending",
            response: null,
            metadata: {
                characterCount: 280,
                userAgent: "Test",
                language: "it-IT",
                version: "3.0",
                userId: "test_user_1"
            }
        },
        {
            id: "test_2",
            email: "test@email.com",
            text: "Oggi ho sentito una connessione profonda con qualcuno e mi ha fatto riflettere su quanto sia raro trovare persone con cui puoi davvero essere te stesso. È un pensiero che mi riempie di gratitudine ma anche di malinconia.",
            tone: "poetico",
            portatore: true,
            timestamp: "2024-12-10T14:20:00Z",
            status: "completed",
            response: "La tua riflessione tocca qualcosa di universale: il bisogno di autenticità nelle relazioni umane. È bello che tu abbia trovato quella connessione, e la malinconia che provi forse nasce dalla consapevolezza di quanto sia preziosa.",
            metadata: {
                characterCount: 250,
                userAgent: "Test",
                language: "it-IT",
                version: "3.0",
                userId: "test_user_1"
            }
        },
        {
            id: "test_3",
            email: "altro@email.com",
            text: "Mi sento come se stessi vivendo la vita di qualcun altro. Ogni giorno faccio le stesse cose, ma non sento che mi appartengano davvero. È come se fossi un attore che recita un ruolo che non ha scelto.",
            tone: "neutro",
            portatore: false,
            timestamp: "2024-12-09T18:45:00Z",
            status: "pending",
            response: null,
            metadata: {
                characterCount: 220,
                userAgent: "Test",
                language: "it-IT",
                version: "3.0",
                userId: "test_user_2"
            }
        }
    ];
    
    // Salva i dati nel localStorage
    localStorage.setItem('mc-users', JSON.stringify(testUsers));
    localStorage.setItem('mentalCommons_ucmes', JSON.stringify(testUcmes));
    
    // Aggiorna le variabili globali
    ucmeData = testUcmes;
    
    console.log('Dati di test creati nel localStorage');
    console.log('Utenti disponibili:');
    testUsers.forEach(user => {
        console.log(`- ${user.email} (codice: ${user.accessCode})`);
    });
}

function clearTestData() {
    clearAllData();
}

// Inizializzazione quando tutto è pronto
window.addEventListener('load', () => {
    // Pre-popola email se utente loggato
    if (currentUser) {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = currentUser.email;
            emailInput.disabled = true;
        }
    }
});

// ========================================
// CONTATORI POETICI
// ========================================

async function loadRitualStats() {
    try {
        // Carica UCMe
        const ucmeResponse = await fetch('data.json');
        const ucmeJson = await ucmeResponse.json();
        const ucmes = ucmeJson.ucmes || [];
        
        // Carica risposte
        let risposte = [];
        try {
            const risposteResponse = await fetch('risposte.json');
            const risposteJson = await risposteResponse.json();
            risposte = risposteJson.risposte || [];
        } catch (error) {
            console.log('File risposte.json non trovato, usando valori di default');
        }
        
        // Calcola statistiche
        const ucmeCount = ucmes.length;
        const risposteCount = risposte.length;
        
        // Portatori attivi (email uniche nel campo portatore)
        const portatoriAttivi = new Set(risposte.map(r => r.portatore)).size;
        
        // Aggiorna i contatori con animazione fade-in
        updateStatsWithAnimation(ucmeCount, risposteCount, portatoriAttivi);
        
        console.log('Statistiche caricate:', {
            ucmes: ucmeCount,
            risposte: risposteCount,
            portatori: portatoriAttivi
        });
        
    } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
        // Mostra valori di default in caso di errore
        updateStatsWithAnimation(0, 0, 0);
    }
}

function updateStatsWithAnimation(ucmeCount, risposteCount, portatoriCount) {
    // Trova gli elementi
    const ucmeElement = document.getElementById('ucme-count');
    const risposteElement = document.getElementById('risposte-count');
    const portatoriElement = document.getElementById('portatori-count');
    
    if (!ucmeElement || !risposteElement || !portatoriElement) {
        console.warn('Elementi contatori non trovati');
        return;
    }
    
    // Animazione di fade-in ritardata per effetto poetico
    setTimeout(() => {
        ucmeElement.textContent = ucmeCount;
        ucmeElement.style.opacity = '0';
        ucmeElement.style.transition = 'opacity 0.8s ease';
        setTimeout(() => ucmeElement.style.opacity = '1', 100);
    }, 500);
    
    setTimeout(() => {
        risposteElement.textContent = risposteCount;
        risposteElement.style.opacity = '0';
        risposteElement.style.transition = 'opacity 0.8s ease';
        setTimeout(() => risposteElement.style.opacity = '1', 100);
    }, 800);
    
    setTimeout(() => {
        portatoriElement.textContent = portatoriCount;
        portatoriElement.style.opacity = '0';
        portatoriElement.style.transition = 'opacity 0.8s ease';
        setTimeout(() => portatoriElement.style.opacity = '1', 100);
    }, 1100);
}

// Rendi disponibili le funzioni dalla console
window.MentalCommons = {
    createTestData,
    clearTestData,
    getStats,
    exportAllData,
    clearAllData,
    showScreen,
    currentUser: () => currentUser,
    loginUser,
    registerUser,
    logoutUser,
    loadRitualStats
}; 