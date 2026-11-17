import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import { badRequest } from '../utils/AppError.js';

/**
 * Uploaded images are stored INSIDE MongoDB (GridFS bucket "uploads"), not on the server's disk.
 * Serverless hosts like Vercel wipe the disk, so this keeps seller photos and DPs safe in production.
 * Files from older local installs that are still in server/uploads/ are served as a fallback.
 */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const NAME_RE = /^[a-f0-9-]{36}\.(?:jpg|png|webp)$/;

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'uploads' });

/** Files stay in memory until their real content type is verified - nothing untrusted is stored. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 4, fields: 20 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(badRequest('Only JPG, PNG or WEBP images are allowed.'));
  },
});

/** Checks the file's magic bytes; the browser-supplied mimetype alone can be faked. */
function sniff(buf: Buffer): '.jpg' | '.png' | '.webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return '.png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
    return '.webp';
  return null;
}

/** Saves verified images with random names and returns their public URLs (/uploads/<name>). */
export async function saveImages(files: Express.Multer.File[] | undefined): Promise<string[]> {
  if (!files?.length) return [];
  const urls: string[] = [];
  for (const f of files) {
    const ext = sniff(f.buffer);
    if (!ext) throw badRequest(`"${f.originalname}" is not a valid image.`);
    const name = `${crypto.randomUUID()}${ext}`;
    await new Promise<void>((resolve, reject) => {
      const up = bucket().openUploadStream(name, { metadata: { contentType: TYPES[ext] } });
      up.once('finish', () => resolve());
      up.once('error', reject);
      up.end(f.buffer);
    });
    urls.push(`/uploads/${name}`);
  }
  return urls;
}

/** Deletes an image we uploaded earlier. Ignores external URLs (e.g. Google avatars) and path tricks. */
export async function removeUpload(url: string | null | undefined) {
  const name = url?.match(/^\/uploads\/(.+)$/)?.[1];
  if (!name || !NAME_RE.test(name)) return;
  const files = await bucket().find({ filename: name }).toArray();
  for (const f of files) await bucket().delete(f._id).catch(() => {});
  fs.promises.unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}

/** GET /uploads/:name - streams an image from MongoDB (or the legacy local folder). */
export async function serveUpload(req: Request, res: Response) {
  const name = String(req.params.name);
  if (!NAME_RE.test(name)) return res.status(404).end();
  res.setHeader('Content-Type', TYPES[path.extname(name)]);
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");

  const [file] = await bucket().find({ filename: name }).limit(1).toArray();
  if (file) {
    res.setHeader('Content-Length', String(file.length));
    bucket()
      .openDownloadStream(file._id)
      .on('error', () => res.destroy())
      .pipe(res);
    return;
  }
  const local = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(local)) return res.sendFile(local);
  res.status(404).end();
}
