import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductActions } from '@/components/product/ProductActions';
import { ProductVisual } from '@/components/product/ProductArt';
import { ProductGrid } from '@/components/product/ProductCard';
import { ProductTabs } from '@/components/product/ProductTabs';
import { JsonLd } from '@/components/seo/JsonLd';
import { Icon } from '@/components/ui/Icon';
import { Stars } from '@/components/ui/misc';
import { SITE } from '@/lib/config';
import { discountPct, money } from '@/lib/format';
import { serverGet } from '@/lib/server-api';
import type { Product, Review, StoreRef } from '@/lib/types';

type Data = { product: Product; reviews: Review[]; related: Product[] };
type Params = Promise<{ slug: string }>;

const getProduct = (slug: string) => serverGet<Data>(`/products/${encodeURIComponent(slug)}`, 60);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) return { title: 'Product not found', robots: { index: false } };
  const p = data.product;
  const desc = `${p.description.slice(0, 150)}${p.description.length > 150 ? '…' : ''}`;
  const image = p.images[0] ?? SITE.ogImage;
  return {
    title: `${p.name} - ${money(p.price)}`,
    description: desc,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description: desc, url: `/product/${p.slug}`, images: [{ url: image, alt: p.name }] },
    twitter: { card: 'summary_large_image', title: p.name, description: desc, images: [image] },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) notFound();
  const { product: p, reviews, related } = data;
  const store = typeof p.store === 'object' ? (p.store as StoreRef) : null;
  const off = discountPct(p.price, p.mrp);
  const url = `${SITE.url}/product/${p.slug}`;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Product',
              name: p.name,
              description: p.description,
              sku: p.id,
              category: p.category,
              image: p.images.length ? p.images.map((i) => `${SITE.url}${i}`) : [`${SITE.url}${SITE.ogImage}`],
              brand: { '@type': 'Brand', name: store?.name ?? SITE.name },
              offers: {
                '@type': 'Offer',
                url,
                priceCurrency: 'USD',
                price: p.price,
                availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                itemCondition: 'https://schema.org/NewCondition',
              },
              ...(p.numReviews > 0 && {
                aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.numReviews },
              }),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
                { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE.url}/shop` },
                { '@type': 'ListItem', position: 3, name: p.category, item: `${SITE.url}/shop?category=${encodeURIComponent(p.category)}` },
                { '@type': 'ListItem', position: 4, name: p.name, item: url },
              ],
            },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-ink hover:underline">Home</Link> /{' '}
        <Link href="/shop" className="hover:text-ink hover:underline">Products</Link> /{' '}
        <Link href={`/shop?category=${encodeURIComponent(p.category)}`} className="hover:text-ink hover:underline">{p.category}</Link>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          {p.images.length > 1 && (
            <div className="flex gap-3 sm:flex-col">
              {p.images.map((img, i) => (
                <ProductVisual key={img} name={`${p.name} photo ${i + 1}`} image={img} className="size-20 shrink-0 rounded-xl border-2 border-line" sizes="80px" />
              ))}
            </div>
          )}
          <ProductVisual name={p.name} image={p.images[0]} art={p.art} priority className="aspect-square flex-1 rounded-2xl" sizes="(max-width: 1024px) 100vw, 55vw" />
        </div>

        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{p.name}</h1>
          <div className="mt-3 mb-6 flex items-center gap-3 text-sm text-muted">
            <Stars value={p.rating} />
            <span>
              {p.numReviews} {p.numReviews === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold">{money(p.price)}</span>
            {p.mrp > p.price && <s className="text-xl text-muted">{money(p.mrp)}</s>}
          </div>
          {off > 0 && (
            <p className="mt-4 mb-7 flex items-center gap-2 text-muted">
              <Icon name="tag" /> Save {off}% right now
            </p>
          )}
          <ProductActions product={p} />
          <ul className="mt-8 grid gap-4 border-t border-line pt-7 text-muted">
            <li className="flex items-center gap-3"><Icon name="globe" /> Free shipping worldwide</li>
            <li className="flex items-center gap-3"><Icon name="card" /> Cash on delivery available</li>
            <li className="flex items-center gap-3"><Icon name="refresh" /> 7-day easy returns</li>
          </ul>
          {store && (
            <div className="mt-8 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full border border-line font-semibold text-brand">{store.name.charAt(0)}</span>
              <div>
                <p className="text-sm">Product by {store.name}</p>
                <Link href={`/store/${store.username}`} className="text-sm text-brand hover:underline">View store →</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <ProductTabs productId={p.id} description={p.description} reviews={reviews} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-7 text-2xl font-bold">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
