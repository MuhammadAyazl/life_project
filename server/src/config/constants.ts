export const CATEGORIES = [
  'Mouse',
  'Decoration',
  'Headphones',
  'Speakers',
  'Watch',
  'Earbuds',
  'Home & Kitchen',
] as const;

export const ROLES = ['user', 'seller', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUS = ['PENDING_PAYMENT', 'ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export const PLAN = {
  TRIAL_DAYS: 7,
  /** Display prices only - no card is charged (payments are not connected). */
  PRICE_MONTHLY: 7,
  PRICE_YEARLY_PER_MONTH: 5,
} as const;

export const AUTH_COOKIE = 'sf_token';
/** "Remember me" sessions last 30 days and renew while the user keeps using the site. */
export const TOKEN_TTL_DAYS = 30;
