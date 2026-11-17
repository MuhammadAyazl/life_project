import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';

/** Makes the site installable as a web app (Add to Home Screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f5f8',
    theme_color: '#2f4a7a',
    icons: [{ src: SITE.logo, sizes: '640x386', type: 'image/png' }],
    categories: ['shopping'],
  };
}
