// Hosted waterfall and hiking photos. Google listing photo URLs 403 in browsers, so cards
// use this catalog instead. Files live in public/images/lifestyle and are committed.
// Credits and licenses: data/lifestyle-photos.json (Pexels License and Unsplash License).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getPosts } from './blog.mjs';

const BIOME = {
  HI: 'tropical', FL: 'tropical',
  AZ: 'desert', UT: 'desert', NM: 'desert', NV: 'desert',
  CO: 'alpine', MT: 'alpine', WY: 'alpine', ID: 'alpine', AK: 'alpine',
  WA: 'pnw', OR: 'pnw',
  CA: 'california',
  NC: 'appalachia', TN: 'appalachia', VA: 'appalachia', WV: 'appalachia',
  KY: 'appalachia', GA: 'appalachia', SC: 'appalachia', AL: 'appalachia', PA: 'appalachia',
  NY: 'northeast', VT: 'northeast', NH: 'northeast', ME: 'northeast',
  MA: 'northeast', CT: 'northeast', RI: 'northeast', NJ: 'northeast', MD: 'northeast', DE: 'northeast',
};

let photos = null;
function load() {
  if (!photos) {
    photos = JSON.parse(readFileSync(path.join(process.cwd(), 'data/lifestyle-photos.json'), 'utf8'));
  }
  return photos;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function present(photo) {
  return {
    id: photo.id,
    src: `/images/lifestyle/${photo.file}`,
    alt: photo.alt,
    author: photo.author || null,
    source: photo.source,
    sourceUrl: photo.sourceUrl,
  };
}

function poolFor(biome) {
  const all = load();
  if (biome === 'forest') return all.filter((p) => p.biomes.includes('forest'));
  const specific = all.filter((p) => p.biomes.includes(biome));
  // Keep a regional pool on its own once it has enough variety. Smaller pools
  // borrow general forest scenes so a state never collapses to one or two photos.
  if (specific.length >= 6) return specific;
  const ids = new Set(specific.map((p) => p.id));
  return specific.concat(all.filter((p) => p.biomes.includes('forest') && !ids.has(p.id)));
}

export function lifestyleForListing(l) {
  const biome = BIOME[l?.stateCode] || 'forest';
  const pool = poolFor(biome);
  const key = l?.url || l?.name || biome;
  return present(pool[hash(key) % pool.length]);
}

// Hand-written posts get distinct photos. Other keys hash into the full catalog.
let postMap = null;
function postsAssigned() {
  if (postMap) return postMap;
  const all = load();
  const posts = [...getPosts()].sort((a, b) => a.slug.localeCompare(b.slug));
  const used = new Set();
  postMap = new Map();
  for (const post of posts) {
    const start = hash(post.url) % all.length;
    let pick = all[start];
    for (let i = 0; i < all.length; i++) {
      const cand = all[(start + i) % all.length];
      if (!used.has(cand.file)) { pick = cand; break; }
    }
    used.add(pick.file);
    postMap.set(post.url, pick);
  }
  return postMap;
}

export function lifestyleForKey(key) {
  const assigned = postsAssigned();
  if (assigned.has(key)) return present(assigned.get(key));
  const all = load();
  return present(all[hash(String(key)) % all.length]);
}
