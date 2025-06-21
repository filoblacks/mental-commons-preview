// ================================================================
// Sistema di logging per ambiente produzione
const { log, debug, info, warn, error } = require("../logger.js");
// MENTAL COMMONS - API UTENTI
// ================================================================
// Endpoint per recuperare tutti gli utenti dal database e aggiornare profili

import { getAllUsers, updateUserProfile } from './supabase.js';

export default async function handler(req, res) {
  // Configurazione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Gestisci preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  debug('='.repeat(60));
  debug('🔍 RICHIESTA RECUPERO UTENTI');
  debug('Method:', req.method);
  debug('Time:', new Date().toISOString());
  debug('='.repeat(60));

  try {
    if (req.method === 'GET') {
      debug('📋 Recuperando tutti gli utenti...');
      
      // Recupera tutti gli utenti
      const users = await getAllUsers();
      
      debug('✅ Utenti recuperati con successo:', users.length);
      
      return res.status(200).json({
        success: true,
        message: `Recuperati ${users.length} utenti`,
        data: {
          users: users,
          count: users.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } else if (req.method === 'PUT') {
      debug('🔄 Aggiornamento profilo utente...');
      
      const { userId, name, surname } = req.body;
      
      // Validazione
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID utente richiesto per aggiornamento profilo'
        });
      }
      
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Il nome è richiesto'
        });
      }
      
      // Validazione surname opzionale
      if (surname && surname.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Il cognome deve essere massimo 100 caratteri'
        });
      }
      
      // Validazione formato surname
      if (surname && surname.trim() !== '') {
        const surnameRegex = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\s\-']+$/;
        if (!surnameRegex.test(surname.trim())) {
          return res.status(400).json({
            success: false,
            message: 'Il cognome può contenere solo lettere, spazi, apostrofi e trattini'
          });
        }
      }
      
      debug('📝 Aggiornando profilo:', { userId, name, surname: surname || 'NON SPECIFICATO' });
      
      // Aggiorna profilo utente
      const updatedUser = await updateUserProfile(userId, name, surname);
      
      debug('✅ Profilo aggiornato con successo');
      
      return res.status(200).json({
        success: true,
        message: 'Profilo utente aggiornato con successo',
        data: {
          user: updatedUser,
          timestamp: new Date().toISOString()
        }
      });
      
    } else {
      debug('❌ Metodo non supportato:', req.method);
      return res.status(405).json({
        success: false,
        message: 'Metodo non supportato. Usa GET per recuperare utenti o PUT per aggiornare profilo.'
      });
    }
    
  } catch (error) {
    error('❌ ERRORE RECUPERO UTENTI:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server',
      error: error.message
    });
  }
} 