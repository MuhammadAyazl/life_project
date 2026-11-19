import type Stripe from 'stripe';
import type { Types } from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { env } from '../config/env.js';
import { stripe } from './stripe.js';

/**
 * Card payments for orders (Stripe Checkout).
 * Orders are created as PENDING_PAYMENT; they become real orders (ORDER_PLACED, paid) only when
 * Stripe confirms the payment - via the webhook or the success page asking Stripe directly.
 * Everything here is idempotent: running it twice for the same payment changes nothing.
 */

type PendingOrder = { _id: Types.ObjectId; total: number; store: { name?: string } | Types.ObjectId };

/** Creates the Stripe payment page for freshly created pending orders. Returns its URL. */
export async function createOrderCheckout(userId: string, email: string, orders: PendingOrder[]) {
  const site = env.allowedOrigins[0];
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    client_reference_id: userId,
    line_items: orders.map((o) => ({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(o.total * 100), // server-calculated total, never from the browser
        product_data: {
          name: `ShopFussion order ${String(o._id).slice(-6).toUpperCase()}`,
          description: typeof o.store === 'object' && 'name' in o.store && o.store.name ? `Sold by ${o.store.name}` : undefined,
        },
      },
    })),
    metadata: { userId, orderIds: orders.map((o) => String(o._id)).join(',') },
    payment_intent_data: { metadata: { userId, orderIds: orders.map((o) => String(o._id)).join(',') } },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // unpaid orders are released after 30 minutes
    success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/cart?payment=cancelled`,
  });
  await Order.updateMany({ _id: { $in: orders.map((o) => o._id) } }, { stripeSessionId: session.id });
  return session.url!;
}

/** Marks the orders of a PAID Checkout Session as placed + paid, and counts the sales. */
export async function markOrdersPaid(session: Stripe.Checkout.Session) {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return 0;
  const pending = await Order.find({ stripeSessionId: session.id, status: 'PENDING_PAYMENT' });
  let updated = 0;
  for (const o of pending) {
    // the status filter makes this safe against the webhook and the success page racing each other
    const r = await Order.updateOne(
      { _id: o._id, status: 'PENDING_PAYMENT' },
      { status: 'ORDER_PLACED', isPaid: true, paidAt: new Date() },
    );
    if (!r.modifiedCount) continue;
    updated++;
    await Product.bulkWrite(o.items.map((it) => ({ updateOne: { filter: { _id: it.product }, update: { $inc: { sold: it.qty } } } })));
  }
  return updated;
}

/** Payment page expired or was abandoned: release the pending orders. */
export async function cancelUnpaidOrders(sessionId: string) {
  const r = await Order.updateMany({ stripeSessionId: sessionId, status: 'PENDING_PAYMENT' }, { status: 'CANCELLED' });
  return r.modifiedCount;
}
