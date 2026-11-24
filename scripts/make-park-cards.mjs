// Writes public/images/parks/<slug>/card.webp: a 560x350 thumbnail of each park's first photo for the
// /national-parks grid, so the page does not load several MB of full-size photos. Output is committed;
// rerun only when data/park-images.json changes: node scripts/make-park-cards.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const images = JSON.parse(readFileSync(path.join(ROOT, 'data/park-images.json'), 'utf8'));
let n = 0;
let bytes = 0;
for (const [slug, list] of Object.entries(images)) {
  const first = Array.isArray(list) && list.find((i) => i?.src);
  if (!first) continue;
  const input = path.join(ROOT, 'public', first.src);
  const out = path.join(ROOT, 'public/images/parks', slug, 'card.webp');
  const info = await sharp(input).resize(560, 350, { fit: 'cover', position: 'attention' }).webp({ quality: 62 }).toFile(out);
  n += 1;
  bytes += info.size;
}
console.log(`Wrote ${n} card thumbnails, ${(bytes / 1024).toFixed(0)} KB total.`);
