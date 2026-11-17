import { Schema, model, type InferSchemaType } from 'mongoose';

const storeSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_-]{3,30}$/,
    },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    logo: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type StoreType = InferSchemaType<typeof storeSchema>;
export const Store = model('Store', storeSchema);
