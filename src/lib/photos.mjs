// Card, hero and blog images use hosted lifestyle photos (see src/lib/lifestyle.mjs).
// Outscraper still stores Google Maps photo URLs, but those lh3.googleusercontent.com
// links return HTTP 403 in browsers, and the old onerror path then showed the generated
// illustration for every card. Google URLs are not used as image sources. The generated
// file in /images/gen/ remains only as an onerror fallback if a hosted file is missing.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { imageFor, loadData, miles } from './core.mjs';
import { lifestyleForListing, lifestyleForKey, lifestyleChoices } from './lifestyle.mjs';
import { parkRecords } from './park-copy.mjs';

function fromLife(life, url) {
  return {
    src: life.src,
    alt: life.alt,
    caption: null,
    fallback: imageFor(url),
    own: false,
  };
}

// Google hotlinks are not reliable. Callers that still check this get no remote photo.
export function ownPhoto() {
  return null;
}

export function listingPhoto(l) {
  return fromLife(lifestyleForListing(l), l.url);
}

// Hub pages use a lifestyle photo tied to the first real waterfall on the page,
// so the hero matches that card. Pages with no listing fall back to a stable key.
export function pagePhoto(url, candidates = []) {
  const hit = candidates.find((l) => l && l.url);
  const life = hit ? lifestyleForListing(hit) : lifestyleForKey(url);
  return { ...fromLife(life, url), listing: hit || null };
}

// Blog and static featured images. Hand-written posts are spread across the catalog
// so two posts do not share a photo while the catalog is larger than the post list.
export function featuredPhoto(key) {
  return fromLife(lifestyleForKey(key), key);
}

export function stateFeatured(state) {
  return [...state.listings].sort((a, b) => (b.os?.reviews || 0) - (a.os?.reviews || 0) || a.name.localeCompare(b.name));
}

export function cityFeatured(city) {
  const byReviews = (a, b) => (b.listing.os?.reviews || 0) - (a.listing.os?.reviews || 0);
  const near = city.nearby.filter((n) => n.miles <= 30).sort(byReviews);
  const rest = city.nearby.filter((n) => n.miles > 30).sort(byReviews);
  return [...near, ...rest].map((n) => n.listing);
}

// Google photo URLs accept a size suffix. Hosted files are already sized, so leave them.
export function sized(src, w, h) {
  if (typeof src !== 'string' || !/googleusercontent\.com/.test(src)) return src;
  return /=w\d+-h\d+/.test(src) ? src.replace(/=w\d+-h\d+/, `=w${w}-h${h}`) : src;
}

const GOOGLE_PHOTO = /googleusercontent\.com|ggpht\.com|maps\.googleapis\.com/i;

// Photos the park guides already refuse. A nearby card should not put one back.
const PARK_BANNED = {
  'kings-canyon': /oregon|multnomah|columbia gorge|highway 14|acorn|quercus|national forest/i,
  sequoia: /yosemite|mariposa grove/i,
  'cuyahoga-valley': /chagrin|metroparks/i,
  acadia: /journal|europe, 1824|king visiting/i,
  'death-valley': /coyote canyon|flash flood/i,
};

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/\bwaterfalls?\b/g, 'fall')
    .replace(/\b(falls|fall|cascades|cascade)\b/g, 'fall')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasPhrase(text, key) {
  return key.length > 0 && ` ${text} `.includes(` ${key} `);
}

// "a small waterfall near Virginia Falls" is not a photo of Virginia Falls.
function onlyAsNear(text, key) {
  return !hasPhrase(text.replaceAll(`near ${key}`, ' '), key);
}

function matchScore(img, name) {
  const key = normName(name);
  const words = key.split(' ').filter((w) => w && w !== 'fall');
  if (!words.length || words.join('').length < 3) return 0;
  const file = normName(img.fileTitle || '');
  const alt = normName(img.alt || '');
  const cap = normName(img.caption || '');
  const blob = `${file} ${alt} ${cap}`;
  if (!hasPhrase(blob, key) || onlyAsNear(blob, key)) return 0;
  // Longer names win, so "Upper Yosemite Falls" beats "Yosemite Falls" on a
  // photo whose caption names the upper fall. File and alt matches are tie breaks.
  let score = key.length * 10;
  if (hasPhrase(file, key)) score += 5;
  if (alt.startsWith(key)) score += 3;
  return score;
}

function clipAlt(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= 160) return t;
  const cut = t.slice(0, 157).replace(/\s+\S*$/, '');
  return `${cut || t.slice(0, 157)}…`;
}

function altForHosted(img, listing) {
  const key = normName(listing.name);
  const usable = (text) => {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (raw.length < 12 || /^i took photo/i.test(raw)) return '';
    if (/^title:/i.test(raw) || /\bsubjects:/i.test(raw)) return '';
    const letters = raw.replace(/[^A-Za-z]/g, '');
    const upper = raw.replace(/[^A-Z]/g, '').length;
    if (letters.length > 12 && upper / letters.length > 0.7) return '';
    if (!hasPhrase(normName(raw), key)) return '';
    return raw;
  };
  const where = `${listing.county ? `${listing.county} County, ` : ''}${listing.state}`;
  return clipAlt(usable(img.alt) || usable(img.caption) || `${listing.name} in ${where}`);
}

// A trailhead or canyon overlook is not a photo of the waterfall.
function isTrailheadShot(img) {
  const file = img.fileTitle || '';
  const alt = img.alt || '';
  if (/trailhead/i.test(file)) return true;
  return /view from (the )?trail\s*head/i.test(alt);
}

let hostedByUrl = null;
function hostedIndex() {
  if (hostedByUrl) return hostedByUrl;
  hostedByUrl = new Map();
  let catalog = {};
  try {
    catalog = JSON.parse(readFileSync(path.join(process.cwd(), 'data/park-images.json'), 'utf8'));
  } catch {
    return hostedByUrl;
  }
  const { listings } = loadData();
  const byUrl = new Map(listings.map((l) => [l.url, l]));
  for (const rec of parkRecords) {
    const imgs = Array.isArray(catalog[rec.slug]) ? catalog[rec.slug] : [];
    const falls = rec.falls.map((f) => byUrl.get(f.url)).filter(Boolean);
    if (!falls.length || !imgs.length) continue;
    const states = new Set(falls.map((f) => f.stateCode));
    const candidates = listings.filter((l) => states.has(l.stateCode));
    const bestForFall = new Map();
    const banned = PARK_BANNED[rec.slug];
    for (const img of imgs) {
      if (!img?.src || GOOGLE_PHOTO.test(img.src)) continue;
      if (img.license && /\b(nc|nd)\b/i.test(img.license)) continue;
      const blob = `${img.caption || ''} ${img.fileTitle || ''} ${img.alt || ''}`;
      if (banned && banned.test(blob)) continue;
      if (isTrailheadShot(img)) continue;
      if (!existsSync(path.join(process.cwd(), 'public', img.src.replace(/^\//, '')))) continue;
      let best = null;
      let bestScore = 0;
      let bestDist = Infinity;
      for (const l of candidates) {
        const score = matchScore(img, l.name);
        if (score <= 0) continue;
        const onList = falls.some((f) => f.url === l.url);
        const dist = onList ? 0 : Math.min(...falls.map((f) => miles(f, l)));
        if (!onList && dist > 40) continue;
        if (score > bestScore || (score === bestScore && dist < bestDist)) {
          best = l;
          bestScore = score;
          bestDist = dist;
        }
      }
      if (!best) continue;
      const prev = bestForFall.get(best.url);
      if (!prev || bestScore > prev.score) bestForFall.set(best.url, { img, score: bestScore });
    }
    for (const [url, { img }] of bestForFall) {
      const l = byUrl.get(url);
      hostedByUrl.set(url, {
        src: img.src,
        alt: altForHosted(img, l),
        caption: null,
        fallback: imageFor(url),
        own: true,
      });
    }
  }
  return hostedByUrl;
}

// A photo hosted in this repo that is actually of this waterfall, when one exists.
export function hostedPhotoFor(l) {
  if (!l?.url) return null;
  const photo = hostedIndex().get(l.url) || null;
  if (photo && GOOGLE_PHOTO.test(photo.src)) return null;
  return photo;
}

function cardPhoto(l, src, alt, own) {
  const gen = imageFor(l.url);
  const safe = typeof src === 'string' && src && !GOOGLE_PHOTO.test(src) ? src : gen;
  return {
    src: safe,
    alt: alt || `${l.name} in ${l.state}`,
    caption: null,
    fallback: safe === gen ? null : gen,
    own: !!own,
  };
}

// Photos for one nearby-waterfall row, in display order. A fall's own hosted
// photo wins. Otherwise the regional lifestyle pool is used, skipping a file
// already chosen for an earlier card in the row when the pool has another.
export function nearbyPhotos(listings) {
  const used = new Set();
  let prev = '';
  return listings.map((l) => {
    const own = hostedPhotoFor(l);
    if (own && own.src !== prev) {
      used.add(own.src);
      prev = own.src;
      return cardPhoto(l, own.src, own.alt, true);
    }
    const choices = lifestyleChoices(l).filter((p) => p?.src && !GOOGLE_PHOTO.test(p.src));
    const pick = choices.find((p) => !used.has(p.src)) || choices.find((p) => p.src !== prev) || choices[0];
    const src = pick?.src || imageFor(l.url);
    used.add(src);
    prev = src;
    return cardPhoto(l, src, pick?.alt, false);
  });
}
