import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * ASVS V2.1.7: refuse passwords that appear in known data breaches.
 * Uses the Have I Been Pwned "range" API with k-anonymity: only the first 5 characters of the
 * password's SHA-1 hash leave the server - never the password or the full hash.
 * Fails open (allows the password) if the service can't be reached, so sign-up never breaks.
 */
const COMMON = new Set(['123456789012', 'password1234', 'qwertyuiopas', '111111111111', 'iloveyou1234', 'shopfussion123']);

export async function assertPasswordNotBreached(password: string) {
  if (COMMON.has(password.toLowerCase())) throw breached();
  if (env.isTest) return; // no network calls from automated tests

  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'ShopFussion-password-check' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return;
    const body = await res.text();
    for (const line of body.split('\n')) {
      const [hash, count] = line.trim().split(':');
      if (hash === suffix && Number(count) > 0) throw breached();
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.warn('[password] breach check unavailable, allowing password');
  }
}

const breached = () =>
  new AppError(400, 'This password has appeared in a data breach and is not safe. Please choose a different one.', {
    password: ['This password has appeared in a data breach. Please choose a different one.'],
  });
