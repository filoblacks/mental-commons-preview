// DEPRECATED: spostato in /core/i18n.js per build Vite/Vercel
// Questo file resta per compatibilità durante la migrazione ma non viene più usato.
// Importare sempre da '/core/i18n.js'

let translations = {};
export let currentLocale = 'it';

const LOCALE_KEY = 'mc_locale';
const SUPPORTED = new Set(['it', 'en']);

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days = 365, path = '/') {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=${path}`;
}

function getPersistedLocale() {
  try {
    const ls = localStorage.getItem(LOCALE_KEY);
    if (ls && SUPPORTED.has(ls)) return ls;
  } catch {}
  const cookie = getCookie(LOCALE_KEY);
  if (cookie && SUPPORTED.has(cookie)) return cookie;
  return null;
}

function setPersistedLocale(locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {}
  setCookie(LOCALE_KEY, locale, 365, '/');
}

function detectBrowserLocale() {
  const lang = (navigator.language || navigator.userLanguage || 'it').toLowerCase();
  return lang.startsWith('en') ? 'en' : 'it';
}

function getUrlLocaleOverride() {
  const params = new URLSearchParams(window.location.search);
  const q = (params.get('lang') || '').toLowerCase();
  if (SUPPORTED.has(q)) return q;
  return null;
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function interpolate(str, vars = {}) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function t(key, vars = {}) {
  const raw = getByPath(translations, key);
  if (raw === undefined) {
    console.warn(`[i18n] Missing key: ${key}`);
    return key;
  }
  if (typeof raw === 'string') return interpolate(raw, vars);
  // If object provided, try common fields like label/placeholder
  if (raw && typeof raw === 'object') {
    const preferred = raw.label || raw.title || raw.text || raw.placeholder || raw.value;
    if (typeof preferred === 'string') return interpolate(preferred, vars);
  }
  return String(raw);
}

export async function initI18n(localeOverride = null) {
  let locale = localeOverride || getUrlLocaleOverride() || getPersistedLocale() || detectBrowserLocale();
  if (!SUPPORTED.has(locale)) locale = 'it';

  // If URL override present, persist it (one-time)
  const urlOverride = getUrlLocaleOverride();
  if (urlOverride && urlOverride !== getPersistedLocale()) {
    setPersistedLocale(urlOverride);
  }

  // Load dictionary
  try {
    const res = await fetch(`/locales/${locale}.json`, { cache: 'no-store' });
    translations = await res.json();
  } catch (err) {
    console.warn('[i18n] Failed to load locale file, falling back to empty dict', err);
    translations = {};
  }

  currentLocale = locale;
  try { document.documentElement.lang = locale; } catch {}
  setPersistedLocale(locale);

  applyDom();
  markActiveLanguage(locale);

  try {
    // Expose helpers for non-module scripts (e.g., header-menu.js)
    window.__mc_applyI18n = applyDom;
    window.__mc_setLocale = setLocale;
  } catch {}
}

export function setLocale(locale) {
  if (!SUPPORTED.has(locale)) return;
  setPersistedLocale(locale);
  // Re-run init to reload dictionary and re-render DOM
  initI18n(locale);
}

export function applyDom() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = t(key);
    const attrSpec = el.getAttribute('data-i18n-attr');
    if (attrSpec) {
      attrSpec.split('|').map((s) => s.trim()).filter(Boolean).forEach((attr) => {
        el.setAttribute(attr, val);
      });
    } else {
      el.textContent = val;
    }
  });
}

function markActiveLanguage(locale) {
  const itBtn = document.getElementById('lang-it');
  const enBtn = document.getElementById('lang-en');
  itBtn && itBtn.classList.toggle('is-active', locale === 'it');
  enBtn && enBtn.classList.toggle('is-active', locale === 'en');
}

// -----------------------------
// Intl Helpers (Locale-aware)
// -----------------------------

export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(currentLocale, options).format(d);
}

export function formatCurrency(amount, currency = 'EUR', options = {}) {
  try {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency,
      ...options,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatRelative(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('dates.relative.today');
  if (diffDays === 1) return t('dates.relative.yesterday');
  return t('dates.relative.days_ago', { count: diffDays });
}


