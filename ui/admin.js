/* ui/admin.js – Gestione dashboard amministratore per assegnazione manuale UCMe */
import { getPendingUCMEs, assignUCMe, getActivePortatori } from '../core/api.js';
import { getToken, getCurrentUser } from '../core/auth.js';
import { log, error } from '../core/logger.js';

export async function initAdmin() {
  const token = getToken();
  if (!token) {
    alert('Autenticazione richiesta');
    window.location.href = '/login.html';
    return;
  }

  // Controllo ruolo admin lato client (best effort)
  const user = getCurrentUser();
  if (!user?.is_admin && user?.role !== 'admin') {
    alert('Accesso non autorizzato');
    window.location.href = '/index.html';
    return;
  }

  // Elementi DOM
  const pendingTableBody = document.getElementById('pending-ucme-body');
  const portatoriBody = document.getElementById('active-portatori-body');

  try {
    const [pendingRes, portatoriRes] = await Promise.all([
      getPendingUCMEs(token),
      getActivePortatori(token),
    ]);

    const pendingUcmes = pendingRes.data || [];
    const portatori = portatoriRes.data || [];

    // Riempi tabella portatori attivi
    if (portatoriBody) {
      if (portatori.length === 0) {
        portatoriBody.innerHTML = '<tr><td colspan="4">Nessun portatore attivo</td></tr>';
      } else {
        portatoriBody.innerHTML = '';
        portatori.forEach((p) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${p.id}</td>
            <td>${p.user?.name || '—'}</td>
            <td>${p.user?.email}</td>
            <td>${p.bio?.slice(0, 80) || ''}</td>`;
          portatoriBody.appendChild(row);
        });
      }
    }

    // Costruisci mappa portatori per rapido accesso
    const portatoriOptionsHtml = portatori
      .map(
        (p) => `<option value="${p.id}">${p.user.name || '—'} (${p.user.email})</option>`
      )
      .join('');

    if (pendingUcmes.length === 0) {
      pendingTableBody.innerHTML = '<tr><td colspan="5">Nessuna UCMe in attesa</td></tr>';
      return;
    }

    pendingUcmes.forEach((u) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${u.id}</td>
        <td>${u.user?.email || 'Anonimo'}</td>
        <td>${new Date(u.created_at).toLocaleString()}</td>
        <td>${(u.content || '').slice(0, 60)}…</td>
        <td>
          <select class="portatore-select">
            <option value="" selected>Seleziona…</option>
            ${portatoriOptionsHtml}
          </select>
          <button class="assign-btn">Assegna</button>
        </td>`;

      // Event binding
      const selectEl = row.querySelector('.portatore-select');
      const assignBtn = row.querySelector('.assign-btn');
      assignBtn.addEventListener('click', async () => {
        const chosen = selectEl.value;
        if (!chosen) {
          alert('Seleziona un Portatore');
          return;
        }
        try {
          assignBtn.disabled = true;
          await assignUCMe(u.id, chosen, token);
          alert('UCMe assegnata con successo');
          row.remove();
        } catch (err) {
          error('Errore assegnazione', err);
          alert(err.message || 'Errore assegnazione');
          assignBtn.disabled = false;
        }
      });

      pendingTableBody.appendChild(row);
    });
  } catch (err) {
    error('Errore inizializzazione admin', err);
    alert(err.message || 'Errore caricamento dati admin');
  }
} 