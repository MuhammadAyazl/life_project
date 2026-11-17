import { Schema, model, Types } from 'mongoose';
import { Product } from './Product.js';

const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

// one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const Review = model('Review', reviewSchema);

/** Recalculates the cached average rating stored on the product. */
export async function recalcProductRating(productId: Types.ObjectId) {
  const [agg] = await Review.aggregate<{ avg: number; n: number }>([
    { $match: { product: productId } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { rating: agg ? Math.round(agg.avg * 10) / 10 : 0, numReviews: agg ? agg.n : 0 },
  );
}
