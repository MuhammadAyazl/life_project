'use client';

import { useState } from 'react';
import { api, errorMessage, fieldError } from '@/lib/api';
import type { Address } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

const EMPTY = { name: '', email: '', street: '', city: '', state: '', zip: '', country: '', phone: '' };

/** Saves a delivery address on the server and returns the updated list. */
export function AddressForm({ onSaved, defaults }: { onSaved: (a: Address, all: Address[]) => void; defaults?: Partial<typeof EMPTY> }) {
  const [f, setF] = useState({ ...EMPTY, ...defaults });
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fe = (k: string) => fieldError(err, k);

  return (
    <form
      noValidate
      className="grid gap-3.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          const r = await api<{ address: Address; addresses: Address[] }>('/users/me/addresses', { method: 'POST', body: f });
          onSaved(r.address, r.addresses);
          setF({ ...EMPTY, ...defaults });
        } catch (e) {
          setErr(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Full name" autoComplete="name" value={f.name} onChange={set('name')} error={fe('name')} />
      <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={fe('email')} />
      <Field label="Street" autoComplete="street-address" value={f.street} onChange={set('street')} error={fe('street')} />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="City" autoComplete="address-level2" value={f.city} onChange={set('city')} error={fe('city')} />
        <Field label="State" autoComplete="address-level1" value={f.state} onChange={set('state')} error={fe('state')} />
        <Field label="Zip code" autoComplete="postal-code" value={f.zip} onChange={set('zip')} error={fe('zip')} />
        <Field label="Country" autoComplete="country-name" value={f.country} onChange={set('country')} error={fe('country')} />
      </div>
      <Field label="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={fe('phone')} />
      {!!err && !fe('name') && !fe('email') && !fe('street') && !fe('phone') && (
        <p className="text-sm text-danger" role="alert">
          {errorMessage(err)}
        </p>
      )}
      <Button type="submit" loading={busy} className="mt-1">
        SAVE ADDRESS
      </Button>
    </form>
  );
}
