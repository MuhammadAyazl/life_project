import { Types } from 'mongoose';
import { notFound } from './AppError.js';

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Validates a route param is an ObjectId; 404 (not 500) on garbage input. */
export function objectId(id: unknown, what = 'Item') {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) throw notFound(`${what} not found.`);
  return new Types.ObjectId(id);
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
