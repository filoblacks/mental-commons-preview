// header-menu.js – nuovo menu mobile minimalista e robusto
// Gestisce la comparsa del menu mobile senza dipendenze esterne

(function(){
  'use strict';

  // Configurazione link menu
  const LINKS = [
    { href: 'index.html', text: 'Home' },
    { href: 'come-funziona.html', text: 'Come funziona' },
    { href: 'mc-per-le-scuole.html', text: 'MC per le scuole' },
    { href: 'dashboard.html', text: 'Dashboard' },
    { href: 'profile.html', text: 'Profilo' }
  ];

  /**
   * Inizializza header mobile: hamburger + nav verticale
   */
  function initHeaderMenu(){
    const header = document.querySelector('.top-navigation-container');
    if(!header){ return; }

    // Evita doppie inizializzazioni
    if(header.querySelector('.hamburger')){ return; }

    /* --------------------------------------------------
     * 1. Bottone Hamburger
     * -------------------------------------------------- */
    const burger = document.createElement('button');
    burger.className = 'hamburger';
    burger.setAttribute('aria-label', 'Apri menu di navigazione');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '\u2630'; // ☰

    /* --------------------------------------------------
     * 2. Menu Mobile (nav)
     * -------------------------------------------------- */
    const mobileNav = document.createElement('nav');
    mobileNav.id = 'mobileMenu';
    mobileNav.className = 'mobile-nav';
    mobileNav.setAttribute('aria-hidden', 'true');

    LINKS.forEach(({href, text}) => {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      // Chiude il menu al click sul link
      a.addEventListener('click', closeMenu);
      mobileNav.appendChild(a);
    });

    // Inserisci elementi nel DOM
    header.appendChild(burger);
    header.parentNode.insertBefore(mobileNav, header.nextSibling);

    /* --------------------------------------------------
     * 3. Gestione eventi
     * -------------------------------------------------- */
    burger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });

    // Chiudi cliccando fuori dal menu
    document.addEventListener('click', (e) => {
      if(!mobileNav.contains(e.target) && !burger.contains(e.target)){
        closeMenu();
      }
    });

    // Chiudi con ESC
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape'){
        closeMenu();
      }
    });

    /* --------------------------------------------------
     * Funzioni helper
     * -------------------------------------------------- */
    function toggleMenu(){
      const isOpen = mobileNav.classList.toggle('show');
      burger.setAttribute('aria-expanded', isOpen);
      mobileNav.setAttribute('aria-hidden', !isOpen);
    }

    function closeMenu(){
      if(mobileNav.classList.contains('show')){
        mobileNav.classList.remove('show');
        burger.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('aria-hidden', 'true');
      }
    }
  }

  // Avvia quando il DOM è pronto
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initHeaderMenu);
  } else {
    initHeaderMenu();
  }
})();