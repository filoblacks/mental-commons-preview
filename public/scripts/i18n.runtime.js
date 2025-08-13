(function(){
  'use strict';

  const SUPPORTED = new Set(['it','en']);
  const STORAGE_KEYS = ['mc_locale','lang'];

  function getQueryLocale(){
    try {
      const qp = new URLSearchParams(location.search).get('lang');
      return qp && SUPPORTED.has(qp) ? qp : null;
    } catch { return null; }
  }

  function getPersistedLocale(){
    for (const k of STORAGE_KEYS) {
      try {
        const v = localStorage.getItem(k);
        if (SUPPORTED.has(v)) return v;
      } catch {}
    }
    return null;
  }

  function detectBrowserLocale(){
    try {
      const nav = navigator.language || '';
      if (String(nav || '').toLowerCase().startsWith('en')) return 'en';
    } catch {}
    return 'it';
  }

  function persistLocale(locale){
    try {
      document.cookie = `locale=${locale};path=/;max-age=${60*60*24*365};SameSite=Lax`;
    } catch {}
    for (const k of STORAGE_KEYS) {
      try { localStorage.setItem(k, locale); } catch {}
    }
    try { document.documentElement.lang = locale; } catch {}
  }

  function cleanLangFromUrl(){
    try {
      const url = new URL(location.href);
      url.searchParams.delete('lang');
      history.replaceState({}, '', url.pathname + url.hash);
    } catch {}
  }

  function applyTranslations(dict){
    try {
      document.querySelectorAll('[data-i18n]').forEach(function(el){
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        // deep get
        const val = key.split('.').reduce((acc,k)=>acc && acc[k]!=null ? acc[k] : undefined, dict);
        if (val == null) return;
        const str = typeof val === 'object'
          ? String(val.label || val.title || val.text || val.placeholder || val.value || '')
          : String(val);
        const attrSpec = el.getAttribute('data-i18n-attr');
        if (attrSpec) {
          attrSpec.split('|').map(s=>s.trim()).filter(Boolean).forEach(attr=>{
            el.setAttribute(attr, str);
          });
        } else {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
            el.setAttribute('placeholder', str);
          } else {
            el.textContent = str;
          }
        }
      });
    } catch (e) {
      console.error('[i18n]', e);
    }
  }

  (function boot(){
    const qs = getQueryLocale();
    let locale = qs || getPersistedLocale() || detectBrowserLocale();
    if (!SUPPORTED.has(locale)) locale = 'it';

    persistLocale(locale);

    if (qs) cleanLangFromUrl();

    fetch(`/locales/${locale}.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`Locale file missing: ${locale}`)))
      .then(dict => {
        applyTranslations(dict);
        try { window.dispatchEvent(new CustomEvent('mc:i18n:ready', { detail: { locale } })); } catch {}
      })
      .catch(err => console.error('[i18n]', err));
  })();
})();


