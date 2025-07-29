// ================================================================
// MENTAL COMMONS - Stripe Configuration
// ================================================================
// Permette di forzare l'uso delle chiavi Test tramite la variabile
// STRIPE_USE_TEST = 'true', anche in produzione.
// Espone:
//   - stripe: istanza client
//   - getPriceId(plan)
//   - getPublicKey()
//   - getWebhookSecret()
// ================================================================

const Stripe = require('stripe');

const isTest = process.env.STRIPE_USE_TEST === 'true';

// === Chiavi segrete ===
const secretKey = isTest ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error('[StripeConfig] STRIPE_SECRET_KEY mancante per la modalità in uso');
}

// Inizializza client
const stripe = new Stripe(secretKey, {
  apiVersion: '2024-04-10',
});

// === Helpers ===
function getPublicKey() {
  return isTest ? process.env.STRIPE_PUBLISHABLE_KEY_TEST : process.env.NEXT_PUBLIC_STRIPE_KEY;
}

function getWebhookSecret() {
  return isTest ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET;
}

function getPriceId(plan) {
  const p = (plan || '').toLowerCase();
  switch (p) {
    case 'monthly':
    case 'month':
    case 'mensile':
      return isTest ? process.env.STRIPE_PRICE_ID_MONTHLY_TEST : process.env.STRIPE_PRICE_ID_MONTHLY;
    case 'annual':
    case 'yearly':
    case 'annuale':
      return isTest ? process.env.STRIPE_PRICE_ID_ANNUAL_TEST : process.env.STRIPE_PRICE_ID_ANNUAL;
    default:
      throw new Error(`[StripeConfig] Piano sconosciuto: ${plan}`);
  }
}

// Log sicuro per debug
const mode = isTest ? 'TEST' : 'LIVE';
console.info(`[StripeConfig] Modalità ${mode} attiva`);

module.exports = {
  stripe,
  getPriceId,
  getPublicKey,
  getWebhookSecret,
  isTest,
}; 