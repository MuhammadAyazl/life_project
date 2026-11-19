'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { dateTime, money, statusLabel } from '@/lib/format';
import type { Order, StoreRef } from '@/lib/types';
import { useRequireAuth } from '@/components/account/useRequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { ProductVisual } from '@/components/product/ProductArt';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, Spinner } from '@/components/ui/misc';

const tone = (s: string) => (s === 'DELIVERED' ? 'green' : s === 'CANCELLED' ? 'red' : s === 'SHIPPED' ? 'brand' : 'amber') as 'green';

export function OrdersView() {
  const { ready } = useRequireAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState('');
  const toast = useToast();

  const load = useCallback(() => {
    api<{ orders: Order[] }>('/orders/mine')
      .then((r) => setOrders(r.orders))
      .catch((e) => setErr(errorMessage(e)));
  }, []);
  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready || (!orders && !err)) return <Spinner />;
  if (err) return <EmptyState icon="globe" title="Could not load orders" text={err} />;
  if (!orders?.length) return <EmptyState icon="box" title="No orders yet" text="When you place an order it will show up here." action={{ href: '/shop', label: 'Start shopping' }} />;

  return (
    <>
      <h1 className="mb-7 text-3xl font-bold">My Orders</h1>
      <div className="grid gap-5">
        {orders.map((o) => {
          const store = typeof o.store === 'object' ? (o.store as StoreRef) : null;
          return (
            <article key={o.id} className="rounded-2xl border border-line bg-surface p-5">
              <header className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-4 text-sm">
                <Badge tone={tone(o.status)}>{statusLabel(o.status)}</Badge>
                <span className="text-muted">{dateTime(o.createdAt)}</span>
                {store && (
                  <Link href={`/store/${store.username}`} className="text-muted hover:text-brand">
                    Sold by {store.name}
                  </Link>
                )}
                <span className="ml-auto font-semibold">{money(o.total)}</span>
              </header>
              <ul className="grid gap-3">
                {o.items.map((it) => (
                  <li key={it.product} className="flex items-center gap-4">
                    <ProductVisual name={it.name} image={it.image} art={it.art} className="size-14 shrink-0 rounded-lg" artClassName="w-[64%]" sizes="56px" />
                    <Link href={`/product/${it.slug}`} className="flex-1 font-medium hover:underline">
                      {it.name}
                    </Link>
                    <span className="text-sm text-muted">
                      {it.qty} × {money(it.price)}
                    </span>
                  </li>
                ))}
              </ul>
              <footer className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
                <span>
                  {o.paymentMethod === 'CARD' ? 'Card' : 'Cash on delivery'} · {o.isPaid ? 'Paid' : o.status === 'CANCELLED' ? 'Not charged' : 'Not paid yet'}
                </span>
                {o.coupon?.code && <Badge>{o.coupon.code} −{o.coupon.discount}%</Badge>}
                {['PENDING_PAYMENT', 'ORDER_PLACED', 'PROCESSING'].includes(o.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-danger"
                    onClick={async () => {
                      try {
                        const r = await api<{ refunded?: boolean }>(`/orders/${o.id}/cancel`, { method: 'POST' });
                        toast(r.refunded ? 'Order cancelled - refund sent to your card' : 'Order cancelled');
                        load();
                      } catch (e) {
                        toast(errorMessage(e), 'error');
                      }
                    }}
                  >
                    Cancel order
                  </Button>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </>
  );
}
