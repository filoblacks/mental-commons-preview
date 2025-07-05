// ui/portatore.js – Gestione toggle ON/OFF Portatore nel profilo

import { log } from '../core/logger.js';
import { getToken } from '../core/auth.js';
import { getPortatoreStatus, registerPortatore, revokePortatore } from '../core/api.js';

export async function initPortatoreSection() {
  const section = document.getElementById('portatore-section');
  if (!section) return; // Sezione assente (profilo errato)

  const token = getToken();
  if (!token) {
    section.style.display = 'none';
    return;
  }

  // Riferimenti DOM
  const statusMessageEl = document.getElementById('portatore-status-message');
  const toggleBtn = document.getElementById('portatore-toggle-btn');
  if (!statusMessageEl || !toggleBtn) return;

  let isPortatore = false; // Stato locale

  // Aggiorna testo e stile del bottone in base allo stato
  function refreshToggleUI() {
    if (isPortatore) {
      statusMessageEl.textContent = 'Sei attualmente Portatore 🟢';
      toggleBtn.textContent = 'Disattiva';
      toggleBtn.classList.remove('profile-action-btn');
      toggleBtn.classList.add('profile-danger-btn');
    } else {
      statusMessageEl.textContent = 'Non sei Portatore';
      toggleBtn.textContent = 'Attiva';
      toggleBtn.classList.remove('profile-danger-btn');
      toggleBtn.classList.add('profile-action-btn');
    }
  }

  // Recupera stato corrente dal backend
  async function fetchStatus() {
    try {
      statusMessageEl.textContent = 'Caricamento stato…';
      const res = await getPortatoreStatus(token);
      if (!res.success) throw new Error(res.message || 'Errore recupero stato');
      isPortatore = res.data.is_portatore;
      refreshToggleUI();
    } catch (err) {
      log('Errore stato Portatore', err);
      statusMessageEl.textContent = 'Errore caricamento stato';
    }
  }

  // Handler click bottone
  toggleBtn.addEventListener('click', async () => {
    try {
      toggleBtn.disabled = true;

      if (isPortatore) {
        // Conferma revoca
        if (!confirm('Sei sicuro di voler revocare lo stato di Portatore?')) {
          toggleBtn.disabled = false;
          return;
        }
        await revokePortatore(token);
      } else {
        // Registrazione con bio placeholder (≥10 caratteri per validazione backend)
        await registerPortatore('Portatore attivo', token);
      }

      // Aggiorna stato locale e UI
      await fetchStatus();
    } catch (err) {
      log('Errore toggle Portatore', err);
      alert(err.message || 'Errore operazione Portatore');
    } finally {
      toggleBtn.disabled = false;
    }
  });

  // Primo caricamento
  await fetchStatus();

  // Espone utility globali (facoltativo)
  window.__togglePortatore = () => toggleBtn.click();
} 