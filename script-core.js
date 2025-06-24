// Mental Commons 3.0 - Core Script Ottimizzato
// Bundle principale ridotto con lazy loading

console.log("🚀 Mental Commons Core Script 3.0 caricato");

// Sistema di logging produzione-aware
if (typeof window.isProduction === 'undefined') {
  window.isProduction = (
    location.hostname !== 'localhost' && 
    location.hostname !== '127.0.0.1' && 
    !location.hostname.includes('local')
  );
}

const { log, debug, info, warn, error } = window;

// Variabili globali essenziali
let currentUser = null;
let currentScreen = 'home';

// ========================================
// LAZY MODULE LOADER
// ========================================

const ModuleLoader = {
    loaded: new Set(),
    
    async load(moduleName) {
        if (this.loaded.has(moduleName)) {
            debug(`✅ Modulo ${moduleName} già caricato`);
            return;
        }
        
        try {
            debug(`🔄 Caricamento modulo ${moduleName}...`);
            
            const script = document.createElement('script');
            script.src = `/${moduleName}.js?v=${Date.now()}`;
            script.defer = true;
            
            const loadPromise = new Promise((resolve, reject) => {
                script.onload = () => {
                    this.loaded.add(moduleName);
                    debug(`✅ Modulo ${moduleName} caricato`);
                    resolve();
                };
                script.onerror = () => {
                    error(`❌ Errore caricamento modulo ${moduleName}`);
                    reject(new Error(`Failed to load ${moduleName}`));
                };
            });
            
            document.head.appendChild(script);
            await loadPromise;
            
        } catch (err) {
            error(`❌ Errore caricamento ${moduleName}:`, err);
            throw err;
        }
    }
};

// ========================================
// INIT OTTIMIZZATO
// ========================================

async function initializeApp() {
    log('🚀 Inizializzazione Mental Commons Core...');
    
    // Verifica stato auth immediato
    if (window.immediateAuthState && window.immediateAuthState.verified) {
        log('✅ Stato auth immediato trovato');
        
        if (window.immediateAuthState.isAuthenticated) {
            currentUser = window.immediateAuthState.user;
            log('👤 Utente autenticato:', currentUser.email);
        }
    }
    
    // Setup base
    setupBasicEventListeners();
    setupNavigation();
    updateStatsDisplay();
    
    // Lazy load auth module solo se necessario
    if (document.querySelector('.auth-form') || 
        document.querySelector('#login-section')) {
        await ModuleLoader.load('auth');
        if (window.PersistentAuth) {
            window.PersistentAuth.init();
        }
    }
    
    log('✅ Core inizializzazione completata');
}

// ========================================
// FUNZIONI CORE ESSENZIALI
// ========================================

function setupBasicEventListeners() {
    // Form principale UCMe
    const ucmeForm = document.getElementById('ucme-form');
    if (ucmeForm) {
        ucmeForm.addEventListener('submit', handleFormSubmission);
    }
    
    // Navigation
    document.addEventListener('click', (e) => {
        if (e.target.matches('a[href^="#"]')) {
            e.preventDefault();
            const target = e.target.getAttribute('href').substring(1);
            if (target) showScreen(target);
        }
        
        // CTA button
        if (e.target.matches('.cta-button, #main-cta')) {
            e.preventDefault();
            scrollToForm();
        }
    });
    
    debug('🔗 Event listeners di base configurati');
}

function setupNavigation() {
    const dashboardLink = document.getElementById('nav-dashboard');
    const mobiledashboardLink = document.getElementById('mobile-nav-dashboard');
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await loadDashboard();
        });
    }
    
    if (mobileGdashboardLink) {
        mobileDashboardLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await loadDashboard();
        });
    }
}

async function loadDashboard() {
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }
    
    // Lazy load dashboard module
    await ModuleLoader.load('dashboard-module');
    
    if (window.DashboardModule) {
        await window.DashboardModule.init();
        window.location.href = '/dashboard.html';
    }
}

function showScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        currentScreen = screenName;
    }
    
    updateNavigation(screenName);
}

function updateNavigation(activeScreen) {
    // Update navigation state
    debug(`🧭 Navigazione aggiornata: ${activeScreen}`);
}

function scrollToForm() {
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
    }
}

async function handleFormSubmission(event) {
    event.preventDefault();
    
    const formData = collectFormData();
    if (!validateForm(formData)) return;
    
    try {
        showLoadingState();
        
        // Se l'utente non è autenticato, submit anonimo
        if (!currentUser) {
            await submitAnonymousUCMe(formData);
        } else {
            await submitAuthenticatedUCMe(formData);
        }
        
        showSuccessMessage();
        resetForm();
        
    } catch (error) {
        error('❌ Errore invio form:', error);
        showErrorMessage('Errore durante l\'invio. Riprova.');
    } finally {
        hideLoadingState();
    }
}

function collectFormData() {
    return {
        email: document.getElementById('email')?.value || '',
        pensiero: document.getElementById('pensiero')?.value || '',
        tono: document.getElementById('tono')?.value || 'neutro',
        consenso: document.getElementById('consenso')?.checked || false
    };
}

function validateForm(data) {
    if (!data.pensiero.trim()) {
        showErrorMessage('Il pensiero non può essere vuoto');
        return false;
    }
    
    if (!data.consenso) {
        showErrorMessage('Devi accettare i termini per continuare');
        return false;
    }
    
    if (!currentUser && !isValidEmail(data.email)) {
        showErrorMessage('Inserisci un indirizzo email valido');
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function submitAnonymousUCMe(formData) {
    const response = await fetch('/api/ucme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'submitAnonymous',
            email: formData.email,
            content: formData.pensiero,
            tone: formData.tono
        })
    });
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || 'Errore invio');
    }
}

async function submitAuthenticatedUCMe(formData) {
    const response = await fetch('/api/ucme', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mental_commons_token')}`
        },
        body: JSON.stringify({
            action: 'submitAuthenticated',
            content: formData.pensiero,
            tone: formData.tono
        })
    });
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || 'Errore invio');
    }
}

// ========================================
// UI UTILITIES
// ========================================

function showLoadingState() {
    const submitBtn = document.querySelector('.submit-button');
    if (submitBtn) {
        submitBtn.textContent = 'Invio in corso...';
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
    }
}

function hideLoadingState() {
    const submitBtn = document.querySelector('.submit-button');
    if (submitBtn) {
        submitBtn.textContent = 'Invia il pensiero';
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

function showSuccessMessage() {
    const successDiv = document.querySelector('.success-message');
    if (successDiv) {
        successDiv.style.display = 'block';
        successDiv.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
}

function showErrorMessage(message) {
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function resetForm() {
    const form = document.getElementById('ucme-form');
    if (form) {
        form.reset();
        updateCharCounter();
    }
}

function updateCharCounter() {
    const textarea = document.getElementById('pensiero');
    const counter = document.querySelector('.char-counter');
    
    if (textarea && counter) {
        const count = textarea.value.length;
        counter.textContent = `${count}/2000 caratteri`;
        
        if (count > 1800) {
            counter.style.color = '#ff6b6b';
        } else if (count > 1500) {
            counter.style.color = '#ffd93d';
        } else {
            counter.style.color = '#6bcf7f';
        }
    }
}

async function updateStatsDisplay() {
    try {
        const stats = await fetch('/api/ping').then(r => r.json());
        
        if (stats.success && stats.stats) {
            document.getElementById('ucme-count').textContent = stats.stats.ucme_count || '–';
            document.getElementById('risposte-count').textContent = stats.stats.risposte_count || '–';
            document.getElementById('portatori-count').textContent = stats.stats.portatori_count || '–';
        }
    } catch (error) {
        debug('⚠️ Errore caricamento statistiche:', error);
    }
}

// ========================================
// CHARACTER COUNTER SETUP
// ========================================

function setupCharacterCounter() {
    const textarea = document.getElementById('pensiero');
    if (textarea) {
        textarea.addEventListener('input', updateCharCounter);
        updateCharCounter(); // Initial update
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupCharacterCounter();
    
    // Update stats every 30 seconds
    setInterval(updateStatsDisplay, 30000);
});

log('✅ Mental Commons Core Script caricato'); 