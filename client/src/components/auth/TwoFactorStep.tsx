'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/** Second sign-in step for accounts with 2FA: 6-digit authenticator code (or a recovery code). */
export function TwoFactorStep({ challenge, onDone, onBack }: { challenge: string; onDone: (u: User) => void; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        try {
          const r = await api<{ user: User }>('/auth/2fa', { method: 'POST', body: { challenge, code } });
          onDone(r.user);
        } catch (e) {
          setErr(errorMessage(e));
          setBusy(false);
        }
      }}
    >
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-chip text-brand">
        <Icon name="shield" size={28} />
      </span>
      <p className="text-center text-sm text-muted">
        {recovery
          ? 'Enter one of the recovery codes you saved when you turned on two-factor sign-in.'
          : 'Open your authenticator app and enter the 6-digit code for ShopFussion.'}
      </p>
      <input
        autoFocus
        inputMode={recovery ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(recovery ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder={recovery ? 'xxxx-xxxx' : '123456'}
        aria-label={recovery ? 'Recovery code' : '6-digit code'}
        className="field text-center font-mono text-2xl tracking-[0.4em]"
      />
      {err && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {err}
        </p>
      )}
      <Button type="submit" loading={busy} disabled={recovery ? code.length < 8 : code.length !== 6} className="w-full">
        Verify and sign in
      </Button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted hover:text-ink">
          ← Back
        </button>
        <button
          type="button"
          onClick={() => {
            setRecovery((v) => !v);
            setCode('');
            setErr('');
          }}
          className="font-medium text-brand hover:underline"
        >
          {recovery ? 'Use authenticator code' : 'Lost your phone? Use a recovery code'}
        </button>
      </div>
    </form>
  );
}
