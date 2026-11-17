import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductGrid } from '@/components/product/ProductCard';
import { Icon } from '@/components/ui/Icon';
import { serverGet } from '@/lib/server-api';
import type { Product, Store } from '@/lib/types';

type Params = Promise<{ username: string }>;
const getStore = (u: string) => serverGet<{ store: Store }>(`/stores/${encodeURIComponent(u)}`, 120);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const data = await getStore(username);
  if (!data) return { title: 'Store not found', robots: { index: false } };
  return {
    title: `${data.store.name} - Official Store`,
    description: data.store.description.slice(0, 160),
    alternates: { canonical: `/store/${data.store.username}` },
  };
}

export default async function StorePage({ params }: { params: Params }) {
  const { username } = await params;
  const data = await getStore(username);
  if (!data) notFound();
  const { store } = data;
  const list = await serverGet<{ products: Product[]; total: number }>(`/products?store=${store.username}&limit=48&sort=newest`, 60);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/shop" className="hover:underline">Products</Link> / Store
      </nav>
      <section
        className="mt-5 grid items-center gap-7 rounded-3xl px-6 py-8 sm:grid-cols-[150px_1fr] sm:px-10"
        style={{ background: 'linear-gradient(135deg,var(--hero-a),var(--hero-b))' }}
      >
        <div className="grid size-[130px] place-items-center rounded-2xl bg-surface font-display text-5xl font-bold text-brand shadow-sm sm:size-[150px]">
          {store.name.charAt(0)}
        </div>
        <div className="text-hero-ink">
          <h1 className="text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight font-bold">{store.name}</h1>
          <p className="mt-3 max-w-2xl opacity-80">{store.description}</p>
          <ul className="mt-4 grid gap-2 text-sm">
            <li className="flex items-center gap-2.5"><Icon name="pin" size={18} /> {store.address}</li>
            <li className="flex items-center gap-2.5"><Icon name="mail" size={18} /> <a href={`mailto:${store.email}`} className="hover:underline">{store.email}</a></li>
          </ul>
        </div>
      </section>
      <div className="mt-14 mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold">Shop Products</h2>
        <span className="text-sm text-muted">{list?.total ?? 0} products</span>
      </div>
      {list && <ProductGrid products={list.products} />}
    </>
  );
}
