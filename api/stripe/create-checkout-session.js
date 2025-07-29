// ================================================================
// MENTAL COMMONS - STRIPE CHECKOUT SESSION (SPRINT 1)
// ================================================================
// Endpoint: POST /api/stripe/create-checkout-session?plan=monthly|annual
// Crea una sessione Stripe Checkout in modalità subscription e
// restituisce l'URL per il redirect.
// ================================================================

const Stripe = require('stripe');
const { verifyJWT } = require('../../lib/supabase.js');

// Inizializza client Stripe (chiave segreta da env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

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
    const priceId = plan === 'annual' ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) {
      console.error('❌ STRIPE_PRICE_ID mancante per piano', plan);
      return res.status(500).json({ success: false, message: 'Configurazione Stripe mancante per il piano selezionato' });
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

    return res.status(200).json({ success: true, url: session.url });
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