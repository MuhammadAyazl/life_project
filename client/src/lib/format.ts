import { clsx, type ClassValue } from 'clsx';

export const cn = (...v: ClassValue[]) => clsx(v);

export function money(n: number) {
  const r = Math.round(n * 100) / 100;
  return '$' + (r % 1 ? r.toFixed(2) : String(r));
}

export function discountPct(price: number, mrp: number) {
  return mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
}

export function shortDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function dateTime(d: string | Date) {
  return new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export const statusLabel = (s: string) =>
  s === 'PENDING_PAYMENT' ? 'Awaiting payment' : s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** Only allow same-site relative redirects (prevents open-redirect via ?next=). */
export function safeNext(next: string | null | undefined, fallback = '/') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}
