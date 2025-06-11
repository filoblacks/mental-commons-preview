// Mental Commons - Sistema Login con Email e Password
// Variabili globali per la pagina login
let isLoginMode = true;

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeLoginPage();
});

function initializeLoginPage() {
    console.log('Mental Commons Login inizializzato');
    
    // Setup event listeners
    setupTabSwitching();
    setupFormHandlers();
    setupFormValidation();
    
    // Focus sul primo campo
    document.getElementById('login-email').focus();
}

// ========================================
// GESTIONE TAB SWITCHING
// ========================================

function setupTabSwitching() {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    loginTab.addEventListener('click', () => {
        switchToLogin();
    });
    
    registerTab.addEventListener('click', () => {
        switchToRegister();
    });
}

function switchToLogin() {
    isLoginMode = true;
    
    // Aggiorna tab buttons
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    
    // Mostra/nascondi form
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    
    // Nascondi errori
    hideError();
    
    // Focus
    document.getElementById('login-email').focus();
}

function switchToRegister() {
    isLoginMode = false;
    
    // Aggiorna tab buttons
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.add('active');
    
    // Mostra/nascondi form
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    
    // Nascondi errori
    hideError();
    
    // Focus
    document.getElementById('register-email').focus();
}

// ========================================
// GESTIONE FORM
// ========================================

function setupFormHandlers() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
}

async function handleLogin(event) {
    event.preventDefault();
    hideError();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Validazione base
    if (!isValidEmail(email)) {
        showError('Inserisci un indirizzo email valido');
        return;
    }
    
    if (password.length < 1) {
        showError('Inserisci la password');
        return;
    }
    
    // Tentativo di login
    const result = await loginUserWithPassword(email, password);
    
    if (result.success) {
        // Login riuscito - reindirizza alla dashboard
        window.location.href = 'dashboard.html';
    } else {
        showError(result.error);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    hideError();
    
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    // Validazione
    if (!isValidEmail(email)) {
        showError('Inserisci un indirizzo email valido');
        return;
    }
    
    if (password.length < 6) {
        showError('La password deve essere di almeno 6 caratteri');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Le password non coincidono');
        return;
    }
    
    // Tentativo di registrazione
    const result = await registerUserWithPassword(email, password);
    
    if (result.success) {
        // Registrazione riuscita - login automatico e reindirizza alla dashboard
        window.location.href = 'dashboard.html';
    } else {
        showError(result.error);
    }
}

// ========================================
// FUNZIONI DI AUTENTICAZIONE
// ========================================

async function loginUserWithPassword(email, password) {
    // Simula chiamata al server con localStorage per ora
    const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
    const user = users.find(u => u.email === email);
    
    if (!user) {
        return { error: 'Email non trovata. Prova a registrarti.' };
    }
    
    // Verifica password (in produzione sarebbe hashata)
    if (user.password !== password) {
        return { error: 'Password non corretta.' };
    }
    
    // Login riuscito
    user.lastLogin = new Date().toISOString();
    
    // Salva utente corrente
    localStorage.setItem('mc-user', JSON.stringify(user));
    
    // Aggiorna nella lista utenti
    const userIndex = users.findIndex(u => u.id === user.id);
    users[userIndex] = user;
    localStorage.setItem('mc-users', JSON.stringify(users));
    
    console.log('Login riuscito per:', email);
    return { success: true, user: user };
}

async function registerUserWithPassword(email, password) {
    const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
    
    // Controlla se email già esiste
    if (users.find(u => u.email === email)) {
        return { error: 'Email già registrata. Prova ad accedere.' };
    }
    
    // Crea nuovo utente
    const user = {
        id: generateUniqueId(),
        email: email,
        password: password, // In produzione sarebbe hashata
        name: 'Anonimo',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isPortatore: false
    };
    
    // Aggiungi alla lista utenti
    users.push(user);
    localStorage.setItem('mc-users', JSON.stringify(users));
    
    // Salva come utente corrente
    localStorage.setItem('mc-user', JSON.stringify(user));
    
    console.log('Registrazione riuscita per:', email);
    return { success: true, user: user };
}

// ========================================
// UTILITÀ
// ========================================

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.animation = 'fadeIn 0.3s ease-out';
}

function hideError() {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.style.display = 'none';
}

// ========================================
// VALIDAZIONE FORM
// ========================================

function setupFormValidation() {
    // Validazione real-time per migliorare UX
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    
    if (field.type === 'email' && value && !isValidEmail(value)) {
        field.style.borderColor = '#ff6b6b';
    } else {
        field.style.borderColor = '#333';
    }
}

function clearFieldError(event) {
    const field = event.target;
    field.style.borderColor = '#333';
} 