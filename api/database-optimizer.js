// Mental Commons - Database Optimizer 3.0
// Connection pooling, indici e query ottimizzate

const { createClient } = require('@supabase/supabase-js');
const { log, debug, error } = require('../logger.js');

// ================================================================
// CONNECTION POOLING OTTIMIZZATO
// ================================================================

class DatabasePool {
    constructor() {
        this.pools = new Map();
        this.maxConnections = 10;
        this.connectionTimeout = 30000; // 30 secondi
        this.idleTimeout = 300000; // 5 minuti
        this.initialized = false;
    }

    getClient(usage = 'default') {
        if (!this.pools.has(usage)) {
            this.pools.set(usage, this.createPool(usage));
        }
        return this.pools.get(usage);
    }

    createPool(usage) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

        const config = {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            global: {
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                }
            }
        };

        // Configurazioni specifiche per usage
        switch (usage) {
            case 'read':
                config.db = { schema: 'public' };
                break;
            case 'write':
                config.timeout = this.connectionTimeout;
                break;
            case 'analytics':
                config.timeout = 60000; // Query analytics più lunghe
                break;
        }

        const client = createClient(supabaseUrl, supabaseServiceKey, config);
        
        debug(`🔗 Database pool creato per: ${usage}`);
        return client;
    }

    async testConnection() {
        try {
            const client = this.getClient('read');
            const { data, error: testError } = await client
                .from('users')
                .select('count(*)')
                .limit(1);

            if (testError) throw testError;
            
            debug('✅ Database connection pool test OK');
            return true;
        } catch (err) {
            error('❌ Database connection pool test failed:', err);
            return false;
        }
    }
}

// Singleton instance
const dbPool = new DatabasePool();

// ================================================================
// QUERY OTTIMIZZATE
// ================================================================

class OptimizedQueries {
    
    // Query con JOIN ottimizzato - risolve N+1
    async getUserWithUCMes(userId) {
        try {
            debug('📊 Query ottimizzata: getUserWithUCMes');
            
            const client = dbPool.getClient('read');
            
            // Single query con JOIN invece di N+1 queries
            const { data, error: queryError } = await client
                .from('users')
                .select(`
                    id,
                    email,
                    name,
                    surname,
                    role,
                    created_at,
                    last_login,
                    ucmes (
                        id,
                        content,
                        tone,
                        created_at,
                        anonymous,
                        responses (
                            id,
                            content,
                            created_at
                        )
                    )
                `)
                .eq('id', userId)
                .single();

            if (queryError) throw queryError;
            
            debug('✅ Query ottimizzata completata');
            return { success: true, data };

        } catch (err) {
            error('❌ Errore query ottimizzata getUserWithUCMes:', err);
            return { success: false, error: err.message };
        }
    }

    // Query aggregata per statistiche - ottimizzata
    async getStats() {
        try {
            debug('📊 Query ottimizzata: getStats');
            
            const client = dbPool.getClient('analytics');
            
            // Query aggregata singola invece di multiple queries
            const { data, error: queryError } = await client.rpc('get_platform_stats');

            if (queryError) throw queryError;
            
            debug('✅ Query statistiche ottimizzata completata');
            return { success: true, data };

        } catch (err) {
            error('❌ Errore query statistiche:', err);
            return { success: false, error: err.message };
        }
    }

    // Query paginata ottimizzata
    async getUCMesPaginated(page = 1, limit = 10, filters = {}) {
        try {
            debug(`📊 Query paginata: page ${page}, limit ${limit}`);
            
            const client = dbPool.getClient('read');
            const offset = (page - 1) * limit;
            
            let query = client
                .from('ucmes')
                .select(`
                    id,
                    content,
                    tone,
                    created_at,
                    users!inner (
                        id,
                        name,
                        email
                    ),
                    responses (
                        id,
                        content,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            // Applicare filtri se presenti
            if (filters.tone) {
                query = query.eq('tone', filters.tone);
            }
            
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            const { data, error: queryError, count } = await query;

            if (queryError) throw queryError;
            
            debug('✅ Query paginata completata');
            return { 
                success: true, 
                data,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };

        } catch (err) {
            error('❌ Errore query paginata:', err);
            return { success: false, error: err.message };
        }
    }

    // Batch insert ottimizzato
    async createMultipleUCMes(ucmesData) {
        try {
            debug(`📊 Batch insert: ${ucmesData.length} UCMes`);
            
            const client = dbPool.getClient('write');
            
            // Batch insert invece di multiple single inserts
            const { data, error: queryError } = await client
                .from('ucmes')
                .insert(ucmesData)
                .select();

            if (queryError) throw queryError;
            
            debug('✅ Batch insert completato');
            return { success: true, data };

        } catch (err) {
            error('❌ Errore batch insert:', err);
            return { success: false, error: err.message };
        }
    }
}

// ================================================================
// INDICI E OTTIMIZZAZIONI SCHEMA
// ================================================================

class DatabaseOptimizer {
    
    async createOptimizedIndexes() {
        try {
            debug('🔧 Creazione indici ottimizzati...');
            
            const client = dbPool.getClient('write');
            
            // Indici per performance query frequenti
            const indexes = [
                // Indice per ricerche per email (login frequenti)
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email)',
                
                // Indice composito per UCMes con utente e data
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucmes_user_created ON ucmes (user_id, created_at DESC)',
                
                // Indice per filtri per tono
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucmes_tone ON ucmes (tone)',
                
                // Indice per UCMes anonime
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucmes_anonymous ON ucmes (anonymous) WHERE anonymous = true',
                
                // Indice per risposte con UCMe
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_responses_ucme ON responses (ucme_id, created_at DESC)',
                
                // Indice per last_login (per statistiche utenti attivi)
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users (last_login DESC)',
                
                // Indice parziale per utenti attivi
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users (is_active, created_at) WHERE is_active = true'
            ];

            for (const indexSQL of indexes) {
                try {
                    await client.rpc('execute_sql', { sql: indexSQL });
                    debug(`✅ Indice creato: ${indexSQL.split(' ')[5]}`);
                } catch (err) {
                    // Ignora errori per indici già esistenti
                    if (!err.message.includes('already exists')) {
                        error(`❌ Errore creazione indice: ${err.message}`);
                    }
                }
            }
            
            debug('✅ Indici ottimizzati creati');
            return { success: true };

        } catch (err) {
            error('❌ Errore creazione indici:', err);
            return { success: false, error: err.message };
        }
    }

    async analyzeTableStats() {
        try {
            debug('📊 Analisi statistiche tabelle...');
            
            const client = dbPool.getClient('analytics');
            
            // Analizza statistiche per l'ottimizzatore query
            const tables = ['users', 'ucmes', 'responses'];
            
            for (const table of tables) {
                await client.rpc('analyze_table', { table_name: table });
                debug(`✅ Statistiche aggiornate per: ${table}`);
            }
            
            debug('✅ Analisi statistiche completata');
            return { success: true };

        } catch (err) {
            error('❌ Errore analisi statistiche:', err);
            return { success: false, error: err.message };
        }
    }
}

// ================================================================
// CACHE LAYER
// ================================================================

class QueryCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 300000; // 5 minuti default
        this.maxSize = 1000;
    }

    set(key, value, customTTL = null) {
        const expiry = Date.now() + (customTTL || this.ttl);
        
        // Cleanup se cache troppo grande
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, { value, expiry });
        debug(`💾 Cache set: ${key}`);
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            debug(`🗑️ Cache expired: ${key}`);
            return null;
        }
        
        debug(`✅ Cache hit: ${key}`);
        return item.value;
    }

    clear() {
        this.cache.clear();
        debug('🧹 Cache cleared');
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl
        };
    }
}

// Istanze singleton
const optimizedQueries = new OptimizedQueries();
const dbOptimizer = new DatabaseOptimizer();
const queryCache = new QueryCache();

// ================================================================
// EXPORTS
// ================================================================

module.exports = {
    dbPool,
    optimizedQueries,
    dbOptimizer,
    queryCache,
    
    // Funzioni di utilità
    async initializeOptimizations() {
        debug('🚀 Inizializzazione ottimizzazioni database...');
        
        // Test connessione
        const connectionOK = await dbPool.testConnection();
        if (!connectionOK) {
            throw new Error('Database connection failed');
        }
        
        // Crea indici ottimizzati
        await dbOptimizer.createOptimizedIndexes();
        
        // Aggiorna statistiche
        await dbOptimizer.analyzeTableStats();
        
        debug('✅ Ottimizzazioni database inizializzate');
        return true;
    }
};

debug('🔧 Database Optimizer module loaded'); 