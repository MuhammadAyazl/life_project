'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { useToast } from '@/components/providers/ToastProvider';
import { TableWrap } from '@/components/dashboard/DashboardShell';
import { ProductVisual } from '@/components/product/ProductArt';
import { Modal } from '@/components/ui/Modal';
import { Badge, EmptyState, PageTitle, Spinner } from '@/components/ui/misc';

const STATUS: OrderStatus[] = ['ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default function SellerOrdersPage() {
  const [list, setList] = useState<Order[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Order | null>(null);
  const toast = useToast();

  useEffect(() => {
    api<{ orders: Order[] }>('/seller/orders')
      .then((r) => setList(r.orders))
      .catch((e) => setErr(errorMessage(e)));
  }, []);

  if (err) return <EmptyState icon="globe" title="Could not load orders" text={err} />;
  if (!list) return <Spinner />;

  async function setStatus(o: Order, status: OrderStatus) {
    try {
      await api(`/seller/orders/${o.id}/status`, { method: 'PATCH', body: { status } });
      setList((l) => l!.map((x) => (x.id === o.id ? { ...x, status, isPaid: status === 'DELIVERED' ? true : x.isPaid } : x)));
      toast('Order status updated');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <PageTitle>
        Store <b>Orders</b>
      </PageTitle>
      {list.length === 0 ? (
        <EmptyState icon="list" title="No orders yet" text="New orders for your products will appear here." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Coupon</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o, i) => (
              <tr
                key={o.id}
                tabIndex={0}
                onClick={(e) => !(e.target as HTMLElement).closest('select') && setOpen(o)}
                onKeyDown={(e) => e.key === 'Enter' && setOpen(o)}
                className="cursor-pointer hover:bg-chip/60"
              >
                <td>{i + 1}</td>
                <td>{o.address.name}</td>
                <td>{money(o.total)}</td>
                <td>{o.paymentMethod}</td>
                <td>{o.coupon?.code ? <Badge tone="green">{o.coupon.code}</Badge> : '—'}</td>
                <td>
                  {o.status === 'CANCELLED' ? (
                    <Badge tone="red">Cancelled</Badge>
                  ) : (
                    <select className="field w-auto py-1.5 text-sm" value={o.status} onChange={(e) => setStatus(o, e.target.value as OrderStatus)} aria-label="Order status">
                      {STATUS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="whitespace-nowrap">{dateTime(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="Order Details" wide>
        {open && (
          <div className="grid gap-5 text-sm">
            <section>
              <h3 className="mb-2 font-semibold">Customer</h3>
              <p>{open.address.name} · {open.address.email} · {open.address.phone}</p>
              <p className="text-muted">
                {open.address.street}, {open.address.city}, {open.address.state} {open.address.zip}, {open.address.country}
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-semibold">Products</h3>
              {open.items.map((it) => (
                <div key={it.product} className="flex items-center gap-4 border-t border-line py-3">
                  <ProductVisual name={it.name} image={it.image} art={it.art} className="size-14 shrink-0 rounded-lg" artClassName="w-[66%]" sizes="56px" />
                  <div>
                    <p className="font-medium">{it.name}</p>
                    <p className="text-muted">Qty {it.qty} · {money(it.price)}</p>
                  </div>
                </div>
              ))}
            </section>
            <section className="grid gap-1 border-t border-line pt-4">
              <p>Payment: {open.paymentMethod} · {open.isPaid ? 'Paid' : 'Not paid'}</p>
              <p>Coupon: {open.coupon?.code ? `${open.coupon.code} (${open.coupon.discount}% off)` : 'None'}</p>
              <p>Subtotal {money(open.subtotal)} · Discount {money(open.discount)} · <b>Total {money(open.total)}</b></p>
              <p>Status: {open.status} · Ordered {dateTime(open.createdAt)}</p>
            </section>
          </div>
        )}
      </Modal>
    </>
  );
}
