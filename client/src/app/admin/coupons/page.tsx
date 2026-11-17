'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage, fieldError } from '@/lib/api';
import { shortDate } from '@/lib/format';
import type { Coupon } from '@/lib/types';
import { useToast } from '@/components/providers/ToastProvider';
import { TableWrap, Toggle } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { EmptyState, PageTitle, Spinner } from '@/components/ui/misc';

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const EMPTY = { code: '', description: '', discount: '', expiresAt: tomorrow(), forNewUser: false, forMember: false };

export default function CouponsPage() {
  const [list, setList] = useState<Coupon[] | null>(null);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api<{ coupons: Coupon[] }>('/admin/coupons')
      .then((r) => setList(r.coupons))
      .catch((e) => setErr(e));
  }, []);

  if (!list && err) return <EmptyState icon="globe" title="Could not load coupons" text={errorMessage(err)} />;
  if (!list) return <Spinner />;
  const fe = (k: string) => fieldError(err, k);

  return (
    <>
      <PageTitle>
        Add <b>Coupons</b>
      </PageTitle>
      <form
        noValidate
        className="grid max-w-xl gap-4 rounded-xl border border-line bg-surface p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const r = await api<{ coupon: Coupon }>('/admin/coupons', { method: 'POST', body: f });
            setList((l) => [r.coupon, ...l!]);
            setF({ ...EMPTY, expiresAt: tomorrow() });
            toast(`Coupon ${r.coupon.code} added`);
          } catch (e) {
            setErr(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Coupon code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} error={fe('code')} maxLength={20} />
          <Field label="Discount (%)" type="number" min={1} max={100} value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} error={fe('discount')} />
        </div>
        <Field label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={fe('description')} maxLength={160} />
        <Field label="Expiry date" type="date" value={f.expiresAt} min={tomorrow()} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} error={fe('expiresAt')} />
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-3">
            <Toggle checked={f.forNewUser} onChange={(v) => setF({ ...f, forNewUser: v })} label="For new users only" /> For new users
          </label>
          <label className="flex items-center gap-3">
            <Toggle checked={f.forMember} onChange={(v) => setF({ ...f, forMember: v })} label="For Plus members only" /> For members
          </label>
        </div>
        {!!err && !['code', 'discount', 'description', 'expiresAt'].some(fe) && <p className="text-sm text-danger">{errorMessage(err)}</p>}
        <Button type="submit" loading={busy} className="justify-self-start">
          Add Coupon
        </Button>
      </form>

      <h2 className="mt-10 mb-4 text-xl">
        List <b>Coupons</b>
      </h2>
      {list.length === 0 ? (
        <p className="text-muted">No coupons yet.</p>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Discount</th>
              <th>Expires</th>
              <th>New user</th>
              <th>Member</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td className="font-semibold">{c.code}</td>
                <td>{c.description}</td>
                <td>{c.discount}%</td>
                <td>{shortDate(c.expiresAt)}</td>
                <td>{c.forNewUser ? 'Yes' : 'No'}</td>
                <td>{c.forMember ? 'Yes' : 'No'}</td>
                <td>
                  <button
                    className="text-sm text-danger underline"
                    onClick={async () => {
                      if (!confirm(`Delete coupon ${c.code}?`)) return;
                      try {
                        await api(`/admin/coupons/${c.id}`, { method: 'DELETE' });
                        setList((l) => l!.filter((x) => x.id !== c.id));
                        toast('Coupon deleted');
                      } catch (e) {
                        toast(errorMessage(e), 'error');
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
