import type { Metadata, Viewport } from 'next';
import { Great_Vibes, Inter, Poiret_One } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE } from '@/lib/config';
import './globals.css';

// Body text uses Apple's system font (San Francisco) on iPhone/Mac; Inter is the look-alike everywhere else.
// Poiret One: elegant thin display face for the hero headline. Great Vibes: script face for the logo name.
// All self-hosted by next/font (no layout shift, no request to Google from the visitor's browser).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const elegant = Poiret_One({ subsets: ['latin'], weight: '400', variable: '--font-elegant-src', display: 'swap' });
const script = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-script-src', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} - Smart Gadgets & Electronics Online`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  alternates: { canonical: '/' },
  icons: { icon: SITE.logo, apple: SITE.logo },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    url: SITE.url,
    title: `${SITE.name} - ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: SITE.ogImage, width: 1263, height: 1245, alt: SITE.name }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} - ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#13212c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${elegant.variable} ${script.variable}`}>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen, Grammarly) add attributes to <body>
          before React loads; this ignores only <body>'s own attributes, not its children. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <a href="#main" className="sr-only z-[200] rounded-lg bg-brand px-4 py-2 text-brand-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': `${SITE.url}/#org`,
                name: SITE.name,
                url: SITE.url,
                logo: `${SITE.url}${SITE.logo}`,
                email: SITE.email,
                contactPoint: { '@type': 'ContactPoint', telephone: SITE.phone, contactType: 'customer support' },
              },
              {
                '@type': 'WebSite',
                '@id': `${SITE.url}/#website`,
                name: SITE.name,
                url: SITE.url,
                publisher: { '@id': `${SITE.url}/#org` },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: `${SITE.url}/shop?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
