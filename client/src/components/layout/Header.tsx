'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/components/providers/CartProvider';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/format';
import { AccountMenu } from './AccountMenu';
import { Logo } from './Logo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/plus', label: 'Plus' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];

function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  return (
    <form
      role="search"
      className={cn(
        'flex items-center gap-2 rounded-full border border-line bg-chip px-4 py-2 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
      }}
    >
      <Icon name="search" size={16} className="shrink-0 text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products"
        aria-label="Search products"
        maxLength={60}
        className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </form>
  );
}

function PromoBar() {
  const [show, setShow] = useState(true);
  if (!show) return null;
  return (
    <div className="flex items-center justify-center gap-3 bg-brand px-4 py-2 text-sm text-brand-ink sm:justify-end sm:px-8">
      <Link href="/plus" className="rounded-full bg-white/20 px-4 py-1 font-medium hover:bg-white/30">
        Claim Offer · 7-day free Plus trial
      </Link>
      <button onClick={() => setShow(false)} aria-label="Close offer" className="px-1 text-lg leading-none opacity-80 hover:opacity-100">
        ×
      </button>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : !href.includes('#') && pathname.startsWith(href));

  return (
    <>
      <PromoBar />
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl transition-shadow',
          scrolled && 'shadow-[0_6px_24px_-12px_rgba(10,26,64,.25)]',
        )}
      >
        <div className="container-page flex items-center gap-4 py-2.5 lg:gap-8">
          <Logo />
          <nav aria-label="Main" className="ml-auto hidden items-center gap-7 font-medium lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined} className="link-underline py-1.5 text-muted">
                {n.label}
              </Link>
            ))}
          </nav>
          <Suspense fallback={<div className="hidden w-60 md:block" />}>
            <SearchBox className="hidden w-60 md:flex" />
          </Suspense>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <Link href="/cart" className="relative flex items-center gap-1.5 font-medium" aria-label={`Cart, ${count} items`}>
              <Icon name="cart" size={22} />
              <span className="hidden sm:inline">Cart</span>
              {ready && count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 left-3 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-bold text-white"
                >
                  {count}
                </motion.span>
              )}
            </Link>
            <AccountMenu />
            <button className="grid size-9 place-items-center rounded-lg hover:bg-chip lg:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>
              <Icon name={menu ? 'close' : 'menu'} size={24} />
            </button>
          </div>
        </div>
        <Suspense>
          <SearchBox className="mx-4 mb-3 md:hidden" />
        </Suspense>
        <AnimatePresence>
          {menu && (
            <motion.nav
              aria-label="Mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line lg:hidden"
            >
              <div className="container-page grid py-2">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="border-b border-line py-3 font-medium last:border-0">
                    {n.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
