import { initI18n, setLocale, getLocale } from '/src/core/i18n.js';

function markActive(locale) {
  document.querySelectorAll('#lang-toggle .lang-btn').forEach((btn) => {
    const on = btn.dataset.lang === locale;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

async function boot() {
  try {
    await initI18n();
  } catch (_) {}
  markActive(getLocale());
  document.querySelectorAll('#lang-toggle .lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lc = btn.dataset.lang;
      setLocale(lc);
      markActive(lc);
    });
  });
}

boot();


