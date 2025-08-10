import { getUCMEs, getUsers, markRispostaAsRead, requestChat } from '../core/api.js';
import { getToken, getCurrentUser, refreshUserInfo } from '../core/auth.js';
import { log } from '../core/logger.js';
import { updateStickyHeader } from './stats.js';
import { t, currentLocale, formatDate } from '../core/i18n.js';

const containerId = 'ucme-blocks';
let allUCMEs = [];
let activeFilter = 'all';

export async function initDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  // Aggiorna le informazioni utente per avere has_subscription aggiornato
  const updatedUser = await refreshUserInfo();
  const currentUser = updatedUser || user;

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
    allUCMEs = ucmes;
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

    updateFilterCounts(allUCMEs);
    renderUcmes(container, filterByStatus(allUCMEs, activeFilter), currentUser);
    setupFilters(container, currentUser);
    // Aggiorna header usando la funzione condivisa
    updateStickyHeader(ucmes, users);
    // Inizializza listener dopo render
    setupMarkAsReadListeners(container);
    setupContinueChatListeners(container, currentUser);
  } catch (err) {
    log(t('errors.unexpected'), err.message);
    container.innerHTML = `<p class="error-message">${t('errors.unexpected')}</p>`;
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

function renderUcmes(container, ucmes = [], user = null) {
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
        <h3>${t('dashboard.depositor.reply.title')}</h3>
        <p>${t('chat.list.card.no_messages')}</p>
      </div>
    `;
    return;
  }

  // escaping semplice per difesa XSS lato client
  const escapeHtml = (str = '') => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  ucmes.forEach((ucme, index) => {
    const div = document.createElement('div');
    const status = ucme.status || 'in attesa';
    div.className = `ucme-block ${status === 'risposto' ? 'risposto' : status === 'in attesa' ? 'in-attesa' : ''}`;
    div.style.animationDelay = `${index * 0.1}s`;

    // Data formattata secondo la locale corrente
    const dateIT = formatDate(new Date(ucme.created_at), { day: '2-digit', month: 'short', year: 'numeric' });

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
        <p class="ucme-text">${escapeHtml(ucme.content)}</p>
        ${ucme.risposta ? `
          <div class="ucme-response ${ucme.risposta.letta ? 'response-read' : 'response-unread'}">
            <h4>${t('dashboard.depositor.reply.title')}</h4>
            <div class="response-content">
              <p class="response-text">${escapeHtml(ucme.risposta.contenuto)}</p>
              <small class="response-date">${formatDate(new Date(ucme.risposta.timestamp), { day: '2-digit', month: 'short', year: 'numeric' })}</small>
            </div>
            ${!ucme.risposta.letta ? `<button class="btn-mark-read" data-ucme-id="${ucme.id}">${t('dashboard.depositor.reply.mark_read')}</button>` : `<span class="read-label">${t('dashboard.depositor.reply.read_label')}</span>`}
          </div>
          
          <!-- Sezione Continua a parlarne -->
          ${ucme.chat && ucme.chat.status ? `<span class="chat-requested-label">${t('dashboard.depositor.chat_requested_label')}</span>` :
            (user && (user.has_subscription === true || user.has_subscription === "true") ?
              `<button class="btn-continue-chat" data-ucme-id="${ucme.id}">${t('dashboard.depositor.continue_chat')}</button>` :
              user ?
                `<div class="premium-prompt">
                  <p>${t('dashboard.depositor.premium_prompt')}</p>
                  <a href="/premium.html" class="btn-premium-upgrade">${t('dashboard.depositor.premium_cta')}</a>
                </div>` :
                `<div class="login-prompt">
                  <p>${t('dashboard.depositor.login_prompt')}</p>
                  <a href="/login.html" class="btn-login">${t('dashboard.depositor.login_cta')}</a>
                </div>`
            )}
        ` : ''}
      </div>
    `;
    
    container.appendChild(div);
  });

  removeLoadingMessage();
}

function setupFilters(container, user) {
  const filterBar = document.querySelector('.ucme-filters');
  if (!filterBar) return;
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.ucme-filter');
    if (!btn) return;
    document.querySelectorAll('.ucme-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.status || 'all';
    const list = document.getElementById(containerId);
    if (!list) return;
    renderUcmes(list, filterByStatus(allUCMEs, activeFilter), user);
  });
}

function filterByStatus(list = [], status = 'all') {
  if (!list.length || status === 'all') return list;
  // mappa alcune varianti di stato per robustezza
  const normalize = (s = '') => s.toLowerCase();
  const wanted = normalize(status);
  return list.filter((u) => normalize(u.status || '') === wanted);
}

function updateFilterCounts(list = []) {
  const counters = {
    all: list.length,
    'in attesa': 0,
    'assegnato': 0,
    'in lavorazione': 0,
    'risposto': 0,
    'completato': 0,
  };
  list.forEach((u) => {
    const s = (u.status || '').toLowerCase();
    if (counters[s] !== undefined) counters[s] += 1;
  });
  const byId = (id) => document.getElementById(id);
  byId('count-all') && (byId('count-all').textContent = counters.all);
  byId('count-in-attesa') && (byId('count-in-attesa').textContent = counters['in attesa']);
  byId('count-assegnato') && (byId('count-assegnato').textContent = counters['assegnato']);
  byId('count-in-lavorazione') && (byId('count-in-lavorazione').textContent = counters['in lavorazione']);
  byId('count-risposto') && (byId('count-risposto').textContent = counters['risposto']);
  byId('count-completato') && (byId('count-completato').textContent = counters['completato']);
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

// Listener per i bottoni "Segna come letta"
function setupMarkAsReadListeners(container) {
  const buttons = container.querySelectorAll('.btn-mark-read');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ucmeId = btn.getAttribute('data-ucme-id');
      if (!ucmeId) return;

      btn.disabled = true;
      try {
        await markRispostaAsRead(ucmeId, getToken());
        // Modifica UI in tempo reale
        btn.outerHTML = '<span class="read-label">Letta</span>';
        const parent = btn.closest('.ucme-response');
        if (parent) parent.classList.remove('response-unread');
        if (parent) parent.classList.add('response-read');
      } catch (err) {
        log('Errore segna come letta:', err.message);
        btn.disabled = false;
      }
    });
  });
}

// Listener per i bottoni "Continua a parlarne"
function setupContinueChatListeners(container, user) {
  const buttons = container.querySelectorAll('.btn-continue-chat');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ucmeId = btn.getAttribute('data-ucme-id');
      if (!ucmeId) return;

      // Controllo abbonamento (il bottone appare solo se premium, ma ricontrollo)
      const canContinueChat = user && (user.has_subscription === true || user.has_subscription === "true");
      if (!canContinueChat) {
        window.location.href = '/premium.html';
        return;
      }

      btn.disabled = true;
      btn.textContent = t('common.loading');
      try {
        const res = await requestChat(ucmeId, getToken());
        // Sostituisci il bottone con etichetta di conferma
        btn.outerHTML = `<span class="chat-requested-label">${t('dashboard.depositor.chat_request_sent')}</span>`;
      } catch (err) {
        log(t('errors.unexpected'), err.message);
        alert(err.message);
        btn.disabled = false;
        btn.textContent = t('dashboard.actions.new_ucme');
      }
    });
  });
}