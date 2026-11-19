/**
 * API + security tests. Runs against a separate database (shopfussion_test) that is wiped first.
 * Run: npm test  (from /server, MongoDB must be running)
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = ''; // tests never talk to Stripe
process.env.MONGODB_URI = (process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/shopfussion').replace(/\/[^/?]+(\?|$)/, '/shopfussion_test$1');

const { default: request } = await import('supertest');
const { default: mongoose } = await import('mongoose');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const { Store } = await import('../src/models/Store.js');
const { Product } = await import('../src/models/Product.js');
const { Coupon } = await import('../src/models/Coupon.js');
const { Order } = await import('../src/models/Order.js');
const { markOrdersPaid, cancelUnpaidOrders } = await import('../src/services/orderPayments.js');

const app = createApp();
const ORIGIN = (process.env.CLIENT_URL ?? 'http://localhost:3000').split(',')[0];
let productId = '';

/** A logged-in "browser" that keeps its own cookie jar. */
async function signup(email: string) {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/signup').set('Origin', ORIGIN).send({ email, password: 'Secret123!xyz' });
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
    const r = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!xyz' });
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
    const r = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!xyz' });
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
    const r = await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email: 'a@test.dev', password: 'Secret123!xyz' });
    assert.equal(r.status, 403);
  });

  it('"remember me" keeps a 30-day cookie; unchecked gives a browser-session cookie', async () => {
    const yes = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!xyz', remember: true });
    assert.match(String(yes.headers['set-cookie']), /Max-Age=2592000/);
    const no = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@test.dev', password: 'Secret123!xyz', remember: false });
    assert.equal(no.status, 200);
    assert.doesNotMatch(String(no.headers['set-cookie']), /Max-Age|Expires/);
  });

  it('renews the session cookie for active users after a day', async () => {
    const { signToken } = await import('../src/utils/token.js');
    const { default: jwt } = await import('jsonwebtoken');
    const { Session } = await import('../src/models/Session.js');
    const u = await User.findOne({ email: 'a@test.dev' });
    await Session.create({ _id: 'renew-test-session', user: u!._id, expiresAt: new Date(Date.now() + 86400_000) });
    const fresh = signToken(String(u!._id), u!.tokenVersion, true, 'renew-test-session');
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

describe('ASVS L1 fixes', () => {
  it('V2.1.1 / V2.1.9: 12+ characters required, no "must contain a number" rule', async () => {
    const short = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'short@test.dev', password: 'abcdefghij1' });
    assert.equal(short.status, 400, '11 characters is too short');
    const phrase = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'phrase@test.dev', password: 'purple monkey dishwasher' });
    assert.equal(phrase.status, 201, 'a long passphrase without numbers is fine');
  });

  it('V2.1.7: well-known breached passwords are refused', async () => {
    const r = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'breached@test.dev', password: '123456789012' });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /breach/i);
  });

  it('V3.3.1: logout ends the session on the server - a copied cookie stops working', async () => {
    const login = await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'copycat@test.dev', password: 'Secret123!xyz' });
    const stolen = String(login.headers['set-cookie']).split(';')[0]; // what an attacker might have copied
    assert.ok((await request(app).get('/api/auth/me').set('Cookie', stolen)).body.user, 'works before logout');
    await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', stolen);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie', stolen)).body.user, null, 'dead after logout');
  });

  it('changing the password keeps this device signed in and signs out the others', async () => {
    await request(app).post('/api/auth/signup').set('Origin', ORIGIN).send({ email: 'twodevices@test.dev', password: 'Secret123!xyz' });
    const phone = request.agent(app);
    const laptop = request.agent(app);
    await phone.post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'twodevices@test.dev', password: 'Secret123!xyz' });
    await laptop.post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'twodevices@test.dev', password: 'Secret123!xyz' });
    const ch = await phone.post('/api/users/me/password').set('Origin', ORIGIN).send({ currentPassword: 'Secret123!xyz', newPassword: 'A whole new passphrase 2' });
    assert.equal(ch.status, 200, JSON.stringify(ch.body));
    assert.ok((await phone.get('/api/auth/me')).body.user, 'this device stays in');
    assert.equal((await laptop.get('/api/auth/me')).body.user, null, 'other device signed out');
  });
});

describe('security hardening', () => {
  it('locks only the guessing IP+account, not the real owner, and logs it', async () => {
    await signup('victim@test.dev');
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').set('Origin', ORIGIN).set('X-Forwarded-For', '203.0.113.9').send({ email: 'victim@test.dev', password: 'Wrong1234' });
    }
    // the guessing IP is now locked out of this account, even with the right password
    const attacker = await request(app)
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', '203.0.113.9')
      .send({ email: 'victim@test.dev', password: 'Secret123!xyz' });
    assert.equal(attacker.status, 429);
    const { AuditLog } = await import('../src/models/AuditLog.js');
    assert.ok(await AuditLog.exists({ action: 'auth.lockout' }), 'lockout is audited');
    // ...but the real owner on another IP can still sign in
    const owner = await request(app)
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', '198.51.100.7')
      .send({ email: 'victim@test.dev', password: 'Secret123!xyz' });
    assert.equal(owner.status, 200, 'account itself is not locked');
  });

  it('password reset: generic answer, one-time link, old sessions signed out', async () => {
    const agent = await signup('forgetful@test.dev');
    const unknown = await request(app).post('/api/auth/forgot').set('Origin', ORIGIN).send({ email: 'nobody-here@test.dev' });
    const known = await request(app).post('/api/auth/forgot').set('Origin', ORIGIN).send({ email: 'forgetful@test.dev' });
    assert.equal(unknown.body.message, known.body.message, 'does not reveal which emails exist');

    const crypto = await import('node:crypto');
    const token = 'test-reset-token-1234567890abcdef';
    await User.updateOne(
      { email: 'forgetful@test.dev' },
      { resetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), resetTokenExpires: new Date(Date.now() + 60_000) },
    );
    const weak = await request(app).post('/api/auth/reset').set('Origin', ORIGIN).send({ token, password: 'short' });
    assert.equal(weak.status, 400);
    const ok = await request(app).post('/api/auth/reset').set('Origin', ORIGIN).send({ token, password: 'BrandNew123-pass' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal((await request(app).post('/api/auth/reset').set('Origin', ORIGIN).send({ token, password: 'Another123-pass' })).status, 400, 'link works once');
    assert.equal((await agent.get('/api/auth/me')).body.user, null, 'old session signed out');
    const login = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'forgetful@test.dev', password: 'BrandNew123-pass' });
    assert.equal(login.status, 200);
  });

  it('2FA: setup, enable, login needs a code, codes cannot be replayed, recovery code works once', async () => {
    const { totpNow } = await import('../src/services/twoFactor.js');
    const agent = await signup('twofa@test.dev');
    const setup = await agent.post('/api/users/me/2fa/setup').set('Origin', ORIGIN);
    assert.equal(setup.status, 200);
    assert.match(setup.body.qr, /^data:image\/png;base64,/);
    const secret: string = setup.body.secret;
    // enabling needs a code from a step before "now" so that the login code below is a fresh step
    const enable = await agent.post('/api/users/me/2fa/enable').set('Origin', ORIGIN).send({ code: totpNow(secret, Date.now() - 30_000) });
    assert.equal(enable.status, 200, JSON.stringify(enable.body));
    assert.equal(enable.body.user.twoFactorEnabled, true);
    assert.equal(enable.body.recoveryCodes.length, 8);

    const step1 = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'twofa@test.dev', password: 'Secret123!xyz' });
    assert.equal(step1.body.twoFactorRequired, true);
    assert.equal(step1.headers['set-cookie'], undefined, 'no session before the code');
    const bad = await request(app).post('/api/auth/2fa').set('Origin', ORIGIN).send({ challenge: step1.body.challenge, code: '000000' });
    assert.equal(bad.status, 401);
    const code = totpNow(secret);
    const good = await request(app).post('/api/auth/2fa').set('Origin', ORIGIN).send({ challenge: step1.body.challenge, code });
    assert.equal(good.status, 200, JSON.stringify(good.body));
    assert.match(String(good.headers['set-cookie']), /sf_token=/);
    const replay = await request(app).post('/api/auth/2fa').set('Origin', ORIGIN).send({ challenge: step1.body.challenge, code });
    assert.equal(replay.status, 401, 'the same code cannot be used twice');

    const rc = enable.body.recoveryCodes[0];
    const step2 = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'twofa@test.dev', password: 'Secret123!xyz' });
    assert.equal((await request(app).post('/api/auth/2fa').set('Origin', ORIGIN).send({ challenge: step2.body.challenge, code: rc })).status, 200);
    assert.equal((await request(app).post('/api/auth/2fa').set('Origin', ORIGIN).send({ challenge: step2.body.challenge, code: rc })).status, 401, 'recovery code is one-time');
  });

  it('admins can read the audit log; others cannot', async () => {
    const agent = await signup('auditadmin@test.dev');
    await User.updateOne({ email: 'auditadmin@test.dev' }, { role: 'admin' });
    const r = await agent.get('/api/admin/audit?type=auth');
    assert.equal(r.status, 200);
    assert.ok(r.body.logs.some((l: { action: string }) => l.action === 'auth.signup'));
    const user = await signup('noaudit@test.dev');
    assert.equal((await user.get('/api/admin/audit')).status, 403);
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
    await owner.post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'buyer@test.dev', password: 'Secret123!xyz' });
    const mine = await owner.get('/api/orders/mine');
    const orderId = mine.body.orders[0].id;
    assert.equal((await owner.get(`/api/orders/${orderId}`)).status, 200);

    const stranger = await signup('stranger@test.dev');
    assert.equal((await stranger.get(`/api/orders/${orderId}`)).status, 404);
    assert.equal((await stranger.post(`/api/orders/${orderId}/cancel`).set('Origin', ORIGIN)).status, 404);
  });

  it('card orders are refused cleanly when Stripe is not configured', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'buyer@test.dev', password: 'Secret123!xyz' });
    const me = await agent.get('/api/auth/me');
    const addressId = me.body.user.addresses[0]._id;
    const before = await Order.countDocuments();
    const r = await agent.post('/api/orders').set('Origin', ORIGIN).send({ items: [{ productId, qty: 1 }], addressId, paymentMethod: 'CARD' });
    assert.equal(r.status, 503);
    assert.equal(await Order.countDocuments(), before, 'no order is created when card payment is unavailable');
  });

  it('a card payment marks its orders paid exactly once (webhook + success page race)', async () => {
    const buyer = await User.findOne({ email: 'buyer@test.dev' });
    const p = await Product.findById(productId);
    const soldBefore = p!.sold;
    const order = await Order.create({
      user: buyer!._id,
      store: p!.store,
      items: [{ product: p!._id, name: p!.name, slug: p!.slug, price: p!.price, qty: 3 }],
      subtotal: p!.price * 3,
      total: p!.price * 3,
      paymentMethod: 'CARD',
      status: 'PENDING_PAYMENT',
      stripeSessionId: 'cs_test_race',
    });
    const unpaid = { id: 'cs_test_race', mode: 'payment', payment_status: 'unpaid' } as never;
    assert.equal(await markOrdersPaid(unpaid), 0, 'an unpaid session changes nothing');

    const paid = { id: 'cs_test_race', mode: 'payment', payment_status: 'paid' } as never;
    const [a, b] = await Promise.all([markOrdersPaid(paid), markOrdersPaid(paid)]);
    assert.equal(a + b, 1);
    const fresh = await Order.findById(order._id);
    assert.equal(fresh!.status, 'ORDER_PLACED');
    assert.equal(fresh!.isPaid, true);
    assert.equal((await Product.findById(productId))!.sold, soldBefore + 3, 'sales are counted once');
    assert.equal(await cancelUnpaidOrders('cs_test_race'), 0, 'an expired event cannot cancel a paid order');
  });
});

describe('seller products', () => {
  it('offer price is optional: empty means the product sells at the actual price', async () => {
    const agent = await signup('seller2@test.dev');
    const u = await User.findOne({ email: 'seller2@test.dev' });
    await Store.create({
      owner: u!._id,
      name: 'Seller Two',
      username: 'sellertwo',
      description: 'A second store used only by automated tests.',
      address: '2 Test Street',
      email: 'two@test.dev',
      phone: '+1 555 0102',
      status: 'approved',
    });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const noOffer = await agent
      .post('/api/seller/products')
      .set('Origin', ORIGIN)
      .field('name', 'No Offer Speaker')
      .field('description', 'A speaker sold at its normal price.')
      .field('mrp', '70')
      .field('price', '')
      .field('category', 'Speakers')
      .attach('images', png, { filename: 'p.png', contentType: 'image/png' });
    assert.equal(noOffer.status, 201, JSON.stringify(noOffer.body));
    assert.equal(noOffer.body.product.price, 70);

    const higher = await agent
      .post('/api/seller/products')
      .set('Origin', ORIGIN)
      .field('name', 'Bad Offer')
      .field('description', 'Offer price above the actual price.')
      .field('mrp', '50')
      .field('price', '60')
      .field('category', 'Speakers')
      .attach('images', png, { filename: 'p.png', contentType: 'image/png' });
    assert.equal(higher.status, 400);
    await Product.deleteMany({ name: /No Offer Speaker|Bad Offer/ });
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
