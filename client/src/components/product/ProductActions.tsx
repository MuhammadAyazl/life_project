'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCart, MAX_QTY } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { Product } from '@/lib/types';

/** "Add to Cart" - after the first click a −/+ stepper slides in next to the button. */
export function ProductActions({ product }: { product: Product }) {
  const { qtyOf, add, setQty, ready } = useCart();
  const toast = useToast();
  const qty = ready ? qtyOf(product.id) : 0;

  if (!product.inStock) {
    return <p className="rounded-lg bg-chip px-4 py-3 font-medium text-muted">Currently out of stock</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <AnimatePresence initial={false}>
        {qty > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.6, width: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="flex items-center overflow-hidden rounded-lg border border-line bg-surface p-1"
            role="group"
            aria-label="Quantity"
          >
            <button
              className="grid size-10 place-items-center rounded-md text-muted hover:bg-chip hover:text-ink"
              aria-label="Decrease quantity"
              onClick={() => {
                setQty(product.id, qty - 1);
                if (qty - 1 === 0) toast(`${product.name} removed from cart`);
              }}
            >
              <Icon name="minus" />
            </button>
            <motion.span key={qty} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="min-w-10 text-center text-lg font-semibold" aria-live="polite">
              {qty}
            </motion.span>
            <button
              className="grid size-10 place-items-center rounded-md text-muted hover:bg-chip hover:text-ink disabled:opacity-40"
              aria-label="Increase quantity"
              disabled={qty >= MAX_QTY}
              onClick={() => setQty(product.id, qty + 1)}
            >
              <Icon name="plus" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        size="lg"
        onClick={() => {
          if (qty > 0) return toast('Already in your cart. Use + to add more.');
          add(product);
          toast(`${product.name} added to cart`);
        }}
      >
        <Icon name="cart" size={18} />
        {qty > 0 ? 'In your cart' : 'Add to Cart'}
      </Button>
    </div>
  );
}
