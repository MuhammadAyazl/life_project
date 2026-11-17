'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Icon, type IconName } from '@/components/ui/Icon';

export function AccountMenu() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading) return <span className="size-9 animate-pulse rounded-full bg-chip" aria-hidden />;

  if (!user) {
    return (
      <Link href="/login" aria-label="Sign in" className="grid size-9 place-items-center rounded-full bg-brand text-brand-ink transition hover:scale-105">
        <Icon name="user" />
      </Link>
    );
  }

  const items: { href: string; label: string; icon: IconName }[] = [
    { href: '/account', label: 'Manage account', icon: 'user' },
    { href: '/account/orders', label: 'My Orders', icon: 'box' },
    user.role === 'user'
      ? { href: '/create-store', label: 'Create your store', icon: 'store' }
      : { href: '/seller', label: 'Seller dashboard', icon: 'store' },
    ...(user.role === 'admin' ? [{ href: '/admin', label: 'Admin panel', icon: 'shield' as IconName }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full ring-offset-2 ring-offset-surface transition hover:ring-2 hover:ring-brand"
      >
        <Avatar name={user.name} src={user.avatar} size={36} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
          >
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} src={user.avatar} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.name}</p>
                  <p className="truncate text-sm text-muted">{user.email}</p>
                </div>
              </div>
              {user.plan.isMember && (
                <p className="mt-1 text-xs font-semibold text-star">
                  {user.plan.tier === 'trial' ? `Free trial · ${user.plan.daysLeft} days left` : 'Plus member'}
                </p>
              )}
            </div>
            <div className="py-1">
              {items.map((i) => (
                <Link key={i.href} href={i.href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-chip">
                  <Icon name={i.icon} size={18} className="text-muted" />
                  {i.label}
                </Link>
              ))}
              <button
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await logout();
                  toast('You have been signed out');
                  router.push('/');
                  router.refresh();
                }}
                className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left text-sm text-danger hover:bg-chip"
              >
                <Icon name="logout" size={18} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
