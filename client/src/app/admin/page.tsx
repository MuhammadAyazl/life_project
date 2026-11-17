'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { StatCard } from '@/components/dashboard/DashboardShell';
import { LineChart } from '@/components/dashboard/LineChart';
import { EmptyState, PageTitle, Spinner } from '@/components/ui/misc';

type Data = {
  stats: { totalProducts: number; totalRevenue: number; totalOrders: number; totalStores: number; totalUsers: number };
  chart: { date: string; orders: number }[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<Data>('/admin/dashboard').then(setData).catch((e) => setErr(errorMessage(e)));
  }, []);

  if (err) return <EmptyState icon="globe" title="Could not load dashboard" text={err} />;
  if (!data) return <Spinner />;
  const s = data.stats;

  return (
    <>
      <PageTitle>
        Admin <b>Dashboard</b>
      </PageTitle>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Products" value={s.totalProducts} icon="box" />
        <StatCard label="Total Revenue" value={money(s.totalRevenue)} icon="dollar" delay={0.05} />
        <StatCard label="Total Orders" value={s.totalOrders} icon="tag" delay={0.1} />
        <StatCard label="Live Stores" value={s.totalStores} icon="store" delay={0.15} />
      </div>
      <div className="mt-7 rounded-xl border border-line bg-surface p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Orders / day</h2>
          <span className="text-sm text-muted">Last 14 days · {s.totalUsers} registered users</span>
        </div>
        <LineChart data={data.chart} label="Orders per day for the last 14 days" />
      </div>
    </>
  );
}
