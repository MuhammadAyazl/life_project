import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/misc';
import { PaymentSuccess } from './PaymentSuccess';

export const metadata: Metadata = { title: 'Payment', robots: { index: false, follow: false } };

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PaymentSuccess />
    </Suspense>
  );
}
