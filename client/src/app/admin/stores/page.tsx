'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage, refreshStorefront } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import { Toggle } from '@/components/dashboard/DashboardShell';
import { StoreCard, type AdminStore } from '@/components/dashboard/StoreCard';
import { EmptyState, PageTitle, Spinner } from '@/components/ui/misc';

export default function AdminStoresPage() {
  const [list, setList] = useState<AdminStore[] | null>(null);
  const [err, setErr] = useState('');
  const toast = useToast();

  useEffect(() => {
    api<{ stores: AdminStore[] }>('/admin/stores?status=approved')
      .then((r) => setList(r.stores))
      .catch((e) => setErr(errorMessage(e)));
  }, []);

  if (err) return <EmptyState icon="globe" title="Could not load stores" text={err} />;
  if (!list) return <Spinner />;

  return (
    <>
      <PageTitle>
        Live <b>Stores</b>
      </PageTitle>
      {list.length === 0 && <EmptyState icon="store" title="No live stores yet" />}
      <div className="grid gap-5">
        {list.map((s) => (
          <StoreCard
            key={s.id}
            s={s}
            footer={
              <label className="flex items-center gap-3 text-sm">
                Active
                <Toggle
                  checked={s.isActive}
                  label={`Store ${s.name} active`}
                  onChange={async (v) => {
                    setList((l) => l!.map((x) => (x.id === s.id ? { ...x, isActive: v } : x)));
                    try {
                      await api(`/admin/stores/${s.id}`, { method: 'PATCH', body: { isActive: v } });
      refreshStorefront();
                      toast(v ? 'Store activated' : 'Store deactivated - its products are hidden');
                    } catch (e) {
                      setList((l) => l!.map((x) => (x.id === s.id ? { ...x, isActive: !v } : x)));
                      toast(errorMessage(e), 'error');
                    }
                  }}
                />
              </label>
            }
          />
        ))}
      </div>
    </>
  );
}
