// ================================================================
// MENTAL COMMONS - FRONTEND REAL-TIME INTEGRATION
// ================================================================
// Versione: 1.0.0 - SPRINT 2
// Descrizione: Integrazione real-time sync nel frontend

// Sistema di logging
const rtLog = (...args) => { if (!window.isProduction) console.log(...args); };
const rtDebug = (...args) => { if (!window.isProduction) console.debug(...args); };
const rtError = (...args) => { console.error(...args); };

// ================================================================
// REAL-TIME FRONTEND MANAGER
// ================================================================

window.RealTimeFrontend = {
  initialized: false,
  supabaseClient: null,
  realtimeChannel: null,
  backgroundSyncWorker: null,
  isConnected: false,
  
  // Inizializza sistema real-time
  async init() {
    if (this.initialized) return;
    
    rtLog('🔄 Inizializzazione Real-Time Frontend...');
    
    try {
      // Inizializza Supabase client per real-time
      await this.initSupabaseRealtime();
      
      // Inizializza background sync worker
      this.initBackgroundSync();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      rtLog('✅ Real-Time Frontend inizializzato');
      
    } catch (error) {
      rtError('❌ Errore inizializzazione Real-Time:', error);
      // Continua in modalità fallback
      this.enableFallbackMode();
    }
  },

  // Inizializza connessione Supabase Realtime
  async initSupabaseRealtime() {
    rtLog('🔄 Configurazione Supabase Realtime...');
    
    // Usa le stesse variabili ambiente dal backend
    const supabaseUrl = window.SUPABASE_URL;
    const supabaseAnonKey = window.SUPABASE_ANON_KEY;
    
    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY non configurata');
    }

    // Importa Supabase client
    const { createClient } = supabase;
    
    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    // Sottoscrivi al canale UCMe con autenticazione
    this.realtimeChannel = this.supabaseClient
      .channel('ucme_realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ucmes'
        },
        (payload) => this.handleRealtimeEvent(payload)
      )
      .subscribe((status) => {
        rtLog('🔄 Stato Realtime:', status);
        
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          rtLog('✅ Supabase Realtime connesso');
          this.showConnectionStatus(true);
        } else if (status === 'CHANNEL_ERROR') {
          this.isConnected = false;
          rtError('❌ Errore connessione Realtime');
          this.showConnectionStatus(false);
        }
      });
  },

  // Inizializza background sync worker
  initBackgroundSync() {
    this.backgroundSyncWorker = {
      syncQueue: [],
      isOnline: navigator.onLine,
      
      addToQueue: (operation) => {
        const queueItem = {
          id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          type: operation.type,
          data: operation.data,
          timestamp: Date.now(),
          retries: 0,
          status: 'pending'
        };
        
        this.backgroundSyncWorker.syncQueue.push(queueItem);
        this.saveSyncQueue();
        
        rtLog('📝 Operazione aggiunta alla coda:', queueItem.type);
        
        // Se online, sincronizza immediatamente
        if (this.backgroundSyncWorker.isOnline) {
          this.performBackgroundSync();
        }
        
        return queueItem.id;
      },
      
      forceSyncNow: () => {
        if (this.backgroundSyncWorker.isOnline) {
          this.performBackgroundSync();
          return true;
        }
        return false;
      }
    };
    
    // Carica coda esistente
    this.loadSyncQueue();
    
    // Setup listener online/offline
    window.addEventListener('online', () => {
      rtLog('🟢 Connessione ripristinata');
      this.backgroundSyncWorker.isOnline = true;
      this.performBackgroundSync();
      this.showConnectionStatus(true);
    });
    
    window.addEventListener('offline', () => {
      rtLog('🔴 Connessione persa');
      this.backgroundSyncWorker.isOnline = false;
      this.showConnectionStatus(false);
    });
  },

  // Gestisce eventi real-time
  handleRealtimeEvent(payload) {
    try {
      rtLog('🔄 Evento Real-time ricevuto:', payload.eventType, payload.new?.id);
      
      const userId = this.getCurrentUserId();
      const ucme = payload.new || payload.old;
      
      // Filtra solo UCMe dell'utente corrente
      if (ucme.user_id !== userId) {
        return;
      }
      
      switch (payload.eventType) {
        case 'INSERT':
          this.handleUCMeCreated(ucme);
          break;
        case 'UPDATE':
          this.handleUCMeUpdated(ucme);
          break;
        case 'DELETE':
          this.handleUCMeDeleted(ucme);
          break;
      }
      
      // Aggiorna UI con animazione
      this.updateUIWithAnimation();
      
    } catch (error) {
      rtError('❌ Errore gestione evento real-time:', error);
    }
  },

  // Gestisce creazione UCMe
  handleUCMeCreated(ucme) {
    rtLog('✅ UCMe creata:', ucme.id);
    
    // Aggiorna localStorage
    const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
    
    // Controlla se esiste già (per evitare duplicati)
    if (!localUCMes.find(u => u.id === ucme.id)) {
      localUCMes.push(ucme);
      localStorage.setItem('mc-ucmes', JSON.stringify(localUCMes));
    }
    
    // Mostra notifica
    this.showRealTimeNotification('Nuovo pensiero sincronizzato', 'success');
  },

  // Gestisce aggiornamento UCMe
  handleUCMeUpdated(ucme) {
    rtLog('🔄 UCMe aggiornata:', ucme.id);
    
    // Controlla conflitti
    const localUCMe = this.getLocalUCMe(ucme.id);
    if (localUCMe && this.isConflict(localUCMe, ucme)) {
      this.resolveConflict(localUCMe, ucme);
      return;
    }
    
    // Aggiorna localStorage
    const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
    const index = localUCMes.findIndex(u => u.id === ucme.id);
    
    if (index > -1) {
      localUCMes[index] = ucme;
      localStorage.setItem('mc-ucmes', JSON.stringify(localUCMes));
    }
    
    // Mostra notifica solo se è una modifica significativa
    if (localUCMe && localUCMe.content !== ucme.content) {
      this.showRealTimeNotification('Pensiero aggiornato', 'info');
    }
  },

  // Gestisce eliminazione UCMe
  handleUCMeDeleted(ucme) {
    rtLog('🗑️ UCMe eliminata:', ucme.id);
    
    // Rimuovi da localStorage
    const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
    const filtered = localUCMes.filter(u => u.id !== ucme.id);
    localStorage.setItem('mc-ucmes', JSON.stringify(filtered));
    
    this.showRealTimeNotification('Pensiero eliminato', 'warning');
  },

  // Rileva conflitti
  isConflict(localUCMe, remoteUCMe) {
    const localTime = new Date(localUCMe.updated_at).getTime();
    const remoteTime = new Date(remoteUCMe.updated_at).getTime();
    
    // Conflitto se versione locale è più recente ma diversa
    return localTime > remoteTime && localUCMe.content !== remoteUCMe.content;
  },

  // Risolve conflitti con "last write wins"
  resolveConflict(localUCMe, remoteUCMe) {
    rtLog('⚠️ Conflitto detectato per UCMe:', localUCMe.id);
    
    const localTime = new Date(localUCMe.updated_at).getTime();
    const remoteTime = new Date(remoteUCMe.updated_at).getTime();
    
    if (localTime > remoteTime) {
      rtLog('🔄 Conflitto risolto: versione locale vince');
      // Forza sync della versione locale
      this.backgroundSyncWorker.addToQueue({
        type: 'update',
        data: localUCMe
      });
      
      this.showRealTimeNotification('Conflitto risolto - la tua versione è stata mantenuta', 'success');
    } else {
      rtLog('🔄 Conflitto risolto: versione remota vince');
      // Accetta versione remota
      const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
      const index = localUCMes.findIndex(u => u.id === remoteUCMe.id);
      
      if (index > -1) {
        localUCMes[index] = remoteUCMe;
        localStorage.setItem('mc-ucmes', JSON.stringify(localUCMes));
      }
      
      this.showRealTimeNotification('Conflitto risolto - versione remota applicata', 'info');
    }
    
    // Log conflitto per audit
    this.logConflict(localUCMe, remoteUCMe, localTime > remoteTime ? 'local' : 'remote');
  },

  // Esegue sync background
  async performBackgroundSync() {
    if (!this.backgroundSyncWorker.isOnline) return;
    
    const pendingOps = this.backgroundSyncWorker.syncQueue.filter(op => op.status === 'pending');
    if (pendingOps.length === 0) return;
    
    rtLog('🔄 Sincronizzazione background...', pendingOps.length, 'operazioni');
    
    for (let operation of pendingOps) {
      try {
        const result = await this.syncOperation(operation);
        
        if (result.success) {
          operation.status = 'completed';
          rtLog('✅ Operazione sincronizzata:', operation.id);
        } else {
          throw new Error(result.message);
        }
        
      } catch (error) {
        operation.retries++;
        if (operation.retries >= 3) {
          operation.status = 'failed';
          rtError('❌ Operazione fallita:', operation.id, error);
        }
      }
    }
    
    // Pulisci operazioni completate/fallite
    this.backgroundSyncWorker.syncQueue = this.backgroundSyncWorker.syncQueue.filter(
      op => op.status === 'pending'
    );
    
    this.saveSyncQueue();
  },

  // Sincronizza singola operazione
  async syncOperation(operation) {
    const token = localStorage.getItem('mental_commons_token');
    
    const response = await fetch('/api/ucme', {
      method: operation.type === 'create' ? 'POST' : 
              operation.type === 'update' ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(operation.data)
    });
    
    return await response.json();
  },

  // Setup event listeners
  setupEventListeners() {
    // Listener per visibilitychange - sync quando tab diventa attivo
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.backgroundSyncWorker.isOnline) {
        rtLog('🔄 Tab attivo - controllo sync');
        this.performBackgroundSync();
      }
    });
    
    // Intercepta invio form UCMe per aggiungere alla coda
    document.addEventListener('submit', (event) => {
      if (event.target.id === 'ucme-form') {
        this.interceptUCMeSubmission(event);
      }
    });
  },

  // Intercetta invio UCMe per gestione offline
  interceptUCMeSubmission(event) {
    if (!this.backgroundSyncWorker.isOnline) {
      event.preventDefault();
      
      // Salva in coda per sync successivo
      const formData = new FormData(event.target);
      const ucmeData = {
        content: formData.get('content'),
        title: formData.get('title'),
        localId: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      
      this.backgroundSyncWorker.addToQueue({
        type: 'create',
        data: ucmeData
      });
      
      // Salva temporaneamente in localStorage
      const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
      localUCMes.unshift({ ...ucmeData, id: ucmeData.localId, synced: false });
      localStorage.setItem('mc-ucmes', JSON.stringify(localUCMes));
      
      // Aggiorna UI
      this.updateUIWithAnimation();
      
      this.showRealTimeNotification('Pensiero salvato offline - sincronizzerà automaticamente', 'info');
    }
  },

  // Aggiorna UI con animazione
  updateUIWithAnimation() {
    if (window.DashboardModule && window.DashboardModule.initialized) {
      // Ricarica dashboard con animazione smooth
      const userId = this.getCurrentUserId();
      if (userId) {
        window.DashboardModule.loadUserData(userId);
      }
    }
  },

  // Mostra stato connessione
  showConnectionStatus(isOnline) {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) {
      // Crea indicator se non esiste
      const indicator = document.createElement('div');
      indicator.id = 'connection-status';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }
    
    const indicator = document.getElementById('connection-status');
    
    if (isOnline) {
      indicator.textContent = '🟢 Online';
      indicator.style.backgroundColor = '#4CAF50';
      indicator.style.color = 'white';
      
      // Hide after 3 seconds
      setTimeout(() => {
        indicator.style.opacity = '0';
      }, 3000);
    } else {
      indicator.textContent = '🔴 Offline';
      indicator.style.backgroundColor = '#f44336';
      indicator.style.color = 'white';
      indicator.style.opacity = '1';
    }
  },

  // Mostra notifiche real-time
  showRealTimeNotification(message, type) {
    // Usa sistema notifiche esistente o crea nuovo
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      rtLog(`📢 [${type}] ${message}`);
    }
  },

  // Helper methods
  getCurrentUserId() {
    return currentUser?.userId || currentUser?.id;
  },

  getLocalUCMe(ucmeId) {
    const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
    return localUCMes.find(u => u.id === ucmeId);
  },

  logConflict(localUCMe, remoteUCMe, winner) {
    const conflictLog = JSON.parse(localStorage.getItem('mc-conflict-log') || '[]');
    conflictLog.push({
      timestamp: new Date().toISOString(),
      ucmeId: localUCMe.id,
      winner,
      localTimestamp: localUCMe.updated_at,
      remoteTimestamp: remoteUCMe.updated_at
    });
    
    // Mantieni solo ultimi 50 conflitti
    if (conflictLog.length > 50) {
      conflictLog.splice(0, conflictLog.length - 50);
    }
    
    localStorage.setItem('mc-conflict-log', JSON.stringify(conflictLog));
  },

  loadSyncQueue() {
    try {
      const saved = localStorage.getItem('mc-sync-queue');
      if (saved) {
        this.backgroundSyncWorker.syncQueue = JSON.parse(saved);
        rtLog('📥 Caricata coda sync:', this.backgroundSyncWorker.syncQueue.length);
      }
    } catch (error) {
      rtError('❌ Errore caricamento coda:', error);
    }
  },

  saveSyncQueue() {
    try {
      localStorage.setItem('mc-sync-queue', JSON.stringify(this.backgroundSyncWorker.syncQueue));
    } catch (error) {
      rtError('❌ Errore salvataggio coda:', error);
    }
  },

  enableFallbackMode() {
    rtLog('🔄 Modalità fallback attivata');
    // Implementa polling fallback ogni 30 secondi
    setInterval(() => {
      if (this.backgroundSyncWorker.isOnline) {
        this.performBackgroundSync();
      }
    }, 30000);
  },

  // API pubbliche
  getStatus() {
    return {
      initialized: this.initialized,
      realtimeConnected: this.isConnected,
      isOnline: this.backgroundSyncWorker?.isOnline || false,
      queueLength: this.backgroundSyncWorker?.syncQueue?.length || 0
    };
  },

  // Cleanup
  destroy() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
    this.initialized = false;
    rtLog('🔄 Real-Time Frontend distrutto');
  }
};

rtLog('🔄 Real-Time Frontend module caricato'); 