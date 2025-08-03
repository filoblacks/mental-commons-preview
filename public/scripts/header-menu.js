// header-menu.js – nuovo menu mobile minimalista e robusto
// Gestisce la comparsa del menu mobile senza dipendenze esterne

(function(){
  'use strict';

  // Inietta stile mobile header se non già presente
  if(!document.getElementById('mc-mobile-header-style')){
    const style=document.createElement('style');
    style.id='mc-mobile-header-style';
    style.textContent=`
      @media (max-width:768px){
        .top-navigation-container{display:flex;justify-content:space-between;align-items:center;height:60px;padding:0 1rem;background:var(--color-primary);}
        .nav-logo{position:static;transform:none;display:flex;align-items:center;}
        .nav-main,.nav-actions{display:none !important;}
        .hamburger{display:block;font-size:1.75rem;background:none;border:none;color:#fff;cursor:pointer;padding:0.5rem;line-height:1;border-radius:4px;transition:background-color .2s ease;z-index:1200;}
        .hamburger:hover{background-color:rgba(255,255,255,0.1);}
        .mobile-nav{position:absolute;top:60px;right:0;min-width:200px;background:var(--color-primary);padding:0.5rem 0;border-radius:0 0 8px 8px;box-shadow:0 6px 12px rgba(0,0,0,0.3);display:none;flex-direction:column;z-index:1100;}
        .mobile-nav.show{display:flex;animation:slideDown .25s ease-out;}
        .mobile-nav a{padding:0.75rem 1rem;color:#fff;text-decoration:none;transition:background-color .2s ease;}
        .mobile-nav a:hover{background-color:rgba(255,255,255,0.1);}
      }
      @keyframes slideDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
    `;
    document.head.appendChild(style);
  }

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