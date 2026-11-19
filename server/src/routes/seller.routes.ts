import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { CATEGORIES, ORDER_STATUS } from '../config/constants.js';
import { requireAuth, requireSeller } from '../middleware/auth.js';
import { imageUpload, saveImages } from '../middleware/upload.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { badRequest, notFound } from '../utils/AppError.js';
import { objectId, round2, slugify } from '../utils/helpers.js';
import { parse } from '../utils/validate.js';
import { audit } from '../services/audit.js';
import { toProduct } from '../services/catalog.js';

/** Every route here is scoped to res.locals.store - a seller can only touch their own data. */
const router = Router();
router.use(requireAuth, requireSeller);

const productFields = z
  .object({
    name: z.string().trim().min(2, 'Enter the product name.').max(120),
    description: z.string().trim().min(10, 'Description should be at least 10 characters.').max(3000),
    mrp: z.coerce.number().positive('Enter a valid actual price.').max(1_000_000),
    // optional: empty means "no discount" - the product sells at the actual price (mrp)
    price: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().positive('Enter a valid offer price.').max(1_000_000).optional(),
    ),
    category: z.enum(CATEGORIES, { error: 'Please select a category.' }),
  })
  .refine((d) => d.price === undefined || d.price <= d.mrp, { message: 'Offer price cannot be higher than the actual price.', path: ['price'] });

const newSlug = (name: string) => `${slugify(name) || 'product'}-${crypto.randomBytes(3).toString('hex')}`;

router.get('/dashboard', async (_req, res) => {
  const store = res.locals.store;
  const [totalProducts, orderAgg, totalRatings, reviews] = await Promise.all([
    Product.countDocuments({ store: store._id }),
    Order.aggregate<{ earnings: number; count: number }>([
      { $match: { store: store._id, status: { $nin: ['CANCELLED', 'PENDING_PAYMENT'] } } },
      { $group: { _id: null, earnings: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Review.countDocuments({ store: store._id }),
    Review.find({ store: store._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('user', 'firstName lastName email')
      .populate('product', 'name slug category')
      .lean(),
  ]);
  res.json({
    store: { name: store.name, username: store.username },
    stats: {
      totalProducts,
      totalEarnings: round2(orderAgg[0]?.earnings ?? 0),
      totalOrders: orderAgg[0]?.count ?? 0,
      totalRatings,
    },
    reviews: reviews.map((r) => {
      const u = r.user as unknown as { firstName?: string; lastName?: string; email?: string } | null;
      const p = r.product as unknown as { name: string; slug: string; category: string } | null;
      return {
        id: String(r._id),
        name: u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.email ?? '').split('@')[0] : 'Customer',
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
        product: p,
      };
    }),
  });
});

router.get('/products', async (_req, res) => {
  const items = await Product.find({ store: res.locals.store._id }).sort({ createdAt: -1 }).lean();
  res.json({ products: items.map(toProduct) });
});

router.post('/products', imageUpload.array('images', 4), async (req, res) => {
  const data = parse(productFields, req.body);
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) throw badRequest('Please upload at least one product image.');
  const images = await saveImages(files);
  const product = await Product.create({
    ...data,
    price: data.price ?? data.mrp, // no offer price -> sell at the actual price
    images,
    store: res.locals.store._id,
    slug: newSlug(data.name),
  });
  audit(req, 'seller.product.create', { targetId: product._id, meta: { name: product.name, price: product.price } });
  res.status(201).json({ product: toProduct(product.toObject()) });
});

router.patch('/products/:id', async (req, res) => {
  const data = parse(
    z
      .object({
        inStock: z.boolean(),
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().min(10).max(3000),
        mrp: z.coerce.number().positive().max(1_000_000),
        price: z.coerce.number().positive().max(1_000_000),
        category: z.enum(CATEGORIES),
      })
      .partial(),
    req.body,
  );
  const product = await Product.findOne({ _id: objectId(req.params.id, 'Product'), store: res.locals.store._id });
  if (!product) throw notFound('Product not found.');
  Object.assign(product, data);
  if (product.price > product.mrp) throw badRequest('Offer price cannot be higher than the actual price.');
  await product.save();
  audit(req, 'seller.product.update', { targetId: product._id, meta: { changed: Object.keys(data) } });
  res.json({ product: toProduct(product.toObject()) });
});

router.delete('/products/:id', async (req, res) => {
  const r = await Product.deleteOne({ _id: objectId(req.params.id, 'Product'), store: res.locals.store._id });
  if (r.deletedCount) audit(req, 'seller.product.delete', { targetId: String(req.params.id) });
  if (!r.deletedCount) throw notFound('Product not found.');
  res.json({ ok: true });
});

router.get('/orders', async (_req, res) => {
  const orders = await Order.find({ store: res.locals.store._id, status: { $ne: 'PENDING_PAYMENT' } }).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ orders: orders.map(({ _id, ...o }) => ({ id: String(_id), ...o })) });
});

router.patch('/orders/:id/status', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(ORDER_STATUS).exclude(['PENDING_PAYMENT']) }), req.body);
  // unpaid card orders are invisible to sellers until Stripe confirms the payment
  const order = await Order.findOne({ _id: objectId(req.params.id, 'Order'), store: res.locals.store._id, status: { $ne: 'PENDING_PAYMENT' } });
  if (!order) throw notFound('Order not found.');
  if (order.status === 'CANCELLED') throw badRequest('This order was cancelled by the customer.');
  audit(req, 'seller.order.status', { targetId: order._id, meta: { from: order.status, to: status } });
  order.status = status;
  if (status === 'DELIVERED') order.isPaid = true; // cash on delivery collected
  await order.save();
  res.json({ ok: true, status: order.status });
});

export default router;
