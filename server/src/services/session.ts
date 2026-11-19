import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Session } from '../models/Session.js';
import type { UserDoc } from '../models/User.js';
import { clearAuthCookie, setAuthCookie, signToken, ttlDays, verifyToken } from '../utils/token.js';
import { AUTH_COOKIE } from '../config/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Signs the user in on this device: stores a server-side session and sets the auth cookie. */
export async function startSession(req: Request, res: Response, user: UserDoc, remember = true) {
  const sid = crypto.randomBytes(24).toString('base64url');
  await Session.create({
    _id: sid,
    user: user._id,
    expiresAt: new Date(Date.now() + ttlDays(remember) * DAY_MS),
    ip: req.ip ?? '',
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 200),
  });
  setAuthCookie(res, signToken(String(user._id), user.tokenVersion, remember, sid), remember);
}

/** Sliding renewal of an existing session (same id, new expiry + fresh cookie). */
export async function renewSession(res: Response, user: UserDoc, sid: string, remember: boolean) {
  await Session.updateOne({ _id: sid }, { expiresAt: new Date(Date.now() + ttlDays(remember) * DAY_MS) });
  setAuthCookie(res, signToken(String(user._id), user.tokenVersion, remember, sid), remember);
}

export const sessionIsActive = (sid: string, userId: Types.ObjectId | string) =>
  Session.exists({ _id: sid, user: userId, expiresAt: { $gt: new Date() } });

/** Sign out this device: the session is deleted on the server, then the cookie is cleared. */
export async function endCurrentSession(req: Request, res: Response) {
  const token = req.cookies?.[AUTH_COOKIE];
  const payload = typeof token === 'string' ? verifyToken(token) : null;
  if (payload) await Session.deleteOne({ _id: payload.s });
  clearAuthCookie(res);
}

/** Sign out every device (optionally keeping one, e.g. the device that just changed the password). */
export async function endAllSessions(userId: Types.ObjectId | string, exceptSid?: string) {
  await Session.deleteMany({ user: userId, ...(exceptSid ? { _id: { $ne: exceptSid } } : {}) });
}
