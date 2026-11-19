import { Schema, model } from 'mongoose';

/**
 * Security / admin activity trail: who did what, when, from where.
 * Kept for 180 days, then deleted automatically (TTL index) to limit stored personal data.
 */
const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true }, // e.g. "admin.store.approve", "auth.lockout"
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    targetId: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: { expires: 60 * 60 * 24 * 180 } },
  },
  { versionKey: false },
);

export const AuditLog = model('AuditLog', auditLogSchema);
