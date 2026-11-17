'use client';

import { useRequireAuth } from '@/components/account/useRequireAuth';
import { DashboardShell, type NavItem } from '@/components/dashboard/DashboardShell';
import { Spinner } from '@/components/ui/misc';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'home' },
  { href: '/admin/stores', label: 'Stores', icon: 'store' },
  { href: '/admin/approve', label: 'Approve Stores', icon: 'shield' },
  { href: '/admin/coupons', label: 'Coupons', icon: 'ticket' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useRequireAuth('admin');
  if (!ready) return <Spinner className="min-h-dvh" />;
  return (
    <DashboardShell
      nav={NAV}
      greeting={user?.firstName || 'Admin'}
      avatar={user?.avatar}
      badge={
        <>
          <span className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-brand font-display text-2xl font-bold text-brand-ink">S</span>
          <b className="font-semibold">ShopFussion</b>
          <p className="text-sm text-muted">Admin panel</p>
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
