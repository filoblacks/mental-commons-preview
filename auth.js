// Mental Commons - Authentication Module 3.0
// Modulo separato per gestione autenticazione - Code Splitting

// Sistema di logging produzione-aware
if (typeof window.isProduction === 'undefined') {
  window.isProduction = (
    location.hostname !== 'localhost' && 
    location.hostname !== '127.0.0.1' && 
    !location.hostname.includes('local')
  );
}

const PRODUCTION_MODE = window.isProduction;
const authLog = (...args) => { if (!PRODUCTION_MODE) console.log(...args); };
const authDebug = (...args) => { if (!PRODUCTION_MODE) console.debug(...args); };
const authError = (...args) => { console.error(...args); };

// ================================================================
// MENTAL COMMONS - SISTEMA AUTENTICAZIONE PERSISTENTE
// ================================================================
// Versione: 3.0.0
// Descrizione: Gestione JWT persistente con localStorage e scadenza 30 giorni

// Sistema di logging semplificato - USA SOLO CONSOLE NATIVO
// NESSUNA definizione di log/debug/error/warn per evitare conflitti

// Usa direttamente console per evitare qualsiasi conflitto con script.js

// ================================================================
// CONFIGURAZIONE E STATO GLOBALE AUTH LOADING
// ================================================================

const AUTH_CONFIG = {
    TOKEN_KEY: 'mental_commons_token',
    USER_KEY: 'mental_commons_user',
    EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minuti di buffer prima della scadenza
    API_BASE_URL: `${window.location.origin}/api`
};

// STATO GLOBALE ANTI-FLICKER
window.authLoading = true;
window.authReady = false;

/**
 * 🚀 INIZIALIZZAZIONE IMMEDIATA ANTI-FLICKER
 * Eseguita appena il browser carica questo script, prima del DOM ready
 */
(function initImmediateAuth() {
            console.debug('🚀 ============================================');
        console.debug('🚀 INIZIALIZZAZIONE IMMEDIATA ANTI-FLICKER');
        console.debug('🚀 ============================================');
    
    // Aggiungi classe auth-loading al body
    if (document.body) {
        document.body.classList.add('auth-loading');
    } else {
        // Se il body non è ancora caricato, usa un observer
        const observer = new MutationObserver(function(mutations, obs) {
            if (document.body) {
                document.body.classList.add('auth-loading');
                obs.disconnect();
            }
        });
        observer.observe(document.documentElement, {childList: true, subtree: true});
    }
    
    // Esegui controllo auth immediato
    try {
        const immediateAuthResult = checkAuthImmediate();
        console.debug('🔍 Controllo auth immediato completato:', immediateAuthResult);
    } catch (error) {
        console.error('❌ Errore controllo auth immediato:', error);
    }
})();

/**
 * 🔍 CONTROLLO AUTH IMMEDIATO (SINCRONO)
 * Verifica token in localStorage senza chiamate API
 */
function checkAuthImmediate() {
    try {
        const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        const userJson = localStorage.getItem(AUTH_CONFIG.USER_KEY);
        
        if (!token || !userJson) {
            console.debug('👤 Nessun token/utente trovato - stato guest');
            window.authLoading = false;
            window.authReady = true;
            return { isAuthenticated: false, immediate: true };
        }
        
        const user = JSON.parse(userJson);
        
        // Verifica validità token (solo scadenza)
        if (isTokenExpired(token)) {
            console.debug('⏰ Token scaduto - pulizia automatica');
            clearAuthData();
            window.authLoading = false;
            window.authReady = true;
            return { isAuthenticated: false, expired: true, immediate: true };
        }
        
        console.debug('✅ Token valido trovato - utente autenticato');
        window.authLoading = false;
        window.authReady = true;
        return { 
            isAuthenticated: true, 
            user, 
            token,
            immediate: true
        };
    } catch (error) {
        console.error('❌ Errore controllo auth immediato:', error);
        clearAuthData();
        window.authLoading = false;
        window.authReady = true;
        return { isAuthenticated: false, error: true, immediate: true };
    }
}

/**
 * 🎯 FINALIZZA SETUP AUTH UI
 * Chiamata quando DOM è pronto per aggiornare la UI
 */
function finalizeAuthUI() {
        console.debug('🎯 ============================================');
        console.debug('🎯 FINALIZZAZIONE UI AUTH');
        console.debug('🎯 ============================================');
    
    // Mostra spinner durante verifica finale
    showAuthSpinner();
    
    // Controllo auth completo (con eventuali validazioni backend)
    const authResult = checkAuth();
    
    // Rimuovi classe loading e aggiungi ready
    if (document.body) {
        document.body.classList.remove('auth-loading');
        document.body.classList.add('auth-ready');
    }
    
    // Nascondi spinner
    hideAuthSpinner();
    
        console.debug('✅ UI Auth finalizzata');
    return authResult;
}

/**
 * 🔄 MOSTRA SPINNER AUTH
 */
function showAuthSpinner() {
    const spinners = document.querySelectorAll('.auth-loading-spinner');
    spinners.forEach(spinner => {
        spinner.style.display = 'inline-block';
    });
}

/**
 * 🔄 NASCONDI SPINNER AUTH
 */
function hideAuthSpinner() {
    const spinners = document.querySelectorAll('.auth-loading-spinner');
    spinners.forEach(spinner => {
        spinner.style.display = 'none';
    });
}

// ================================================================
// UTILITY JWT
// ================================================================

/**
 * Decodifica un JWT token senza verificarlo (solo per leggere i dati)
 */
function decodeJWT(token) {
    try {
        if (!token) return null;
        
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch (error) {
        console.error('❌ Errore decodifica JWT:', error);
        return null;
    }
}

/**
 * Verifica se un token JWT è scaduto
 */
function isTokenExpired(token) {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTime = payload.exp;
    
    // Considera scaduto se mancano meno di 5 minuti alla scadenza
    const bufferTime = Math.floor(AUTH_CONFIG.EXPIRY_BUFFER / 1000);
    return currentTime >= (expiryTime - bufferTime);
}

/**
 * Ottieni informazioni sul token
 */
function getTokenInfo(token) {
    const payload = decodeJWT(token);
    if (!payload) return null;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const issuedAt = new Date(payload.iat * 1000);
    const expiresAt = new Date(payload.exp * 1000);
    const timeToExpiry = payload.exp - currentTime;
    
    return {
        userId: payload.userId,
        email: payload.email,
        issuedAt,
        expiresAt,
        timeToExpiry,
        isExpired: isTokenExpired(token),
        daysUntilExpiry: Math.floor(timeToExpiry / (24 * 60 * 60))
    };
}

// ================================================================
// GESTIONE STORAGE PERSISTENTE
// ================================================================

/**
 * Salva il token e i dati utente in localStorage
 */
function saveAuthData(user, token) {
    try {
        console.debug('💾 Salvando dati autenticazione in localStorage...');
        
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
        
        // Log informazioni token
        const tokenInfo = getTokenInfo(token);
        if (tokenInfo) {
        console.debug('🎫 Token info:', {
                email: tokenInfo.email,
                expiresAt: tokenInfo.expiresAt,
                daysUntilExpiry: tokenInfo.daysUntilExpiry
            });
        }
        
        console.debug('✅ Dati autenticazione salvati con successo');
        return true;
    } catch (error) {
        console.error('❌ Errore salvataggio dati autenticazione:', error);
        return false;
    }
}

/**
 * Carica i dati di autenticazione da localStorage
 */
function loadAuthData() {
    try {
        const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        const userJson = localStorage.getItem(AUTH_CONFIG.USER_KEY);
        
        if (!token || !userJson) {
        console.debug('👤 Nessun dato di autenticazione trovato');
            return null;
        }
        
        const user = JSON.parse(userJson);
        
        console.debug('📂 Dati autenticazione caricati da localStorage');
        return { user, token };
    } catch (error) {
        console.error('❌ Errore caricamento dati autenticazione:', error);
        clearAuthData(); // Pulisci dati corrotti
        return null;
    }
}

/**
 * Pulisce tutti i dati di autenticazione
 */
function clearAuthData() {
    try {
        console.debug('🧹 Pulizia completa dati autenticazione...');
        
        // Rimuovi da localStorage
        localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
        localStorage.removeItem(AUTH_CONFIG.USER_KEY);
        
        // Rimuovi anche da sessionStorage (compatibilità)
        sessionStorage.removeItem('mental_commons_token');
        sessionStorage.removeItem('mental_commons_user');
        
        // Rimuovi anche eventuali dati legacy
        localStorage.removeItem('mc-user');
        localStorage.removeItem('mc-email');
        localStorage.removeItem('mc-users');
        
        console.debug('✅ Pulizia completa completata');
        return true;
    } catch (error) {
        console.error('❌ Errore durante pulizia dati:', error);
        return false;
    }
}

// ================================================================
// CONTROLLI AUTENTICAZIONE
// ================================================================

/**
 * Verifica se l'utente è autenticato con token valido
 */
function checkAuth() {
        console.debug('🔍 ============================================');
        console.debug('🔍 CONTROLLO AUTENTICAZIONE PERSISTENTE');
        console.debug('🔍 ============================================');
    
    const authData = loadAuthData();
    
    if (!authData) {
        console.debug('❌ Nessun dato di autenticazione disponibile');
        return { isAuthenticated: false, user: null, token: null };
    }
    
    const { user, token } = authData;
    
    // Verifica validità token
    if (isTokenExpired(token)) {
        console.debug('⏰ Token scaduto, logout automatico');
        clearAuthData();
        return { isAuthenticated: false, user: null, token: null, expired: true };
    }
    
    const tokenInfo = getTokenInfo(token);
        console.debug('✅ Utente autenticato:', {
        email: user.email,
        name: user.name,
        tokenValid: !tokenInfo.isExpired,
        daysUntilExpiry: tokenInfo.daysUntilExpiry
    });
    
    return { 
        isAuthenticated: true, 
        user, 
        token,
        tokenInfo
    };
}

/**
 * Forza logout utente
 */
function forceLogout(reason = 'Manual logout') {
        console.debug('🚪 ============================================');
        console.debug('🚪 LOGOUT FORZATO:', reason);
        console.debug('🚪 ============================================');
    
    clearAuthData();
    
    // Reset variabile globale se esiste
    if (typeof currentUser !== 'undefined') {
        currentUser = null;
    }
    
    // Aggiorna UI per utente guest
    if (typeof updateUIForGuestUser === 'function') {
        updateUIForGuestUser();
    }
    
    // Redirect a home se non siamo già lì
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/' && 
        !window.location.pathname.includes('login.html')) {
        console.debug('🔄 Redirect a homepage dopo logout');
        window.location.href = '/';
    }
    
        console.debug('✅ Logout completato');
}

// ================================================================
// VALIDAZIONE TOKEN CON BACKEND
// ================================================================

/**
 * Valida il token con il backend (opzionale, per sicurezza extra)
 */
async function validateTokenWithBackend(token) {
    try {
        console.debug('🔐 Validazione token con backend...');
        
        const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/validate-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
        console.debug('❌ Token non valido secondo il backend');
            return false;
        }
        
        const result = await response.json();
        console.debug('✅ Token validato dal backend');
        return result.valid === true;
    } catch (error) {
        console.error('❌ Errore validazione token con backend:', error);
        // In caso di errore di rete, assumiamo il token locale sia valido
        return true;
    }
}

// ================================================================
// INTEGRAZIONE CON CHIAMATE API
// ================================================================

/**
 * Aggiunge automaticamente l'header Authorization alle fetch
 */
function createAuthenticatedFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options = {}) {
        // Solo per le chiamate API interne
        if (url.includes('/api/') || url.startsWith(AUTH_CONFIG.API_BASE_URL)) {
            const authResult = checkAuth();
            
            if (authResult.isAuthenticated && authResult.token) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${authResult.token}`
                };
                
        console.debug('🔐 Header Authorization aggiunto alla chiamata API');
            }
        }
        
        return originalFetch.call(this, url, options);
    };
}

// ================================================================
// INIZIALIZZAZIONE E EXPORT
// ================================================================

/**
 * Inizializza il sistema di autenticazione persistente
 */
function initPersistentAuth() {
        console.debug('🚀 Inizializzazione autenticazione persistente...');
    
    // Configura fetch authenticato
    createAuthenticatedFetch();
    
    // Controllo iniziale autenticazione
    const authResult = checkAuth();
    
    if (authResult.expired) {
        console.debug('⚠️ Sessione scaduta, utente disconnesso automaticamente');
        // Potresti mostrare un messaggio all'utente qui
    }
    
        console.debug('✅ Sistema autenticazione persistente inizializzato');
    return authResult;
}

// Export delle funzioni per uso globale
window.PersistentAuth = {
    // Controlli principali
    checkAuth,
    forceLogout,
    
    // Anti-flicker
    checkAuthImmediate,
    finalizeAuthUI,
    showAuthSpinner,
    hideAuthSpinner,
    
    // Gestione dati
    saveAuthData,
    loadAuthData,
    clearAuthData,
    
    // Utility token
    decodeJWT,
    isTokenExpired,
    getTokenInfo,
    
    // Validazione
    validateTokenWithBackend,
    
    // Inizializzazione
    init: initPersistentAuth
};

console.debug('📚 Sistema autenticazione persistente caricato'); 