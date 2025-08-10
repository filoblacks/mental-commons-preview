import { getToken, getCurrentUser } from '../core/auth.js';
import { getChatMessages, sendChatMessage, getMyChats } from '../core/api.js';
import { log } from '../core/logger.js';
import { t, currentLocale, initI18n, formatDate, formatRelative } from '../core/i18n.js';

const messagesBox = document.getElementById('messages-box');
const form = document.getElementById('message-form');
const textarea = document.getElementById('message-input');
const sendBtn = form.querySelector('button');
const chatStatusEl = document.getElementById('chat-status');
let lastSentText = '';

function updateSendButtonState() {
  const value = textarea.value.trim();
  sendBtn.disabled = !value || value === lastSentText;
}
textarea.addEventListener('input', updateSendButtonState);
textarea.addEventListener('keydown', (e) => {
  const isEnter = e.key === 'Enter';
  const withMeta = e.metaKey || e.ctrlKey;
  if (isEnter && withMeta) {
    e.preventDefault();
    form.requestSubmit();
  }
});
updateSendButtonState();

const urlParams = new URLSearchParams(window.location.search);
// Supporta sia ?chat_id=... sia ?id=...
const chatId = urlParams.get('chat_id') || urlParams.get('id');

console.log('🔍 DEBUG Chat URL params:', {
  url: window.location.href,
  search: window.location.search,
  chat_id: urlParams.get('chat_id'),
  id: urlParams.get('id'),
  finalChatId: chatId
});

if (!chatId) {
  console.log('📝 Nessun chat_id - mostro lista chat');
  // Se non c'è chat_id, mostra lista chat
  showChatsList();
} else {
  // Chat specifica
  initializeChat();
}

let pollingInterval;

async function fetchMessages() {
  const token = getToken();
  if (!token) {
    console.error('❌ Token mancante per fetchMessages');
    return;
  }

  console.log('🔍 DEBUG fetchMessages:', { chatId, token: token ? 'presente' : 'mancante' });

  try {
    const res = await getChatMessages(chatId, token);
    console.log('🔍 DEBUG getChatMessages response:', res);
    
    if (res.status !== 'success') throw new Error(res.message || 'Errore');
    renderMessages(res.data);
  } catch (err) {
    console.error('❌ Errore recupero messaggi:', err);
    log(t('errors.chat.fetch'), err);
    
    // Se è un errore di autorizzazione o chat non trovata, mostra dettagli
    if (err.message.includes('Non autorizzato') || err.message.includes('Chat non trovata')) {
      alert(`${t('errors.chat.fetch')}: ${err.message}\nID: ${chatId}`);
      window.location.href = '/dashboard.html';
    }
  }
}

function parseDateString(str) {
  if (!str) return new Date();
  // Se la stringa non contiene indicazione di timezone, assumiamo UTC
  const hasTZ = /[Z+-]/.test(str.slice(-6));
  return hasTZ ? new Date(str) : new Date(str + 'Z');
}

function renderMessages(list) {
  // Se la chat è vuota, aggiungi messaggio di sistema introduttivo
  const msgs = list && list.length ? list : [{
    sender_type: 'system',
    text: t('chat.system.welcome'),
    created_at: new Date().toISOString()
  }];

  messagesBox.innerHTML = '';

  msgs.forEach((msg) => {
    const bubble = document.createElement('div');
    let bubbleType;
    if (msg.sender_type === 'system') {
      bubbleType = 'system';
          } else {
        const currentUser = getCurrentUser();
        const isSelf = currentUser && msg.sender_id && String(msg.sender_id) === String(currentUser.id);
        bubbleType = isSelf ? 'user' : 'portatore';
      }
    bubble.className = `message-bubble ${bubbleType}`;

    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = msg.text;
    bubble.appendChild(textEl);

    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    const date = parseDateString(msg.created_at);
    timeEl.textContent = formatDate(date, { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(timeEl);

    messagesBox.appendChild(bubble);
  });

  // Aggiorna stato chat
  if (chatStatusEl) {
    if (!list || list.length === 0) {
      chatStatusEl.textContent = t('chat.status.active');
    } else {
      const lastMsg = list[list.length - 1];
      const lastDate = parseDateString(lastMsg.created_at);
      chatStatusEl.textContent = `${t('chat.status.last_reply_prefix')} ${formatDate(lastDate, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`;
    }
  }

  messagesBox.scrollTop = messagesBox.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = textarea.value.trim();
  if (!text || text === lastSentText) return;

  const token = getToken();
  if (!token) return;

  try {
    await sendChatMessage(chatId, text, token);
    lastSentText = text;
    textarea.value = '';
    updateSendButtonState();
    await fetchMessages();
  } catch (err) {
    log(t('errors.chat.send'), err);
    alert(err.message || t('errors.chat.send'));
  }
});

async function showChatsList() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Nascondi interfaccia chat singola
  form.style.display = 'none';
  
  // Cambia titolo
  document.querySelector('.chat-title').textContent = t('chat.empty_state.title');
  
  try {
    const res = await getMyChats(token);
    if (res.status !== 'success') throw new Error(res.message || 'Errore');

    const chats = res.data || [];

    if (chats.length === 0) {
      renderEmptyState();
      return;
    }

    // Applica container per le chat cards
    messagesBox.className = 'chat-list-container';
    messagesBox.innerHTML = '';
    
    chats.forEach((chat) => {
      const chatCard = createChatCard(chat, token);
      messagesBox.appendChild(chatCard);
    });
  } catch (err) {
    console.error('❌ Errore caricamento chat:', err);
    messagesBox.innerHTML = `<div class="chat-empty-state"><p>${t('errors.unexpected')}</p></div>`;
  }
}

function renderEmptyState() {
  messagesBox.className = '';
  messagesBox.innerHTML = `
    <div class="chat-empty-state">
      <h3>${t('chat.empty_state.icon')}</h3>
      <p>${t('chat.empty_state.body')}</p>
      <a href="/dashboard.html" class="btn-outline">${t('chat.empty_state.cta')}</a>
    </div>
  `;
}

function createChatCard(chat, token) {
  const chatCard = document.createElement('div');
  chatCard.className = 'chat-card';

  // Calcola se la chat è "nuova" (updated_at nelle ultime 24 ore)
  const isNew = isRecentChat(chat.updated_at);

  // Determina lo stato della chat per il tooltip
  const chatStatus = getChatStatus(chat);

  // Formatta la data in modo leggibile
  const formattedDate = formatChatDate(chat.updated_at);

  chatCard.innerHTML = `
    ${isNew ? `<div class="chat-new-badge">${t('chat.list.card.new_badge')}</div>` : ''}

    <div class="chat-card-header">
      <div class="chat-card-icon">🗨️</div>
      <div class="chat-ucme-content">
        ${escapeHtml(chat.ucme_excerpt)}
      </div>
    </div>

    <div class="chat-last-message" id="chat-preview-${chat.chat_id}">${t('chat.list.card.preview_loading')}</div>

      <div class="chat-card-meta">
      <div class="chat-date">${formattedDate}</div>
      <div class="chat-actions">
        <div class="chat-tooltip">
          <a href="/chat.html?chat_id=${chat.chat_id}" class="chat-open-link">${t('chat.list.card.open')}</a>
          <span class="tooltip-text">${chatStatus}</span>
        </div>
      </div>
    </div>
  `;

  // Carica anteprima dell'ultimo messaggio
  loadLastMessagePreview(chat.chat_id, token);

  return chatCard;
}

/**
 * Carica e mostra l'anteprima dell'ultimo messaggio di una chat
 */
async function loadLastMessagePreview(chatId, token) {
  try {
    const res = await getChatMessages(chatId, token);
    const previewEl = document.getElementById(`chat-preview-${chatId}`);
    if (!previewEl) return;

    if (res.status === 'success' && Array.isArray(res.data) && res.data.length) {
      const lastMsg = res.data[res.data.length - 1];
      previewEl.textContent = lastMsg.text.length > 160 ? lastMsg.text.slice(0, 157) + '…' : lastMsg.text;
    } else {
      previewEl.textContent = t('chat.list.card.no_messages');
      previewEl.classList.add('chat-message-empty');
    }
  } catch (err) {
    console.error('Errore caricamento anteprima messaggio:', err);
  }
}

function isRecentChat(updatedAt) {
  const chatDate = parseDateString(updatedAt);
  const now = new Date();
  const diffHours = (now - chatDate) / (1000 * 60 * 60);
  return diffHours <= 24;
}

function getChatStatus(chat) {
  // Logica semplificata per determinare lo stato
  const lastUpdate = parseDateString(chat.updated_at);
  const diffDays = Math.floor((new Date() - lastUpdate) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return t('chat.list.card.status.today');
  } else if (diffDays === 1) {
    return t('chat.list.card.status.yesterday');
  } else {
    return t('chat.list.card.status.days_ago', { count: diffDays });
  }
}

function formatChatDate(dateString) {
  const date = parseDateString(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0 || diffDays === 1) {
    return `${formatRelative(date)}, ${formatDate(date, { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays < 7) {
    return t('dates.relative.days_ago', { count: diffDays });
  }
  return formatDate(date, { day: '2-digit', month: '2-digit' });
}


function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initializeChat() {
  // Avvio primo fetch
  fetchMessages();
  // Poll ogni 5 secondi (versione semi-sincrona)
  pollingInterval = setInterval(fetchMessages, 5000);

  // Auto-scroll su focus textarea
  textarea.addEventListener('focus', () => {
    messagesBox.scrollTop = messagesBox.scrollHeight;
  });
} 