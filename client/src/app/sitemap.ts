import type { MetadataRoute } from 'next';
import { CATEGORIES, SITE } from '@/lib/config';
import { serverGet } from '@/lib/server-api';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE.url}/plus`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE.url}/create-store`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE.url}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.url}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    ...CATEGORIES.map((c) => ({
      url: `${SITE.url}/shop?category=${encodeURIComponent(c)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
  const data = await serverGet<{ products: { slug: string; updatedAt: string }[] }>('/products/sitemap', 3600);
  const products = (data?.products ?? []).map((p) => ({
    url: `${SITE.url}/product/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  return [...staticPages, ...products];
}
