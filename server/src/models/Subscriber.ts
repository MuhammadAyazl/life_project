import { Schema, model } from 'mongoose';

const subscriberSchema = new Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 } },
  { timestamps: true },
);

export const Subscriber = model('Subscriber', subscriberSchema);
