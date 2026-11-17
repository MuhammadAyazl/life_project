import { Schema, model, type InferSchemaType } from 'mongoose';
import { CATEGORIES } from '../config/constants.js';

const productSchema = new Schema(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    images: { type: [String], default: [] },
    // built-in illustration key used by seeded demo products that have no photo
    art: { type: String, default: '' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    sold: { type: Number, default: 0 },
    // seeded sample product - hidden automatically once real sellers add products
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', description: 'text', category: 'text' });
productSchema.index({ createdAt: -1 });

export type ProductType = InferSchemaType<typeof productSchema>;
export const Product = model('Product', productSchema);
