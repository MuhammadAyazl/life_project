import { Schema, model } from 'mongoose';

/**
 * One document per signed-in device. The JWT carries its id (`sid`), and every request checks
 * that the session still exists - so signing out really ends it on the server (ASVS V3.3.1),
 * even if someone had copied the cookie. Expired sessions are removed automatically (TTL).
 */
const sessionSchema = new Schema(
  {
    _id: { type: String, required: true }, // random session id
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);

export const Session = model('Session', sessionSchema);
