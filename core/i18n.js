// core/i18n.js – Runtime i18n robusto con applicazione DOM prima della pulizia URL

const SUPPORTED = new Set(['it', 'en']);
const LOCALE_KEY = 'mc_locale';
let CURRENT_LOCALE = 'it';
let DICT = {};
let IS_INITIALIZED = false;

function persistLocale(locale) {
  try { localStorage.setItem(LOCALE_KEY, locale); } catch {}
  try {
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `${LOCALE_KEY}=${encodeURIComponent(locale)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
  } catch {}
  try { document.documentElement.lang = locale; } catch {}
}

export function getQueryLocale() {
  try {
    const params = new URLSearchParams(location.search);
    const l = params.get('lang');
    return SUPPORTED.has(l) ? l : null;
  } catch {
    return null;
  }
}

function detectBrowserLocale() {
  const lang = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage) || 'it').toLowerCase();
  return lang.startsWith('en') ? 'en' : 'it';
}

export function getLocale() {
  return CURRENT_LOCALE;
}

export function t(key, fallback = '') {
  const value = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), DICT);
  if (value == null) {
    console.warn('[i18n] Missing key:', key);
    return fallback || key;
  }
  return value && typeof value === 'object'
    ? String(value.label || value.title || value.text || value.placeholder || value.value || fallback || key)
    : String(value);
}

export function applyDom() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = t(key);
    const attrSpec = el.getAttribute('data-i18n-attr');
    if (attrSpec) {
      attrSpec
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((attr) => { el.setAttribute(attr, val); });
    } else {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        el.setAttribute('placeholder', val);
      } else {
        el.textContent = val;
      }
    }
  });
}

function markActiveLanguage(locale) {
  const itBtn = document.getElementById('lang-it') || document.querySelector('#lang-toggle [data-lang="it"]');
  const enBtn = document.getElementById('lang-en') || document.querySelector('#lang-toggle [data-lang="en"]');
  if (itBtn) itBtn.classList.toggle('is-active', locale === 'it');
  if (enBtn) enBtn.classList.toggle('is-active', locale === 'en');
}

export async function setLocale(locale, { apply = false } = {}) {
  if (!locale || locale === CURRENT_LOCALE || !SUPPORTED.has(locale)) return CURRENT_LOCALE;
  CURRENT_LOCALE = locale;
  persistLocale(locale);

  const url = `/locales/${locale}.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`[i18n] Cannot load ${url} (${res.status})`);
  DICT = await res.json();

  if (apply) {
    applyDom();
    markActiveLanguage(locale);
  }

  // Esponi API globali per script non-modulari
  try {
    window.__mc_applyI18n = applyDom;
    window.__mc_setLocale = (l) => setLocale(l, { apply: true });
  } catch {}

  return CURRENT_LOCALE;
}

export async function initI18n() {
  if (IS_INITIALIZED) return CURRENT_LOCALE;
  const qs = getQueryLocale();
  const persisted = (() => { try { return localStorage.getItem(LOCALE_KEY); } catch { return null; } })();
  const detected = detectBrowserLocale();
  const resolved = qs || (SUPPORTED.has(persisted) ? persisted : null) || detected;

  try { console.info('[i18n/core/init]', { override: qs, persisted, detected, resolved }); } catch {}

  await setLocale(resolved, { apply: true });
  IS_INITIALIZED = true;

  // Pulizia URL SOLO dopo applicazione e SOLO se c'era ?lang
  if (qs) {
    try {
      const cleanUrl = location.pathname + location.hash;
      history.replaceState(null, '', cleanUrl);
    } catch {}
  }
  return CURRENT_LOCALE;
}

// Helpers Intl -----------------------------------------------------------------
export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(getLocale(), options).format(d);
}

export function formatCurrency(amount, currency = 'EUR', options = {}) {
  try {
    return new Intl.NumberFormat(getLocale(), { style: 'currency', currency, ...options }).format(amount);
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

export const i18n = { t, setLocale, getLocale, initI18n, applyDom, formatDate, formatCurrency, formatRelative, getQueryLocale };
export default i18n;


