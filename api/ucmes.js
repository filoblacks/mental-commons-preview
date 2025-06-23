// ================================================================
// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");
// MENTAL COMMONS - API UCMES (CARICAMENTO)
// ================================================================
// Endpoint per recuperare UCMe salvate nel database Supabase

import { 
  verifyJWT, 
  getUserUCMes, 
  testDatabaseConnection
} from './supabase.js';

// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require('../logger.js');

// ================================================================
// MENTAL COMMONS - API UCMES
// ================================================================
// Endpoint per il caricamento delle UCMe dell'utente dal backend

import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Configurazione Supabase mancante per API UCMe');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    console.log('📡 [API UCMe] Richiesta ricevuta:', {
        method: req.method,
        headers: req.headers,
        userAgent: req.headers['user-agent']
    });

    // Gestisce solo richieste GET
    if (req.method !== 'GET') {
        console.log('❌ [API UCMe] Metodo non supportato:', req.method);
        return res.status(405).json({
            success: false,
            error: 'method_not_allowed',
            message: 'Solo richieste GET sono supportate'
        });
    }

    try {
        // Estrai email utente dagli headers
        const userEmail = req.headers['x-user-email'];
        const authHeader = req.headers.authorization;

        if (!userEmail) {
            console.log('⚠️ [API UCMe] Email utente mancante negli headers');
            return res.status(400).json({
                success: false,
                error: 'missing_user_email',
                message: 'Email utente richiesta negli headers'
            });
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('⚠️ [API UCMe] Token di autorizzazione mancante');
            return res.status(401).json({
                success: false,
                error: 'missing_auth_token',
                message: 'Token di autorizzazione richiesto'
            });
        }

        console.log('🔍 [API UCMe] Ricerca UCMe per utente:', userEmail);

        // Carica UCMe reali dal database Supabase
        const { data: ucmes, error: dbError } = await supabase
            .from('ucmes')
            .select('*')
            .eq('email', userEmail)
            .order('created_at', { ascending: false });

        if (dbError) {
            console.error('❌ [API UCMe] Errore database:', dbError);
            return res.status(500).json({
                success: false,
                error: 'database_error',
                message: 'Errore nel caricamento UCMe dal database'
            });
        }

        console.log('✅ [API UCMe] UCMe caricate dal database:', ucmes?.length || 0);

        return res.status(200).json({
            success: true,
            data: ucmes || [],
            message: `Trovate ${ucmes?.length || 0} UCMe per l'utente`,
            meta: {
                userEmail,
                count: ucmes?.length || 0,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ [API UCMe] Errore interno:', error);
        
        return res.status(500).json({
            success: false,
            error: 'internal_server_error',
            message: 'Errore interno del server',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
} 