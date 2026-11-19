'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

/** "Forgot password": sends a one-time reset link to the email (works for 30 minutes). */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto my-8 w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-[0_24px_70px_-30px_rgba(10,26,64,.35)] sm:p-9">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-chip text-brand">
        <Icon name="mail" size={26} />
      </span>
      <h1 className="text-center text-2xl font-bold">Forgot your password?</h1>
      {sent ? (
        <>
          <p className="mt-3 text-center text-muted">{sent}</p>
          <p className="mt-2 text-center text-xs text-muted">The link works for 30 minutes and can be used once.</p>
          <Link href="/login" className="mt-6 block text-center font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        </>
      ) : (
        <form
          className="mt-6 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr('');
            try {
              const r = await api<{ message: string }>('/auth/forgot', { method: 'POST', body: { email } });
              setSent(r.message);
            } catch (e) {
              setErr(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-center text-sm text-muted">Enter your account email and we&apos;ll send you a link to choose a new password.</p>
          <Field label="Email address" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button type="submit" loading={busy} className="w-full">
            Send reset link
          </Button>
          <Link href="/login" className="text-center text-sm text-muted hover:text-ink">
            ← Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
