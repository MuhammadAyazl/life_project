'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/layout/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/format';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** Shared layout for the seller and admin areas: top bar + sidebar (tabs on mobile). */
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

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-2 backdrop-blur-xl sm:px-8">
        <Logo height={46} />
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
      <div className="grid min-h-[calc(100dvh-63px)] md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-surface md:border-r md:border-b-0 md:py-7">
          <div className="hidden px-5 pb-6 text-center md:block">{badge}</div>
          <nav className="flex overflow-x-auto md:grid" aria-label="Dashboard">
            {nav.map((n) => {
              const on = isOn(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'relative flex shrink-0 items-center gap-3.5 px-5 py-3.5 font-medium whitespace-nowrap transition md:px-7',
                    on ? 'bg-chip text-ink' : 'text-muted hover:bg-chip hover:text-ink',
                  )}
                >
                  <Icon name={n.icon} />
                  {n.label}
                  {on && <motion.span layoutId="dash-active" className="absolute inset-x-0 bottom-0 h-[3px] bg-star md:inset-x-auto md:inset-y-0 md:right-0 md:h-auto md:w-1" />}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main id="main" className="min-w-0 px-4 py-8 sm:px-10">
          {children}
        </main>
      </div>
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
