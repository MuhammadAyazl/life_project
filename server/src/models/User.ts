import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES } from '../config/constants.js';

const addressSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    street: { type: String, required: true, trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    zip: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    firstName: { type: String, trim: true, maxlength: 50, default: '' },
    lastName: { type: String, trim: true, maxlength: 50, default: '' },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
    // bcrypt hash, never returned unless explicitly selected
    password: { type: String, select: false },
    googleId: { type: String, index: true, sparse: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ROLES, default: 'user' },
    plan: {
      tier: { type: String, enum: ['free', 'trial', 'plus'], default: 'free' },
      billing: { type: String, enum: ['monthly', 'yearly', null], default: null },
      trialUsed: { type: Boolean, default: false },
      trialEndsAt: { type: Date, default: null },
      plusEndsAt: { type: Date, default: null },
      // Stripe references (no card data is ever stored here)
      stripeCustomerId: { type: String, default: null, index: true },
      stripeSubscriptionId: { type: String, default: null, index: true },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
    addresses: { type: [addressSchema], default: [] },
    // bump to invalidate every issued JWT (logout everywhere / password change)
    tokenVersion: { type: Number, default: 0 },
    // password reset: only a SHA-256 hash of the emailed token is stored, valid for 30 minutes
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpires: { type: Date, default: null, select: false },
    // two-factor sign-in (authenticator app). Secrets are AES-256-GCM encrypted at rest.
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, default: null, select: false },
      pendingSecretEnc: { type: String, default: null, select: false },
      recoveryHashes: { type: [String], default: [], select: false },
      lastStep: { type: Number, default: 0, select: false }, // a used code can't be replayed
    },
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.virtual('name').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email.split('@')[0];
});

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>> & { name: string };
export const User = model('User', userSchema);
