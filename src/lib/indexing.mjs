// Which URLs search engines should index. Everything else is still built and linkable, but gets
// <meta name="robots" content="noindex, follow"> and is left out of sitemap.xml and /sitemap.
// Rule: index only pages with substantial unique content. Hand-written posts, state hubs, static
// pages, the /find and /map hubs, town hubs with 3+ indexable waterfalls, and waterfall pages with real visitor data (25+ Google reviews) or a USGS description/history
// of 200+ characters. Data-generated list/guide pages and all /find and /map sub-pages, and town hubs with fewer
// than 3 indexable waterfalls are noindexed as thin or templated.
import { loadData, staticPagePaths } from './core.mjs';
import { getPosts } from './blog.mjs';
import { getSmallest, getRoadside } from './bestof.mjs';

export const MIN_REVIEWS = 25;
export const MIN_USGS_TEXT = 200;
export const MIN_CITY_LISTINGS = 3;
const NOINDEX_STATIC = new Set(['/search']);

export const richListing = (l) =>
  !!(l.os?.rating && l.os.reviews >= MIN_REVIEWS) || ((l.gnisDescription || '') + (l.gnisHistory || '')).length >= MIN_USGS_TEXT;
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
    ...states.map((s) => s.url),
    ...cities.filter(richCity).map((c) => c.url),
    ...listings.filter(richListing).map((l) => l.url),
  ]);
  return set;
}
export const isIndexable = (path) => indexableUrls().has(path.replace(/\/$/, '') || '/');
