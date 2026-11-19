export const SITE = {
  name: 'ShopFussion',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  description:
    'ShopFussion is your destination for the latest smart gadgets - earbuds, headphones, smart watches, speakers and more. Free shipping, 7-day easy returns and 24/7 support.',
  tagline: 'Gadgets you’ll love. Prices you’ll trust.',
  email: 'contact@shopfussion.com',
  phone: '+971 54 383 5133',
  whatsapp: '+971 54 383 5133',
  whatsappLink: 'https://wa.me/971543835133',
  github: 'https://github.com/MuhammadAyazl/life_project',
  logo: '/images/logo1.png',
  ogImage: '/images/RGB_Gamer_Girl_Portrait.png',
  keywords: [
    'ShopFussion',
    'online gadget store',
    'wireless earbuds',
    'headphones',
    'smart watch',
    'bluetooth speaker',
    'gaming mouse',
    'buy electronics online',
  ],
} as const;

/** Used only by server components (never shipped to the browser). */
export const API_URL = (process.env.API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

export const CATEGORIES = [
  'Mouse',
  'Decoration',
  'Headphones',
  'Speakers',
  'Watch',
  'Earbuds',
  'Home & Kitchen',
] as const;
export type Category = (typeof CATEGORIES)[number];
