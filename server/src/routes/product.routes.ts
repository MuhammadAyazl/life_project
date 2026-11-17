import { Router } from 'express';
import { z } from 'zod';
import type { FilterQuery, SortOrder } from 'mongoose';
import { CATEGORIES } from '../config/constants.js';
import { Product, type ProductType } from '../models/Product.js';
import { Review, recalcProductRating } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Store } from '../models/Store.js';
import { requireAuth } from '../middleware/auth.js';
import { forbidden, notFound } from '../utils/AppError.js';
import { escapeRegex, objectId } from '../utils/helpers.js';
import { parse } from '../utils/validate.js';
import { shopperFilter, toProduct } from '../services/catalog.js';

const router = Router();

const listSchema = z.object({
  category: z.enum(CATEGORIES).optional().catch(undefined),
  q: z.string().trim().max(60).optional(),
  sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'rating', 'best']).optional().catch('featured'),
  store: z.string().trim().toLowerCase().max(30).optional(),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  limit: z.coerce.number().int().min(1).max(48).optional().default(24),
});

const SORTS: Record<string, Record<string, SortOrder>> = {
  featured: { sold: -1, rating: -1, createdAt: 1 },
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { rating: -1, numReviews: -1 },
  best: { sold: -1 },
};

router.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
});

router.get('/', async (req, res) => {
  const q = parse(listSchema, req.query);
  const filter: FilterQuery<ProductType> = { ...(await shopperFilter()) };
  if (q.store) {
    const s = await Store.findOne({ username: q.store, status: 'approved', isActive: true }).select('_id');
    filter.$and = [{ store: s ? s._id : null }];
  }
  if (q.category) filter.category = q.category;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: rx }, { category: rx }, { description: rx }];
  }
  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[q.sort ?? 'featured'])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('store', 'name username')
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ products: items.map(toProduct), total, page: q.page, pages: Math.ceil(total / q.limit) });
});

/** Lightweight list for the sitemap. */
router.get('/sitemap', async (_req, res) => {
  const items = await Product.find(await shopperFilter())
    .select('slug updatedAt')
    .lean();
  res.json({ products: items.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })) });
});

router.get('/:slug', async (req, res) => {
  const slug = parse(z.string().trim().toLowerCase().max(120), req.params.slug);
  const base = await shopperFilter();
  const product = await Product.findOne({ ...base, slug })
    .populate('store', 'name username')
    .lean();
  if (!product) throw notFound('Product not found.');

  const [reviews, related] = await Promise.all([
    Review.find({ product: product._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'firstName lastName email')
      .lean(),
    Product.find({ ...base, _id: { $ne: product._id }, category: product.category })
      .limit(4)
      .populate('store', 'name username')
      .lean(),
  ]);

  res.json({
    product: toProduct(product),
    reviews: reviews.map((r) => {
      const u = r.user as unknown as { firstName?: string; lastName?: string; email?: string } | null;
      const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.email ?? '').split('@')[0] : 'Customer';
      return { id: String(r._id), name, rating: r.rating, text: r.text, createdAt: r.createdAt };
    }),
    related: related.map(toProduct),
  });
});

/** A customer can review a product they have ordered (and not cancelled). One review each. */
router.post('/:id/reviews', requireAuth, async (req, res) => {
  const productId = objectId(req.params.id, 'Product');
  const data = parse(
    z.object({ rating: z.coerce.number().int().min(1).max(5), text: z.string().trim().min(3).max(1000) }),
    req.body,
  );
  const product = await Product.findById(productId);
  if (!product) throw notFound('Product not found.');
  const bought = await Order.exists({
    user: req.user!._id,
    'items.product': productId,
    status: { $ne: 'CANCELLED' },
  });
  if (!bought) throw forbidden('You can review a product after you order it.');

  await Review.findOneAndUpdate(
    { user: req.user!._id, product: productId },
    { ...data, store: product.store },
    { upsert: true, new: true, runValidators: true },
  );
  await recalcProductRating(productId);
  res.status(201).json({ ok: true });
});

export default router;
