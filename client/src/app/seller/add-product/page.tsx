'use client';

import { useEffect, useRef, useState } from 'react';
import { api, errorMessage, fieldError } from '@/lib/api';
import { CATEGORIES } from '@/lib/config';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field, Select, TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PageTitle } from '@/components/ui/misc';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMPTY = { name: '', description: '', mrp: '', price: '', category: '' };

export default function AddProductPage() {
  const [files, setFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // free preview memory when previews change / page unmounts
  useEffect(() => () => previews.forEach((p) => p && URL.revokeObjectURL(p)), [previews]);

  function pick(i: number, file?: File) {
    setMsg('');
    if (!file) return;
    if (!TYPES.includes(file.type)) return setMsg('Only JPG, PNG or WEBP images are allowed.');
    if (file.size > MAX_BYTES) return setMsg('Each image must be 2 MB or smaller.');
    setFiles((a) => a.map((x, j) => (j === i ? file : x)));
    setPreviews((a) => a.map((x, j) => (j === i ? URL.createObjectURL(file) : x)));
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
      <PageTitle>
        Add New <b>Product</b>
      </PageTitle>
      <form
        ref={formRef}
        noValidate
        className="grid max-w-2xl gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setMsg('');
          const chosen = files.filter(Boolean) as File[];
          if (!chosen.length) return setMsg('Please upload at least one product image.');
          const fd = new FormData();
          Object.entries(f).forEach(([k, v]) => fd.append(k, v));
          chosen.forEach((file) => fd.append('images', file));
          setBusy(true);
          try {
            await api('/seller/products', { method: 'POST', body: fd });
            toast('Product added');
            setF(EMPTY);
            setFiles([null, null, null, null]);
            setPreviews([null, null, null, null]);
            formRef.current?.reset();
          } catch (e) {
            setErr(e);
            setMsg(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <p className="mb-2 text-sm font-semibold">Product images</p>
          <div className="flex flex-wrap gap-3">
            {previews.map((p, i) => (
              <label
                key={i}
                className="relative grid size-24 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-chip text-brand transition hover:border-brand"
                aria-label={`Upload image ${i + 1}`}
              >
                <input type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => pick(i, e.target.files?.[0])} />
                {p ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img src={p} alt={`Preview ${i + 1}`} className="absolute inset-0 size-full object-cover" />
                ) : (
                  <Icon name="upload" size={28} />
                )}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Up to 4 images · JPG, PNG or WEBP · max 2 MB each</p>
        </div>
        <Field label="Name" value={f.name} onChange={set('name')} placeholder="Enter product name" error={fieldError(err, 'name')} maxLength={120} />
        <TextArea label="Description" value={f.description} onChange={set('description')} placeholder="Enter product description" error={fieldError(err, 'description')} maxLength={3000} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Actual price ($)" type="number" min="0" step="any" value={f.mrp} onChange={set('mrp')} error={fieldError(err, 'mrp')} />
          <Field label="Offer price ($)" type="number" min="0" step="any" value={f.price} onChange={set('price')} error={fieldError(err, 'price')} />
        </div>
        <Select label="Category" value={f.category} onChange={set('category')} error={fieldError(err, 'category')}>
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        {msg && <p className="text-sm text-danger" role="alert">{msg}</p>}
        <Button type="submit" loading={busy} className="justify-self-start">
          Add Product
        </Button>
      </form>
    </>
  );
}
