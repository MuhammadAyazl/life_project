import express, { Router } from 'express';
import type Stripe from 'stripe';
import { env } from '../config/env.js';
import { stripe, syncSubscription } from '../services/stripe.js';
import { cancelUnpaidOrders, markOrdersPaid } from '../services/orderPayments.js';

/**
 * Stripe webhook - the authoritative source for renewals, failed payments and cancellations.
 * Must receive the RAW body so the signature can be verified; mounted before express.json().
 */
const router = Router();

router.post('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  if (!env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ message: 'Webhook secret not configured.' });
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;
  try {
    // rejects anything not signed by Stripe with our secret (forged "payment succeeded" calls)
    event = stripe().webhooks.constructEvent(req.body as Buffer, String(sig), env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ message: 'Invalid signature.' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      if (s.mode === 'subscription' && typeof s.subscription === 'string') {
        await syncSubscription(await stripe().subscriptions.retrieve(s.subscription));
      }
      // card payment for orders: Stripe confirms the money arrived
      if (s.mode === 'payment') await markOrdersPaid(s);
      break;
    }
    case 'checkout.session.expired': {
      // the customer left the payment page without paying: release the pending orders
      const s = event.data.object;
      if (s.mode === 'payment') await cancelUnpaidOrders(s.id);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object);
      break;
    case 'invoice.paid': {
      // renewal: refresh the period end from the subscription
      const inv = event.data.object as Stripe.Invoice & { subscription?: string | null; parent?: { subscription_details?: { subscription?: string } } };
      const subId = inv.parent?.subscription_details?.subscription ?? inv.subscription;
      if (typeof subId === 'string') await syncSubscription(await stripe().subscriptions.retrieve(subId));
      break;
    }
    default:
      break;
  }
  res.json({ received: true });
});

export default router;
