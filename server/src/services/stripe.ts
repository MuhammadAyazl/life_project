import Stripe from 'stripe';
import { env } from '../config/env.js';
import { PLAN } from '../config/constants.js';
import { User, type UserDoc } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

let client: Stripe | null = null;

/** True only with a usable Secret key (sk_test_ in development, sk_ in production). */
export const paymentsEnabled = () => {
  const k = env.STRIPE_SECRET_KEY;
  return env.isProd ? k.startsWith('sk_') : k.startsWith('sk_test_');
};

/** Stripe client, created on first use. Throws a friendly 503 when keys are not configured. */
export function stripe(): Stripe {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new AppError(503, 'Online payments are not set up yet. Add STRIPE_SECRET_KEY to server/.env.');
  }
  if (!key.startsWith('sk_')) {
    throw new AppError(
      503,
      'Wrong Stripe key type in server/.env. Use the Secret key that starts with "sk_test_" (not a restricted "rk_" or publishable "pk_" key).',
    );
  }
  // Safety: never charge real cards from a development machine.
  if (key.startsWith('sk_live_') && !env.isProd) {
    throw new AppError(503, 'A LIVE Stripe key is set in development. Use your test key (sk_test_...) while developing.');
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { appInfo: { name: 'ShopFussion' } });
  return client;
}

/** Plus prices in cents. Yearly = $5/month billed once a year. */
export const PRICES = {
  monthly: { amount: PLAN.PRICE_MONTHLY * 100, interval: 'month' as const },
  yearly: { amount: PLAN.PRICE_YEARLY_PER_MONTH * 12 * 100, interval: 'year' as const },
};

/** Newer Stripe API versions moved current_period_end onto the subscription item. */
function periodEnd(sub: Stripe.Subscription): Date {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const ts = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000) : new Date(Date.now() + 30 * 864e5);
}

/**
 * Single place that turns a Stripe subscription into the user's plan.
 * Called from the webhook (authoritative) and from the success-page confirm call.
 */
export async function syncSubscription(sub: Stripe.Subscription): Promise<UserDoc | null> {
  const userId = sub.metadata?.userId;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const user = (userId ? await User.findById(userId) : await User.findOne({ 'plan.stripeCustomerId': customerId })) as UserDoc | null;
  if (!user) return null;

  const plan = user.plan!;
  const active = sub.status === 'active' || sub.status === 'trialing';
  plan.stripeCustomerId = customerId;
  plan.stripeSubscriptionId = sub.id;
  plan.cancelAtPeriodEnd = !!sub.cancel_at_period_end;
  plan.trialUsed = true;
  if (active) {
    const interval = sub.items?.data?.[0]?.price?.recurring?.interval;
    plan.tier = 'plus';
    plan.billing = interval === 'year' ? 'yearly' : 'monthly';
    plan.plusEndsAt = periodEnd(sub);
  } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
    plan.tier = 'free';
    plan.billing = null;
    plan.plusEndsAt = null;
    plan.stripeSubscriptionId = null;
    plan.cancelAtPeriodEnd = false;
  }
  await user.save();
  return user;
}
