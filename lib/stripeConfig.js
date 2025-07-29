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

// Sempre modalità LIVE: usa esclusivamente variabili di produzione
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error('[StripeConfig] STRIPE_SECRET_KEY mancante: verifica la configurazione ambiente');
}

// Inizializza client
const stripe = new Stripe(secretKey, {
  apiVersion: '2024-04-10',
});

// === Helpers ===
function getPublicKey() {
  return process.env.NEXT_PUBLIC_STRIPE_KEY;
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

function getPriceId(plan) {
  const p = (plan || '').toLowerCase();
  switch (p) {
    case 'monthly':
    case 'month':
    case 'mensile':
      return process.env.STRIPE_PRICE_ID_MONTHLY;
    case 'annual':
    case 'yearly':
    case 'annuale':
      return process.env.STRIPE_PRICE_ID_ANNUAL;
    default:
      throw new Error(`[StripeConfig] Piano sconosciuto: ${plan}`);
  }
}

// Log sicuro per debug
const safeKeyPreview = secretKey ? secretKey.slice(0, 8) + '…' : 'undefined';
console.info(`[StripeConfig] Modalità LIVE attiva | Key preview: ${safeKeyPreview}`);

module.exports = {
  stripe,
  getPriceId,
  getPublicKey,
  getWebhookSecret,
}; 