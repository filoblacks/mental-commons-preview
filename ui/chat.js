import { getToken } from '../core/auth.js';
import { getChatMessages, sendChatMessage, getMyChats } from '../core/api.js';
import { log } from '../core/logger.js';

const messagesBox = document.getElementById('messages-box');
const form = document.getElementById('message-form');
const textarea = document.getElementById('message-input');

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
  messagesBox.innerHTML = '';
  list.forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.sender_type}`;
    bubble.textContent = msg.text;
    messagesBox.appendChild(bubble);
  });
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = textarea.value.trim();
  if (!text) return;

  const token = getToken();
  if (!token) return;

  try {
    await sendChatMessage(chatId, text, token);
    textarea.value = '';
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
  document.querySelector('.chat-title').textContent = 'Le Tue Chat';
  
  try {
    const res = await getMyChats(token);
    if (res.status !== 'success') throw new Error(res.message || 'Errore');

    const chats = res.data || [];

    if (chats.length === 0) {
      messagesBox.innerHTML = '<p style="text-align:center; padding:1rem;">Nessuna chat attiva</p>';
      return;
    }

    messagesBox.innerHTML = '';
    chats.forEach((chat) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-preview';
      wrapper.innerHTML = `
        <p><strong>UCMe:</strong> ${escapeHtml(chat.ucme_excerpt)}…</p>
        <p><small>${new Date(chat.updated_at).toLocaleString('it-IT')}</small></p>
        <p><a href="/chat.html?chat_id=${chat.chat_id}">Apri la chat</a></p>
      `;
      messagesBox.appendChild(wrapper);
    });
  } catch (err) {
    console.error('❌ Errore caricamento chat:', err);
    messagesBox.innerHTML = '<p>Errore nel caricamento delle chat</p>';
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