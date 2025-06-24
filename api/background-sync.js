// ================================================================
// MENTAL COMMONS - BACKGROUND SYNC WORKER
// ================================================================
// Versione: 1.0.0 - SPRINT 2
// Descrizione: Worker per sincronizzazione background e gestione offline/online

const { debug, info, warn, error } = require('../logger.js');

// ================================================================
// BACKGROUND SYNC WORKER
// ================================================================

class BackgroundSyncWorker {
  constructor() {
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.maxRetries = 3;
    this.syncInterval = null;
    this.lastSyncTimestamp = null;
    
    debug('🔄 BackgroundSyncWorker inizializzato');
    this.setupEventListeners();
  }

  // Inizializza worker e event listeners
  initialize() {
    debug('🔄 Inizializzazione BackgroundSyncWorker...');
    
    // Carica coda persistente
    this.loadQueueFromStorage();
    
    // Avvia sync periodico se online
    if (this.isOnline) {
      this.startPeriodicSync();
    }
    
    // Esegui sync iniziale
    this.performSync();
    
    info('✅ BackgroundSyncWorker attivo');
  }

  // Setup event listeners per online/offline
  setupEventListeners() {
    // Listener per cambio stato connessione
    window.addEventListener('online', () => {
      debug('🟢 Connessione online ripristinata');
      this.isOnline = true;
      this.onConnectionRestored();
    });

    window.addEventListener('offline', () => {
      debug('🔴 Connessione offline');
      this.isOnline = false;
      this.onConnectionLost();
    });

    // Listener per beforeunload - salva coda
    window.addEventListener('beforeunload', () => {
      this.saveQueueToStorage();
    });

    // Listener per visibilitychange - sync quando tab diventa attivo
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        debug('🔄 Tab attivo - eseguendo sync');
        this.performSync();
      }
    });
  }

  // Aggiunge operazione alla coda
  addToQueue(operation) {
    const queueItem = {
      id: this.generateOperationId(),
      type: operation.type, // 'create', 'update', 'delete'
      data: operation.data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    this.syncQueue.push(queueItem);
    debug('📝 Operazione aggiunta alla coda:', queueItem.id, queueItem.type);
    
    // Salva immediatamente in localStorage
    this.saveQueueToStorage();
    
    // Se online, prova sync immediato
    if (this.isOnline && !this.syncInProgress) {
      this.performSync();
    }

    return queueItem.id;
  }

  // Esegue sync di tutte le operazioni in coda
  async performSync() {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    debug('🔄 Avvio sincronizzazione background...');

    const pendingOperations = this.syncQueue.filter(op => op.status === 'pending');
    
    for (let operation of pendingOperations) {
      try {
        await this.syncOperation(operation);
      } catch (err) {
        error('❌ Errore sync operazione:', operation.id, err);
      }
    }

    // Rimuovi operazioni completate
    this.cleanupCompletedOperations();
    
    this.lastSyncTimestamp = Date.now();
    this.syncInProgress = false;
    
    debug('✅ Sincronizzazione background completata');
  }

  // Sincronizza singola operazione
  async syncOperation(operation) {
    try {
      debug('🔄 Sync operazione:', operation.id, operation.type);

      let result = null;

      switch (operation.type) {
        case 'create':
          result = await this.syncCreateUCMe(operation.data);
          break;
        case 'update':
          result = await this.syncUpdateUCMe(operation.data);
          break;
        case 'delete':
          result = await this.syncDeleteUCMe(operation.data);
          break;
        default:
          throw new Error(`Tipo operazione non supportato: ${operation.type}`);
      }

      if (result && result.success) {
        operation.status = 'completed';
        operation.result = result;
        debug('✅ Operazione sincronizzata:', operation.id);
      } else {
        throw new Error(result?.message || 'Sync fallita');
      }

    } catch (err) {
      operation.retries++;
      
      if (operation.retries >= this.maxRetries) {
        operation.status = 'failed';
        error('❌ Operazione fallita definitivamente:', operation.id, err);
      } else {
        debug(`⚠️ Retry ${operation.retries}/${this.maxRetries} per operazione:`, operation.id);
      }
    }
  }

  // Sync creazione UCMe
  async syncCreateUCMe(data) {
    try {
      const response = await fetch('/api/ucme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mental_commons_token')}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        // Aggiorna localStorage con ID del server
        this.updateLocalUCMeWithServerId(data.localId, result.data.id);
      }

      return result;
    } catch (err) {
      throw new Error(`Errore sync create: ${err.message}`);
    }
  }

  // Sync aggiornamento UCMe
  async syncUpdateUCMe(data) {
    try {
      const response = await fetch('/api/ucme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mental_commons_token')}`
        },
        body: JSON.stringify(data)
      });

      return await response.json();
    } catch (err) {
      throw new Error(`Errore sync update: ${err.message}`);
    }
  }

  // Sync eliminazione UCMe
  async syncDeleteUCMe(data) {
    try {
      const response = await fetch('/api/ucme', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mental_commons_token')}`
        },
        body: JSON.stringify({ id: data.id })
      });

      return await response.json();
    } catch (err) {
      throw new Error(`Errore sync delete: ${err.message}`);
    }
  }

  // Gestisce ripristino connessione
  onConnectionRestored() {
    info('🔄 Connessione ripristinata - avvio sync automatico');
    
    // Avvia sync immediato
    this.performSync();
    
    // Riprendi sync periodico
    this.startPeriodicSync();
  }

  // Gestisce perdita connessione
  onConnectionLost() {
    warn('⚠️ Connessione persa - modalità offline attiva');
    
    // Ferma sync periodico
    this.stopPeriodicSync();
  }

  // Avvia sync periodico
  startPeriodicSync() {
    if (this.syncInterval) return;
    
    debug('🔄 Avvio sync periodico (ogni 60 secondi)');
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.performSync();
      }
    }, 60000); // Ogni 60 secondi
  }

  // Ferma sync periodico
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      debug('⏹️ Sync periodico fermato');
    }
  }

  // Carica coda da localStorage
  loadQueueFromStorage() {
    try {
      const savedQueue = localStorage.getItem('mc-sync-queue');
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue);
        debug('📥 Caricata coda sync:', this.syncQueue.length, 'operazioni');
      }
    } catch (err) {
      error('❌ Errore caricamento coda:', err);
      this.syncQueue = [];
    }
  }

  // Salva coda in localStorage
  saveQueueToStorage() {
    try {
      localStorage.setItem('mc-sync-queue', JSON.stringify(this.syncQueue));
      debug('💾 Coda sync salvata:', this.syncQueue.length, 'operazioni');
    } catch (err) {
      error('❌ Errore salvataggio coda:', err);
    }
  }

  // Pulisce operazioni completate
  cleanupCompletedOperations() {
    const before = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(op => 
      op.status !== 'completed' && op.status !== 'failed'
    );
    const after = this.syncQueue.length;
    
    if (before !== after) {
      debug('🧹 Pulite', before - after, 'operazioni completate/fallite');
      this.saveQueueToStorage();
    }
  }

  // Aggiorna UCMe locale con ID del server
  updateLocalUCMeWithServerId(localId, serverId) {
    try {
      const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
      const ucme = localUCMes.find(u => u.id === localId);
      
      if (ucme) {
        ucme.id = serverId;
        ucme.synced = true;
        localStorage.setItem('mc-ucmes', JSON.stringify(localUCMes));
        debug('🔄 UCMe locale aggiornata con ID server:', localId, '->', serverId);
      }
    } catch (err) {
      error('❌ Errore aggiornamento ID locale:', err);
    }
  }

  // Genera ID operazione unico
  generateOperationId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Forza sync immediato
  forceSyncNow() {
    debug('🔄 Sync forzato richiesto');
    
    if (!this.isOnline) {
      warn('⚠️ Sync forzato ignorato - offline');
      return false;
    }

    this.performSync();
    return true;
  }

  // Ottieni statistiche
  getStats() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
      lastSyncTimestamp: this.lastSyncTimestamp,
      pendingOperations: this.syncQueue.filter(op => op.status === 'pending').length,
      failedOperations: this.syncQueue.filter(op => op.status === 'failed').length
    };
  }

  // Pulisce tutta la coda (per debug)
  clearQueue() {
    this.syncQueue = [];
    this.saveQueueToStorage();
    debug('🧹 Coda sync svuotata');
  }

  // Cleanup risorse
  destroy() {
    this.stopPeriodicSync();
    this.saveQueueToStorage();
    
    window.removeEventListener('online', this.onConnectionRestored);
    window.removeEventListener('offline', this.onConnectionLost);
    window.removeEventListener('beforeunload', this.saveQueueToStorage);
    
    debug('🔄 BackgroundSyncWorker distrutto');
  }
}

// Esporta istanza singleton
const backgroundSyncWorker = new BackgroundSyncWorker();

module.exports = {
  BackgroundSyncWorker,
  backgroundSyncWorker
}; 