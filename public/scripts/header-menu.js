// header-menu.js – gestione header e menu mobile rispettando le specifiche 2025
// ⚠️ Nessuna dipendenza, funziona su ogni pagina che possiede .top-navigation-container

(function () {
  'use strict';

  /* --------------------------------------------
   * Configurazione link di navigazione primaria
   * -------------------------------------------- */
  const MENU_LINKS = [
    { href: 'index.html', text: 'Home', key: 'nav.home' },
    { href: 'come-funziona.html', text: 'Come funziona', key: 'nav.how_it_works' },
    { href: 'mc-per-le-scuole.html', text: 'MC per le scuole', key: 'nav.schools' },
    { href: 'premium.html', text: 'Premium', key: 'nav.premium' },
    { href: 'dashboard.html', text: 'Dashboard', key: 'nav.dashboard' },
    { href: 'profile.html', text: 'Profilo', key: 'profile.header.title' }
  ];

  /* --------------------------------------------
   * Inietta CSS mobile-first solo una volta
   * -------------------------------------------- */
  if (!document.getElementById('mc-mobile-header-style')) {
    const style = document.createElement('style');
    style.id = 'mc-mobile-header-style';
    style.textContent = `
      /* Desktop: hamburger e mobile-menu nascosti */
      .mobile-menu { display:none; }
      .hamburger { display: none; }

      /* === Mobile Header & Menu (side-nav) === */
      @media (max-width: 768px) {
        .top-navigation-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: 64px;
          padding: 0 16px;
          background: #204a39;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999;
        }
        /* Disattiva navigazione desktop */
        .top-navigation-container .nav-main,
        .top-navigation-container .nav-actions { display: none !important; }

        /* Logo */
        .top-navigation-container .nav-logo img { height: 28px; width: auto; }

        /* Right cluster (burger only) */
        .mobile-header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .hamburger { display: inline-flex; background: none; border: none; font-size: 24px; color: #ffffff; padding: 6px; cursor: pointer; z-index: 1001; }
        .hamburger:hover { opacity: 0.85; }

        /* Mobile menu – side drawer */
        .mobile-menu {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 70vw;
          max-width: 320px;
          background: #204a39;
          padding: 24px 16px;
          box-shadow: -4px 0 12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s ease-in-out;
          z-index: 1000;
        }
        .mobile-menu.open { transform: translateX(0); }

        /* Link menu */
        .mobile-menu a {
          color: #ffffff;
          text-decoration: none;
          padding: 18px 0;
          font-size: 18px;
          font-weight: 600;
          opacity: 1 !important;
        }
        .mobile-menu a:hover { opacity: 0.9; }
      }
    `;
    document.head.appendChild(style);
  }

  /* --------------------------------------------
   * Inizializza header mobile
   * -------------------------------------------- */
  function initMobileHeader() {
    const header = document.querySelector('.top-navigation-container');

    // Se l'header non è ancora presente (es. inserito dinamicamente) osserva il DOM
    if (!header) {
      const pendingObserver = new MutationObserver((mutations, obs) => {
        const lateHeader = document.querySelector('.top-navigation-container');
        if (lateHeader) {
          obs.disconnect();
          initMobileHeader(); // riprova ora che l'header esiste
        }
      });
      pendingObserver.observe(document.body, { childList: true, subtree: true });
      return;
    }

    // Evita doppie inizializzazioni
    if (header.querySelector('.hamburger')) return;

    /* === Cluster destro (burger) === */
    const rightCluster = document.createElement('div');
    rightCluster.className = 'mobile-header-right';

    const burger = document.createElement('button');
    burger.className = 'hamburger';
    burger.setAttribute('aria-label', 'Menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'mobileMenu');
    burger.innerHTML = '&#9776;'; // ☰

    /* === Menu mobile === */
    const menu = document.createElement('nav');
    menu.id = 'mobileMenu';
    menu.className = 'mobile-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('role', 'menu');

    MENU_LINKS.forEach(({ href, text, key }) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      if (key) link.setAttribute('data-i18n', key);
      link.addEventListener('click', closeMenu);
      menu.appendChild(link);
    });

    // Se i18n è già inizializzato, applica traduzioni anche agli elementi appena creati
    if (window.__mc_applyI18n) {
      try { window.__mc_applyI18n(); } catch (_) {}
    }

    // Inserimento nel DOM: su mobile mettiamo burger nel cluster destro
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const actionsSingular = header.querySelector('.nav-action');
    const actions = header.querySelector('.nav-actions');
    const ritualActions = header.querySelector('.ritual-actions');
    if (isMobile) {
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    } else if (actionsSingular) {
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    } else if (actions) {
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    } else if (ritualActions) {
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    } else {
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    }
    header.parentNode.insertBefore(menu, header.nextSibling);

    /* === Event Listeners === */
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Chiudi cliccando fuori dal menu
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !burger.contains(e.target)) {
        closeMenu();
      }
    });

    // Chiudi con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    /* === Helpers === */
    function toggleMenu() {
      const isOpen = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      burger.innerHTML = isOpen ? '&#10005;' : '&#9776;'; // ✕ o ☰
      menu.setAttribute('aria-hidden', !isOpen);

      // Gestione focus: porta il focus sul primo link all'apertura e restituiscilo al burger alla chiusura
      if (isOpen) {
        const firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      } else {
        burger.focus();
      }
    }

    function closeMenu() {
      if (menu.classList.contains('open')) {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = '&#9776;';
        menu.setAttribute('aria-hidden', 'true');
        burger.focus();
      }
    }
  }

  // Avvia quando il DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileHeader);
  } else {
    initMobileHeader();
  }
})();
