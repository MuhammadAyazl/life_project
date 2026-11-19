/**
 * Demo data: admin account, the "Happy Shop" store, 12 sample products (flagged isDemo) and coupons.
 * Idempotent - safe to run many times. Used by `npm run seed` and by the first boot of an empty
 * production database (bootstrapIfEmpty).
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { unlockAccount } from './loginGuard.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Store } from '../models/Store.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { slugify } from '../utils/helpers.js';

const PRODUCTS = [
  ['Smart Home Cleaner', 229, 299, 'Home & Kitchen', 'cleaner', 'A smart robot cleaner that vacuums and mops in one pass. App control, scheduled cleaning and automatic return to its dock when the battery runs low.'],
  ['Ergonomic Mouse', 99, 129, 'Mouse', 'mouse', 'A comfortable, contoured wireless mouse built for long work days. Silent clicks, a precise sensor and weeks of battery life on a single charge.'],
  ['Apple Smart Watch', 199, 249, 'Watch', 'watch', 'Track workouts, heart rate and sleep, and get calls and messages on your wrist. Bright always-on display and water resistant design.'],
  ['Apple Wireless Earbuds', 89, 119, 'Earbuds', 'earbuds', 'Compact true wireless earbuds with clear sound, quick pairing and a pocket-size charging case that gives you all-day listening.'],
  ['Wireless Headphones', 129, 169, 'Headphones', 'headphones', 'Over-ear wireless headphones with deep bass, soft cushions and up to 30 hours of playback. Foldable for easy travel.'],
  ['Bluetooth Speaker', 79, 99, 'Speakers', 'speaker', 'Portable speaker with loud, balanced sound and a splash resistant body. Pairs in seconds and plays for hours.'],
  ['Fitness Watch', 149, 189, 'Watch', 'watch', 'Lightweight fitness watch with step counting, built-in GPS and more than 20 sport modes. Battery lasts up to a week.'],
  ['Pro Earbuds', 119, 149, 'Earbuds', 'earbuds', 'Earbuds with active noise cancelling, a transparency mode and a secure fit for workouts, commutes and calls.'],
  ['Gaming Mouse', 59, 79, 'Mouse', 'mouse', 'Fast, accurate gaming mouse with adjustable DPI, programmable buttons and a durable braided cable.'],
  ['Smart LED Lamp', 49, 65, 'Decoration', 'decor', 'A warm, dimmable LED lamp you can control from your phone. Adds a soft glow to any desk, shelf or bedside.'],
  ['Studio Speaker', 169, 219, 'Speakers', 'speaker', 'Room-filling studio speaker with rich mids and tight bass. Connect over Bluetooth or the audio input.'],
  ['Kids Headphones', 39, 55, 'Headphones', 'headphones', 'Safe, volume-limited headphones for children. Soft padding, tough build and a cable-free design.'],
] as const;

const COUPONS = [
  ['NEW20', '20% Off for New Users', 20, true, false],
  ['NEW10', '10% Off for New Users', 10, true, false],
  ['OFF20', '20% Off for All Users', 20, false, false],
  ['OFF10', '10% Off for All Users', 10, false, false],
  ['WELCOME20', '20% Off welcome offer', 20, false, false],
  ['PLUS10', '10% Off for Members', 10, false, true],
] as const;

export async function seedDatabase() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 10) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) first.');
  }
  let admin = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    admin = await User.create({
      email: env.ADMIN_EMAIL.toLowerCase(),
      firstName: 'Admin',
      password: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
      role: 'admin',
    });
    console.log(`Admin created: ${admin.email}`);
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
  }

  const store = await Store.findOneAndUpdate(
    { username: 'happyshop' },
    {
      $setOnInsert: {
        owner: admin._id,
        name: 'Happy Shop',
        username: 'happyshop',
        description:
          'At Happy Shop, we believe shopping should be simple, smart, and satisfying. Electronics, home essentials and lifestyle products, all under one digital roof.',
        address: '3rd Floor, New Building, 123 Street, C Sector, New York, US',
        email: 'happyshop@example.com',
        phone: '+1 000 000 0000',
        status: 'approved',
        isActive: true,
      },
    },
    { upsert: true, new: true },
  );

  for (const [i, [name, price, mrp, category, art, description]] of PRODUCTS.entries()) {
    await Product.updateOne(
      { slug: slugify(name) },
      {
        $setOnInsert: {
          store: store!._id,
          name,
          slug: slugify(name),
          price,
          mrp,
          category,
          art,
          description,
          isDemo: true,
          rating: i % 3 === 0 ? 5 : 4,
          sold: 12 - i,
          createdAt: new Date(Date.now() - i * 3600_000),
        },
      },
      { upsert: true },
    );
  }

  // older databases: make sure the sample products are flagged as demo
  await Product.updateMany({ slug: { $in: PRODUCTS.map(([n]) => slugify(n)) } }, { isDemo: true });

  for (const [code, description, discount, forNewUser, forMember] of COUPONS) {
    await Coupon.updateOne(
      { code },
      { $setOnInsert: { code, description, discount, forNewUser, forMember, expiresAt: new Date('2027-12-31') } },
      { upsert: true },
    );
  }

  console.log(`Seeded: store "${store!.name}", ${PRODUCTS.length} products, ${COUPONS.length} coupons.`);
}

/** First boot of a brand-new database: create the admin + demo store once, then never again. */
export async function bootstrapIfEmpty() {
  if (await User.exists({ role: 'admin' })) return false;
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 10) {
    console.warn('Empty database but ADMIN_EMAIL / ADMIN_PASSWORD are not set - skipping bootstrap.');
    return false;
  }
  await seedDatabase();
  return true;
}

/**
 * One-time admin reset, driven by env vars (used when the live admin is locked out or its login
 * should change). When ADMIN_RESET is set to a new value, the next server start:
 *   - makes the account with ADMIN_EMAIL the admin (the existing admin's email is changed to it,
 *     or an existing account with that email is promoted),
 *   - sets its password to ADMIN_PASSWORD, clears any lockout and signs out its old sessions.
 * The applied value is remembered in the database, so it runs once per new ADMIN_RESET value.
 */
export async function applyAdminResetIfRequested() {
  const version = env.ADMIN_RESET?.trim();
  if (!version || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 10) return false;

  const settings = mongoose.connection.collection<{ _id: string; version: string }>('settings');
  if ((await settings.findOne({ _id: 'adminReset' }))?.version === version) return false;

  const email = env.ADMIN_EMAIL.toLowerCase();
  const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const unlock = {
    password: hash,
    failedLogins: 0,
    lockUntil: null,
    role: 'admin' as const,
    // lost phone? the reset also turns 2FA off so the owner can get back in
    twoFactor: { enabled: false, secretEnc: null, pendingSecretEnc: null, recoveryHashes: [], lastStep: 0 },
  };

  const owner = await User.findOne({ email });
  if (owner) {
    owner.set(unlock);
    owner.tokenVersion += 1;
    await owner.save();
  } else {
    const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    if (admin) {
      admin.set({ ...unlock, email });
      admin.tokenVersion += 1;
      await admin.save();
    } else {
      await User.create({ ...unlock, email, firstName: 'Admin' });
    }
  }
  await unlockAccount(email);
  await settings.updateOne({ _id: 'adminReset' }, { $set: { version } }, { upsert: true });
  console.log(`Admin reset applied for ${email}.`);
  return true;
}
