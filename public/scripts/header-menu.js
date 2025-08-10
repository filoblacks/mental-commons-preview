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
      .nav-lang { display: flex; align-items: center; gap: .25rem; }
      .nav-lang button { 
        background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.9); 
        border-radius: 6px; padding: 4px 8px; font-weight: 600; cursor: pointer;
      }
      .nav-lang .divider { color: #fff; opacity: 0.9; margin: 0 4px; }
      .nav-lang button.is-active { background: #fff; color: #204a39; }

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

        /* Right cluster (burger + lang) */
        .mobile-header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        /* Forza visibilità anche se la pagina non imposta .auth-ready */
        html:not(.auth-ready) .mobile-header-right { visibility: visible !important; }
        html:not(.auth-ready) .nav-lang { visibility: visible !important; }
        .hamburger { display: inline-flex; background: none; border: none; font-size: 24px; color: #ffffff; padding: 6px; cursor: pointer; z-index: 1001; }
        .hamburger:hover { opacity: 0.85; }
        .mobile-header-right .nav-lang { margin-left: 0; }

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
    if (!header) return;

    // Evita doppie inizializzazioni
    if (header.querySelector('.hamburger')) return;

    /* === Cluster destro (burger + nav-lang) === */
    const rightCluster = document.createElement('div');
    rightCluster.className = 'mobile-header-right';

    const existingNavLang = header.querySelector('.nav-lang');
    let navLang = existingNavLang;
    const createdNavLang = !navLang;
    if (!navLang) {
      navLang = document.createElement('nav');
      navLang.className = 'nav-lang';
      navLang.innerHTML = `
        <button type="button" id="lang-it" aria-label="Italiano">IT</button>
        <span class="divider">/</span>
        <button type="button" id="lang-en" aria-label="English">EN</button>
      `;
    }

    const burger = document.createElement('button');
    burger.className = 'hamburger';
    burger.setAttribute('aria-label', 'Menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '&#9776;'; // ☰

    /* === Menu mobile === */
    const menu = document.createElement('nav');
    menu.id = 'mobileMenu';
    menu.className = 'mobile-menu';
    menu.setAttribute('aria-hidden', 'true');

    MENU_LINKS.forEach(({ href, text, key }) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      if (key) link.setAttribute('data-i18n', key);
      link.addEventListener('click', closeMenu);
      menu.appendChild(link);
    });

    // Aggiunge switch lingua anche in fondo al menu mobile (duplicato per accesso rapido)
    const langFooter = document.createElement('div');
    langFooter.style.marginTop = 'auto';
    langFooter.innerHTML = `
      <nav class="nav-lang">
        <button type="button" id="lang-it-mobile" aria-label="Italiano">IT</button>
        <span class="divider">/</span>
        <button type="button" id="lang-en-mobile" aria-label="English">EN</button>
      </nav>`;
    menu.appendChild(langFooter);

    // Wiring cambio lingua anche sul menu mobile (usa API global esposte da i18n)
    const itMobile = langFooter.querySelector('#lang-it-mobile');
    const enMobile = langFooter.querySelector('#lang-en-mobile');
    itMobile && itMobile.addEventListener('click', () => {
      if (window.__mc_setLocale) window.__mc_setLocale('it');
      closeMenu();
    });
    enMobile && enMobile.addEventListener('click', () => {
      if (window.__mc_setLocale) window.__mc_setLocale('en');
      closeMenu();
    });

    // Se i18n è già inizializzato, applica traduzioni anche agli elementi appena creati
    if (window.__mc_applyI18n) {
      try { window.__mc_applyI18n(); } catch (_) {}
    }

    // Inserimento nel DOM: su mobile mettiamo nav-lang nel cluster destro; su desktop dentro .nav-actions
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const actions = header.querySelector('.nav-actions');
    const ritualActions = header.querySelector('.ritual-actions');
    if (isMobile) {
      rightCluster.appendChild(navLang);
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    } else if (actions) {
      actions.appendChild(navLang);
      // Burger resta nel cluster ma è nascosto su desktop
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    } else if (ritualActions) {
      ritualActions.appendChild(navLang);
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    } else {
      rightCluster.appendChild(navLang);
      rightCluster.appendChild(burger);
      header.appendChild(rightCluster);
    }
    header.parentNode.insertBefore(menu, header.nextSibling);

    // Se abbiamo creato noi i bottoni lingua, aggiungi i listener
    if (createdNavLang) {
      const itBtn = navLang.querySelector('#lang-it');
      const enBtn = navLang.querySelector('#lang-en');
      itBtn && itBtn.addEventListener('click', function(){ if (window.__mc_setLocale) window.__mc_setLocale('it'); });
      enBtn && enBtn.addEventListener('click', function(){ if (window.__mc_setLocale) window.__mc_setLocale('en'); });
    }

    // Sincronizza stato attivo dei bottoni in base alla lingua salvata
    try {
      const persisted = (localStorage.getItem('lang') || localStorage.getItem('mc_locale') || '').trim() || 'it';
      const itBtn = navLang.querySelector('#lang-it');
      const enBtn = navLang.querySelector('#lang-en');
      if (itBtn && enBtn) {
        itBtn.classList.toggle('is-active', persisted === 'it');
        enBtn.classList.toggle('is-active', persisted === 'en');
      }
    } catch (_) {}

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
    }

    function closeMenu() {
      if (menu.classList.contains('open')) {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = '&#9776;';
        menu.setAttribute('aria-hidden', 'true');
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
