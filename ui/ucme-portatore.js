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
    section.className = 'portatore-section role-section';
    section.innerHTML = `
      <div class="section-header">
        <div class="section-title-group">
          <div class="section-icon portatore-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="m22 2-2 2-6-6"></path>
            </svg>
          </div>
          <h2>Pensieri Ricevuti</h2>
        </div>
        <div class="section-count" id="portatore-count">
          <span class="count-number">0</span>
          <span class="count-label">UCMe</span>
        </div>
      </div>
      <div id="${LIST_ID}" class="assigned-ucme-list">
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Caricamento in corso…</p>
        </div>
      </div>
    `;
    
    // Inserisci sezione come seconda colonna (dopo depositor)
    const depositorSection = document.getElementById('depositor-section');
    if (depositorSection) {
      dashboardContent.insertBefore(section, depositorSection.nextSibling);
    } else {
      dashboardContent.insertBefore(section, dashboardContent.firstChild);
    }

    // Attiva layout a due colonne
    dashboardContent.classList.add('two-columns');
  }

  await loadAssigned(token);
}

async function loadAssigned(token) {
  const listEl = document.getElementById(LIST_ID);
  const countEl = document.querySelector('#portatore-count .count-number');
  if (!listEl) return;

  try {
    const res = await getPortatoreAssignedUCMEs(token);
    if (!res.success) throw new Error(res.message || 'Errore recupero UCMe');

    const ucmes = res.data || [];
    
    // Aggiorna contatore
    if (countEl) {
      countEl.textContent = ucmes.length;
    }

    renderAssigned(listEl, ucmes, token);
  } catch (err) {
    log('Errore caricamento UCMe portatore', err);
    listEl.innerHTML = '<p class="error-message">Errore caricamento UCMe</p>';
  }
}

function renderAssigned(container, ucmes, token) {
  container.innerHTML = '';
  
  if (!ucmes.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </div>
        <h3>Nessun pensiero assegnato</h3>
        <p>Al momento non hai UCMe da portare. Verranno assegnate automaticamente quando disponibili.</p>
      </div>
    `;
    return;
  }

  ucmes.forEach((ucme, index) => {
    const card = document.createElement('div');
    card.className = 'ucme-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const preview = ucme.content.length > 120 ? `${ucme.content.slice(0, 117)}…` : ucme.content;
    const createdDate = new Date(ucme.created_at).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Status badge styling
    const statusClass = getStatusClass(ucme.status);
    const statusLabel = getStatusLabel(ucme.status);

    card.innerHTML = `
      <div class="ucme-card-header">
        <div class="ucme-card-meta">
          <span class="ucme-status-badge ${statusClass}">${statusLabel}</span>
          <small class="ucme-date">${createdDate}</small>
        </div>
        <button class="ucme-expand-btn" aria-label="Espandi UCMe">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </button>
      </div>
      <div class="ucme-preview">
        <p class="ucme-preview-text">${preview}</p>
      </div>
      <div class="ucme-details" style="display:none;">
        <div class="ucme-full-content">
          <h4>Contenuto completo</h4>
          <p class="ucme-full-text">${ucme.content}</p>
        </div>
        <div class="ucme-actions">
          <div class="ucme-status-control">
            <label for="ucme-status-${ucme.id}">Stato:</label>
            <select id="ucme-status-${ucme.id}" data-ucme-id="${ucme.id}" class="modern-select">
              <option value="ricevuta" ${ucme.status === 'ricevuta' ? 'selected' : ''}>Ricevuta</option>
              <option value="in lavorazione" ${ucme.status === 'in lavorazione' ? 'selected' : ''}>In lavorazione</option>
              <option value="completata" ${ucme.status === 'completata' ? 'selected' : ''}>Completata</option>
              <option value="richiesta supporto" ${ucme.status === 'richiesta supporto' ? 'selected' : ''}>Richiesta supporto</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Event: toggle dettagli
    const expandBtn = card.querySelector('.ucme-expand-btn');
    const details = card.querySelector('.ucme-details');
    expandBtn.addEventListener('click', () => {
      const isExpanded = details.style.display !== 'none';
      details.style.display = isExpanded ? 'none' : 'block';
      expandBtn.classList.toggle('expanded', !isExpanded);
      
      // Aggiorna icona
      const icon = expandBtn.querySelector('svg polyline');
      icon.setAttribute('points', isExpanded ? '6,9 12,15 18,9' : '18,15 12,9 6,15');
    });

    // Event: change status
    const selectEl = card.querySelector('select');
    if (selectEl) {
      selectEl.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        const ucmeId = e.target.dataset.ucmeId;
        const originalValue = e.target.getAttribute('data-original');
        
        try {
          selectEl.disabled = true;
          await updatePortatoreUcmeStatus(ucmeId, newStatus, token);
          
          // Aggiorna badge status
          const badge = card.querySelector('.ucme-status-badge');
          badge.className = `ucme-status-badge ${getStatusClass(newStatus)}`;
          badge.textContent = getStatusLabel(newStatus);
          
          // Success feedback
          showStatusUpdateSuccess(card);
          
        } catch (err) {
          log('Errore aggiornamento status', err);
          selectEl.value = originalValue; // Restore previous value
          showStatusUpdateError(card, err.message || 'Errore aggiornamento status');
        } finally {
          selectEl.disabled = false;
        }
      });
      
      // Store original value for rollback
      selectEl.setAttribute('data-original', ucme.status);
    }

    container.appendChild(card);
  });
}

// Utility functions for status styling
function getStatusClass(status) {
  const statusMap = {
    'ricevuta': 'status-received',
    'in lavorazione': 'status-processing',
    'completata': 'status-completed',
    'richiesta supporto': 'status-support'
  };
  return statusMap[status] || 'status-default';
}

function getStatusLabel(status) {
  const labelMap = {
    'ricevuta': 'Ricevuta',
    'in lavorazione': 'In lavorazione',
    'completata': 'Completata',
    'richiesta supporto': 'Supporto'
  };
  return labelMap[status] || status;
}

// Feedback functions
function showStatusUpdateSuccess(card) {
  const feedback = document.createElement('div');
  feedback.className = 'status-feedback success';
  feedback.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20,6 9,17 4,12"></polyline>
    </svg>
    Stato aggiornato
  `;
  
  card.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}

function showStatusUpdateError(card, message) {
  const feedback = document.createElement('div');
  feedback.className = 'status-feedback error';
  feedback.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
    ${message}
  `;
  
  card.appendChild(feedback);
  setTimeout(() => feedback.remove(), 5000);
} 