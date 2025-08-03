(function(){
  'use strict';
  
  console.log('🔧 Mobile menu script starting...');
  
  const css = `/* HAMBURGER button */
.hamburger {
  display: none;
  font-size: 1.75rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  z-index: 100;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.hamburger:hover {
  background-color: rgba(255,255,255,0.1);
}

.hamburger:focus {
  outline: 2px solid rgba(255,255,255,0.5);
}

/* MOBILE MENU */
.mobile-nav {
  display: none;
  flex-direction: column;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1f2d1f;
  padding: 1rem;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  border-top: 1px solid rgba(255,255,255,0.1);
}

.mobile-nav.show {
  display: flex !important;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-nav a {
  color: white;
  text-decoration: none;
  margin: 0.5rem 0;
  padding: 0.75rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  font-weight: 400;
}

.mobile-nav a:hover,
.mobile-nav a:focus {
  background-color: rgba(255,255,255,0.1);
}

/* VISIBILITY + LAYOUT ON MOBILE */
@media (max-width: 768px) {
  /* Show burger, hide desktop nav */
  .hamburger { 
    display: block !important; 
    margin-left: auto; 
  }
  .nav-main,
  .nav-actions { 
    display: none !important; 
  }
  
  /* IMPORTANTE: Mostra il logo su mobile nell'header principale */
  .nav-logo {
    display: flex !important;
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    align-items: center;
    z-index: 10;
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

  // Inject CSS
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);
  console.log('✅ CSS injected');

  let isMenuOpen = false;

  function toggleMenu(){
    console.log('🍔 toggleMenu called, current state:', isMenuOpen);
    const menu = document.getElementById('mobileMenu');
    if(!menu) {
      console.error('❌ Mobile menu element not found!');
      return;
    }
    
    isMenuOpen = !isMenuOpen;
    
    if(isMenuOpen) {
      menu.classList.add('show');
      console.log('📱 Menu opened');
    } else {
      menu.classList.remove('show');
      console.log('📱 Menu closed');
    }
  }

  function initMobileMenu(){
    console.log('🚀 Initializing mobile menu...');
    
    const header = document.querySelector('.top-navigation-container');
    if(!header) {
      console.error('❌ Header not found!');
      return;
    }
    
    // Check if already initialized
    if(document.querySelector('.hamburger')) {
      console.log('⚠️ Hamburger already exists, skipping initialization');
      return;
    }

    // Create hamburger button
    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Apri menu di navigazione');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '☰';
    
    // Add click event with multiple fallbacks
    btn.onclick = function(e) {
      console.log('🖱️ Hamburger clicked (onclick)');
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
      
      // Update aria-expanded
      const isExpanded = document.getElementById('mobileMenu')?.classList.contains('show');
      btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    };
    
    btn.addEventListener('click', function(e) {
      console.log('🖱️ Hamburger clicked (addEventListener)');
      e.preventDefault();
      e.stopPropagation();
    });
    
    // Append to header
    header.appendChild(btn);
    console.log('✅ Hamburger button created and added');

    // Create mobile nav menu
    const mobileNav = document.createElement('nav');
    mobileNav.id = 'mobileMenu';
    mobileNav.className = 'mobile-nav';
    mobileNav.setAttribute('aria-hidden', 'true');

    const links = [
      { href: 'index.html', text: 'Home' },
      { href: 'come-funziona.html', text: 'Come funziona' },
      { href: 'mc-per-le-scuole.html', text: 'MC per le scuole' },
      { href: 'dashboard.html', text: 'Dashboard' },
      { href: 'profile.html', text: 'Profilo' }
    ];

    links.forEach(({href, text}) => {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      a.onclick = function() {
        console.log('🔗 Menu link clicked:', text);
        isMenuOpen = false;
        mobileNav.classList.remove('show');
        mobileNav.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
      };
      mobileNav.appendChild(a);
    });

    // Insert menu after header
    header.parentNode.insertBefore(mobileNav, header.nextSibling);
    console.log('✅ Mobile menu created and inserted');
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if(!header.contains(e.target) && !mobileNav.contains(e.target) && isMenuOpen) {
        console.log('🖱️ Clicked outside, closing menu');
        isMenuOpen = false;
        mobileNav.classList.remove('show');
        mobileNav.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    
    console.log('🎉 Mobile menu initialization complete!');
  }

  // Initialize when DOM is ready
  function init() {
    console.log('📋 DOM ready, initializing mobile menu');
    initMobileMenu();
  }

  if(document.readyState === 'loading'){
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('✅ DOM already loaded, initializing immediately');
    init();
  }
  
  // Fallback initialization after a short delay
  setTimeout(() => {
    if(!document.querySelector('.hamburger')) {
      console.log('🔄 Fallback initialization triggered');
      init();
    }
  }, 1000);
  
})();