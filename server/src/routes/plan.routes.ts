import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { PLAN } from '../config/constants.js';
import { env } from '../config/env.js';
import { addDays, effectivePlan } from '../services/plan.js';
import { publicUser } from '../services/serialize.js';
import { PRICES, ensureCustomer, isMissing, paymentsEnabled, stripe, syncSubscription } from '../services/stripe.js';
import { badRequest, forbidden } from '../utils/AppError.js';
import { parse } from '../utils/validate.js';

/**
 * Membership plans.
 * - Free trial: 7 days, no card, once per account.
 * - Plus: paid through Stripe Checkout. Plus is ONLY activated after Stripe confirms the payment
 *   (webhook, or the server re-reading the Checkout Session) - never because the browser says so.
 */
const router = Router();

router.get('/', (_req, res) => {
  res.json({
    trialDays: PLAN.TRIAL_DAYS,
    plans: [
      { id: 'free', name: 'Free', price: 0 },
      { id: 'plus', name: 'Plus', monthly: PLAN.PRICE_MONTHLY, yearlyPerMonth: PLAN.PRICE_YEARLY_PER_MONTH },
    ],
    paymentsEnabled: paymentsEnabled(),
  });
});

router.post('/trial', requireAuth, async (req, res) => {
  const user = req.user!;
  const plan = effectivePlan(user);
  if (plan.trialUsed) throw badRequest('You have already used your free trial.');
  if (plan.tier !== 'free') throw badRequest('You already have an active membership.');
  user.plan!.tier = 'trial';
  user.plan!.trialUsed = true;
  user.plan!.trialEndsAt = addDays(new Date(), PLAN.TRIAL_DAYS);
  await user.save();
  res.json({ user: publicUser(user), message: `Your ${PLAN.TRIAL_DAYS}-day free trial has started!` });
});

/** Creates a Stripe Checkout page for the Plus subscription and returns its URL. */
router.post('/checkout', requireAuth, async (req, res) => {
  const { billing } = parse(z.object({ billing: z.enum(['monthly', 'yearly']) }), req.body);
  const user = req.user!;
  if (effectivePlan(user).tier === 'plus') throw badRequest('You are already a Plus member.');

  const s = stripe();
  const customerId = await ensureCustomer(user);

  const price = PRICES[billing];
  const site = env.allowedOrigins[0];
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: String(user._id),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: price.amount,
          recurring: { interval: price.interval },
          product_data: { name: `ShopFussion Plus (${billing})` },
        },
      },
    ],
    subscription_data: { metadata: { userId: String(user._id), billing } },
    metadata: { userId: String(user._id), billing },
    success_url: `${site}/plus?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/plus?status=cancelled`,
    allow_promotion_codes: false,
  });
  res.json({ url: session.url });
});

/**
 * Called by the success page. The server asks Stripe directly whether this session was paid,
 * so it works even without a webhook during local development.
 */
router.post('/checkout/confirm', requireAuth, async (req, res) => {
  const { sessionId } = parse(z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]{10,200}$/, 'Invalid session.') }), req.body);
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
  if (session.client_reference_id !== String(req.user!._id)) throw forbidden('This payment belongs to another account.');
  if (session.status !== 'complete' || !session.subscription || typeof session.subscription === 'string') {
    throw badRequest('Payment is not complete yet.');
  }
  const user = await syncSubscription(session.subscription);
  res.json({ user: publicUser(user ?? req.user!), message: 'Payment successful - welcome to ShopFussion Plus!' });
});

/** Cancels at the end of the paid period (customer keeps Plus until then). Trials end immediately. */
router.post('/cancel', requireAuth, async (req, res) => {
  const user = req.user!;
  const subId = user.plan!.stripeSubscriptionId;
  if (subId && paymentsEnabled()) {
    try {
      const sub = await stripe().subscriptions.update(subId, { cancel_at_period_end: true });
      const fresh = (await syncSubscription(sub)) ?? user;
      return res.json({ user: publicUser(fresh), message: 'Auto-renew is off. Plus stays active until the end of your billing period.' });
    } catch (err) {
      // subscription from the other Stripe mode (live vs test): nothing to cancel there, just end it here
      if (!isMissing(err)) throw err;
      user.plan!.stripeSubscriptionId = null;
    }
  }
  user.plan!.tier = 'free';
  user.plan!.billing = null;
  user.plan!.trialEndsAt = null;
  await user.save();
  res.json({ user: publicUser(user), message: 'Your membership has been cancelled.' });
});

/** Stripe-hosted page to update card, see invoices or cancel. */
router.post('/portal', requireAuth, async (req, res) => {
  if (!req.user!.plan!.stripeCustomerId) throw badRequest('No billing account yet.');
  const customer = await ensureCustomer(req.user!);
  const portal = await stripe().billingPortal.sessions.create({ customer, return_url: `${env.allowedOrigins[0]}/plus` });
  res.json({ url: portal.url });
});

export default router;
