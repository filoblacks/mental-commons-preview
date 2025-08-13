// ================================================================
// MENTAL COMMONS - UI Premium (SPRINT 1)
// ================================================================
// Gestisce i bottoni di attivazione abbonamento e reindirizza
// l'utente alla sessione di pagamento Stripe.
// ================================================================

(function () {
  'use strict';

  function log(...args) {
    if (!window.isProduction) console.log('[Premium]', ...args);
  }

  function getAuthToken() {
    return localStorage.getItem('mental_commons_token');
  }

  // ================================================================
  // Stripe.js: caricamento lazy e inizializzazione con chiave corretta
  // ================================================================
  let stripePromise;
  function getStripe() {
    if (stripePromise) return stripePromise;
    stripePromise = new Promise((resolve, reject) => {
      const init = () => resolve(window.Stripe(window.STRIPE_PUBLISHABLE_KEY));
      if (window.Stripe) {
        return init();
      }
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = init;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return stripePromise;
  }

  async function startCheckout(plan) {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Per attivare Premium devi prima effettuare il login.');
        window.location.href = '/login.html';
        return;
      }

      const response = await fetch(`/api/stripe/create-checkout-session?plan=${plan}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success && data.id) {
        try {
          const stripe = await getStripe();
          const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
          if (error) {
            console.error('Stripe redirect error:', error);
            window.location.href = data.url; // Fallback
          }
        } catch (stripeErr) {
          console.error('Stripe init error:', stripeErr);
          window.location.href = data.url; // Fallback
        }
      } else if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout error:', data);
        alert('Si è verificato un errore nell’avvio del pagamento. Riprova più tardi.');
      }
    } catch (err) {
      console.error('Checkout JS error:', err);
      alert('Errore imprevisto. Riprova più tardi.');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btnMonthly = document.getElementById('btn-premium-monthly');
    const btnAnnual = document.getElementById('btn-premium-annual');

    if (btnMonthly) btnMonthly.addEventListener('click', () => startCheckout('monthly'));
    if (btnAnnual) btnAnnual.addEventListener('click', () => startCheckout('annual'));
  });
})();


