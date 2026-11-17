import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { Store } from '../models/Store.js';
import { Product } from '../models/Product.js';
import { badRequest, conflict, notFound } from '../utils/AppError.js';
import { parse } from '../utils/validate.js';

const router = Router();

export const storeSchema = z.object({
  name: z.string().trim().min(2, 'Store name is required.').max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{3,30}$/, 'Username: 3-30 letters, numbers, - or _.'),
  description: z.string().trim().min(20, 'Description should be at least 20 characters.').max(1000),
  address: z.string().trim().min(5, 'Address is required.').max(200),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120),
  phone: z.string().trim().regex(/^[+0-9 ()-]{6,30}$/, 'Enter a valid phone number.'),
});

const publicStore = (s: { _id: unknown; [k: string]: unknown }) => ({
  id: String(s._id),
  name: s.name,
  username: s.username,
  description: s.description,
  address: s.address,
  email: s.email,
  logo: s.logo,
  createdAt: s.createdAt,
});

/** The signed-in user's own store application (any status). */
router.get('/mine', requireAuth, async (req, res) => {
  const store = await Store.findOne({ owner: req.user!._id }).lean();
  res.json({ store: store ? { ...publicStore(store), status: store.status, isActive: store.isActive, phone: store.phone } : null });
});

/** Apply for a store. A rejected application can be edited and re-submitted. */
router.post('/', requireAuth, async (req, res) => {
  const data = parse(storeSchema, req.body);
  const existing = await Store.findOne({ owner: req.user!._id });
  if (existing && existing.status !== 'rejected') throw badRequest('You already have a store application.');
  const taken = await Store.exists({ username: data.username, owner: { $ne: req.user!._id } });
  if (taken) throw conflict('That store username is taken.');

  const store = existing
    ? Object.assign(existing, data, { status: 'pending' })
    : new Store({ ...data, owner: req.user!._id });
  await store.save();
  res.status(201).json({ store: { ...publicStore(store.toObject()), status: store.status } });
});

router.get('/:username', async (req, res) => {
  const username = parse(z.string().trim().toLowerCase().max(30), req.params.username);
  const store = await Store.findOne({ username, status: 'approved', isActive: true }).lean();
  if (!store) throw notFound('Store not found.');
  const productCount = await Product.countDocuments({ store: store._id });
  res.json({ store: { ...publicStore(store), productCount } });
});

export default router;
