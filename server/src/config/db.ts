import mongoose from 'mongoose';
import { env } from './env.js';

// NoSQL-injection guard: every request value is parsed by a zod schema into plain strings/numbers
// before it reaches a query, and `stripDangerousKeys` drops "$..." keys from bodies.
mongoose.set('strictQuery', true);

export async function connectDB(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, { autoIndex: !env.isProd });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
