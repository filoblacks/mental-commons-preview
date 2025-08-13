import { initDashboard } from '@ui/dashboard.js';
import { initProfile } from '@ui/profile.js';
import { initForm } from '@ui/form.js';
import { initLogin } from '@ui/login.js';
import { initStats } from '@ui/stats.js';
import { initPortatoreSection } from '@ui/portatore.js';
import { initAdmin } from '@ui/admin.js';
import { initPortatoreUcmeSection } from '@ui/ucme-portatore.js';
import { log } from '@core/logger.js';
import { initHeroBackground } from '@ui/hero-bg.js';
import { initDashboardDocente } from '@ui/dashboard-docente.js';
import { getCurrentUser, refreshUserInfo } from '@core/auth.js';

function showDocenteNav() {
  const user = getCurrentUser();
  if (user && user.role === 'docente') {
    ['nav-dashboard-docente', 'mobile-nav-dashboard-docente'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'inline-block';
    });
  }
}

// NUOVO: Mostra (o crea) il link Admin se l'utente è admin
function showAdminNav() {
  const user = getCurrentUser();
  const privilegedEmails = ['canepanerifilippo@gmail.com'];
  const isAdmin = user && (
    user.is_admin === true ||
    user.is_admin === 'true' ||
    user.role === 'admin' ||
    privilegedEmails.includes(user.email)
  );
  if (!isAdmin) return;

  // Helper per aggiungere il link se non esiste
  const addLink = (parentSelector, templateId, linkId, classes = '') => {
    const parentEl = document.querySelector(parentSelector);
    if (!parentEl) return;

    // Se il link esiste già, basta mostrarlo
    let link = document.getElementById(linkId);
    if (link) {
      link.style.display = 'inline-block';
      return;
    }

    // Altrimenti crealo clonando parzialmente il bottone dashboard (se disponibile)
    const ref = document.getElementById(templateId);
    link = document.createElement('a');
    link.href = 'admin.html';
    link.id = linkId;
    link.textContent = 'Admin';
    if (ref) {
      link.className = ref.className;
    } else if (classes) {
      link.className = classes;
    }
    link.style.display = 'inline-block';
    parentEl.appendChild(link);
  };

  // Desktop nav
  addLink('.ritual-actions', 'nav-dashboard', 'nav-admin');
  // Mobile nav
  addLink('.mobile-header-right', 'mobile-nav-dashboard', 'mobile-nav-admin', 'mobile-nav-btn');
}

function domReady(cb) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}

domReady(async () => {
  log('App Mental Commons inizializzata (modulare)');

  // Aggiorna dati utente dal backend (token valido)
  await refreshUserInfo();

  // Mostra il pulsante Dashboard Docente se l'utente è un docente
  showDocenteNav();
  // Mostra il pulsante Admin se l'utente è admin
  showAdminNav();

  const path = window.location.pathname.toLowerCase();
  const isDashboardDocente = path.includes('dashboard-docente');
  const isDashboard = path.includes('dashboard') && !isDashboardDocente;
  const isProfile = path.includes('profile');

  if (path.includes('login.html')) initLogin();
  if (document.getElementById('ucme-form')) initForm();

  // Statistiche sticky globali (visibili su tutte le pagine)
  initStats();

  if (isDashboard) {
    initDashboard();
    initPortatoreUcmeSection();
  }
  if (isProfile) {
    initProfile();
    initPortatoreSection();
  }
  if (isDashboardDocente) {
    initDashboardDocente();
  }

  if (path.includes('admin.html')) initAdmin();

  if (document.getElementById('hero')) initHeroBackground();
}); 