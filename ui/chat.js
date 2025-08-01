import { getToken } from '../core/auth.js';
import { getChatMessages, sendChatMessage } from '../core/api.js';
import { log } from '../core/logger.js';

const messagesBox = document.getElementById('messages-box');
const form = document.getElementById('message-form');
const textarea = document.getElementById('message-input');

const urlParams = new URLSearchParams(window.location.search);
// Supporta sia ?chat_id=... sia ?id=...
const chatId = urlParams.get('chat_id') || urlParams.get('id');
if (!chatId) {
  alert('Chat non trovata');
  window.location.href = '/dashboard.html';
}

let pollingInterval;

async function fetchMessages() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await getChatMessages(chatId, token);
    if (res.status !== 'success') throw new Error(res.message || 'Errore');
    renderMessages(res.data);
  } catch (err) {
    log('Errore recupero messaggi', err);
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

// Avvio primo fetch
fetchMessages();
// Poll ogni 5 secondi (versione semi-sincrona)
pollingInterval = setInterval(fetchMessages, 5000);

// Auto-scroll su focus textarea
textarea.addEventListener('focus', () => {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}); 