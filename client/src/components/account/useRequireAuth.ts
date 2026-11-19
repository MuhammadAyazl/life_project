'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * Client-side page guard (UX only - the API enforces every permission itself).
 * Signed out -> /login (and back here afterwards). Signed in with the wrong role -> `forbidden`
 * is true so the page can explain it, instead of silently jumping to the home page.
 */
export function useRequireAuth(role?: 'admin') {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [user, loading, router, pathname]);

  const forbidden = !loading && !!user && !!role && user.role !== role;
  const ok = !loading && !!user && !forbidden;
  return { user, ready: ok, forbidden };
}
