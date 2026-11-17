/**
 * Seeds the database with the admin account, the "Happy Shop" demo store,
 * the 12 original ShopFussion products and the original coupons.
 * Safe to run many times (everything is upserted). Run: npm run seed
 */
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
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

async function seed() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 10) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) in server/.env first.');
  }
  await connectDB();

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
  await disconnectDB();
}

seed().catch(async (e) => {
  console.error(e);
  await disconnectDB();
  process.exit(1);
});
