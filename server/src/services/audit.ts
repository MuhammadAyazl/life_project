import type { Request } from 'express';
import type { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import type { UserDoc } from '../models/User.js';

/**
 * Records one audit event. Fire-and-forget: a logging failure must never break the request,
 * so errors are only printed to the server log.
 */
export function audit(
  req: Request,
  action: string,
  opts: { actor?: UserDoc | null; targetId?: string | Types.ObjectId; meta?: Record<string, unknown> } = {},
) {
  const actor = opts.actor ?? req.user ?? null;
  AuditLog.create({
    action,
    actor: actor?._id ?? null,
    actorEmail: actor?.email ?? '',
    actorRole: actor?.role ?? '',
    targetId: opts.targetId ? String(opts.targetId) : '',
    meta: opts.meta ?? {},
    ip: req.ip ?? '',
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 200),
  }).catch((err) => console.error('[audit] could not write log:', err instanceof Error ? err.message : err));
}
