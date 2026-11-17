import { API_URL } from './config';

/**
 * Server-side fetch for Server Components (SEO pages). Talks to Express directly.
 * Returns null on 404 / network failure so pages can render a friendly state.
 */
export async function serverGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
