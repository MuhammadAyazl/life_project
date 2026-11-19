import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { AUTH_COOKIE, TOKEN_TTL_DAYS } from '../config/constants.js';

interface TokenPayload {
  sub: string;
  v: number; // tokenVersion - lets us revoke every session of a user
  r: boolean; // "remember me": long-lived cookie that survives closing the browser
  s: string; // server-side session id (see models/Session.ts)
  iat?: number;
}

const DAY = 24 * 60 * 60;
/** Without "remember me" the session lasts 1 day and ends when the browser closes. */
const SHORT_TTL_DAYS = 1;
export const ttlDays = (remember: boolean) => (remember ? TOKEN_TTL_DAYS : SHORT_TTL_DAYS);

export function signToken(userId: string, tokenVersion: number, remember: boolean, sessionId: string) {
  return jwt.sign({ sub: userId, v: tokenVersion, r: remember, s: sessionId }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${ttlDays(remember)}d`,
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    // tokens without a session id (issued before server-side sessions) are no longer accepted
    return typeof p.sub === 'string' && typeof p.v === 'number' && typeof p.s === 'string'
      ? { sub: p.sub, v: p.v, r: p.r !== false, s: p.s, iat: p.iat }
      : null;
  } catch {
    return null;
  }
}

/** Sliding session: once a token is a day old, an active user gets a fresh one (so they never have to log in again). */
export const shouldRenew = (p: TokenPayload) => !!p.iat && Date.now() / 1000 - p.iat > DAY;

/** httpOnly: JS (and any XSS) cannot read it. SameSite=Lax blocks most cross-site requests. */
export function setAuthCookie(res: Response, token: string, remember = true) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    // no maxAge = session cookie (deleted when the browser closes)
    ...(remember ? { maxAge: ttlDays(true) * DAY * 1000 } : {}),
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/' });
}
