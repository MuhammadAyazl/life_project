import type { Metadata } from 'next';
import { CartView } from './CartView';

export const metadata: Metadata = { title: 'My Cart', robots: { index: false, follow: false } };

export default function CartPage() {
  return <CartView />;
}
