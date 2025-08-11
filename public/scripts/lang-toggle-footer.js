import { initI18n, setLocale, getLocale } from '/core/i18n.js';

(function bootFooterLang(){
  try { initI18n(); } catch {}

  const itBtn = document.getElementById('footer-lang-it');
  const enBtn = document.getElementById('footer-lang-en');
  if(!itBtn || !enBtn) return;

  function markActive(code){
    [itBtn, enBtn].forEach(b => b.classList.remove('active'));
    (code === 'en' ? enBtn : itBtn).classList.add('active');
  }

  try { markActive((getLocale && getLocale()) || 'it'); } catch { markActive('it'); }

  [itBtn, enBtn].forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const lang = btn.dataset.lang;
      try { setLocale(lang, { apply: true }); } catch { setLocale(lang); }
      markActive(lang);
    });
  });
})();


