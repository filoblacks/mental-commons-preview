// ui/portatore.js – Gestione sezione "Diventa Portatore" nel profilo

import { log } from '../core/logger.js';
import { getToken } from '../core/auth.js';
import { getPortatoreStatus, registerPortatore, revokePortatore } from '../core/api.js';

const MAX_BIO_LENGTH = 300;

export async function initPortatoreSection() {
  const section = document.getElementById('portatore-section');
  if (!section) return; // Sezione non presente

  const token = getToken();
  if (!token) {
    section.style.display = 'none';
    return;
  }

  const statusMessage = document.getElementById('portatore-status-message');
  const formContainer = document.getElementById('portatore-form-container');
  const activeContainer = document.getElementById('portatore-active-container');
  const bioTextarea = document.getElementById('portatore-bio');
  const charCountEl = document.getElementById('bio-char-count');
  const saveBtn = document.getElementById('portatore-save-btn');
  const editBtn = document.getElementById('portatore-edit-btn');
  const revokeBtn = document.getElementById('portatore-revoke-btn');
  const currentBioEl = document.getElementById('current-portatore-bio');

  // Helper: aggiorna contatore
  function updateCounter() {
    const len = bioTextarea.value.length;
    charCountEl.textContent = len;
    charCountEl.style.color = len > MAX_BIO_LENGTH ? '#ff6b6b' : '#4caf50';
    saveBtn.disabled = len < 10 || len > MAX_BIO_LENGTH;
  }

  // Carica stato iniziale
  async function refreshState() {
    try {
      statusMessage.textContent = 'Caricamento stato…';
      const res = await getPortatoreStatus(token);
      if (!res.success) throw new Error(res.message || 'Errore recupero stato');
      const { is_portatore, bio } = res.data;

      if (is_portatore) {
        // Mostra bio e azioni
        formContainer.style.display = 'none';
        activeContainer.style.display = 'block';
        currentBioEl.textContent = bio || '—';
        statusMessage.textContent = 'Sei attualmente Portatore 🟢';
      } else {
        // Mostra form candidatura
        formContainer.style.display = 'block';
        activeContainer.style.display = 'none';
        statusMessage.textContent = 'Non sei ancora Portatore';
      }
    } catch (err) {
      log('Errore stato Portatore', err);
      statusMessage.textContent = 'Errore caricamento stato';
    }
  }

  // Event listeners --------------------------------------------------
  if (bioTextarea) {
    bioTextarea.addEventListener('input', updateCounter);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      try {
        saveBtn.disabled = true;
        await registerPortatore(bioTextarea.value.trim(), token);
        alert('Registrazione portatore avvenuta con successo');
        bioTextarea.value = '';
        updateCounter();
        await refreshState();
      } catch (err) {
        log('Errore registrazione Portatore', err);
        alert(err.message || 'Errore registrazione Portatore');
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      formContainer.style.display = 'block';
      activeContainer.style.display = 'none';
      bioTextarea.value = currentBioEl.textContent;
      updateCounter();
    });
  }

  if (revokeBtn) {
    revokeBtn.addEventListener('click', async () => {
      if (!confirm('Sei sicuro di voler revocare la candidatura a Portatore?')) return;
      try {
        revokeBtn.disabled = true;
        await revokePortatore(token);
        alert('Candidatura revocata');
        await refreshState();
      } catch (err) {
        log('Errore revoca Portatore', err);
        alert(err.message || 'Errore revoca Portatore');
      } finally {
        revokeBtn.disabled = false;
      }
    });
  }

  // Prima inizializzazione contatore e stato
  if (bioTextarea) updateCounter();
  await refreshState();

  // Rende funzioni globali se servissero
  window.submitPortatoreBio = async () => saveBtn?.click();
  window.revokePortatoreStatus = async () => revokeBtn?.click();
} 