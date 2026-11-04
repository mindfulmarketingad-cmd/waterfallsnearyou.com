// Chooses Outscraper (Google Maps) photos for every page. A waterfall uses its own photo; otherwise
// the closest photographed waterfall within 10 miles, clearly labeled. Hub, blog and static pages use
// a photo of a real waterfall from their content, also labeled. The generated illustration is only a
// fallback (no photo nearby, or the remote photo fails to load).
import { loadData, imageFor } from './core.mjs';
import { getPosts } from './blog.mjs';

const NEIGHBOR_MILES = 10;
const fm = (m) => (m < 10 ? m.toFixed(1) : String(Math.round(m)));
const label = (l) => `${l.name}, ${l.stateCode}`;

export function ownPhoto(l) {
  return l?.os?.photo || null;
}

export function listingPhoto(l) {
  const fallback = imageFor(l.url);
  if (ownPhoto(l)) return { src: l.os.photo, alt: `Photo of ${l.name} near ${l.city.name}, ${l.stateCode}`, caption: null, fallback, own: true };
  const n = (l.nearby || []).find((x) => x.miles <= NEIGHBOR_MILES && ownPhoto(x.listing));
  if (n) {
    return {
      src: n.listing.os.photo,
      alt: `Photo of ${n.listing.name}, a waterfall ${fm(n.miles)} miles from ${l.name}`,
      caption: `Pictured: nearby ${n.listing.name} (${fm(n.miles)} mi)`,
      fallback,
      own: false,
    };
  }
  return { src: fallback, alt: `Illustrated featured image for ${l.name} in ${l.county ? `${l.county} County, ` : ''}${l.state}`, caption: null, fallback: null, own: false };
}

// First candidate listing that has its own photo, else the page's illustration.
export function pagePhoto(url, candidates = []) {
  const hit = candidates.find((l) => l && ownPhoto(l));
  if (hit) return { src: hit.os.photo, alt: `Photo of ${hit.name} in ${hit.county ? `${hit.county} County, ` : ''}${hit.state}`, caption: `Pictured: ${label(hit)}`, fallback: imageFor(url), own: false, listing: hit };
  return { src: imageFor(url), alt: 'Illustrated waterfall landscape', caption: null, fallback: null, own: false };
}

// Distinct, well-documented photos for pages that are not about one place (guides, static pages).
let pool = null;
function nationalPool() {
  if (pool) return pool;
  const { listings } = loadData();
  const seenState = new Map();
  // Most-reviewed photographed waterfalls, at most 3 per state so pages show variety.
  pool = listings
    .filter((l) => ownPhoto(l) && l.os.reviews >= 100)
    .sort((a, b) => b.os.reviews - a.os.reviews)
    .filter((l) => { const n = seenState.get(l.state) || 0; seenState.set(l.state, n + 1); return n < 3; });
  return pool;
}
// Blog posts: the post's own `featuredWaterfall` (a listing URL path), else the first linked
// waterfall page with a photo, else the national pool. No two posts share a photo.
let postMap = null;
function postPhotos() {
  if (postMap) return postMap;
  const { listings } = loadData();
  const byUrl = new Map(listings.map((l) => [l.url, l]));
  const used = new Set();
  postMap = new Map();
  const posts = [...getPosts()].sort((a, b) => (b.featuredWaterfall ? 1 : 0) - (a.featuredWaterfall ? 1 : 0) || a.date - b.date || a.slug.localeCompare(b.slug));
  for (const post of posts) {
    const want = post.featuredWaterfall ? '/' + post.featuredWaterfall.replace(/^\/|\/$/g, '') : null;
    const cands = [want, ...post.links].map((u) => u && byUrl.get(u)).filter((l) => l && ownPhoto(l) && !used.has(l.os.photo));
    let l = cands[0];
    if (!l) {
      const p = nationalPool().filter((x) => !used.has(x.os.photo));
      l = p.length ? p[hashIndex(post.url) % p.length] : null;
    }
    if (l) { used.add(l.os.photo); postMap.set(post.url, l); }
  }
  return postMap;
}
const assigned = new Map();
export function featuredPhoto(key) {
  const pm = postPhotos();
  if (pm.has(key)) return pagePhoto(key, [pm.get(key)]);
  const taken = new Set([...pm.values()].map((l) => l.os.photo));
  const p = nationalPool().filter((l) => !taken.has(l.os.photo));
  if (!assigned.has(key)) assigned.set(key, assigned.size);
  const l = p[(hashIndex(key) + assigned.get(key) * 7) % p.length];
  return pagePhoto(key, [l]);
}
function hashIndex(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 97;
}

export function stateFeatured(state) {
  return [...state.listings].filter(ownPhoto).sort((a, b) => b.os.reviews - a.os.reviews);
}
export function cityFeatured(city) {
  return city.nearby.filter((n) => n.miles <= 30 && ownPhoto(n.listing)).sort((a, b) => b.listing.os.reviews - a.listing.os.reviews).map((n) => n.listing)
    .concat(city.nearby.filter((n) => ownPhoto(n.listing)).map((n) => n.listing));
}

// Google photo URLs accept a size suffix (=w800-h500-k-no); request a small version for thumbnails.
export function sized(src, w, h) {
  if (typeof src !== 'string' || !/googleusercontent\.com/.test(src)) return src;
  return /=w\d+-h\d+/.test(src) ? src.replace(/=w\d+-h\d+/, `=w${w}-h${h}`) : src;
}
