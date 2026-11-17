// Vercel entry point: every request to the API project is handled by the Express app.
// The TypeScript is compiled to dist/ by `npm run build` before Vercel bundles this file.
import { createApp } from '../dist/app.js';
import { connectDB } from '../dist/config/db.js';

const app = createApp();
let ready = null; // reuse one MongoDB connection across warm invocations

export default async function handler(req, res) {
  try {
    ready ??= connectDB();
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
