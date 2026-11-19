import { Schema, model, type InferSchemaType } from 'mongoose';
import { ORDER_STATUS } from '../config/constants.js';

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    art: { type: String, default: '' },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // one order per store, so each seller only ever sees their own orders
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    address: {
      name: String,
      email: String,
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      phone: String,
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { code: { type: String, default: null }, discount: { type: Number, default: 0 } },
    paymentMethod: { type: String, enum: ['COD', 'CARD'], default: 'COD' },
    // card orders: the Stripe Checkout Session that pays for them (one session can pay several store orders)
    stripeSessionId: { type: String, default: null, index: true },
    paidAt: { type: Date, default: null },
    isPaid: { type: Boolean, default: false },
    status: { type: String, enum: ORDER_STATUS, default: 'ORDER_PLACED', index: true },
  },
  { timestamps: true },
);

export type OrderType = InferSchemaType<typeof orderSchema>;
export const Order = model('Order', orderSchema);
