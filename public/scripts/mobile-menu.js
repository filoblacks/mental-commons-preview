(function(){
  const css = `/* HAMBURGER button */
.hamburger {
  display: none;
  font-size: 1.5rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
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
}

.mobile-nav a {
  color: white;
  text-decoration: none;
  margin: 0.5rem 0;
}

/* VISIBILITY ON MOBILE */
@media (max-width: 768px) {
  .hamburger {
    display: block;
  }
  .nav-main,
  .nav-actions {
    display: none !important;
  }
  .mobile-nav.show {
    display: flex;
  }
  /* Nasconde l'header mobile legacy */
  .mobile-header { display: none !important; }
}`;

  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  function toggleMenu(){
    const menu = document.getElementById('mobileMenu');
    if(menu){ menu.classList.toggle('show'); }
  }
  window.toggleMenu = toggleMenu;

  function initMobileMenu(){
    const header = document.querySelector('.top-navigation-container');
    if(!header) return;
    if(document.querySelector('.hamburger')) return; // già creato

    // Crea pulsante hamburger
    const logo = header.querySelector('.nav-logo');
    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.textContent = '☰';
    btn.addEventListener('click', toggleMenu);
    if(logo){ logo.insertAdjacentElement('afterend', btn); }
    else { header.prepend(btn); }

    // Crea menu verticale
    const mobileNav = document.createElement('nav');
    mobileNav.id = 'mobileMenu';
    mobileNav.className = 'mobile-nav';

    const links = [
      { href: 'index.html', text: 'Home' },
      { href: 'come-funziona.html', text: 'Come funziona' },
      { href: 'mc-per-le-scuole.html', text: 'MC per le scuole' },
      { href: 'dashboard.html', text: 'Dashboard' },
      { href: 'profile.html', text: 'Profilo' },
      { href: 'admin.html', text: 'Admin' }
    ];
    links.forEach(({href,text})=>{
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      mobileNav.appendChild(a);
    });

    header.insertAdjacentElement('afterend', mobileNav);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }
})();