'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import { StatCard } from '@/components/dashboard/DashboardShell';
import { EmptyState, PageTitle, Spinner, Stars } from '@/components/ui/misc';

type Data = {
  stats: { totalProducts: number; totalEarnings: number; totalOrders: number; totalRatings: number };
  reviews: { id: string; name: string; rating: number; text: string; createdAt: string; product: { name: string; slug: string; category: string } | null }[];
};

export default function SellerDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<Data>('/seller/dashboard').then(setData).catch((e) => setErr(errorMessage(e)));
  }, []);

  if (err) return <EmptyState icon="globe" title="Could not load dashboard" text={err} />;
  if (!data) return <Spinner />;
  const s = data.stats;

  return (
    <>
      <PageTitle>
        Seller <b>Dashboard</b>
      </PageTitle>
      <div className="grid max-w-6xl gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Products" value={s.totalProducts} icon="basket" />
        <StatCard label="Total Earnings" value={money(s.totalEarnings)} icon="dollar" delay={0.05} />
        <StatCard label="Total Orders" value={s.totalOrders} icon="tag" delay={0.1} />
        <StatCard label="Total Ratings" value={s.totalRatings} icon="star" delay={0.15} />
      </div>

      <h2 className="mt-11 text-lg text-muted">Latest Reviews</h2>
      {data.reviews.length === 0 && <p className="mt-4 text-muted">No reviews yet. Reviews from your customers will show here.</p>}
      <div className="mt-2 max-w-6xl">
        {data.reviews.map((r) => (
          <div key={r.id} className="grid gap-4 border-b border-line py-6 sm:grid-cols-[minmax(0,1fr)_240px] sm:gap-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-brand font-semibold text-brand-ink">{r.name.charAt(0).toUpperCase()}</span>
                <div>
                  <b className="block font-medium">{r.name}</b>
                  <small className="text-muted">{shortDate(r.createdAt)}</small>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-muted">{r.text}</p>
            </div>
            {r.product && (
              <div className="flex flex-col gap-1 sm:items-end sm:text-right">
                <small className="text-muted">{r.product.category}</small>
                <b className="font-medium">{r.product.name}</b>
                <Stars value={r.rating} />
                <Link href={`/product/${r.product.slug}`} className="mt-3 text-sm text-brand hover:underline">
                  View Product
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
