'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
    <form
      className="mx-auto mt-7 flex max-w-md flex-col gap-2.5 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg({ text: 'Enter a valid email address.', ok: false });
        setBusy(true);
        try {
          const r = await api<{ message: string }>('/newsletter', { method: 'POST', body: { email } });
          setMsg({ text: r.message, ok: true });
          setEmail('');
        } catch (err) {
          setMsg({ text: errorMessage(err), ok: false });
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        aria-label="Email for newsletter"
        className="field flex-1 rounded-full px-5 py-3.5"
      />
      <Button type="submit" loading={busy} className="rounded-full">
        Subscribe
      </Button>
    </form>
    <p className={`mt-3 min-h-5 text-center text-sm ${msg?.ok ? 'text-star' : 'text-danger'}`} role="status">
      {msg?.text}
    </p>
    </>
  );
}
