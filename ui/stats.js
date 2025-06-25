import { getUCMEs, getUsers } from '../core/api.js';
import { getToken } from '../core/auth.js';
import { log } from '../core/logger.js';

// Inizializza il caricamento delle statistiche sticky in tutte le pagine
export async function initStats() {
  // Impostiamo subito la baseline offset (0 + offset) per evitare flash
  updateStickyHeader([], []);

  const token = getToken();
  if (!token) {
    // Utente non autenticato: manteniamo i valori baseline
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

  // Offset costanti richiesti
  const OFFSET_UCME = 21;
  const OFFSET_RISPOSTE = 16;
  const OFFSET_PORTATORI = 13;

  setText('#ucme-count', ucmeCount + OFFSET_UCME);
  setText('#risposte-count', repliesCount + OFFSET_RISPOSTE);
  setText('#replies-count', repliesCount + OFFSET_RISPOSTE);
  setText('#portatori-count', portatoriCount + OFFSET_PORTATORI);

  // console.log(
  //   `[Sticky Stats] (con offset) UCMe: ${ucmeCount + OFFSET_UCME}, Risposte: ${repliesCount + OFFSET_RISPOSTE}, Portatori: ${portatoriCount + OFFSET_PORTATORI}`
  // );
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