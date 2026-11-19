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
import { clearAuthCookie } from '../utils/token.js';
import { endAllSessions, endCurrentSession, startSession } from '../services/session.js';
import { publicUser } from '../services/serialize.js';
import { assertNotLocked, clearFailures, recordFailure, unlockAccount } from '../services/loginGuard.js';
import { decrypt, readChallenge, signChallenge, useRecoveryCode, verifyTotp } from '../services/twoFactor.js';
import { passwordResetEmail, sendEmail } from '../services/email.js';
import crypto from 'node:crypto';
import { audit } from '../services/audit.js';
import { assertPasswordNotBreached } from '../services/passwordPolicy.js';

const router = Router();
const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

/**
 * Password policy (OWASP ASVS V2.1): at least 12 characters, up to 128, any characters
 * (spaces, emoji, passphrases) and NO composition rules like "must contain a number" -
 * length matters most. Known-breached passwords are rejected separately (passwordPolicy.ts).
 */
export const passwordRule = z
  .string()
  .min(12, 'Use at least 12 characters - a short sentence works well.')
  .max(128, 'Password is too long (max 128 characters).');

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


router.get('/config', (_req, res) => {
  res.json({ googleClientId: env.GOOGLE_CLIENT_ID || null });
});

router.post('/signup', authLimiter, async (req, res) => {
  const data = parse(signupSchema, req.body);
  await assertPasswordNotBreached(data.password);
  if (await User.exists({ email: data.email })) throw conflict('An account with this email already exists.');
  const user = (await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    lastLoginAt: new Date(),
  })) as UserDoc;
  await startSession(req, res, user, data.remember);
  audit(req, 'auth.signup', { actor: user });
  res.status(201).json({ user: publicUser(user, true) });
});

router.post('/login', authLimiter, async (req, res) => {
  const data = parse(loginSchema, req.body);
  const user = (await User.findOne({ email: data.email }).select('+password')) as UserDoc | null;
  // Same message for "no account" and "wrong password" so emails cannot be enumerated.
  const invalid = unauthorized('Incorrect email or password.');

  const ip = req.ip ?? 'unknown';
  await assertNotLocked(ip, data.email);

  if (!user) {
    await bcrypt.compare(data.password, DUMMY_HASH); // same response time as a real check
    await recordFailure(ip, data.email);
    throw invalid;
  }
  if (!user.password) throw badRequest('This account uses Google sign-in. Please continue with Google.');

  const ok = await bcrypt.compare(data.password, user.password);
  if (!ok) {
    if (await recordFailure(ip, data.email)) {
      audit(req, 'auth.lockout', { targetId: user._id, meta: { email: data.email } });
    } else {
      audit(req, 'auth.login_failed', { targetId: user._id, meta: { email: data.email } });
    }
    throw invalid;
  }
  await clearFailures(ip, data.email);
  // 2FA on: the password was right, now the authenticator code is needed (no session yet)
  if (user.twoFactor?.enabled) {
    return res.json({ twoFactorRequired: true, challenge: signChallenge(String(user._id), user.tokenVersion, data.remember) });
  }
  user.lastLoginAt = new Date();
  await user.save();
  await startSession(req, res, user, data.remember);
  audit(req, 'auth.login', { actor: user });
  res.json({ user: publicUser(user, true) });
});

/** Second sign-in step when 2FA is on: a 6-digit authenticator code or a one-time recovery code. */
router.post('/2fa', authLimiter, async (req, res) => {
  const { challenge, code } = parse(
    z.object({ challenge: z.string().min(20).max(1000), code: z.string().trim().min(6, 'Enter the 6-digit code.').max(20) }),
    req.body,
  );
  const ch = readChallenge(challenge);
  if (!ch) throw unauthorized('Your sign-in expired. Please enter your password again.');
  const user = (await User.findById(ch.sub).select('+twoFactor.secretEnc +twoFactor.recoveryHashes +twoFactor.lastStep')) as UserDoc | null;
  if (!user || user.tokenVersion !== ch.v || !user.twoFactor?.enabled || !user.twoFactor.secretEnc) {
    throw unauthorized('Your sign-in expired. Please enter your password again.');
  }
  const ip = req.ip ?? 'unknown';
  await assertNotLocked(ip, user.email);

  const tf = user.twoFactor;
  const digits = code.replace(/\s/g, '');
  let ok = false;
  if (/^\d{6}$/.test(digits)) {
    const step = verifyTotp(decrypt(tf.secretEnc!), digits);
    if (step !== null && step > (tf.lastStep ?? 0)) {
      tf.lastStep = step; // the same code can't be used twice
      ok = true;
    }
  } else {
    const left = useRecoveryCode(code, tf.recoveryHashes ?? []);
    if (left) {
      tf.recoveryHashes = left;
      ok = true;
      audit(req, 'auth.2fa_recovery_used', { actor: user, meta: { remaining: left.length } });
    }
  }
  if (!ok) {
    await recordFailure(ip, user.email);
    audit(req, 'auth.2fa_failed', { actor: user });
    throw unauthorized('That code is not correct. Check your authenticator app and try again.');
  }
  await clearFailures(ip, user.email);
  user.lastLoginAt = new Date();
  await user.save();
  await startSession(req, res, user, ch.r);
  audit(req, 'auth.login', { actor: user, meta: { twoFactor: true } });
  res.json({ user: publicUser(user, true) });
});

/** Step 1 of "forgot password": always answers the same, so it never reveals which emails exist. */
router.post('/forgot', authLimiter, async (req, res) => {
  const data = parse(z.object({ email }), req.body);
  const user = (await User.findOne({ email: data.email })) as UserDoc | null;
  if (user) {
    const token = crypto.randomBytes(32).toString('base64url');
    await User.updateOne(
      { _id: user._id },
      { resetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), resetTokenExpires: new Date(Date.now() + 30 * 60 * 1000) },
    );
    const link = `${env.allowedOrigins[0]}/reset-password#token=${token}`;
    const mail = passwordResetEmail(user.firstName || user.name, link);
    await sendEmail(user.email, mail.subject, mail.html, mail.text);
    audit(req, 'auth.password_reset_requested', { actor: user });
  }
  res.json({ message: 'If an account exists for that email, a reset link is on its way. Check your inbox (and spam).' });
});

/** Step 2: the emailed link sets a new password (once, within 30 minutes). */
router.post('/reset', authLimiter, async (req, res) => {
  const data = parse(z.object({ token: z.string().min(20).max(200), password: passwordRule }), req.body);
  await assertPasswordNotBreached(data.password);
  const hash = crypto.createHash('sha256').update(data.token).digest('hex');
  const user = (await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash')) as
    | UserDoc
    | null;
  if (!user) throw badRequest('This reset link is invalid or has expired. Please request a new one.');
  user.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  user.set({ resetTokenHash: null, resetTokenExpires: null });
  user.tokenVersion += 1; // sign out every device that used the old password
  await user.save();
  await endAllSessions(user._id);
  await unlockAccount(user.email);
  audit(req, 'auth.password_reset', { actor: user });
  res.json({ message: 'Password updated. You can sign in with your new password now.' });
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
  await user.save();
  if (user.twoFactor?.enabled) {
    return res.json({ twoFactorRequired: true, challenge: signChallenge(String(user._id), user.tokenVersion, true) });
  }
  user.lastLoginAt = new Date();
  await user.save();
  await startSession(req, res, user);
  audit(req, 'auth.login_google', { actor: user });
  res.json({ user: publicUser(user) });
});

router.get('/me', optionalAuth, (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

/** Ends this device's session on the server (not just the cookie). */
router.post('/logout', async (req, res) => {
  await endCurrentSession(req, res);
  res.json({ ok: true });
});

/** Revokes every session on every device by bumping tokenVersion. */
router.post('/logout-all', requireAuth, async (req, res) => {
  audit(req, 'auth.logout_all');
  await User.updateOne({ _id: req.user!._id }, { $inc: { tokenVersion: 1 } });
  await endAllSessions(req.user!._id);
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
