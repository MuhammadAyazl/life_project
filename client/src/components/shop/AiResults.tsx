'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, errorMessage } from '@/lib/api';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/misc';

type Result = { mode: 'ai' | 'smart'; interpretation: string; results: { reason: string; product: Product }[] };

/** Results of an AI search: what the AI understood, then the ranked products with a reason each. */
export function AiResults({ q }: { q: string }) {
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setErr('');
    api<Result>('/products/ai-search', { method: 'POST', body: { q }, signal: ctrl.signal })
      .then(setData)
      .catch((e) => (e as Error).name !== 'AbortError' && setErr(errorMessage(e)));
    return () => ctrl.abort();
  }, [q]);

  return (
    <section aria-live="polite">
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-3 py-1 text-xs font-semibold text-white shadow">
          <Icon name="ai" size={14} strokeWidth={2} /> AI search
        </span>
        <Link href={`/shop?q=${encodeURIComponent(q)}`} className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline">
          Show normal results instead
        </Link>
      </div>

      {!data && !err && (
        <div className="mt-8">
          <p className="flex items-center gap-2 text-muted">
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="text-violet-500">
              <Icon name="ai" size={18} />
            </motion.span>
            Finding the best matches for “{q}”…
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-chip" />
            ))}
          </div>
        </div>
      )}

      {err && <EmptyState icon="globe" title="AI search is unavailable right now" text={err} action={{ href: `/shop?q=${encodeURIComponent(q)}`, label: 'Use normal search' }} />}

      {data && (
        <>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl border border-violet-300/50 bg-violet-500/5 px-4 py-3 text-sm"
          >
            <b className="font-semibold">{data.mode === 'ai' ? 'AI understood: ' : 'Smart search: '}</b>
            {data.interpretation}
          </motion.p>
          {data.results.length === 0 ? (
            <EmptyState icon="search" title="No matching products" text="Try different words, a higher budget, or another brand." />
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-4">
              {data.results.map((r, i) => (
                <motion.div key={r.product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="relative">
                    {i === 0 && (
                      <span className="absolute -top-2 left-2 z-10 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
                        #1 Best match
                      </span>
                    )}
                    <ProductCard product={r.product} />
                  </div>
                  <p className="mt-1.5 flex gap-1.5 text-xs text-muted">
                    <Icon name="ai" size={13} className="mt-0.5 shrink-0 text-violet-500" />
                    {r.reason}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
