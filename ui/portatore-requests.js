import { getChatRequests, updateChatRequestStatus } from '../core/api.js';
import { getToken } from '../core/auth.js';
import { log } from '../core/logger.js';

const container = document.getElementById('requests-container');
const loading = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');

async function loadRequests() {
  const token = getToken();
  if (!token) {
    console.error('❌ Token mancante - redirect login');
    window.location.href = '/login.html';
    return;
  }

  console.log('🔍 DEBUG loadRequests avviato con token:', token ? 'presente' : 'mancante');

  loading.style.display = 'flex';
  emptyState.style.display = 'none';
  container.innerHTML = '';

  try {
    console.log('🔍 DEBUG chiamando getChatRequests...');
    const res = await getChatRequests(token);
    console.log('🔍 DEBUG getChatRequests response:', res);
    
    if (res.status !== 'success') throw new Error(res.message || 'Errore caricamento');

    const list = res.data;
    console.log('🔍 DEBUG lista richieste ricevute:', list);
    
    if (!list.length) {
      console.log('📝 Nessuna richiesta trovata');
      emptyState.style.display = 'block';
      return;
    }

    console.log(`📝 Rendering ${list.length} richieste`);
    list.forEach(renderRequestRow);
  } catch (err) {
    console.error('❌ Errore caricamento richieste:', err);
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

  console.log(`🔍 DEBUG handleAction: ${newStatus} per chat ${chatId}`);

  try {
    rowEl.classList.add('processing');
    console.log('🔍 DEBUG chiamando updateChatRequestStatus...');
    
    const result = await updateChatRequestStatus(chatId, newStatus, token);
    console.log('🔍 DEBUG updateChatRequestStatus result:', result);
    
    rowEl.classList.add('done');
    rowEl.querySelector('.request-actions').innerHTML = `<span class="status-label">${newStatus === 'accepted' ? 'Accettata' : 'Rifiutata'}</span>`;

    // Se la richiesta è stata accettata, apri immediatamente la chat
    if (newStatus === 'accepted') {
      console.log(`🔍 DEBUG redirect a chat con ID: ${chatId}`);
      // Piccola pausa per far percepire l'aggiornamento UI
      setTimeout(() => {
        const chatUrl = `/chat.html?chat_id=${chatId}`;
        console.log(`🔍 DEBUG navigating to: ${chatUrl}`);
        window.location.href = chatUrl;
      }, 600);
    }
  } catch (err) {
    console.error('❌ Errore aggiornamento stato chat:', err);
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