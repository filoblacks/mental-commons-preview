import { getChatRequests, updateChatRequestStatus } from '../core/api.js';
import { getToken } from '../core/auth.js';
import { log } from '../core/logger.js';

const container = document.getElementById('requests-container');
const loading = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');

async function loadRequests() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  loading.style.display = 'flex';
  emptyState.style.display = 'none';
  container.innerHTML = '';

  try {
    const res = await getChatRequests(token);
    if (res.status !== 'success') throw new Error(res.message || 'Errore caricamento');

    const list = res.data;
    if (!list.length) {
      emptyState.style.display = 'block';
      return;
    }

    list.forEach(renderRequestRow);
  } catch (err) {
    log('Errore caricamento richieste', err);
    alert(err.message || 'Errore caricamento richieste');
  } finally {
    loading.style.display = 'none';
  }
}

function renderRequestRow(reqObj) {
  const row = document.createElement('div');
  row.className = 'request-row';
  row.innerHTML = `
    <div class="request-content">
      <p class="ucme-excerpt">${escapeHtml(reqObj.ucme_excerpt)}</p>
      <span class="request-date">${formatDate(reqObj.created_at)}</span>
    </div>
    <div class="request-actions">
      <button class="accept-btn">Accetta</button>
      <button class="reject-btn">Rifiuta</button>
    </div>
  `;

  const acceptBtn = row.querySelector('.accept-btn');
  const rejectBtn = row.querySelector('.reject-btn');

  acceptBtn.addEventListener('click', () => handleAction(reqObj.id, 'accepted', row));
  rejectBtn.addEventListener('click', () => handleAction(reqObj.id, 'rejected', row));

  container.appendChild(row);
}

async function handleAction(chatId, newStatus, rowEl) {
  const token = getToken();
  if (!token) return;

  try {
    rowEl.classList.add('processing');
    await updateChatRequestStatus(chatId, newStatus, token);
    rowEl.classList.add('done');
    rowEl.querySelector('.request-actions').innerHTML = `<span class="status-label">${newStatus === 'accepted' ? 'Accettata' : 'Rifiutata'}</span>`;
  } catch (err) {
    log('Errore aggiornamento stato chat', err);
    alert(err.message || 'Errore aggiornamento richiesta');
    rowEl.classList.remove('processing');
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Avvio
loadRequests(); 