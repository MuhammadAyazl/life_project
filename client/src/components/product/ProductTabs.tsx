'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { api, errorMessage } from '@/lib/api';
import { shortDate, cn } from '@/lib/format';
import type { Review } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Stars } from '@/components/ui/misc';

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toast = useToast();

  return (
    <form
      className="mt-6 grid gap-3 rounded-xl border border-line p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        try {
          await api(`/products/${productId}/reviews`, { method: 'POST', body: { rating, text } });
          toast('Thanks for your review!');
          setText('');
          onDone();
        } catch (e) {
          setErr(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold text-ink">Write a review</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)}
            className={cn('text-2xl transition hover:scale-110', n <= rating ? 'text-star' : 'text-line')}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="field min-h-24"
        required
        minLength={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you like or dislike?"
        aria-label="Review text"
      />
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button type="submit" loading={busy} className="justify-self-start">
        Submit review
      </Button>
    </form>
  );
}

export function ProductTabs({ productId, description, reviews }: { productId: string; description: string; reviews: Review[] }) {
  const [tab, setTab] = useState<'desc' | 'reviews'>('desc');
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="mt-14 max-w-3xl">
      <div role="tablist" className="flex gap-7 border-b border-line">
        {(
          [
            ['desc', 'Description'],
            ['reviews', `Reviews (${reviews.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn('relative -mb-px py-2.5 text-[0.95rem] transition', tab === k ? 'font-semibold text-ink' : 'text-muted hover:text-ink')}
          >
            {label}
            {tab === k && <motion.span layoutId="tab-line" className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="py-7 leading-relaxed text-muted">
        {tab === 'desc' ? (
          <p>{description}</p>
        ) : (
          <>
            {reviews.length === 0 && <p>No reviews yet. Be the first to review this product.</p>}
            <div className="grid gap-7">
              {reviews.map((r) => (
                <div key={r.id} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand font-semibold text-brand-ink">
                    {r.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <Stars value={r.rating} />
                    <p className="my-2 text-ink">{r.text}</p>
                    <p className="font-medium text-ink">{r.name}</p>
                    <p className="text-sm">{shortDate(r.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            {user ? (
              <ReviewForm productId={productId} onDone={() => router.refresh()} />
            ) : (
              <p className="mt-6">
                <Link href="/login" className="font-medium text-brand hover:underline">
                  Sign in
                </Link>{' '}
                to write a review.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
