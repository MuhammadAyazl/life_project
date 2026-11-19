import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/account', '/cart', '/seller', '/admin', '/login', '/forgot-password', '/reset-password'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
