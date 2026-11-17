'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage, fieldError } from '@/lib/api';
import type { Store } from '@/lib/types';
import { useRequireAuth } from '@/components/account/useRequireAuth';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/misc';

const EMPTY = { name: '', username: '', description: '', address: '', email: '', phone: '' };

export function CreateStoreView() {
  const { user, ready } = useRequireAuth();
  const [store, setStore] = useState<Store | null | undefined>(undefined);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api<{ store: Store | null }>('/stores/mine')
      .then((r) => {
        setStore(r.store);
        if (r.store?.status === 'rejected') {
          const s = r.store;
          setF({ name: s.name, username: s.username, description: s.description, address: s.address, email: s.email, phone: s.phone ?? '' });
        }
      })
      .catch(() => setStore(null));
  }, [ready]);

  if (!ready || store === undefined) return <Spinner />;

  if (store && store.status === 'approved') {
    return (
      <div className="grid place-items-center gap-3 py-20 text-center">
        <Icon name="store" size={40} className="text-star" />
        <h1 className="text-3xl font-bold">Your store is live!</h1>
        <p className="text-muted">{store.name} is approved. Manage products and orders from your dashboard.</p>
        <ButtonLink href="/seller" className="mt-3">Open seller dashboard</ButtonLink>
      </div>
    );
  }
  if (store && store.status === 'pending') {
    return (
      <div className="grid place-items-center gap-3 py-20 text-center">
        <Icon name="shield" size={40} className="text-brand" />
        <h1 className="text-3xl font-bold">Application under review</h1>
        <p className="max-w-md text-muted">
          Thanks! We received your application for <b>{store.name}</b>. An admin will review it soon - you’ll get seller access as soon as it’s approved.
        </p>
      </div>
    );
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fe = (k: string) => fieldError(err, k);

  return (
    <div className="mx-auto max-w-2xl py-4">
      <h1 className="text-3xl font-bold">Create your store</h1>
      <p className="mt-2 mb-8 text-muted">
        Sell your products to ShopFussion customers. Submit your store details - an admin approves new stores before they go live.
      </p>
      {store?.status === 'rejected' && (
        <p className="mb-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">Your previous application was not approved. Update the details and submit again.</p>
      )}
      <form
        noValidate
        className="grid gap-4 rounded-2xl border border-line bg-surface p-6 sm:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const r = await api<{ store: Store }>('/stores', { method: 'POST', body: f });
            setStore(r.store);
            window.scrollTo({ top: 0 });
          } catch (e) {
            setErr(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" value={f.name} onChange={set('name')} error={fe('name')} maxLength={80} />
          <Field label="Username" hint="shopfussion.com/store/…" value={f.username} onChange={set('username')} error={fe('username')} maxLength={30} />
        </div>
        <TextArea label="Description" value={f.description} onChange={set('description')} error={fe('description')} maxLength={1000} />
        <Field label="Address" value={f.address} onChange={set('address')} error={fe('address')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store email" type="email" value={f.email} placeholder={user?.email} onChange={set('email')} error={fe('email')} />
          <Field label="Phone" type="tel" value={f.phone} onChange={set('phone')} error={fe('phone')} />
        </div>
        {!!err && !['name', 'username', 'description', 'address', 'email', 'phone'].some(fe) && <p className="text-sm text-danger">{errorMessage(err)}</p>}
        <Button type="submit" loading={busy} className="justify-self-start">
          Submit application
        </Button>
      </form>
    </div>
  );
}
