// ================================================================
// Sistema di logging per ambiente produzione
import { log, debug, info, warn, error } from "../logger.js";
// MENTAL COMMONS - TOKEN VALIDATION API
// ================================================================
// Versione: 1.0.0
// Descrizione: Endpoint per validare JWT token

import { verifyJWT } from './supabase.js';

export default async function handler(req, res) {
  debug('🔐 ============================================');
  debug('🔐 MENTAL COMMONS - TOKEN VALIDATION API');
  debug('🔐 ============================================');
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    debug('🔐 Risposta CORS OPTIONS inviata');
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    debug('❌ Metodo non valido:', req.method);
    return res.status(405).json({
      success: false,
      message: 'Metodo non consentito. Utilizzare POST.'
    });
  }
  
  try {
    // Estrai token dall'header Authorization o dal body
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token && req.body.token) {
      token = req.body.token;
    }
    
    if (!token) {
      debug('❌ Token mancante');
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Token mancante'
      });
    }
    
    debug('🎫 Validando token...');
    
    // Verifica token con la funzione di supabase.js
    const decoded = verifyJWT(token);
    
    if (!decoded) {
      debug('❌ Token non valido o scaduto');
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'Token non valido o scaduto'
      });
    }
    
    debug('✅ Token valido per utente:', decoded.email);
    
    // Controlla se il token è vicino alla scadenza (meno di 7 giorni)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeToExpiry = decoded.exp - currentTime;
    const daysToExpiry = Math.floor(timeToExpiry / (24 * 60 * 60));
    const shouldRenew = daysToExpiry < 7;
    
    return res.status(200).json({
      success: true,
      valid: true,
      message: 'Token valido',
      data: {
        userId: decoded.userId,
        email: decoded.email,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        daysToExpiry,
        shouldRenew
      }
    });
    
  } catch (error) {
    error('❌ Errore validazione token:', error);
    
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Errore interno del server',
      debug: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
} 