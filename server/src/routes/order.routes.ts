import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { badRequest, notFound } from '../utils/AppError.js';
import { objectId, round2 } from '../utils/helpers.js';
import { parse } from '../utils/validate.js';
import { resolveCoupon } from '../services/coupon.js';
import { shopperFilter } from '../services/catalog.js';

const router = Router();
router.use(requireAuth);

const MAX_QTY = 20;

const createSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid product.'),
        qty: z.coerce.number().int().min(1).max(MAX_QTY),
      }),
    )
    .min(1, 'Your cart is empty.')
    .max(50),
  addressId: z.string().regex(/^[a-f0-9]{24}$/i, 'Please select a delivery address.'),
  couponCode: z.string().trim().max(20).optional(),
  paymentMethod: z.literal('COD').default('COD'),
});

router.post('/coupon/validate', async (req, res) => {
  const { code } = parse(z.object({ code: z.string().trim().min(1, 'Enter a coupon code.').max(20) }), req.body);
  res.json({ coupon: await resolveCoupon(code, req.user!) });
});

/**
 * Places an order. Prices, stock and discounts are ALL recalculated from the database -
 * the cart sent by the browser only says "which product, how many".
 * A cart with products from several stores becomes one order per store.
 */
router.post('/', async (req, res) => {
  const data = parse(createSchema, req.body);
  const user = req.user!;

  const address = user.addresses.id(data.addressId);
  if (!address) throw badRequest('Please select a delivery address.');

  // merge duplicate lines
  const qtyById = new Map<string, number>();
  for (const it of data.items) qtyById.set(it.productId, Math.min(MAX_QTY, (qtyById.get(it.productId) ?? 0) + it.qty));

  const products = await Product.find({
    ...(await shopperFilter()),
    _id: { $in: [...qtyById.keys()].map((id) => new Types.ObjectId(id)) },
  });
  if (products.length !== qtyById.size) throw badRequest('Some products in your cart are no longer available.');
  const outOfStock = products.filter((p) => !p.inStock);
  if (outOfStock.length) throw badRequest(`Out of stock: ${outOfStock.map((p) => p.name).join(', ')}`);

  const coupon = data.couponCode ? await resolveCoupon(data.couponCode, user) : null;

  const byStore = new Map<string, typeof products>();
  for (const p of products) {
    const k = String(p.store);
    byStore.set(k, [...(byStore.get(k) ?? []), p]);
  }

  const docs = [...byStore.entries()].map(([storeId, list]) => {
    const items = list.map((p) => ({
      product: p._id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      qty: qtyById.get(String(p._id))!,
      image: p.images[0] ?? '',
      art: p.art ?? '',
    }));
    const subtotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
    const discount = coupon ? round2((subtotal * coupon.discount) / 100) : 0;
    return {
      user: user._id,
      store: new Types.ObjectId(storeId),
      items,
      address: address.toObject(),
      subtotal,
      discount,
      total: round2(subtotal - discount),
      coupon: coupon ? { code: coupon.code, discount: coupon.discount } : { code: null, discount: 0 },
      paymentMethod: 'COD' as const,
    };
  });

  const orders = await Order.insertMany(docs);
  await Product.bulkWrite(
    products.map((p) => ({
      updateOne: { filter: { _id: p._id }, update: { $inc: { sold: qtyById.get(String(p._id))! } } },
    })),
  );
  res.status(201).json({
    orders: orders.map((o) => ({ id: String(o._id), total: o.total })),
    total: round2(orders.reduce((s, o) => s + o.total, 0)),
  });
});

router.get('/mine', async (req, res) => {
  const orders = await Order.find({ user: req.user!._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('store', 'name username')
    .lean();
  res.json({ orders: orders.map(({ _id, ...o }) => ({ id: String(_id), ...o })) });
});

/** IDOR guard: the filter always includes the signed-in user, so other people's orders 404. */
router.get('/:id', async (req, res) => {
  const order = await Order.findOne({ _id: objectId(req.params.id, 'Order'), user: req.user!._id })
    .populate('store', 'name username')
    .lean();
  if (!order) throw notFound('Order not found.');
  const { _id, ...o } = order;
  res.json({ order: { id: String(_id), ...o } });
});

/** Customers can cancel an order until it ships. */
router.post('/:id/cancel', async (req, res) => {
  const order = await Order.findOne({ _id: objectId(req.params.id, 'Order'), user: req.user!._id });
  if (!order) throw notFound('Order not found.');
  if (!['ORDER_PLACED', 'PROCESSING'].includes(order.status)) throw badRequest('This order can no longer be cancelled.');
  order.status = 'CANCELLED';
  await order.save();
  res.json({ ok: true });
});

export default router;
