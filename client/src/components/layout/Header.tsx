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
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];

/**
 * One search bar, two modes:
 * - normal: keyword search ("xiaomi bluetooth" -> every matching product)
 * - AI (sparkle button): understands requests like "sab se best xiaomi bluetooth under $50"
 *   and returns the best matches ranked, with a reason for each.
 */
function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [ai, setAi] = useState(params.get('ai') === '1');
  useEffect(() => {
    setQ(params.get('q') ?? '');
    setAi(params.get('ai') === '1');
  }, [params]);

  return (
    <form
      role="search"
      className={cn(
        'flex items-center gap-2 rounded-full border bg-chip py-1.5 pr-1.5 pl-4 transition focus-within:ring-2',
        ai
          ? 'border-violet-400 bg-gradient-to-r from-violet-500/10 to-sky-500/10 focus-within:ring-violet-400/30'
          : 'border-line focus-within:border-brand focus-within:ring-brand/20',
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const text = q.trim();
        if (!text) return router.push('/shop');
        router.push(`/shop?q=${encodeURIComponent(text)}${ai ? '&ai=1' : ''}`);
      }}
    >
      <Icon name={ai ? 'ai' : 'search'} size={16} className={cn('shrink-0', ai ? 'text-violet-500' : 'text-muted')} />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={ai ? 'Ask AI: best Xiaomi earbuds under $50' : 'Search products'}
        aria-label={ai ? 'Ask AI to find products' : 'Search products'}
        autoFocus={autoFocus}
        maxLength={ai ? 200 : 60}
        className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={() => setAi((v) => !v)}
        aria-pressed={ai}
        title={ai ? 'AI search is on - click for normal search' : 'Turn on AI search'}
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition',
          ai ? 'bg-gradient-to-r from-violet-500 to-sky-500 text-white shadow' : 'text-muted hover:bg-surface hover:text-violet-500',
        )}
      >
        <Icon name="ai" size={14} strokeWidth={2} />
        AI
      </button>
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
  const [search, setSearch] = useState(false); // mobile-only search bar
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);
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
          <Suspense fallback={<div className="hidden w-72 md:block" />}>
            <SearchBox className="hidden w-72 md:flex" />
          </Suspense>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <button
              className="grid size-9 place-items-center rounded-lg hover:bg-chip md:hidden"
              onClick={() => setSearch((v) => !v)}
              aria-label={search ? 'Close search' : 'Search products'}
              aria-expanded={search}
            >
              <Icon name={search ? 'close' : 'search'} size={21} />
            </button>
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
        <AnimatePresence initial={false}>
          {search && (
            <motion.div
              key="mobile-search"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden md:hidden"
            >
              <Suspense>
                <SearchBox className="mx-4 mb-3" autoFocus />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
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
