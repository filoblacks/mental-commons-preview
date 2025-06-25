import { log } from '../core/logger.js';

// ▸ VISIBILITÀ ELEMENTI ----------------------------------------------------------------------------------------------------------------
function toggleDisplay(id, show = true, displayType = 'block') {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? displayType : 'none';
}

function showAuthenticatedNavigation() {
  toggleDisplay('nav-profile', true, 'inline-block');
  toggleDisplay('mobile-nav-profile', true, 'inline-block');
  toggleDisplay('nav-dashboard', true, 'inline-block');
  toggleDisplay('mobile-nav-dashboard', true, 'inline-block');
  toggleDisplay('nav-login', false);
  toggleDisplay('mobile-nav-login', false);
}

function wireLogout() {
  const btn = document.getElementById('logout-header-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      import('../core/auth.js').then(({ logout }) => {
        logout();
        window.location.href = '/login.html';
      });
    });
  }
}

// ▸ TOGGLE FORM MODIFICA PROFILO -------------------------------------------------------------------------------------------------------
function toggleProfileForm(forceHide = null) {
  const form = document.getElementById('edit-profile-form');
  const btn = document.getElementById('edit-profile-btn');
  if (!(form && btn)) return;

  const shouldShow = forceHide === null ? form.style.display === 'none' : !forceHide;
  form.style.display = shouldShow ? 'block' : 'none';
  btn.textContent = shouldShow ? 'Chiudi Modifica' : 'Modifica le tue informazioni';
}

function wireProfileForm(user) {
  const formEl = document.getElementById('profile-form');
  if (!formEl) return;

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    log('🔧 Salvataggio profilo non ancora implementato');
    toggleProfileForm(true);
  });

  // Rende funzione globale per compatibilità con HTML inline handlers
  window.forceToggleProfileForm = () => toggleProfileForm();
  window.forceSaveProfile = () => formEl.dispatchEvent(new Event('submit'));
}

// ▸ RENDER PRINCIPALE ------------------------------------------------------------------------------------------------------------------
export async function initProfile() {
  const { getToken, getCurrentUser } = await import('../core/auth.js');
  const user = getCurrentUser();
  if (!user) {
    log('Nessun utente autenticato, impossibile inizializzare profilo');
    return;
  }

  // Mostra navigazione corretta e wiring pulsante logout
  showAuthenticatedNavigation();
  wireLogout();

  const emailEl = document.getElementById('profile-email');
  const nameEl  = document.getElementById('profile-name');
  const createdEl = document.getElementById('profile-created');
  const lastEl = document.getElementById('profile-last-login');

  if (!(emailEl && nameEl && createdEl && lastEl)) {
    log('Elementi profilo non trovati nel DOM');
    return;
  }

  let realUser = user;

  try {
    const { getUsers } = await import('../core/api.js');
    const res = await getUsers(getToken());
    if (res?.data?.users?.length) {
      realUser = res.data.users.find((u) => u.email === user.email) || user;
    }
  } catch (err) {
    log('Errore caricamento profilo dal backend, uso dati locali:', err.message);
  }

  // Popola UI
  emailEl.textContent = realUser.email;
  nameEl.textContent = realUser.name || 'Non specificato';
  createdEl.textContent = new Date(realUser.created_at || Date.now()).toLocaleDateString('it-IT');
  lastEl.textContent = new Date(realUser.last_login || Date.now()).toLocaleDateString('it-IT');

  // Visualizza sezione profilo
  toggleDisplay('user-verification', false);
  toggleDisplay('profile-header', true, 'block');
  toggleDisplay('profile-content', true, 'block');
  toggleDisplay('no-access', false);

  // Wiring form modifica profilo
  wireProfileForm(realUser);
} 