'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES } from '@/lib/config';
import { cn } from '@/lib/format';

export const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['rating', 'Top rated'],
] as const;

/** Builds a /shop URL keeping the other filters, and resetting the page. */
function useHref() {
  const params = useSearchParams();
  const pathname = usePathname();
  return (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? p.set(k, v) : p.delete(k));
    p.delete('page');
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
}

export function CategoryChips({ active }: { active?: string }) {
  const href = useHref();
  return (
    <div className="mt-5 flex flex-wrap gap-2.5" aria-label="Categories">
      {['All', ...CATEGORIES].map((c) => {
        const on = (c === 'All' && !active) || c === active;
        return (
          <Link
            key={c}
            href={href({ category: c === 'All' ? null : c })}
            aria-current={on ? 'true' : undefined}
            className={cn(
              'rounded-full px-5 py-2 text-[0.95rem] font-medium transition',
              on ? 'bg-brand text-brand-ink' : 'bg-chip text-muted hover:bg-brand hover:text-brand-ink',
            )}
          >
            {c}
          </Link>
        );
      })}
    </div>
  );
}

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const href = useHref();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Sort by
      <select
        value={value}
        onChange={(e) => router.push(href({ sort: e.target.value === 'featured' ? null : e.target.value }))}
        className="field w-auto rounded-full py-2"
      >
        {SORTS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
