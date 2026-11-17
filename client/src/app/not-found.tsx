import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/ui/misc';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container-page">
        <EmptyState icon="search" title="Page not found" text="The page you’re looking for doesn’t exist or has moved." action={{ href: '/shop', label: 'Back to shop' }} />
      </main>
      <Footer />
    </>
  );
}
