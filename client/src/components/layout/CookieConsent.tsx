'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const KEY = 'sf_cookie_consent'; // 'all' | 'essential'

/** Read the visitor's cookie choice (e.g. before adding analytics later). */
export function cookieChoice(): 'all' | 'essential' | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'all' || v === 'essential' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Cookie notice shown once, on the first visit. ShopFussion only uses one essential cookie
 * (to keep you signed in); "Accept all" is stored so optional cookies (e.g. analytics) can be
 * enabled later only for visitors who agreed.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // small delay so it doesn't fight the page's first paint
    const t = setTimeout(() => setOpen(cookieChoice() === null), 800);
    return () => clearTimeout(t);
  }, []);

  const choose = (v: 'all' | 'essential') => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* storage blocked - just hide for this visit */
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="fixed inset-x-3 bottom-3 z-[95] mx-auto max-w-3xl rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_20px_60px_-20px_rgba(10,26,64,.45)] backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 gap-3">
              <span className="text-2xl" aria-hidden>
                🍪
              </span>
              <p className="text-sm text-muted">
                <b className="text-ink">We use cookies.</b> One essential cookie keeps you signed in, and your cart is saved only in your
                browser. Read our{' '}
                <Link href="/privacy" className="font-medium text-brand hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" size="sm" onClick={() => choose('essential')}>
                Only essential
              </Button>
              <Button size="sm" onClick={() => choose('all')}>
                Accept
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
