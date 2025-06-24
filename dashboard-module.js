// Mental Commons - Dashboard Module 3.0
// Modulo separato per dashboard - Lazy Loading

// Sistema di logging
const dashLog = (...args) => { if (!window.isProduction) console.log(...args); };
const dashDebug = (...args) => { if (!window.isProduction) console.debug(...args); };
const dashError = (...args) => { console.error(...args); };

// ========================================
// DASHBOARD MODULE - LAZY LOADED
// ========================================

window.DashboardModule = {
    initialized: false,
    
    async init() {
        if (this.initialized) return;
        
        dashLog('📊 Inizializzazione Dashboard Module...');
        this.setupEventListeners();
        this.initialized = true;
        dashLog('✅ Dashboard Module inizializzato');
    },

    async loadUserData(email) {
        try {
            dashLog('📊 Caricamento dati utente dashboard...');
            dashLog('📧 Email utente:', email);
            
            const token = localStorage.getItem('mental_commons_token');
            if (!token) {
                dashError('❌ Token mancante - impossibile caricare UCMe');
                this.renderEmptyDashboard();
                return [];
            }
            
            dashLog('🔑 Token presente - procedo con API call...');
            
            const response = await fetch('/api/ucme', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-User-Email': email  // Header aggiuntivo per debug
                }
            });
            
            dashLog('📡 Risposta API ricevuta:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
            
            if (!response.ok) {
                dashError('❌ API call fallita:', response.status, response.statusText);
                this.renderEmptyDashboard();
                return [];
            }
            
            const result = await response.json();
            
            dashLog('📦 Dati ricevuti dall\'API:', {
                success: result.success,
                hasData: !!result.data,
                dataType: typeof result.data,
                isArray: Array.isArray(result.data),
                count: result.data?.length || 0
            });
            
            if (result.success && Array.isArray(result.data)) {
                dashLog('✅ UCMe caricate dal backend unificato:', result.data.length);
                
                // Log delle UCMe per debug
                result.data.forEach((ucme, index) => {
                    dashLog(`📝 UCMe ${index + 1}:`, {
                        id: ucme.id,
                        content_preview: ucme.content?.substring(0, 50) + '...',
                        created_at: ucme.created_at,
                        user_id: ucme.user_id,
                        status: ucme.status
                    });
                });
                
                this.renderDashboard(result.data);
                return result.data;
            } else {
                dashError('❌ Struttura dati non valida o array vuoto:', result);
                this.renderEmptyDashboard();
                return [];
            }
            
        } catch (error) {
            dashError('❌ Errore dashboard:', error);
            dashError('Stack trace:', error.stack);
            this.renderEmptyDashboard();
            return [];
        }
    },

    renderDashboard(ucmes) {
        const dashboardContent = document.querySelector('.dashboard-content');
        if (!dashboardContent) return;

        if (!ucmes || ucmes.length === 0) {
            this.renderEmptyDashboard();
            return;
        }

        const ucmeBlocks = ucmes.map((ucme, index) => 
            this.createDashboardUcmeBlock(ucme, index)
        ).join('');

        dashboardContent.innerHTML = `
            <div class="ucme-blocks">
                ${ucmeBlocks}
            </div>
            <div class="dashboard-actions">
                <a href="/#form" class="new-ucme-button">Condividi un nuovo pensiero</a>
            </div>
        `;

        // Animazioni progressive
        const blocks = dashboardContent.querySelectorAll('.ucme-block');
        blocks.forEach((block, index) => {
            block.style.opacity = '0';
            block.style.transform = 'translateY(20px)';
            setTimeout(() => {
                block.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                block.style.opacity = '1';
                block.style.transform = 'translateY(0)';
            }, index * 100);
        });

        dashLog('✅ Dashboard renderizzata con', ucmes.length, 'UCMe');
    },

    renderEmptyDashboard() {
        const dashboardContent = document.querySelector('.dashboard-content');
        if (!dashboardContent) return;

        dashboardContent.innerHTML = `
            <div class="empty-dashboard">
                <h3>Non hai ancora condiviso pensieri</h3>
                <p>La tua area personale è il luogo dove ritrovi tutto quello che hai condiviso e le risposte che hai ricevuto.</p>
                <p><strong>Inizia ora a condividere il tuo primo pensiero.</strong></p>
                <a href="/#form" class="new-ucme-button">Condividi il tuo primo pensiero</a>
            </div>
        `;

        dashLog('📊 Dashboard vuota renderizzata');
    },

    createDashboardUcmeBlock(ucme, index) {
        const date = new Date(ucme.created_at || ucme.timestamp);
        const dateStr = date.toLocaleDateString('it-IT', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const hasResponse = ucme.risposta && ucme.risposta.trim();
        const status = hasResponse ? 'risposto' : 'in-attesa';
        const statusText = hasResponse ? 'Risposta ricevuta' : 'In attesa di risposta';

        return `
            <div class="ucme-block ${status}">
                <div class="ucme-header">
                    <div class="ucme-status">${statusText}</div>
                    <div class="ucme-date">${dateStr}</div>
                </div>
                <div class="ucme-content">
                    <div class="ucme-text">
                        <p>${ucme.pensiero || ucme.content}</p>
                    </div>
                    ${ucme.tono ? `<div class="ucme-meta">
                        <span class="ucme-tone">Tono: ${ucme.tono}</span>
                    </div>` : ''}
                    ${hasResponse ? `
                        <div class="ucme-response">
                            <h4>Risposta del Portatore</h4>
                            <div class="response-text">${ucme.risposta}</div>
                            ${ucme.risposta_data ? `<div class="response-meta">
                                <span class="response-date">${new Date(ucme.risposta_data).toLocaleDateString('it-IT')}</span>
                            </div>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    setupEventListeners() {
        // Event listeners specifici per dashboard
        dashDebug('🔗 Dashboard event listeners configurati');
    }
};

dashLog('📊 Dashboard Module caricato'); 