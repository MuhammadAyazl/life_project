// Vercel entry point: every request to the API project is handled by the Express app.
// The TypeScript is compiled to dist/ by `npm run build` before Vercel bundles this file.
import { createApp } from '../dist/app.js';
import { connectDB } from '../dist/config/db.js';
import { applyAdminResetIfRequested, bootstrapIfEmpty } from '../dist/services/seedData.js';

const app = createApp();
let ready = null; // reuse one MongoDB connection across warm invocations

// connect once; on a brand-new empty database also create the admin + demo store (only once ever)
const start = async () => {
  await connectDB();
  if (await bootstrapIfEmpty()) console.log('Empty database: admin and demo data created.');
  await applyAdminResetIfRequested(); // one-time admin login reset (ADMIN_RESET env)
};

export default async function handler(req, res) {
  try {
    ready ??= start();
    await ready;
  } catch (err) {
    ready = null;
    console.error('MongoDB connection failed', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Database is not reachable. Check MONGODB_URI.' }));
  }
  return app(req, res);
}
