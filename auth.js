// ================================================================
// MENTAL COMMONS - SISTEMA AUTENTICAZIONE PERSISTENTE
// ================================================================
// Versione: 3.0.0
// Descrizione: Gestione JWT persistente con localStorage e scadenza 30 giorni

// ================================================================
// CONFIGURAZIONE
// ================================================================

const AUTH_CONFIG = {
    TOKEN_KEY: 'mental_commons_token',
    USER_KEY: 'mental_commons_user',
    EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minuti di buffer prima della scadenza
    API_BASE_URL: `${window.location.origin}/api`
};

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
        console.log('💾 Salvando dati autenticazione in localStorage...');
        
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
        
        // Log informazioni token
        const tokenInfo = getTokenInfo(token);
        if (tokenInfo) {
            console.log('🎫 Token info:', {
                email: tokenInfo.email,
                expiresAt: tokenInfo.expiresAt,
                daysUntilExpiry: tokenInfo.daysUntilExpiry
            });
        }
        
        console.log('✅ Dati autenticazione salvati con successo');
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
            console.log('👤 Nessun dato di autenticazione trovato');
            return null;
        }
        
        const user = JSON.parse(userJson);
        
        console.log('📂 Dati autenticazione caricati da localStorage');
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
        console.log('🧹 Pulizia completa dati autenticazione...');
        
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
        
        console.log('✅ Pulizia completa completata');
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
    console.log('🔍 ============================================');
    console.log('🔍 CONTROLLO AUTENTICAZIONE PERSISTENTE');
    console.log('🔍 ============================================');
    
    const authData = loadAuthData();
    
    if (!authData) {
        console.log('❌ Nessun dato di autenticazione disponibile');
        return { isAuthenticated: false, user: null, token: null };
    }
    
    const { user, token } = authData;
    
    // Verifica validità token
    if (isTokenExpired(token)) {
        console.log('⏰ Token scaduto, logout automatico');
        clearAuthData();
        return { isAuthenticated: false, user: null, token: null, expired: true };
    }
    
    const tokenInfo = getTokenInfo(token);
    console.log('✅ Utente autenticato:', {
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
    console.log('🚪 ============================================');
    console.log('🚪 LOGOUT FORZATO:', reason);
    console.log('🚪 ============================================');
    
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
        console.log('🔄 Redirect a homepage dopo logout');
        window.location.href = '/';
    }
    
    console.log('✅ Logout completato');
}

// ================================================================
// VALIDAZIONE TOKEN CON BACKEND
// ================================================================

/**
 * Valida il token con il backend (opzionale, per sicurezza extra)
 */
async function validateTokenWithBackend(token) {
    try {
        console.log('🔐 Validazione token con backend...');
        
        const response = await fetch(`${AUTH_CONFIG.API_BASE_URL}/validate-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
            console.log('❌ Token non valido secondo il backend');
            return false;
        }
        
        const result = await response.json();
        console.log('✅ Token validato dal backend');
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
                
                console.log('🔐 Header Authorization aggiunto alla chiamata API');
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
    console.log('🚀 Inizializzazione autenticazione persistente...');
    
    // Configura fetch authenticato
    createAuthenticatedFetch();
    
    // Controllo iniziale autenticazione
    const authResult = checkAuth();
    
    if (authResult.expired) {
        console.log('⚠️ Sessione scaduta, utente disconnesso automaticamente');
        // Potresti mostrare un messaggio all'utente qui
    }
    
    console.log('✅ Sistema autenticazione persistente inizializzato');
    return authResult;
}

// Export delle funzioni per uso globale
window.PersistentAuth = {
    // Controlli principali
    checkAuth,
    forceLogout,
    
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

console.log('📚 Sistema autenticazione persistente caricato'); 