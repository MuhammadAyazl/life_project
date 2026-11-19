import type { UserDoc } from '../models/User.js';
import { effectivePlan } from './plan.js';

/** The only shape of a user the API ever returns - no password hash, no internal counters. */
export function publicUser(u: UserDoc, hasPassword?: boolean) {
  return {
    id: String(u._id),
    firstName: u.firstName,
    lastName: u.lastName,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    role: u.role,
    plan: effectivePlan(u),
    addresses: u.addresses,
    hasGoogle: !!u.googleId,
    twoFactorEnabled: !!u.twoFactor?.enabled,
    hasPassword: hasPassword ?? undefined,
    createdAt: u.get('createdAt'),
  };
}
