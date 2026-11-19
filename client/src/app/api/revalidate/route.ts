import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/config';

/**
 * POST /api/revalidate - called right after a seller adds, edits or deletes a product,
 * so the cached home, shop and sitemap pages show the change immediately instead of after
 * the cache expires. Only signed-in sellers/admins may trigger it (checked with the API).
 * (This file-based route takes priority over the /api/* proxy rewrite in next.config.)
 */
export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  try {
    const me = await fetch(`${API_URL}/api/auth/me`, { headers: { cookie }, cache: 'no-store' });
    const { user } = (await me.json()) as { user: { role: string } | null };
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ message: 'Not allowed.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: 'Could not verify the session.' }, { status: 502 });
  }

  revalidatePath('/'); // home (latest + best selling)
  revalidatePath('/shop'); // every /shop?... variant
  revalidatePath('/product/[slug]', 'page');
  revalidatePath('/store/[username]', 'page');
  revalidatePath('/sitemap.xml');
  return NextResponse.json({ revalidated: true });
}
