import type { ZodTypeAny, z } from 'zod';
import { AppError } from './AppError.js';

/** Parses untrusted input with a zod schema; throws a 400 with per-field messages. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const fields = r.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const first = Object.values(fields).flat()[0] ?? r.error.issues[0]?.message ?? 'Invalid input.';
    throw new AppError(400, first, fields);
  }
  return r.data;
}
