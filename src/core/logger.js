// core/logger.js - Logging centralizzato e sicuro

const isProduction =
  typeof window !== 'undefined'
    ? !['localhost', '127.0.0.1'].includes(window.location.hostname) &&
      !window.location.hostname.includes('local')
    : true;

const printer = (method) =>
  function (...args) {
    if (!isProduction || method === 'error') {
      // eslint-disable-next-line no-console
      console[method](...args);
    }
  };

export const log = printer('log');
export const debug = printer('debug');
export const info = printer('info');
export const warn = printer('warn');
export const error = printer('error');

export default {
  log,
  debug,
  info,
  warn,
  error,
  isProduction,
};


