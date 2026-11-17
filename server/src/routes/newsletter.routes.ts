import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { Subscriber } from '../models/Subscriber.js';
import { parse } from '../utils/validate.js';
import { env } from '../config/env.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, skip: () => env.isTest });

router.post('/', limiter, async (req, res) => {
  const { email } = parse(
    z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120) }),
    req.body,
  );
  // upsert = idempotent, and the response never reveals whether the email was already subscribed
  await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
  res.status(201).json({ message: 'Thanks for subscribing!' });
});

export default router;
