// Programmatic state listicle posts, built only from listing data, for states with more than
// 10 listings. Each family ranks on a different signal so the pages don't duplicate each other:
//   best       – Bayesian-weighted Google rating (score balanced against review volume)
//   beautiful  – visitor photo volume, five-star share and scenery mentions in reviews
//   must-see   – the most-visited falls, spread across the state's regions, with a route
//   hiking     – falls whose reviews or listing mention hiking/trails, ranked by weighted rating
// Waterfalls whose reviews or USGS notes point to private property / no public access are excluded.
import { loadData, miles, bearing } from './core.mjs';
import { stateContent, regionForCounty } from './insights.mjs';
import { fmtMiles, listJoin } from './format.mjs';

export const BEST_YEAR = 2026;
// Date the programmatic list posts were first published (their content refreshes on every build).
export const LISTS_PUBLISHED = new Date('2026-10-02T12:00:00Z');
const MIN_LISTINGS = 10;
const isPlss = (s) => /^Located in sec/i.test(s || '');
const fmt = (n) => Number(n).toLocaleString('en-US');
const end = (t) => { const x = String(t).replace(/\s+/g, ' ').trim(); return /[.!?]["')]*$/.test(x) ? x : `${x}.`; };
const mi = (m) => fmtMiles(m).replace(' mi', ' miles');
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const OPP = { north: 'south', south: 'north', east: 'west', west: 'east', northeast: 'southwest', southwest: 'northeast', northwest: 'southeast', southeast: 'northwest' };
const SCENIC = /scener|beautiful|gorgeous|stunning|view|overlook|picturesque|scenic|photo|canyon|gorge|rainbow/i;

// Excluded from every ranked list: private property / no public access, and USGS "(historical)"
// features, which no longer exist (e.g. falls drowned by a reservoir).
export const isPrivate = (l) =>
  /\(historical\)/i.test(l.name) ||
  (l.os?.reviewTags || []).some((t) => /private property|no trespass/i.test(t)) ||
  /private property|no public access/i.test(`${l.gnisDescription} ${l.os?.description || ''}`);

let cache = null;
export function getStateLists() {
  if (cache) return cache;
  const { states } = loadData();
  cache = [];
  for (const state of states.filter((s) => s.listings.length > MIN_LISTINGS)) {
    const ctx = context(state);
    for (const kind of ['best', 'beautiful', 'must-see', 'hiking', 'most-visited']) {
      const post = BUILDERS[kind](state, ctx);
      if (post) cache.push(post);
    }
  }
  return cache;
}
export const getBestOf = () => getStateLists().filter((p) => p.kind === 'best');
export const listsForState = (state) => getStateLists().filter((p) => p.state === state);

function context(state) {
  const pool = state.listings.filter((l) => !isPrivate(l));
  const rated = pool.filter((l) => l.os?.rating && l.os.reviews >= 5);
  const votes = rated.reduce((s, l) => s + l.os.reviews, 0);
  const C = votes ? rated.reduce((s, l) => s + l.os.rating * l.os.reviews, 0) / votes : 4.5;
  const byReviews = [...rated].sort((a, b) => b.os.reviews - a.os.reviews);
  const regionCounts = {};
  for (const l of state.listings) {
    const r = regionForCounty(state, l.county);
    if (r) regionCounts[r.name] = (regionCounts[r.name] || 0) + 1;
  }
  return { pool, rated, C, byReviews, regionCounts, content: stateContent(state.slug) };
}

function post(kind, state, ctx, items, meta) {
  const slugs = { best: 'best-waterfalls-in', beautiful: 'most-beautiful-waterfalls-in', 'must-see': 'must-see-waterfalls-in', hiking: 'best-waterfall-hikes-in', 'most-visited': 'most-visited-waterfalls-in' };
  const slug = `${slugs[kind]}-${state.slug}`;
  return {
    kind, slug, url: `/blog/${slug}`, state, content: ctx.content, items,
    rated: ctx.rated.length, weighted: ctx.C,
    regionsUsed: [...new Set(items.map((i) => i.region?.name).filter(Boolean))],
    imageAlt: `Illustrated waterfall scene for ${meta.short.toLowerCase()} in ${state.name}`,
    ...meta,
  };
}

// ---------- shared "why" sentences ----------
function ratingLine(l, ctx, state) {
  if (!(l.os?.rating && l.os.reviews >= 5)) return null;
  const pos = ctx.byReviews.indexOf(l) + 1;
  return pos === 1
    ? `It is the most reviewed waterfall in ${state.name}, holding ${l.os.rating.toFixed(1)} stars across ${fmt(l.os.reviews)} Google reviews.`
    : pos <= 10
      ? `It holds a ${l.os.rating.toFixed(1)}-star Google rating and is the ${ordinal(pos)} most reviewed in the state, with ${fmt(l.os.reviews)} reviews.`
      : `Visitors rate it ${l.os.rating.toFixed(1)} stars across ${fmt(l.os.reviews)} reviews.`;
}
const fiveShare = (l) => (l.os?.reviewsPerScore?.[5] && l.os.reviews ? l.os.reviewsPerScore[5] / l.os.reviews : null);
function regionLine(l, ctx, state) {
  const r = regionForCounty(state, l.county);
  return r && ctx.regionCounts[r.name] > 1 ? `It is one of ${ctx.regionCounts[r.name]} named falls in the ${r.name} region.` : null;
}
export function townLine(l) {
  return l.cityMiles < 0.5 ? `It is right in ${l.city.name}.` : `The nearest town is ${l.city.name}, about ${mi(l.cityMiles)} to the ${OPP[l.cityDirection] || l.cityDirection}.`;
}
export function usgsLines(l) {
  const out = [];
  if (l.gnisDescription && !isPlss(l.gnisDescription)) out.push(`The USGS gazetteer describes it as: ${end(l.gnisDescription)}`);
  if (l.gnisHistory) out.push(`Name history: ${end(l.gnisHistory)}`);
  if (l.variants?.length) out.push(`Older records also call it ${listJoin(l.variants.slice(0, 2))}.`);
  return out;
}
const item = (l, state, why) => ({ listing: l, region: regionForCounty(state, l.county), why: why.filter(Boolean) });

// ---------- Best ----------
function buildBest(state, ctx) {
  const M = 25;
  const bayes = (l) => (l.os.reviews / (l.os.reviews + M)) * l.os.rating + (M / (l.os.reviews + M)) * ctx.C;
  const picks = [...ctx.rated].sort((a, b) => bayes(b) - bayes(a)).slice(0, 15);
  const documented = ctx.pool
    .filter((l) => !picks.includes(l) && ((l.gnisDescription && !isPlss(l.gnisDescription)) || l.gnisHistory || l.os?.description))
    .sort((a, b) => (b.os?.reviews || 0) - (a.os?.reviews || 0));
  const fill = ctx.pool.filter((l) => !picks.includes(l) && !documented.includes(l)).sort((a, b) => b.score - a.score);
  const target = Math.min(15, Math.max(10, picks.length));
  for (const l of [...documented, ...fill]) { if (picks.length >= target) break; picks.push(l); }
  const items = picks.map((l) => {
    const share = fiveShare(l);
    const pair = l.nearby?.[0];
    return item(l, state, [
      ratingLine(l, ctx, state),
      share >= 0.7 && l.os.reviews >= 20 ? `${Math.round(share * 100)}% of reviewers give it five stars.` : null,
      l.os?.description ? `Google's listing sums it up as: "${l.os.description.replace(/\.$/, '')}."` : null,
      l.os?.reviewTags?.length ? `Reviews most often mention ${listJoin(l.os.reviewTags.slice(0, 4))}.` : null,
      ...usgsLines(l),
      regionLine(l, ctx, state),
      pair && pair.miles <= 3 ? `${pair.listing.name} is only ${mi(pair.miles)} away, so the two are easy to pair in one outing.` : null,
      townLine(l),
    ]);
  });
  const n = items.length;
  return post('best', state, ctx, items, {
    short: 'Best Waterfalls',
    title: `${n} Best Waterfalls in ${state.name} (${BEST_YEAR} Updated)`,
    description: `The ${n} best waterfalls in ${state.name}, ranked by visitor ratings and review volume: ${listJoin(items.slice(0, 3).map((i) => i.listing.name))} and more.`.slice(0, 160),
    method: ctx.rated.length
      ? `We ranked the ${ctx.rated.length} publicly accessible ${state.name} waterfalls with at least five Google reviews by a weighted rating that balances score against review volume, so a 4.9 from a dozen reviewers counts for less than a 4.8 from thousands.${n > ctx.rated.length ? ` Remaining spots go to falls with documented USGS history.` : ''}`
      : `Few ${state.name} waterfalls have enough visitor reviews to rank, so this list favors falls with documented USGS descriptions and history.`,
    whyHeading: 'Why it made the list',
  });
}

// ---------- Most Beautiful ----------
function buildBeautiful(state, ctx) {
  const cands = ctx.rated.filter((l) => l.os.photosCount > 0);
  if (cands.length < 10) return null;
  const avgShare = cands.reduce((s, l) => s + (fiveShare(l) ?? 0.7), 0) / cands.length;
  const maxPhotos = Math.max(...cands.map((l) => Math.log10(l.os.photosCount + 1)));
  const scenicTags = (l) => (l.os.reviewTags || []).filter((t) => SCENIC.test(t));
  const score = (l) => {
    const n5 = l.os.reviewsPerScore?.[5] ?? 0;
    const share = (n5 + 15 * avgShare) / (l.os.reviews + 15);
    const photos = Math.log10(l.os.photosCount + 1) / maxPhotos;
    const scenic = Math.min(1, scenicTags(l).length / 2) + (SCENIC.test(l.os.description || '') ? 0.5 : 0);
    return share * 0.5 + photos * 0.35 + scenic * 0.15;
  };
  const items = [...cands].sort((a, b) => score(b) - score(a)).slice(0, 10).map((l) => {
    const share = fiveShare(l);
    const tags = scenicTags(l);
    const setting = (l.landmarks || []).filter((m) => /Summit|Cliff|Gap|Arch|Pillar|Lake|Glacier|Valley|Basin/.test(m.type)).slice(0, 2);
    const perReview = l.os.photosCount / Math.max(1, l.os.reviews);
    return item(l, state, [
      `Visitors have posted ${fmt(l.os.photosCount)} photos of it on Google${perReview >= 2 ? `, about ${perReview.toFixed(perReview >= 10 ? 0 : 1)} for every review` : ''}.`,
      share != null && l.os.reviews >= 5 ? `${Math.round(share * 100)}% of its ${fmt(l.os.reviews)} reviewers rate it five stars (${l.os.rating.toFixed(1)} average).` : null,
      l.os.description ? `Its listing describes it as: "${l.os.description.replace(/\.$/, '')}."` : null,
      tags.length ? `Reviewers single out its ${listJoin(tags.slice(0, 3))}.` : null,
      setting.length ? `The setting includes ${listJoin(setting.map((m) => `${m.name} (${m.type.toLowerCase()}, ${fmtMiles(m.miles)})`))}.` : null,
      l.gnisHistory ? `Name history: ${end(l.gnisHistory)}` : null,
      regionLine(l, ctx, state),
      townLine(l),
    ]);
  });
  return post('beautiful', state, ctx, items, {
    short: 'Most Beautiful Waterfalls',
    title: `10 Most Beautiful Waterfalls in ${state.name} (${BEST_YEAR} Updated)`,
    description: `The 10 most beautiful waterfalls in ${state.name}, ranked by visitor photos, five-star reviews and scenery: ${listJoin(items.slice(0, 2).map((i) => i.listing.name))} and more.`.slice(0, 160),
    method: `Beauty is subjective, so we let visitors decide. Among ${cands.length} publicly accessible ${state.name} waterfalls with Google reviews and photos, we ranked by three signals: the share of five-star reviews, how many photos visitors have posted, and how often reviews mention scenery and views.`,
    whyHeading: 'Why it is so photogenic',
  });
}

// ---------- Must-See ----------
function buildMustSee(state, ctx) {
  // Weighted rating among popular falls (heavy prior), so this list differs from "Most Visited".
  const popular = ctx.rated.filter((l) => l.os.reviews >= 50).length >= 5 ? ctx.rated.filter((l) => l.os.reviews >= 50) : ctx.rated.filter((l) => l.os.reviews >= 10);
  const M = 150;
  const bayes = (l) => (l.os.reviews / (l.os.reviews + M)) * l.os.rating + (M / (l.os.reviews + M)) * ctx.C;
  // Iconic = consistently loved AND widely visited: weighted rating plus a popularity term.
  const iconic = (l) => bayes(l) + 0.2 * Math.log10(l.os.reviews);
  const cands = [...popular].filter((l) => l.os.rating >= 4.3).sort((a, b) => iconic(b) - iconic(a));
  if (cands.length < 5) return null;
  const picks = [];
  for (const l of cands) {
    if (picks.length >= 5) break;
    if (picks.some((p) => miles(p, l) < 8)) continue;
    picks.push(l);
  }
  for (const l of cands) { if (picks.length >= 5) break; if (!picks.includes(l)) picks.push(l); }
  // Suggested route: start at the northernmost pick, then always go to the nearest unvisited one.
  const route = [picks.reduce((a, b) => (b.lat > a.lat ? b : a))];
  while (route.length < picks.length) {
    const last = route[route.length - 1];
    route.push(picks.filter((p) => !route.includes(p)).sort((a, b) => miles(last, a) - miles(last, b))[0]);
  }
  const legs = route.slice(1).map((l, i) => ({ from: route[i], to: l, miles: miles(route[i], l), dir: bearing(route[i], l) }));
  const items = picks.map((l) => {
    const pos = ctx.byReviews.indexOf(l) + 1;
    const cluster = (l.nearby || []).filter((n) => n.miles <= 15);
    return item(l, state, [
      `It holds ${l.os.rating.toFixed(1)} stars across ${fmt(l.os.reviews)} Google reviews${pos <= 10 ? `, the ${ordinal(pos)} most reviewed waterfall in ${state.name}` : ''}.`,
      l.os.description ? `In short: "${l.os.description.replace(/\.$/, '')}."` : null,
      l.os.reviewTags?.length ? `Expect ${listJoin(l.os.reviewTags.slice(0, 3))}, the topics reviewers bring up most.` : null,
      ...usgsLines(l).slice(0, 1),
      cluster.length ? `${cluster.length} more named waterfall${cluster.length === 1 ? ' lies' : 's lie'} within 15 miles, including ${listJoin(cluster.slice(0, 2).map((n) => n.listing.name))}.` : null,
      regionLine(l, ctx, state),
      townLine(l),
    ]);
  });
  const total = legs.reduce((s, g) => s + g.miles, 0);
  return post('must-see', state, ctx, items, {
    short: 'Must-See Waterfalls',
    title: `5 Must-See Waterfalls in ${state.name} (${BEST_YEAR})`,
    description: `The 5 must-see waterfalls in ${state.name}, chosen for consistently top ratings and spread across the state: ${listJoin(items.map((i) => i.listing.name).slice(0, 2))} and more, plus a route.`.slice(0, 160),
    method: `We ranked popular ${state.name} waterfalls (${popular[0]?.os.reviews >= 50 ? 'at least 50' : 'at least 10'} Google reviews) by a score that combines a weighted rating with how widely visited each one is, then kept no two picks within 8 miles of each other so the five cover more of the state.`,
    whyHeading: 'Why it is a must-see',
    route: { legs, total },
  });
}

// ---------- Hiking ----------
const HIKE = /hik|trail|path|walk|trek|loop/i;
const EASY = /easy|short|flat|paved|accessible|kids|family/i;
const HARD = /steep|elevation|strenuous|rocky|climb|difficult|incline|scramble/i;
function buildHiking(state, ctx) {
  const evidence = (l) => [...(l.os?.reviewTags || []), l.os?.description || ''].filter((t) => HIKE.test(t));
  const cands = ctx.rated.filter((l) => evidence(l).length);
  if (cands.length < 5) return null;
  const M = 15;
  const bayes = (l) => (l.os.reviews / (l.os.reviews + M)) * l.os.rating + (M / (l.os.reviews + M)) * ctx.C;
  const items = [...cands].sort((a, b) => bayes(b) - bayes(a)).slice(0, 10).map((l) => {
    const tags = l.os.reviewTags || [];
    const easy = tags.filter((t) => EASY.test(t));
    const hard = tags.filter((t) => HARD.test(t));
    const cluster = (l.nearby || []).filter((n) => n.miles <= 5);
    const summit = (l.landmarks || []).find((m) => m.type === 'Summit');
    return item(l, state, [
      l.os.description && HIKE.test(l.os.description) ? `On the trail: "${l.os.description.replace(/\.$/, '')}."` : l.os.description ? `"${l.os.description.replace(/\.$/, '')}."` : null,
      easy.length && !hard.length ? `Reviewers describe the hike with words like ${listJoin(easy.slice(0, 3).map((t) => `"${t}"`))}, so it suits most hikers.` : null,
      hard.length && !easy.length ? `Expect effort: reviewers mention ${listJoin(hard.slice(0, 3).map((t) => `"${t}"`))}.` : null,
      hard.length && easy.length ? `Reviews are mixed on difficulty, mentioning both ${listJoin(easy.slice(0, 2).map((t) => `"${t}"`))} and ${listJoin(hard.slice(0, 2).map((t) => `"${t}"`))}.` : null,
      `It is rated ${l.os.rating.toFixed(1)} stars by ${fmt(l.os.reviews)} Google reviewers.`,
      cluster.length ? `${cluster.length} more named waterfall${cluster.length === 1 ? ' is' : 's are'} within 5 miles (${listJoin(cluster.slice(0, 2).map((n) => n.listing.name))}), so there is more to explore nearby.` : null,
      summit ? `${summit.name}, a summit ${fmtMiles(summit.miles)} away, rises above the area.` : null,
      regionLine(l, ctx, state),
      townLine(l),
    ]);
  });
  return post('hiking', state, ctx, items, {
    short: 'Best Waterfall Hikes',
    title: `${items.length} Best Waterfall Hiking Locations in ${state.name} (${BEST_YEAR} Updated)`,
    description: `The ${items.length} best waterfall hikes in ${state.name}, from ${items[0].listing.name} to ${items[items.length - 1].listing.name}, with trail notes from reviews.`.slice(0, 160),
    method: `We started with the ${cands.length} publicly accessible ${state.name} waterfalls whose reviews or listing mention hiking, trails or walks, then ranked them by a weighted Google rating. Difficulty notes quote what reviewers say; always check current trail conditions with the land manager.`,
    whyHeading: 'Why hike it',
  });
}

// ---------- Most Visited ----------
function buildMostVisited(state, ctx) {
  const picks = ctx.byReviews.slice(0, 5);
  if (picks.length < 5) return null;
  const stateReviews = ctx.rated.reduce((s, l) => s + l.os.reviews, 0);
  const topShare = Math.round((picks.reduce((s, l) => s + l.os.reviews, 0) / stateReviews) * 100);
  const items = picks.map((l, i) => {
    const share = fiveShare(l);
    const next = picks[i + 1];
    return item(l, state, [
      `${fmt(l.os.reviews)} Google reviews make it ${i === 0 ? `the most visited waterfall in ${state.name}` : `number ${i + 1} in ${state.name}`}, about ${Math.max(1, Math.round((l.os.reviews / stateReviews) * 100))}% of all reviews of the state's waterfalls.`,
      i === 0 && next ? `That is ${(l.os.reviews / next.os.reviews).toFixed(1)} times as many as ${next.name} in second place.` : null,
      l.os.photosCount ? `Visitors have shared ${fmt(l.os.photosCount)} photos of it.` : null,
      `It averages ${l.os.rating.toFixed(1)} stars${share != null ? `, with ${Math.round(share * 100)}% five-star reviews` : ''}.`,
      l.os.description ? `"${l.os.description.replace(/\.$/, '')}."` : null,
      l.os.reviewTags?.length ? `Reviews most often mention ${listJoin(l.os.reviewTags.slice(0, 3))}.` : null,
      l.os.reviews >= 500 ? 'Expect company: arrive early on weekends and holidays, when parking fills first.' : null,
      townLine(l),
    ]);
  });
  return post('most-visited', state, ctx, items, {
    short: 'Most Visited Waterfalls',
    title: `5 Most Visited Waterfalls in ${state.name} (${BEST_YEAR})`,
    description: `The 5 most visited waterfalls in ${state.name} by Google review count, led by ${items[0].listing.name} with ${fmt(items[0].listing.os.reviews)} reviews. Ratings, photos and crowd tips.`.slice(0, 160),
    method: `Ranked purely by the number of Google reviews, the best public signal of how many people visit. Together these five account for ${topShare}% of all Google reviews of ${state.name} waterfalls.`,
    whyHeading: 'Visitor numbers',
  });
}

// ---------- Easy roadside access (national) ----------
const ACCESS_TAG = /^(easy access|roadside|parking|parking lot|short walk|walk to falls|paved|paved trail|wheelchair|wheelchair accessible|accessible|boardwalk|easy walk|close to parking|observation deck|viewing platform)$/i;
const ACCESS_DESC = /roadside|close to the highway|from the road|next to the road|along (the )?(road|highway)|parking (lot|area)|short(,)? (flat )?(walk|path|stroll)|paved (path|trail|walkway|pathway)|wheelchair|boardwalk|easily accessible|drive-up|by driving/i;
const HIKE_WORDS = /hik|moderate|strenuous|\d+(\.\d+)?[- ]mi\b|mile|steep|staircase|stairs|rock steps/i;
const HARD_TAGS = /steep|strenuous|elevation|rocky trail|climb|difficult|incline/i;
export function accessEvidence(l) {
  const tags = (l.os?.reviewTags || []).filter((t) => ACCESS_TAG.test(t));
  const desc = l.os?.description || '';
  const descHit = ACCESS_DESC.test(desc);
  const strongDesc = /roadside|highway|from the road|accessible from the parking|paved|wheelchair|drive-up|by driving/i.test(desc);
  if (!tags.length && !descHit) return null;
  if ((l.os?.reviewTags || []).some((t) => HARD_TAGS.test(t))) return null;
  if (HIKE_WORDS.test(desc) && !strongDesc) return null;
  return { tags, desc: descHit ? desc : '', stairs: /stair|steps/i.test(desc) };
}
let roadCache = null;
export function getRoadside() {
  if (roadCache) return roadCache;
  const { listings } = loadData();
  const cands = listings.filter((l) => !isPrivate(l) && l.os?.reviews >= 10 && l.os.rating >= 4.3 && accessEvidence(l));
  const votes = cands.reduce((s, l) => s + l.os.reviews, 0);
  const C = cands.reduce((s, l) => s + l.os.rating * l.os.reviews, 0) / votes;
  const M = 50;
  const bayes = (l) => (l.os.reviews / (l.os.reviews + M)) * l.os.rating + (M / (l.os.reviews + M)) * C;
  const items = cands.sort((a, b) => bayes(b) - bayes(a)).slice(0, 25).map((l) => {
    const ev = accessEvidence(l);
    return {
      listing: l,
      why: [
        ev.desc ? `Access: "${ev.desc.replace(/\.$/, '')}."` : null,
        ev.tags.length ? `Reviewers describe it with ${listJoin(ev.tags.map((t) => `"${t}"`))}.` : null,
        ev.stairs ? 'Note that the route includes stairs or steps.' : null,
        `Rated ${l.os.rating.toFixed(1)} stars by ${fmt(l.os.reviews)} Google reviewers.`,
        townLine(l),
      ].filter(Boolean),
    };
  });
  roadCache = {
    slug: 'best-waterfalls-with-easy-roadside-access',
    url: '/blog/best-waterfalls-with-easy-roadside-access',
    title: `${items.length} Best Waterfalls with Easy Roadside Access (${BEST_YEAR})`,
    description: `${items.length} top-rated US waterfalls you can see with little or no hiking: roadside viewpoints, paved paths and short walks from parking, from ${items[0].listing.name} to ${items[1].listing.name}.`.slice(0, 160),
    imageAlt: 'Waterfall close to a road and parking area',
    items, candidates: cands.length, states: [...new Set(items.map((i) => i.listing.state))],
  };
  return roadCache;
}

const BUILDERS = { best: buildBest, beautiful: buildBeautiful, 'must-see': buildMustSee, hiking: buildHiking, 'most-visited': buildMostVisited };

// ---------- Smallest documented waterfalls (national) ----------
// Heights come only from explicit height phrases in USGS gazetteer or Google listing descriptions.
const HEIGHT_RES = [
  /(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\.?\s*(?:high|tall)\b/i,
  /(?:vertical )?drop of (?:approximately |about |approx\. )?(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)/i,
  /(\d+(?:\.\d+)?)[\s-]*(?:ft|foot|feet)\.?[\s-]*(?:high[\s-]*)?(?:waterfall|drop|falls|plunge|cascade)\b/i,
  /approximately (\d+(?:\.\d+)?) feet in height/i,
];
export function statedHeight(l) {
  for (const [source, text] of [['USGS gazetteer', l.gnisDescription], ['Google listing', l.os?.description], ['USGS gazetteer', l.gnisHistory]]) {
    if (!text) continue;
    for (const re of HEIGHT_RES) {
      const m = re.exec(text);
      if (m) return { feet: Number(m[1]), source, text };
    }
  }
  return null;
}
let smallCache = null;
export function getSmallest() {
  if (smallCache) return smallCache;
  const { listings } = loadData();
  const all = listings
    .map((l) => ({ listing: l, h: statedHeight(l) }))
    .filter((x) => x.h && x.h.feet > 0 && !isPrivate(x.listing) && !/private (land|property)/i.test(x.h.text));
  all.sort((a, b) => a.h.feet - b.h.feet || (b.listing.os?.reviews || 0) - (a.listing.os?.reviews || 0));
  const items = all.slice(0, 10);
  smallCache = {
    slug: 'smallest-waterfalls-in-the-us',
    url: '/blog/smallest-waterfalls-in-the-us',
    title: `10 of the Smallest Waterfalls in the US (${BEST_YEAR} Updated)`,
    description: `The 10 smallest named waterfalls in the US with a recorded height, from ${items[0].listing.name} (${items[0].h.feet} ft) to ${items[9].listing.name}, with locations and maps.`.slice(0, 160),
    imageAlt: 'Illustration of a small cascade spilling into a quiet forest pool',
    items, measured: all.length,
  };
  return smallCache;
}

// ---------- Best waterfalls near each state capital ----------
// Only capitals with at least 5 rated (5+ reviews), publicly accessible waterfalls within 100 miles
// in the same state get a page, so none are thin.
import CAPITALS from '../data/capitals.json' with { type: 'json' };
import CITIES from '../../data/us-cities.json' with { type: 'json' };
const CAP_RADIUS = 100;
let capCache = null;
export function getCapitalLists() {
  if (capCache) return capCache;
  const { states, listings } = loadData();
  capCache = [];
  for (const state of states) {
    const capName = CAPITALS[state.code];
    if (!capName) continue;
    const cap = CITIES.find((c) => c.state === state.name && (c.name === capName || c.name === `${capName} City` || c.name.startsWith(`${capName}-`)));
    if (!cap) continue;
    const near = listings
      .filter((l) => l.state === state.name && !isPrivate(l) && l.os?.rating && l.os.reviews >= 5)
      .map((l) => ({ l, d: miles(cap, l) }))
      .filter((x) => x.d <= CAP_RADIUS);
    if (near.length < 5) continue;
    const votes = near.reduce((s, x) => s + x.l.os.reviews, 0);
    const C = near.reduce((s, x) => s + x.l.os.rating * x.l.os.reviews, 0) / votes;
    const M = 25;
    const score = (x) => (x.l.os.reviews / (x.l.os.reviews + M)) * x.l.os.rating + (M / (x.l.os.reviews + M)) * C - 0.004 * x.d;
    const picks = near.sort((a, b) => score(b) - score(a)).slice(0, 10);
    const hub = state.cities.find((c) => c.name === cap.name);
    const items = picks.map(({ l, d }) => {
      const dir = bearing(cap, l);
      const share = fiveShare(l);
      return {
        listing: l,
        miles: d,
        direction: dir,
        why: [
          `${l.name} is about ${mi(d)} ${dir} of ${capName}${l.cityMiles >= 0.5 ? `, near ${l.city.name}` : `, in ${l.city.name}`}.`,
          `Visitors rate it ${l.os.rating.toFixed(1)} stars across ${fmt(l.os.reviews)} Google reviews${share != null && l.os.reviews >= 20 ? `, and ${Math.round(share * 100)}% of them give it five stars` : ''}.`,
          l.os.description ? `In short: "${l.os.description.replace(/\.$/, '')}."` : null,
          l.os.reviewTags?.length ? `Reviews most often mention ${listJoin(l.os.reviewTags.slice(0, 3))}.` : null,
          ...usgsLines(l).slice(0, 1),
        ].filter(Boolean),
      };
    });
    const slug = `best-waterfalls-${slugifyName(capName)}-${state.slug}`;
    const n = items.length;
    capCache.push({
      kind: 'capital',
      slug, url: `/blog/${slug}`, state, capital: capName, cap, hub, items, candidates: near.length,
      short: `Best Waterfalls Near ${capName}`,
      title: `${n} Best Waterfalls Near Me In ${capName} ${state.name}`,
      description: `The ${n} best waterfalls near ${capName}, ${state.name}, within ${CAP_RADIUS} miles: ${listJoin(items.slice(0, 2).map((i) => i.listing.name))} and more, with distances and ratings.`.slice(0, 160),
      method: `We looked at the ${near.length} publicly accessible ${state.name} waterfalls within ${CAP_RADIUS} straight-line miles of ${capName} that have at least five Google reviews, then ranked them by a weighted rating with a small penalty for distance, so a great waterfall close to town edges out an equally rated one far away.`,
    });
  }
  return capCache;
}
const slugifyName = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
