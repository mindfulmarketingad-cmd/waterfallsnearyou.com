// Which directory URLs are real pages, and where retired URLs should send people.
// A waterfall page is published only when it has visitor ratings, a sourced trip guide, or a
// substantial USGS write-up (see richListing). A town page is published only when it has several
// of those waterfalls. Everything else is listed on the state gazetteer (or the town page, when
// that town has one) and the old URL 301s there. AdSense reviewers follow links, so unpublished
// URLs must not be linked or built.
import { loadData } from './core.mjs';
import { richListing, richCity } from './indexing.mjs';
import { getPosts } from './blog.mjs';
import { getGuides } from './guides.mjs';
import { getFindCities, findPages } from './find.mjs';

export const publishedListing = richListing;
export const publishedCity = richCity;

const statePath = (slug) => `/states/${slug}`;

export function listingHref(l) {
  if (publishedListing(l)) return l.url;
  if (publishedCity(l.city)) return `${l.city.url}#wf-${l.id}`;
  return `${statePath(l.stateSlug)}#wf-${l.id}`;
}

export function cityHref(c) {
  if (publishedCity(c)) return c.url;
  return `${statePath(c.stateSlug)}#gazetteer`;
}

// Old URL -> destination we still build. Destinations are never themselves redirects.
export function redirectMap() {
  const { listings, cities } = loadData();
  const map = {};
  const add = (from, to) => {
    if (!from || !to) return;
    const bare = to.split('#')[0];
    if (from === bare || from === to) return;
    map[from] = to;
  };
  for (const l of listings) {
    if (!publishedListing(l)) add(l.url, listingHref(l));
    if (l.partnerSlug) add(`/partners/${l.partnerSlug}`, publishedListing(l) ? l.url : listingHref(l));
  }
  for (const c of cities) {
    if (!publishedCity(c)) add(c.url, cityHref(c));
  }
  const posts = new Set(getPosts().map((p) => p.slug));
  for (const g of getGuides()) {
    if (posts.has(g.slug)) continue;
    add(g.url, publishedListing(g.listing) ? g.listing.url : listingHref(g.listing));
  }
  const findStateUrls = new Set(findPages().map((p) => p.url));
  for (const p of getFindCities()) {
    const stateUrl = `/find/${p.type.slug}/${p.state.slug}`;
    add(p.url, findStateUrls.has(stateUrl) ? stateUrl : p.type.url);
  }
  return map;
}
