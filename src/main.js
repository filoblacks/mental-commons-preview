import { initDashboard } from '../ui/dashboard.js';
import { initProfile } from '../ui/profile.js';
import { initForm } from '../ui/form.js';
import { initLogin } from '../ui/login.js';
import { initStats } from '../ui/stats.js';
import { initPortatoreSection } from '../ui/portatore.js';
import { initAdmin } from '../ui/admin.js';
import { initPortatoreUcmeSection } from '../ui/ucme-portatore.js';
import { log } from '../core/logger.js';
import { initHeroBackground } from '../ui/hero-bg.js';
import { initDashboardDocente } from '../ui/dashboard-docente.js';

function domReady(cb) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}

domReady(() => {
  log('App Mental Commons inizializzata (modulare)');

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