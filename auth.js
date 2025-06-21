// ================================================================
// MENTAL COMMONS - SISTEMA AUTENTICAZIONE PERSISTENTE
// ================================================================
// Versione: 3.0.0
// Descrizione: Gestione JWT persistente con localStorage e scadenza 30 giorni

// Sistema di logging produzione-aware
// Usa la definizione globale sicura da script.js
if (typeof window.isProduction === 'undefined') {
  window.isProduction = (() => {
    const hostname = window.location.hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('vercel.app');
  });
}
const PRODUCTION_MODE = window.isProduction();
const log = (...args) => { if (!PRODUCTION_MODE) debug(...args); };
const debug = (...args) => { if (!PRODUCTION_MODE) console.debug(...args); };
const error = (...args) => { error(...args); };
const warn = (...args) => { if (!PRODUCTION_MODE) console.warn(...args); };

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
    debug('🚀 ============================================');
    debug('🚀 INIZIALIZZAZIONE IMMEDIATA ANTI-FLICKER');
    debug('🚀 ============================================');
    
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
        debug('🔍 Controllo auth immediato completato:', immediateAuthResult);
    } catch (error) {
        error('❌ Errore controllo auth immediato:', error);
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
            debug('👤 Nessun token/utente trovato - stato guest');
            window.authLoading = false;
            window.authReady = true;
            return { isAuthenticated: false, immediate: true };
        }
        
        const user = JSON.parse(userJson);
        
        // Verifica validità token (solo scadenza)
        if (isTokenExpired(token)) {
            debug('⏰ Token scaduto - pulizia automatica');
            clearAuthData();
            window.authLoading = false;
            window.authReady = true;
            return { isAuthenticated: false, expired: true, immediate: true };
        }
        
        debug('✅ Token valido trovato - utente autenticato');
        window.authLoading = false;
        window.authReady = true;
        return { 
            isAuthenticated: true, 
            user, 
            token,
            immediate: true
        };
    } catch (error) {
        error('❌ Errore controllo auth immediato:', error);
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
    debug('🎯 ============================================');
    debug('🎯 FINALIZZAZIONE UI AUTH');
    debug('🎯 ============================================');
    
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
    
    debug('✅ UI Auth finalizzata');
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
        error('❌ Errore decodifica JWT:', error);
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
        debug('💾 Salvando dati autenticazione in localStorage...');
        
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
        
        // Log informazioni token
        const tokenInfo = getTokenInfo(token);
        if (tokenInfo) {
            debug('🎫 Token info:', {
                email: tokenInfo.email,
                expiresAt: tokenInfo.expiresAt,
                daysUntilExpiry: tokenInfo.daysUntilExpiry
            });
        }
        
        debug('✅ Dati autenticazione salvati con successo');
        return true;
    } catch (error) {
        error('❌ Errore salvataggio dati autenticazione:', error);
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
            debug('👤 Nessun dato di autenticazione trovato');
            return null;
        }
        
        const user = JSON.parse(userJson);
        
        debug('📂 Dati autenticazione caricati da localStorage');
        return { user, token };
    } catch (error) {
        error('❌ Errore caricamento dati autenticazione:', error);
        clearAuthData(); // Pulisci dati corrotti
        return null;
    }
}

/**
 * Pulisce tutti i dati di autenticazione
 */
function clearAuthData() {
    try {
        debug('🧹 Pulizia completa dati autenticazione...');
        
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
        
        debug('✅ Pulizia completa completata');
        return true;
    } catch (error) {
        error('❌ Errore durante pulizia dati:', error);
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
    debug('🔍 ============================================');
    debug('🔍 CONTROLLO AUTENTICAZIONE PERSISTENTE');
    debug('🔍 ============================================');
    
    const authData = loadAuthData();
    
    if (!authData) {
        debug('❌ Nessun dato di autenticazione disponibile');
        return { isAuthenticated: false, user: null, token: null };
    }
    
    const { user, token } = authData;
    
    // Verifica validità token
    if (isTokenExpired(token)) {
        debug('⏰ Token scaduto, logout automatico');
        clearAuthData();
        return { isAuthenticated: false, user: null, token: null, expired: true };
    }
    
    const tokenInfo = getTokenInfo(token);
    debug('✅ Utente autenticato:', {
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
    debug('🚪 ============================================');
    debug('🚪 LOGOUT FORZATO:', reason);
    debug('🚪 ============================================');
    
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
        debug('🔄 Redirect a homepage dopo logout');
        window.location.href = '/';
    }
    
    debug('✅ Logout completato');
}

// ================================================================
// VALIDAZIONE TOKEN CON BACKEND
// ================================================================

/**
 * Valida il token con il backend (opzionale, per sicurezza extra)
 */
async function validateTokenWithBackend(token) {
    try {
        debug('🔐 Validazione token con backend...');
        
        const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/validate-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
            debug('❌ Token non valido secondo il backend');
            return false;
        }
        
        const result = await response.json();
        debug('✅ Token validato dal backend');
        return result.valid === true;
    } catch (error) {
        error('❌ Errore validazione token con backend:', error);
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
                
                debug('🔐 Header Authorization aggiunto alla chiamata API');
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
    debug('🚀 Inizializzazione autenticazione persistente...');
    
    // Configura fetch authenticato
    createAuthenticatedFetch();
    
    // Controllo iniziale autenticazione
    const authResult = checkAuth();
    
    if (authResult.expired) {
        debug('⚠️ Sessione scaduta, utente disconnesso automaticamente');
        // Potresti mostrare un messaggio all'utente qui
    }
    
    debug('✅ Sistema autenticazione persistente inizializzato');
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

debug('📚 Sistema autenticazione persistente caricato'); 