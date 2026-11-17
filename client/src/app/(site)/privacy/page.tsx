import type { Metadata } from 'next';
import { SITE } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How ShopFussion collects, uses and protects your personal information.',
  alternates: { canonical: '/privacy' },
};

const SECTIONS: [string, string][] = [
  ['What we collect', 'Your name, email address, delivery addresses and phone number when you create an account or place an order, and the orders you place with us. If you sign in with Google we receive your name, email and profile picture from Google.'],
  ['How we use it', 'To create and secure your account, deliver your orders, share the delivery details an order needs with the store that sells it, manage your Plus membership and, if you subscribe, send our newsletter.'],
  ['How we protect it', 'Passwords are stored only as salted bcrypt hashes. Sessions use secure, httpOnly cookies. All traffic is encrypted with HTTPS in production, and access to your data is limited to you, the store fulfilling your order, and administrators.'],
  ['Cookies', 'We use one essential cookie to keep you signed in. Your cart is saved in your own browser. We do not use advertising cookies.'],
  ['Your choices', 'You can update your profile and delete saved addresses at any time from your account page. To delete your account entirely, contact us and we will remove your personal data except where the law requires us to keep order records.'],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl py-6">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-muted">Last updated: November 2026</p>
      {SECTIONS.map(([h, p]) => (
        <section key={h} className="mt-8">
          <h2 className="text-xl font-bold">{h}</h2>
          <p className="mt-2 leading-relaxed text-muted">{p}</p>
        </section>
      ))}
      <p className="mt-10 text-muted">
        Questions? Email us at{' '}
        <a href={`mailto:${SITE.email}`} className="font-medium text-brand hover:underline">
          {SITE.email}
        </a>
        .
      </p>
    </article>
  );
}
