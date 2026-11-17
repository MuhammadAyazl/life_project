'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * Client-side page guard (UX only - the API enforces every permission itself).
 * Redirects to /login when signed out, or home when the role doesn't match.
 */
export function useRequireAuth(role?: 'admin') {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (role && user.role !== role) router.replace('/');
  }, [user, loading, role, router, pathname]);

  const ok = !loading && !!user && (!role || user.role === role);
  return { user, ready: ok };
}
