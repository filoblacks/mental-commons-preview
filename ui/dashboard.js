import { getUCMEs } from '../core/api.js';
import { getToken, getCurrentUser } from '../core/auth.js';
import { log } from '../core/logger.js';

const containerId = 'ucme-blocks';

export async function initDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const data = await getUCMEs(getToken());
    const ucmes = data?.data ?? [];
    renderUcmes(container, ucmes);
  } catch (err) {
    log('Errore caricamento UCMe:', err.message);
    container.innerHTML = '<p>Impossibile caricare i tuoi pensieri.</p>';
  }
}

function renderUcmes(container, ucmes = []) {
  container.innerHTML = '';
  if (ucmes.length === 0) {
    container.innerHTML = '<p>Non hai ancora condiviso pensieri.</p>';
    return;
  }

  ucmes.forEach((ucme) => {
    const div = document.createElement('div');
    div.className = 'ucme-block';
    div.innerHTML = `
      <p>${ucme.content}</p>
      <small>${new Date(ucme.created_at).toLocaleDateString('it-IT')}</small>
    `;
    container.appendChild(div);
  });
} 