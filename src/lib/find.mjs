// /find: waterfall types. Each type is a filter on real listing data (Google ratings, USGS gazetteer
// text, stated heights, names). A state page is built only when at least MIN_ITEMS waterfalls in that
// state genuinely qualify. Types already covered by an existing state blog list link to that list
// instead of duplicating it.
import { loadData } from './core.mjs';
import { isPrivate, statedHeight, townLine, usgsLines, getStateLists, getRoadside, getSmallest, BEST_YEAR } from './bestof.mjs';
import { listJoin } from './format.mjs';

export const FIND_YEAR = BEST_YEAR;
export const FIND_PUBLISHED = new Date('2026-10-08T12:00:00Z');
export const MIN_ITEMS = 5;
const MAX_ITEMS = 10;
const fmt = (n) => Number(n).toLocaleString('en-US');
const quote = (t) => `"${String(t).replace(/\s+/g, ' ').trim().replace(/\.$/, '')}."`;
const documented = (l) => !!l.gnisHistory || (!!l.gnisDescription && !/^Located in sec/i.test(l.gnisDescription)) || l.variants?.length > 0;
const ratingLine = (l) => (l.os?.rating && l.os.reviews ? `Visitors rate it ${l.os.rating.toFixed(1)} stars across ${fmt(l.os.reviews)} Google review${l.os.reviews === 1 ? '' : 's'}.` : 'It has no Google rating yet, so expect few other visitors.');
const tagLine = (l) => (l.os?.reviewTags?.length ? `Reviewers mention ${listJoin(l.os.reviewTags.slice(0, 3).map((t) => `"${t}"`))}.` : null);
const nearLine = (l) => {
  const n = l.nearby?.[0];
  return n ? `The nearest other named waterfall is ${n.listing.name}, about ${n.miles.toFixed(1)} miles to the ${n.direction}.` : null;
};
const photoLine = (l) => (l.os?.photosCount >= 5 ? `Visitors have shared ${fmt(l.os.photosCount)} photos of it on Google Maps.` : null);
const heightLine = (h) => `The ${h.source} records: ${quote(h.text.length > 220 ? h.text.slice(0, 220).replace(/\s\S*$/, '') + '...' : h.text)}`;

// Weighted rating so a 5.0 from three reviews does not outrank a 4.8 from three hundred.
function bayesFor(list, M = 20) {
  const r = list.filter((l) => l.os?.rating && l.os.reviews);
  const votes = r.reduce((s, l) => s + l.os.reviews, 0) || 1;
  const C = r.reduce((s, l) => s + l.os.rating * l.os.reviews, 0) / votes || 4.5;
  return (l) => (l.os?.rating && l.os.reviews ? (l.os.reviews / (l.os.reviews + M)) * l.os.rating + (M / (l.os.reviews + M)) * C : 0);
}

// Types with their own state pages.
const BUILT = [
  {
    slug: 'hidden-gem-waterfalls',
    name: 'Hidden Gem Waterfalls',
    short: 'Hidden gem waterfalls',
    blurb: 'Highly rated falls that few people review: 4.6 stars or better from 75 or fewer Google reviews.',
    qualifies: (l) => l.os?.rating >= 4.6 && l.os.reviews >= 5 && l.os.reviews <= 75,
    rank: (list) => { const b = bayesFor(list, 10); return [...list].sort((a, b2) => b(b2) - b(a)); },
    method: (n, state) => `We took the ${n} publicly accessible ${state} waterfalls rated 4.6 stars or higher on Google by between 5 and 75 reviewers, then ranked them by a weighted rating that gives more credit to ratings backed by more reviews.`,
    why: (l) => [ratingLine(l), photoLine(l), tagLine(l), ...usgsLines(l).slice(0, 1), townLine(l), nearLine(l)],
  },
  {
    slug: 'historic-waterfalls',
    name: 'Historic Waterfalls',
    short: 'Historic waterfalls',
    blurb: 'Falls with a written record: a USGS naming history, a gazetteer description or older recorded names.',
    qualifies: documented,
    rank: (list) => {
      const depth = (l) => (l.gnisHistory ? 3 : 0) + (l.gnisDescription && !/^Located in sec/i.test(l.gnisDescription) ? 2 : 0) + Math.min(l.variants?.length || 0, 2);
      return [...list].sort((a, b) => depth(b) - depth(a) || (b.os?.reviews || 0) - (a.os?.reviews || 0));
    },
    method: (n, state) => `We took the ${n} publicly accessible ${state} waterfalls that have a written record in the USGS Geographic Names Information System (a naming history, a gazetteer description, or older variant names) and ranked them by how much of that record exists, then by Google review volume.`,
    why: (l) => [...usgsLines(l), l.os?.reviews ? ratingLine(l) : null, townLine(l), nearLine(l)],
  },
  {
    slug: 'cascades',
    name: 'Cascades',
    short: 'Cascades',
    blurb: 'Named cascades: water stepping down a series of ledges rather than falling in one drop.',
    qualifies: (l) => /cascade/i.test(l.name),
    rank: (list) => { const b = bayesFor(list); return [...list].sort((a, c) => b(c) - b(a) || Number(documented(c)) - Number(documented(a))); },
    method: (n, state) => `We took the ${n} publicly accessible ${state} features officially named as cascades in the USGS Geographic Names Information System and ranked them by weighted Google rating, then by how well documented they are.`,
    why: (l) => [ratingLine(l), photoLine(l), tagLine(l), ...usgsLines(l).slice(0, 1), townLine(l), nearLine(l)],
  },
  {
    slug: 'tall-waterfalls',
    name: 'Tall Waterfalls',
    short: 'Tall waterfalls',
    blurb: 'Falls with a recorded height of 100 feet or more in the USGS gazetteer or their Google listing.',
    qualifies: (l) => { const h = statedHeight(l); return !!h && h.feet >= 100; },
    rank: (list) => [...list].sort((a, b) => statedHeight(b).feet - statedHeight(a).feet),
    method: (n, state) => `We took the ${n} publicly accessible ${state} waterfalls whose USGS gazetteer entry or Google listing states a height of 100 feet or more and ranked them by that stated height. Waterfalls with no recorded height are not included, so some tall falls may be missing.`,
    why: (l) => { const h = statedHeight(l); return [`Recorded height: about ${fmt(h.feet)} feet.`, heightLine(h), l.os?.reviews ? ratingLine(l) : null, townLine(l)]; },
  },
  {
    slug: 'small-waterfalls',
    name: 'Small Waterfalls',
    short: 'Small waterfalls',
    blurb: 'Falls with a recorded height of 25 feet or less, often easy to reach and good in any season.',
    qualifies: (l) => { const h = statedHeight(l); return !!h && h.feet > 0 && h.feet <= 25; },
    rank: (list) => [...list].sort((a, b) => statedHeight(a).feet - statedHeight(b).feet || (b.os?.reviews || 0) - (a.os?.reviews || 0)),
    method: (n, state) => `We took the ${n} publicly accessible ${state} waterfalls whose USGS gazetteer entry or Google listing states a height of 25 feet or less and ranked them from smallest up. Waterfalls with no recorded height are not included.`,
    why: (l) => { const h = statedHeight(l); return [`Recorded height: about ${fmt(h.feet)} feet.`, heightLine(h), l.os?.reviews ? ratingLine(l) : null, townLine(l)]; },
  },
];

// Types whose state pages already exist as blog lists (or one national list).
const LINKED = [
  { slug: 'waterfall-trails', name: 'Waterfall Trails', short: 'Waterfall trails', blurb: 'Falls you reach on foot, ranked by the hikers who reviewed them.', kind: 'hiking' },
  { slug: 'most-photographed-waterfalls', name: 'Most Photographed Waterfalls', short: 'Most photographed waterfalls', blurb: 'The falls visitors photograph and rate five stars most often.', kind: 'beautiful' },
  { slug: 'popular-waterfalls', name: 'Popular Waterfalls', short: 'Popular waterfalls', blurb: 'The falls that draw the most visitors, by Google review volume.', kind: 'most-visited' },
  { slug: 'must-see-waterfalls', name: 'Must-See Waterfalls', short: 'Must-see waterfalls', blurb: 'Five top-rated, widely visited falls per state, spread across its regions.', kind: 'must-see' },
  { slug: 'roadside-waterfalls', name: 'Roadside Waterfalls', short: 'Roadside waterfalls', blurb: 'Top-rated falls you can see with little or no hiking.', national: () => getRoadside() },
];

let cache = null;
export function getFind() {
  if (cache) return cache;
  const { states } = loadData();
  const lists = getStateLists();
  const types = [];
  for (const t of BUILT) {
    const pages = [];
    for (const state of states) {
      const cands = state.listings.filter((l) => !isPrivate(l) && t.qualifies(l));
      if (cands.length < MIN_ITEMS) continue;
      const items = t.rank(cands).slice(0, MAX_ITEMS).map((l) => ({ listing: l, why: t.why(l).filter(Boolean) }));
      const url = `/find/${t.slug}/${state.slug}`;
      pages.push({
        type: t, state, items, candidates: cands.length, url,
        title: `${items.length} Best ${t.name} in ${state.name} ${FIND_YEAR}`,
        description: `The ${items.length} best ${t.short.toLowerCase()} in ${state.name}, from ${items[0].listing.name} to ${items[items.length - 1].listing.name}, with maps, directions and how we ranked them.`.slice(0, 160),
        method: t.method(cands.length, state.name),
      });
    }
    pages.sort((a, b) => b.candidates - a.candidates);
    types.push({ ...t, url: `/find/${t.slug}`, pages, built: true });
  }
  for (const t of LINKED) {
    const pages = t.kind
      ? lists.filter((p) => p.kind === t.kind).map((p) => ({ type: t, state: p.state, url: p.url, title: p.title, items: p.items, candidates: p.items.length, external: true }))
      : [];
    types.push({ ...t, url: `/find/${t.slug}`, pages, national: t.national?.(), built: false });
  }
  const smallest = getSmallest();
  const small = types.find((t) => t.slug === 'small-waterfalls');
  small.national = smallest;
  cache = types;
  return cache;
}
export const findPages = () => getFind().flatMap((t) => (t.built ? t.pages : []));
export const findForState = (state) => getFind().flatMap((t) => t.pages.filter((p) => p.state === state));
