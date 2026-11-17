/**
 * API + security tests. Runs against a separate database (shopfussion_test) that is wiped first.
 * Run: npm test  (from /server, MongoDB must be running)
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = (process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/shopfussion').replace(/\/[^/?]+(\?|$)/, '/shopfussion_test$1');

const { default: request } = await import('supertest');
const { default: mongoose } = await import('mongoose');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const { Store } = await import('../src/models/Store.js');
const { Product } = await import('../src/models/Product.js');
const { Coupon } = await import('../src/models/Coupon.js');

const app = createApp();
const ORIGIN = (process.env.CLIENT_URL ?? 'http://localhost:3000').split(',')[0];
let productId = '';

/** A logged-in "browser" that keeps its own cookie jar. */
async function signup(email: string) {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/signup').set('Origin', ORIGIN).send({ email, password: 'Secret123!' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return agent;
}

before(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  const owner = await User.create({ email: 'owner@test.dev', role: 'seller' });
  const store = await Store.create({
    owner: owner._id,
    name: 'Test Store',
    username: 'teststore',
    description: 'A store used only by the automated tests.',
    address: '1 Test Street',
    email: 'store@test.dev',
    phone: '+1 555 0100',
    status: 'approved',
  });
  const p = await Product.create({
    store: store._id,
    name: 'Test Earbuds',
    slug: 'test-earbuds',
    description: 'Earbuds for testing purposes.',
    mrp: 100,
    price: 80,
    category: 'Earbuds',
  });
  productId = String(p._id);
  await Coupon.create({ code: 'PLUS10', description: 'Members', discount: 10, expiresAt: new Date('2099-01-01'), forMember: true });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
});

describe('auth', () => {
  it('signs up, sets an httpOnly cookie and returns no password', async () => {
    const r = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!' });
    assert.equal(r.status, 201);
    assert.match(String(r.headers['set-cookie']), /sf_token=.*HttpOnly/i);
    assert.equal(r.body.user.password, undefined);
    assert.equal(r.body.user.role, 'user');
  });

  it('rejects weak passwords', async () => {
    const r = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'weak@test.dev', password: 'short' });
    assert.equal(r.status, 400);
  });

  it('rejects duplicate emails', async () => {
    const r = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!' });
    assert.equal(r.status, 409);
  });

  it('gives the same message for wrong password and unknown email', async () => {
    const a = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Wrong1234' });
    const b = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'nobody@test.dev', password: 'Wrong1234' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.body.message, b.body.message);
  });

  it('blocks NoSQL operator injection in login', async () => {
    const r = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(r.status, 400);
  });

  it('rejects state-changing requests from a foreign origin (CSRF)', async () => {
    const r = await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email: 'a@test.dev', password: 'Secret123!' });
    assert.equal(r.status, 403);
  });

  it('"remember me" keeps a 30-day cookie; unchecked gives a browser-session cookie', async () => {
    const yes = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!', remember: true });
    assert.match(String(yes.headers['set-cookie']), /Max-Age=2592000/);
    const no = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!', remember: false });
    assert.equal(no.status, 200);
    assert.doesNotMatch(String(no.headers['set-cookie']), /Max-Age|Expires/);
  });

  it('renews the session cookie for active users after a day', async () => {
    const { signToken } = await import('../src/utils/token.js');
    const { default: jwt } = await import('jsonwebtoken');
    const u = await User.findOne({ email: 'a@test.dev' });
    const fresh = signToken(String(u!._id), u!.tokenVersion, true);
    const old = jwt.sign({ ...(jwt.decode(fresh) as object), iat: Math.floor(Date.now() / 1000) - 2 * 86400 }, process.env.JWT_SECRET!);
    const r = await request(app).get('/api/auth/me').set('Cookie', `sf_token=${old}`);
    assert.equal(r.body.user.email, 'a@test.dev');
    assert.match(String(r.headers['set-cookie']), /sf_token=.*Max-Age=2592000/);
  });

  it('logout clears the session', async () => {
    const agent = await signup('logout@test.dev');
    assert.ok((await agent.get('/api/auth/me')).body.user);
    await agent.post('/api/auth/logout').set('Origin', ORIGIN);
    assert.equal((await agent.get('/api/auth/me')).body.user, null);
  });
});

describe('profile photo (DP)', () => {
  // 1x1 transparent PNG
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

  it('uploads a real image, shows it on /me, then removes it', async () => {
    const agent = await signup('dp@test.dev');
    const up = await agent.post('/api/users/me/avatar').set('Origin', ORIGIN).attach('avatar', PNG, { filename: 'me.png', contentType: 'image/png' });
    assert.equal(up.status, 200, JSON.stringify(up.body));
    assert.match(up.body.user.avatar, /^\/uploads\/[a-f0-9-]{36}\.png$/);
    assert.equal((await agent.get('/api/auth/me')).body.user.avatar, up.body.user.avatar);
    assert.equal((await request(app).get(up.body.user.avatar)).status, 200);

    const del = await agent.delete('/api/users/me/avatar').set('Origin', ORIGIN);
    assert.equal(del.body.user.avatar, '');
    assert.equal((await request(app).get(up.body.user.avatar)).status, 404, 'old file is deleted from disk');
  });

  it('rejects a non-image disguised as a PNG', async () => {
    const agent = await signup('fakedp@test.dev');
    const r = await agent
      .post('/api/users/me/avatar')
      .set('Origin', ORIGIN)
      .attach('avatar', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' });
    assert.equal(r.status, 400);
  });

  it('requires login', async () => {
    const r = await request(app).post('/api/users/me/avatar').set('Origin', ORIGIN).attach('avatar', PNG, 'me.png');
    assert.equal(r.status, 401);
  });
});

describe('plans (free trial)', () => {
  it('starts a 7-day trial exactly once', async () => {
    const agent = await signup('trial@test.dev');
    const r1 = await agent.post('/api/plans/trial').set('Origin', ORIGIN);
    assert.equal(r1.status, 200);
    assert.equal(r1.body.user.plan.tier, 'trial');
    assert.equal(r1.body.user.plan.daysLeft, 7);
    const r2 = await agent.post('/api/plans/trial').set('Origin', ORIGIN);
    assert.equal(r2.status, 400);
  });

  it('requires login', async () => {
    const r = await request(app).post('/api/plans/trial').set('Origin', ORIGIN);
    assert.equal(r.status, 401);
  });
});

describe('plus payments (Stripe)', () => {
  it('has no way to become Plus without paying', async () => {
    const agent = await signup('freeloader@test.dev');
    const r = await agent.post('/api/plans/subscribe').set('Origin', ORIGIN).send({ billing: 'monthly' });
    assert.equal(r.status, 404, 'the old free "subscribe" route must not exist');
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.user.plan.tier, 'free');
  });

  it('checkout needs login and a valid billing option', async () => {
    assert.equal((await request(app).post('/api/plans/checkout').set('Origin', ORIGIN).send({ billing: 'monthly' })).status, 401);
    const agent = await signup('billing@test.dev');
    assert.equal((await agent.post('/api/plans/checkout').set('Origin', ORIGIN).send({ billing: 'weekly' })).status, 400);
  });

  it('rejects confirm calls with a fake session id', async () => {
    const agent = await signup('faker@test.dev');
    const r = await agent.post('/api/plans/checkout/confirm').set('Origin', ORIGIN).send({ sessionId: 'not-a-session' });
    assert.equal(r.status, 400);
  });

  it('rejects unsigned / forged webhooks', async () => {
    const r = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=forged')
      .send(JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } }));
    assert.ok([400, 503].includes(r.status), `got ${r.status}`);
  });
});

describe('orders', () => {
  it('computes prices on the server and enforces member-only coupons', async () => {
    const agent = await signup('buyer@test.dev');
    const addr = await agent.post('/api/users/me/addresses').set('Origin', ORIGIN).send({
      name: 'Buyer',
      email: 'buyer@test.dev',
      street: '1 Main St',
      city: 'Dubai',
      state: 'Dubai',
      zip: '00000',
      country: 'UAE',
      phone: '+971 50 000 0000',
    });
    assert.equal(addr.status, 201);
    const addressId = addr.body.address._id;

    const noMember = await agent
      .post('/api/orders')
      .set('Origin', ORIGIN)
      .send({ items: [{ productId, qty: 2, price: 1 }], addressId, couponCode: 'PLUS10' });
    assert.equal(noMember.status, 400, 'member coupon must be refused for free users');

    await agent.post('/api/plans/trial').set('Origin', ORIGIN);
    const ok = await agent
      .post('/api/orders')
      .set('Origin', ORIGIN)
      .send({ items: [{ productId, qty: 2, price: 1 }], addressId, couponCode: 'PLUS10' });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.total, 144, '2 x $80 - 10% = $144 (the "price: 1" sent by the client is ignored)');
  });

  it('never shows one user’s order to another user (IDOR)', async () => {
    const owner = request.agent(app);
    await owner.post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'buyer@test.dev', password: 'Secret123!' });
    const mine = await owner.get('/api/orders/mine');
    const orderId = mine.body.orders[0].id;
    assert.equal((await owner.get(`/api/orders/${orderId}`)).status, 200);

    const stranger = await signup('stranger@test.dev');
    assert.equal((await stranger.get(`/api/orders/${orderId}`)).status, 404);
    assert.equal((await stranger.post(`/api/orders/${orderId}/cancel`).set('Origin', ORIGIN)).status, 404);
  });
});

describe('role protection', () => {
  it('blocks normal users from seller routes', async () => {
    const agent = await signup('notseller@test.dev');
    assert.equal((await agent.get('/api/seller/products')).status, 403);
  });

  it('blocks normal users from admin routes', async () => {
    const agent = await signup('notadmin@test.dev');
    assert.equal((await agent.get('/api/admin/dashboard')).status, 403);
    assert.equal((await agent.post('/api/admin/coupons').set('Origin', ORIGIN).send({})).status, 403);
  });

  it('blocks anonymous users everywhere private', async () => {
    for (const path of ['/api/orders/mine', '/api/seller/dashboard', '/api/admin/stores', '/api/users/me/addresses']) {
      const r = path.endsWith('addresses') ? await request(app).post(path).set('Origin', ORIGIN) : await request(app).get(path);
      assert.equal(r.status, 401, path);
    }
  });
});

describe('catalog', () => {
  it('lists products and finds one by slug', async () => {
    const list = await request(app).get('/api/products?category=Earbuds');
    assert.equal(list.status, 200);
    assert.equal(list.body.total, 1);
    const one = await request(app).get('/api/products/test-earbuds');
    assert.equal(one.status, 200);
    assert.equal(one.body.product.price, 80);
  });

  it('hides demo products once a real product exists', async () => {
    const real = await Product.findOne({ slug: 'test-earbuds' });
    await Product.create({
      store: real!.store,
      name: 'Demo Speaker',
      slug: 'demo-speaker',
      description: 'A seeded sample product.',
      mrp: 50,
      price: 40,
      category: 'Speakers',
      isDemo: true,
    });
    // a real product exists -> demo is hidden everywhere
    assert.equal((await request(app).get('/api/products?category=Speakers')).body.total, 0);
    assert.equal((await request(app).get('/api/products/demo-speaker')).status, 404);

    // no real products -> demo items are shown so the shop is never empty
    await Product.updateOne({ _id: real!._id }, { isDemo: true });
    assert.equal((await request(app).get('/api/products?category=Speakers')).body.total, 1);
    await Product.updateOne({ _id: real!._id }, { isDemo: false });
    await Product.deleteOne({ slug: 'demo-speaker' });
  });

  it('AI search understands budget + "best" (smart mode without an API key)', async () => {
    const real = await Product.findOne({ slug: 'test-earbuds' });
    await Product.create([
      { store: real!.store, name: 'Xiaomi Buds Lite', slug: 'xiaomi-buds-lite', description: 'Xiaomi bluetooth earbuds.', mrp: 40, price: 30, category: 'Earbuds', rating: 4.2, numReviews: 80 },
      { store: real!.store, name: 'Xiaomi Buds Pro', slug: 'xiaomi-buds-pro', description: 'Xiaomi bluetooth earbuds with ANC.', mrp: 60, price: 45, category: 'Earbuds', rating: 4.8, numReviews: 150 },
      { store: real!.store, name: 'Xiaomi Buds Max', slug: 'xiaomi-buds-max', description: 'Premium Xiaomi earbuds.', mrp: 120, price: 99, category: 'Earbuds', rating: 4.9, numReviews: 300 },
    ]);
    const r = await request(app)
      .post('/api/products/ai-search')
      .set('Origin', ORIGIN)
      .send({ q: 'best xiaomi bluetooth earbuds under $50' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const names = r.body.results.map((x: { product: { name: string } }) => x.product.name);
    assert.equal(names[0], 'Xiaomi Buds Pro', 'best rated within budget comes first');
    assert.ok(!names.includes('Xiaomi Buds Max'), 'over-budget product excluded');
    assert.ok(r.body.results.every((x: { reason: string }) => x.reason.length > 0));

    const cheap = await request(app).post('/api/products/ai-search').set('Origin', ORIGIN).send({ q: 'sasta xiaomi earbuds' });
    assert.equal(cheap.body.results[0].product.name, 'Xiaomi Buds Lite');
    await Product.deleteMany({ slug: /^xiaomi-buds/ });
  });

  it('AI search validates the query', async () => {
    const r = await request(app).post('/api/products/ai-search').set('Origin', ORIGIN).send({ q: '' });
    assert.equal(r.status, 400);
  });

  it('returns 404 for unknown products and bad ids', async () => {
    assert.equal((await request(app).get('/api/products/does-not-exist')).status, 404);
    assert.equal((await request(app).get('/api/stores/nope')).status, 404);
  });
});
