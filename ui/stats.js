import { getUCMEs, getUsers } from '../core/api.js';
import { getToken } from '../core/auth.js';
import { log } from '../core/logger.js';

// Inizializza il caricamento delle statistiche sticky in tutte le pagine
export async function initStats() {
  const token = getToken();
  if (!token) {
    // L'utente non è autenticato → manteniamo il placeholder
    return;
  }

  try {
    // Recupero parallelo per ridurre la latenza
    const [ucmeRes, usersRes] = await Promise.all([
      getUCMEs(token),
      getUsers(token).catch((err) => {
        log('Errore recupero utenti:', err.message);
        return { data: [] };
      }),
    ]);

    const ucmes = ucmeRes?.data ?? [];

    // L'endpoint /api/users può restituire data.users o direttamente l'array
    const usersRaw = usersRes?.data;
    const users = Array.isArray(usersRaw?.users)
      ? usersRaw.users
      : Array.isArray(usersRaw)
        ? usersRaw
        : [];

    updateStickyHeader(ucmes, users);
  } catch (err) {
    log('Errore caricamento statistiche globali:', err.message);
  }
}

// ================================================================
// FUNZIONI DI AGGIORNAMENTO
// ================================================================

export function updateStickyHeader(ucmes = [], users = []) {
  const ucmeCount = ucmes.length;
  const repliesCount = calculateReplies(ucmes);
  const portatoriCount = calculateActivePortatori(users);

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = typeof value === 'number' && value >= 0 ? value : '0';
  };

  // Supportiamo sia id primari che alternativi (retro-compatibilità)
  setText('#ucme-count', ucmeCount);
  setText('#risposte-count', repliesCount);
  setText('#replies-count', repliesCount);
  setText('#portatori-count', portatoriCount);

  console.log(
    `[Sticky Stats] UCMe: ${ucmeCount}, Risposte: ${repliesCount}, Portatori: ${portatoriCount}`
  );
}

function calculateReplies(ucmes = []) {
  return ucmes.reduce((total, u) => {
    if (Array.isArray(u.replies)) return total + u.replies.length;
    if (Array.isArray(u.risposte)) return total + u.risposte.length;
    if (Array.isArray(u.answers)) return total + u.answers.length;

    // Campi numerici di conteggio
    if (typeof u.replies_count === 'number') return total + u.replies_count;
    if (typeof u.risposte_count === 'number') return total + u.risposte_count;
    if (typeof u.answers_count === 'number') return total + u.answers_count;

    return total;
  }, 0);
}

function calculateActivePortatori(users = []) {
  return users.filter((u) => {
    const role = (u.role || '').toLowerCase();
    const isPortatore = role.includes('portator'); // "portatore" / "portatori"
    const isActive = u.is_active !== false; // Considera attivo se non esplicitamente disattivo
    return isPortatore && isActive;
  }).length;
} 