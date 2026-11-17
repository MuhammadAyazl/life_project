import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

// Express recognises error handlers by their 4 arguments.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Please check the highlighted fields.', details: err.flatten().fieldErrors });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Image is larger than 2 MB.' : err.message });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(404).json({ message: 'Not found.' });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: 'Invalid data.', details: Object.keys(err.errors) });
  }
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    const field = Object.keys((err as { keyValue?: object }).keyValue ?? {})[0] ?? 'value';
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }
  // Errors from the Stripe SDK (bad key, missing permission, card declined...) - safe, readable message.
  const stripeType = typeof err === 'object' && err ? (err as { type?: string }).type : undefined;
  if (stripeType?.startsWith('Stripe')) {
    console.error(`[stripe] ${stripeType}: ${(err as Error).message}`);
    const msg =
      stripeType === 'StripeAuthenticationError'
        ? 'Stripe rejected the API key. Check STRIPE_SECRET_KEY in server/.env.'
        : stripeType === 'StripePermissionError'
          ? 'This Stripe key does not have permission for payments. Use the Secret key (sk_test_...).'
          : stripeType === 'StripeConnectionError'
            ? 'Could not reach Stripe. Check your internet connection.'
            : `Payment error: ${(err as Error).message}`;
    return res.status(502).json({ message: msg });
  }
  if (stripeType === 'entity.too.large') {
    return res.status(413).json({ message: 'Request is too large.' });
  }
  // Unknown error: log it on the server, never leak internals to the client.
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.', ...(env.isProd ? {} : { debug: String(err) }) });
}
