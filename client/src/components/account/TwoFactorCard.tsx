'use client';

/* eslint-disable @next/next/no-img-element -- QR code is a server-generated data: URL */
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/misc';

/** Turn two-factor sign-in (authenticator app) on or off from the account page. */
export function TwoFactorCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Recovery codes are shown exactly once, right after turning 2FA on.
  if (codes) {
    return (
      <div className="grid gap-3">
        <p className="text-sm font-semibold text-star">Two-factor sign-in is on ✓</p>
        <p className="text-sm text-muted">
          Save these <b className="text-ink">recovery codes</b> somewhere safe. Each one lets you sign in once if you lose your phone. They
          will not be shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-chip p-4 font-mono text-sm">
          {codes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(codes.join('\n')).then(() => toast('Codes copied'))}>
            Copy codes
          </Button>
          <Button size="sm" onClick={() => setCodes(null)}>
            I saved them
          </Button>
        </div>
      </div>
    );
  }

  if (user.twoFactorEnabled) {
    return (
      <div className="grid gap-3">
        <p className="flex items-center gap-2 text-sm">
          <Badge tone="green">On</Badge> Sign-in needs a code from your authenticator app.
        </p>
        {!disabling ? (
          <Button size="sm" variant="ghost" className="justify-self-start text-danger" onClick={() => setDisabling(true)}>
            Turn off two-factor sign-in
          </Button>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const r = await api<{ user: User }>('/users/me/2fa/disable', { method: 'POST', body: { password, code } });
                setUser(r.user);
                setDisabling(false);
                setCode('');
                setPassword('');
                toast('Two-factor sign-in turned off');
              });
            }}
          >
            <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Field label="Code from your app" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
            {err && <p className="text-sm text-danger">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="danger" loading={busy}>
                Turn off
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDisabling(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (setup) {
    return (
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await api<{ user: User; recoveryCodes: string[] }>('/users/me/2fa/enable', { method: 'POST', body: { code } });
            setUser(r.user);
            setCodes(r.recoveryCodes);
            setSetup(null);
            setCode('');
          });
        }}
      >
        <p className="text-sm text-muted">
          1. Open <b className="text-ink">Google Authenticator</b> (or Microsoft Authenticator / Authy) and scan this QR code.
        </p>
        <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-lg border border-line bg-white p-2" />
        <p className="text-xs text-muted">
          Can&apos;t scan? Enter this key: <code className="rounded bg-chip px-1.5 py-0.5 font-mono break-all text-ink">{setup.secret}</code>
        </p>
        <p className="text-sm text-muted">2. Type the 6-digit code the app shows:</p>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          aria-label="6-digit code"
          className="field max-w-48 text-center font-mono text-xl tracking-[0.3em]"
        />
        {err && <p className="text-sm text-danger">{err}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={busy} disabled={code.length !== 6}>
            Turn on
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSetup(null)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Add a second step to sign-in: after your password, a 6-digit code from your phone. Strongly recommended for admin and seller accounts.
      </p>
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button
        size="sm"
        className="justify-self-start"
        loading={busy}
        onClick={() => run(async () => setSetup(await api<{ secret: string; qr: string }>('/users/me/2fa/setup', { method: 'POST' })))}
      >
        Set up two-factor sign-in
      </Button>
    </div>
  );
}
