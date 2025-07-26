import { getSchoolUCMEs, getSchoolUCMeStatsRange } from '../core/api.js';
import { getToken } from '../core/auth.js';
import { log, error } from '../core/logger.js';

function domReady(cb) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}

// === Chart.js loader (fallback se CDN bloccato) ===
async function ensureChartLoaded() {
  if (window.Chart) return;
  try {
    await import('https://unpkg.com/chart.js@4.5.0/dist/chart.esm.js');
  } catch (e) {
    error('Impossibile caricare Chart.js', e);
  }
}

export async function initDashboardDocente() {
  const token = getToken();
  if (!token) return;

  const listContainer = document.getElementById('ucme-docente-container');
  const rangeSelect = document.getElementById('date-range');
  const customFrom = document.getElementById('custom-from');
  const customTo = document.getElementById('custom-to');
  if (!listContainer) return;

  try {
    // Default: ultimi 30 giorni
    let toDate = new Date();
    let fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 30);

    // Funzione per refresh analytics
    async function refreshAnalytics() {
      const statsRes = await getSchoolUCMeStatsRange(
        token,
        fromDate.toISOString(),
        toDate.toISOString()
      );
      const stats = statsRes?.data ?? {};
      await ensureChartLoaded();
      renderStats(stats, fromDate, toDate);
      renderWeeklyChart(stats.weeklyCount || []);
      renderToneChart(stats.toneDist || []);
    }

    // Recupero parallelo lista + stats iniziali
    const [listRes] = await Promise.all([
      getSchoolUCMEs(token)
    ]);

    const ucmes = listRes?.data ?? [];
    renderUCMEs(listContainer, ucmes);

    await refreshAnalytics();

    // Set up range selector eventi
    function handleRangeChange() {
      const val = rangeSelect.value;
      if (val === 'custom') {
        customFrom.style.display = 'inline-block';
        customTo.style.display = 'inline-block';
        return;
      }
      customFrom.style.display = 'none';
      customTo.style.display = 'none';
      const days = parseInt(val, 10);
      toDate = new Date();
      fromDate = new Date();
      fromDate.setDate(toDate.getDate() - days);
      refreshAnalytics();
    }

    function handleCustomChange() {
      if (customFrom.value && customTo.value) {
        fromDate = new Date(customFrom.value);
        toDate = new Date(customTo.value);
        refreshAnalytics();
      }
    }

    rangeSelect?.addEventListener('change', handleRangeChange);
    customFrom?.addEventListener('change', handleCustomChange);
    customTo?.addEventListener('change', handleCustomChange);
  } catch (err) {
    error('Errore dashboard docente:', err);
    listContainer.innerHTML = '<p class="error-message">Impossibile caricare i dati.</p>';
  }
}

// Render KPI dinamici in base al range selezionato
function renderStats(stats, fromDate, toDate) {
  const {
    total = 0,
    mostUsedTone = '–',
    weeklyCount = []
  } = stats;

  // Media settimanale calcolata sul range
  const weeks = weeklyCount.length || 1;
  const weeklyAvg = weeks ? Number((total / weeks).toFixed(2)) : 0;

  const ids = {
    'stat-total': total,
    'stat-range': `${fromDate.toLocaleDateString('it-IT')} – ${toDate.toLocaleDateString('it-IT')}`,
    'stat-weekly': weeklyAvg,
    'stat-top-tone': mostUsedTone || '–'
  };

  Object.entries(ids).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

// === Grafici ================================================
let weeklyChart;
let toneChart;

function renderWeeklyChart(data = []) {
  const ctx = document.getElementById('weekly-chart');
  const ChartJS = window.Chart;
  if (!ctx || !ChartJS) return;

  const labels = data.map((d) => new Date(d.week).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }));
  const counts = data.map((d) => d.count);

  if (weeklyChart) {
    weeklyChart.data.labels = labels;
    weeklyChart.data.datasets[0].data = counts;
    weeklyChart.update();
    return;
  }

  weeklyChart = new ChartJS(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'UCMe / settimana',
          data: counts,
          borderColor: '#2C5F47',
          backgroundColor: 'rgba(44,95,71,0.1)',
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

function renderToneChart(data = []) {
  const ctx = document.getElementById('tone-chart');
  const ChartJS = window.Chart;
  if (!ctx || !ChartJS) return;

  const labels = data.map((d) => d.tone);
  const counts = data.map((d) => d.count);

  if (toneChart) {
    toneChart.data.labels = labels;
    toneChart.data.datasets[0].data = counts;
    toneChart.update();
    return;
  }

  const palette = ['#2C5F47', '#D4A574', '#8FB9A8', '#F5F5F5', '#B0735C'];

  toneChart = new ChartJS(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Distribuzione Toni',
          data: counts,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
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

    const risposta = ucme.risposta;

    div.innerHTML = `
      <div class="ucme-header">
        <small class="ucme-date">${dateIT}</small>
        <span class="ucme-tone">${ucme.tone || '–'}</span>
      </div>
      <div class="ucme-content">
        <p class="ucme-text">${ucme.content}</p>
      </div>
      <div class="ucme-response">
        ${risposta ? `<h4>Risposta</h4><p class="ucme-text risposta">${risposta.contenuto}</p>` : '<p class="ucme-text risposta-empty">Nessuna risposta al momento.</p>'}
      </div>
    `;

    container.appendChild(div);
  });
}

domReady(initDashboardDocente); 