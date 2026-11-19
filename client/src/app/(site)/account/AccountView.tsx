'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage, fieldError } from '@/lib/api';
import { shortDate } from '@/lib/format';
import type { Address, User } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useRequireAuth } from '@/components/account/useRequireAuth';
import { AddressForm } from '@/components/account/AddressForm';
import { AvatarPicker } from '@/components/account/AvatarPicker';
import { TwoFactorCard } from '@/components/account/TwoFactorCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Badge, Spinner } from '@/components/ui/misc';

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AccountView() {
  const { user, ready } = useRequireAuth();
  const { setUser, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [names, setNames] = useState<{ firstName: string; lastName: string } | null>(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErr, setPwErr] = useState<unknown>(null);
  const [busy, setBusy] = useState('');
  const [addrOpen, setAddrOpen] = useState(false);

  if (!ready || !user) return <Spinner />;
  const n = names ?? { firstName: user.firstName, lastName: user.lastName };
  const plan = user.plan;

  const updateAddresses = (all: Address[]) => setUser({ ...user, addresses: all });

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <AvatarPicker size={72} />
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-muted">{user.email}</p>
        </div>
        <ButtonLink href="/account/orders" variant="secondary" className="ml-auto">
          <Icon name="box" size={18} /> My orders
        </ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Membership" action={plan.isMember ? <Badge tone="green">{plan.tier === 'trial' ? 'Free trial' : 'Plus'}</Badge> : <Badge>Free</Badge>}>
          {plan.isMember ? (
            <p className="text-muted">
              {plan.tier === 'trial' ? 'Trial' : 'Plus'} active until <b className="text-ink">{shortDate(plan.endsAt!)}</b> ({plan.daysLeft} days left).
            </p>
          ) : (
            <p className="text-muted">{plan.canStartTrial ? 'Try Plus free for 7 days - no card needed.' : 'You are on the Free plan.'}</p>
          )}
          <ButtonLink href="/plus" size="sm" className="mt-4">
            <Icon name="crown" size={16} /> {plan.isMember ? 'Manage membership' : plan.canStartTrial ? 'Start free trial' : 'See Plus'}
          </ButtonLink>
        </Card>

        <Card title="Profile">
          <form
            className="grid gap-3.5 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy('profile');
              try {
                const r = await api<{ user: User }>('/users/me', { method: 'PATCH', body: n });
                setUser(r.user);
                toast('Profile saved');
              } catch (e) {
                toast(errorMessage(e), 'error');
              } finally {
                setBusy('');
              }
            }}
          >
            <Field label="First name" value={n.firstName} maxLength={50} onChange={(e) => setNames({ ...n, firstName: e.target.value })} />
            <Field label="Last name" value={n.lastName} maxLength={50} onChange={(e) => setNames({ ...n, lastName: e.target.value })} />
            <Button type="submit" size="sm" loading={busy === 'profile'} className="justify-self-start">
              Save
            </Button>
          </form>
        </Card>

        <Card title="Saved addresses" action={<Button size="sm" variant="secondary" onClick={() => setAddrOpen(true)}><Icon name="plus" size={16} /> Add</Button>}>
          {user.addresses.length === 0 && <p className="text-muted">No addresses yet.</p>}
          <ul className="grid gap-3">
            {user.addresses.map((a) => (
              <li key={a._id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3.5 text-sm">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-muted">
                    {a.street}, {a.city}, {a.state} {a.zip}, {a.country} · {a.phone}
                  </p>
                </div>
                <button
                  aria-label="Delete address"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-chip hover:text-danger"
                  onClick={async () => {
                    try {
                      const r = await api<{ addresses: Address[] }>(`/users/me/addresses/${a._id}`, { method: 'DELETE' });
                      updateAddresses(r.addresses);
                    } catch (e) {
                      toast(errorMessage(e), 'error');
                    }
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Security">
          <form
            noValidate
            className="grid gap-3.5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy('pw');
              setPwErr(null);
              try {
                await api('/users/me/password', { method: 'POST', body: pw });
                setPw({ currentPassword: '', newPassword: '' });
                toast('Password updated. Other devices were signed out.');
              } catch (e) {
                setPwErr(e);
              } finally {
                setBusy('');
              }
            }}
          >
            <Field
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              hint={user.hasGoogle ? 'Leave empty if you only use Google' : undefined}
            />
            <Field
              label="New password"
              type="password"
              autoComplete="new-password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              error={fieldError(pwErr, 'newPassword')}
            />
            {!!pwErr && !fieldError(pwErr, 'newPassword') && <p className="text-sm text-danger">{errorMessage(pwErr)}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="sm" loading={busy === 'pw'}>
                Change password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await api('/auth/logout-all', { method: 'POST' }).catch(() => {});
                  await logout();
                  toast('Signed out on all devices');
                  router.push('/login');
                }}
              >
                Sign out everywhere
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Two-factor sign-in">
          <TwoFactorCard />
        </Card>
      </div>

      {user.role === 'user' && (
        <p className="mt-8 text-sm text-muted">
          Want to sell on ShopFussion?{' '}
          <Link href="/create-store" className="font-medium text-brand hover:underline">
            Create your store →
          </Link>
        </p>
      )}

      <Modal open={addrOpen} onClose={() => setAddrOpen(false)} title={<>Add New <b>Address</b></>}>
        <AddressForm
          defaults={{ name: user.name, email: user.email }}
          onSaved={(_, all) => {
            updateAddresses(all);
            setAddrOpen(false);
            toast('Address saved');
          }}
        />
      </Modal>
    </>
  );
}
