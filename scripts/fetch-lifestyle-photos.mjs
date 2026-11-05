// Download the curated Pexels and Unsplash photos listed in data/lifestyle-photos.json
// and write 1200x750 WebP files to public/images/lifestyle. The site build does not
// need this step when those files are already committed. Re-run it to refresh:
//   node scripts/fetch-lifestyle-photos.mjs
//   node scripts/fetch-lifestyle-photos.mjs --force
import sharp from 'sharp';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/images/lifestyle');
const force = process.argv.includes('--force');
const photos = JSON.parse(readFileSync(path.join(ROOT, 'data/lifestyle-photos.json'), 'utf8'));

mkdirSync(OUT, { recursive: true });

async function download(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'waterfallsnearyou-asset-fetch/1.0', Accept: 'image/jpeg,image/*,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const type = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!type.startsWith('image/') || buf.length < 8000) throw new Error(`not an image (${type}, ${buf.length} bytes) ${url}`);
  return buf;
}

let made = 0;
let skipped = 0;
for (const photo of photos) {
  const dest = path.join(OUT, photo.file);
  if (!force && existsSync(dest)) { skipped++; continue; }
  const buf = await download(photo.downloadUrl);
  const position = photo.position || 'attention';
  try {
    await sharp(buf).rotate().resize(1200, 750, { fit: 'cover', position }).webp({ quality: 72 }).toFile(dest);
  } catch {
    await sharp(buf).rotate().resize(1200, 750, { fit: 'cover', position: 'centre' }).webp({ quality: 72 }).toFile(dest);
  }
  made++;
  console.log('wrote', photo.file);
}
console.log(`Lifestyle photos: ${made} written, ${skipped} already present, ${photos.length} in the catalog.`);
