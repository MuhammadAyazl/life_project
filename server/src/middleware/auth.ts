import type { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE, type Role } from '../config/constants.js';
import { User, type UserDoc } from '../models/User.js';
import { Store } from '../models/Store.js';
import { forbidden, unauthorized } from '../utils/AppError.js';
import { shouldRenew, verifyToken } from '../utils/token.js';
import { renewSession, sessionIsActive } from '../services/session.js';

function readToken(req: Request): string | null {
  const cookie = req.cookies?.[AUTH_COOKIE];
  if (typeof cookie === 'string' && cookie) return cookie;
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

async function loadUser(req: Request, res: Response): Promise<UserDoc | null> {
  const token = readToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = (await User.findById(payload.sub)) as UserDoc | null;
  if (!user || user.tokenVersion !== payload.v) return null;
  // signed out / revoked on the server -> the token is dead even if the cookie was copied
  if (!(await sessionIsActive(payload.s, user._id))) return null;
  req.sessionId = payload.s;
  // keep active users signed in: re-issue the cookie once it is a day old
  if (shouldRenew(payload) && !res.headersSent) await renewSession(res, user, payload.s, payload.r);
  return user;
}

/** Attaches req.user when a valid session exists, but never blocks the request. */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  req.user = (await loadUser(req, res)) ?? undefined;
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await loadUser(req, res);
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role as Role)) throw forbidden();
    next();
  };

/** Seller routes: the user must own an approved, active store. Puts it on res.locals.store. */
export async function requireSeller(req: Request, res: Response, next: NextFunction) {
  if (!req.user) throw unauthorized();
  const store = await Store.findOne({ owner: req.user._id });
  if (!store || store.status !== 'approved') throw forbidden('Your store is not approved yet.');
  if (!store.isActive) throw forbidden('Your store has been deactivated by an admin.');
  res.locals.store = store;
  next();
}
