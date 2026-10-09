// Page-specific facts computed from the directory data, so every state and town page says
// something true about that place alone. Editorial state copy lives in src/content/states/*.json.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadData, miles } from './core.mjs';

const fm = (m) => (m < 10 ? m.toFixed(1) : String(Math.round(m)));
const pct = (n, d) => Math.round((n / d) * 100);

export function stateContent(slug) {
  const file = path.join(process.cwd(), 'src/content/states', `${slug}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

export function regionForCounty(state, county) {
  const c = stateContent(state.slug);
  if (!c || !county) return null;
  return c.regions?.find((r) => r.counties.some((x) => x.toLowerCase() === county.toLowerCase())) || null;
}

const TAG_GROUPS = {
  swim: { label: 'Swimming holes', re: /swimming|swim hole|jump|wading|pool/i },
  easy: { label: 'Easy access', re: /easy (hike|access|walk|trail)|short (hike|walk)|roadside|parking lot|accessible|paved/i },
  family: { label: 'Family friendly', re: /kids|children|family/i },
  dogs: { label: 'Dog friendly', re: /dog/i },
};
export function tagMatches(l, key) {
  return (l.os?.reviewTags || []).some((t) => TAG_GROUPS[key].re.test(t)) || (key === 'swim' && /swimming hole/i.test(l.os?.description || ''));
}

export function stateInsights(state) {
  const { states, listings } = loadData();
  const ls = state.listings;
  const ranked = [...states].sort((a, b) => b.listings.length - a.listings.length);
  const rated = ls.filter((l) => l.os?.rating && l.os.reviews > 0);
  const totalReviews = rated.reduce((s, l) => s + l.os.reviews, 0);
  const weightedAvg = totalReviews ? rated.reduce((s, l) => s + l.os.rating * l.os.reviews, 0) / totalReviews : 0;
  const mostReviewed = [...rated].sort((a, b) => b.os.reviews - a.os.reviews).slice(0, 5);
  const topRated = rated.filter((l) => l.os.reviews >= 25).sort((a, b) => b.os.rating - a.os.rating || b.os.reviews - a.os.reviews).slice(0, 5);
  const by = (f) => ls.reduce((best, l) => (f(l) > f(best) ? l : best), ls[0]);
  const extremes = ls.length > 2
    ? [
        { label: 'Northernmost', l: by((l) => l.lat) },
        { label: 'Southernmost', l: by((l) => -l.lat) },
        { label: 'Easternmost', l: by((l) => l.lng) },
        { label: 'Westernmost', l: by((l) => -l.lng) },
      ]
    : [];
  const spanMiles = ls.length > 1 ? Math.max(...extremes.flatMap((a) => extremes.map((b) => miles(a.l, b.l)))) : 0;
  const busiestTown = [...state.cities].sort((a, b) => b.nearby.filter((n) => n.miles <= 30).length - a.nearby.filter((n) => n.miles <= 30).length)[0];
  const nameCounts = {};
  for (const l of ls) nameCounts[l.name] = (nameCounts[l.name] || 0) + 1;
  const repeatedNames = Object.entries(nameCounts).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const tagCounts = Object.fromEntries(Object.keys(TAG_GROUPS).map((k) => [k, ls.filter((l) => tagMatches(l, k))]));
  const withVariants = ls.filter((l) => l.variants?.length);
  const withNotes = ls.filter((l) => l.gnisDescription || l.gnisHistory);
  const historyPick = ls.find((l) => l.gnisHistory && l.gnisHistory.length > 60);
  const counties = state.counties.map((c) => {
    const best = [...c.listings].sort((a, b) => (b.os?.reviews || 0) - (a.os?.reviews || 0))[0];
    return { ...c, best, share: pct(c.listings.length, ls.length) };
  });
  return {
    count: ls.length,
    rank: ranked.indexOf(state) + 1,
    share: ((ls.length / listings.length) * 100).toFixed(1),
    rated, totalReviews, weightedAvg, mostReviewed, topRated, extremes, spanMiles, busiestTown,
    repeatedNames, tagCounts, withVariants, withNotes, historyPick, counties,
    top3CountyShare: pct(counties.slice(0, 3).reduce((s, c) => s + c.listings.length, 0), ls.length),
  };
}

const DIR_ORDER = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

// USGS marks features that no longer exist (drowned by dams, quarried away) as "(historical)".
export const isHistorical = (l) => /\(historical\)/i.test(l.name);

export function cityInsights(city) {
  const current = city.nearby.filter((n) => !isHistorical(n.listing));
  const near = current.length ? current : city.nearby;
  const w30 = near.filter((n) => n.miles <= 30);
  const pool = w30.length >= 3 ? w30 : near.slice(0, 12);
  const bands = [
    { label: 'Within 10 miles', items: near.filter((n) => n.miles <= 10) },
    { label: '10 to 20 miles', items: near.filter((n) => n.miles > 10 && n.miles <= 20) },
    { label: '20 to 30 miles', items: near.filter((n) => n.miles > 20 && n.miles <= 30) },
  ];
  const dirCount = Object.fromEntries(DIR_ORDER.map((d) => [d, 0]));
  for (const n of pool) dirCount[n.direction]++;
  const dirs = Object.entries(dirCount).sort((a, b) => b[1] - a[1]);
  const dominant = dirs[0][1] >= Math.max(3, pool.length * 0.4) ? dirs[0][0] : null;
  const rated = pool.filter((n) => n.listing.os?.rating && n.listing.os.reviews >= 10);
  const picks = [];
  if (pool[0]) picks.push({ label: 'Closest', n: pool[0], why: `${fm(pool[0].miles)} miles ${pool[0].direction} of ${city.name}` });
  const top = [...rated].sort((a, b) => b.listing.os.rating - a.listing.os.rating || b.listing.os.reviews - a.listing.os.reviews)[0];
  if (top) picks.push({ label: 'Highest rated', n: top, why: `${top.listing.os.rating.toFixed(1)} stars from ${top.listing.os.reviews.toLocaleString('en-US')} Google reviews` });
  const most = [...pool].filter((n) => n.listing.os?.reviews).sort((a, b) => b.listing.os.reviews - a.listing.os.reviews)[0];
  if (most && most !== top) picks.push({ label: 'Most visited', n: most, why: `${most.listing.os.reviews.toLocaleString('en-US')} Google reviews, the most near ${city.name}` });
  for (const key of ['swim', 'easy', 'family']) {
    const hit = pool.find((n) => tagMatches(n.listing, key) && !picks.some((p) => p.n === n));
    if (hit) picks.push({ label: TAG_GROUPS[key].label, n: hit, why: `Visitors mention ${hit.listing.os.reviewTags.filter((t) => TAG_GROUPS[key].re.test(t)).slice(0, 2).join(' and ') || 'swimming'}` });
  }
  const documented = pool.find((n) => n.listing.gnisHistory || (n.listing.gnisDescription && !/^Located in sec/i.test(n.listing.gnisDescription)));
  if (documented && !picks.some((p) => p.n === documented)) picks.push({ label: 'With recorded history', n: documented, why: 'Has a USGS description or naming history' });
  const counties = {};
  for (const n of pool) if (n.listing.county) counties[n.listing.county] = (counties[n.listing.county] || 0) + 1;
  const countyList = Object.entries(counties).sort((a, b) => b[1] - a[1]);
  const { states } = loadData();
  const state = states.find((s) => s.name === city.state);
  const townRank = [...state.cities]
    .sort((a, b) => b.nearby.filter((n) => n.miles <= 30).length - a.nearby.filter((n) => n.miles <= 30).length)
    .indexOf(city) + 1;
  const ratedAll = pool.filter((n) => n.listing.os?.rating && n.listing.os.reviews > 0);
  const avgRating = ratedAll.length ? ratedAll.reduce((s, n) => s + n.listing.os.rating, 0) / ratedAll.length : 0;
  const avgMiles = pool.length ? pool.reduce((s, n) => s + n.miles, 0) / pool.length : 0;
  const homeCounty = city.county;
  const region = regionForCounty(state, homeCounty) || regionForCounty(state, countyList[0]?.[0]);
  const otherStates = [...new Set(near.filter((n) => n.miles <= 40).map((n) => n.listing.state))].filter((s) => s !== city.state);
  return { w30, pool, bands, dirCount, dominant, picks, countyList, townRank, townTotal: state.cities.length, avgRating, ratedCount: ratedAll.length, avgMiles, region, state, otherStates };
}

// Deterministic choice between phrasings so neighbouring pages don't read identically.
export function vary(key, options) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}
