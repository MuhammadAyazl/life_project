import Link from 'next/link';
import { Hero } from '@/components/home/Hero';
import { Newsletter } from '@/components/home/Newsletter';
import { ProductGrid } from '@/components/product/ProductCard';
import { Reveal, RevealItem, Stagger } from '@/components/motion/Reveal';
import { Icon, type IconName } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/misc';
import { CATEGORIES } from '@/lib/config';
import { serverGet } from '@/lib/server-api';
import type { Product } from '@/lib/types';

type List = { products: Product[]; total: number };

const SPECS: { icon: IconName; color: string; title: string; text: string }[] = [
  { icon: 'truck', color: '#34b38f', title: 'Free Shipping', text: 'Fast, free delivery on every order - no conditions, just reliable doorstep delivery.' },
  { icon: 'refresh', color: '#ee9b4a', title: '7 Days Easy Return', text: 'Change your mind? No worries. Return any item within 7 days.' },
  { icon: 'headset', color: '#8a96d8', title: '24/7 Customer Support', text: 'We’re here for you. Get expert help from our support team any time.' },
];

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold">{title}</h2>
      <div className="mt-2 flex justify-center gap-4 text-sm text-muted">
        <span>{sub}</span>
        <Link href="/shop" className="font-medium text-brand hover:underline">
          View more →
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [latest, best] = await Promise.all([
    serverGet<List>('/products?sort=newest&limit=4'),
    serverGet<List>('/products?sort=best&limit=8'),
  ]);
  const cats = CATEGORIES.map((c) => (
    <Link
      key={c}
      href={`/shop?category=${encodeURIComponent(c)}`}
      className="mr-3 rounded-full px-4 py-1.5 text-lg font-medium whitespace-nowrap text-muted transition hover:bg-brand hover:text-brand-ink"
    >
      {c}
    </Link>
  ));

  return (
    <>
      <Hero />

      <nav aria-label="Categories" className="group mt-7 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {cats}
          {cats}
        </div>
      </nav>

      {!latest && (
        <EmptyState
          icon="globe"
          title="Products are loading slowly"
          text="The store server is not reachable right now. Make sure the API is running (npm run dev) and refresh."
        />
      )}

      {latest && (
        <section className="mt-20 scroll-mt-24" aria-label="latest products">
          <Reveal>
            <SectionHead title="Latest Products" sub={`Showing ${latest.products.length} of ${latest.total} products`} />
          </Reveal>
          <div className="mt-9">
            <ProductGrid products={latest.products} priorityCount={4} />
          </div>
        </section>
      )}

      {best && best.products.length > 0 && (
        <section className="mt-20" aria-label="best products">
          <Reveal>
            <SectionHead title="Best Selling" sub={`Showing ${best.products.length} of ${best.total} products`} />
          </Reveal>
          <div className="mt-9">
            <ProductGrid products={best.products} />
          </div>
        </section>
      )}

      <section id="about" className="mt-24 scroll-mt-24 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold">Our Specifications</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            We offer top-tier service and convenience to make your shopping experience smooth, secure and completely hassle-free.
          </p>
        </Reveal>
        <Stagger className="mt-12 grid gap-10 sm:grid-cols-3">
          {SPECS.map((s) => (
            <RevealItem key={s.title} className="flex flex-col items-center gap-3 px-3">
              <span className="grid size-12 place-items-center rounded-xl text-white shadow-lg" style={{ background: s.color }}>
                <Icon name={s.icon} size={22} strokeWidth={2} />
              </span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="max-w-[290px] text-sm text-muted">{s.text}</p>
            </RevealItem>
          ))}
        </Stagger>
      </section>

      <section id="contact" className="mt-24 scroll-mt-24 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold">Join Newsletter</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">Subscribe to get new arrivals and special offers in your inbox.</p>
        </Reveal>
        <Newsletter />
      </section>
    </>
  );
}
