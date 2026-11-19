'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '@/components/layout/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/format';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const KEY = 'sf_dash_expanded';

/**
 * Shared layout for the seller and admin areas.
 * Sidebar on the left that collapses to an icon rail (toggle with the ☰ button):
 * - desktop: expanded by default, the choice is remembered; content shifts with it
 * - phone: an icon rail by default; ☰ slides the full menu out from the left OVER the page
 *   (about 240px, never full screen) - tap outside, Esc or a menu link closes it
 */
export function DashboardShell({
  nav,
  badge,
  greeting,
  avatar,
  children,
}: {
  nav: NavItem[];
  badge: React.ReactNode;
  greeting: string;
  avatar?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOn = (href: string) => (href.split('/').length === 2 ? pathname === href : pathname.startsWith(href));
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(true);

  // pick the starting state once we know the screen size
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => {
      setMobile(!mq.matches);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(KEY);
      } catch {
        /* storage blocked */
      }
      setExpanded(mq.matches ? saved !== '0' : false);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // on phones the overlay closes when another page is chosen (not on first load) or Esc is pressed
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    if (mobile) setExpanded(false);
  }, [pathname, mobile]);
  useEffect(() => {
    if (!(mobile && expanded)) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobile, expanded]);

  const toggle = () => {
    setExpanded((v) => {
      if (!mobile) {
        try {
          localStorage.setItem(KEY, v ? '0' : '1');
        } catch {
          /* ignore */
        }
      }
      return !v;
    });
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/90 px-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label={expanded ? 'Collapse menu' : 'Open menu'}
            aria-expanded={expanded}
            aria-controls="dash-sidebar"
            className="grid size-10 place-items-center rounded-lg text-muted transition hover:bg-chip hover:text-ink"
          >
            <Icon name={mobile && expanded ? 'close' : 'menu'} size={22} />
          </button>
          <Logo height={40} />
        </div>
        <div className="flex items-center gap-3 font-medium">
          <Link href="/" className="hidden text-sm text-muted hover:text-ink sm:block">
            ← Back to shop
          </Link>
          <span className="hidden sm:inline">Hi, {greeting}</span>
          <Link href="/account" aria-label="My account" className="rounded-full hover:ring-2 hover:ring-brand">
            <Avatar name={greeting} src={avatar} size={36} />
          </Link>
        </div>
      </header>

      {/* phone: dim the page while the menu is slid out; tapping it closes the menu */}
      <AnimatePresence>
        {mobile && expanded && (
          <motion.div
            key="dash-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 top-16 z-20 bg-[#0a141e]/45 backdrop-blur-[2px] md:hidden"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <aside
        id="dash-sidebar"
        className={cn(
          'fixed top-16 bottom-0 left-0 z-30 flex flex-col overflow-x-hidden overflow-y-auto border-r border-line bg-surface py-4 transition-[width,box-shadow] duration-300 ease-out',
          expanded ? 'w-60' : 'w-16',
          mobile && expanded && 'shadow-2xl',
        )}
      >
        <div
          className={cn(
            'overflow-hidden px-4 text-center transition-all duration-300',
            expanded ? 'max-h-48 pt-2 pb-5 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          {badge}
        </div>
        <nav className="grid gap-1 px-2" aria-label="Dashboard">
          {nav.map((n) => {
            const on = isOn(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                title={expanded ? undefined : n.label}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 items-center gap-3.5 rounded-lg px-3 font-medium whitespace-nowrap transition',
                  on ? 'bg-chip text-ink' : 'text-muted hover:bg-chip hover:text-ink',
                )}
              >
                <Icon name={n.icon} className="shrink-0" />
                <span className={cn('transition-opacity duration-200', expanded ? 'opacity-100' : 'pointer-events-none opacity-0')}>{n.label}</span>
                {on && <motion.span layoutId="dash-active" className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-star" />}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          title={expanded ? undefined : 'Back to shop'}
          className="mx-2 mt-auto flex h-11 items-center gap-3.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted transition hover:bg-chip hover:text-ink"
        >
          <Icon name="logout" className="shrink-0 rotate-180" />
          <span className={cn('transition-opacity duration-200', expanded ? 'opacity-100' : 'opacity-0')}>Back to shop</span>
        </Link>
      </aside>

      {/* content: next to the icon rail on phones; follows the sidebar width on desktop */}
      <main
        id="main"
        className={cn('min-w-0 py-6 pr-4 pl-20 transition-[padding] duration-300 sm:py-8 sm:pr-8', expanded ? 'md:pl-68' : 'md:pl-24')}
      >
        {children}
      </main>
    </div>
  );
}

export function StatCard({ label, value, icon, delay = 0 }: { label: string; value: React.ReactNode; icon: IconName; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-5"
    >
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      </div>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-chip text-brand">
        <Icon name={icon} />
      </span>
    </motion.div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-star' : 'bg-line')}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={cn('absolute top-[3px] size-[18px] rounded-full bg-white shadow', checked ? 'right-[3px]' : 'left-[3px]')} />
    </button>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3.5 [&_th]:bg-chip [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:whitespace-nowrap [&_th]:uppercase">
        {children}
      </table>
    </div>
  );
}
