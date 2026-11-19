import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Two-factor sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator,
 * Authy...). Standard TOTP (RFC 6238): HMAC-SHA1, 30-second steps, 6 digits.
 * Secrets are encrypted with AES-256-GCM before they are stored.
 */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string) {
  const clean = s.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newSecret = () => base32Encode(crypto.randomBytes(20));

function hotp(secret: string, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const off = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString();
  return code.padStart(6, '0');
}

/** Returns the matching time step (for replay protection) or null. Accepts ±1 step of clock drift. */
export function verifyTotp(secret: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now / 1000 / 30);
  for (const s of [step, step - 1, step + 1]) {
    const expected = hotp(secret, s);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return s;
  }
  return null;
}

export const totpNow = (secret: string, now = Date.now()) => hotp(secret, Math.floor(now / 1000 / 30));

export function otpauthUrl(secret: string, email: string) {
  const label = encodeURIComponent(`ShopFussion:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=ShopFussion&algorithm=SHA1&digits=6&period=30`;
}

/* --------------------------- encryption at rest --------------------------- */

const KEY = crypto.createHash('sha256').update(`${env.JWT_SECRET}:2fa-secret-v1`).digest();

export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(enc: string) {
  const [iv, tag, data] = enc.split('.').map((p) => Buffer.from(p, 'base64url'));
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}

/* ------------------------------ recovery codes ------------------------------ */

const hashCode = (code: string) => crypto.createHash('sha256').update(code.replace(/[^a-z0-9]/gi, '').toLowerCase()).digest('hex');

/** 8 one-time codes like "k3f9-2mxq" - shown once, only hashes are stored. */
export function newRecoveryCodes() {
  const codes = Array.from({ length: 8 }, () => {
    const s = crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').toLowerCase().slice(0, 8);
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
  return { codes, hashes: codes.map(hashCode) };
}

/** If `code` is an unused recovery code, returns the remaining hashes (that code removed). */
export function useRecoveryCode(code: string, hashes: string[]): string[] | null {
  const h = hashCode(code);
  return hashes.includes(h) ? hashes.filter((x) => x !== h) : null;
}

/* ---------------------- short-lived sign-in challenge ---------------------- */

export function signChallenge(userId: string, tokenVersion: number, remember: boolean) {
  return jwt.sign({ sub: userId, v: tokenVersion, r: remember, p: '2fa' }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
}

export function readChallenge(token: string): { sub: string; v: number; r: boolean } | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    return p.p === '2fa' && typeof p.sub === 'string' ? { sub: p.sub, v: Number(p.v), r: p.r !== false } : null;
  } catch {
    return null;
  }
}
