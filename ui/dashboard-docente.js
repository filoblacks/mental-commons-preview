import { getSchoolUCMEs, getSchoolUCMeStats } from '../core/api.js';
import { getToken } from '../core/auth.js';
import { log } from '../core/logger.js';

function domReady(cb) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}

export async function initDashboardDocente() {
  const token = getToken();
  if (!token) return;

  const listContainer = document.getElementById('ucme-docente-container');
  if (!listContainer) return;

  try {
    // Recupero parallelo dati e statistiche
    const [listRes, statsRes] = await Promise.all([
      getSchoolUCMEs(token),
      getSchoolUCMeStats(token)
    ]);

    const ucmes = listRes?.data ?? [];
    const stats = statsRes?.data ?? {};

    renderStats(stats);
    renderUCMEs(listContainer, ucmes);
  } catch (err) {
    log('Errore dashboard docente:', err.message);
    listContainer.innerHTML = '<p class="error-message">Impossibile caricare i dati.</p>';
  }
}

function renderStats(stats) {
  const {
    total_ucme = 0,
    last_30_days = 0,
    tone_counts = {},
    weekly_average = 0
  } = stats;

  const topTone = Object.entries(tone_counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '–';

  const ids = {
    'stat-total': total_ucme,
    'stat-30days': last_30_days,
    'stat-weekly': weekly_average,
    'stat-top-tone': topTone
  };

  Object.entries(ids).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function renderUCMEs(container, ucmes = []) {
  container.innerHTML = '';

  if (!ucmes.length) {
    container.innerHTML = '<p>Nessun pensiero disponibile per la tua scuola.</p>';
    return;
  }

  ucmes.forEach((ucme, idx) => {
    const div = document.createElement('div');
    div.className = 'ucme-block docente-view';
    div.style.animationDelay = `${idx * 0.05}s`;

    const dateIT = new Date(ucme.created_at).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    div.innerHTML = `
      <div class="ucme-header">
        <small class="ucme-date">${dateIT}</small>
        <span class="ucme-tone">${ucme.tone || '–'}</span>
      </div>
      <div class="ucme-content">
        <p class="ucme-text">${ucme.content}</p>
      </div>
    `;

    container.appendChild(div);
  });
}

domReady(initDashboardDocente); 