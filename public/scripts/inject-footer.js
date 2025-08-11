// Injects the reusable footer partial into pages, replacing any existing footer.site-footer
(async function injectFooter() {
  try {
    const existing = document.querySelector('footer.site-footer');
    const res = await fetch('/partials/footer.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();

    const tpl = document.createElement('div');
    tpl.innerHTML = html.trim();
    const newFooter = tpl.querySelector('footer.site-footer');
    if (!newFooter) return;

    if (existing) {
      existing.replaceWith(newFooter);
    } else {
      document.body.appendChild(newFooter);
    }
  } catch (err) {
    console.warn('[footer] Impossibile iniettare il footer:', err);
  }
})();


