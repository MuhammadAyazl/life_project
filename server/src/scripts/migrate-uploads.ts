/**
 * Copies images from the old server/uploads/ folder into MongoDB (GridFS) so they keep working
 * after deployment. Safe to run more than once. Run: npm run migrate:uploads -w server
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

async function main() {
  await connectDB();
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'uploads' });
  const files = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).filter((f) => /^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(f)) : [];
  let copied = 0;
  for (const name of files) {
    if (await bucket.find({ filename: name }).limit(1).hasNext()) continue;
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(path.join(UPLOAD_DIR, name))
        .pipe(bucket.openUploadStream(name, { metadata: { contentType: TYPES[path.extname(name)] } }))
        .once('finish', () => resolve())
        .once('error', reject);
    });
    copied++;
  }
  console.log(`Images in folder: ${files.length}, copied into MongoDB: ${copied}`);
  await disconnectDB();
}

main().catch(async (e) => {
  console.error(e);
  await disconnectDB();
  process.exit(1);
});
