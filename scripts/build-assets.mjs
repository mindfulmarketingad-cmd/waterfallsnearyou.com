// Pre-build step: renders a unique featured/social image for every page into public/images/gen/.
import sharp from 'sharp';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData, imageFor, staticPagePaths } from '../src/lib/core.mjs';
import { landscapeSvg } from '../src/lib/art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { listings, states, cities } = loadData();
const blog = readdirSync(path.join(ROOT, 'src/content/blog')).filter((f) => f.endsWith('.md')).map((f) => `/blog/${f.replace(/\.md$/, '')}`);
const urls = [...staticPagePaths(), ...states.map((s) => s.url), ...cities.map((c) => c.url), ...listings.map((l) => l.url), ...blog];

let made = 0;
const queue = [...new Set(urls)];
async function worker() {
  while (queue.length) {
    const url = queue.pop();
    const file = path.join(ROOT, 'public', imageFor(url));
    if (existsSync(file)) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    await sharp(Buffer.from(landscapeSvg(url))).webp({ quality: 72, effort: 4 }).toFile(file);
    made++;
  }
}
const t = Date.now();
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`Featured images: ${made} rendered, ${urls.length} total (${((Date.now() - t) / 1000).toFixed(1)}s)`);
