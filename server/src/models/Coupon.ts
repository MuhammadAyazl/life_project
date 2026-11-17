import { Schema, model, type InferSchemaType } from 'mongoose';

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,20}$/ },
    description: { type: String, required: true, trim: true, maxlength: 160 },
    discount: { type: Number, required: true, min: 1, max: 100 }, // percent
    expiresAt: { type: Date, required: true },
    forNewUser: { type: Boolean, default: false },
    forMember: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponType = InferSchemaType<typeof couponSchema>;
export const Coupon = model('Coupon', couponSchema);
