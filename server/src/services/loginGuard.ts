import { LoginAttempt } from '../models/LoginAttempt.js';
import { AppError } from '../utils/AppError.js';

/**
 * Brute-force protection for password sign-in.
 * - Per IP + account: 5 wrong passwords lock THAT computer out of THAT account for 15 minutes.
 *   Someone guessing from elsewhere can no longer lock the real owner out.
 * - Per account (all IPs together): 30 wrong passwords in an hour lock the account for 15 minutes,
 *   so a guesser spreading attempts over many IPs is still slowed right down.
 */
const IP_MAX = 5;
const ACCT_MAX = 30;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;

const ipKey = (ip: string, email: string) => `ip|${ip}|${email}`;
const acctKey = (email: string) => `acct|${email}`;

export async function assertNotLocked(ip: string, email: string) {
  const now = new Date();
  const locked = await LoginAttempt.exists({ key: { $in: [ipKey(ip, email), acctKey(email)] }, lockUntil: { $gt: now } });
  if (locked) throw new AppError(429, 'Too many failed attempts. Try again in 15 minutes, or reset your password.');
}

async function bump(key: string, max: number) {
  const doc = await LoginAttempt.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + WINDOW_MS) } },
    { upsert: true, new: true },
  );
  if (doc.count >= max) {
    doc.lockUntil = new Date(Date.now() + LOCK_MS);
    doc.count = 0;
    doc.expiresAt = new Date(Date.now() + Math.max(LOCK_MS, WINDOW_MS));
    await doc.save();
    return true;
  }
  return false;
}

/** Returns true when this failure triggered a new lock. */
export async function recordFailure(ip: string, email: string) {
  const [ipLocked, acctLocked] = await Promise.all([bump(ipKey(ip, email), IP_MAX), bump(acctKey(email), ACCT_MAX)]);
  return ipLocked || acctLocked;
}

export async function clearFailures(ip: string, email: string) {
  await LoginAttempt.deleteOne({ key: ipKey(ip, email) });
}

/** Admin/owner recovery: wipe every lock and counter for an account. */
export async function unlockAccount(email: string) {
  await LoginAttempt.deleteMany({ key: { $regex: `\\|${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } });
}
