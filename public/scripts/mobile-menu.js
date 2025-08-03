(function(){
  const css = `/* HAMBURGER button */
.hamburger {
  display: none;
  font-size: 1.75rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  line-height: 1;
  z-index: 100;
}

/* MOBILE MENU */
.mobile-nav {
  display: none;
  flex-direction: column;
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: #1f2d1f;
  padding: 1rem;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.mobile-nav a {
  color: white;
  text-decoration: none;
  margin: 0.5rem 0;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.mobile-nav a:hover {
  background-color: rgba(255,255,255,0.1);
}

/* VISIBILITY + LAYOUT ON MOBILE */
@media (max-width: 768px) {
  /* Show burger, hide desktop nav */
  .hamburger { 
    display: block; 
    margin-left: auto; 
  }
  .nav-main,
  .nav-actions { 
    display: none !important; 
  }
  .mobile-nav.show { 
    display: flex; 
  }
  
  /* IMPORTANTE: Mostra il logo su mobile nell'header principale */
  .nav-logo {
    display: flex !important;
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    align-items: center;
  }
  
  /* Nasconde l'header mobile legacy COMPLETAMENTE */
  .mobile-header { 
    display: none !important; 
  }
  
  /* Header layout fix: logo a sinistra, burger a destra */
  .top-navigation-container {
    justify-content: space-between;
    padding-left: 1rem;
    padding-right: 1rem;
    position: relative;
  }
}
`;

  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  function toggleMenu(){
    const menu = document.getElementById('mobileMenu');
    if(menu){ 
      menu.classList.toggle('show');
      console.log('Menu toggled, current state:', menu.classList.contains('show'));
    } else {
      console.error('Mobile menu not found!');
    }
  }
  window.toggleMenu = toggleMenu;

  function initMobileMenu(){
    const header = document.querySelector('.top-navigation-container');
    if(!header) {
      console.error('Header not found!');
      return;
    }
    if(document.querySelector('.hamburger')) {
      console.log('Hamburger already exists');
      return; // già creato
    }

    console.log('Initializing mobile menu...');

    // Crea pulsante hamburger
    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Apri menu di navigazione');
    btn.innerHTML = '☰';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Hamburger clicked!');
      toggleMenu();
    });
    
    // Inseriamo il burger come ultimo elemento dell'header per allinearlo a destra
    header.appendChild(btn);
    console.log('Hamburger button added');

    // Crea menu verticale
    const mobileNav = document.createElement('nav');
    mobileNav.id = 'mobileMenu';
    mobileNav.className = 'mobile-nav';

    const links = [
      { href: 'index.html', text: 'Home' },
      { href: 'come-funziona.html', text: 'Come funziona' },
      { href: 'mc-per-le-scuole.html', text: 'MC per le scuole' },
      { href: 'dashboard.html', text: 'Dashboard' },
      { href: 'profile.html', text: 'Profilo' }
    ];

    links.forEach(({href,text})=>{
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      a.addEventListener('click', function() {
        console.log('Menu link clicked:', text);
        mobileNav.classList.remove('show');
      });
      mobileNav.appendChild(a);
    });

    header.insertAdjacentElement('afterend', mobileNav);
    console.log('Mobile menu created and inserted');
  }

  // Debug: log when script runs
  console.log('Mobile menu script loading...');

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing mobile menu');
      initMobileMenu();
    });
  } else {
    console.log('DOM already loaded, initializing mobile menu immediately');
    initMobileMenu();
  }
})();