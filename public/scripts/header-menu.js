// header-menu.js – gestione header e menu mobile rispettando le specifiche 2025
// ⚠️ Nessuna dipendenza, funziona su ogni pagina che possiede .top-navigation-container

(function () {
  'use strict';

  /* --------------------------------------------
   * Configurazione link di navigazione primaria
   * -------------------------------------------- */
  const MENU_LINKS = [
    { href: 'index.html', text: 'Home' },
    { href: 'come-funziona.html', text: 'Come funziona' },
    { href: 'mc-per-le-scuole.html', text: 'MC per le scuole' },
    { href: 'dashboard.html', text: 'Dashboard' },
    { href: 'profile.html', text: 'Profilo' }
  ];

  /* --------------------------------------------
   * Inietta CSS mobile-first solo una volta
   * -------------------------------------------- */
  if (!document.getElementById('mc-mobile-header-style')) {
    const style = document.createElement('style');
    style.id = 'mc-mobile-header-style';
    style.textContent = `
      /* === Mobile Header & Menu === */
      @media (max-width: 768px) {
        .top-navigation-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
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
        .top-navigation-container .nav-actions {
          display: none !important;
        }

        /* Logo */
        .top-navigation-container .nav-logo img {
          height: 28px;
          width: auto;
        }

        /* Hamburger */
        .hamburger {
          background: none;
          border: none;
          font-size: 28px;
          color: #ffffff;
          padding: 8px;
          cursor: pointer;
          z-index: 1001;
        }
        .hamburger:hover { opacity: 0.85; }

        /* Mobile menu */
        .mobile-menu {
          position: absolute;
          top: 64px;
          right: 0;
          width: 220px;
          background: #204a39;
          padding: 16px;
          border-radius: 0 0 0 12px;
          box-shadow: -2px 4px 10px rgba(0, 0, 0, 0.2);
          display: none;
          z-index: 1000;
        }
        .mobile-menu.open { display: block; }

        /* Link menu */
        .mobile-menu a {
          display: block;
          color: #ffffff;
          text-decoration: none;
          padding: 8px 0;
        }
        .mobile-menu a:hover { opacity: 0.85; }
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

    MENU_LINKS.forEach(({ href, text }) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      link.addEventListener('click', closeMenu);
      menu.appendChild(link);
    });

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
