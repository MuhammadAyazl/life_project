import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { forbidden } from '../utils/AppError.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie auth: state-changing requests coming from a browser must
 * originate from our own site. (SameSite=Lax cookies are the first layer, this is the second.)
 */
export function originCheck(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();
  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch {
      origin = 'invalid';
    }
  }
  if (origin && !env.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
    throw forbidden('Request origin not allowed.');
  }
  next();
}

/** Removes keys like "$gt" or "a.b" from request bodies (defence in depth with sanitizeFilter). */
export function stripDangerousKeys(req: Request, _res: Response, next: NextFunction) {
  const clean = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor') continue;
        out[k] = clean(val);
      }
      return out;
    }
    return v;
  };
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
}

const skip = () => env.isTest;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // behind Vercel many visitors can share a proxy IP, so the global limit is generous
  limit: env.isProd ? 3000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
});

/** Brute-force protection for login / signup. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  // per IP *and* per account: stops password guessing on one account without
  // locking out everyone who happens to share an IP/proxy
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email ?? '').toLowerCase().slice(0, 120)}`,
  skip,
});
