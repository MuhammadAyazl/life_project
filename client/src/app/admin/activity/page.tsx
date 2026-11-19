'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { dateTime, cn } from '@/lib/format';
import { TableWrap } from '@/components/dashboard/DashboardShell';
import { Badge, EmptyState, PageTitle, Spinner } from '@/components/ui/misc';

type Log = {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  targetId: string;
  meta: Record<string, unknown>;
  ip: string;
  createdAt: string;
};

const TABS = [
  ['', 'All'],
  ['auth', 'Sign-ins & security'],
  ['admin', 'Admin actions'],
  ['seller', 'Seller actions'],
] as const;

/** Human label + colour for each kind of event. */
function describe(a: string): { label: string; tone: 'brand' | 'green' | 'amber' | 'red' } {
  const map: Record<string, [string, 'brand' | 'green' | 'amber' | 'red']> = {
    'auth.login': ['Signed in', 'green'],
    'auth.login_google': ['Signed in with Google', 'green'],
    'auth.login_failed': ['Wrong password', 'amber'],
    'auth.lockout': ['Locked after failed attempts', 'red'],
    'auth.signup': ['New account', 'brand'],
    'auth.password_changed': ['Password changed', 'amber'],
    'auth.password_reset': ['Password reset by email', 'amber'],
    'auth.logout_all': ['Signed out everywhere', 'brand'],
    'auth.2fa_enabled': ['2FA turned on', 'green'],
    'auth.2fa_disabled': ['2FA turned off', 'red'],
    'auth.2fa_failed': ['Wrong 2FA code', 'amber'],
    'admin.store.approve': ['Store approved', 'green'],
    'admin.store.reject': ['Store rejected', 'red'],
    'admin.store.activate': ['Store activated', 'green'],
    'admin.store.deactivate': ['Store deactivated', 'red'],
    'admin.coupon.create': ['Coupon created', 'brand'],
    'admin.coupon.delete': ['Coupon deleted', 'red'],
    'seller.product.create': ['Product added', 'green'],
    'seller.product.update': ['Product edited', 'brand'],
    'seller.product.delete': ['Product deleted', 'red'],
    'seller.order.status': ['Order status changed', 'brand'],
  };
  const [label, tone] = map[a] ?? [a, 'brand'];
  return { label, tone };
}

function details(meta: Record<string, unknown>) {
  return Object.entries(meta)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join(' · ');
}

export default function ActivityPage() {
  const [type, setType] = useState('');
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLogs(null);
    api<{ logs: Log[] }>(`/admin/audit${type ? `?type=${type}` : ''}`)
      .then((r) => setLogs(r.logs))
      .catch((e) => setErr(errorMessage(e)));
  }, [type]);

  return (
    <>
      <PageTitle sub="Sign-ins, failed attempts and every admin/seller change. Kept for 180 days.">
        Activity <b>Log</b>
      </PageTitle>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setType(v)}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition', type === v ? 'bg-brand text-brand-ink' : 'bg-chip text-muted hover:text-ink')}
          >
            {l}
          </button>
        ))}
      </div>
      {err ? (
        <EmptyState icon="globe" title="Could not load activity" text={err} />
      ) : !logs ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <EmptyState icon="list" title="No activity yet" />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Who</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const d = describe(l.action);
              return (
                <tr key={l.id}>
                  <td className="whitespace-nowrap">{dateTime(l.createdAt)}</td>
                  <td>
                    <Badge tone={d.tone}>{d.label}</Badge>
                  </td>
                  <td>
                    {l.actorEmail || <span className="text-muted">—</span>}
                    {l.actorRole && <span className="ml-1 text-xs text-muted">({l.actorRole})</span>}
                  </td>
                  <td className="max-w-xs truncate text-muted" title={details(l.meta)}>
                    {details(l.meta) || '—'}
                  </td>
                  <td className="text-xs text-muted">{l.ip}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
