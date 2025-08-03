import { getToken } from '../core/auth.js';
import { getChatMessages, sendChatMessage, getMyChats } from '../core/api.js';
import { log } from '../core/logger.js';

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
    log('Errore recupero messaggi', err);
    
    // Se è un errore di autorizzazione o chat non trovata, mostra dettagli
    if (err.message.includes('Non autorizzato') || err.message.includes('Chat non trovata')) {
      alert(`Errore chat: ${err.message}\nChat ID: ${chatId}`);
      window.location.href = '/dashboard.html';
    }
  }
}

function renderMessages(list) {
  // Se la chat è vuota, aggiungi messaggio di sistema introduttivo
  const msgs = list && list.length ? list : [{
    sender_type: 'system',
    text: 'Questo spazio è per voi. Non serve avere le parole giuste.',
    created_at: new Date().toISOString()
  }];

  messagesBox.innerHTML = '';

  msgs.forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.sender_type}`;

    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = msg.text;
    bubble.appendChild(textEl);

    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    const date = new Date(msg.created_at);
    timeEl.textContent = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(timeEl);

    messagesBox.appendChild(bubble);
  });

  // Aggiorna stato chat
  if (chatStatusEl) {
    if (!list || list.length === 0) {
      chatStatusEl.textContent = 'Chat attiva con un Portatore';
    } else {
      const lastMsg = list[list.length - 1];
      const lastDate = new Date(lastMsg.created_at);
      chatStatusEl.textContent = 'Ultima risposta: ' + lastDate.toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
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
    log('Errore invio messaggio', err);
    alert(err.message || 'Errore invio messaggio');
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
  document.querySelector('.chat-title').textContent = 'I Tuoi Dialoghi';
  
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
      const chatCard = createChatCard(chat);
      messagesBox.appendChild(chatCard);
    });
  } catch (err) {
    console.error('❌ Errore caricamento chat:', err);
    messagesBox.innerHTML = '<div class="chat-empty-state"><p>Errore nel caricamento delle chat</p></div>';
  }
}

function renderEmptyState() {
  messagesBox.className = '';
  messagesBox.innerHTML = `
    <div class="chat-empty-state">
      <h3>🌱</h3>
      <p>Qui appariranno i tuoi dialoghi anonimi.<br>Ogni parola è un ponte.</p>
      <a href="/dashboard.html" class="btn-outline">Torna al Dashboard</a>
    </div>
  `;
}

function createChatCard(chat) {
  const chatCard = document.createElement('div');
  chatCard.className = 'chat-card';
  
  // Calcola se la chat è "nuova" (updated_at nelle ultime 24 ore)
  const isNew = isRecentChat(chat.updated_at);
  
  // Determina lo stato della chat per il tooltip
  const chatStatus = getChatStatus(chat);
  
  // Formatta la data in modo leggibile
  const formattedDate = formatChatDate(chat.updated_at);
  
  chatCard.innerHTML = `
    ${isNew ? '<div class="chat-new-badge">Nuovo</div>' : ''}
    
    <div class="chat-card-header">
      <div class="chat-card-icon">🗨️</div>
      <div class="chat-ucme-content">
        ${escapeHtml(chat.ucme_excerpt)}
      </div>
    </div>
    
    <div class="chat-card-meta">
      <div class="chat-date">${formattedDate}</div>
      <div class="chat-actions">
        <a href="/dashboard.html" class="chat-dashboard-link">→ Dashboard</a>
        <div class="chat-tooltip">
          <a href="/chat.html?chat_id=${chat.chat_id}" class="chat-open-link">Apri la chat</a>
          <span class="tooltip-text">${chatStatus}</span>
        </div>
      </div>
    </div>
  `;
  
  return chatCard;
}

function isRecentChat(updatedAt) {
  const chatDate = new Date(updatedAt);
  const now = new Date();
  const diffHours = (now - chatDate) / (1000 * 60 * 60);
  return diffHours <= 24;
}

function getChatStatus(chat) {
  // Logica semplificata per determinare lo stato
  const lastUpdate = new Date(chat.updated_at);
  const diffDays = Math.floor((new Date() - lastUpdate) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Attività recente oggi';
  } else if (diffDays === 1) {
    return 'Ultimo messaggio ieri';
  } else {
    return `Ultimo messaggio ${diffDays} giorni fa`;
  }
}

function formatChatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Oggi, ' + date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Ieri, ' + date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `${diffDays} giorni fa`;
  } else {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  }
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