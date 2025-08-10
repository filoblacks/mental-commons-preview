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
      /* Nasconde il menu mobile di default su viewport desktop */
      .mobile-menu { display:none; }

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

        /* Hamburger */
        .hamburger {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 24px;
          color: #ffffff;
          padding: 6px;
          cursor: pointer;
          z-index: 1001;
        }
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
    if (!header) return;

    // Evita doppie inizializzazioni
    if (header.querySelector('.hamburger')) return;

    /* === Bottone hamburger === */
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

    // Aggiunge switch lingua in fondo al menu mobile
    const langNav = document.createElement('div');
    langNav.style.marginTop = 'auto';
    langNav.innerHTML = `
      <nav class="nav-lang">
        <button type="button" id="lang-it-mobile" aria-label="Italiano">IT</button>
        <span class="divider">/</span>
        <button type="button" id="lang-en-mobile" aria-label="English">EN</button>
      </nav>`;
    menu.appendChild(langNav);

    // Wiring cambio lingua anche sul menu mobile (usa API global esposte da i18n)
    const itMobile = langNav.querySelector('#lang-it-mobile');
    const enMobile = langNav.querySelector('#lang-en-mobile');
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

    // Inserimento nel DOM
    header.appendChild(burger);
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
