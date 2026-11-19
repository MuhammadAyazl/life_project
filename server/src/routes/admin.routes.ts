import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Store } from '../models/Store.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { AuditLog } from '../models/AuditLog.js';
import { badRequest, notFound } from '../utils/AppError.js';
import { objectId, round2 } from '../utils/helpers.js';
import { audit } from '../services/audit.js';
import { parse } from '../utils/validate.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', async (_req, res) => {
  const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);
  const [products, stores, users, revenue, perDay] = await Promise.all([
    Product.countDocuments(),
    Store.countDocuments({ status: 'approved' }),
    User.countDocuments(),
    Order.aggregate<{ total: number; count: number }>([
      { $match: { status: { $nin: ['CANCELLED', 'PENDING_PAYMENT'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: string; orders: number }>([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'PENDING_PAYMENT' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  // fill missing days with 0 so the chart has a continuous x-axis
  const map = new Map(perDay.map((d) => [d._id, d.orders]));
  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
    return { date: d, orders: map.get(d) ?? 0 };
  });
  res.json({
    stats: {
      totalProducts: products,
      totalRevenue: round2(revenue[0]?.total ?? 0),
      totalOrders: revenue[0]?.count ?? 0,
      totalStores: stores,
      totalUsers: users,
    },
    chart,
  });
});

router.get('/stores', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }), req.query);
  const stores = await Store.find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .populate('owner', 'firstName lastName email')
    .lean();
  res.json({
    stores: stores.map(({ _id, owner, ...s }) => {
      const o = owner as unknown as { firstName?: string; lastName?: string; email?: string } | null;
      return {
        id: String(_id),
        ...s,
        owner: o ? { name: [o.firstName, o.lastName].filter(Boolean).join(' '), email: o.email } : null,
      };
    }),
  });
});

router.patch('/stores/:id', async (req, res) => {
  const { isActive } = parse(z.object({ isActive: z.boolean() }), req.body);
  const store = await Store.findByIdAndUpdate(objectId(req.params.id, 'Store'), { isActive }, { new: true });
  if (!store) throw notFound('Store not found.');
  audit(req, isActive ? 'admin.store.activate' : 'admin.store.deactivate', { targetId: store._id, meta: { store: store.name } });
  res.json({ ok: true, isActive: store.isActive });
});

router.post('/stores/:id/:decision', async (req, res) => {
  const decision = parse(z.enum(['approve', 'reject']), req.params.decision);
  const store = await Store.findById(objectId(req.params.id, 'Store'));
  if (!store) throw notFound('Store not found.');
  if (store.status !== 'pending') throw badRequest('This application was already reviewed.');
  store.status = decision === 'approve' ? 'approved' : 'rejected';
  audit(req, `admin.store.${decision}`, { targetId: store._id, meta: { store: store.name } });
  await store.save();
  if (decision === 'approve') {
    // never downgrade an admin
    await User.updateOne({ _id: store.owner, role: 'user' }, { role: 'seller' });
  }
  res.json({ ok: true, status: store.status });
});

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,20}$/, 'Code: 3-20 letters or numbers.'),
  description: z.string().trim().min(3, 'Enter a description.').max(160),
  discount: z.coerce.number().int().min(1, 'Discount must be 1-100.').max(100, 'Discount must be 1-100.'),
  expiresAt: z.coerce.date().refine((d) => d > new Date(), 'Expiry date must be in the future.'),
  forNewUser: z.boolean().default(false),
  forMember: z.boolean().default(false),
});

router.get('/coupons', async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({ coupons: coupons.map(({ _id, ...c }) => ({ id: String(_id), ...c })) });
});

router.post('/coupons', async (req, res) => {
  const data = parse(couponSchema, req.body);
  const c = await Coupon.create(data);
  audit(req, 'admin.coupon.create', { targetId: c._id, meta: { code: c.code, discount: c.discount } });
  res.status(201).json({ coupon: { id: String(c._id), ...c.toObject() } });
});

router.delete('/coupons/:id', async (req, res) => {
  const r = await Coupon.deleteOne({ _id: objectId(req.params.id, 'Coupon') });
  if (r.deletedCount) audit(req, 'admin.coupon.delete', { targetId: String(req.params.id) });
  if (!r.deletedCount) throw notFound('Coupon not found.');
  res.json({ ok: true });
});

/** Security / activity trail for admins. Optional ?type=auth|admin|seller filter. */
router.get('/audit', async (req, res) => {
  const q = parse(
    z.object({
      type: z.enum(['auth', 'admin', 'seller']).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional().default(100),
    }),
    req.query,
  );
  const logs = await AuditLog.find(q.type ? { action: new RegExp(`^${q.type}\\.`) } : {})
    .sort({ createdAt: -1 })
    .limit(q.limit)
    .lean();
  res.json({ logs: logs.map(({ _id, ...l }) => ({ id: String(_id), ...l })) });
});

export default router;
