import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlusPlans } from './PlusPlans';

export const metadata: Metadata = {
  title: 'Plus Membership - 7-Day Free Trial',
  description:
    'Join ShopFussion Plus for member-only coupons, exclusive discounts, early access to sales and faster shipping. Try it free for 7 days.',
  alternates: { canonical: '/plus' },
};

export default function PlusPage() {
  return (
    <div className="py-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold">Become a Plus Member</h1>
        <p className="mt-2 text-muted">Pick the plan that fits you. Try Plus free for 7 days, cancel anytime.</p>
      </div>
      {/* Suspense: PlusPlans reads ?status= after returning from Stripe */}
      <Suspense>
        <PlusPlans />
      </Suspense>
    </div>
  );
}
