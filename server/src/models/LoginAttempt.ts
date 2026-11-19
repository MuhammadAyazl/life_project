import { Schema, model } from 'mongoose';

/**
 * Failed sign-in counters, kept per (IP + email) and per email.
 * Locking per IP+email stops password guessing without letting a stranger lock the real
 * owner out of their account from somewhere else. Documents expire on their own (TTL index).
 */
const loginAttemptSchema = new Schema({
  key: { type: String, required: true, unique: true }, // "ip|email" or "acct|email"
  count: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const LoginAttempt = model('LoginAttempt', loginAttemptSchema);
