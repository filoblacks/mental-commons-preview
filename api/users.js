// ================================================================
// MENTAL COMMONS - API UTENTI
// ================================================================
// Endpoint per recuperare tutti gli utenti dal database

import { getAllUsers } from './supabase.js';

export default async function handler(req, res) {
  // Configurazione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Gestisci preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('='.repeat(60));
  console.log('🔍 RICHIESTA RECUPERO UTENTI');
  console.log('Method:', req.method);
  console.log('Time:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    if (req.method === 'GET') {
      console.log('📋 Recuperando tutti gli utenti...');
      
      // Recupera tutti gli utenti
      const users = await getAllUsers();
      
      console.log('✅ Utenti recuperati con successo:', users.length);
      
      return res.status(200).json({
        success: true,
        message: `Recuperati ${users.length} utenti`,
        data: {
          users: users,
          count: users.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } else {
      console.log('❌ Metodo non supportato:', req.method);
      return res.status(405).json({
        success: false,
        message: 'Metodo non supportato. Usa GET.'
      });
    }
    
  } catch (error) {
    console.error('❌ ERRORE RECUPERO UTENTI:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
} 