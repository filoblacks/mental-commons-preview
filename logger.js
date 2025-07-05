// ================================================================
// MENTAL COMMONS - SIMPLE LOGGER (MVP)
// ================================================================
// Fornisce funzioni di logging basilari che reindirizzano a console.
// In ambiente production stampa solo warn/error per evitare rumore.
// ================================================================

const isProd = process.env.NODE_ENV === 'production';

function output(level, ...args) {
  if (isProd && level === 'debug') return; // Salta debug in produzione
  if (isProd && level === 'info') return;  // Facoltativo: riduci info in prod
  const label = level.toUpperCase();
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](`[${label}]`, ...args);
}

module.exports = {
  log: (...args) => output('log', ...args),
  debug: (...args) => output('debug', ...args),
  info: (...args) => output('info', ...args),
  warn: (...args) => output('warn', ...args),
  error: (...args) => output('error', ...args)
}; 