import { postUCME } from '../core/api.js';
import { getToken, getCurrentUser } from '../core/auth.js';
import { isValidEmail, generateUniqueId, MAX_TEXT_LENGTH, MIN_TEXT_LENGTH } from '../utils/helpers.js';
import { log } from '../core/logger.js';

const formId = 'ucme-form';
const counterId = 'char-count';

export function initForm() {
  const form = document.getElementById(formId);
  if (!form) return;
  const textarea = document.getElementById('ucme-text');
  const counter = document.getElementById(counterId);

  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = len;
    counter.style.color = len < MIN_TEXT_LENGTH || len > MAX_TEXT_LENGTH ? '#ff6b6b' : '#4caf50';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = collectData(form);
    if (!payload) return;
    try {
      await postUCME(payload, getToken());
      form.reset();
      counter.textContent = '0';
      alert('Pensiero inviato con successo!');
    } catch (err) {
      log('Errore invio UCMe', err.message);
      alert('Errore invio pensiero');
    }
  });
}

function collectData(form) {
  const content = form.querySelector('#ucme-text').value.trim();
  const email = form.querySelector('#email').value.trim().toLowerCase();
  const tone = form.querySelector('#tone').value;
  const acceptance = form.querySelector('#acceptance').checked;

  if (content.length < MIN_TEXT_LENGTH || content.length > MAX_TEXT_LENGTH) {
    alert('Il pensiero deve essere fra 20 e 600 caratteri.');
    return null;
  }
  if (!isValidEmail(email)) {
    alert('Email non valida');
    return null;
  }
  if (!acceptance) {
    alert('Devi accettare i termini.');
    return null;
  }

  const user = getCurrentUser();
  return {
    id: generateUniqueId(),
    content,
    email,
    tone,
    title: null,
    userId: user?.id ?? null,
    timestamp: new Date().toISOString(),
  };
} 