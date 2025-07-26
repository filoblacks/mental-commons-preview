// ================================================================
// Script: Aggiunta Scuola Esempio (Versione Semplificata)
// ================================================================
// Questo script esegue la migrazione per aggiungere la "Scuola Esempio"
// nella tabella schools del database Supabase.
// ================================================================

const { createClient } = require('@supabase/supabase-js');

async function addScuolaEsempio() {
  try {
    console.log('🏫 ============================================');
    console.log('🏫 AGGIUNTA SCUOLA ESEMPIO');
    console.log('🏫 ============================================');
    
    // Verifica variabili ambiente
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ ERRORE: Variabili ambiente Supabase mancanti');
      console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Presente' : '❌ Mancante');
      console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Presente' : '❌ Mancante');
      process.exit(1);
    }
    
    console.log('🔗 Connessione al database...');
    
    // Crea client Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Esegui la migrazione
    console.log('⚡ Esecuzione migrazione...');
    
    // Inserimento della Scuola Esempio
    const { data: insertData, error: insertError } = await supabase
      .from('schools')
      .insert({
        name: 'Scuola Esempio',
        code: 'SCUOLA001',
        package_type: 'essenziale',
        is_active: true
      })
      .select()
      .single();
    
    if (insertError) {
      if (insertError.code === '23505') {
        console.log('ℹ️  La Scuola Esempio esiste già nel database');
      } else {
        throw insertError;
      }
    } else {
      console.log('✅ Scuola Esempio aggiunta con successo!');
      console.log('📊 Dati inseriti:', insertData);
    }
    
    // Verifica inserimento
    console.log('🔍 Verifica inserimento...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('schools')
      .select('name, code, package_type, is_active, created_at')
      .eq('code', 'SCUOLA001')
      .single();
    
    if (verifyError) {
      throw verifyError;
    }
    
    console.log('✅ Verifica completata:');
    console.log('   Nome Scuola:', verifyData.name);
    console.log('   Codice Riferimento:', verifyData.code);
    console.log('   Tipo Pacchetto:', verifyData.package_type);
    console.log('   Attiva:', verifyData.is_active ? 'Sì' : 'No');
    console.log('   Data Creazione:', new Date(verifyData.created_at).toLocaleString('it-IT'));
    
    console.log('');
    console.log('🎉 Migrazione completata con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    console.error('   Codice:', error.code);
    console.error('   Messaggio:', error.message);
    console.error('   Dettagli:', error.details);
    process.exit(1);
  }
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
  addScuolaEsempio();
}

module.exports = { addScuolaEsempio }; 