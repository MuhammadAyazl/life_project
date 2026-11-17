import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { User, type UserDoc } from '../models/User.js';
import { badRequest, notFound, unauthorized } from '../utils/AppError.js';
import { parse } from '../utils/validate.js';
import { setAuthCookie, signToken } from '../utils/token.js';
import { publicUser } from '../services/serialize.js';
import { passwordRule } from './auth.routes.js';
import { imageUpload, removeUpload, saveImages } from '../middleware/upload.js';

const router = Router();
router.use(requireAuth);

/** Profile photo (DP). Same checks as product images: JPG/PNG/WEBP, max 2 MB, real image bytes. */
router.post('/me/avatar', imageUpload.single('avatar'), async (req, res) => {
  if (!req.file) throw badRequest('Please choose a photo.');
  const [url] = await saveImages([req.file]);
  const user = req.user!;
  const old = user.avatar;
  user.avatar = url;
  await user.save();
  await removeUpload(old); // delete the previous uploaded photo (not Google's)
  res.json({ user: publicUser(user), message: 'Profile photo updated' });
});

router.delete('/me/avatar', async (req, res) => {
  const user = req.user!;
  await removeUpload(user.avatar);
  user.avatar = '';
  await user.save();
  res.json({ user: publicUser(user), message: 'Profile photo removed' });
});

const s = (max: number, label: string) => z.string().trim().min(1, `${label} is required.`).max(max);
export const addressSchema = z.object({
  name: s(80, 'Name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120),
  street: s(160, 'Street'),
  city: s(80, 'City'),
  state: s(80, 'State'),
  zip: s(20, 'Zip code'),
  country: s(80, 'Country'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{6,30}$/, 'Enter a valid phone number.'),
});

router.patch('/me', async (req, res) => {
  const data = parse(
    z.object({ firstName: z.string().trim().max(50), lastName: z.string().trim().max(50) }).partial(),
    req.body,
  );
  const user = req.user!;
  Object.assign(user, data);
  await user.save();
  res.json({ user: publicUser(user) });
});

router.post('/me/password', async (req, res) => {
  const data = parse(z.object({ currentPassword: z.string().max(128).optional(), newPassword: passwordRule }), req.body);
  const user = (await User.findById(req.user!._id).select('+password')) as UserDoc;
  if (user.password) {
    if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, user.password))) {
      throw unauthorized('Current password is incorrect.');
    }
  }
  user.password = await bcrypt.hash(data.newPassword, 12);
  user.tokenVersion += 1; // sign out every other device
  await user.save();
  setAuthCookie(res, signToken(String(user._id), user.tokenVersion));
  res.json({ ok: true });
});

router.post('/me/addresses', async (req, res) => {
  const data = parse(addressSchema, req.body);
  const user = req.user!;
  if (user.addresses.length >= 10) throw badRequest('You can save up to 10 addresses.');
  user.addresses.push(data);
  await user.save();
  res.status(201).json({ address: user.addresses[user.addresses.length - 1], addresses: user.addresses });
});

router.delete('/me/addresses/:id', async (req, res) => {
  const user = req.user!;
  const addr = user.addresses.id(req.params.id);
  if (!addr) throw notFound('Address not found.');
  addr.deleteOne();
  await user.save();
  res.json({ addresses: user.addresses });
});

export default router;
