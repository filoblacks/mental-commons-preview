// public/scripts/lang-toggle-footer.js – standalone, no-module, resiliente
(function bootFooterLang(){
  'use strict';

  function qs(sel) { try { return document.querySelector(sel); } catch { return null; } }
  function qsa(sel) { try { return Array.from(document.querySelectorAll(sel)); } catch { return []; } }

  function markActive(locale){
    qsa('#lang-toggle .lang-btn').forEach((btn)=>{
      const on = btn && btn.getAttribute('data-lang') === locale;
      if (!btn) return;
      btn.classList.toggle('is-active', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function attachHandlers(){
    // Delegation a livello di documento: funziona anche se il footer viene reiniettato
    if (!attachHandlers._bound) {
      document.addEventListener('click', function(e){
        const btn = e.target && e.target.closest && e.target.closest('.site-footer [data-lang]');
        if (!btn) return;
        const next = btn.getAttribute('data-lang');
        try { localStorage.setItem('mc_locale', next); } catch {}
        if (window.__mc_setLocale) {
          try { window.__mc_setLocale(next); } catch {}
        } else {
          try {
            const url = new URL(location.href);
            url.searchParams.set('lang', next);
            location.href = url.toString();
            return;
          } catch {
            location.search = 'lang=' + encodeURIComponent(next);
            return;
          }
        }
        markActive(next);
      });
      attachHandlers._bound = true;
    }
  }

  function onReady(){
    attachHandlers();
    // Aggancia agli eventi del core per stato iniziale e cambi runtime
    try {
      window.addEventListener('mc:i18n:ready', function(ev){ markActive((ev && ev.detail && ev.detail.locale) || 'it'); }, { once: true });
      window.addEventListener('mc:i18n:changed', function(ev){ markActive((ev && ev.detail && ev.detail.locale) || 'it'); });
    } catch {}
    // Stato fallback se il core non emette eventi
    try {
      const guess = (document.documentElement.getAttribute('lang') || 'it').toLowerCase();
      markActive(guess === 'en' ? 'en' : 'it');
    } catch { markActive('it'); }

    // Osserva eventuale iniezione/rimpiazzo del footer per ripristinare lo stato visivo
    try {
      const mo = new MutationObserver(function(){
        const guess = (document.documentElement.getAttribute('lang') || 'it').toLowerCase();
        markActive(guess === 'en' ? 'en' : 'it');
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();


