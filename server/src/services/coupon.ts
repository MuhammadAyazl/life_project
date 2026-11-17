import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import type { UserDoc } from '../models/User.js';
import { badRequest } from '../utils/AppError.js';
import { effectivePlan } from './plan.js';

/** Checks every coupon rule on the server. The client is never trusted with a discount. */
export async function resolveCoupon(rawCode: string, user: UserDoc) {
  const code = rawCode.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code, isActive: true });
  if (!coupon) throw badRequest('Invalid coupon code.');
  if (coupon.expiresAt < new Date()) throw badRequest('This coupon has expired.');
  if (coupon.forMember && !effectivePlan(user).isMember) {
    throw badRequest('This coupon is only for Plus members. Start your free trial to use it.');
  }
  if (coupon.forNewUser && (await Order.exists({ user: user._id }))) {
    throw badRequest('This coupon is only for your first order.');
  }
  return { code: coupon.code, discount: coupon.discount, description: coupon.description };
}
