import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="container-page py-7">
        {children}
      </main>
      <Footer />
    </>
  );
}
