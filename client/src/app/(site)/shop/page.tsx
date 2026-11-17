import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ProductGrid } from '@/components/product/ProductCard';
import { CategoryChips, SortSelect } from '@/components/shop/ShopControls';
import { AiResults } from '@/components/shop/AiResults';
import { EmptyState } from '@/components/ui/misc';
import { CATEGORIES } from '@/lib/config';
import { serverGet } from '@/lib/server-api';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/format';

type SP = Promise<{ category?: string; q?: string; sort?: string; page?: string; ai?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { category, q } = await searchParams;
  const cat = CATEGORIES.find((c) => c === category);
  const title = q ? `Search results for “${q.slice(0, 40)}”` : cat ? `Buy ${cat} Online` : 'Shop All Gadgets';
  return {
    title,
    description: cat
      ? `Shop the best ${cat.toLowerCase()} at ShopFussion. Great prices, free shipping and 7-day easy returns.`
      : 'Browse earbuds, headphones, smart watches, speakers and more at ShopFussion. Free shipping and 7-day easy returns.',
    alternates: { canonical: cat ? `/shop?category=${encodeURIComponent(cat)}` : '/shop' },
    // search result pages should not be indexed (thin / duplicate content)
    robots: q ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  // AI search: the AI ranks products for the request; skip the normal keyword list
  if (sp.ai === '1' && sp.q?.trim()) {
    return (
      <>
        <h1 className="text-3xl font-bold">Best matches for “{sp.q.slice(0, 80)}”</h1>
        <AiResults q={sp.q.slice(0, 200)} />
      </>
    );
  }

  const page = Math.max(1, Number(sp.page) || 1);
  const qs = new URLSearchParams();
  if (sp.category) qs.set('category', sp.category);
  if (sp.q) qs.set('q', sp.q.slice(0, 60));
  if (sp.sort) qs.set('sort', sp.sort);
  qs.set('page', String(page));
  qs.set('limit', '24');

  const data = await serverGet<{ products: Product[]; total: number; pages: number }>(`/products?${qs}`, 30);
  const active = CATEGORIES.find((c) => c === sp.category);

  const pageHref = (n: number) => {
    const p = new URLSearchParams(qs);
    p.delete('limit');
    n > 1 ? p.set('page', String(n)) : p.delete('page');
    return `/shop?${p}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{sp.q ? `Results for “${sp.q.slice(0, 40)}”` : (active ?? 'All Products')}</h1>
        <Suspense>
          <SortSelect value={sp.sort ?? 'featured'} />
        </Suspense>
      </div>
      <Suspense>
        <CategoryChips active={active} />
      </Suspense>

      {!data ? (
        <EmptyState icon="globe" title="Could not load products" text="The store server is not reachable. Please try again in a moment." />
      ) : data.products.length === 0 ? (
        <EmptyState icon="search" title="No products found" text="Try a different search or category." action={{ href: '/shop', label: 'See all products' }} />
      ) : (
        <>
          <p className="mt-5 mb-5 text-sm text-muted">
            Showing {data.products.length} of {data.total} products
          </p>
          <ProductGrid products={data.products} priorityCount={4} />
          {data.pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex justify-center gap-2">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={pageHref(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={cn('grid size-10 place-items-center rounded-lg border border-line font-medium', n === page ? 'bg-brand text-brand-ink' : 'hover:bg-chip')}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </>
  );
}
