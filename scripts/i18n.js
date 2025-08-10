// scripts/i18n.js – Runtime i18n leggero per pagine statiche (no module)
// Requisiti: /locales/it.json, /locales/en.json, data-i18n="key.path" e opzionale data-i18n-attr="title|aria-label"
// API globali esposte: window.setLanguage(lang), window.__mc_setLocale(lang), window.__mc_applyI18n()

(function () {
  'use strict';

  var SUPPORTED = { it: true, en: true };
  var LOCALE_KEY_PRIMARY = 'lang';
  var LOCALE_KEY_COMPAT = 'mc_locale';
  var currentLocale = null;
  var dict = {};
  var isApplying = false;

  function getPersistedLocale() {
    try {
      var l = localStorage.getItem(LOCALE_KEY_PRIMARY) || localStorage.getItem(LOCALE_KEY_COMPAT);
      if (l && SUPPORTED[l]) return l;
    } catch (_) {}
    return null;
  }

  function persistLocale(locale) {
    try {
      localStorage.setItem(LOCALE_KEY_PRIMARY, locale);
      localStorage.setItem(LOCALE_KEY_COMPAT, locale); // sync con core/i18n.js
    } catch (_) {}
    try { document.documentElement.lang = locale; } catch (_) {}
  }

  function detectBrowserLocale() {
    try {
      var list = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language || 'it'];
      var lowered = list.map(function (l) { return String(l || '').toLowerCase(); });
      if (lowered.some(function (l) { return l.startsWith('en'); })) return 'en';
      if (lowered.some(function (l) { return l.startsWith('it'); })) return 'it';
    } catch (_) {}
    return 'it';
  }

  function getInitialLocale() {
    var persisted = getPersistedLocale();
    if (persisted && SUPPORTED[persisted]) return persisted;
    var detected = detectBrowserLocale();
    return SUPPORTED[detected] ? detected : 'it';
  }

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce(function (acc, k) {
      return acc && (acc[k] !== undefined) ? acc[k] : undefined;
    }, obj);
  }

  function interpolate(str, vars) {
    if (typeof str !== 'string') return str;
    vars = vars || {};
    return str.replace(/\{(\w+)\}/g, function (_, k) {
      return (k in vars) ? String(vars[k]) : '{' + k + '}';
    });
  }

  function t(key, vars) {
    var raw = getByPath(dict, key);
    if (raw === undefined) {
      if (!window.isProduction) console.warn('[i18n] Missing key:', key);
      return key;
    }
    if (typeof raw === 'string') return interpolate(raw, vars);
    if (raw && typeof raw === 'object') {
      var preferred = raw.label || raw.title || raw.text || raw.placeholder || raw.value;
      return interpolate(String(preferred != null ? preferred : key), vars);
    }
    return String(raw);
  }

  function applyDom(root) {
    if (isApplying) return; // previeni re-entrancy in mutation observer
    isApplying = true;
    try {
      var scope = root && root.querySelectorAll ? root : document;
      var nodes = scope.querySelectorAll('[data-i18n]');
      nodes.forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (!key) return;
        var val = t(key);
        var attrSpec = el.getAttribute('data-i18n-attr');
        if (attrSpec) {
          attrSpec.split('|').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (attr) {
            el.setAttribute(attr, val);
          });
        } else {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
            // Per input/select senza attr specifico, usa placeholder come default
            el.setAttribute('placeholder', val);
          } else {
            el.textContent = val;
          }
        }
      });
    } finally {
      isApplying = false;
    }
  }

  function markActiveLanguage(locale) {
    var itBtn = document.getElementById('lang-it');
    var enBtn = document.getElementById('lang-en');
    if (itBtn) itBtn.classList.toggle('is-active', locale === 'it');
    if (enBtn) enBtn.classList.toggle('is-active', locale === 'en');
  }

  function wireHeaderButtons() {
    var itBtn = document.getElementById('lang-it');
    var enBtn = document.getElementById('lang-en');
    if (itBtn) itBtn.addEventListener('click', function () { setLanguage('it'); });
    if (enBtn) enBtn.addEventListener('click', function () { setLanguage('en'); });
  }

  function fetchDict(locale) {
    var ts = Date.now();
    var url = '/locales/' + locale + '.json?v=' + ts;
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function setLanguage(locale) {
    if (!SUPPORTED[locale]) return;
    if (currentLocale === locale && dict && Object.keys(dict).length) {
      persistLocale(locale);
      applyDom();
      markActiveLanguage(locale);
      return;
    }
    fetchDict(locale).then(function (json) {
      dict = json || {};
      currentLocale = locale;
      persistLocale(locale);
      applyDom();
      markActiveLanguage(locale);
    }).catch(function (err) {
      console.error('[i18n] Impossibile caricare le traduzioni', err);
    });
  }

  function init() {
    // MutationObserver per tradurre nodi aggiunti dinamicamente (es. menu mobile)
    try {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'childList') {
            m.addedNodes.forEach(function (n) {
              if (n && n.nodeType === 1) applyDom(n);
            });
          } else if (m.type === 'attributes' && m.target && m.target.hasAttribute && m.target.hasAttribute('data-i18n')) {
            applyDom(m.target);
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-i18n'] });
    } catch (_) {}

    wireHeaderButtons();
    var initial = getInitialLocale();
    setLanguage(initial);

    // Espone API globali
    try {
      window.setLanguage = setLanguage;
      window.__mc_setLocale = setLanguage; // compat con header-menu.js
      window.__mc_applyI18n = applyDom;
      window.i18n = { t: t };
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


