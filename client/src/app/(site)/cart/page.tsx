import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CartView } from './CartView';
import { Spinner } from '@/components/ui/misc';

export const metadata: Metadata = { title: 'My Cart', robots: { index: false, follow: false } };

export default function CartPage() {
  // Suspense: CartView reads ?payment=cancelled after returning from Stripe
  return (
    <Suspense fallback={<Spinner />}>
      <CartView />
    </Suspense>
  );
}
