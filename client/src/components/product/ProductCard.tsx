'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { money } from '@/lib/format';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Stars } from '@/components/ui/misc';
import { Icon } from '@/components/ui/Icon';
import { ProductVisual } from './ProductArt';

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const { add } = useCart();
  const toast = useToast();
  const href = `/product/${product.slug}`;

  return (
    <motion.article whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group">
      <div className="relative">
        <Link href={href} aria-label={`View ${product.name}`} className="block">
          <ProductVisual
            name={product.name}
            image={product.images[0]}
            art={product.art}
            priority={priority}
            className="aspect-square rounded-2xl [&_svg]:group-hover:scale-110"
          />
        </Link>
        {!product.inStock && (
          <span className="absolute top-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-bg">Out of stock</span>
        )}
        {product.inStock && (
          <button
            onClick={() => {
              add(product);
              toast(`${product.name} added to cart`);
            }}
            aria-label={`Add ${product.name} to cart`}
            className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-brand text-brand-ink shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 sm:translate-y-2 sm:opacity-0 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
          >
            <Icon name="plus" size={20} strokeWidth={2.4} />
          </button>
        )}
      </div>
      <Link href={href} className="mt-3 block">
        <div className="flex flex-col justify-between gap-0.5 text-[0.95rem] sm:flex-row sm:gap-3">
          <h3 className="font-sans font-medium tracking-normal">{product.name}</h3>
          <span className="shrink-0 text-muted">
            {money(product.price)}
            {product.mrp > product.price && <s className="ml-1.5 text-xs opacity-70">{money(product.mrp)}</s>}
          </span>
        </div>
      </Link>
      {/* stars open the product page straight on the Reviews tab */}
      <Link
        href={`${href}#reviews`}
        aria-label={`${product.rating} out of 5 stars, ${product.numReviews} reviews - read reviews`}
        className="mt-0.5 inline-flex items-center gap-1.5 rounded text-sm transition hover:opacity-75"
      >
        <Stars value={product.rating} />
        <span className="text-xs text-muted">({product.numReviews})</span>
      </Link>
    </motion.article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-7 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
