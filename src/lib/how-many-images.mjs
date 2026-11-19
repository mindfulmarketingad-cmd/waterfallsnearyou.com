// Reviewed Wikimedia Commons hero photos for the how-many state pages.
// Files live in public/images/how-many/. See scripts/fetch-how-many-images.mjs.
import { readFileSync } from 'node:fs';
import path from 'node:path';

let cache = null;
function all() {
  if (cache) return cache;
  cache = JSON.parse(readFileSync(path.join(process.cwd(), 'data/how-many-images.json'), 'utf8'));
  return cache;
}

export function howManyImage(slug) {
  const img = all().images[slug];
  if (!img?.src || !img.alt || !img.credit || !img.license || !img.sourceUrl) {
    throw new Error(`Missing how-many hero image for ${slug}`);
  }
  return img;
}
