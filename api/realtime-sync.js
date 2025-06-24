// ================================================================
// MENTAL COMMONS - REAL-TIME SYNC MANAGER
// ================================================================
// Versione: 1.0.0 - SPRINT 2
// Descrizione: Sistema di sincronizzazione real-time per UCMe cross-device

const { createClient } = require('@supabase/supabase-js');
const { debug, info, warn, error } = require('../logger.js');

// ================================================================
// REAL-TIME SYNC MANAGER
// ================================================================

class RealTimeSyncManager {
  constructor() {
    this.supabaseClient = null;
    this.realtimeChannel = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.conflictQueue = [];
    this.retryAttempts = 0;
    this.maxRetries = 5;
    
    debug('🔄 RealTimeSyncManager inizializzato');
  }

  // Inizializza connessione Supabase Realtime
  async initialize() {
    try {
      debug('🔄 Inizializzazione Supabase Realtime...');
      
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Variabili ambiente Supabase per Realtime mancanti');
      }

      // Client per Realtime (usa anon key, non service key)
      this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      // Sottoscrivi al canale UCMe
      this.realtimeChannel = this.supabaseClient
        .channel('ucme_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'ucmes' },
          (payload) => this.handleRealtimeEvent(payload)
        )
        .subscribe((status) => {
          debug('🔄 Stato sottoscrizione Realtime:', status);
          
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.retryAttempts = 0;
            info('✅ Supabase Realtime connesso');
            this.notifySubscribers('connected', { timestamp: Date.now() });
          } else if (status === 'CHANNEL_ERROR') {
            this.isConnected = false;
            error('❌ Errore connessione Realtime');
            this.handleConnectionError();
          }
        });

      return true;
      
    } catch (err) {
      error('❌ Errore inizializzazione Realtime:', err);
      this.handleConnectionError();
      return false;
    }
  }

  // Gestisce eventi real-time da Supabase
  handleRealtimeEvent(payload) {
    try {
      debug('🔄 Evento Realtime ricevuto:', payload.eventType, payload.new?.id);

      const eventData = {
        eventType: payload.eventType, // INSERT, UPDATE, DELETE
        ucme: payload.new || payload.old,
        timestamp: Date.now(),
        conflictResolved: false
      };

      // Controlla se è un conflitto potenziale
      if (this.detectConflict(eventData)) {
        this.handleConflict(eventData);
      } else {
        // Notifica tutti i subscribers
        this.notifySubscribers('ucme_change', eventData);
      }

    } catch (err) {
      error('❌ Errore gestione evento Realtime:', err);
    }
  }

  // Detecta conflitti basati su timestamp
  detectConflict(eventData) {
    if (eventData.eventType !== 'UPDATE') return false;

    // Controlla se esiste una versione locale più recente
    const localTimestamp = this.getLocalUCMeTimestamp(eventData.ucme.id);
    const remoteTimestamp = new Date(eventData.ucme.updated_at).getTime();

    return localTimestamp && localTimestamp > remoteTimestamp;
  }

  // Gestisce conflitti con "last write wins"
  async handleConflict(eventData) {
    try {
      debug('⚠️ Conflitto detectato per UCMe:', eventData.ucme.id);

      const conflict = {
        id: eventData.ucme.id,
        localVersion: this.getLocalUCMe(eventData.ucme.id),
        remoteVersion: eventData.ucme,
        timestamp: Date.now(),
        resolved: false
      };

      this.conflictQueue.push(conflict);

      // Applica politica "last write wins"
      const resolution = await this.resolveConflict(conflict);
      
      // Notifica risoluzione conflitto
      this.notifySubscribers('conflict_resolved', {
        ...eventData,
        conflictResolved: true,
        resolution
      });

      // Log per audit
      this.logConflictResolution(conflict, resolution);

    } catch (err) {
      error('❌ Errore risoluzione conflitto:', err);
    }
  }

  // Risolve conflitto con "last write wins"
  async resolveConflict(conflict) {
    const localTime = new Date(conflict.localVersion.updated_at).getTime();
    const remoteTime = new Date(conflict.remoteVersion.updated_at).getTime();

    if (localTime > remoteTime) {
      debug('🔄 Conflitto risolto: versione locale vince');
      // La versione locale vince - forza sync al server
      await this.forceSyncToServer(conflict.localVersion);
      return { winner: 'local', timestamp: localTime };
    } else {
      debug('🔄 Conflitto risolto: versione remota vince');
      // La versione remota vince - aggiorna locale
      this.updateLocalStorage(conflict.remoteVersion);
      return { winner: 'remote', timestamp: remoteTime };
    }
  }

  // Aggiunge subscriber per eventi
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(callback);
    
    debug('📡 Subscriber aggiunto per:', eventType);
    return () => this.unsubscribe(eventType, callback);
  }

  // Rimuove subscriber
  unsubscribe(eventType, callback) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notifica tutti i subscribers
  notifySubscribers(eventType, data) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          error('❌ Errore callback subscriber:', err);
        }
      });
    }
  }

  // Gestisce errori di connessione con retry
  async handleConnectionError() {
    this.isConnected = false;
    
    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      const delay = Math.pow(2, this.retryAttempts) * 1000; // Exponential backoff
      
      warn(`⚠️ Tentativo riconnessione ${this.retryAttempts}/${this.maxRetries} in ${delay}ms`);
      
      setTimeout(() => {
        this.initialize();
      }, delay);
    } else {
      error('❌ Massimo numero di tentativi raggiunto - passaggio a fallback mode');
      this.enableFallbackMode();
    }
  }

  // Abilita modalità fallback con polling
  enableFallbackMode() {
    debug('🔄 Attivazione modalità fallback polling...');
    
    // Polling ogni 30 secondi per verificare cambiamenti
    this.fallbackInterval = setInterval(async () => {
      try {
        await this.checkForUpdates();
      } catch (err) {
        error('❌ Errore polling fallback:', err);
      }
    }, 30000);

    this.notifySubscribers('fallback_mode', { active: true });
  }

  // Controlla aggiornamenti in modalità polling
  async checkForUpdates() {
    // Implementazione polling per verificare UCMe aggiornate
    debug('🔄 Controllo aggiornamenti in modalità polling...');
    // TODO: Implementare logica di controllo timestamp
  }

  // Helper methods per gestione localStorage
  getLocalUCMeTimestamp(ucmeId) {
    const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
    const ucme = localUCMes.find(u => u.id === ucmeId);
    return ucme ? new Date(ucme.updated_at).getTime() : null;
  }

  getLocalUCMe(ucmeId) {
    const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
    return localUCMes.find(u => u.id === ucmeId);
  }

  updateLocalStorage(ucme) {
    const localUCMes = JSON.parse(localStorage.getItem('mc-ucmes') || '[]');
    const index = localUCMes.findIndex(u => u.id === ucme.id);
    
    if (index > -1) {
      localUCMes[index] = ucme;
    } else {
      localUCMes.push(ucme);
    }
    
    localStorage.setItem('mc-ucmes', JSON.stringify(localUCMes));
  }

  async forceSyncToServer(ucme) {
    // Forza sincronizzazione al server
    debug('🔄 Forzando sync al server per UCMe:', ucme.id);
    // TODO: Implementare sync forzata
  }

  // Log eventi conflitto per audit
  logConflictResolution(conflict, resolution) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ucmeId: conflict.id,
      conflictType: 'update_collision',
      resolution: resolution.winner,
      localTimestamp: conflict.localVersion.updated_at,
      remoteTimestamp: conflict.remoteVersion.updated_at
    };

    // Salva in localStorage per audit
    const conflictLog = JSON.parse(localStorage.getItem('mc-conflict-log') || '[]');
    conflictLog.push(logEntry);
    
    // Mantieni solo ultimi 100 conflitti
    if (conflictLog.length > 100) {
      conflictLog.splice(0, conflictLog.length - 100);
    }
    
    localStorage.setItem('mc-conflict-log', JSON.stringify(conflictLog));
    
    info('📝 Conflitto loggato:', logEntry);
  }

  // Cleanup risorse
  destroy() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
    
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
    }
    
    this.subscribers.clear();
    this.isConnected = false;
    
    debug('🔄 RealTimeSyncManager distrutto');
  }

  // Status pubblici
  getStatus() {
    return {
      connected: this.isConnected,
      retryAttempts: this.retryAttempts,
      subscribersCount: this.subscribers.size,
      conflictsInQueue: this.conflictQueue.length
    };
  }
}

// Esporta istanza singleton
const realTimeSyncManager = new RealTimeSyncManager();

module.exports = {
  RealTimeSyncManager,
  realTimeSyncManager
}; 