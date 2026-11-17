'use client';

import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const SCRIPT = 'https://accounts.google.com/gsi/client';

/**
 * "Continue with Google" using Google Identity Services. Google returns a signed ID token,
 * which our server verifies before creating the session. Hidden when GOOGLE_CLIENT_ID isn't set.
 */
export function GoogleButton({ onSuccess, onError }: { onSuccess: (u: User) => void; onError: (m: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    api<{ googleClientId: string | null }>('/auth/config')
      .then((r) => setClientId(r.googleClientId))
      .catch(() => setClientId(null));
  }, []);

  useEffect(() => {
    if (!clientId || !box.current) return;
    const render = () => {
      if (!window.google || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const r = await api<{ user: User }>('/auth/google', { method: 'POST', body: { credential } });
            onSuccess(r.user);
          } catch (e) {
            onError(errorMessage(e));
          }
        },
      });
      window.google.accounts.id.renderButton(box.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: Math.min(box.current.offsetWidth || 360, 400),
      });
    };
    if (window.google) return render();
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (!s) {
      s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener('load', render);
    return () => s?.removeEventListener('load', render);
  }, [clientId, onSuccess, onError]);

  if (clientId === null) return null;
  return (
    <>
      <div ref={box} className="flex min-h-11 w-full justify-center" />
      <div className="my-4 flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        or
      </div>
    </>
  );
}
