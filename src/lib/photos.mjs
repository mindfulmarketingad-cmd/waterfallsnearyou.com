// Card, hero and blog images use hosted lifestyle photos (see src/lib/lifestyle.mjs).
// Outscraper still stores Google Maps photo URLs, but those lh3.googleusercontent.com
// links return HTTP 403 in browsers, and the old onerror path then showed the generated
// illustration for every card. Google URLs are not used as image sources. The generated
// file in /images/gen/ remains only as an onerror fallback if a hosted file is missing.
import { imageFor } from './core.mjs';
import { lifestyleForListing, lifestyleForKey } from './lifestyle.mjs';

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
