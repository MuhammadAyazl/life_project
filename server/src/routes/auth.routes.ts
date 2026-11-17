import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { User, type UserDoc } from '../models/User.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { AppError, badRequest, conflict, unauthorized } from '../utils/AppError.js';
import { parse } from '../utils/validate.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../utils/token.js';
import { publicUser } from '../services/serialize.js';

const router = Router();
const BCRYPT_ROUNDS = 12;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(120);
const signupSchema = z.object({
  firstName: z.string().trim().max(50).optional().default(''),
  lastName: z.string().trim().max(50).optional().default(''),
  email,
  password: passwordRule,
  remember: z.boolean().optional().default(true),
});
const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(128),
  remember: z.boolean().optional().default(true),
});

function startSession(res: Parameters<typeof setAuthCookie>[0], user: UserDoc, remember = true) {
  setAuthCookie(res, signToken(String(user._id), user.tokenVersion, remember), remember);
}

router.get('/config', (_req, res) => {
  res.json({ googleClientId: env.GOOGLE_CLIENT_ID || null });
});

router.post('/signup', authLimiter, async (req, res) => {
  const data = parse(signupSchema, req.body);
  if (await User.exists({ email: data.email })) throw conflict('An account with this email already exists.');
  const user = (await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    lastLoginAt: new Date(),
  })) as UserDoc;
  startSession(res, user, data.remember);
  res.status(201).json({ user: publicUser(user, true) });
});

router.post('/login', authLimiter, async (req, res) => {
  const data = parse(loginSchema, req.body);
  const user = (await User.findOne({ email: data.email }).select('+password')) as UserDoc | null;
  // Same message for "no account" and "wrong password" so emails cannot be enumerated.
  const invalid = unauthorized('Incorrect email or password.');

  if (!user) {
    await bcrypt.compare(data.password, DUMMY_HASH); // same response time as a real check
    throw invalid;
  }
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(429, 'Too many failed attempts. Try again in a few minutes.');
  }
  if (!user.password) throw badRequest('This account uses Google sign-in. Please continue with Google.');

  const ok = await bcrypt.compare(data.password, user.password);
  if (!ok) {
    user.failedLogins = (user.failedLogins ?? 0) + 1;
    if (user.failedLogins >= MAX_FAILS) {
      user.lockUntil = new Date(Date.now() + LOCK_MS);
      user.failedLogins = 0;
    }
    await user.save();
    throw invalid;
  }
  user.failedLogins = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
  startSession(res, user, data.remember);
  res.json({ user: publicUser(user, true) });
});

/** Google Identity Services sends an ID token; we verify its signature + audience with Google. */
router.post('/google', authLimiter, async (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) throw badRequest('Google sign-in is not configured on this server.');
  const { credential } = parse(z.object({ credential: z.string().min(20).max(4096) }), req.body);
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('Google sign-in failed. Please try again.');
  }
  if (!payload?.email || !payload.email_verified) throw unauthorized('Your Google email is not verified.');

  let user = (await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] })) as
    | UserDoc
    | null;
  if (!user) {
    user = (await User.create({
      email: payload.email.toLowerCase(),
      googleId: payload.sub,
      firstName: payload.given_name ?? '',
      lastName: payload.family_name ?? '',
      avatar: payload.picture ?? '',
    })) as UserDoc;
  } else if (!user.googleId) {
    user.googleId = payload.sub; // link Google to an existing email account (email is verified by Google)
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
  }
  user.lastLoginAt = new Date();
  await user.save();
  startSession(res, user);
  res.json({ user: publicUser(user) });
});

router.get('/me', optionalAuth, (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/** Revokes every session on every device by bumping tokenVersion. */
router.post('/logout-all', requireAuth, async (req, res) => {
  await User.updateOne({ _id: req.user!._id }, { $inc: { tokenVersion: 1 } });
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
