'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, ApiError, errorMessage, fieldError } from '@/lib/api';
import { safeNext } from '@/lib/format';
import type { User } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { GoogleButton, type AuthResult } from './GoogleButton';
import { TwoFactorStep } from './TwoFactorStep';

/** Length-based strength (OWASP ASVS): longer beats "complex". 12 is the minimum. */
function passwordStrength(pw: string) {
  const unique = new Set(pw).size;
  if (pw.length < 12 || unique < 5) return 1;
  if (pw.length < 16) return 2;
  if (pw.length < 20) return 3;
  return 4;
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { setUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [challenge, setChallenge] = useState<string | null>(null); // set when 2FA code is needed
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const done = useCallback(
    (u: User) => {
      setUser(u);
      toast(isSignup ? `Welcome to ShopFussion, ${u.firstName || u.name}!` : `Welcome back, ${u.firstName || u.name}!`);
      // admins land on their dashboard unless they were heading somewhere specific
      router.replace(u.role === 'admin' && !params.get('next') ? '/admin' : next);
      router.refresh();
    },
    [setUser, toast, router, next, isSignup],
  );
  const handleResult = useCallback(
    (r: AuthResult) => {
      if (r.twoFactorRequired && r.challenge) setChallenge(r.challenge);
      else if (r.user) done(r.user);
    },
    [done],
  );
  const googleError = useCallback((m: string) => setErr(new ApiError(400, m)), []);

  // Close (X button, Escape, or a click outside the card): go back to the page the visitor came from,
  // never to /login or /signup again, and never to a private page that would bounce back here.
  const close = useCallback(() => {
    let to = '/';
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === window.location.origin && !/^\/(login|signup)/.test(ref.pathname) && !params.get('next')) {
        to = ref.pathname + ref.search;
      }
    } catch {
      /* bad referrer - go home */
    }
    router.push(to);
  }, [router, params]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [close]);

  const strength = passwordStrength(form.password);
  const general = err && !(err instanceof ApiError && err.details && Object.keys(err.details).length) ? errorMessage(err) : '';

  return (
    // full-screen backdrop: clicking anywhere outside the card closes it
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#0a141e]/55 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative my-6 w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-[0_24px_70px_-30px_rgba(10,26,64,.35)] sm:p-9"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-muted transition hover:bg-chip hover:text-ink"
      >
        <Icon name="close" size={20} />
      </button>
      <h1 id="auth-title" className="text-center text-2xl font-bold">{isSignup ? 'Create your account' : 'Sign in to ShopFussion'}</h1>
      <p className="mt-1 mb-6 text-center text-sm text-muted">
        {isSignup ? 'Join free - and try Plus free for 7 days.' : 'Welcome back! Please sign in to continue.'}
      </p>

      {challenge ? (
        <TwoFactorStep challenge={challenge} onDone={done} onBack={() => setChallenge(null)} />
      ) : (
      <>
      <GoogleButton onSuccess={handleResult} onError={googleError} />

      <form
        noValidate
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const body = isSignup ? { ...form, remember } : { email: form.email, password: form.password, remember };
            const r = await api<AuthResult>(`/auth/${mode}`, { method: 'POST', body });
            handleResult(r);
          } catch (e) {
            setErr(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        {isSignup && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" hint="Optional" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} maxLength={50} />
            <Field label="Last name" hint="Optional" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} maxLength={50} />
          </div>
        )}
        <Field
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
          placeholder="you@example.com"
          error={fieldError(err, 'email')}
        />
        <div className="grid gap-2">
          <Field
            label="Password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            value={form.password}
            onChange={set('password')}
            placeholder={isSignup ? 'At least 12 characters - a short sentence works' : 'Your password'}
            error={fieldError(err, 'password')}
          />
          {isSignup && form.password && (
            <div className="flex items-center gap-2" aria-live="polite">
              <div className="grid flex-1 grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-1 rounded-full transition-colors"
                    style={{ background: i < strength ? ['#e5484d', '#ee9b4a', '#3f8fd6', '#2f9e7a'][strength - 1] : 'var(--line)' }}
                  />
                ))}
              </div>
              <span className="w-14 text-xs text-muted">{['Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</span>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm text-muted select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          Keep me signed in
          <span className="text-xs opacity-75">(uncheck on a shared computer)</span>
        </label>
        {!isSignup && (
          <Link href="/forgot-password" className="-mt-2 justify-self-end text-sm font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        )}

        {general && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {general}
          </p>
        )}

        <Button type="submit" loading={busy} className="mt-1 w-full">
          {isSignup ? 'Create account' : 'Continue'} <Icon name="arrow" size={16} />
        </Button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
        {isSignup ? 'Already have an account?' : 'Don’t have an account?'}{' '}
        <Link
          href={`/${isSignup ? 'login' : 'signup'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-ink hover:underline"
        >
          {isSignup ? 'Sign in' : 'Sign up'}
        </Link>
      </p>
      </>
      )}
    </motion.div>
    </motion.div>
  );
}
