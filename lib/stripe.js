// ================================================================
// MENTAL COMMONS - Stripe Helper (TEST vs LIVE)
// ================================================================
// Offre funzioni per:
// 1. Determinare se siamo in modalità test o live
// 2. Restituire il client Stripe già inizializzato
// 3. Esporre in modo tipizzato i valori di configurazione (price ID, webhook key, ...)
// Il tutto con logging sicuro (senza rivelare le chiavi).
// ================================================================

const Stripe = require('stripe');

function isTestMode() {
  // In preview / development usiamo sempre la modalità test
  return process.env.NODE_ENV !== 'production';
}

function pickEnv(liveVar, testVar) {
  return isTestMode() ? process.env[testVar] : process.env[liveVar];
}

function getStripeSecretKey() {
  return pickEnv('STRIPE_SECRET_KEY', 'STRIPE_SECRET_KEY_TEST');
}

function getPublishableKey() {
  // LIVE key usa il prefisso NEXT_PUBLIC_ per compatibilità con Vercel/Next
  return pickEnv('NEXT_PUBLIC_STRIPE_KEY', 'STRIPE_PUBLISHABLE_KEY_TEST');
}

function getPriceIdMonthly() {
  return pickEnv('STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_MONTHLY_TEST');
}

function getPriceIdAnnual() {
  return pickEnv('STRIPE_PRICE_ID_ANNUAL', 'STRIPE_PRICE_ID_ANNUAL_TEST');
}

function getWebhookSecret() {
  return pickEnv('STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET_TEST');
}

let stripeInstance;
function getStripeInstance() {
  if (stripeInstance) return stripeInstance;

  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('[Stripe] Chiave segreta mancante: verifica le variabili ambiente');
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2024-04-10',
  });

  // Logging sicuro (non mostra le chiavi)
  const mode = isTestMode() ? 'TEST' : 'LIVE';
  console.info(`[Stripe] Inizializzato in modalità ${mode}. Variabili: ${mode === 'TEST' ? '..._TEST' : 'LIVE'}`);

  return stripeInstance;
}

function getStripeConfig() {
  return {
    isTest: isTestMode(),
    publishableKey: getPublishableKey(),
    priceIdMonthly: getPriceIdMonthly(),
    priceIdAnnual: getPriceIdAnnual(),
    webhookSecret: getWebhookSecret(),
  };
}

module.exports = {
  isTestMode,
  getStripeInstance,
  getStripeConfig,
}; 