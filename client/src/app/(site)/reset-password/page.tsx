'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage, fieldError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

function ResetForm() {
  // the token is in the URL fragment (#token=...), which browsers never send to any server
  // or in Referer headers; it is removed from the address bar as soon as it is read
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    setToken(t);
    if (t) history.replaceState(null, '', window.location.pathname);
  }, []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (token === null) return null;
  if (!token) {
    return (
      <p className="mt-4 text-center text-muted">
        This link is incomplete.{' '}
        <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }
  if (done) {
    return (
      <>
        <p className="mt-4 text-center text-star">{done}</p>
        <Link href="/login" className="mt-6 block text-center font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </>
    );
  }
  return (
    <form
      noValidate
      className="mt-6 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (password !== confirm) return setErr(new Error('The two passwords do not match.'));
        setBusy(true);
        try {
          const r = await api<{ message: string }>('/auth/reset', { method: 'POST', body: { token, password } });
          setDone(r.message);
        } catch (e) {
          setErr(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 12 characters - a short sentence works"
        error={fieldError(err, 'password')}
      />
      <Field label="Repeat new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {!!err && !fieldError(err, 'password') && (
        <p className="text-sm text-danger" role="alert">
          {errorMessage(err)}
        </p>
      )}
      <Button type="submit" loading={busy} className="w-full">
        Save new password
      </Button>
    </form>
  );
}

/** Opened from the reset email: /reset-password#token=... */
export default function ResetPasswordPage() {
  return (
    <div className="mx-auto my-8 w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-[0_24px_70px_-30px_rgba(10,26,64,.35)] sm:p-9">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-chip text-brand">
        <Icon name="shield" size={26} />
      </span>
      <h1 className="text-center text-2xl font-bold">Choose a new password</h1>
      <ResetForm />
    </div>
  );
}
