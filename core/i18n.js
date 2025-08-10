// core/i18n.js – Runtime i18n minimale, compatibile con Vite (import JSON statici)

import it from '../locales/it.json';
import en from '../locales/en.json';

const DICTS = { it, en };
const LOCALE_KEY = 'mc_locale';
let _locale = detectInitialLocale();

function detectInitialLocale() {
  try {
    const ls = localStorage.getItem(LOCALE_KEY);
    if (ls && DICTS[ls]) return ls;
  } catch {}
  const lang = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage) || 'en').toLowerCase();
  return lang.startsWith('it') ? 'it' : 'en';
}

export function currentLocale() {
  return _locale in DICTS ? _locale : 'en';
}

export function getLocale() {
  return currentLocale();
}

export function setLocale(l) {
  if (!l || !DICTS[l]) return false;
  _locale = l;
  try { localStorage.setItem(LOCALE_KEY, l); } catch {}
  try { document.documentElement.lang = l; } catch {}
  applyDom();
  markActiveLanguage(l);
  try {
    window.__mc_applyI18n = applyDom;
    window.__mc_setLocale = setLocale;
  } catch {}
  return true;
}

function getFromDict(dict, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
}

function interpolate(str, vars = {}) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function t(path, vars = {}) {
  const loc = currentLocale();
  const primary = getFromDict(DICTS[loc], path);
  const fallback = getFromDict(DICTS[loc === 'it' ? 'en' : 'it'], path);
  const value = primary ?? fallback;
  if (value === undefined) {
    console.warn(`[i18n] Missing key: ${path}`);
    return path;
  }
  if (typeof value === 'string') return interpolate(value, vars);
  if (value && typeof value === 'object') {
    const preferred = value.label || value.title || value.text || value.placeholder || value.value;
    return interpolate(String(preferred ?? path), vars);
  }
  return String(value);
}

export function initI18n(localeOverride = null) {
  const next = localeOverride || getLocale();
  setLocale(next);
  applyDom();
  markActiveLanguage(currentLocale());
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

// Helpers Intl -----------------------------------------------------------------
export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(currentLocale(), options).format(d);
}

export function formatCurrency(amount, currency = 'EUR', options = {}) {
  try {
    return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency, ...options }).format(amount);
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

export const i18n = { t, setLocale, getLocale, currentLocale, initI18n, applyDom, formatDate, formatCurrency, formatRelative };
export default i18n;


