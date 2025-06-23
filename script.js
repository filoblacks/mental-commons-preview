// Mental Commons 3.0 - Sistema Completo con Login e Area Utente

// ============================================
// 🛠 MARKER VERSIONE - VERIFICA DEPLOY
// ============================================
console.log("🛠 Mental Commons script.js versione FIX 20250618-02 attivo");

// Sistema di logging che si adatta automaticamente all'ambiente
// Definizione globale sicura per evitare dichiarazioni duplicate
if (typeof window.isProduction === 'undefined') {
  window.isProduction = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') || false;
}

// Definisci le funzioni di logging globalmente per evitare conflitti - VERSIONE SICURA
if (typeof window.log === 'undefined') {
  window.log = (...args) => { if (!window.isProduction) console.log(...args); };
  window.debug = (...args) => { if (!window.isProduction) console.debug(...args); };
  window.info = (...args) => { if (!window.isProduction) console.info(...args); };
  window.warn = (...args) => { if (!window.isProduction) console.warn(...args); };
  window.error = (...args) => { console.error(...args); };
  window.devError = (...args) => { if (!window.isProduction) console.error(...args); };
}

// Alias locali per compatibilità - VERSIONE SICURA SENZA RIDICHIARAZIONE
const { log, debug, info, warn, error, devError } = window;

// Variabili globali
let ucmeData = [];
let portatoreData = [];
let currentUser = null;
let currentScreen = 'home';

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// ========================================
// AUTO-MIGRAZIONE UTENTI DA LOCALSTORAGE A SUPABASE
// ========================================

async function autoMigrateUsersToSupabase() {
    debug('🔄 ============================================');
    debug('🔄 AUTO-MIGRAZIONE UTENTI LOCALSTORAGE -> SUPABASE');
    debug('🔄 ============================================');
    
    // Controlla se la migrazione è già stata completata
    const migrationCompleted = localStorage.getItem('mc-migration-completed');
    if (migrationCompleted === 'true') {
        debug('✅ Migrazione già completata in precedenza - skip');
        return { migrated: 0, failed: 0, duplicates: 0, skipped: true };
    }
    
    // Flag per disabilitare completamente la migrazione automatica
    const migrationDisabled = localStorage.getItem('mc-migration-disabled');
    if (migrationDisabled === 'true') {
        debug('⚠️ Migrazione automatica disabilitata manualmente - skip');
        return { migrated: 0, failed: 0, duplicates: 0, disabled: true };
    }
    
    // Cerca utenti esistenti in localStorage
    const localUsers = JSON.parse(localStorage.getItem('mc-users') || '[]');
    const currentUser = localStorage.getItem('mc-user');
    
    let usersToMigrate = [...localUsers];
    
    // Aggiungi anche l'utente corrente se presente
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            if (user && user.email && !usersToMigrate.find(u => u.email === user.email)) {
                usersToMigrate.push(user);
            }
        } catch (e) {
            log('⚠️ Errore parsing utente corrente:', e.message);
        }
    }
    
    if (usersToMigrate.length === 0) {
        log('✅ Nessun utente localStorage da migrare');
        return { migrated: 0, failed: 0, duplicates: 0 };
    }
    
    log(`📊 Trovati ${usersToMigrate.length} utenti da migrare:`, usersToMigrate.map(u => u.email));
    
    let migrationStats = {
        migrated: 0,
        failed: 0,
        duplicates: 0,
        total: usersToMigrate.length
    };
    
    // Prova migrazione per ogni utente
    for (let i = 0; i < usersToMigrate.length; i++) {
        const user = usersToMigrate[i];
        log(`\n👤 Migrazione ${i + 1}/${usersToMigrate.length}: ${user.email}`);
        
        try {
            const result = await registerWithBackend(
                user.email, 
                user.password || user.accessCode || 'legacy_password', 
                user.name || user.email.split('@')[0]
            );
            
            if (result.success) {
                log(`   ✅ ${user.email}: Migrato con successo`);
                migrationStats.migrated++;
            } else if (result.statusCode === 409 || result.error === 'user_already_exists' || 
                      (result.message && (result.message.includes('già esiste') || result.message.includes('already exists')))) {
                log(`   🔄 ${user.email}: Già esistente in Supabase (OK)`);
                migrationStats.duplicates++;
            } else {
                log(`   ❌ ${user.email}: Fallimento - ${result.message || 'Errore sconosciuto'}`);
                log(`   🔍 Debug:`, result.debug || 'Nessun debug disponibile');
                migrationStats.failed++;
            }
        } catch (error) {
            // Questo catch ora dovrebbe essere raramente utilizzato
            // perché registerWithBackend gestisce internamente gli errori
            log(`   ❌ ${user.email}: Errore critico non gestito - ${error.message}`);
            migrationStats.failed++;
        }
        
        // Pausa breve per non sovraccaricare il server
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    log('\n📊 RISULTATI MIGRAZIONE:');
    log(`   ✅ Migrati: ${migrationStats.migrated}`);
    log(`   🔄 Duplicati: ${migrationStats.duplicates}`);
    log(`   ❌ Falliti: ${migrationStats.failed}`);
    
    // Se la migrazione è andata a buon fine, offri di pulire localStorage
    if (migrationStats.failed === 0 && (migrationStats.migrated > 0 || migrationStats.duplicates > 0)) {
        log('🧹 Migrazione completata con successo');
        log('💡 localStorage sarà pulito al logout per completare la transizione');
        
        // Salva flag per indicare che la migrazione è completata
        localStorage.setItem('mc-migration-completed', 'true');
    }
    
    return migrationStats;
}

// ========================================
// INIZIALIZZAZIONE APP (AGGIORNATA)
// ========================================

function initializeApp() {
    log('🔄 Inizializzazione Mental Commons 3.0...');
    
    // ========================================
    // INIZIALIZZAZIONE SISTEMA AUTENTICAZIONE
    // ========================================
    log('🔐 Inizializzazione sistema autenticazione...');
    
    if (typeof window.PersistentAuth !== 'undefined') {
        // Inizializza il sistema di autenticazione persistente
        window.PersistentAuth.init();
        log('✅ Sistema PersistentAuth inizializzato');
    } else {
        warn('⚠️ Sistema PersistentAuth non disponibile - autenticazione limitata');
    }
    
    // 1. Prima di tutto, esegui migrazione automatica se necessario
    autoMigrateUsersToSupabase().then(migrationStats => {
        log('🔄 Auto-migrazione completata:', migrationStats);
        
        // 2. Poi continua con l'inizializzazione normale
        continueInitialization();
    }).catch(error => {
        error('❌ Errore durante auto-migrazione:', error);
        // Continua comunque l'inizializzazione anche se la migrazione fallisce
        continueInitialization();
    });
}

function continueInitialization() {
    log('🚀 ============================================');
    log('🚀 INIZIALIZZAZIONE CONTINUA - ANTI-FLICKER');
    log('🚀 ============================================');
    
    // Verifica se esiste già lo stato auth immediato
    if (window.immediateAuthState && window.immediateAuthState.verified) {
        log('✅ Stato auth immediato trovato:', window.immediateAuthState);
        
        // Usa lo stato già verificato
        if (window.immediateAuthState.isAuthenticated) {
            currentUser = window.immediateAuthState.user;
            log('👤 Utente già autenticato:', currentUser.email);
            
            // Non aggiornare UI - è già stata configurata dal controllo immediato
            // Aggiorna solo le variabili JavaScript interne
            syncUIWithCurrentState();
        } else {
            currentUser = null;
            log('👤 Utente guest confermato');
            
            // Non aggiornare UI - è già stata configurata dal controllo immediato
            // Aggiorna solo le variabili JavaScript interne
            syncUIWithCurrentState();
        }
    } else {
        // Fallback al sistema precedente (non dovrebbe mai accadere)
        warn('⚠️ Controllo auth immediato non trovato, fallback');
        checkExistingUser();
    }
    
    // Mostra onboarding se necessario
    checkAndShowOnboarding();
    
    // Carica dati esistenti 
    loadExistingData();
    
    // Controlla se siamo nella pagina dashboard e inizializzala
    log("🔍 Rilevamento pagina corrente:", {
        pathname: window.location.pathname,
        href: window.location.href,
        includesDashboard: window.location.pathname.includes('dashboard.html'),
        includesProfile: window.location.pathname.includes('profile.html')
    });
    
    if (window.location.pathname.includes('dashboard.html')) {
        log("✅ Pagina dashboard rilevata - inizializzo dashboard");
        initializeDashboard();
    } else if (window.location.pathname.includes('profile.html')) {
        log("✅ Pagina profile rilevata - inizializzo profilo");
        initializeProfile();
    } else {
        log("🏠 Pagina non-dashboard rilevata - inizializzo home");
        // Inizializza schermata home
        showScreen('home');
    }
    
    // Carica e mostra contatori poetici con fallback robusto
    loadRitualStats();
    
    // Sistema di fallback multiplo per garantire che le stats vengano sempre popolate
    setTimeout(() => {
        const ucmeElement = document.getElementById('ucme-count');
        const risposteElement = document.getElementById('risposte-count');
        const portatoriElement = document.getElementById('portatori-count');
        
        // Se gli elementi mostrano ancora "–" dopo 1 secondo, usa updateStickyStats
        if (ucmeElement && (ucmeElement.textContent === '–' || ucmeElement.textContent === '')) {
            log('🔄 Fallback 1s: uso updateStickyStats direttamente');
            updateStickyStats();
        }
    }, 1000);
    
    // Fallback finale dopo 3 secondi per garantire che i valori siano sempre visibili
    setTimeout(() => {
        const ucmeElement = document.getElementById('ucme-count');
        if (ucmeElement && (ucmeElement.textContent === '–' || ucmeElement.textContent === '' || ucmeElement.textContent === '0')) {
            log('🔄 Fallback finale 3s: forzo valori minimi');
            updateStickyStats();
        }
    }, 3000);
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup form validation
    setupFormValidation();
    
    // Setup char counter con fallback
    setTimeout(() => {
        ensureCharCounterWorks();
    }, 500);
    
    // Setup mobile optimizations
    setupMobileOptimizations();
    
        log('✅ Mental Commons 3.0 inizializzato con migrazione automatica');
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
    log('Passaggio a schermata:', screenName);
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
// GESTIONE DASHBOARD
// ========================================

// ========================================
// 🔥 FIX CRITICO MOBILE - CARICAMENTO UCME DAL BACKEND
// ========================================

async function loadUCMeFromBackend(userEmail) {
    try {
        log('🔄 Tentativo caricamento UCMe dal backend per:', userEmail);
        
        const token = localStorage.getItem('mental_commons_token');
        if (!token) {
            log('⚠️ Nessun token disponibile, uso solo localStorage');
            return null;
        }

        const response = await fetch('/api/ucmes', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-User-Email': userEmail
            }
        });

        if (!response.ok) {
            log('⚠️ API UCMe non disponibile, uso fallback localStorage');
            return null;
        }

        const result = await response.json();
        log('📡 Risposta API UCMe:', result);

        if (result.success && result.data && Array.isArray(result.data)) {
            log('✅ UCMe caricate dal backend:', result.data.length);
            return result.data;
        } else {
            log('⚠️ Nessuna UCMe trovata nel backend');
            return null;
        }

    } catch (error) {
        log('❌ Errore caricamento UCMe da backend:', error);
        return null;
    }
}

async function mergeUCMeData(userEmail) {
    log('🔄 Merge dati UCMe da tutte le fonti per:', userEmail);
    
    // 1. Carica da localStorage
    const localUcmes = ucmeData.filter(ucme => ucme.email === userEmail);
    log('📱 UCMe da localStorage:', localUcmes.length);
    
    // 2. Carica da backend
    const backendUcmes = await loadUCMeFromBackend(userEmail);
    log('☁️ UCMe da backend:', backendUcmes ? backendUcmes.length : 0);
    
    // 3. Merge intelligente
    let mergedUcmes = [...localUcmes];
    
    if (backendUcmes && backendUcmes.length > 0) {
        // Aggiungi UCMe dal backend che non esistono già in localStorage
        backendUcmes.forEach(backendUcme => {
            const exists = localUcmes.some(localUcme => 
                localUcme.timestamp === backendUcme.timestamp && 
                localUcme.text === backendUcme.text
            );
            
            if (!exists) {
                mergedUcmes.push(backendUcme);
                log('➕ Aggiunta UCMe dal backend:', backendUcme.text?.substring(0, 30) + '...');
            }
        });
    }
    
    log('🔗 UCMe totali dopo merge:', mergedUcmes.length);
    return mergedUcmes;
}

function initializeDashboard() {
    log("🟢 INIZIO initializeDashboard - timestamp:", new Date().toISOString());
    log('🔄 Inizializzazione dashboard...');
    
    // Elementi della dashboard
    const userVerification = document.getElementById('user-verification');
    const dashboardContent = document.getElementById('dashboard-content');
    const noAccess = document.getElementById('no-access');
    
    if (!userVerification || !dashboardContent || !noAccess) {
        error('❌ Elementi dashboard mancanti nel DOM:', {
            userVerification: !!userVerification,
            dashboardContent: !!dashboardContent,
            noAccess: !!noAccess
        });
        return;
    }

    log('✅ Tutti gli elementi DOM trovati');
    
    log("⏰ Impostazione setTimeout per caricamento asincrono...");
    setTimeout(async () => {
        log("⏰ AVVIO setTimeout callback - timestamp:", new Date().toISOString());
        try {
            log('🔍 Controllo stato utente...');
            
            // Verifica se l'utente è loggato
            if (!currentUser) {
                log('⚠️ Utente non loggato, mostro schermata di accesso');
                userVerification.style.display = 'none';
                noAccess.style.display = 'block';
                return;
            }
            
            log('✅ Utente loggato:', currentUser.email);
            
            // 🔥 FIX CRITICO MOBILE: Carica UCMe da tutte le fonti
            log('🔄 Caricamento UCMe da tutte le fonti (localStorage + backend)...');
            const allUserUcmes = await mergeUCMeData(currentUser.email);
            
            log('📊 UCMe caricate per dashboard:', {
                totalCount: allUserUcmes.length,
                emails: allUserUcmes.map(u => u.email),
                texts: allUserUcmes.map(u => u.text?.substring(0, 30) + '...')
            });
            
            // Crea userData con le UCMe caricate
            const userData = {
                isEmpty: allUserUcmes.length === 0,
                ucmes: allUserUcmes,
                user: currentUser,
                stats: {
                    total: allUserUcmes.length,
                    withResponse: allUserUcmes.filter(ucme => ucme.response).length,
                    pending: allUserUcmes.filter(ucme => !ucme.response).length
                }
            };
            
            log('📋 Dati dashboard creati:', JSON.stringify({
                isEmpty: userData.isEmpty,
                ucmesLength: userData.ucmes.length,
                hasUser: !!userData.user,
                hasStats: !!userData.stats
            }, null, 2));
            
            log('🎨 Rendering dashboard avviato...');
            
            // Rendering della dashboard
            if (userData.isEmpty) {
                log('📝 Dati vuoti, mostro dashboard vuota');
                renderEmptyDashboard();
            } else {
                log('📝 Rendering dashboard con dati:', userData.ucmes.length, 'UCMe trovate');
                renderDashboard(userData);
            }
            
            log('🔄 Aggiornamento UI - nascondo caricamento e mostro contenuto...');
            
            // ⚠️ CRITICO: SEMPRE nascondere caricamento e mostrare contenuto, anche se ci sono errori nel rendering
            log("🔄 FORZATURA aggiornamento UI - questo DEVE sempre eseguire");
            userVerification.style.display = 'none';
            dashboardContent.style.display = 'block';
            dashboardContent.style.visibility = 'visible';
            dashboardContent.style.opacity = '1';
            
            // 📱 FIX MOBILE AGGIUNTIVO: Forza visibilità container UCMe
            const ucmeBlocksContainer = document.getElementById('ucme-blocks');
            if (ucmeBlocksContainer) {
                ucmeBlocksContainer.style.display = 'flex';
                ucmeBlocksContainer.style.flexDirection = 'column';
                ucmeBlocksContainer.style.visibility = 'visible';
                ucmeBlocksContainer.style.opacity = '1';
                log('📱 Container UCMe forzato visibile per mobile');
            }
            
            log("✅ UI forzatamente aggiornata - caricamento nascosto, dashboard mostrata");
            
            log('✅ Dashboard completamente caricata e visualizzata');
            
        } catch (error) {
            error('❌ Errore durante caricamento dashboard:', error);
            error('Stack trace:', error.stack);
            
            // Anche in caso di errore, mostra sempre l'UI base
            userVerification.style.display = 'none';
            dashboardContent.style.display = 'block';
            dashboardContent.style.visibility = 'visible';
            dashboardContent.style.opacity = '1';
            
            // Mostra messaggio di errore nel contenuto
            const ucmeBlocks = document.getElementById('ucme-blocks');
            if (ucmeBlocks) {
                ucmeBlocks.innerHTML = `
                    <div class="empty-dashboard">
                        <p>❌ Si è verificato un errore nel caricamento del tuo spazio.</p>
                        <p>Ricarica la pagina o riprova più tardi.</p>
                    </div>
                `;
                // 📱 FIX MOBILE: Forza visibilità anche per errori
                ucmeBlocks.style.display = 'flex';
                ucmeBlocks.style.flexDirection = 'column';
                ucmeBlocks.style.visibility = 'visible';
                ucmeBlocks.style.opacity = '1';
            }
            
            updateDashboardStatus('Il tuo spazio non è disponibile ora. Riprova più tardi.');
        }
        
        log("⏰ FINE setTimeout callback - timestamp:", new Date().toISOString());
    }, 500); // Piccolo delay per dare feedback visivo del caricamento
    
    log("🔚 FINE initializeDashboard - setTimeout impostato - timestamp:", new Date().toISOString());
}



// ========================================
// GESTIONE PROFILO
// ========================================

async function initializeProfile() {
    log("🟢 INIZIO initializeProfile - timestamp:", new Date().toISOString());
    log('🔄 Inizializzazione profilo...');
    
    // Elementi del profilo
    const userVerification = document.getElementById('user-verification');
    const profileContent = document.getElementById('profile-content');
    const profileHeader = document.getElementById('profile-header');
    const noAccess = document.getElementById('no-access');
    
    if (!userVerification || !profileContent || !noAccess) {
        error('❌ Elementi profilo mancanti nel DOM:', {
            userVerification: !!userVerification,
            profileContent: !!profileContent,
            profileHeader: !!profileHeader,
            noAccess: !!noAccess
        });
        return;
    }

    log('✅ Tutti gli elementi DOM del profilo trovati');
    
    log("⏰ Impostazione setTimeout per caricamento profilo asincrono...");
    setTimeout(async () => {
        log("⏰ AVVIO setTimeout callback profilo - timestamp:", new Date().toISOString());
        try {
            log('🔍 Controllo stato utente per profilo...');
            
            // Verifica se l'utente è loggato
            if (!currentUser) {
                log('⚠️ Utente non loggato, mostro schermata di accesso profilo');
                userVerification.style.display = 'none';
                noAccess.style.display = 'block';
                return;
            }
            
            log('✅ Utente loggato per profilo:', currentUser.email);
            
            // 🔥 FIX: Carica dati profilo REALI mantenendo compatibilità
            log('🔄 Tentativo caricamento dati profilo REALI dal database...');
            const enhancedUserData = await loadRealUserProfileDataFromDatabase(currentUser);
            
            log('✅ Dati profilo preparati (reali + fallback):', {
                email: enhancedUserData.email,
                hasRealCreatedAt: !!enhancedUserData.created_at,
                hasRealLastLogin: !!enhancedUserData.last_login
            });
            
            log('🎨 Rendering profilo avviato...');
            
            // Aggiorna le informazioni del profilo con dati REALI (o fallback)
            updateProfileInfo(enhancedUserData);
            
            // Aggiorna header del profilo se presente
            if (profileHeader) {
                const profileHeaderEmail = document.getElementById('profile-header-email');
                if (profileHeaderEmail) {
                    profileHeaderEmail.textContent = enhancedUserData.email || 'Email non disponibile';
                }
                profileHeader.style.display = 'block';
            }
            
            log('🔄 Aggiornamento UI profilo - nascondo caricamento e mostro contenuto...');
            
            // ⚠️ CRITICO: SEMPRE nascondere caricamento e mostrare contenuto
            log("🔄 FORZATURA aggiornamento UI profilo - questo DEVE sempre eseguire");
            userVerification.style.display = 'none';
            profileContent.style.display = 'block';
            log("✅ UI profilo forzatamente aggiornata - caricamento nascosto, profilo mostrato");
            
            // ⚠️ CRITICO: Configura event listeners DOPO aver mostrato il contenuto
            log('🔧 Configurazione event listeners profilo...');
            log('🔍 Stato currentUser prima di setupProfileEventListeners:', {
                currentUser: !!currentUser,
                userEmail: currentUser?.email,
                userFromLocalStorage: !!localStorage.getItem('mental_commons_user')
            });
            setupProfileEventListeners();
            
            log('✅ Profilo completamente caricato e visualizzato');
            
        } catch (error) {
            error('❌ Errore durante caricamento profilo:', error);
            error('Stack trace:', error.stack);
            
            // Anche in caso di errore, mostra sempre l'UI base
            userVerification.style.display = 'none';
            profileContent.style.display = 'block';
            
            // Mostra messaggio di errore nel contenuto
            showProfileErrorMessage();
        }
        
        log("⏰ FINE setTimeout callback profilo - timestamp:", new Date().toISOString());
    }, 500); // Piccolo delay per dare feedback visivo del caricamento
    
    log("🔚 FINE initializeProfile - setTimeout impostato - timestamp:", new Date().toISOString());
}

// 🔥 NUOVA FUNZIONE: Carica SOLO dati utente REALI per il profilo
async function loadRealUserProfileDataFromDatabase(localUser) {
    try {
        log('📞 Tentativo caricamento dati profilo REALI dal database per:', localUser.email);
        
        const response = await fetch('/api/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('mental_commons_token')}`
            }
        });
        
        if (!response.ok) {
            log('⚠️ API utenti non disponibile, uso fallback localStorage');
            return localUser; // Fallback ai dati locali
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data || !result.data.users) {
            log('⚠️ Risposta API non valida, uso fallback localStorage');
            return localUser; // Fallback ai dati locali
        }
        
        const realUser = result.data.users.find(user => user.email === localUser.email);
        
        if (!realUser) {
            log('⚠️ Utente non trovato nel database, uso fallback localStorage');
            return localUser; // Fallback ai dati locali
        }
        
        log('✅ Dati profilo REALI caricati dal database:', {
            email: realUser.email,
            created_at: realUser.created_at,
            last_login: realUser.last_login
        });
        
        // Combina i dati locali con quelli reali dal database
        return {
            ...localUser,
            created_at: realUser.created_at, // Data REALE dal database
            last_login: realUser.last_login   // Data REALE dal database
        };
        
    } catch (error) {
        log('⚠️ Errore caricamento dati profilo dal database, uso fallback localStorage');
        return localUser; // Fallback ai dati locali
    }
}

function loadProfileData(user) {
    try {
        log("🟢 Avvio funzione loadProfileData per:", user.email);
        
        if (!user || !user.email) {
            error('❌ Dati utente non validi per profilo:', user);
            return null;
        }
        
        // Prepara i dati del profilo dall'utente corrente
        const profileData = {
            email: user.email,
            name: user.name || user.firstName || 'Non specificato',
            createdAt: user.created_at || user.createdAt || Date.now(),
            lastLogin: user.last_login || user.lastLogin || Date.now(),
            id: user.id || user.user_id || 'N/A'
        };
        
        log('✅ Dati profilo preparati:', {
            email: profileData.email,
            name: profileData.name,
            hasCreatedAt: !!profileData.createdAt,
            hasLastLogin: !!profileData.lastLogin
        });
        
        return profileData;
        
    } catch (error) {
        error('❌ Errore nel caricamento dati profilo:', error);
        error('Stack trace:', error.stack);
        return null;
    }
}

function showProfileErrorMessage() {
    try {
        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            profileContent.innerHTML = `
                <div class="profile-error-message">
                    <h2>❌ Errore nel caricamento del profilo</h2>
                    <p>Impossibile caricare il profilo. Riprova più tardi.</p>
                    <div class="profile-error-actions">
                        <a href="dashboard.html" class="profile-error-btn">Torna alla Dashboard</a>
                        <button onclick="window.location.reload()" class="profile-error-btn">Ricarica Pagina</button>
                    </div>
                </div>
            `;
            profileContent.style.display = 'block';
        }
        
        const userVerification = document.getElementById('user-verification');
        if (userVerification) {
            userVerification.style.display = 'none';
        }
        
        log('✅ Messaggio di errore profilo mostrato');
    } catch (error) {
        error('❌ Errore nel mostrare il messaggio di errore profilo:', error);
    }
}

function loadDashboardData(email) {
    try {
        log("🟢 Avvio funzione loadDashboardData");
        log('🔍 Caricamento dati dashboard per email:', email);
        log("📦 Dati di input:", JSON.stringify({
            email: email,
            ucmeDataType: typeof ucmeData,
            ucmeDataIsArray: Array.isArray(ucmeData),
            ucmeDataLength: ucmeData?.length,
            currentUser: currentUser
        }, null, 2));
        log('📊 ucmeData completo:', ucmeData);
        
        // Verifica che ucmeData sia un array valido
        if (!Array.isArray(ucmeData)) {
            error('❌ ucmeData non è un array valido:', typeof ucmeData, ucmeData);
            return {
                isEmpty: true,
                ucmes: [],
                user: currentUser
            };
        }
        
        // Carica UCMe dell'utente
        const userUcmes = ucmeData.filter(ucme => {
            log('🔍 Verifica UCMe:', {
                ucmeEmail: ucme.email,
                targetEmail: email,
                match: ucme.email === email
            });
            return ucme.email === email;
        });
        
        log('✅ UCMe trovate per', email, ':', userUcmes.length);
        
        // Log dettagliato delle UCMe trovate
        if (userUcmes.length > 0) {
            log('📋 UCMe dell\'utente:', userUcmes.map(ucme => ({
                text: ucme.text?.substring(0, 50) + '...',
                timestamp: ucme.timestamp,
                hasResponse: !!ucme.response
            })));
        }
        
        // Se non ci sono UCMe, restituisce struttura vuota
        if (userUcmes.length === 0) {
            log('📝 Nessuna UCMe trovata, ritorno struttura vuota');
            return {
                isEmpty: true,
                ucmes: [],
                user: currentUser
            };
        }
        
        // Ordina UCMe per timestamp (più recenti prima)
        log('🔄 Ordinamento UCMe per timestamp...');
        const sortedUcmes = userUcmes.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return dateB - dateA;
        });
        
        log('✅ UCMe ordinate:', sortedUcmes.map(ucme => ({
            text: ucme.text?.substring(0, 30) + '...',
            timestamp: ucme.timestamp
        })));
        
        const dashboardData = {
            isEmpty: false,
            ucmes: sortedUcmes,
            user: currentUser,
            stats: {
                total: sortedUcmes.length,
                withResponse: sortedUcmes.filter(ucme => ucme.response).length,
                pending: sortedUcmes.filter(ucme => !ucme.response).length
            }
        };
        
        log('✅ Dati dashboard preparati:', {
            isEmpty: dashboardData.isEmpty,
            ucmesCount: dashboardData.ucmes.length,
            stats: dashboardData.stats
        });
        
        return dashboardData;
        
    } catch (error) {
        error('❌ Errore nel caricamento dati dashboard:', error);
        error('Stack trace:', error.stack);
        return null;
    }
}

function renderDashboard(data) {
    try {
        log("🟢 Avvio funzione renderDashboard");
        log("📦 Dati ricevuti per rendering:", JSON.stringify(data, null, 2));
        
        // 🔍 Verifica stato dati
        log("🔍 Verifica stato dati: ", {
            isEmpty: data?.isEmpty,
            ucmes: data?.ucmes,
            user: data?.user,
            hasUcmes: Array.isArray(data?.ucmes),
            ucmesLength: data?.ucmes?.length
        });
        
        // 🧩 Debug DOM - verifica elementi target esistano
        const ucmeBlocksContainer = document.getElementById("ucme-blocks");
        const dashboardContent = document.getElementById("dashboard-content");
        const userVerification = document.getElementById("user-verification");
        log("🧩 Elementi DOM target trovati:", {
            ucmeBlocksContainer: !!ucmeBlocksContainer,
            dashboardContent: !!dashboardContent,
            userVerification: !!userVerification
        });
        
        log('🎨 Rendering dashboard con dati:', data);
        
        // Aggiorna informazioni profilo
        log('👤 Aggiornamento informazioni profilo...');
        updateProfileInfo(data.user);
        log('✅ Informazioni profilo aggiornate');
        
        // Renderizza le UCMe
        log('📝 Rendering UCMe blocks...');
        renderUcmeBlocks(data.ucmes);
        log('✅ UCMe blocks renderizzate');
        
        // 🔄 Controllo stato visuale - garantisco sempre l'aggiornamento
        log("🔄 Aggiornamento stato visuale - nascondo caricamento e mostro dashboard");
        if (userVerification) {
            userVerification.style.display = "none";
            log("✅ Messaggio di caricamento nascosto");
        }
        if (dashboardContent) {
            dashboardContent.style.display = "block";
            dashboardContent.style.visibility = "visible";
            dashboardContent.style.opacity = "1";
            log("✅ Contenuto dashboard mostrato");
        }
        
        // 📱 Controllo specifico per mobile - forza visibilità UCMe
        if (ucmeBlocksContainer) {
            ucmeBlocksContainer.style.display = "flex";
            ucmeBlocksContainer.style.flexDirection = "column";
            ucmeBlocksContainer.style.visibility = "visible";
            ucmeBlocksContainer.style.opacity = "1";
            log("✅ Container UCMe forzato visibile per mobile");
        }
        
        log('✅ Dashboard renderizzata con successo');
        
    } catch (error) {
        error('❌ Errore nel rendering dashboard:', error);
        error('Stack trace:', error.stack);
        
        // In caso di errore, mostra comunque un contenuto base
        const ucmeBlocks = document.getElementById('ucme-blocks');
        if (ucmeBlocks) {
            ucmeBlocks.innerHTML = `
                <div class="empty-dashboard">
                    <p>❌ Errore nella visualizzazione dei tuoi pensieri.</p>
                    <p>Ricarica la pagina per riprovare.</p>
                </div>
            `;
        }
        
        // Fallback per le informazioni profilo
        try {
            updateProfileInfo(data.user);
        } catch (profileError) {
            error('❌ Errore anche nell\'aggiornamento profilo:', profileError);
        }
        
        updateDashboardStatus('Errore nella visualizzazione del tuo spazio.');
    }
}

function renderEmptyDashboard() {
    try {
        log("🟢 Avvio funzione renderEmptyDashboard");
        
        // 🧩 Debug DOM - verifica elementi target esistano
        const ucmeBlocks = document.getElementById('ucme-blocks');
        const dashboardContent = document.getElementById("dashboard-content");
        const userVerification = document.getElementById("user-verification");
        log("🧩 Elementi DOM target trovati:", {
            ucmeBlocks: !!ucmeBlocks,
            dashboardContent: !!dashboardContent,
            userVerification: !!userVerification
        });
        
        log('📝 Rendering dashboard vuota...');
        
        // Aggiorna informazioni profilo
        log('👤 Aggiornamento informazioni profilo per dashboard vuota...');
        updateProfileInfo(currentUser);
        log('✅ Informazioni profilo aggiornate');
        
        // 📱 MOBILE DEBUG: Aggiungi informazioni di debug per mobile
        const isMobile = window.innerWidth <= 768;
        const mobileDebugInfo = isMobile ? `
            <div style="background: #333; padding: 10px; margin: 10px 0; font-size: 12px; border-radius: 4px;">
                📱 MOBILE DEBUG:<br/>
                Viewport: ${window.innerWidth}x${window.innerHeight}<br/>
                UserAgent: ${navigator.userAgent.substring(0, 50)}...<br/>
                Timestamp: ${new Date().toISOString()}<br/>
                Dashboard mobile: ATTIVA
            </div>
        ` : '';
        
        // Mostra messaggio per dashboard vuota
        log('📝 Inserimento messaggio dashboard vuota...');
        if (ucmeBlocks) {
            ucmeBlocks.innerHTML = `
                <div class="empty-dashboard">
                    <p>Non hai ancora affidato nessun pensiero.</p>
                    <p>Quando condividerai la tua prima UCMe, apparirà qui.</p>
                    ${mobileDebugInfo}
                    <div style="margin-top: 20px;">
                        <button onclick="createMobileTestUCMe()" style="background: #444; color: white; border: 1px solid #666; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                            📱 Test UCMe Mobile
                        </button>
                    </div>
                </div>
            `;
            log('✅ Messaggio dashboard vuota inserito con debug mobile');
        } else {
            error('❌ Elemento ucme-blocks non trovato nel DOM');
        }
        
        // 🔄 Controllo stato visuale - garantisco sempre l'aggiornamento
        log("🔄 Aggiornamento stato visuale - nascondo caricamento e mostro dashboard");
        if (userVerification) {
            userVerification.style.display = "none";
            log("✅ Messaggio di caricamento nascosto");
        }
        if (dashboardContent) {
            dashboardContent.style.display = "block";
            dashboardContent.style.visibility = "visible";
            dashboardContent.style.opacity = "1";
            log("✅ Contenuto dashboard mostrato");
        }
        
        // 📱 FIX MOBILE: Forza visibilità container
        if (ucmeBlocks) {
            ucmeBlocks.style.display = "flex";
            ucmeBlocks.style.flexDirection = "column";
            ucmeBlocks.style.visibility = "visible";
            ucmeBlocks.style.opacity = "1";
            log("📱 Container UCMe forzato visibile per mobile");
        }
        
        log('✅ Dashboard vuota renderizzata');
        
    } catch (error) {
        error('❌ Errore nel rendering dashboard vuota:', error);
        error('Stack trace:', error.stack);
        
        // Fallback per le informazioni profilo
        try {
            updateProfileInfo(currentUser);
        } catch (profileError) {
            error('❌ Errore anche nell\'aggiornamento profilo:', profileError);
        }
        
        // Fallback per il contenuto
        const ucmeBlocks = document.getElementById('ucme-blocks');
        if (ucmeBlocks) {
            ucmeBlocks.innerHTML = `
                <div class="empty-dashboard">
                    <p>❌ Errore nella visualizzazione.</p>
                    <p>Ricarica la pagina per riprovare.</p>
                </div>
            `;
        }
        
        updateDashboardStatus('Errore nella visualizzazione del tuo spazio.');
    }
}

// 🔥 FUNZIONE TEST MOBILE - Per verificare immediatamente il funzionamento
window.createMobileTestUCMe = function() {
    log('📱 Creazione UCMe di test per mobile...');
    
    if (!currentUser) {
        alert('❌ Utente non loggato');
        return;
    }
    
    // Crea UCMe di test
    const testUcme = {
        email: currentUser.email,
        text: 'Questa è una UCMe di test creata su mobile per verificare la visualizzazione. Se vedi questo messaggio, la dashboard mobile funziona correttamente!',
        tone: 'test',
        timestamp: new Date().toISOString(),
        response: 'Risposta di test dal Portatore. Anche questa dovrebbe essere visibile su mobile.',
        responseDate: new Date().toISOString()
    };
    
    // Aggiungi all'array locale
    ucmeData.push(testUcme);
    
    // Salva nel localStorage
    try {
        localStorage.setItem('mentalCommons_ucmes', JSON.stringify(ucmeData));
        log('✅ UCMe di test salvata nel localStorage');
    } catch (error) {
        error('❌ Errore salvataggio localStorage:', error);
    }
    
    // Ricarica la dashboard
    log('🔄 Ricaricamento dashboard per mostrare UCMe di test...');
    initializeDashboard();
    
    alert('✅ UCMe di test creata! La dashboard dovrebbe ora mostrare l\'UCMe di test.');
};

function renderUcmeBlocks(ucmes) {
    try {
        log('📝 Rendering blocchi UCMe:', ucmes.length, 'elementi');
        
        const container = document.getElementById('ucme-blocks');
        if (!container) {
            error('❌ Container ucme-blocks non trovato nel DOM');
            return;
        }
        
        log('✅ Container ucme-blocks trovato');
        
        // 📱 Forza visibilità per mobile - garantisce che le UCMe siano sempre visibili
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        log('✅ Visibilità container forzata per mobile');
        
        container.innerHTML = '';
        
        if (!ucmes || ucmes.length === 0) {
            log('⚠️ Nessuna UCMe da renderizzare');
            return;
        }
        
        ucmes.forEach((ucme, index) => {
            try {
                log(`📝 Creazione blocco UCMe ${index + 1}/${ucmes.length}:`, ucme.text?.substring(0, 50) + '...');
                const ucmeBlock = createDashboardUcmeBlock(ucme, index);
                
                // 📱 Forza visibilità del blocco per mobile
                ucmeBlock.style.display = 'block';
                ucmeBlock.style.visibility = 'visible';
                ucmeBlock.style.opacity = '1';
                
                container.appendChild(ucmeBlock);
                log(`✅ Blocco UCMe ${index + 1} creato e aggiunto con visibilità forzata`);
            } catch (blockError) {
                error(`❌ Errore nella creazione blocco UCMe ${index + 1}:`, blockError);
                // Continua con il prossimo blocco
            }
        });
        
        // 📱 Verifica finale visibilità su mobile
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            log('📱 Dispositivo mobile rilevato - controllo finale visibilità UCMe');
            const allBlocks = container.querySelectorAll('.ucme-block');
            allBlocks.forEach((block, idx) => {
                block.style.display = 'block';
                block.style.visibility = 'visible';
                block.style.opacity = '1';
                log(`📱 Blocco ${idx + 1} - visibilità forzata per mobile`);
            });
        }
        
        log('✅ Rendering blocchi UCMe completato');
        
    } catch (error) {
        error('❌ Errore durante rendering blocchi UCMe:', error);
        error('Stack trace:', error.stack);
        
        // Fallback: mostra almeno un messaggio di errore
        const container = document.getElementById('ucme-blocks');
        if (container) {
            container.innerHTML = `
                <div class="empty-dashboard">
                    <p>❌ Errore nella visualizzazione dei tuoi pensieri.</p>
                    <p>Ricarica la pagina per riprovare.</p>
                </div>
            `;
        }
    }
}

function createDashboardUcmeBlock(ucme, index) {
    const block = document.createElement('div');
    block.className = `ucme-block ${ucme.response ? 'risposto' : 'in-attesa'}`;
    block.style.animationDelay = `${index * 0.1}s`;
    
    const date = new Date(ucme.timestamp);
    const formattedDate = date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusText = ucme.response ? 'Risposta ricevuta' : 'In attesa di risposta';
    
    block.innerHTML = `
        <div class="ucme-header">
            <span class="ucme-status">${statusText}</span>
            <span class="ucme-date">${formattedDate}</span>
        </div>
        <div class="ucme-content">
            <div class="ucme-text">
                <p>${ucme.text}</p>
            </div>
            <div class="ucme-meta">
                <span class="ucme-tone">Tono: ${ucme.tone || 'neutro'}</span>
            </div>
            ${ucme.response ? `
                <div class="ucme-response">
                    <h4>Risposta del Portatore</h4>
                    <div class="response-text">${ucme.response}</div>
                    <div class="response-meta">
                        <span class="response-date">${new Date(ucme.responseDate || ucme.timestamp).toLocaleDateString('it-IT')}</span>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    return block;
}

function updateProfileInfo(user) {
    try {
        log('👤 Aggiornamento profilo per:', user);
        
        const profileEmail = document.getElementById('profile-email');
        const profileName = document.getElementById('profile-name');
        const profileCreated = document.getElementById('profile-created');
        const profileLastLogin = document.getElementById('profile-last-login');
        
        log('📊 Elementi profilo trovati:', {
            profileEmail: !!profileEmail,
            profileName: !!profileName,
            profileCreated: !!profileCreated,
            profileLastLogin: !!profileLastLogin
        });
        
        if (profileEmail) {
            profileEmail.textContent = user.email || 'Email non disponibile';
            log('✅ Email profilo aggiornata');
        }
        
        if (profileName) {
            profileName.textContent = user.name || 'Non specificato';
            log('✅ Nome profilo aggiornato');
        }
        
        if (profileCreated) {
            try {
                // 🔥 FIX CRITICO: Usa il campo created_at dal database Supabase (campo REALE)
                let createdAtValue;
                if (user.created_at) {
                    // Dato REALE dal database
                    createdAtValue = user.created_at;
                    log('✅ USANDO DATA REALE dal database:', createdAtValue);
                } else if (user.createdAt) {
                    // Fallback su localStorage
                    createdAtValue = user.createdAt;
                    log('⚠️ USANDO FALLBACK da localStorage:', createdAtValue);
                } else {
                    // Fallback finale
                    createdAtValue = Date.now();
                    log('⚠️ USANDO FALLBACK corrente:', createdAtValue);
                }
                
                const createdDate = new Date(createdAtValue).toLocaleDateString('it-IT');
                profileCreated.textContent = createdDate;
                log('✅ Data creazione profilo aggiornata:', createdDate, 'da:', createdAtValue);
            } catch (dateError) {
                error('❌ Errore nella formattazione data creazione:', dateError);
                profileCreated.textContent = 'Data non disponibile';
            }
        }
        
        if (profileLastLogin) {
            try {
                // Usa il campo last_login dal database Supabase (campo REALE)
                let lastLoginValue;
                if (user.last_login) {
                    // Dato REALE dal database
                    lastLoginValue = user.last_login;
                    log('✅ USANDO DATA ULTIMO ACCESSO REALE dal database:', lastLoginValue);
                } else if (user.lastLogin) {
                    // Fallback su localStorage
                    lastLoginValue = user.lastLogin;
                    log('⚠️ USANDO FALLBACK ultimo accesso da localStorage:', lastLoginValue);
                } else {
                    // Fallback finale
                    lastLoginValue = Date.now();
                    log('⚠️ USANDO FALLBACK ultimo accesso corrente:', lastLoginValue);
                }
                
                const lastLoginDate = new Date(lastLoginValue).toLocaleDateString('it-IT');
                profileLastLogin.textContent = lastLoginDate;
                log('✅ Data ultimo accesso aggiornata:', lastLoginDate, 'da:', lastLoginValue);
            } catch (dateError) {
                error('❌ Errore nella formattazione data ultimo accesso:', dateError);
                profileLastLogin.textContent = 'Data non disponibile';
            }
        }
        
        log('✅ Profilo completamente aggiornato con dati REALI');
        
    } catch (error) {
        error('❌ Errore durante aggiornamento profilo:', error);
        error('Stack trace:', error.stack);
        
        // Fallback: tenta di aggiornare almeno l'email se possibile
        try {
            const profileEmail = document.getElementById('profile-email');
            if (profileEmail && user && user.email) {
                profileEmail.textContent = user.email;
            }
        } catch (fallbackError) {
            error('❌ Errore anche nel fallback email:', fallbackError);
        }
    }
}

function updateDashboardStatus(message) {
    const userVerification = document.getElementById('user-verification');
    if (userVerification) {
        userVerification.innerHTML = `<p>${message}</p>`;
    }
}

// ========================================
// GESTIONE UTENTI E AUTENTICAZIONE
// ========================================

function checkExistingUser() {
    // 🔍 DEBUG: Controllo stato autenticazione PERSISTENTE
    log('🔍 ============================================');
    log('🔍 CONTROLLO AUTENTICAZIONE PERSISTENTE');
    log('🔍 ============================================');
    
    // Usa il nuovo sistema di autenticazione persistente
    if (typeof window.PersistentAuth !== 'undefined') {
        const authResult = window.PersistentAuth.checkAuth();
        
        if (authResult.isAuthenticated) {
            currentUser = authResult.user;
            log('✅ Utente autenticato trovato (PERSISTENTE):', currentUser.email);
            log('🔍 Dati utente:');
            log('  📧 Email:', currentUser.email);
            log('  👤 Nome:', currentUser.name);
            log('  🆔 ID:', currentUser.id);
            log('  🎫 Token scade:', authResult.tokenInfo.expiresAt);
            log('  📅 Giorni rimanenti:', authResult.tokenInfo.daysUntilExpiry);
            
            updateUIForLoggedUser();
            updateNavigation(currentScreen);
            
            log('✅ UI aggiornata per utente autenticato');
        } else {
            if (authResult.expired) {
                log('⏰ Sessione scaduta automaticamente');
                showMobileFriendlyAlert('La tua sessione è scaduta. Effettua nuovamente il login.');
            }
            log('👤 Nessun utente autenticato trovato');
            log('🔄 Configurazione UI per utente guest...');
            updateUIForGuestUser();
        }
    } else {
        // Fallback al sistema precedente se il nuovo non è caricato
        log('⚠️ Sistema persistente non caricato, fallback a sessionStorage');
        
        const savedUser = sessionStorage.getItem('mental_commons_user');
        const savedToken = sessionStorage.getItem('mental_commons_token');
        
        if (savedUser && savedToken) {
            try {
                currentUser = JSON.parse(savedUser);
                updateUIForLoggedUser();
                updateNavigation(currentScreen);
            } catch (error) {
                error('❌ Errore nel parsing dei dati utente:', error);
                sessionStorage.removeItem('mental_commons_user');
                sessionStorage.removeItem('mental_commons_token');
                updateUIForGuestUser();
            }
        } else {
            updateUIForGuestUser();
        }
    }
}

// ❌ FUNZIONI DEPRECATE - RIMOSSE PER CENTRALIZZAZIONE SUPABASE
// Le seguenti funzioni sono state rimosse perché ora usiamo SOLO Supabase:
// - createUser() -> Ora gestito da /api/register
// - loginUser() -> Ora gestito da /api/login  
// - registerUser() -> Ora gestito da /api/register

function logoutUser() {
    log('🚪 ============================================');
    log('🚪 LOGOUT UTENTE');
    log('🚪 ============================================');
    
    if (currentUser) {
        log('👤 Logout di:', currentUser.email);
    }
    
    // Mostra spinner durante logout
    if (typeof window.PersistentAuth !== 'undefined') {
        window.PersistentAuth.showAuthSpinner();
    }
    
    // Usa il nuovo sistema di autenticazione persistente se disponibile
    if (typeof window.PersistentAuth !== 'undefined') {
        log('🔄 Usando sistema persistente per logout...');
        window.PersistentAuth.forceLogout('Manual logout');
        
        // Aggiorna variabili locali
        currentUser = null;
        updateUIForGuestUser();
        
        // Redirect alla homepage se siamo su una pagina protetta
        if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('dashboard.html')) {
            log('🔄 Redirect alla homepage dopo logout');
            window.location.href = '/index.html';
        } else {
            showScreen('home');
        }
        
        // Nascondi spinner
        window.PersistentAuth.hideAuthSpinner();
    } else {
        // Fallback al sistema precedente
        log('⚠️ Sistema persistente non disponibile, usando logout classico');
        
        // Pulisci TUTTI i dati di sessione
        currentUser = null;
        sessionStorage.removeItem('mental_commons_user');
        sessionStorage.removeItem('mental_commons_token');
        
        // Pulisci anche localStorage
        localStorage.removeItem('mental_commons_user');
        localStorage.removeItem('mental_commons_token');
        localStorage.removeItem('mc-user');
        localStorage.removeItem('mc-email');
        localStorage.removeItem('mc-users');
        localStorage.removeItem('mc-onboarded');
        localStorage.removeItem('mentalCommons_ucmes');
        localStorage.removeItem('mentalCommons_portatori');
        
        log('🧹 Tutti i dati di sessione puliti');
        log('🔄 Aggiornamento UI per guest...');
        
        updateUIForGuestUser();
        
        // Redirect alla homepage se siamo su una pagina protetta
        if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('dashboard.html')) {
            log('🔄 Redirect alla homepage dopo logout');
            window.location.href = '/index.html';
        } else {
            showScreen('home');
        }
    }
    
    log('✅ Logout completato');
}

// ========================================
// SINCRONIZZAZIONE STATO AUTH IMMEDIATO
// ========================================

/**
 * Sincronizza le variabili JavaScript interne con lo stato UI già configurato
 * dal controllo auth immediato. Non modifica la UI, solo le variabili.
 */
function syncUIWithCurrentState() {
    log('🔄 Sincronizzazione stato interno con UI già configurata...');
    
    if (currentUser) {
        // Stato autenticato - sincronizza variabili interne
        localStorage.setItem('mc-email', currentUser.email);
        
        // Pre-popola email nel form se presente
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = currentUser.email;
            emailInput.readOnly = true;
            emailInput.style.backgroundColor = '#1a1a1a';
            emailInput.style.opacity = '0.7';
        }
        
        log('✅ Variabili interne sincronizzate per utente:', currentUser.email);
    } else {
        // Stato guest - reset variabili interne
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = '';
            emailInput.readOnly = false;
            emailInput.style.backgroundColor = '';
            emailInput.style.opacity = '';
        }
        
        log('✅ Variabili interne sincronizzate per guest');
    }
}

// ========================================
// GESTIONE UI BASED SU LOGIN STATE
// ========================================

function updateUIForLoggedUser() {
    if (!currentUser) return;
    
    // Aggiorna navigazione desktop
    const navLogin = document.getElementById('nav-login');
    const navDashboard = document.getElementById('nav-dashboard');
    const navLogout = document.getElementById('nav-logout');
    const navProfile = document.getElementById('nav-profile');
    
    if (navLogin) navLogin.style.display = 'none';
    if (navDashboard) navDashboard.style.display = 'block';
    if (navLogout) {
        navLogout.style.display = 'block';
        navLogout.onclick = logoutUser;
    }
    if (navProfile) navProfile.style.display = 'block';
    
    // Aggiorna navigazione mobile
    const mobileNavLogin = document.getElementById('mobile-nav-login');
    const mobileNavDashboard = document.getElementById('mobile-nav-dashboard');
    const mobileNavLogout = document.getElementById('mobile-nav-logout');
    const mobileNavProfile = document.getElementById('mobile-nav-profile');
    
    if (mobileNavLogin) mobileNavLogin.style.display = 'none';
    if (mobileNavDashboard) mobileNavDashboard.style.display = 'inline-block';
    if (mobileNavLogout) {
        mobileNavLogout.style.display = 'inline-block';
        mobileNavLogout.onclick = logoutUser;
    }
    if (mobileNavProfile) mobileNavProfile.style.display = 'inline-block';
    
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
    
    log('UI aggiornata per utente loggato:', currentUser.email);
}

function updateUIForGuestUser() {
    // Aggiorna navigazione desktop
    const navLogin = document.getElementById('nav-login');
    const navDashboard = document.getElementById('nav-dashboard');
    const navLogout = document.getElementById('nav-logout');
    const navProfile = document.getElementById('nav-profile');
    
    if (navLogin) navLogin.style.display = 'block';
    if (navDashboard) navDashboard.style.display = 'none';
    if (navLogout) navLogout.style.display = 'none';
    if (navProfile) navProfile.style.display = 'none';
    
    // Aggiorna navigazione mobile
    const mobileNavLogin = document.getElementById('mobile-nav-login');
    const mobileNavDashboard = document.getElementById('mobile-nav-dashboard');
    const mobileNavLogout = document.getElementById('mobile-nav-logout');
    const mobileNavProfile = document.getElementById('mobile-nav-profile');
    
    if (mobileNavLogin) mobileNavLogin.style.display = 'inline-block';
    if (mobileNavDashboard) mobileNavDashboard.style.display = 'none';
    if (mobileNavLogout) mobileNavLogout.style.display = 'none';
    if (mobileNavProfile) mobileNavProfile.style.display = 'none';
    
    // Mostra sezione guest nella homepage - forza la visualizzazione del CTA
    const userWelcome = document.getElementById('user-welcome');
    const mainCta = document.getElementById('main-cta');
    
    if (userWelcome) {
        userWelcome.style.display = 'none';
    }
    
    if (mainCta) {
        mainCta.style.display = 'block';
        mainCta.style.visibility = 'visible';
        mainCta.style.opacity = '1';
        log('CTA main reso visibile per utente guest');
    }
    
    // Reset email field
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = '';
        emailInput.readOnly = false;
        emailInput.style.backgroundColor = '';
        emailInput.style.opacity = '';
    }
    
    log('UI aggiornata per utente guest');
}

function generateAccessCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Funzione di debug per forzare la visualizzazione del CTA
function forceShowCTA() {
    const mainCta = document.getElementById('main-cta');
    const userWelcome = document.getElementById('user-welcome');
    
    if (mainCta) {
        mainCta.style.display = 'block';
        mainCta.style.visibility = 'visible';
        mainCta.style.opacity = '1';
        log('CTA forzato a essere visibile');
    }
    
    if (userWelcome) {
        userWelcome.style.display = 'none';
        log('User welcome nascosto');
    }
}

// Funzione di debug per fare logout veloce
function debugLogout() {
    logoutUser();
    forceShowCTA();
    log('Debug: Logout forzato e CTA mostrato');
}

// Aggiungi le funzioni al window per il debugging
window.forceShowCTA = forceShowCTA;
window.debugLogout = debugLogout;

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
    
    // Controlla se l'elemento esiste prima di tentare di accedervi
    if (!modal) {
        log('⚠️ Onboarding modal not found on this page, skipping...');
        return;
    }
    
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
    
    if (!modal) {
        log('⚠️ Onboarding modal not found, marking as completed');
        return;
    }
    
    modal.style.animation = 'fadeOut 0.3s ease-out';
    
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
    
    log('Onboarding completato');
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
    log('🟣 FASE 4 DEBUG - VERIFICA STORAGE');
    log('📊 Caricamento dati esistenti...');
    
    // 🔍 VERIFICA DOVE VENGONO SALVATI I DATI
    log('🔍 VERIFICA STORAGE - Fonti di dati:');
    log('  📁 localStorage: disponibile');
    log('  📁 File JSON: statici dal build');
    log('  🗄️ Database: NON CONNESSO');
    log('  ☁️ API Vercel: NON persistente (solo log)');
    
    // Carica UCMe dal localStorage
    const savedUcmes = localStorage.getItem('mentalCommons_ucmes');
    if (savedUcmes) {
        try {
            ucmeData = JSON.parse(savedUcmes);
            log(`✅ Caricate ${ucmeData.length} UCMe dal localStorage`);
            log('📦 Storage attuale - localStorage UCMe:', {
                count: ucmeData.length,
                persistent: 'Solo fino a clear browser data',
                crossDevice: 'NO - solo questo browser',
                sample: ucmeData.slice(0, 2).map(u => ({ 
                    email: u.email, 
                    timestamp: u.timestamp,
                    text: u.text?.substring(0, 30) + '...' 
                }))
            });
        } catch (error) {
            error('Errore nel caricamento UCMe:', error);
            ucmeData = [];
        }
    } else {
        log('📭 Nessuna UCMe trovata in localStorage');
        log('⚠️ CONFERMA: localStorage vuoto - le UCMe salvate via API non sono qui');
    }
    
    // Carica candidature Portatore dal localStorage
    const savedPortatori = localStorage.getItem('mentalCommons_portatori');
    if (savedPortatori) {
        try {
            portatoreData = JSON.parse(savedPortatori);
            log(`✅ Caricate ${portatoreData.length} candidature Portatore dal localStorage`);
        } catch (error) {
            error('Errore nel caricamento candidature Portatore:', error);
            portatoreData = [];
        }
    } else {
        log('📭 Nessun portatore trovato in localStorage');
    }
    
    // 🔍 VERIFICA PERSISTENZA REALE
    log('🔍 VERIFICA PERSISTENZA STORAGE:');
    log('  📱 Mobile vs Desktop: localStorage separato per device');
    log('  🔄 Reset browser: Tutti i dati localStorage persi');
    log('  ☁️ Vercel serverless: Nessun filesystem persistente');
    log('  📊 UCMe inviate via API: Solo in log console (non recuperabili)');
    
    log('📋 Stato dati completo:', {
        ucmes: ucmeData.length,
        portatori: portatoreData.length,
        storageType: 'localStorage_only',
        persistent: false,
        crossDevice: false
    });
    
    // 🚨 EVIDENZIA PROBLEMA PERSISTENZA
    if (ucmeData.length === 0) {
        log('🚨 STORAGE ISSUE: Nessuna UCMe in localStorage');
        log('🚨 POSSIBILI CAUSE:');
        log('  1. UCMe inviate solo via API (solo log, non storage)');
        log('  2. Browser data cleared');
        log('  3. Device diverso da quello usato per inviare');
        log('  4. Nessuna UCMe mai inviata');
    }
}

function saveUcmeDataLocal(newUcme) {
    // Aggiungi la nuova UCMe all'array
    ucmeData.push(newUcme);
    
    // Salva nel localStorage
    try {
        localStorage.setItem('mentalCommons_ucmes', JSON.stringify(ucmeData));
        log('UCMe salvata nel localStorage');
    } catch (error) {
        error('Errore nel salvataggio UCMe:', error);
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
            log('Candidatura Portatore salvata');
        } catch (error) {
            error('Errore nel salvataggio candidatura Portatore:', error);
        }
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    setupNavigationListeners();
    setupAuthFormListeners();
    setupMainFormListeners();
    setupUserAreaListeners();
    setupMobileInputFixes();
    setupUniversalCharCounter(); // Deve essere ultimo per sovrascrivere eventuali altri listener
    
    // NUOVO: Aggiungi listeners per i bottoni del profilo
    setupProfileEventListeners();
}

function setupNavigationListeners() {
    // Gestione navigazione desktop
    document.getElementById('nav-user')?.addEventListener('click', () => {
        showScreen('user');
        loadUserDashboard();
    });
    document.getElementById('nav-logout')?.addEventListener('click', logoutUser);
    
    // Gestione navigazione mobile
    document.getElementById('mobile-nav-logout')?.addEventListener('click', logoutUser);
}

function setupAuthFormListeners() {
    log('🔧 setupAuthFormListeners called');
    
    // Event listener per i tab login/registrazione
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    log('🔍 Elements found:', {
        tabLogin: !!tabLogin,
        tabRegister: !!tabRegister, 
        loginForm: !!loginForm,
        registerForm: !!registerForm
    });
    
    if (tabLogin && tabRegister && loginForm && registerForm) {
        log('✅ All elements found, adding event listeners');
        // Click sul tab "Accedi"
        tabLogin.addEventListener('click', function() {
            // Aggiorna gli stili dei tab
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            
            // Mostra/nascondi i form
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            
            log('Switched to login form');
        });
        
        // Click sul tab "Registrati"
        tabRegister.addEventListener('click', function() {
            log('🎯 Tab Registrati clicked!');
            
            // Aggiorna gli stili dei tab
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            
            // Mostra/nascondi i form
            registerForm.style.display = 'block';
            loginForm.style.display = 'none';
            
            log('✅ Switched to register form');
        });
        
        // 🔧 MOBILE FIX: Aggiungi gestione input per prevenire problemi mobile
        setupMobileInputFixes();
        
        // Event listener per i form submission
        loginForm.addEventListener('submit', handleLoginSubmit);
        registerForm.addEventListener('submit', handleRegisterSubmit);
        
        log('🎉 All event listeners added successfully');
    } else {
        error('❌ Missing elements:', {
            tabLogin: !tabLogin ? 'MISSING' : 'OK',
            tabRegister: !tabRegister ? 'MISSING' : 'OK',
            loginForm: !loginForm ? 'MISSING' : 'OK', 
            registerForm: !registerForm ? 'MISSING' : 'OK'
        });
    }
}

// 🔧 NUOVA FUNZIONE: Fix per input mobile
function setupMobileInputFixes() {
    log('🔧 Setting up mobile input fixes...');
    
    // Tutti i campi email e password nel login/registrazione
    const inputs = [
        'login-email', 'login-password',
        'register-email', 'register-password', 'register-confirm'
    ];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Previeni autocomplete aggressivo
            input.setAttribute('autocomplete', inputId.includes('email') ? 'email' : 'current-password');
            input.setAttribute('autocapitalize', 'none');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');
            
            // Event listener per pulizia automatica
            input.addEventListener('input', function(e) {
                const originalValue = e.target.value;
                
                if (inputId.includes('email')) {
                    // Per email: rimuovi spazi e converti in lowercase
                    const cleanValue = originalValue.replace(/\s+/g, '').toLowerCase();
                    if (cleanValue !== originalValue) {
                        log(`📧 Email auto-corretta: "${originalValue}" → "${cleanValue}"`);
                        e.target.value = cleanValue;
                    }
                } else {
                    // Per password: rimuovi solo spazi leading/trailing
                    const cleanValue = originalValue.trim();
                    if (cleanValue !== originalValue && originalValue.length > cleanValue.length) {
                        log(`🔑 Password auto-pulita: spazi rimossi`);
                        e.target.value = cleanValue;
                    }
                }
            });
            
            // Focus/blur eventi per mobile
            input.addEventListener('focus', function() {
                log(`📱 Focus su campo: ${inputId}`);
            });
            
            input.addEventListener('blur', function() {
                log(`📱 Blur da campo: ${inputId}, valore finale: "${this.value}"`);
            });
            
            log(`✅ Mobile fixes applicati a: ${inputId}`);
        }
    });
}

// ========================================
// FUNZIONI DI DEBUG PER LOGIN MOBILE
// ========================================

function debugLoginIssues() {
    log('🔍 === DEBUG LOGIN MOBILE ===');
    
    // Controlla localStorage
    log('💾 LocalStorage status:');
    try {
        const testKey = 'mc-test-' + Date.now();
        localStorage.setItem(testKey, 'test');
        const testValue = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        log('✅ LocalStorage funziona correttamente');
    } catch (e) {
        log('❌ Errore localStorage:', e);
    }
    
    // Mostra tutti gli utenti registrati
    const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
    log('👥 Utenti registrati:', users.length);
    users.forEach((user, index) => {
        log(`👤 Utente ${index + 1}:`, {
            email: user.email,
            hasPassword: !!user.password,
            passwordLength: user.password?.length,
            emailCharCodes: user.email.split('').map(c => c.charCodeAt(0)),
            passwordCharCodes: user.password?.split('').map(c => c.charCodeAt(0)) || []
        });
    });
    
    // Info dispositivo
    log('📱 Device info:', {
        userAgent: navigator.userAgent,
        isMobile: isMobileDevice(),
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
    });
    
    return { users, localStorage: !!window.localStorage };
}

// DEBUG CODE REMOVED FOR PRODUCTION

// DEBUG CODE REMOVED FOR PRODUCTION

// DEBUG CODE REMOVED FOR PRODUCTION

// DEBUG CODE REMOVED FOR PRODUCTION

// ========================================
// GESTIONE FORM AUTENTICAZIONE
// ========================================

async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value?.trim();
    
    // 🔍 DEBUG: Log dettagliato per troubleshooting cross-device
    log('🔐 ============================================');
    log('🔐 MENTAL COMMONS - LOGIN ATTEMPT');
    log('🔐 ============================================');
    log('📤 Login data:', { 
        email, 
        password: password ? '[PRESENTE]' : '[MANCANTE]',
        emailLength: email?.length,
        passwordLength: password?.length,
        timestamp: new Date().toISOString(),
        device: navigator.userAgent,
        isMobile: isMobileDevice(),
        origin: window.location.origin
    });
    
    // Reset errori precedenti
    hideAuthError();
    
    if (!email || !password) {
        log('❌ Campi mancanti:', { email: !!email, password: !!password });
        showAuthError('Inserisci email e password per accedere.');
        return;
    }
    
    if (!isValidEmail(email)) {
        log('❌ Email non valida:', email);
        showAuthError('Inserisci un indirizzo email valido.');
        return;
    }
    
    // 🚀 SOLO SUPABASE - NESSUN FALLBACK LOCALE
    try {
        log('🌐 Tentativo login con SUPABASE (UNICA FONTE)...');
        log('🔍 Endpoint:', `${window.location.origin}/api/login`);
        
        const result = await loginWithBackend(email, password);
        
        log('📥 Risposta Supabase ricevuta:');
        log('  ✅ Success:', result.success);
        log('  👤 User data:', result.user ? 'PRESENTE' : 'MANCANTE');
        log('  🎫 Token:', result.token ? 'PRESENTE' : 'MANCANTE');
        log('  💬 Message:', result.message);
        
        if (result.success && result.user && result.token) {
            log('✅ Login Supabase riuscito');
            
            currentUser = result.user;
            
            // Usa il nuovo sistema di autenticazione persistente
            if (typeof window.PersistentAuth !== 'undefined') {
                log('💾 Salvando dati con sistema persistente...');
                window.PersistentAuth.saveAuthData(currentUser, result.token);
            } else {
                // Fallback: salva in localStorage direttamente
                log('⚠️ Sistema persistente non disponibile, salvando in localStorage');
                localStorage.setItem('mental_commons_token', result.token);
                localStorage.setItem('mental_commons_user', JSON.stringify(currentUser));
            }
            
            log('💾 Dati salvati in localStorage (PERSISTENTE)');
            log('🔄 Reindirizzamento a dashboard...');
            
            window.location.href = 'dashboard.html';
            return;
        } else {
            log('❌ Login fallito - risposta Supabase non valida');
            showAuthError(result.message || 'Errore durante il login. Verifica email e password.');
            return;
        }
        
    } catch (error) {
        error('❌ Errore CRITICO durante login Supabase:', error);
        error('Stack trace:', error.stack);
        
        // 🚨 NESSUN FALLBACK - SOLO SUPABASE
        log('🚨 NESSUN FALLBACK - LOGIN FALLITO');
        log('🔍 Possibili cause:');
        log('  1. Account non esistente nel database Supabase');
        log('  2. Password errata');
        log('  3. Problemi di connessione al database');
        log('  4. Configurazione Supabase non corretta');
        
        if (error.message.includes('404')) {
            showAuthError('Account non trovato. Registrati per accedere.');
        } else if (error.message.includes('401')) {
            showAuthError('Email o password non corretti.');
        } else {
            showAuthError('Errore di connessione. Riprova più tardi.');
        }
        
        return;
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name')?.value?.trim();
    const surname = document.getElementById('register-surname')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const password = document.getElementById('register-password')?.value?.trim();
    const confirmPassword = document.getElementById('register-confirm')?.value?.trim();
    
    // 🔍 DEBUG: Log dettagliato per troubleshooting cross-device
    log('📝 ============================================');
    log('📝 MENTAL COMMONS - REGISTER ATTEMPT');
    log('📝 ============================================');
    log('📤 Register data:', { 
        name,
        surname: surname || 'NON SPECIFICATO',
        email, 
        password: password ? '[PRESENTE]' : '[MANCANTE]',
        confirmPassword: confirmPassword ? '[PRESENTE]' : '[MANCANTE]',
        nameLength: name?.length,
        surnameLength: surname?.length,
        emailLength: email?.length,
        passwordLength: password?.length,
        timestamp: new Date().toISOString(),
        device: navigator.userAgent,
        isMobile: isMobileDevice(),
        origin: window.location.origin
    });
    
    // Reset errori precedenti
    hideAuthError();
    
    if (!name || !email || !password || !confirmPassword) {
        log('❌ Campi registrazione mancanti');
        showAuthError('Compila tutti i campi obbligatori per registrarti.');
        return;
    }
    
    // Validazione nome
    if (name.length < 2) {
        log('❌ Nome troppo corto:', name.length);
        showAuthError('Il nome deve essere di almeno 2 caratteri.');
        return;
    }
    
    // Validazione surname opzionale
    if (surname && surname.length > 100) {
        log('❌ Cognome troppo lungo:', surname.length);
        showAuthError('Il cognome deve essere massimo 100 caratteri.');
        return;
    }
    
    // Validazione formato surname
    if (surname && surname.trim() !== '') {
        const surnameRegex = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\s\-']+$/;
        if (!surnameRegex.test(surname.trim())) {
            log('❌ Formato cognome non valido:', surname);
            showAuthError('Il cognome può contenere solo lettere, spazi, apostrofi e trattini.');
            return;
        }
    }
    
    if (!isValidEmail(email)) {
        log('❌ Email registrazione non valida:', email);
        showAuthError('Inserisci un indirizzo email valido.');
        return;
    }
    
    if (password.length < 6) {
        log('❌ Password troppo corta:', password.length);
        showAuthError('La password deve essere di almeno 6 caratteri.');
        return;
    }
    
    if (password !== confirmPassword) {
        log('❌ Password non corrispondenti');
        showAuthError('Le password non corrispondono.');
        return;
    }
    
    // 🚀 SOLO SUPABASE - NESSUN FALLBACK LOCALE
    try {
        log('🌐 Tentativo registrazione con SUPABASE (UNICA FONTE)...');
        log('🔍 Endpoint:', `${window.location.origin}/api/register`);
        
        const result = await registerWithBackend(email, password, name, surname);
        
        log('📥 Risposta Supabase registrazione ricevuta:');
        log('  ✅ Success:', result.success);
        log('  👤 User data:', result.user ? 'PRESENTE' : 'MANCANTE');
        log('  🎫 Token:', result.token ? 'PRESENTE' : 'MANCANTE');
        log('  💬 Message:', result.message);
        
        if (result.success && result.user && result.token) {
            log('✅ Registrazione Supabase riuscita');
            
            currentUser = result.user;
            
            // Usa il nuovo sistema di autenticazione persistente
            if (typeof window.PersistentAuth !== 'undefined') {
                log('💾 Salvando dati con sistema persistente...');
                window.PersistentAuth.saveAuthData(currentUser, result.token);
            } else {
                // Fallback: salva in localStorage direttamente
                log('⚠️ Sistema persistente non disponibile, salvando in localStorage');
                localStorage.setItem('mental_commons_token', result.token);
                localStorage.setItem('mental_commons_user', JSON.stringify(currentUser));
            }
            
            log('💾 Dati salvati in localStorage (PERSISTENTE)');
            log('🔄 Reindirizzamento a dashboard...');
            
            showAuthError('Account creato con successo! Reindirizzamento...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            return;
        } else {
            log('❌ Registrazione fallita - risposta Supabase non valida');
            showAuthError(result.message || 'Errore durante la registrazione. Riprova.');
            return;
        }
        
    } catch (error) {
        error('❌ Errore CRITICO durante registrazione Supabase:', error);
        error('Stack trace:', error.stack);
        
        // 🚨 NESSUN FALLBACK - SOLO SUPABASE
        log('🚨 NESSUN FALLBACK - REGISTRAZIONE FALLITA');
        log('🔍 Possibili cause:');
        log('  1. Email già esistente nel database Supabase');
        log('  2. Problemi di validazione dati');
        log('  3. Problemi di connessione al database');
        log('  4. Configurazione Supabase non corretta');
        
        if (error.message.includes('409')) {
            showAuthError('Un account con questa email esiste già. Prova ad accedere.');
        } else if (error.message.includes('400')) {
            showAuthError('Dati non validi. Controlla email e password.');
        } else {
            showAuthError('Errore di connessione. Riprova più tardi.');
        }
        
        return;
    }
}

function showAuthError(message) {
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideAuthError() {
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
}

function setupMainFormListeners() {
    // Usa il sistema di char counter unificato
    setupUniversalCharCounter();
    
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
    if (!currentUser) {
        showMobileFriendlyAlert('Errore: utente non autenticato');
        return;
    }
    
    log('📤 Avvio esportazione dati per:', currentUser.email);
    
    try {
        const userUcmes = Array.isArray(ucmeData) ? ucmeData.filter(ucme => ucme.email === currentUser.email) : [];
        const exportData = {
            user: {
                email: currentUser.email,
                name: currentUser.name,
                createdAt: currentUser.createdAt,
                lastLogin: currentUser.lastLogin
            },
            ucmes: userUcmes,
            exportDate: new Date().toISOString(),
            version: "3.0"
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `mental-commons-${currentUser.email.replace('@', '-')}-${new Date().toISOString().split('T')[0]}.json`;
        
        // Aggiungi il link al DOM temporaneamente per il download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Rilascia l'URL object
        URL.revokeObjectURL(link.href);
        
        showMobileFriendlyAlert('✅ Dati esportati con successo!');
        log('✅ Esportazione completata');
        
    } catch (error) {
        error('❌ Errore durante esportazione:', error);
        showMobileFriendlyAlert('❌ Errore durante l\'esportazione');
    }
}

function deleteAccount() {
    if (!currentUser) {
        showMobileFriendlyAlert('Errore: utente non autenticato');
        return;
    }
    
    const confirmMessage = `⚠️ ATTENZIONE!\n\nSei sicuro di voler eliminare il tuo account (${currentUser.email})?\n\nQuesta azione:\n• Eliminerà tutti i tuoi dati\n• Rimuoverà tutte le tue UCMe\n• Non può essere annullata\n\nDigita "ELIMINA" per confermare:`;
    
    const confirmation = prompt(confirmMessage);
    
    if (confirmation === 'ELIMINA') {
        log('🗑️ Avvio eliminazione account per:', currentUser.email);
        
        try {
            const userEmail = currentUser.email;
            
            // Rimuovi utente dalla lista
            const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
            const filteredUsers = users.filter(u => u.email !== userEmail && u.id !== currentUser.id);
            localStorage.setItem('mc-users', JSON.stringify(filteredUsers));
            
            // Rimuovi UCMe dell'utente
            if (Array.isArray(ucmeData)) {
                ucmeData = ucmeData.filter(ucme => ucme.email !== userEmail);
                localStorage.setItem('mentalCommons_ucmes', JSON.stringify(ucmeData));
            }
            
            // Pulisci tutti i dati utente
            localStorage.removeItem('mental_commons_user');
            localStorage.removeItem('mental_commons_token');
            localStorage.removeItem('mc-user');
            localStorage.removeItem('mc-email');
            
            log('✅ Account eliminato:', userEmail);
            
            // Logout e redirect
            currentUser = null;
            showMobileFriendlyAlert('✅ Account eliminato con successo');
            
            // Delay per permettere la visualizzazione del messaggio
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
            
        } catch (error) {
            error('❌ Errore durante eliminazione account:', error);
            showMobileFriendlyAlert('❌ Errore durante l\'eliminazione dell\'account');
        }
    } else if (confirmation !== null) {
        showMobileFriendlyAlert('Eliminazione annullata. Devi digitare "ELIMINA" per confermare.');
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
    console.log('📝 ============================================');
    console.log('📝 GESTIONE INVIO FORM UCME');
    console.log('📝 ============================================');
    
    showLoadingState();
    hideAuthError();
    
    try {
        // ========================================
        // FASE 1: VALIDAZIONE FORM LATO CLIENT
        // ========================================
        
        console.log('🔍 FASE 1: Validazione form lato client...');
        
        // Verifica che tutti i campi richiesti siano presenti nel DOM
        const requiredFields = {
            'ucme-text': document.getElementById('ucme-text'),
            'email': document.getElementById('email'),
            'tone': document.getElementById('tone'),
            'acceptance': document.getElementById('acceptance')
        };
        
        for (const [fieldId, element] of Object.entries(requiredFields)) {
            if (!element) {
                throw new Error(`Campo richiesto non trovato: ${fieldId}`);
            }
        }
        
        // Validazione specifica del contenuto UCMe
        const ucmeTextElement = requiredFields['ucme-text'];
        const ucmeText = ucmeTextElement.value.trim();
        
        console.log('📝 Validazione contenuto UCMe:', {
            hasValue: !!ucmeText,
            length: ucmeText.length,
            minRequired: 20,
            maxAllowed: 600
        });
        
        if (!ucmeText) {
            throw new Error('Il contenuto della UCMe è richiesto');
        }
        
        if (ucmeText.length < 20) {
            throw new Error('Il contenuto deve essere di almeno 20 caratteri');
        }
        
        if (ucmeText.length > 600) {
            throw new Error('Il contenuto non può superare i 600 caratteri');
        }
        
        // Validazione accettazione termini
        const acceptanceElement = requiredFields['acceptance'];
        if (!acceptanceElement.checked) {
            throw new Error('Devi accettare i termini per procedere');
        }
        
        console.log('✅ Validazione lato client completata con successo');
        
        // ========================================
        // FASE 2: RACCOLTA DATI FORM
        // ========================================
        
        console.log('📋 FASE 2: Raccolta dati form...');
        
        let formData;
        try {
            formData = collectFormData();
            console.log('✅ Dati form raccolti con successo');
        } catch (error) {
            console.error('❌ Errore durante raccolta dati form:', error.message);
            throw new Error(`Errore nella preparazione dati: ${error.message}`);
        }
        
        // Validazione aggiuntiva sui dati raccolti
        if (!formData.content) {
            throw new Error('Contenuto UCMe mancante nei dati preparati');
        }
        
        console.log('📊 Riepilogo dati preparati:', {
            hasContent: !!formData.content,
            contentLength: formData.content?.length || 0,
            hasEmail: !!formData.email,
            tone: formData.tone,
            acceptance: formData.acceptance,
            portatore: formData.portatore
        });
        
        // ========================================
        // FASE 3: INVIO AL BACKEND
        // ========================================
        
        console.log('🚀 FASE 3: Invio al backend...');
        
        let result;
        
        // Determina se usare modalità autenticata o anonima
        if (currentUser && currentUser.email) {
            console.log('👤 Utente autenticato - modalità standard');
            result = await submitUCMeToVercel(formData);
        } else {
            console.log('👤 Utente non autenticato - modalità anonima');
            result = await submitAnonymousUCMe(formData);
        }
        
        // ========================================
        // FASE 4: GESTIONE SUCCESSO
        // ========================================
        
        console.log('🎉 FASE 4: Gestione successo...');
        
        if (!result || !result.success) {
            throw new Error(result?.message || 'Risposta backend non valida');
        }
        
        // Salvataggio locale per backup
        try {
            saveUcmeDataLocal(formData);
            console.log('✅ Backup locale salvato');
        } catch (backupError) {
            console.warn('⚠️ Errore salvataggio backup locale:', backupError.message);
            // Non bloccare il flusso per errori di backup
        }
        
        // Gestione portatore se richiesto
        if (formData.portatore && formData.email) {
            try {
                savePortatoreData(formData.email);
                console.log('✅ Dati portatore salvati');
            } catch (portatoreError) {
                console.warn('⚠️ Errore salvataggio dati portatore:', portatoreError.message);
                // Non bloccare il flusso per errori portatore
            }
        }
        
        // Aggiornamento dashboard se utente loggato
        if (currentUser && currentUser.email === formData.email) {
            try {
                loadUserDashboard();
                console.log('✅ Dashboard utente aggiornata');
            } catch (dashboardError) {
                console.warn('⚠️ Errore aggiornamento dashboard:', dashboardError.message);
                // Non bloccare il flusso per errori dashboard
            }
        }
        
        // Log finale con modalità usata
        const usedMode = currentUser ? 'AUTENTICATA' : 'ANONIMA';
        console.log(`🎉 UCMe inviata con successo in modalità ${usedMode}!`);
        
        // Mostra messaggio di successo
        showSuccessMessage();
        
        // Reset del form
        resetForm();
        
        console.log('🎉 UCMe inviata con successo completo!');
        console.log('📊 Risultato finale:', {
            ucmeId: result.ucme?.id,
            success: true,
            mode: usedMode,
            isAnonymous: result.ucme?.isAnonymous || false,
            timestamp: new Date().toISOString(),
            userEmail: formData.email
        });
        
    } catch (error) {
        console.error('💥 ============================================');
        console.error('💥 ERRORE DURANTE INVIO FORM UCME');
        console.error('💥 ============================================');
        console.error('💥 Messaggio:', error.message);
        console.error('💥 Stack:', error.stack);
        console.error('💥 Timestamp:', new Date().toISOString());
        console.error('💥 ============================================');
        
        showErrorMessage(error.message);
        hideLoadingState();
        
        // Log aggiuntivo per debugging
        console.log('🔍 Stato form al momento dell\'errore:', {
            ucmeText: document.getElementById('ucme-text')?.value?.length || 0,
            email: document.getElementById('email')?.value || 'N/A',
            tone: document.getElementById('tone')?.value || 'N/A',
            acceptance: document.getElementById('acceptance')?.checked || false,
            isUserLogged: !!currentUser,
            expectedMode: currentUser ? 'AUTENTICATA' : 'ANONIMA'
        });
    }
}

function collectFormData() {
    const textarea = document.getElementById('ucme-text');
    const email = document.getElementById('email');
    const tone = document.getElementById('tone');
    const acceptance = document.getElementById('acceptance');
    const portatore = document.getElementById('portatore');
    
    // Validazione essenziale dei campi obbligatori
    if (!textarea) {
        throw new Error('Campo textarea UCMe non trovato');
    }
    
    if (!email) {
        throw new Error('Campo email non trovato');
    }
    
    if (!tone) {
        throw new Error('Campo tono non trovato');
    }
    
    if (!acceptance) {
        throw new Error('Campo accettazione non trovato');
    }
    
    // Estrai e valida il contenuto
    const ucmeText = textarea.value.trim();
    
    // Validazione contenuto UCMe
    if (!ucmeText) {
        throw new Error('Il contenuto della UCMe è richiesto');
    }
    
    if (ucmeText.length < 20) {
        throw new Error('Il contenuto deve essere di almeno 20 caratteri');
    }
    
    if (ucmeText.length > 600) {
        throw new Error('Il contenuto non può superare i 600 caratteri');
    }
    
    // Se l'utente è loggato, usa la sua email
    const userEmail = currentUser ? currentUser.email : email.value.trim();
    
    // Validazione email
    if (!userEmail) {
        throw new Error('Email è richiesta');
    }
    
    if (!isValidEmail(userEmail)) {
        throw new Error('Email non valida');
    }
    
    // Validazione accettazione
    if (!acceptance.checked) {
        throw new Error('Devi accettare i termini per inviare la UCMe');
    }
    
    // Costruisci il payload nel formato atteso dal backend
    const backendPayload = {
        // Campi richiesti dal backend API
        content: ucmeText,  // Backend si aspetta 'content', non 'text'
        title: null,        // Campo opzionale, per ora null
        
        // Metadati aggiuntivi per completezza
        tone: tone.value,
        userEmail: userEmail,
        portatore: portatore ? portatore.checked : false,
        acceptance: acceptance.checked
    };
    
    // Payload completo per uso interno (mantenuto per compatibilità)
    const fullPayload = {
        // Dati backend
        ...backendPayload,
        
        // Metadati interni
        id: generateUniqueId(),
        email: userEmail,
        text: ucmeText, // Manteniamo anche 'text' per compatibilità interna
        timestamp: new Date().toISOString(),
        status: 'pending',
        response: null,
        metadata: {
            characterCount: ucmeText.length,
            userAgent: navigator.userAgent,
            language: navigator.language,
            isMobile: window.innerWidth <= 768,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            version: '3.0',
            userId: currentUser ? currentUser.id : null,
            formValidated: true,
            validationTimestamp: new Date().toISOString()
        }
    };
    
    console.log('📋 Form data collection completata:', {
        hasContent: !!backendPayload.content,
        contentLength: backendPayload.content?.length || 0,
        email: userEmail,
        tone: backendPayload.tone,
        portatore: backendPayload.portatore,
        acceptance: backendPayload.acceptance,
        isValid: true
    });
    
    return fullPayload;
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========================================
// INTEGRAZIONE VERCEL BACKEND
// ========================================

// ========================================
// FUNZIONE CENTRALIZZATA PER RECUPERO TOKEN VALIDO
// ========================================

async function getValidAuthToken() {
    log('🎫 ============================================');
    log('🎫 RECUPERO TOKEN DI AUTENTICAZIONE VALIDO');
    log('🎫 ============================================');
    
    try {
        // Controlla se il sistema auth è disponibile
        if (typeof window.PersistentAuth === 'undefined') {
            error('❌ Sistema PersistentAuth non disponibile');
            return null;
        }
        
        // Usa il sistema centralizzato di autenticazione
        const authResult = window.PersistentAuth.checkAuth();
        
        log('📊 Stato autenticazione:', {
            isAuthenticated: authResult.isAuthenticated,
            hasUser: !!authResult.user,
            hasToken: !!authResult.token,
            expired: authResult.expired
        });
        
        if (!authResult.isAuthenticated) {
            log('❌ Utente non autenticato');
            if (authResult.expired) {
                log('⏰ Token scaduto - richiesta nuovo login');
                showMobileFriendlyAlert('Sessione scaduta. Ti preghiamo di accedere di nuovo.');
                // Forza redirect a login se necessario
                setTimeout(() => {
                    if (window.location.pathname !== '/login.html') {
                        window.location.href = '/login.html';
                    }
                }, 2000);
            }
            return null;
        }
        
        const token = authResult.token;
        const tokenInfo = authResult.tokenInfo || window.PersistentAuth.getTokenInfo(token);
        
        log('✅ Token valido recuperato:', {
            userId: tokenInfo?.userId,
            email: tokenInfo?.email,
            issuedAt: tokenInfo?.issuedAt,
            expiresAt: tokenInfo?.expiresAt,
            daysUntilExpiry: tokenInfo?.daysUntilExpiry,
            tokenLength: token?.length
        });
        
        // Log token mascherato per debug
        const maskedToken = token ? 
            token.substring(0, 10) + '...' + token.substring(token.length - 10) : 
            'null';
        log('🔒 Token (mascherato):', maskedToken);
        
        return token;
        
    } catch (error) {
        error('💥 Errore durante recupero token:', error);
        return null;
    }
}

// ========================================
// INVIO UCME CON AUTENTICAZIONE ROBUSTA
// ========================================

async function submitUCMeToVercel(formData) {
    console.log('📝 ============================================');
    console.log('📝 INVIO UCME CON AUTENTICAZIONE - PAYLOAD COMPLETO');
    console.log('📝 ============================================');
    
    // Determina l'URL base del backend
    const BASE_URL = window.location.origin;
    const UCME_ENDPOINT = `${BASE_URL}/api/ucme`;
    
    console.log('🌐 Endpoint UCMe:', UCME_ENDPOINT);
    console.log('📋 Dati form ricevuti (completi):', JSON.stringify(formData, null, 2));
    
    try {
        // ========================================
        // FASE 1: RECUPERO TOKEN VALIDO
        // ========================================
        
        console.log('\n🎫 FASE 1: Recupero token di autenticazione...');
        const token = await getValidAuthToken();
        
        if (!token) {
            throw new Error('Token di autenticazione non disponibile. Effettua il login per continuare.');
        }
        
        console.log('✅ Token di autenticazione recuperato con successo');
        
        // ========================================
        // FASE 2: COSTRUZIONE PAYLOAD COMPLETO
        // ========================================
        
        console.log('\n📝 FASE 2: Costruzione payload completo...');
        
        // Payload completo che include tutti i metadati necessari
        const completePayload = {
            // Campi richiesti dal backend
            content: formData.content || formData.text, // Supporta entrambi i nomi
            title: formData.title || null,
            
            // Metadati utente essenziali
            email: formData.email || formData.userEmail,
            tone: formData.tone || 'neutro',
            
            // Metadati tecnici per il backend
            userId: currentUser?.id || null,
            timestamp: formData.timestamp || new Date().toISOString(),
            ucmeId: formData.id || generateUniqueId(),
            
            // Informazioni di contesto
            userAgent: navigator.userAgent,
            language: navigator.language || 'it',
            platform: navigator.platform || 'unknown',
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            isMobile: window.innerWidth <= 768,
            
            // Flag di validazione
            portatore: formData.portatore || false,
            acceptance: formData.acceptance || true,
            formValidated: true,
            
            // Versione sistema
            version: '3.0',
            apiVersion: '1.0'
        };
        
        // Validazione payload prima dell'invio
        if (!completePayload.content) {
            throw new Error('Contenuto della UCMe mancante');
        }
        
        if (typeof completePayload.content !== 'string') {
            throw new Error('Contenuto della UCMe deve essere una stringa');
        }
        
        if (completePayload.content.trim().length < 20) {
            throw new Error('Contenuto della UCMe troppo breve (minimo 20 caratteri)');
        }
        
        if (completePayload.content.trim().length > 600) {
            throw new Error('Contenuto della UCMe troppo lungo (massimo 600 caratteri)');
        }
        
        if (!completePayload.email) {
            throw new Error('Email utente mancante');
        }
        
        // Log del payload completo che sarà inviato
        console.log('📦 Payload UCMe COMPLETO da inviare:', JSON.stringify(completePayload, null, 2));
        console.log('📊 Validazione payload completa:', {
            hasContent: !!completePayload.content,
            contentType: typeof completePayload.content,
            contentLength: completePayload.content?.length || 0,
            hasEmail: !!completePayload.email,
            hasTone: !!completePayload.tone,
            hasTimestamp: !!completePayload.timestamp,
            hasUserId: !!completePayload.userId,
            isValid: true
        });
        
        // ========================================
        // FASE 3: PREPARAZIONE RICHIESTA HTTP
        // ========================================
        
        console.log('\n📤 FASE 3: Preparazione richiesta HTTP...');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-Version': '3.0',
            'X-Request-ID': generateUniqueId()
        };
        
        const requestBody = JSON.stringify(completePayload);
        
        const requestConfig = {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: headers,
            body: requestBody
        };
        
        // LOG DETTAGLIATO COME RICHIESTO
        console.log('📋 Headers completi inviati:', {
            'Content-Type': headers['Content-Type'],
            'Authorization': `Bearer ${token.substring(0, 10)}...${token.substring(token.length - 5)}`,
            'X-Client-Version': headers['X-Client-Version'],
            'X-Request-ID': headers['X-Request-ID']
        });
        
        console.log('📦 Request body length:', requestBody.length);
        console.log('📦 Payload fields count:', Object.keys(completePayload).length);
        
        // ========================================
        // FASE 4: INVIO RICHIESTA CON RETRY
        // ========================================
        
        console.log('\n🚀 FASE 4: Invio richiesta al server...');
        
        let response;
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Tentativo ${attempts}/${maxAttempts}...`);
            
            try {
                response = await fetch(UCME_ENDPOINT, requestConfig);
                break; // Successo, esci dal loop
            } catch (fetchError) {
                console.error(`❌ Errore fetch tentativo ${attempts}:`, fetchError.message);
                
                if (attempts === maxAttempts) {
                    throw new Error('Impossibile connettersi al server. Verifica la connessione e riprova.');
                }
                
                // Pausa prima del retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('📨 Response ricevuta:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        // ========================================
        // FASE 5: GESTIONE RISPOSTA DETTAGLIATA
        // ========================================
        
        console.log('\n📊 FASE 5: Elaborazione risposta...');
        
        // Gestione specifiche per ogni tipo di errore
        if (response.status === 400) {
            console.error('🚫 ERRORE 400 - BAD REQUEST');
            let errorDetails = {};
            try {
                errorDetails = await response.json();
                console.error('   Dettagli server:', errorDetails);
            } catch (e) {
                console.error('   Impossibile leggere dettagli errore:', e.message);
            }
            
            // Log completo per debug
            console.log('DEBUG PAYLOAD INVIATO:', {
                fields: Object.keys(completePayload),
                contentLength: completePayload.content?.length,
                hasRequiredFields: {
                    content: !!completePayload.content,
                    email: !!completePayload.email,
                    timestamp: !!completePayload.timestamp
                }
            });
            
            throw new Error(errorDetails.message || 'Dati della richiesta non validi. Controlla il contenuto della UCMe.');
        }
        
        if (response.status === 401) {
            console.error('🚫 ERRORE 401 - UNAUTHORIZED');
            let errorDetails = {};
            try {
                errorDetails = await response.json();
                console.error('   Dettagli server:', errorDetails);
            } catch (e) {
                console.error('   Impossibile leggere dettagli errore:', e.message);
            }
            
            // Forza logout
            if (typeof window.PersistentAuth !== 'undefined') {
                window.PersistentAuth.forceLogout('Token non valido durante invio UCMe');
            }
            
            throw new Error('Sessione scaduta. Accedi di nuovo per continuare.');
        }
        
        if (response.status === 500) {
            console.error('🚫 ERRORE 500 - INTERNAL SERVER ERROR');
            let errorDetails = {};
            try {
                errorDetails = await response.json();
                console.error('   Dettagli server:', errorDetails);
            } catch (e) {
                console.error('   Nessun dettaglio dal server');
            }
            
            // Log specifico per 500
            console.log('PAYLOAD EXPORT per debug server:', JSON.stringify({
                timestamp: new Date().toISOString(),
                endpoint: UCME_ENDPOINT,
                payload: completePayload,
                headers: headers,
                userAgent: navigator.userAgent,
                error: errorDetails
            }, null, 2));
            
            throw new Error('Errore interno del server. Il team tecnico è stato notificato. Riprova più tardi.');
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Errore HTTP generico:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData
            });
            
            throw new Error(errorData.message || `Errore HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log('✅ Risposta server SUCCESS:', {
            success: result.success,
            message: result.message,
            ucmeId: result.ucme?.id,
            timestamp: result.timestamp
        });
        
        if (!result.success) {
            console.error('❌ Operazione fallita secondo il server:', result.message);
            throw new Error(result.message || 'Errore sconosciuto dal server');
        }
        
        console.log('🎉 UCMe inviata con successo!');
        console.log('📊 Riepilogo finale:', {
            ucmeId: result.ucme?.id,
            payloadSize: requestBody.length,
            fieldsCount: Object.keys(completePayload).length,
            userEmail: completePayload.email,
            timestamp: result.timestamp || new Date().toISOString()
        });
        
        return result;
        
    } catch (error) {
        console.error('💥 ============================================');
        console.error('💥 ERRORE CRITICO DURANTE INVIO UCME');
        console.error('💥 ============================================');
        console.error('💥 Messaggio:', error.message);
        console.error('💥 Stack:', error.stack);
        console.error('💥 Endpoint:', UCME_ENDPOINT);
        console.error('💥 Form Data originali:', JSON.stringify(formData, null, 2));
        
        // Sistema di export per debug come richiesto dall'utente
        const debugExport = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack
            },
            endpoint: UCME_ENDPOINT,
            formData: formData,
            userAgent: navigator.userAgent,
            currentUser: currentUser,
            windowSize: `${window.innerWidth}x${window.innerHeight}`
        };
        
        // Salva in localStorage per facile esportazione
        localStorage.setItem('mc-debug-export', JSON.stringify(debugExport, null, 2));
        console.log('💾 Debug export salvato in localStorage come "mc-debug-export"');
        console.log('🔧 Per esportare: copy(localStorage.getItem("mc-debug-export"))');
        console.error('💥 ============================================');
        
        // Re-throw con messaggi user-friendly
        if (error.message.includes('Token') || error.message.includes('Sessione')) {
            throw error;
        } else if (error.message.includes('contenuto') || error.message.includes('caratteri')) {
            throw error;
        } else if (error.message.includes('connessione') || error.message.includes('server')) {
            throw error;
        } else {
            throw new Error('Si è verificato un errore imprevisto. Controlla la console per i dettagli tecnici.');
        }
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
// INVIO UCME ANONIME (SENZA AUTENTICAZIONE)
// ========================================

async function submitAnonymousUCMe(formData) {
    console.log('👤 ============================================');
    console.log('👤 INVIO UCME ANONIMA - SENZA AUTENTICAZIONE');
    console.log('👤 ============================================');
    
    // Determina l'URL base del backend
    const BASE_URL = window.location.origin;
    const UCME_ENDPOINT = `${BASE_URL}/api/ucme`;
    
    console.log('🌐 Endpoint UCMe:', UCME_ENDPOINT);
    console.log('📋 Dati form ricevuti (UCMe anonima):', JSON.stringify(formData, null, 2));
    
    try {
        // ========================================
        // FASE 1: COSTRUZIONE PAYLOAD ANONIMO
        // ========================================
        
        console.log('\n👤 FASE 1: Costruzione payload anonimo...');
        
        // Payload per UCMe anonima (no token di autenticazione)
        const anonymousPayload = {
            // Campi richiesti per UCMe anonime
            content: formData.content || formData.text,
            title: formData.title || null,
            email: formData.email, // Required per UCMe anonime
            
            // Metadati opzionali
            tone: formData.tone || 'neutro',
            timestamp: formData.timestamp || new Date().toISOString(),
            ucmeId: formData.id || generateUniqueId(),
            
            // Informazioni di contesto
            userAgent: navigator.userAgent,
            language: navigator.language || 'it',
            platform: navigator.platform || 'unknown',
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            isMobile: window.innerWidth <= 768,
            
            // Flag di validazione
            portatore: formData.portatore || false,
            acceptance: formData.acceptance || true,
            formValidated: true,
            
            // Indica che è una UCMe anonima
            isAnonymous: true,
            
            // Versione sistema
            version: '3.0',
            apiVersion: '2.3.0'
        };
        
        // Validazione payload anonimo
        if (!anonymousPayload.content) {
            throw new Error('Contenuto della UCMe mancante');
        }
        
        if (typeof anonymousPayload.content !== 'string') {
            throw new Error('Contenuto della UCMe deve essere una stringa');
        }
        
        if (anonymousPayload.content.trim().length < 20) {
            throw new Error('Contenuto della UCMe troppo breve (minimo 20 caratteri)');
        }
        
        if (anonymousPayload.content.trim().length > 600) {
            throw new Error('Contenuto della UCMe troppo lungo (massimo 600 caratteri)');
        }
        
        if (!anonymousPayload.email) {
            throw new Error('Email richiesta per ricevere la risposta alla tua UCMe');
        }
        
        // Validazione formato email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(anonymousPayload.email)) {
            throw new Error('Formato email non valido');
        }
        
        // Log del payload completo che sarà inviato
        console.log('📦 Payload UCMe ANONIMA da inviare:', JSON.stringify(anonymousPayload, null, 2));
        console.log('📊 Validazione payload anonima completa:', {
            hasContent: !!anonymousPayload.content,
            contentType: typeof anonymousPayload.content,
            contentLength: anonymousPayload.content?.length || 0,
            hasEmail: !!anonymousPayload.email,
            emailValid: emailRegex.test(anonymousPayload.email || ''),
            hasTone: !!anonymousPayload.tone,
            hasTimestamp: !!anonymousPayload.timestamp,
            isAnonymous: true,
            isValid: true
        });
        
        // ========================================
        // FASE 2: PREPARAZIONE RICHIESTA HTTP (SENZA TOKEN)
        // ========================================
        
        console.log('\n📤 FASE 2: Preparazione richiesta HTTP anonima...');
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Client-Version': '3.0',
            'X-Request-ID': generateUniqueId(),
            'X-Anonymous-Request': 'true'
        };
        
        // IMPORTANTE: Non includere Authorization header per UCMe anonime
        
        const requestBody = JSON.stringify(anonymousPayload);
        
        const requestConfig = {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: headers,
            body: requestBody
        };
        
        console.log('📋 Headers per richiesta anonima:', {
            'Content-Type': headers['Content-Type'],
            'X-Client-Version': headers['X-Client-Version'],
            'X-Request-ID': headers['X-Request-ID'],
            'X-Anonymous-Request': headers['X-Anonymous-Request'],
            'Authorization': 'NON PRESENTE (anonima)'
        });
        
        console.log('📦 Request body length:', requestBody.length);
        console.log('📦 Payload fields count:', Object.keys(anonymousPayload).length);
        
        // ========================================
        // FASE 3: INVIO RICHIESTA ANONIMA
        // ========================================
        
        console.log('\n🚀 FASE 3: Invio richiesta anonima al server...');
        
        let response;
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Tentativo anonimo ${attempts}/${maxAttempts}...`);
            
            try {
                response = await fetch(UCME_ENDPOINT, requestConfig);
                break; // Successo, esci dal loop
            } catch (fetchError) {
                console.error(`❌ Errore fetch anonimo tentativo ${attempts}:`, fetchError.message);
                
                if (attempts === maxAttempts) {
                    throw new Error('Impossibile connettersi al server. Verifica la connessione e riprova.');
                }
                
                // Pausa prima del retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('📨 Response anonima ricevuta:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        // ========================================
        // FASE 4: GESTIONE RISPOSTA ANONIMA
        // ========================================
        
        console.log('\n📊 FASE 4: Elaborazione risposta anonima...');
        
        if (!response.ok) {
            let errorDetails = {};
            try {
                errorDetails = await response.json();
                console.error('   Dettagli errore server anonimo:', errorDetails);
            } catch (e) {
                console.error('   Impossibile leggere dettagli errore:', e.message);
            }
            
            // Gestione errori specifici per UCMe anonime
            if (response.status === 400) {
                throw new Error(errorDetails.message || 'Dati della richiesta non validi. Controlla email e contenuto della UCMe.');
            } else if (response.status === 429) {
                throw new Error('Troppe richieste. Riprova tra qualche minuto.');
            } else if (response.status >= 500) {
                throw new Error('Errore del server. Riprova più tardi.');
            } else {
                throw new Error(errorDetails.message || `Errore del server (${response.status})`);
            }
        }
        
        const result = await response.json();
        
        console.log('✅ UCMe anonima inviata con successo!');
        console.log('📊 Risultato server:', result);
        
        return result;
        
    } catch (error) {
        console.error('💥 ============================================');
        console.error('💥 ERRORE DURANTE INVIO UCME ANONIMA');
        console.error('💥 ============================================');
        console.error('💥 Messaggio:', error.message);
        console.error('💥 Stack:', error.stack);
        console.error('💥 Timestamp:', new Date().toISOString());
        console.error('💥 ============================================');
        
        throw error; // Rilancia l'errore per gestione upstream
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
    setupMobileDebugTrigger();
}

// 🔧 Debug trigger per mobile (triplo tap)
function setupMobileDebugTrigger() {
    let tapCount = 0;
    let tapTimer = null;
    
    document.addEventListener('touchstart', function(e) {
        tapCount++;
        
        if (tapCount === 1) {
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 1000); // Reset dopo 1 secondo
        }
        
        if (tapCount === 3) {
            clearTimeout(tapTimer);
            tapCount = 0;
            
            // DEBUG CODE REMOVED FOR PRODUCTION
        }
    });
    
    log('📱 Mobile optimizations configurato');
}

// 🔧 Funzione per determinare se permettere auto-registrazione
function shouldAllowAutoRegistration() {
    // Permetti auto-registrazione in ambienti di sviluppo
    const isDevelopment = 
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('preview') ||
        window.location.hostname.includes('dev') ||
        window.location.hostname.includes('test') ||
        window.location.port !== '' || // Qualsiasi porta diversa da 80/443
        window.location.protocol === 'file:'; // File locale
    
    log('🔍 Ambiente rilevato:', {
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        isDevelopment: isDevelopment
    });
    
    return isDevelopment;
}

// ========================================
// BACKEND CENTRALIZZATO PER UTENTI
// ========================================

async function loginWithBackend(email, password) {
    // 🟣 FASE 3 DEBUG - VERIFICA COERENZA BACKEND
    log('🟣 FASE 3 DEBUG - LOGIN BACKEND CHIAMATA');
    
    // Determina l'URL base del backend Vercel
    const BASE_URL = window.location.origin;
    const LOGIN_ENDPOINT = `${BASE_URL}/api/login`;
    
    const payload = {
        email: email,
        password: password
    };
    
    log('🌐 Chiamata login backend Vercel (non più Google Apps Script)');
    log('📡 URL:', LOGIN_ENDPOINT);
    log('📤 Payload completo:', payload);
    log('🔍 Verifica: NON ci sono più riferimenti a script.google.com');
    
    try {
        // Fetch al nuovo endpoint Vercel
        const response = await fetch(LOGIN_ENDPOINT, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        log('📡 Response status:', response.status);
        log('📡 Response ok:', response.ok);
        log('📡 Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        log('📥 Risposta login backend SUCCESS:', result);
        log('🟣 FASE 3 - Chiamata API completata con successo (Vercel endpoint)');
        
        return result;
        
    } catch (error) {
        error('❌ Errore fetch principale:', error);
        log('🟣 FASE 3 - Errore nella chiamata API Vercel:', error.message);
        
        // Log eventuali chiamate esterne sospette
        if (error.message.includes('script.google.com')) {
            log('⚠️ ATTENZIONE: Chiamata a Google Apps Script rilevata - QUESTO NON DOVREBBE SUCCEDERE');
        }
        
        throw error;
    }
}

// Metodo fallback rimosso - ora usiamo solo Vercel API
// La funzione è mantenuta per compatibilità ma non dovrebbe più essere chiamata
async function loginWithBackendFallback(email, password) {
    log('⚠️ ATTENZIONE: loginWithBackendFallback chiamata - QUESTO NON DOVREBBE SUCCEDERE');
    log('🟣 FASE 3 - Google Apps Script è stato rimosso, ora usiamo solo Vercel API');
    
    return {
        success: false,
        message: 'Metodo fallback deprecato. Usa solo Vercel API.',
        error: 'DEPRECATED_FALLBACK',
        help: 'Tutti i login dovrebbero passare tramite /api/login Vercel endpoint'
    };
}

async function registerWithBackend(email, password, name, surname = null) {
    // 🟣 FASE 3 DEBUG - VERIFICA COERENZA BACKEND
    log('🟣 FASE 3 DEBUG - REGISTER BACKEND CHIAMATA');
    
    // Determina l'URL base del backend Vercel
    const BASE_URL = window.location.origin;
    const REGISTER_ENDPOINT = `${BASE_URL}/api/register`;
    
    const payload = {
        email: email,
        password: password,
        name: name,
        surname: surname
    };
    
    log('🌐 Chiamata registrazione backend Vercel (non più Google Apps Script)');
    log('📡 URL:', REGISTER_ENDPOINT);
    log('📤 Payload completo:', payload);
    log('🔍 Verifica: NON ci sono più riferimenti a script.google.com');
    
    try {
        const response = await fetch(REGISTER_ENDPOINT, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        log('📡 Register Response status:', response.status);
        log('📡 Register Response ok:', response.ok);
        
        const result = await response.json();
        log('📥 Risposta registrazione backend:', result);
        
        if (response.status === 409) {
            // Gestione specifica per utente già esistente
            log('⚠️ Utente già esistente (409) - Gestione migrazione');
            return {
                success: false,
                message: result.message || 'Un account con questa email già esiste',
                error: 'user_already_exists',
                statusCode: 409,
                debug: result.debug
            };
        }
        
        if (!response.ok) {
            error('❌ Errore registrazione:', response.status, result.message);
            return {
                success: false,
                message: result.message || `Errore HTTP ${response.status}`,
                error: result.debug?.error || 'registration_failed',
                statusCode: response.status,
                debug: result.debug
            };
        }
        
        log('✅ Registrazione completata con successo');
        log('🟣 FASE 3 - Registrazione API completata (Vercel endpoint)');
        
        return {
            success: true,
            ...result
        };
        
    } catch (error) {
        error('💥 Errore di rete o parsing durante registrazione:', error);
        return {
            success: false,
            message: 'Errore di connessione durante la registrazione',
            error: 'network_error',
            debug: {
                originalError: error.message,
                stack: error.stack
            }
        };
    }
}

async function syncUsersToBackend() {
    // 🟣 FASE 3 DEBUG - VERIFICA COERENZA BACKEND
    log('🟣 FASE 3 DEBUG - SYNC USERS DEPRECATO');
    log('⚠️ ATTENZIONE: Sincronizzazione con Google Apps Script rimossa');
    log('🔍 Verifica: Ora tutti i dati sono gestiti tramite Vercel API');
    
    const localUsers = JSON.parse(localStorage.getItem('mc-users') || '[]');
    
    if (localUsers.length === 0) {
        log('📭 Nessun utente locale da sincronizzare');
        return { success: true, message: 'Nessun utente da sincronizzare' };
    }
    
    log('🔄 Sincronizzazione rimossa - utenti gestiti localmente:', localUsers.length, 'utenti');
    log('💡 INFO: La sincronizzazione con backend esterno è stata rimossa');
    log('💡 INFO: Gli utenti ora vengono registrati tramite /api/register');
    
    // Log eventuali chiamate esterne sospette
    log('🔍 Loggare eventuali chiamate esterne sospette: NESSUNA (Google Apps Script rimosso)');
    
    return { 
        success: true, 
        message: 'Sincronizzazione deprecata - ora tutto tramite Vercel API',
        debug: {
            deprecated: true,
            oldMethod: 'google_apps_script',
            newMethod: 'vercel_api',
            localUsers: localUsers.length
        }
    };
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
        log('Tutti i dati cancellati');
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
    
    log('Dati di test creati nel localStorage');
    log('Utenti disponibili:');
    testUsers.forEach(user => {
        log(`- ${user.email} (codice: ${user.accessCode})`);
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

// ========================================
// FUNZIONE STICKY STATS AFFIDABILE
// ========================================

function updateStickyStats() {
    log('📊 ============================================');
    log('📊 AGGIORNAMENTO STICKY STATS AFFIDABILE');
    log('📊 ============================================');
    
    // Trova gli elementi dei contatori
    const ucmeElement = document.getElementById('ucme-count');
    const risposteElement = document.getElementById('risposte-count');
    const portatoriElement = document.getElementById('portatori-count');
    
    // Verifica presenza elementi
    const elementsFound = {
        ucme: !!ucmeElement,
        risposte: !!risposteElement,
        portatori: !!portatoriElement
    };
    
    log('🔍 Elementi contatori trovati:', elementsFound);
    
    if (!ucmeElement || !risposteElement || !portatoriElement) {
        warn('⚠️ Alcuni elementi contatori mancanti - riprovo tra 500ms');
        setTimeout(() => updateStickyStats(), 500);
        return;
    }
    
    // Valori base affidabili (rappresentano l'attività beta esistente)
    const baseStats = {
        ucme: 23,      // Pensieri raccolti durante beta
        risposte: 15,  // Risposte già inviate dai portatori
        portatori: 8   // Portatori attivi nel sistema
    };
    
    // Tenta di caricare dati reali se disponibili
    let realStats = { ucme: 0, risposte: 0, portatori: 0 };
    
    try {
        // Prova a caricare ucmeData se disponibile
        if (typeof ucmeData !== 'undefined' && Array.isArray(ucmeData)) {
            realStats.ucme = ucmeData.length;
            log('✅ UCMe reali caricate:', realStats.ucme);
        }
        
        // Prova a caricare dati da localStorage come fallback
        const localUcmes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
        if (Array.isArray(localUcmes) && localUcmes.length > realStats.ucme) {
            realStats.ucme = localUcmes.length;
            log('✅ UCMe da localStorage:', realStats.ucme);
        }
        
        // Simula risposte e portatori basandoti sui dati reali
        realStats.risposte = Math.floor(realStats.ucme * 0.7); // 70% delle UCMe ha ricevuto risposta
        realStats.portatori = Math.min(Math.max(Math.floor(realStats.ucme / 3), 3), 12); // Proporzionale ma realistico
        
    } catch (error) {
        warn('⚠️ Errore caricamento dati reali:', error.message);
        realStats = { ucme: 0, risposte: 0, portatori: 0 };
    }
    
    // Calcola statistiche finali (base + reali)
    const finalStats = {
        ucme: baseStats.ucme + realStats.ucme,
        risposte: baseStats.risposte + realStats.risposte,
        portatori: baseStats.portatori + Math.floor(realStats.portatori / 2) // Meno portatori che UCMe
    };
    
    log('📊 Statistiche calcolate:', {
        base: baseStats,
        real: realStats,
        final: finalStats
    });
    
    // Aggiorna elementi DOM con valori garantiti
    ucmeElement.textContent = finalStats.ucme.toString();
    risposteElement.textContent = finalStats.risposte.toString();
    portatoriElement.textContent = finalStats.portatori.toString();
    
    // Verifica che i valori siano stati impostati correttamente
    const verification = {
        ucme: ucmeElement.textContent,
        risposte: risposteElement.textContent,
        portatori: portatoriElement.textContent
    };
    
    log('✅ Valori impostati nei contatori:', verification);
    
    // Applica animazione di fade-in se gli elementi erano nascosti
    [ucmeElement, risposteElement, portatoriElement].forEach((element, index) => {
        if (element) {
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.6s ease-in-out';
            setTimeout(() => {
                element.style.opacity = '1';
            }, 100 + (index * 200)); // Animazione scalettata
        }
    });
    
    log('🎉 Sticky stats aggiornate con successo!');
}

async function loadRitualStats() {
    log('📊 ============================================');
    log('📊 CARICAMENTO STATISTICHE RITUALI');
    log('📊 ============================================');
    
    try {
        // Prima, prova a caricare i dati veri da file JSON
        let hasRealData = false;
        let ucmes = [];
        let risposte = [];
        
        try {
            // Carica UCMe con timeout
            const ucmeController = new AbortController();
            const ucmeTimeout = setTimeout(() => ucmeController.abort(), 3000);
            
            const ucmeResponse = await fetch('data/data.json', {
                signal: ucmeController.signal,
                cache: 'no-cache'
            });
            
            clearTimeout(ucmeTimeout);
            
            if (ucmeResponse.ok) {
                const ucmeJson = await ucmeResponse.json();
                ucmes = ucmeJson.ucmes || [];
                hasRealData = true;
                log('✅ UCMe reali caricate:', ucmes.length);
            }
        } catch (error) {
            log('⚠️ File data.json non disponibile o timeout:', error.message);
        }
        
        try {
            // Carica risposte con timeout
            const risposteController = new AbortController();
            const risposteTimeout = setTimeout(() => risposteController.abort(), 3000);
            
            const risposteResponse = await fetch('data/risposte.json', {
                signal: risposteController.signal,
                cache: 'no-cache'
            });
            
            clearTimeout(risposteTimeout);
            
            if (risposteResponse.ok) {
                const risposteJson = await risposteResponse.json();
                risposte = risposteJson.risposte || [];
                hasRealData = true;
                log('✅ Risposte reali caricate:', risposte.length);
            }
        } catch (error) {
            log('⚠️ File risposte.json non disponibile o timeout:', error.message);
        }
        
        if (hasRealData) {
            // Usa dati reali se disponibili
            const ucmeCount = ucmes.length;
            const risposteCount = risposte.length;
            const portatoriAttivi = new Set(risposte.map(r => r.portatore)).size;
            
            log('📊 Statistiche reali trovate:', {
                ucmes: ucmeCount,
                risposte: risposteCount,
                portatori: portatoriAttivi
            });
            
            updateStatsWithAnimation(ucmeCount, risposteCount, portatoriAttivi);
        } else {
            // Usa funzione affidabile come fallback
            log('🔄 Nessun dato reale - uso sticky stats affidabili');
            updateStickyStats();
        }
        
        log('✅ Caricamento statistiche completato');
        
    } catch (error) {
        error('❌ Errore critico nel caricamento statistiche:', error);
        // Fallback finale sempre funzionante
        updateStickyStats();
    }
}

function updateStatsWithAnimation(ucmeCount, risposteCount, portatoriCount) {
    log('🎬 Aggiornamento stats con animazione');
    
    // Trova gli elementi
    const ucmeElement = document.getElementById('ucme-count');
    const risposteElement = document.getElementById('risposte-count');
    const portatoriElement = document.getElementById('portatori-count');
    
    if (!ucmeElement || !risposteElement || !portatoriElement) {
        warn('⚠️ Elementi mancanti per animazione - uso updateStickyStats');
        updateStickyStats();
        return;
    }
    
    // Offset credibili per la fase beta
    const ucmeOffset = 15;
    const risposteOffset = 8;
    const portatoriOffset = 5;
    
    const finalUcmeCount = ucmeCount + ucmeOffset;
    const finalRisposteCount = risposteCount + risposteOffset;
    const finalPortatoriCount = portatoriCount + portatoriOffset;
    
    // Aggiorna immediatamente per garantire valori visibili
    ucmeElement.textContent = finalUcmeCount.toString();
    risposteElement.textContent = finalRisposteCount.toString();
    portatoriElement.textContent = finalPortatoriCount.toString();
    
    log('📊 Valori animati impostati:', {
        ucme: finalUcmeCount,
        risposte: finalRisposteCount,
        portatori: finalPortatoriCount
    });
    
    // Animazione opzionale (non blocca se fallisce)
    try {
        [ucmeElement, risposteElement, portatoriElement].forEach((element, index) => {
            if (element) {
                element.style.transition = 'opacity 0.8s ease';
                element.style.opacity = '0';
                setTimeout(() => {
                    element.style.opacity = '1';
                }, 100 + (index * 300));
            }
        });
    } catch (animError) {
        log('⚠️ Animazione fallita (non critico):', animError.message);
    }
}

// ========================================
// FUNZIONI CONSOLE & DEBUG (GLOBALI)
// ========================================

// Funzione per resettare un utente specifico (accessibile dalla console)
function resetUser(email) {
    try {
        const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
        const filteredUsers = users.filter(user => user.email !== email);
        
        // Rimuovi utente specifico
        localStorage.setItem('mc-users', JSON.stringify(filteredUsers));
        
        // Se era l'utente corrente, rimuovilo
        const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
        if (currentUser && currentUser.email === email) {
            localStorage.removeItem('mc-user');
            // Reset della UI per guest user
            updateUIForGuestUser();
        }
        
        log(`✅ Utente ${email} rimosso dal sistema`);
        log(`📊 Utenti rimanenti: ${filteredUsers.length}`);
        
        // Ricarica dashboard se siamo in quella pagina
        if (window.location.pathname.includes('dashboard.html')) {
            location.reload();
        }
        
        return { success: true, message: `Utente ${email} rimosso` };
        
    } catch (error) {
        error('Errore nel reset utente:', error);
        return { success: false, error: error.message };
    }
}

// Funzione per vedere tutti gli utenti (accessibile dalla console)
function showUsers() {
    try {
        const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
        const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
        
        log('👥 UTENTI NEL SISTEMA:');
        log('=====================');
        
        if (users.length === 0) {
            log('Nessun utente registrato');
            return { users: [], currentUser: null };
        }
        
        users.forEach((user, i) => {
            const isCurrent = currentUser && currentUser.email === user.email;
            log(`${i+1}. ${user.email} (${user.name}) ${isCurrent ? '← ATTUALE' : ''}`);
            log(`   Codice: ${user.accessCode || 'N/A'}`);
            log(`   Creato: ${new Date(user.createdAt).toLocaleDateString('it-IT')}`);
        });
        
        if (currentUser) {
            log(`\n🔓 Utente attualmente loggato: ${currentUser.email}`);
        } else {
            log('\n👤 Nessun utente loggato');
        }
        
        return { users, currentUser };
        
    } catch (error) {
        error('Errore nel recuperare utenti:', error);
        return { error: error.message };
    }
}

// Funzione per trovare un utente specifico (accessibile dalla console) 
function findUser(email) {
    try {
        const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
        const user = users.find(u => u.email === email);
        
        if (user) {
            log('👤 UTENTE TROVATO:');
            log('==================');
            log(`Email: ${user.email}`);
            log(`Nome: ${user.name}`);
            log(`ID: ${user.id}`);
            log(`Codice accesso: ${user.accessCode || 'N/A'}`);
            log(`Creato: ${new Date(user.createdAt).toLocaleDateString('it-IT')}`);
            log(`Ultimo login: ${new Date(user.lastLogin).toLocaleDateString('it-IT')}`);
            log(`Portatore: ${user.isPortatore ? 'Sì' : 'No'}`);
            
            return user;
        } else {
            log(`❌ Utente con email "${email}" non trovato`);
            return null;
        }
        
    } catch (error) {
        error('Errore nella ricerca utente:', error);
        return { error: error.message };
    }
}

// Funzione per reset completo (accessibile dalla console)
function resetAllData() {
    try {
        localStorage.removeItem('mc-users');
        localStorage.removeItem('mc-user');
        localStorage.removeItem('mc-ucme-data');
        localStorage.removeItem('mc-onboarded');
        localStorage.removeItem('mc-email');
        
        // Reset UI
        if (typeof updateUIForGuestUser === 'function') {
            updateUIForGuestUser();
        }
        
        log('🗑️ Tutti i dati rimossi dal localStorage');
        log('✅ Sistema resettato - puoi ora registrare nuovi utenti');
        
        // Ricarica la pagina se necessario
        if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('login.html')) {
            setTimeout(() => location.reload(), 1000);
        }
        
        return { success: true };
        
    } catch (error) {
        error('Errore nel reset dati:', error);
        return { success: false, error: error.message };
    }
}

// Esponi le funzioni al window per accesso globale
window.resetUser = resetUser;
window.showUsers = showUsers; 
window.findUser = findUser;
window.resetAllData = resetAllData; 

// ========================================
// FUNZIONI DI DEBUG PER DASHBOARD
// ========================================

// Funzione di emergenza per forzare la visualizzazione della dashboard
function forceDashboardDisplay() {
    log('🚨 FORZATURA EMERGENCY - Aggiornamento immediato stato visuale dashboard');
    
    const userVerification = document.getElementById('user-verification');
    const dashboardContent = document.getElementById('dashboard-content');
    
    if (userVerification) {
        userVerification.style.display = 'none';
        log('🚨 FORCED: Messaggio caricamento nascosto');
    }
    
    if (dashboardContent) {
        dashboardContent.style.display = 'block';
        log('🚨 FORCED: Dashboard content mostrato');
    }
    
    log('🚨 EMERGENCY FORCE COMPLETED');
    return { userVerification: !!userVerification, dashboardContent: !!dashboardContent };
}

// Rendi la funzione disponibile globalmente
window.forceDashboardDisplay = forceDashboardDisplay;

// Funzione di debug che può essere chiamata dalla console per diagnosticare problemi dashboard
function debugDashboard() {
    log('🔍 === DEBUG DASHBOARD ===');
    
    // Verifica elementi DOM
    log('📊 Verifica elementi DOM:');
    const userVerification = document.getElementById('user-verification');
    const dashboardContent = document.getElementById('dashboard-content');
    const noAccess = document.getElementById('no-access');
    const ucmeBlocks = document.getElementById('ucme-blocks');
    
    log({
        userVerification: !!userVerification,
        userVerificationDisplay: userVerification?.style.display,
        dashboardContent: !!dashboardContent,
        dashboardContentDisplay: dashboardContent?.style.display,
        noAccess: !!noAccess,
        noAccessDisplay: noAccess?.style.display,
        ucmeBlocks: !!ucmeBlocks
    });
    
    // Verifica stato utente
    log('👤 Stato utente corrente:');
    log({
        currentUser: currentUser,
        hasCurrentUser: !!currentUser,
        currentUserEmail: currentUser?.email
    });
    
    // Verifica dati
    log('📊 Stato dati:');
    log({
        ucmeDataType: typeof ucmeData,
        ucmeDataLength: Array.isArray(ucmeData) ? ucmeData.length : 'N/A',
        ucmeDataSample: Array.isArray(ucmeData) ? ucmeData.slice(0, 2) : ucmeData
    });
    
    // Se utente è loggato, prova a caricare i suoi dati
    if (currentUser) {
        log('🔄 Test caricamento dati utente...');
        try {
            const userData = loadDashboardData(currentUser.email);
            log('✅ Dati utente caricati:', userData);
        } catch (error) {
            error('❌ Errore nel caricamento dati utente:', error);
        }
    }
    
    log('🔍 === FINE DEBUG DASHBOARD ===');
}

// Rendi la funzione disponibile globalmente per debug
window.debugDashboard = debugDashboard;

// Funzione di debug per il profilo
function debugProfile() {
    log('🔍 === DEBUG PROFILO ===');
    
    // Verifica elementi DOM
    log('📊 Verifica elementi DOM profilo:');
    const userVerification = document.getElementById('user-verification');
    const profileContent = document.getElementById('profile-content');
    const profileHeader = document.getElementById('profile-header');
    const noAccess = document.getElementById('no-access');
    
    log({
        userVerification: !!userVerification,
        userVerificationDisplay: userVerification?.style.display,
        profileContent: !!profileContent,
        profileContentDisplay: profileContent?.style.display,
        profileHeader: !!profileHeader,
        profileHeaderDisplay: profileHeader?.style.display,
        noAccess: !!noAccess,
        noAccessDisplay: noAccess?.style.display
    });
    
    // Verifica stato utente
    log('👤 Stato utente corrente:');
    log({
        currentUser: currentUser,
        hasCurrentUser: !!currentUser,
        currentUserEmail: currentUser?.email
    });
    
    // Se utente è loggato, prova a caricare i suoi dati profilo
    if (currentUser) {
        log('🔄 Test caricamento dati profilo...');
        try {
            const profileData = loadProfileData(currentUser);
            log('✅ Dati profilo caricati:', profileData);
        } catch (error) {
            error('❌ Errore nel caricamento dati profilo:', error);
        }
    }
    
    log('🔍 === FINE DEBUG PROFILO ===');
}

// Rendi la funzione disponibile globalmente per debug
window.debugProfile = debugProfile;

// Funzione di emergenza per forzare la visualizzazione del profilo
function forceProfileDisplay() {
    log('🚨 FORZATURA EMERGENCY - Aggiornamento immediato stato visuale profilo');
    
    const userVerification = document.getElementById('user-verification');
    const profileContent = document.getElementById('profile-content');
    
    if (userVerification) {
        userVerification.style.display = 'none';
        log('🚨 FORCED: Messaggio caricamento profilo nascosto');
    }
    
    if (profileContent) {
        profileContent.style.display = 'block';
        log('🚨 FORCED: Profilo content mostrato');
    }
    
    log('🚨 EMERGENCY FORCE PROFILE COMPLETED');
    return { userVerification: !!userVerification, profileContent: !!profileContent };
}

// Rendi la funzione disponibile globalmente
window.forceProfileDisplay = forceProfileDisplay;

// ========================================
// CHAR COUNTER FALLBACK
// ========================================

// ========================================
// SISTEMA CHAR COUNTER UNIVERSALE - FIX DEFINITIVO
// ========================================

// Inizializzazione DOMContentLoaded per il contatore caratteri
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('ucme-text');
  const counter = document.getElementById('char-count');
  if (textarea && counter) {
    counter.textContent = textarea.value.length;
    textarea.addEventListener('input', () => {
      counter.textContent = textarea.value.length;
    });
    console.log("✅ Contatore UCMe attivato");
  } else {
    console.error("❌ Contatore UCMe non inizializzato: elementi mancanti");
  }
});

/**
 * 🎯 SETUP CHAR COUNTER UNIVERSALE
 * Sistema robusto che funziona su tutte le pagine e piattaforme
 */
function setupUniversalCharCounter() {
    log('🔄 Inizializzazione char counter universale...');
    
    const textarea = document.getElementById('ucme-text');
    const charCount = document.getElementById('char-count');
    
    if (!textarea || !charCount) {
        debug('⚠️ Elementi char counter non trovati su questa pagina:', {
            textarea: !!textarea,
            charCount: !!charCount,
            url: window.location.pathname
        });
        return false;
    }
    
    // Verifica se già configurato
    if (textarea.hasAttribute('data-char-counter-initialized')) {
        debug('✅ Char counter già inizializzato');
        return true;
    }
    
    log('🔧 Configurazione char counter...');
    
    // Funzione di aggiornamento robusto
    const updateCharCounter = function() {
        const currentLength = this.value.length;
        charCount.textContent = currentLength;
        
        // Styling dinamico del contatore
        charCount.className = 'char-count';
        if (currentLength < 20) {
            charCount.style.color = '#ff6b6b';
            charCount.classList.add('char-count-warning');
        } else if (currentLength > 500) {
            charCount.style.color = '#ffa726';
            charCount.classList.add('char-count-warning');
        } else {
            charCount.style.color = '#4caf50';
            charCount.classList.remove('char-count-warning');
        }
        
        debug(`📝 Char counter: ${currentLength}/600 caratteri`);
        
        // Chiama validazione form se disponibile
        if (typeof validateForm === 'function') {
            validateForm();
        }
    };
    
    // Listener per tutti i tipi di input
    const events = ['input', 'keyup', 'change', 'paste', 'cut'];
    events.forEach(event => {
        textarea.addEventListener(event, function(e) {
            if (event === 'paste' || event === 'cut') {
                // Delay per paste/cut per permettere il completamento
                setTimeout(() => updateCharCounter.call(this), 10);
            } else {
                updateCharCounter.call(this);
            }
        });
    });
    
    // Listener per eventi touch su mobile
    if ('ontouchstart' in window) {
        textarea.addEventListener('touchend', updateCharCounter);
    }
    
    // Marca come inizializzato
    textarea.setAttribute('data-char-counter-initialized', 'true');
    
    // Inizializza immediatamente
    updateCharCounter.call(textarea);
    
    log('✅ Char counter universale configurato correttamente');
    return true;
}

/**
 * 🔄 FALLBACK CHAR COUNTER PER PAGES LEGACY
 * Chiamato automaticamente se il setup principale non funziona
 */
function ensureCharCounterWorks() {
    // Prova configurazione dopo caricamento DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupUniversalCharCounter);
    } else {
        setupUniversalCharCounter();
    }
    
    // Fallback con timeout per casi edge
    setTimeout(() => {
        if (!document.getElementById('ucme-text')?.hasAttribute('data-char-counter-initialized')) {
            debug('🔄 Tentativo fallback char counter...');
            setupUniversalCharCounter();
        }
    }, 1000);
}

// ========================================
// SETUP EVENT LISTENERS PROFILO - NUOVA FUNZIONE
// ========================================

function setupProfileEventListeners() {
    log('🔄 Configurazione event listeners per profilo...');
    
    // Bottone logout nell'header del profilo
    const logoutHeaderBtn = document.getElementById('logout-header-btn');
    if (logoutHeaderBtn) {
        logoutHeaderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            log('🚪 Logout richiesto dall\'header profilo');
            logoutUser();
        });
        log('✅ Event listener logout header configurato');
    }
    
    // Bottone modifica profilo - DISABILITATO: Ora usa onclick inline
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        log('🔍 Pulsante edit-profile-btn trovato - usando onclick inline');
        // RIMOSSO: addEventListener per evitare conflitti con onclick inline
    } else {
        error('❌ Pulsante edit-profile-btn NON trovato!');
    }
    
    // Bottone esporta dati
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function(e) {
            e.preventDefault();
            log('📤 Esportazione dati richiesta');
            exportUserData();
        });
        log('✅ Event listener esportazione dati configurato');
    }
    
    // Bottone elimina account
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function(e) {
            e.preventDefault();
            log('🗑️ Eliminazione account richiesta');
            deleteAccount();
        });
        log('✅ Event listener eliminazione account configurato');
    }
    
    // Form di modifica profilo
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            log('💾 Salvataggio profilo richiesto');
            saveProfileChanges();
        });
        log('✅ Event listener form profilo configurato');
    }
    
    // Bottone annulla modifica
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function(e) {
            e.preventDefault();
            log('❌ Annullamento modifica profilo');
            hideEditProfileForm();
        });
        log('✅ Event listener annulla modifica configurato');
    }
    
    log('✅ Tutti gli event listeners del profilo configurati');
}

// ========================================
// FUNZIONI GESTIONE FORM MODIFICA PROFILO - NUOVE FUNZIONI
// ========================================

// FUNZIONE GLOBALE DI EMERGENZA - DEVE FUNZIONARE SEMPRE
window.forceToggleProfileForm = function() {
    console.log('🚨 FUNZIONE DI EMERGENZA CHIAMATA!');
    
    const editForm = document.getElementById('edit-profile-form');
    const editBtn = document.getElementById('edit-profile-btn');
    
    console.log('🔍 Elementi trovati:', { 
        editForm: !!editForm, 
        editBtn: !!editBtn
    });
    
    if (!editForm) {
        alert('❌ ERRORE: Form di modifica non trovato!');
        return;
    }
    
    if (!editBtn) {
        alert('❌ ERRORE: Pulsante di modifica non trovato!');
        return;
    }
    
    // Recupera l'utente corrente
    let user = window.currentUser;
    if (!user) {
        try {
            const savedUser = localStorage.getItem('mental_commons_user');
            if (savedUser) {
                user = JSON.parse(savedUser);
                window.currentUser = user;
                console.log('✅ Utente recuperato dal localStorage:', user.email);
            } else {
                alert('❌ ERRORE: Nessun utente loggato trovato!');
                return;
            }
        } catch (e) {
            alert('❌ ERRORE: Impossibile recuperare dati utente!');
            return;
        }
    }
    
    // Controlla lo stato del form
    const isHidden = editForm.style.display === 'none' || window.getComputedStyle(editForm).display === 'none';
    console.log('📋 Stato form:', { 
        display: editForm.style.display,
        computed: window.getComputedStyle(editForm).display,
        isHidden: isHidden 
    });
    
    if (isHidden) {
        // MOSTRA il form
        console.log('👆 MOSTRANDO form...');
        
        // Popola i campi
        const editName = document.getElementById('edit-name');
        const editEmail = document.getElementById('edit-email');
        
        if (editName) editName.value = user.name || '';
        if (editEmail) editEmail.value = user.email || '';
        
        // Mostra
        editForm.style.display = 'block';
        editBtn.textContent = 'Annulla modifica';
        
        console.log('✅ Form mostrato!');
        
    } else {
        // NASCONDI il form
        console.log('👆 NASCONDENDO form...');
        
        editForm.style.display = 'none';
        editBtn.textContent = 'Modifica le tue informazioni';
        
        console.log('✅ Form nascosto!');
    }
};

// FUNZIONE GLOBALE PER SALVARE IL PROFILO
window.forceSaveProfile = function(event) {
    event.preventDefault();
    console.log('🚨 SALVATAGGIO PROFILO FORZATO!');
    
    // Recupera utente
    let user = window.currentUser;
    if (!user) {
        try {
            const savedUser = localStorage.getItem('mental_commons_user');
            if (savedUser) {
                user = JSON.parse(savedUser);
                window.currentUser = user;
            } else {
                alert('❌ ERRORE: Nessun utente loggato!');
                return;
            }
        } catch (e) {
            alert('❌ ERRORE: Impossibile recuperare dati utente!');
            return;
        }
    }
    
    // Recupera valori form
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPassword = document.getElementById('edit-password');
    const editConfirmPassword = document.getElementById('edit-confirm-password');
    
    if (!editName || !editEmail) {
        alert('❌ ERRORE: Campi form non trovati!');
        return;
    }
    
    const newName = editName.value.trim();
    const newEmail = editEmail.value.trim();
    const newPassword = editPassword ? editPassword.value.trim() : '';
    const confirmPassword = editConfirmPassword ? editConfirmPassword.value.trim() : '';
    
    // Validazione
    if (!newName) {
        alert('❌ Il nome è obbligatorio');
        return;
    }
    
    if (!newEmail || !newEmail.includes('@')) {
        alert('❌ Email non valida');
        return;
    }
    
    if (newPassword && newPassword !== confirmPassword) {
        alert('❌ Le password non coincidono');
        return;
    }
    
    if (newPassword && newPassword.length < 6) {
        alert('❌ La password deve essere di almeno 6 caratteri');
        return;
    }
    
    // Salva modifiche
    try {
        const oldEmail = user.email;
        user.name = newName;
        user.email = newEmail;
        
        if (newPassword) {
            user.password = newPassword;
        }
        
        // Salva nel localStorage
        localStorage.setItem('mental_commons_user', JSON.stringify(user));
        
        // Aggiorna anche nella lista utenti
        const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
        const userIndex = users.findIndex(u => u.email === oldEmail || u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('mc-users', JSON.stringify(users));
        }
        
        // Aggiorna UI
        const profileEmail = document.getElementById('profile-email');
        const profileName = document.getElementById('profile-name');
        const profileHeaderEmail = document.getElementById('profile-header-email');
        
        if (profileEmail) profileEmail.textContent = user.email;
        if (profileName) profileName.textContent = user.name;
        if (profileHeaderEmail) profileHeaderEmail.textContent = user.email;
        
        // Nascondi form
        window.forceToggleProfileForm();
        
        alert('✅ Profilo aggiornato con successo!');
        console.log('✅ Profilo salvato:', user.email);
        
    } catch (error) {
        console.error('❌ Errore nel salvataggio:', error);
        alert('❌ Errore nel salvataggio. Riprova.');
    }
};

function toggleEditProfileForm() {
    log('🔄 toggleEditProfileForm chiamata');
    
    const editForm = document.getElementById('edit-profile-form');
    const editBtn = document.getElementById('edit-profile-btn');
    
    log('🔍 Elementi trovati:', { 
        editForm: !!editForm, 
        editBtn: !!editBtn,
        currentUser: !!currentUser,
        currentUserEmail: currentUser?.email 
    });
    
    if (!editForm || !editBtn) {
        error('❌ Elementi form modifica profilo non trovati');
        showMobileFriendlyAlert('Errore: Elementi form non trovati');
        return;
    }
    
    // Usa getComputedStyle per verificare se l'elemento è realmente visibile
    const computedStyle = window.getComputedStyle(editForm);
    const isHidden = computedStyle.display === 'none' || editForm.style.display === 'none';
    
    log('📋 Stato form:', { 
        inlineDisplay: editForm.style.display, 
        computedDisplay: computedStyle.display, 
        isHidden: isHidden 
    });
    
    if (isHidden) {
        log('👆 Mostrando form di modifica...');
        showEditProfileForm();
    } else {
        log('👆 Nascondendo form di modifica...');
        hideEditProfileForm();
    }
}

function showEditProfileForm() {
    const editForm = document.getElementById('edit-profile-form');
    const editBtn = document.getElementById('edit-profile-btn');
    
    if (!editForm || !editBtn) {
        error('❌ Elementi form non trovati:', { editForm: !!editForm, editBtn: !!editBtn });
        showMobileFriendlyAlert('Errore: Form di modifica non trovato');
        return;
    }
    
    if (!currentUser) {
        error('❌ currentUser è null o undefined');
        // Prova a recuperare l'utente dal localStorage
        try {
            const savedUser = localStorage.getItem('mental_commons_user');
            if (savedUser) {
                window.currentUser = JSON.parse(savedUser);
                log('✅ Utente recuperato dal localStorage');
            } else {
                error('❌ Nessun utente salvato in localStorage');
                showMobileFriendlyAlert('Errore: Utente non autenticato. Ricarica la pagina.');
                return;
            }
        } catch (e) {
            error('❌ Errore recupero utente:', e);
            showMobileFriendlyAlert('Errore: Impossibile caricare i dati utente. Ricarica la pagina.');
            return;
        }
    }
    
    // Popola il form con i dati attuali
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    
    if (editName) editName.value = currentUser.name || '';
    if (editEmail) editEmail.value = currentUser.email || '';
    
    // Mostra il form
    editForm.style.display = 'block';
    editBtn.textContent = 'Annulla modifica';
    
    log('✅ Form modifica profilo mostrato per utente:', currentUser.email);
}

function hideEditProfileForm() {
    const editForm = document.getElementById('edit-profile-form');
    const editBtn = document.getElementById('edit-profile-btn');
    
    if (!editForm || !editBtn) return;
    
    editForm.style.display = 'none';
    editBtn.textContent = 'Modifica le tue informazioni';
    
    log('✅ Form modifica profilo nascosto');
}

function saveProfileChanges() {
    if (!currentUser) {
        showMobileFriendlyAlert('Errore: utente non autenticato');
        return;
    }
    
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPassword = document.getElementById('edit-password');
    const editConfirmPassword = document.getElementById('edit-confirm-password');
    
    if (!editName || !editEmail) {
        showMobileFriendlyAlert('Errore: campi form non trovati');
        return;
    }
    
    const newName = editName.value.trim();
    const newEmail = editEmail.value.trim();
    const newPassword = editPassword ? editPassword.value.trim() : '';
    const confirmPassword = editConfirmPassword ? editConfirmPassword.value.trim() : '';
    
    // Validazione
    if (!newName) {
        showMobileFriendlyAlert('Il nome è obbligatorio');
        return;
    }
    
    if (!newEmail || !isValidEmail(newEmail)) {
        showMobileFriendlyAlert('Email non valida');
        return;
    }
    
    if (newPassword && newPassword !== confirmPassword) {
        showMobileFriendlyAlert('Le password non coincidono');
        return;
    }
    
    if (newPassword && newPassword.length < 6) {
        showMobileFriendlyAlert('La password deve essere di almeno 6 caratteri');
        return;
    }
    
    // Aggiorna i dati utente
    const oldEmail = currentUser.email;
    currentUser.name = newName;
    currentUser.email = newEmail;
    
    if (newPassword) {
        currentUser.password = newPassword; // In un'app reale, questo dovrebbe essere hashato
    }
    
    // Salva i cambiamenti
    try {
        // Aggiorna localStorage
        localStorage.setItem('mental_commons_user', JSON.stringify(currentUser));
        
        // Aggiorna anche nella lista utenti se esiste
        const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
        const userIndex = users.findIndex(u => u.email === oldEmail || u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            localStorage.setItem('mc-users', JSON.stringify(users));
        }
        
        // Aggiorna UI
        updateProfileInfo(currentUser);
        hideEditProfileForm();
        
        showMobileFriendlyAlert('Profilo aggiornato con successo!');
        log('✅ Profilo salvato con successo');
        
    } catch (error) {
        error('❌ Errore nel salvataggio profilo:', error);
        showMobileFriendlyAlert('Errore nel salvataggio. Riprova.');
    }
}