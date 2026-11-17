'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api, errorMessage } from '@/lib/api';
import { shortDate, cn } from '@/lib/format';
import type { User } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/misc';
import { Icon } from '@/components/ui/Icon';

const FREE = ['Limited coupons', 'Limited discounts', 'No early access to sales', 'Limited cashback & rewards', 'Free shipping'];
const PLUS = ['Member-exclusive coupons (PLUS10)', 'Exclusive discounts', 'Early access to sales', 'Cashback & rewards boost', 'Free & faster shipping'];

export function PlusPlans() {
  const { user, setUser, loading } = useAuth();
  const [yearly, setYearly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const plan = user?.plan;

  // Is online payment configured on the server? (null = still checking)
  const [payments, setPayments] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ paymentsEnabled: boolean }>('/plans')
      .then((r) => setPayments(r.paymentsEnabled))
      .catch(() => setPayments(false));
  }, []);

  // Back from Stripe: ?status=success&session_id=... → the server verifies the payment with Stripe.
  const params = useSearchParams();
  const handled = useRef(false);
  useEffect(() => {
    if (loading || handled.current) return;
    const status = params.get('status');
    const sessionId = params.get('session_id');
    if (!status) return;
    handled.current = true;
    router.replace('/plus', { scroll: false });
    if (status === 'cancelled') return toast('Payment cancelled - you were not charged.');
    if (status === 'success' && sessionId && user) {
      setBusy('confirm');
      api<{ user: User; message: string }>('/plans/checkout/confirm', { method: 'POST', body: { sessionId } })
        .then((r) => {
          setUser(r.user);
          toast(r.message);
        })
        .catch((e) => toast(errorMessage(e), 'error'))
        .finally(() => setBusy(null));
    }
  }, [loading, params, user, router, setUser, toast]);

  async function act(path: 'trial' | 'checkout' | 'cancel' | 'portal') {
    if (!user) return router.push('/signup?next=/plus');
    setBusy(path);
    try {
      const r = await api<{ user?: User; message?: string; url?: string }>(`/plans/${path}`, {
        method: 'POST',
        body: path === 'checkout' ? { billing: yearly ? 'yearly' : 'monthly' } : undefined,
      });
      // checkout/portal: go to the secure Stripe page (card details never touch our server)
      if (r.url) return void (window.location.href = r.url);
      if (r.user) setUser(r.user);
      if (r.message) toast(r.message);
      setBusy(null);
    } catch (e) {
      toast(errorMessage(e), 'error');
      setBusy(null);
    }
  }

  const card = 'flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_14px_40px_-20px_rgba(20,40,80,.35)]';

  return (
    <>
      {plan?.isMember && (
        <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-8 max-w-xl rounded-xl bg-star/10 px-5 py-3 text-center text-sm font-medium text-star">
          {plan.tier === 'trial'
            ? `Your free trial is active - ${plan.daysLeft} day${plan.daysLeft === 1 ? '' : 's'} left (ends ${shortDate(plan.endsAt!)}).`
            : `You are a Plus member (${plan.billing}) until ${shortDate(plan.endsAt!)}.`}
        </motion.p>
      )}
      <div className="flex flex-wrap items-stretch justify-center gap-6">
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={card}>
          <div className="tint px-6 py-5">
            <h2 className="flex items-center justify-between text-lg font-bold">
              Free {(!plan || !plan.isMember) && <Badge>{user ? 'Current' : 'Default'}</Badge>}
            </h2>
            <p className="mt-3 font-display text-3xl font-bold">$0</p>
            <p className="mt-2 text-xs text-muted">Always free</p>
          </div>
          <ul className="grid flex-1 gap-3.5 px-6 py-5 text-sm">
            {FREE.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="font-bold text-star">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={cn(card, 'ring-2 ring-brand')}
        >
          <div className="tint px-6 py-5">
            <h2 className="flex items-center justify-between text-lg font-bold">
              Plus {plan?.isMember ? <Badge tone="green">Active</Badge> : <Badge>Popular</Badge>}
            </h2>
            <p className="text-xs text-muted">ShopFussion Plus Membership</p>
            <p className="mt-3 font-display text-3xl font-bold">
              <motion.span key={String(yearly)} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
                ${yearly ? 5 : 7}
              </motion.span>{' '}
              <span className="font-sans text-sm font-normal text-muted">/month</span>
            </p>
            <button onClick={() => setYearly((y) => !y)} aria-pressed={yearly} className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span className={cn('relative h-5 w-9 rounded-full transition', yearly ? 'bg-brand' : 'bg-line')}>
                <motion.span layout className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow', yearly ? 'right-0.5' : 'left-0.5')} />
              </span>
              {yearly ? 'Billed annually' : 'Billed monthly'}
            </button>
          </div>
          <ul className="grid flex-1 gap-3.5 px-6 py-5 text-sm">
            {PLUS.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="font-bold text-star">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="grid gap-2.5 px-6 pb-6">
            {loading ? null : !user || plan?.canStartTrial ? (
              <Button className="w-full" loading={busy === 'trial'} onClick={() => act('trial')}>
                Start 7-day free trial
              </Button>
            ) : null}
            {busy === 'confirm' && <p className="text-center text-sm text-muted">Confirming your payment with Stripe…</p>}
            {plan?.tier !== 'plus' && (
              <>
                <Button
                  variant={!user || plan?.canStartTrial ? 'secondary' : 'primary'}
                  className="w-full"
                  loading={busy === 'checkout' || payments === null}
                  disabled={payments === false}
                  onClick={() => act('checkout')}
                >
                  <Icon name="card" size={18} />
                  {plan?.tier === 'trial' ? 'Upgrade to Plus - pay now' : 'Become a Plus member'}
                </Button>
                {payments === false && (
                  <p className="text-center text-xs text-muted">Online payment is coming soon. Meanwhile, enjoy the free trial.</p>
                )}
              </>
            )}
            {plan?.tier === 'plus' && plan.hasBilling && (
              <Button variant="secondary" size="sm" loading={busy === 'portal'} onClick={() => act('portal')}>
                Manage billing &amp; invoices
              </Button>
            )}
            {plan?.isMember && !plan.cancelAtPeriodEnd && (
              <Button variant="ghost" size="sm" loading={busy === 'cancel'} onClick={() => act('cancel')}>
                {plan.tier === 'plus' ? 'Turn off auto-renew' : 'End free trial'}
              </Button>
            )}
            {plan?.cancelAtPeriodEnd && (
              <p className="text-center text-xs text-muted">Auto-renew is off. Plus ends on {shortDate(plan.endsAt!)}.</p>
            )}
            {user && !plan?.canStartTrial && !plan?.isMember && <p className="text-center text-xs text-muted">You have already used your free trial.</p>}
          </div>
        </motion.section>
      </div>
      <p className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-2 text-center text-xs text-muted">
        <Icon name="shield" size={16} />
        Secure payments by Stripe. We never see or store your card details. Cancel anytime.
      </p>
    </>
  );
}
