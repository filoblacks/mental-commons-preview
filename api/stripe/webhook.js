// ================================================================
// MENTAL COMMONS - STRIPE WEBHOOK (SPRINT 1)
// ================================================================
// Endpoint: POST /api/stripe/webhook
// Gestisce eventi Stripe.  Aggiorna Supabase al completamento checkout.
// ================================================================

const Stripe = require('stripe');
const { getSupabaseClient } = require('../../lib/supabase.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

// Disabilita il bodyParser di Vercel per poter verificare la firma
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let rawBody = '';
  try {
    // Accumula i chunk del body grezzo
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        rawBody += chunk;
      });
      req.on('end', resolve);
      req.on('error', reject);
    });

    const event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const customerId = session.customer;
      const subscriptionStatus = session.subscription ? 'active' : 'active';

      if (userId) {
        // Aggiorna record utente su Supabase
        await getSupabaseClient()
          .from('users')
          .update({
            has_subscription: true,
            stripe_customer_id: customerId,
            stripe_subscription_status: subscriptionStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    }

    // Puoi gestire altri eventi se necessario

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Stripe webhook error:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}; 