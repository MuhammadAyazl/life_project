import type { Metadata } from 'next';
import { OrdersView } from './OrdersView';

export const metadata: Metadata = { title: 'My Orders', robots: { index: false, follow: false } };

export default function OrdersPage() {
  return <OrdersView />;
}
