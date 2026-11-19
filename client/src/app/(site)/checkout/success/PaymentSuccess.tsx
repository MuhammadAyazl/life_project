'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api, errorMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { useCart } from '@/components/providers/CartProvider';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/misc';

type Confirm = { paid: boolean; total: number };

/** Back from Stripe: ask the server (which asks Stripe) whether the payment really went through. */
export function PaymentSuccess() {
  const sessionId = useSearchParams().get('session_id') ?? '';
  const { clear } = useCart();
  const [state, setState] = useState<{ status: 'loading' | 'paid' | 'pending' | 'error'; total?: number; msg?: string }>({ status: 'loading' });
  const tries = useRef(0);

  useEffect(() => {
    if (!sessionId) return setState({ status: 'error', msg: 'Missing payment reference.' });
    let stop = false;
    const check = async () => {
      try {
        const r = await api<Confirm>('/orders/checkout/confirm', { method: 'POST', body: { sessionId } });
        if (stop) return;
        if (r.paid) {
          clear();
          setState({ status: 'paid', total: r.total });
        } else if (++tries.current < 5) {
          setState({ status: 'pending' });
          setTimeout(check, 2000); // bank confirmation can take a moment
        } else {
          setState({ status: 'pending' });
        }
      } catch (e) {
        if (!stop) setState({ status: 'error', msg: errorMessage(e) });
      }
    };
    check();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (state.status === 'loading') return <Spinner />;

  const ok = state.status === 'paid';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid place-items-center gap-3 py-20 text-center">
      <span className={`grid size-16 place-items-center rounded-full text-white ${ok ? 'bg-star' : 'bg-muted'}`}>
        <Icon name={ok ? 'check' : 'card'} size={30} strokeWidth={ok ? 3 : 2} />
      </span>
      <h1 className="text-3xl font-bold">{ok ? 'Payment successful!' : state.status === 'pending' ? 'Payment processing…' : 'Something went wrong'}</h1>
      <p className="max-w-md text-muted">
        {ok
          ? `Thank you! ${money(state.total ?? 0)} was paid by card and your order is placed.`
          : state.status === 'pending'
            ? 'We are waiting for your bank to confirm the payment. Your order will update automatically - check My Orders in a minute.'
            : state.msg}
      </p>
      <div className="mt-4 flex gap-3">
        <ButtonLink href="/account/orders">View my orders</ButtonLink>
        <ButtonLink href="/shop" variant="secondary">
          Continue shopping
        </ButtonLink>
      </div>
    </motion.div>
  );
}
