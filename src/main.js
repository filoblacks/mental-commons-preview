import { initDashboard } from '../ui/dashboard.js';
import { initProfile } from '../ui/profile.js';
import { initForm } from '../ui/form.js';
import { initLogin } from '../ui/login.js';
import { initStats } from '../ui/stats.js';
import { initPortatoreSection } from '../ui/portatore.js';
import { initAdmin } from '../ui/admin.js';
import { initPortatoreUcmeSection } from '../ui/ucme-portatore.js';
import { log } from '../core/logger.js';

function domReady(cb) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb);
  } else {
    cb();
  }
}

domReady(() => {
  log('App Mental Commons inizializzata (modulare)');

  const path = window.location.pathname;
  if (path.includes('dashboard.html')) {
    initDashboard();
    initPortatoreUcmeSection();
  }
  if (path.includes('profile.html')) {
    initProfile();
    initPortatoreSection();
  }
  if (path.includes('login.html')) initLogin();
  if (document.getElementById('ucme-form')) initForm();

  // Statistiche sticky globali (visibili su tutte le pagine)
  initStats();

  if (path.includes('admin.html')) initAdmin();
}); 