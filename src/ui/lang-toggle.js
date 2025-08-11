import { initI18n, setLocale, getLocale } from '@core/i18n.js';

function markActive(locale) {
  document.querySelectorAll('#lang-toggle .lang-btn').forEach((btn) => {
    const on = btn.dataset.lang === locale;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

async function boot() {
  try { console.info('[lang-toggle/boot] avvio'); } catch {}
  try { await initI18n(); } catch (_) {}
  const localeNow = getLocale();
  try { console.info('[lang-toggle/locale]', { localeNow }); } catch {}
  markActive(localeNow);
  document.querySelectorAll('#lang-toggle .lang-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const lc = btn.dataset.lang;
      try { console.info('[lang-toggle/click]', { lc }); } catch {}
      try {
        if (window.__mc_setLocale) {
          await window.__mc_setLocale(lc);
        } else {
          await setLocale(lc, { apply: true });
        }
      } catch {
        await setLocale(lc, { apply: true });
      }
      markActive(lc);
    });
  });
}

boot();


