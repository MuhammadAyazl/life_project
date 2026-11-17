/**
 * Sets the admin account's password to ADMIN_PASSWORD from server/.env and signs out all its sessions.
 * Run after changing ADMIN_PASSWORD:  npm run admin:password -w server
 */
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 10) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) in server/.env first.');
  }
  await connectDB();
  const r = await User.updateOne(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    { password: await bcrypt.hash(env.ADMIN_PASSWORD, 12), $inc: { tokenVersion: 1 }, failedLogins: 0, lockUntil: null },
  );
  console.log(r.matchedCount ? `Admin password updated for ${env.ADMIN_EMAIL}.` : 'Admin not found - run npm run seed.');
  await disconnectDB();
}

main().catch(async (e) => {
  console.error(e);
  await disconnectDB();
  process.exit(1);
});
