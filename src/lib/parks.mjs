// National Park waterfall guides. Falls are published pages whose coordinates sit inside
// the NPS administrative boundary, plus Hadlock Falls, which the USGS gazetteer places in
// Acadia and which NPS describes from Waterfall Bridge.
// Analysis numbers are computed here from trail files, review counts, USGS heights in the
// gazetteer text, and (when present) a nearby USGS stream gauge. Prose lives in park-copy.mjs.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadData, miles } from './core.mjs';
import { publishedCity, publishedListing } from './publish.mjs';
import { trailFor } from './trails.mjs';
import { tripFacts } from './tripfacts.mjs';
import { statedHeight } from './bestof.mjs';
import { parkRecords, parkNarrative } from './park-copy.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function readJson(rel) {
  const file = path.join(process.cwd(), rel);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

export function parseDistance(text) {
  if (!text) return null;
  const both = String(text).match(/(\d+(?:\.\d+)?)\s+miles?\s+one way\s+\((\d+(?:\.\d+)?)\s+miles?\s+round trip\)/i);
  if (both) return { miles: Number(both[2]), kind: 'round-trip', text: String(text) };
  const frac = String(text).match(/(\d+)\s*\/\s*(\d+)\s+miles?\s+(round trip|one way|loop)/i);
  if (frac) {
    const word = frac[3].toLowerCase();
    const kind = word === 'one way' ? 'one-way' : word === 'loop' ? 'loop' : 'round-trip';
    return { miles: Number(frac[1]) / Number(frac[2]), kind, text: String(text) };
  }
  const feet = String(text).match(/(\d+)\s+feet\s+one way/i);
  if (feet) return { miles: Number(feet[1]) / 5280, kind: 'one-way', text: String(text) };
  const m = String(text).match(/(?:about\s+)?(\d+(?:\.\d+)?)\s+miles?\s+(round trip|one way|loop)/i);
  if (!m) return null;
  const word = m[2].toLowerCase();
  const kind = word === 'one way' ? 'one-way' : word === 'loop' ? 'loop' : 'round-trip';
  return { miles: Number(m[1]), kind, text: String(text) };
}

export function parseElevationFeet(text) {
  if (!text || /descent|modest|more than|at least/i.test(text)) return null;
  const m = String(text).match(/(?:about\s+)?(\d{1,3}(?:,\d{3})*|\d+)\s+feet\b/i);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

function gaugeFor(slug) {
  const all = readJson('data/park-gauges.json');
  const g = all[slug];
  if (!g || !Array.isArray(g.monthlyCfs) || g.monthlyCfs.length !== 12) return null;
  if (g.monthlyCfs.some((n) => !Number.isFinite(n))) return null;
  const peak = Math.max(...g.monthlyCfs);
  const low = Math.min(...g.monthlyCfs);
  return {
    ...g,
    months: MONTHS,
    peakMonth: MONTHS[g.monthlyCfs.indexOf(peak)],
    lowMonth: MONTHS[g.monthlyCfs.indexOf(low)],
    peakCfs: peak,
    lowCfs: low,
  };
}

function imagesFor(slug) {
  const all = readJson('data/park-images.json');
  const list = all[slug];
  if (!Array.isArray(list)) return [];
  const banned = {
    'kings-canyon': /oregon|multnomah|columbia gorge|highway 14|acorn|quercus|national forest/i,
    sequoia: /yosemite|mariposa grove/i,
    'cuyahoga-valley': /chagrin|metroparks/i,
    acadia: /journal|europe, 1824|king visiting/i,
    'death-valley': /coyote canyon|flash flood/i,
  };
  const re = banned[slug];
  return list.filter((img) => img?.src && img.alt && img.credit && !(re && re.test(`${img.caption} ${img.fileTitle} ${img.alt}`)));
}

function fallRecord(url, override) {
  const l = loadData().listings.find((x) => x.url === url);
  if (!l || !publishedListing(l)) return null;
  const trail = trailFor(url);
  const trip = tripFacts(url);
  const stated = statedHeight(l);
  const height = stated && stated.source === 'USGS gazetteer' ? stated : null;
  const distanceText = override?.distanceText || trail?.distance?.text || null;
  const parsed = override?.miles
    ? { miles: override.miles, kind: override.distanceKind, text: override.distanceText }
    : parseDistance(distanceText);
  const elevationText = override?.elevationText || trail?.elevationGain || null;
  return {
    name: l.name,
    url: l.url,
    state: l.state,
    stateCode: l.stateCode,
    stateSlug: l.stateSlug,
    county: l.county,
    city: l.city?.name || '',
    cityUrl: l.city && publishedCity(l.city) ? l.city.url : `/states/${l.stateSlug}#gazetteer`,
    cityMiles: l.cityMiles,
    lat: l.lat,
    lng: l.lng,
    reviews: l.os?.reviews || 0,
    rating: l.os?.rating || null,
    heightFeet: height ? height.feet : null,
    gnis: l.gnisDescription || '',
    trailName: override?.trailName || trail?.name || null,
    distanceText,
    miles: parsed?.miles ?? null,
    distanceKind: parsed?.kind || null,
    elevationText,
    elevationFeet: parseElevationFeet(elevationText),
    difficulty: override?.difficulty || trail?.difficulty || null,
    season: trip?.bestSeason || null,
    trailSources: [
      ...(override?.sourceUrl ? [{ title: override.sourceTitle, url: override.sourceUrl }] : []),
      ...((trail?.sources || []).map((s) => ({ title: s.title, url: s.url }))),
    ],
    tripSources: (trip?.sources || []).filter((s) => Array.isArray(s) && s[1]).map(([title, href]) => ({ title, url: href })),
  };
}

function nearestNeighbor(falls) {
  if (falls.length < 2) return falls.map((f) => f.name);
  const start = falls.slice().sort((a, b) => b.lat - a.lat)[0];
  const left = new Set(falls.filter((f) => f !== start));
  const order = [start];
  while (left.size) {
    const cur = order[order.length - 1];
    let best = null;
    let bestD = Infinity;
    for (const f of left) {
      const d = miles(cur, f);
      if (d < bestD) { bestD = d; best = f; }
    }
    left.delete(best);
    order.push(best);
  }
  return order.map((f) => f.name);
}

function analyze(falls) {
  const ranked = falls
    .filter((f) => f.reviews > 0 && f.miles > 0)
    .map((f) => ({ ...f, score: f.reviews / f.miles }))
    .sort((a, b) => b.score - a.score || b.reviews - a.reviews);
  const withMiles = falls.filter((f) => f.miles > 0);
  const byTrail = new Map();
  for (const f of withMiles) {
    if (!f.trailName) continue;
    if (!byTrail.has(f.trailName)) byTrail.set(f.trailName, []);
    byTrail.get(f.trailName).push(f);
  }
  const sharedTrails = [...byTrail.entries()].filter(([, list]) => list.length > 1).map(([name, list]) => ({
    name,
    falls: list.map((f) => f.name),
    miles: Math.max(...list.map((f) => f.miles)),
  }));
  const sharedNames = new Set(sharedTrails.flatMap((t) => t.falls));
  let milesSum = sharedTrails.reduce((s, t) => s + t.miles, 0);
  for (const f of withMiles) if (!sharedNames.has(f.name)) milesSum += f.miles;
  const elevs = falls.filter((f) => f.elevationFeet != null);
  const nearPairs = [];
  for (let i = 0; i < falls.length; i++) {
    for (let j = i + 1; j < falls.length; j++) {
      const d = miles(falls[i], falls[j]);
      if (d <= 1) nearPairs.push({ a: falls[i].name, b: falls[j].name, miles: d });
    }
  }
  nearPairs.sort((a, b) => a.miles - b.miles);
  const byReviews = falls.filter((f) => f.reviews > 0).sort((a, b) => b.reviews - a.reviews);
  const towns = [];
  for (const f of falls) {
    if (!f.city) continue;
    let t = towns.find((x) => x.url === f.cityUrl);
    if (!t) towns.push(t = { name: f.city, url: f.cityUrl, state: f.stateCode, count: 0, miles: f.cityMiles });
    t.count += 1;
    t.miles = Math.min(t.miles, f.cityMiles);
  }
  towns.sort((a, b) => a.miles - b.miles);
  return {
    ranked,
    easiest: withMiles.slice().sort((a, b) => a.miles - b.miles)[0] || null,
    busiest: byReviews[0] || null,
    quietest: byReviews.length > 1 ? byReviews[byReviews.length - 1] : null,
    totalReviews: falls.reduce((s, f) => s + f.reviews, 0),
    seeAll: {
      miles: milesSum,
      counted: withMiles.length,
      missing: falls.filter((f) => !(f.miles > 0)).map((f) => f.name),
      elevationFeet: elevs.reduce((s, f) => s + f.elevationFeet, 0),
      elevationCount: elevs.length,
      order: nearestNeighbor(falls),
      sharedTrails,
      nearPairs: nearPairs.slice(0, 4),
      pairMiles: falls.length === 2 ? miles(falls[0], falls[1]) : null,
    },
    towns,
  };
}

let cache = null;
export function getParks() {
  if (cache) return cache;
  cache = parkRecords.map((rec) => {
    const falls = rec.falls.map((f) => fallRecord(f.url, rec.overrides?.[f.url])).filter(Boolean);
    const analysis = analyze(falls);
    const gauge = gaugeFor(rec.slug);
    const images = imagesFor(rec.slug);
    const ctx = { ...analysis, falls, gauge, name: rec.name };
    const narrative = parkNarrative(rec.slug, ctx);
    const sources = [];
    const add = (title, url) => {
      if (!url || sources.some((s) => s.url === url)) return;
      sources.push({ title, url });
    };
    add('NPS administrative boundaries', 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/ArcGIS/rest/services/National_Park_Service_Boundaries/FeatureServer/0');
    add(rec.name, rec.npsUrl);
    for (const s of rec.sources || []) add(s.title, s.url);
    for (const f of falls) {
      for (const s of f.trailSources) add(s.title, s.url);
      for (const s of f.tripSources) add(s.title, s.url);
    }
    if (gauge) add(`USGS ${gauge.site} ${gauge.name}`, gauge.url);
    for (const img of images) add(img.fileTitle || 'Photograph', img.sourceUrl);
    return {
      ...rec,
      url: `/national-parks/${rec.slug}`,
      falls,
      analysis,
      gauge,
      images,
      narrative,
      sources,
    };
  }).filter((p) => p.falls.length > 0 && p.narrative?.overview?.length);
  return cache;
}

export function getPark(slug) {
  return getParks().find((p) => p.slug === slug) || null;
}

export function parkForListing(url) {
  return getParks().find((p) => p.falls.some((f) => f.url === url)) || null;
}

export function parksForState(stateSlug) {
  return getParks().filter((p) => p.falls.some((f) => f.stateSlug === stateSlug));
}

export function parkQualifies(p) {
  if (!p?.falls?.length || !p.narrative?.overview?.length) return false;
  const words = JSON.stringify(p.narrative).split(/\s+/).length;
  return p.falls.length >= 2 || words >= 350;
}

export const MONTH_NAMES = MONTHS;
