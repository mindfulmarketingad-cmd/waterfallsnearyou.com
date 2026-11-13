// Which URLs search engines should index. Rule: index only pages with substantial unique content.
// Hand-written posts, state hubs, static pages, the /find and /map hubs, town hubs with 3+ indexable
// waterfalls, and waterfall pages with real visitor data (25+ Google reviews), a sourced trip guide,
// or a USGS description/history of 200+ characters.
// Thinner waterfall and town URLs are not built. They 301 to the town page or the state gazetteer
// (see src/lib/publish.mjs). Data-generated list pages and /find and /map sub-pages are still built
// where the list itself is the content, but they are noindexed and do not carry ads.
import { loadData, staticPagePaths } from './core.mjs';
import { getPosts } from './blog.mjs';
import { getSmallest, getRoadside } from './bestof.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { tripFacts } from './tripfacts.mjs';
// Read hub slugs directly (cityhubs.mjs imports this module).
const hubUrls = () => JSON.parse(readFileSync(path.join(process.cwd(), 'data/city-hubs.json'), 'utf8')).map((h) => `/waterfalls-near/${h.slug}`);

export const MIN_REVIEWS = 25;
export const MIN_USGS_TEXT = 200;
export const MIN_CITY_LISTINGS = 3;
const NOINDEX_STATIC = new Set(['/search']);

// A hand-checked trip-facts entry (data/trip-facts.json) with sources also counts as real content.
export const richListing = (l) =>
  !!(l.os?.rating && l.os.reviews >= MIN_REVIEWS) || !!tripFacts(l.url)?.sources?.length || ((l.gnisDescription || '') + (l.gnisHistory || '')).length >= MIN_USGS_TEXT;
export const richCity = (c) => c.assigned.filter(richListing).length >= MIN_CITY_LISTINGS;

let set = null;
export function indexableUrls() {
  if (set) return set;
  const { listings, states, cities } = loadData();
  set = new Set([
    ...staticPagePaths().filter((p) => !NOINDEX_STATIC.has(p)),
    ...getPosts().map((p) => p.url),
    getSmallest().url,
    getRoadside().url,
    '/find',
    '/map',
    '/waterfalls-near',
    ...hubUrls(),
    ...states.map((s) => s.url),
    ...cities.filter(richCity).map((c) => c.url),
    ...listings.filter(richListing).map((l) => l.url),
  ]);
  return set;
}
export const isIndexable = (path) => indexableUrls().has(path.replace(/\/$/, '') || '/');
