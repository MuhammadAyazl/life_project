# ShopFussion — MERN E-commerce

Next.js 15 + TypeScript + Tailwind CSS v4 + Three.js + Framer Motion (frontend) and
Express 5 + MongoDB/Mongoose + TypeScript (backend).

```
life_project/
├─ client/            Next.js app (App Router, src/)
│  ├─ src/app/(site)  Public pages: home, shop, product, store, cart, plus, login, signup, account, create-store, privacy
│  ├─ src/app/seller  Seller dashboard (dashboard, add product, manage products, orders)
│  ├─ src/app/admin   Admin panel (dashboard, stores, approve stores, coupons)
│  ├─ src/components  Reusable UI (ui/, layout/, product/, dashboard/, three/, motion/, providers/)
│  └─ src/lib         API client, config, types, helpers
└─ server/            Express API
   ├─ src/models      User, Store, Product, Order, Review, Coupon, Subscriber
   ├─ src/routes      auth, users, products, orders, plans, stores, seller, admin, newsletter
   ├─ src/middleware  auth/roles, security (CSRF origin check, rate limits), uploads, errors
   ├─ src/scripts     seed.ts
   └─ tests/          API + security tests
```

## Run it

Requirements: Node 20+, MongoDB running locally (or an Atlas connection string).

```bash
npm install          # once, from the project root
npm run seed         # admin account, "Happy Shop" store, 12 products, coupons
npm run dev          # API on :5000 and website on http://localhost:3000
```

Admin login: the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values in `server/.env` (the admin also owns the demo store,
so it can open `/seller` too).

Other scripts: `npm test` (API tests, uses a separate `shopfussion_test` DB), `npm run typecheck`, `npm run build`.
Start the API before `npm run build` so the home page and sitemap are pre-rendered with products.

## Features

- Email/password sign-up & login (bcrypt, httpOnly JWT cookie, lockout after 5 failed attempts, "sign out everywhere")
- Google login — set `GOOGLE_CLIENT_ID` in `server/.env` (button is hidden until then)
- Free plan, **7-day free trial** (no card, once per account, expires automatically)
- **Plus via Stripe Checkout** ($7/month or $60/year, auto-renew). Plus is activated only after Stripe confirms the
  payment; "Turn off auto-renew" and a Stripe billing portal (card, invoices) are on the Plus page.

### Stripe setup (payments)

1. Create a free account at stripe.com and open **Developers → API keys** in *Test mode*.
2. Put the **Secret key** (`sk_test_...`) in `server/.env` as `STRIPE_SECRET_KEY`, then restart `npm run dev`.
3. Test card: `4242 4242 4242 4242`, any future date, any CVC.
4. Renewals/cancellations from Stripe need the webhook. Locally:
   `stripe listen --forward-to localhost:5000/api/payments/webhook` and copy the `whsec_...` it prints into
   `STRIPE_WEBHOOK_SECRET`. In production add the endpoint `https://<your-api>/api/payments/webhook` in the Stripe
   Dashboard (events: checkout.session.completed, customer.subscription.*, invoice.paid).
   The first activation also works without the webhook (the success page asks the server to verify the session).
- Cart (guest + logged in), saved addresses, coupons (new-user / member-only rules), cash on delivery, cancel order
- Reviews (only for products you ordered), multi-vendor stores with admin approval
- Seller: stats, image upload (verified JPG/PNG/WEBP, 2 MB), stock toggle, order status
- Admin: revenue/orders chart, activate/deactivate stores, approve/reject, coupons

## SEO

Per-page titles/descriptions/canonicals, Open Graph + Twitter cards, JSON-LD (Organization, WebSite search,
Product with price/rating, Breadcrumbs), `sitemap.xml` with every product, `robots.txt`, web manifest,
server-rendered product/shop/store pages, `noindex` on private pages, self-hosted fonts (Inter + Plus Jakarta Sans).

## Security

Helmet + strict CSP and security headers, CSRF origin check + SameSite cookies, rate limiting, zod validation on every
input, `$`-key stripping (NoSQL injection), server-side price/coupon calculation, owner-scoped queries (IDOR),
role checks (user/seller/admin), magic-byte image checks, generic auth errors, secrets only in `.env`.
Not done yet: real payments (needs Stripe + webhook verification), email verification / password reset emails,
HTTPS + production deployment.
