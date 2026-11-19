'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, errorMessage, refreshStorefront } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageTitle, Spinner } from '@/components/ui/misc';
import { StoreCard, type AdminStore } from '@/components/dashboard/StoreCard';

export default function ApproveStoresPage() {
  const [list, setList] = useState<AdminStore[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const toast = useToast();

  useEffect(() => {
    api<{ stores: AdminStore[] }>('/admin/stores?status=pending')
      .then((r) => setList(r.stores))
      .catch((e) => setErr(errorMessage(e)));
  }, []);

  if (err) return <EmptyState icon="globe" title="Could not load applications" text={err} />;
  if (!list) return <Spinner />;

  async function decide(s: AdminStore, d: 'approve' | 'reject') {
    setBusy(s.id + d);
    try {
      await api(`/admin/stores/${s.id}/${d}`, { method: 'POST' });
      refreshStorefront();
      setList((l) => l!.filter((x) => x.id !== s.id));
      toast(d === 'approve' ? `${s.name} approved` : `${s.name} rejected`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageTitle>
        Approve <b>Stores</b>
      </PageTitle>
      {list.length === 0 && <EmptyState icon="shield" title="No applications pending" />}
      <div className="grid gap-5">
        <AnimatePresence>
          {list.map((s) => (
            <motion.div key={s.id} exit={{ opacity: 0, x: 60 }} layout>
              <StoreCard
                s={s}
                footer={
                  <>
                    <Button size="sm" loading={busy === s.id + 'approve'} onClick={() => decide(s, 'approve')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger" loading={busy === s.id + 'reject'} onClick={() => decide(s, 'reject')}>
                      Reject
                    </Button>
                  </>
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
