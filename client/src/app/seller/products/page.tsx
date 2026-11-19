'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage, refreshStorefront } from '@/lib/api';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useToast } from '@/components/providers/ToastProvider';
import { TableWrap, Toggle } from '@/components/dashboard/DashboardShell';
import { ProductVisual } from '@/components/product/ProductArt';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, PageTitle, Spinner } from '@/components/ui/misc';

export default function ManageProductsPage() {
  const [list, setList] = useState<Product[] | null>(null);
  const [err, setErr] = useState('');
  const toast = useToast();

  useEffect(() => {
    api<{ products: Product[] }>('/seller/products')
      .then((r) => setList(r.products))
      .catch((e) => setErr(errorMessage(e)));
  }, []);

  if (err) return <EmptyState icon="globe" title="Could not load products" text={err} />;
  if (!list) return <Spinner />;

  async function patch(id: string, body: Partial<Product>) {
    const prev = list;
    setList((l) => l!.map((p) => (p.id === id ? { ...p, ...body } : p))); // optimistic
    try {
      await api(`/seller/products/${id}`, { method: 'PATCH', body });
      refreshStorefront();
      toast(body.inStock ? 'Marked in stock' : 'Marked out of stock');
    } catch (e) {
      setList(prev);
      toast(errorMessage(e), 'error');
    }
  }

  async function del(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api(`/seller/products/${p.id}`, { method: 'DELETE' });
      refreshStorefront();
      setList((l) => l!.filter((x) => x.id !== p.id));
      toast('Product deleted');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <PageTitle>
        Manage <b>Products</b>
      </PageTitle>
      {list.length === 0 ? (
        <EmptyState icon="basket" title="No products yet" action={{ href: '/seller/add-product', label: 'Add your first product' }} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>MRP</th>
              <th>Price</th>
              <th>In stock</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/product/${p.slug}`} className="flex min-w-48 items-center gap-3 font-medium hover:underline">
                    <ProductVisual name={p.name} image={p.images[0]} art={p.art} className="size-11 shrink-0 rounded-lg" artClassName="w-[70%]" sizes="44px" />
                    {p.name}
                  </Link>
                </td>
                <td>
                  <p className="max-w-xs truncate text-muted" title={p.description}>
                    {p.description}
                  </p>
                </td>
                <td>{money(p.mrp)}</td>
                <td>{money(p.price)}</td>
                <td>
                  <Toggle checked={p.inStock} onChange={(v) => patch(p.id, { inStock: v })} label={`In stock: ${p.name}`} />
                </td>
                <td>
                  <button onClick={() => del(p)} aria-label={`Delete ${p.name}`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-chip hover:text-danger">
                    <Icon name="trash" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
