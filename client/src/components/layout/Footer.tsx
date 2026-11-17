import Link from 'next/link';
import { SITE } from '@/lib/config';
import { Icon } from '@/components/ui/Icon';

const COLS = [
  {
    title: 'Products',
    links: [
      ['/shop?category=Earbuds', 'Earbuds'],
      ['/shop?category=Headphones', 'Headphones'],
      ['/shop?category=Speakers', 'Speakers'],
      ['/shop?category=Watch', 'Watches'],
    ],
  },
  {
    title: 'Website',
    links: [
      ['/', 'Home'],
      ['/privacy', 'Privacy Policy'],
      ['/plus', 'Become a Plus Member'],
      ['/create-store', 'Create Your Store'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1.3fr]">
        <div>
          <p className="mb-5 max-w-sm text-[0.93rem] text-muted">
            Welcome to ShopFussion, your destination for the latest and smartest gadgets. From smartwatches to essential accessories, we
            bring you the best in innovation, all in one place.
          </p>
          <div className="flex gap-2.5">
            {['Facebook', 'Instagram', 'X', 'LinkedIn'].map((s) => (
              <a
                key={s}
                href="#"
                aria-label={s}
                className="grid size-9 place-items-center rounded-full border border-line text-xs font-semibold text-muted transition hover:border-brand hover:bg-brand hover:text-brand-ink"
              >
                {s === 'LinkedIn' ? 'in' : s[0]}
              </a>
            ))}
            {/* WhatsApp: opens a chat with the shop number */}
            <a
              href={SITE.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Chat on WhatsApp ${SITE.whatsapp}`}
              className="grid size-9 place-items-center rounded-full border border-line text-[#25D366] transition hover:border-[#25D366] hover:bg-[#25D366] hover:text-white"
            >
              <Icon name="whatsapp" size={17} strokeWidth={0} className="fill-current" />
            </a>
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h2 className="mb-4 font-sans text-sm font-semibold tracking-wider uppercase">{c.title}</h2>
            <ul className="grid gap-3 text-[0.92rem] text-muted">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="link-underline pb-0.5 hover:text-brand">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="mb-4 font-sans text-sm font-semibold tracking-wider uppercase">Contact</h2>
          <ul className="grid gap-3 text-[0.92rem] text-muted">
            <li className="flex items-center gap-2.5">
              <Icon name="phone" size={16} className="text-brand" />
              <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`} className="hover:text-brand">
                {SITE.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="whatsapp" size={16} strokeWidth={0} className="fill-[#25D366]" />
              <a href={SITE.whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                WhatsApp {SITE.whatsapp}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="mail" size={16} className="text-brand" />
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="pin" size={16} className="text-brand" />
              Dubai, United Arab Emirates
            </li>
          </ul>
        </div>
      </div>
      <div className="container-page border-t border-line py-5 text-sm text-muted">
        Copyright {new Date().getFullYear()} © ShopFussion. All rights reserved.
      </div>
    </footer>
  );
}
