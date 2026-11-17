'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, errorMessage } from '@/lib/api';
import { money } from '@/lib/format';
import type { Address } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart, MAX_QTY } from '@/components/providers/CartProvider';
import { AddressForm } from '@/components/account/AddressForm';
import { ProductVisual } from '@/components/product/ProductArt';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, Spinner } from '@/components/ui/misc';

type Coupon = { code: string; discount: number; description: string };

export function CartView() {
  const { lines, count, subtotal, ready, setQty, remove, clear } = useCart();
  const { user, setUser, loading } = useAuth();
  const [addrId, setAddrId] = useState('');
  const [addrOpen, setAddrOpen] = useState(false);
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [cmsg, setCmsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [perr, setPerr] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<number | null>(null);

  if (!ready) return <Spinner />;

  if (placed !== null) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid place-items-center gap-3 py-20 text-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
          className="grid size-16 place-items-center rounded-full bg-star text-white"
        >
          <Icon name="check" size={30} strokeWidth={3} />
        </motion.span>
        <h1 className="text-3xl font-bold">Order placed!</h1>
        <p className="text-muted">Thank you for shopping with us. Total {money(placed)} - pay cash on delivery.</p>
        <div className="mt-4 flex gap-3">
          <ButtonLink href="/account/orders">View my orders</ButtonLink>
          <ButtonLink href="/shop" variant="secondary">
            Continue shopping
          </ButtonLink>
        </div>
      </motion.div>
    );
  }

  if (!count) {
    return <EmptyState icon="cart" title="Your cart is empty" text="Looks like you haven’t added anything yet." action={{ href: '/shop', label: 'Continue shopping' }} />;
  }

  const discount = coupon ? Math.round(subtotal * coupon.discount) / 100 : 0;
  const addresses: Address[] = user?.addresses ?? [];
  const selected = addrId || addresses[addresses.length - 1]?._id || '';

  async function applyCoupon() {
    setCmsg(null);
    if (!code.trim()) return setCmsg({ t: 'Enter a coupon code.', ok: false });
    try {
      const r = await api<{ coupon: Coupon }>('/orders/coupon/validate', { method: 'POST', body: { code } });
      setCoupon(r.coupon);
      setCmsg({ t: `Coupon applied: ${r.coupon.discount}% off.`, ok: true });
    } catch (e) {
      setCoupon(null);
      setCmsg({ t: errorMessage(e), ok: false });
    }
  }

  async function placeOrder() {
    setPerr('');
    if (!selected) return setPerr('Please add a delivery address.');
    setBusy(true);
    try {
      const r = await api<{ total: number }>('/orders', {
        method: 'POST',
        body: { items: lines.map((l) => ({ productId: l.id, qty: l.qty })), addressId: selected, couponCode: coupon?.code, paymentMethod: 'COD' },
      });
      clear();
      setPlaced(r.total);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setPerr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold">My Cart</h1>
      <p className="mt-1 flex gap-4 text-muted">
        {count} {count === 1 ? 'item' : 'items'} in your cart
        <Link href="/shop" className="font-medium text-brand hover:underline">
          Add more →
        </Link>
      </p>

      <div className="mt-9 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_370px]">
        <section aria-label="Cart items">
          <div className="hidden grid-cols-[2.2fr_1.1fr_1fr_.6fr] gap-4 border-b border-line pb-4 font-medium text-muted sm:grid">
            <span>Product</span>
            <span className="text-center">Quantity</span>
            <span className="text-center">Total</span>
            <span className="text-center">Remove</span>
          </div>
          <AnimatePresence initial={false}>
            {lines.map((l) => (
              <motion.div
                key={l.id}
                layout
                exit={{ opacity: 0, x: -40, height: 0 }}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-5 sm:grid-cols-[2.2fr_1.1fr_1fr_.6fr]"
              >
                <Link href={`/product/${l.slug}`} className="col-span-2 flex items-center gap-4 sm:col-span-1">
                  <ProductVisual name={l.name} image={l.image} art={l.art} className="size-20 shrink-0 rounded-xl" artClassName="w-[62%]" sizes="80px" />
                  <div>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-sm text-muted">{l.category}</p>
                    <p className="font-medium">{money(l.price)}</p>
                  </div>
                </Link>
                <div className="sm:text-center">
                  <div className="inline-flex items-center gap-1 rounded-lg border border-line p-1">
                    <button className="grid size-8 place-items-center rounded-md text-muted hover:bg-chip" aria-label="Decrease quantity" onClick={() => setQty(l.id, l.qty - 1)}>
                      <Icon name="minus" size={16} />
                    </button>
                    <span className="min-w-7 text-center">{l.qty}</span>
                    <button
                      className="grid size-8 place-items-center rounded-md text-muted hover:bg-chip disabled:opacity-40"
                      aria-label="Increase quantity"
                      disabled={l.qty >= MAX_QTY}
                      onClick={() => setQty(l.id, l.qty + 1)}
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-right font-semibold sm:text-center">{money(l.price * l.qty)}</div>
                <div className="col-start-2 text-right sm:col-start-auto sm:text-center">
                  <button onClick={() => remove(l.id)} aria-label={`Remove ${l.name}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-chip hover:text-danger sm:inline-grid">
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        <aside aria-label="Payment summary" className="rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="mb-5 text-xl font-bold">Payment Summary</h2>

          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Payment method</p>
          <label className="flex items-center gap-2.5 py-1">
            <input type="radio" checked readOnly className="size-4 accent-[var(--brand)]" /> Cash on delivery
          </label>
          <p className="text-xs text-muted">Online card payments are coming soon.</p>

          {loading ? null : !user ? (
            <div className="mt-6 rounded-xl bg-chip p-4 text-sm">
              <p className="mb-3">Sign in to add your address and place the order.</p>
              <ButtonLink href="/login?next=/cart" className="w-full">
                Sign in to checkout
              </ButtonLink>
            </div>
          ) : (
            <>
              <p className="mt-6 mb-2 text-xs font-medium tracking-wide text-muted uppercase">Delivery address</p>
              {addresses.length > 0 ? (
                <select className="field" value={selected} onChange={(e) => setAddrId(e.target.value)} aria-label="Select address">
                  {addresses.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} - {a.street}, {a.city}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted">No saved address yet.</p>
              )}
              <button onClick={() => setAddrOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:text-brand">
                Add address <Icon name="plus" size={16} />
              </button>

              <div className="mt-5 grid gap-1.5 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <b className="font-medium text-ink">{money(subtotal)}</b>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Shipping</span>
                  <b className="font-medium text-ink">Free</b>
                </div>
                {coupon && (
                  <div className="flex justify-between text-muted">
                    <span>Discount ({coupon.discount}%)</span>
                    <b className="font-medium text-star">-{money(discount)}</b>
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input className="field" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" maxLength={20} />
                <Button variant="primary" size="sm" onClick={applyCoupon}>
                  Apply
                </Button>
              </div>
              <p className={`mt-1.5 min-h-5 text-xs ${cmsg?.ok ? 'text-star' : 'text-danger'}`} role="status">
                {cmsg?.t}
              </p>
              <div className="mt-2 flex justify-between border-t border-line pt-4 text-lg font-bold">
                <span>Total</span>
                <span>{money(subtotal - discount)}</span>
              </div>
              <Button className="mt-4 w-full" size="lg" loading={busy} onClick={placeOrder}>
                Place Order
              </Button>
              {perr && (
                <p className="mt-3 text-center text-sm text-danger" role="alert">
                  {perr}
                </p>
              )}
            </>
          )}
        </aside>
      </div>

      <Modal open={addrOpen} onClose={() => setAddrOpen(false)} title={<>Add New <b>Address</b></>}>
        <AddressForm
          defaults={{ name: user?.name ?? '', email: user?.email ?? '' }}
          onSaved={(a, all) => {
            if (user) setUser({ ...user, addresses: all });
            setAddrId(a._id);
            setAddrOpen(false);
            setPerr('');
          }}
        />
      </Modal>
    </>
  );
}
