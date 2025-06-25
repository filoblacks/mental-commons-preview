// ui/ucme-portatore.js – Sezione "Le tue UCMe" per i Portatori
// ===============================================================
// Mostra elenco UCMe assegnate al portatore e permette gestione stato
// ===============================================================

import { getPortatoreStatus, getPortatoreAssignedUCMEs, updatePortatoreUcmeStatus } from '../core/api.js';
import { getToken } from '../core/auth.js';
import { log } from '../core/logger.js';

const SECTION_ID = 'portatore-ucme-section';
const LIST_ID = 'assigned-ucme-list';

export async function initPortatoreUcmeSection() {
  const token = getToken();
  if (!token) return;

  // Verifica se l'utente è Portatore
  let status;
  try {
    const res = await getPortatoreStatus(token);
    if (!res.success) throw new Error(res.message || 'Errore verifica portatore');
    status = res.data;
  } catch (err) {
    log('Errore verifica Portatore', err);
    return; // Nascondi se errore
  }

  if (!status.is_portatore) return; // Se non è portatore usciamo

  // Assicura presenza sezione nel DOM
  const dashboardContent = document.getElementById('dashboard-content');
  if (!dashboardContent) return;

  let section = document.getElementById(SECTION_ID);
  if (!section) {
    section = document.createElement('section');
    section.id = SECTION_ID;
    section.className = 'portatore-section';
    section.innerHTML = `
      <h2>UCMe affidate a te</h2>
      <div id="${LIST_ID}" class="assigned-ucme-list">
        <p id="assigned-loading">Caricamento in corso…</p>
      </div>
    `;
    // Inseriamo sezione sopra le azioni dashboard
    dashboardContent.insertBefore(section, dashboardContent.firstChild);
  }

  await loadAssigned(token);
}

async function loadAssigned(token) {
  const listEl = document.getElementById(LIST_ID);
  if (!listEl) return;

  try {
    const res = await getPortatoreAssignedUCMEs(token);
    if (!res.success) throw new Error(res.message || 'Errore recupero UCMe');

    renderAssigned(listEl, res.data || [], token);
  } catch (err) {
    log('Errore caricamento UCMe portatore', err);
    listEl.innerHTML = '<p class="error-message">Errore caricamento UCMe</p>';
  }
}

function renderAssigned(container, ucmes, token) {
  container.innerHTML = '';
  if (!ucmes.length) {
    container.innerHTML = '<p>Nessuna UCMe assegnata al momento.</p>';
    return;
  }

  ucmes.forEach((ucme) => {
    const card = document.createElement('div');
    card.className = 'ucme-card';
    const preview = ucme.content.length > 120 ? `${ucme.content.slice(0, 117)}…` : ucme.content;

    card.innerHTML = `
      <div class="ucme-card-header">
        <p class="ucme-preview">${preview}</p>
        <small>${new Date(ucme.created_at).toLocaleString('it-IT')}</small>
      </div>
      <button class="ucme-open-btn">Apri</button>
      <div class="ucme-details" style="display:none;">
        <p class="ucme-full">${ucme.content}</p>
        <div class="ucme-status-area">
          <label for="ucme-status-${ucme.id}">Stato:</label>
          <select id="ucme-status-${ucme.id}" data-ucme-id="${ucme.id}">
            <option value="ricevuta" ${ucme.status === 'ricevuta' ? 'selected' : ''}>Ricevuta</option>
            <option value="in lavorazione" ${ucme.status === 'in lavorazione' ? 'selected' : ''}>In lavorazione</option>
            <option value="completata" ${ucme.status === 'completata' ? 'selected' : ''}>Completata</option>
            <option value="richiesta supporto" ${ucme.status === 'richiesta supporto' ? 'selected' : ''}>Richiesta supporto</option>
          </select>
        </div>
      </div>
    `;

    // Event: toggle dettagli
    card.querySelector('.ucme-open-btn').addEventListener('click', () => {
      const details = card.querySelector('.ucme-details');
      details.style.display = details.style.display === 'none' ? 'block' : 'none';
    });

    // Event: change status
    const selectEl = card.querySelector('select');
    if (selectEl) {
      selectEl.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        const ucmeId = e.target.dataset.ucmeId;
        try {
          selectEl.disabled = true;
          await updatePortatoreUcmeStatus(ucmeId, newStatus, token);
          alert('Stato UCMe aggiornato');
        } catch (err) {
          log('Errore aggiornamento status', err);
          alert(err.message || 'Errore aggiornamento status');
        } finally {
          selectEl.disabled = false;
        }
      });
    }

    container.appendChild(card);
  });
} 