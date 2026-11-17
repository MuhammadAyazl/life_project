import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiLimiter, originCheck, stripDangerousKeys } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { serveUpload } from './middleware/upload.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import planRoutes from './routes/plan.routes.js';
import storeRoutes from './routes/store.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import adminRoutes from './routes/admin.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';
import paymentRoutes from './routes/payment.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // correct client IPs for rate limiting behind Next.js / Vercel's proxy
  app.set('trust proxy', env.isProd ? true : 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.allowedOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(compression());
  // Stripe webhook needs the raw body for signature checks, so it is mounted before the JSON parser.
  app.use('/api/payments', paymentRoutes);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Uploaded images (stored in MongoDB GridFS): served with nosniff + no script execution.
  app.get('/uploads/:name', serveUpload);

  // Friendly landing for anyone who opens the API port in a browser.
  app.get('/', (_req, res) =>
    res.json({ name: 'ShopFussion API', status: 'running', website: env.allowedOrigins[0], health: '/api/health' }),
  );
  app.get('/api/health',(_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use('/api', apiLimiter, originCheck, stripDangerousKeys);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/stores', storeRoutes);
  app.use('/api/seller', sellerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/newsletter', newsletterRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
