import { getUCMEs, getUsers } from '../core/api.js';
import { getToken, getCurrentUser } from '../core/auth.js';
import { log } from '../core/logger.js';

const containerId = 'ucme-blocks';

export async function initDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const token = getToken();

    // Recupero parallelo UCMe + utenti per ottimizzare il tempo totale
    const [ucmesRes, usersRes] = await Promise.all([
      getUCMEs(token),
      // La dashboard è accessibile solo agli utenti loggati; tuttavia non tutti
      // possono leggere la lista completa utenti. Se la richiesta fallisce la
      // intercettiamo e usiamo un array vuoto come fallback.
      getUsers(token).catch((err) => {
        log('Errore recupero utenti:', err.message);
        return { data: [] };
      }),
    ]);

    const ucmes = ucmesRes?.data ?? [];
    // L'endpoint /api/users ritorna { success, data: { users: [], count } }
    // per compatibilità gestiamo varianti diverse.
    const usersRaw = usersRes?.data;
    const users = Array.isArray(usersRaw?.users)
      ? usersRaw.users
      : Array.isArray(usersRaw)
        ? usersRaw
        : [];

    renderUcmes(container, ucmes);
    updateStickyHeader(ucmes, users);
  } catch (err) {
    log('Errore caricamento UCMe:', err.message);
    container.innerHTML = '<p>Impossibile caricare i tuoi pensieri.</p>';
  } finally {
    removeLoadingMessage();
  }
}

function renderUcmes(container, ucmes = []) {
  container.innerHTML = '';
  if (ucmes.length === 0) {
    container.innerHTML = '<p>Non hai ancora condiviso pensieri.</p>';
    return;
  }

  ucmes.forEach((ucme) => {
    const div = document.createElement('div');
    div.className = 'ucme-block';
    div.innerHTML = `
      <p>${ucme.content}</p>
      <small>${new Date(ucme.created_at).toLocaleDateString('it-IT')}</small>
    `;
    container.appendChild(div);
  });

  removeLoadingMessage();
}

function removeLoadingMessage() {
  const loadingEl =
    document.getElementById('loading-message') ||
    document.querySelector('#user-verification');
  if (loadingEl) {
    loadingEl.remove();
    console.log('[✅] UCMe caricate, messaggio di caricamento rimosso');
  }
}

// ================================================================
// STICKY HEADER LOGIC --------------------------------------------
// ================================================================

function updateStickyHeader(ucmes = [], users = []) {
  const ucmeCount = ucmes.length;
  const repliesCount = calculateReplies(ucmes);
  const portatoriCount = calculateActivePortatori(users);

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = typeof value === 'number' && value >= 0 ? value : '0';
  };

  // Aggiorna tutti i possibili ID usati nel markup
  setText('#ucme-count', ucmeCount);
  setText('#risposte-count', repliesCount);
  setText('#replies-count', repliesCount); // Supporto per ID alternativo
  setText('#portatori-count', portatoriCount);

  console.log(`[Sticky Stats] UCMe: ${ucmeCount}, Risposte: ${repliesCount}, Portatori: ${portatoriCount}`);
}

function calculateReplies(ucmes = []) {
  return ucmes.reduce((total, u) => {
    if (Array.isArray(u.replies)) return total + u.replies.length;
    if (Array.isArray(u.risposte)) return total + u.risposte.length;
    if (Array.isArray(u.answers)) return total + u.answers.length;

    // Campi contatori numerici
    if (typeof u.replies_count === 'number') return total + u.replies_count;
    if (typeof u.risposte_count === 'number') return total + u.risposte_count;
    if (typeof u.answers_count === 'number') return total + u.answers_count;

    return total;
  }, 0);
}

function calculateActivePortatori(users = []) {
  return users.filter((u) => {
    const role = (u.role || '').toLowerCase();
    const isPortatore = role.includes('portator'); // gestisce 'portatore', 'portatori'
    const isActive = u.is_active !== false; // campi non definiti considerati attivi
    return isPortatore && isActive;
  }).length;
} 