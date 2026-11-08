import { readFileSync } from 'node:fs';

let cache;

export function catalog() {
  if (cache) return cache;
  const file = new URL('../../../data/plus-index.json', import.meta.url);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  cache = { ...data, byUrl: new Map(data.listings.map((l) => [l.url, l])) };
  return cache;
}

export function listingByUrl(url) {
  if (typeof url !== 'string') return null;
  const path = url.startsWith('/') ? url : `/${url}`;
  const clean = path.replace(/\/$/, '');
  if (!/^\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/.test(clean)) return null;
  return catalog().byUrl.get(clean) || null;
}
