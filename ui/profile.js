import { getUsers } from '../core/api.js';
import { getToken, getCurrentUser } from '../core/auth.js';
import { log } from '../core/logger.js';

export async function initProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const emailEl = document.getElementById('profile-email');
  const nameEl = document.getElementById('profile-name');
  const createdEl = document.getElementById('profile-created');
  const lastEl = document.getElementById('profile-last-login');

  if (!(emailEl && nameEl && createdEl && lastEl)) return;

  try {
    const res = await getUsers(getToken());
    const realUser = res.data.users.find((u) => u.email === user.email) || user;

    emailEl.textContent = realUser.email;
    nameEl.textContent = realUser.name || 'Non specificato';
    createdEl.textContent = new Date(realUser.created_at || Date.now()).toLocaleDateString('it-IT');
    lastEl.textContent = new Date(realUser.last_login || Date.now()).toLocaleDateString('it-IT');
  } catch (err) {
    log('Errore caricamento profilo:', err.message);
  }
} 