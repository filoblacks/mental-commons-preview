import { getUCMEs, getUsers } from '../core/api.js';
import { getToken, getCurrentUser } from '../core/auth.js';
import { log } from '../core/logger.js';
import { updateStickyHeader } from './stats.js';

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
    // Aggiorna header usando la funzione condivisa
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

// Rimosse funzioni duplicate: logica ora centralizzata in ui/stats.js 