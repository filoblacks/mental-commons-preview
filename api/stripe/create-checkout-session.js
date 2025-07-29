// ================================================================
// MENTAL COMMONS - STRIPE CHECKOUT SESSION (SPRINT 1)
// ================================================================
// Endpoint: POST /api/stripe/create-checkout-session?plan=monthly|annual
// Crea una sessione Stripe Checkout in modalità subscription e
// restituisce l'URL per il redirect.
// ================================================================

const { stripe, getPriceId } = require('../../lib/stripeConfig');
const { verifyJWT } = require('../../lib/supabase.js');

// Istanza Stripe già configurata

module.exports = async function handler(req, res) {
  // CORS base
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metodo non consentito. Usa POST.' });
  }

  try {
    // === 1. Autenticazione utente tramite JWT ===
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token mancante' });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    const userEmail = payload.email;
    const userId = payload.userId;

    // === 2. Determina piano richiesto ===
    const plan = (req.query.plan || 'monthly').toLowerCase();
    let priceId;
    try {
      priceId = getPriceId(plan);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!priceId) {
      try {
        const lookupKey = plan === 'annual' ? 'premium_annual' : 'premium_monthly';
        const prices = await stripe.prices.list({
          lookup_keys: [lookupKey],
          limit: 1,
          expand: ['data.product'],
        });

        if (prices.data.length) {
          priceId = prices.data[0].id;
          console.info(`✅ Prezzo recuperato da Stripe tramite lookup_key ${lookupKey}: ${priceId}`);
        } else {
          console.error(`❌ Nessun prezzo trovato con lookup_key ${lookupKey}`);
        }
      } catch (stripeErr) {
        console.error('❌ Errore ricerca prezzo Stripe:', stripeErr);
      }
    }

    if (!priceId) {
      return res.status(500).json({ success: false, message: 'Configurazione Stripe mancante: definisci STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL o imposta le lookup_key premium_monthly / premium_annual' });
    }

    // === 3. Crea sessione Checkout ===
    const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      success_url: `${baseUrl}/premium-success.html`,
      cancel_url: `${baseUrl}/premium.html`,
      metadata: {
        user_id: userId,
        plan,
      },
    });

    return res.status(200).json({ success: true, id: session.id, url: session.url });
  } catch (err) {
    console.error('❌ Stripe Checkout error:', err);
    return res.status(500).json({ success: false, message: 'Errore creazione sessione di pagamento' });
  }
};

// Helper estrai token dall'header Authorization o query
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.query.token) return req.query.token;
  if (typeof req.body === 'object' && req.body.token) return req.body.token;
  return null;
} 