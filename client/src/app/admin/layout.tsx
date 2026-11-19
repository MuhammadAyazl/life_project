'use client';

import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/components/account/useRequireAuth';
import { useAuth } from '@/components/providers/AuthProvider';
import { DashboardShell, type NavItem } from '@/components/dashboard/DashboardShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/misc';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'home' },
  { href: '/admin/stores', label: 'Stores', icon: 'store' },
  { href: '/admin/approve', label: 'Approve Stores', icon: 'shield' },
  { href: '/admin/coupons', label: 'Coupons', icon: 'ticket' },
  { href: '/admin/activity', label: 'Activity Log', icon: 'list' },
];

/** Shown when someone signed in as a shopper/seller opens /admin. */
function NotAdmin({ email }: { email: string }) {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_24px_70px_-30px_rgba(10,26,64,.35)]">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-chip text-brand">
          <Icon name="shield" size={28} />
        </span>
        <h1 className="text-2xl font-bold">Admin access only</h1>
        <p className="mt-2 text-sm text-muted">
          You are signed in as <b className="text-ink">{email}</b>, which is not an admin account. Sign out and sign in with the admin email to
          open the admin panel.
        </p>
        <div className="mt-6 grid gap-2.5">
          <Button
            onClick={async () => {
              await logout();
              router.replace('/login?next=/admin');
            }}
          >
            Sign in as admin
          </Button>
          <ButtonLink href="/" variant="ghost">
            Back to shop
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, forbidden } = useRequireAuth('admin');
  if (forbidden && user) return <NotAdmin email={user.email} />;
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
