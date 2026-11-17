import type { UserDoc } from '../models/User.js';

export type PlanTier = 'free' | 'trial' | 'plus';

export interface EffectivePlan {
  tier: PlanTier;
  isMember: boolean;
  billing: 'monthly' | 'yearly' | null;
  endsAt: Date | null;
  daysLeft: number;
  trialUsed: boolean;
  canStartTrial: boolean;
  /** Paid via Stripe and auto-renew switched off (still active until endsAt). */
  cancelAtPeriodEnd: boolean;
  hasBilling: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

/** Works out the plan a user has *right now* - an expired trial/plus silently becomes free. */
export function effectivePlan(user: Pick<UserDoc, 'plan'>, now = new Date()): EffectivePlan {
  const p = (user.plan ?? {}) as NonNullable<UserDoc['plan']>;
  const trialUsed = !!p.trialUsed;
  let tier: PlanTier = 'free';
  let endsAt: Date | null = null;

  if (p.tier === 'plus' && p.plusEndsAt && p.plusEndsAt > now) {
    tier = 'plus';
    endsAt = p.plusEndsAt;
  } else if (p.tier === 'trial' && p.trialEndsAt && p.trialEndsAt > now) {
    tier = 'trial';
    endsAt = p.trialEndsAt;
  }

  return {
    tier,
    isMember: tier !== 'free',
    billing: tier === 'plus' ? ((p.billing as 'monthly' | 'yearly' | null) ?? null) : null,
    endsAt,
    daysLeft: endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY)) : 0,
    trialUsed,
    canStartTrial: !trialUsed && tier === 'free',
    cancelAtPeriodEnd: tier === 'plus' && !!p.cancelAtPeriodEnd,
    hasBilling: !!p.stripeCustomerId,
  };
}

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY);
