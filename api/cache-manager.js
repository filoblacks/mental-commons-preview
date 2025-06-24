// Mental Commons - Cache Manager 3.0
// Sistema di caching avanzato per API performance

const { log, debug, error } = require('../logger.js');

// ================================================================
// CACHE MANAGER OTTIMIZZATO
// ================================================================

class CacheManager {
    constructor() {
        // In-memory cache con TTL e LRU eviction
        this.cache = new Map();
        this.accessTimes = new Map();
        this.ttls = new Map();
        
        // Configurazione
        this.maxSize = 10000; // Numero massimo di entry
        this.defaultTTL = 300000; // 5 minuti default
        this.cleanupInterval = 60000; // Cleanup ogni minuto
        
        // Statistiche
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            cleanups: 0
        };
        
        // Avvia cleanup automatico
        this.startCleanupTimer();
        
        debug('💾 CacheManager inizializzato');
    }

    // ================================================================
    // CORE CACHE OPERATIONS
    // ================================================================

    set(key, value, ttl = null) {
        const expiresAt = Date.now() + (ttl || this.defaultTTL);
        
        // LRU eviction se necessario
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        
        this.cache.set(key, value);
        this.ttls.set(key, expiresAt);
        this.accessTimes.set(key, Date.now());
        
        this.stats.sets++;
        debug(`💾 Cache SET: ${key} (TTL: ${ttl || this.defaultTTL}ms)`);
        
        return true;
    }

    get(key) {
        // Verifica esistenza
        if (!this.cache.has(key)) {
            this.stats.misses++;
            debug(`❌ Cache MISS: ${key}`);
            return null;
        }
        
        // Verifica TTL
        const expiresAt = this.ttls.get(key);
        if (Date.now() > expiresAt) {
            this.delete(key);
            this.stats.misses++;
            debug(`⏰ Cache EXPIRED: ${key}`);
            return null;
        }
        
        // Aggiorna access time per LRU
        this.accessTimes.set(key, Date.now());
        this.stats.hits++;
        
        const value = this.cache.get(key);
        debug(`✅ Cache HIT: ${key}`);
        return value;
    }

    delete(key) {
        const deleted = this.cache.delete(key);
        this.ttls.delete(key);
        this.accessTimes.delete(key);
        
        if (deleted) {
            debug(`🗑️ Cache DELETE: ${key}`);
        }
        
        return deleted;
    }

    has(key) {
        if (!this.cache.has(key)) return false;
        
        // Verifica TTL
        const expiresAt = this.ttls.get(key);
        if (Date.now() > expiresAt) {
            this.delete(key);
            return false;
        }
        
        return true;
    }

    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.ttls.clear();
        this.accessTimes.clear();
        
        debug(`🧹 Cache CLEARED: ${size} entries removed`);
        return size;
    }

    // ================================================================
    // LRU EVICTION
    // ================================================================

    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, accessTime] of this.accessTimes) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
            debug(`⚡ Cache LRU EVICTION: ${oldestKey}`);
        }
    }

    // ================================================================
    // CLEANUP E MAINTENANCE
    // ================================================================

    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, expiresAt] of this.ttls) {
            if (now > expiresAt) {
                this.delete(key);
                cleaned++;
            }
        }
        
        this.stats.cleanups++;
        
        if (cleaned > 0) {
            debug(`🧹 Cache CLEANUP: ${cleaned} expired entries removed`);
        }
        
        return cleaned;
    }

    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
        
        debug('⏰ Cache cleanup timer started');
    }

    // ================================================================
    // CACHE PATTERNS
    // ================================================================

    async getOrSet(key, fetchFunction, ttl = null) {
        // Try cache first
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        
        // Cache miss - fetch data
        try {
            debug(`🔄 Cache FETCH: ${key}`);
            const data = await fetchFunction();
            
            if (data !== null && data !== undefined) {
                this.set(key, data, ttl);
            }
            
            return data;
        } catch (err) {
            error(`❌ Cache FETCH error for ${key}:`, err);
            throw err;
        }
    }

    // Wrapper per cache invalidation patterns
    invalidatePattern(pattern) {
        let invalidated = 0;
        const regex = new RegExp(pattern);
        
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.delete(key);
                invalidated++;
            }
        }
        
        debug(`🔄 Cache INVALIDATE pattern "${pattern}": ${invalidated} entries`);
        return invalidated;
    }

    // ================================================================
    // STATISTICHE E MONITORING
    // ================================================================

    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            size: this.cache.size,
            maxSize: this.maxSize,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    estimateMemoryUsage() {
        // Stima approssimativa dell'uso memoria
        let bytes = 0;
        
        for (const [key, value] of this.cache) {
            bytes += key.length * 2; // UTF-16
            bytes += JSON.stringify(value).length * 2;
        }
        
        return {
            bytes,
            kb: (bytes / 1024).toFixed(2),
            mb: (bytes / 1024 / 1024).toFixed(2)
        };
    }

    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            cleanups: 0
        };
        
        debug('📊 Cache stats reset');
    }
}

// ================================================================
// CACHE STRATEGIES
// ================================================================

class CacheStrategies {
    constructor(cacheManager) {
        this.cache = cacheManager;
    }

    // Strategy: Cache con refresh preventivo
    async refreshAhead(key, fetchFunction, ttl = 300000, refreshThreshold = 0.8) {
        const cached = this.cache.get(key);
        
        if (cached) {
            // Check se siamo vicini alla scadenza
            const expiresAt = this.cache.ttls.get(key);
            const timeLeft = expiresAt - Date.now();
            const refreshTime = ttl * refreshThreshold;
            
            if (timeLeft < refreshTime) {
                // Refresh asincrono in background
                setImmediate(async () => {
                    try {
                        const freshData = await fetchFunction();
                        this.cache.set(key, freshData, ttl);
                        debug(`🔄 Cache REFRESH AHEAD: ${key}`);
                    } catch (err) {
                        error(`❌ Cache refresh ahead error for ${key}:`, err);
                    }
                });
            }
            
            return cached;
        }
        
        // Cache miss - fetch normally
        return await this.cache.getOrSet(key, fetchFunction, ttl);
    }

    // Strategy: Cache con circuit breaker
    async withCircuitBreaker(key, fetchFunction, ttl = 300000, errorThreshold = 5) {
        const errorKey = `${key}:errors`;
        const errorCount = this.cache.get(errorKey) || 0;
        
        // Se troppi errori, usa cached data anche se scaduto
        if (errorCount >= errorThreshold) {
            const staleData = this.cache.cache.get(key); // Bypass TTL check
            if (staleData) {
                debug(`⚡ Cache CIRCUIT BREAKER: ${key} (using stale data)`);
                return staleData;
            }
        }
        
        try {
            const data = await this.cache.getOrSet(key, fetchFunction, ttl);
            
            // Reset error count on success
            if (errorCount > 0) {
                this.cache.delete(errorKey);
            }
            
            return data;
        } catch (err) {
            // Increment error count
            this.cache.set(errorKey, errorCount + 1, 60000); // 1 minute TTL for errors
            throw err;
        }
    }

    // Strategy: Cache con write-through
    async writeThrough(key, data, persistFunction, ttl = 300000) {
        try {
            // Scrivi prima nel data store
            await persistFunction(data);
            
            // Poi aggiorna cache
            this.cache.set(key, data, ttl);
            
            debug(`💾 Cache WRITE-THROUGH: ${key}`);
            return data;
        } catch (err) {
            error(`❌ Cache write-through error for ${key}:`, err);
            throw err;
        }
    }
}

// ================================================================
// CACHE PRESETS PER MENTAL COMMONS
// ================================================================

class MentalCommonsCache {
    constructor() {
        this.cache = new CacheManager();
        this.strategies = new CacheStrategies(this.cache);
    }

    // Cache per statistiche platform (refresh preventivo)
    async getStats(fetchFunction) {
        return await this.strategies.refreshAhead(
            'platform:stats',
            fetchFunction,
            60000, // 1 minuto TTL
            0.7    // Refresh al 70% della scadenza
        );
    }

    // Cache per dati utente (più lunga)
    async getUserData(userId, fetchFunction) {
        return await this.cache.getOrSet(
            `user:${userId}`,
            fetchFunction,
            300000 // 5 minuti TTL
        );
    }

    // Cache per UCMes con circuit breaker
    async getUCMes(userId, fetchFunction) {
        return await this.strategies.withCircuitBreaker(
            `ucmes:${userId}`,
            fetchFunction,
            180000, // 3 minuti TTL
            3       // Max 3 errori
        );
    }

    // Cache per sessioni (breve TTL)
    async getSession(token, fetchFunction) {
        return await this.cache.getOrSet(
            `session:${token}`,
            fetchFunction,
            900000 // 15 minuti TTL
        );
    }

    // Invalidazione quando utente fa azioni
    invalidateUserCache(userId) {
        this.cache.invalidatePattern(`user:${userId}`);
        this.cache.invalidatePattern(`ucmes:${userId}`);
        this.cache.delete('platform:stats');
        
        debug(`🔄 Invalidated cache for user: ${userId}`);
    }

    // Invalidazione globale per nuove UCMes
    invalidateStatsCache() {
        this.cache.delete('platform:stats');
        debug('🔄 Platform stats cache invalidated');
    }

    getStats() {
        return this.cache.getStats();
    }
}

// Singleton instance
const mentalCommonsCache = new MentalCommonsCache();

// ================================================================
// EXPORTS
// ================================================================

module.exports = {
    CacheManager,
    CacheStrategies,
    MentalCommonsCache,
    mentalCommonsCache,
    
    // Middleware per Express
    cacheMiddleware: (ttl = 300000) => {
        return (req, res, next) => {
            const key = `${req.method}:${req.originalUrl}`;
            
            // Solo GET requests
            if (req.method !== 'GET') {
                return next();
            }
            
            const cached = mentalCommonsCache.cache.get(key);
            if (cached) {
                debug(`🚀 API Cache HIT: ${key}`);
                return res.json(cached);
            }
            
            // Override res.json per cachare la response
            const originalJson = res.json;
            res.json = function(data) {
                if (res.statusCode === 200 && data) {
                    mentalCommonsCache.cache.set(key, data, ttl);
                    debug(`💾 API Cache SET: ${key}`);
                }
                return originalJson.call(this, data);
            };
            
            next();
        };
    }
};

debug('💾 Cache Manager module loaded'); 