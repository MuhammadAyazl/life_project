import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fast redirect to /login for private pages when there is no session cookie at all.
 * This is a UX shortcut only - real authorization is checked by the API on every request.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.has('sf_token')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/seller/:path*', '/admin/:path*', '/create-store'],
};
