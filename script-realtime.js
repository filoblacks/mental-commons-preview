// ================================================================
// MENTAL COMMONS - REAL-TIME SYNC (v1.0.0)
// ================================================================
// Questo modulo opzionale si collega a Supabase Realtime e aggiorna
// in tempo reale alcuni contatori visibili nell'interfaccia (es.
// ucme-count, risposte-count, portatori-count). Se Supabase non è
// disponibile o le variabili ambiente non sono ancora presenti, il
// modulo fallirà in modo silenzioso.
// ================================================================

;(async () => {
  try {
    // Verifica presenza delle variabili di ambiente caricate da /api/env.js
    const supabaseUrl = window?.SUPABASE_URL;
    const supabaseAnonKey = window?.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Realtime] Variabili Supabase mancanti: sincronizzazione in tempo reale disabilitata.');
      return;
    }

    // Verifica che la libreria Supabase (@supabase/supabase-js) sia caricata
    const globalCreateClient = window?.supabase?.createClient || window?.Supabase?.createClient || window.createClient;

    if (typeof globalCreateClient !== 'function') {
      console.warn('[Realtime] Libreria Supabase non trovata: assicurati di includere https://unpkg.com/@supabase/supabase-js prima di questo file.');
      return;
    }

    // Crea/riutilizza client condiviso
    const supabase = window.supabase || globalCreateClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        // Evitiamo di ricevere i nostri stessi eventi
        broadcast: { self: false }
      }
    });

    // Mantieni riferimento globale per eventuali altri script
    window.supabase = supabase;

    // Handler comune per aggiornare i contatori -------------------
    function updateCounters(data = {}) {
      const { ucme_count, risposte_count, portatori_count } = data;

      if (typeof ucme_count !== 'undefined') {
        const el = document.querySelector('#ucme-count');
        if (el) el.textContent = ucme_count + 21;
      }

      if (typeof risposte_count !== 'undefined') {
        const el = document.querySelector('#risposte-count');
        if (el) el.textContent = risposte_count + 16;
        const elAlt = document.querySelector('#replies-count');
        if (elAlt) elAlt.textContent = risposte_count + 16;
      }

      if (typeof portatori_count !== 'undefined') {
        const el = document.querySelector('#portatori-count');
        if (el) el.textContent = portatori_count + 13;
      }
    }

    // Sottoscrizione a modifiche della tabella 'stats' -------------
    if (typeof supabase.channel === 'function') {
      // Supabase v2
      const channel = supabase.channel('mc_public_stats');

      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'stats'
        }, (payload) => {
          const data = payload?.new || {};
          updateCounters(data);
        })
        .subscribe((status, err) => {
          if (err) console.error('[Realtime] Errore sottoscrizione (v2):', err.message || err);
          else console.log('[Realtime] Stato canale (v2):', status);
        });
    } else if (typeof supabase.from === 'function') {
      // Supabase v1 fallback
      const realtimeChannel = supabase
        .from('stats')
        .on('*', (payload) => {
          const data = payload?.new || {};
          updateCounters(data);
        })
        .subscribe();
      console.log('[Realtime] Canale v1 inizializzato', realtimeChannel?.id || '');
    } else {
      console.warn('[Realtime] Client Supabase sconosciuto: nessun metodo channel/from disponibile.');
    }

  } catch (err) {
    console.error('[Realtime] Errore inizializzazione realtime:', err.message || err);
  }
})(); 