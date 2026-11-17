'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Store } from '@/lib/types';
import { useRequireAuth } from '@/components/account/useRequireAuth';
import { DashboardShell, type NavItem } from '@/components/dashboard/DashboardShell';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Spinner } from '@/components/ui/misc';

const NAV: NavItem[] = [
  { href: '/seller', label: 'Dashboard', icon: 'home' },
  { href: '/seller/add-product', label: 'Add Product', icon: 'addBox' },
  { href: '/seller/products', label: 'Manage Products', icon: 'edit' },
  { href: '/seller/orders', label: 'Orders', icon: 'list' },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useRequireAuth();
  const [store, setStore] = useState<Store | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    api<{ store: Store | null }>('/stores/mine')
      .then((r) => setStore(r.store))
      .catch(() => setStore(null));
  }, [ready]);

  if (!ready || store === undefined) return <Spinner className="min-h-dvh" />;

  if (!store || store.status !== 'approved' || !store.isActive) {
    return (
      <div className="container-page">
        <EmptyState
          icon="store"
          title={!store ? 'You don’t have a store yet' : store.status === 'pending' ? 'Your store is under review' : 'Store not available'}
          text={
            !store
              ? 'Create a store to start selling on ShopFussion.'
              : store.status === 'pending'
                ? 'An admin will approve your store soon.'
                : 'Your store was rejected or deactivated. Contact support or re-apply.'
          }
          action={!store || store.status === 'rejected' ? { href: '/create-store', label: 'Create your store' } : { href: '/', label: 'Back to shop' }}
        />
      </div>
    );
  }

  return (
    <DashboardShell
      nav={NAV}
      greeting={user!.firstName || user!.name}
      avatar={user!.avatar}
      badge={
        <>
          <span className="mx-auto mb-3 grid size-[72px] place-items-center rounded-full bg-chip text-brand">
            <Icon name="store" size={34} />
          </span>
          <b className="font-semibold">{store.name}</b>
          <p className="text-sm text-muted">@{store.username}</p>
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
