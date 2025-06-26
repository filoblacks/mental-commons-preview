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

    // Aggiorna contatore sezione depositor
    updateDepositorCount(ucmes.length);

    renderUcmes(container, ucmes);
    // Aggiorna header usando la funzione condivisa
    updateStickyHeader(ucmes, users);
  } catch (err) {
    log('Errore caricamento UCMe:', err.message);
    container.innerHTML = '<p class="error-message">Impossibile caricare i tuoi pensieri.</p>';
  } finally {
    removeLoadingMessage();
  }
}

function updateDepositorCount(count) {
  const countEl = document.querySelector('#depositor-count .count-number');
  if (countEl) {
    countEl.textContent = count;
  }
}

function renderUcmes(container, ucmes = []) {
  container.innerHTML = '';
  
  if (ucmes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </div>
        <h3>Nessun pensiero condiviso</h3>
        <p>Non hai ancora affidato pensieri. Inizia condividendo il tuo primo pensiero.</p>
      </div>
    `;
    return;
  }

  ucmes.forEach((ucme, index) => {
    const div = document.createElement('div');
    const status = ucme.status || 'in attesa';
    div.className = `ucme-block ${status === 'risposto' ? 'risposto' : status === 'in attesa' ? 'in-attesa' : ''}`;
    div.style.animationDelay = `${index * 0.1}s`;

    // Data formattata per l'Italia
    const dateIT = new Date(ucme.created_at).toLocaleDateString('it-IT', {
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });

    // Badge status styling
    const statusClass = getStatusClass(status);
    const statusLabel = getStatusLabel(status);

    div.innerHTML = `
      <div class="ucme-header">
        <div class="ucme-meta">
          <span class="ucme-status-badge ${statusClass}">${statusLabel}</span>
          <small class="ucme-date">${dateIT}</small>
        </div>
      </div>
      <div class="ucme-content">
        <p class="ucme-text">${ucme.content}</p>
        ${ucme.response ? `
          <div class="ucme-response">
            <h4>Risposta del Portatore</h4>
            <div class="response-content">
              <p class="response-text">${ucme.response}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    container.appendChild(div);
  });

  removeLoadingMessage();
}

// Utility functions for status styling
function getStatusClass(status) {
  const statusMap = {
    'in attesa': 'status-pending',
    'assegnato': 'status-assigned',
    'in lavorazione': 'status-processing',
    'risposto': 'status-completed',
    'completato': 'status-completed'
  };
  return statusMap[status] || 'status-default';
}

function getStatusLabel(status) {
  const labelMap = {
    'in attesa': 'In attesa',
    'assegnato': 'Assegnato',
    'in lavorazione': 'In lavorazione', 
    'risposto': 'Risposto',
    'completato': 'Completato'
  };
  return labelMap[status] || status;
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