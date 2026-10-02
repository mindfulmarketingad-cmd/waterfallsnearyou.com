// Core data model shared by the Astro build and the asset scripts.
// Sources: USGS GNIS "Falls" features (data/gnis-waterfalls.json), GeoNames US cities (data/us-cities.json)
// and any Outscraper Google Maps export normalized into data/outscraper.json.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd(); // build always runs from the project root
const readJson = (rel, fallback) => {
  const file = path.join(ROOT, rel);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
};

export const STATE_CODES = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT',
  Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};
const CODE_TO_STATE = Object.fromEntries(Object.entries(STATE_CODES).map(([n, c]) => [c, n]));

export function slugify(str) {
  return String(str)
    .normalize('NFKD')
    .replace(/[̀-ͯʻʼ'’`]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const RADIUS = 3958.8;
const rad = (d) => (d * Math.PI) / 180;
export function miles(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIUS * Math.asin(Math.sqrt(h));
}
const DIRS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
export function bearing(from, to) {
  const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return DIRS[Math.round(deg / 45) % 8];
}

function dmsToText(dms, isLat) {
  const m = /^(\d{2,3})(\d{2})(\d{2})([NSEW])$/.exec(dms || '');
  if (!m) return '';
  return `${Number(m[1])}°${m[2]}′${m[3]}″ ${m[4]}`;
}
function decToDms(dec, isLat) {
  const hemi = isLat ? (dec >= 0 ? 'N' : 'S') : dec >= 0 ? 'E' : 'W';
  let v = Math.abs(dec);
  const d = Math.floor(v); v = (v - d) * 60;
  const m = Math.floor(v); const s = Math.round((v - m) * 60);
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″ ${hemi}`;
}
function usDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  return m ? `${m[3]}-${m[1]}-${m[2]}` : '';
}

// ---------- Outscraper matching ----------
const STOP = new Set(['falls', 'fall', 'waterfall', 'waterfalls', 'the', 'of', 'cascade', 'cascades', 'and', 'at', 'trail', 'trailhead']);
const tokens = (s) => slugify(s).split('-').filter((t) => t && !STOP.has(t));
function nameScore(a, b) {
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return slugify(a) === slugify(b) ? 1 : 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

let cache = null;

export function loadData() {
  if (cache) return cache;
  const gnis = readJson('data/gnis-waterfalls.json', []);
  const cities = readJson('data/us-cities.json', []);
  const outscraper = readJson('data/outscraper.json', []);

  // ---- Base listings from GNIS ----
  const listings = gnis.map((g) => ({
    source: 'gnis',
    gnisId: g.gnisId,
    name: g.name,
    state: g.state,
    stateCode: g.stateCode,
    county: g.county,
    lat: g.lat,
    lng: g.lng,
    latText: dmsToText(g.latDms) || decToDms(g.lat, true),
    lngText: dmsToText(g.lngDms) || decToDms(g.lng, false),
    topoMap: g.topoMap,
    gnisCreated: usDate(g.created),
    gnisEdited: usDate(g.edited),
    bgnDate: usDate(g.bgnDate),
    gnisDescription: g.description,
    gnisHistory: g.history,
    variants: g.variants,
    landmarks: g.landmarks,
    os: null,
  }));

  // ---- Merge Outscraper records (match to GNIS waterfall, else add as new listing) ----
  for (const rec of outscraper) {
    if (typeof rec.lat !== 'number' || typeof rec.lng !== 'number') continue;
    const stateName = CODE_TO_STATE[rec.stateCode] || rec.state;
    let best = null, bestScore = 0;
    for (const l of listings) {
      if (Math.abs(l.lat - rec.lat) > 0.05 || Math.abs(l.lng - rec.lng) > 0.06) continue;
      const d = miles(l, rec);
      const ns = nameScore(l.name, rec.name);
      const score = d < 0.12 ? 1 + ns : d < 0.9 && ns >= 0.5 ? ns + (0.9 - d) : 0;
      if (score > bestScore && !l.os) { best = l; bestScore = score; }
    }
    if (best) {
      best.os = rec;
      continue;
    }
    if (!STATE_CODES[stateName]) continue;
    listings.push({
      source: 'outscraper', gnisId: null, name: rec.name, state: stateName, stateCode: STATE_CODES[stateName],
      county: rec.county || '', lat: rec.lat, lng: rec.lng, latText: decToDms(rec.lat, true), lngText: decToDms(rec.lng, false),
      topoMap: '', gnisCreated: '', gnisEdited: '', bgnDate: '', gnisDescription: '', gnisHistory: '', variants: [], landmarks: [], os: rec,
    });
  }

  // ---- City assignment (nearest GeoNames place with 1,000+ residents in the same state) ----
  const citiesByState = new Map();
  for (const c of cities) {
    if (!citiesByState.has(c.state)) citiesByState.set(c.state, []);
    citiesByState.get(c.state).push(c);
  }
  for (const l of listings) {
    let best = null, bestD = Infinity;
    for (const c of citiesByState.get(l.state) || []) {
      const d = miles(l, c);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (l.os?.city && l.source === 'outscraper') {
      const named = (citiesByState.get(l.state) || []).find((c) => slugify(c.name) === slugify(l.os.city));
      if (named) { best = named; bestD = miles(l, named); }
    }
    l.cityRef = best;
    l.cityMiles = bestD;
    if (!l.county && best) l.county = best.county;
  }

  // ---- States ----
  const stateMap = new Map();
  for (const l of listings) {
    if (!stateMap.has(l.state)) {
      stateMap.set(l.state, { name: l.state, code: l.stateCode, slug: slugify(l.state), url: `/states/${slugify(l.state)}`, listings: [], cities: [], counties: [] });
    }
    stateMap.get(l.state).listings.push(l);
  }

  // ---- Cities (unique slug per state) ----
  const cityMap = new Map();
  for (const st of stateMap.values()) {
    const used = new Map();
    for (const l of st.listings) {
      const c = l.cityRef;
      const key = `${c.name}|${c.lat}|${c.lng}`;
      if (!cityMap.has(key)) {
        let slug = slugify(c.name);
        if (used.has(slug) && used.get(slug) !== key) slug = `${slug}-${slugify(c.county)}`;
        used.set(slug, key);
        const city = { name: c.name, county: c.county, lat: c.lat, lng: c.lng, state: st.name, stateCode: st.code, stateSlug: st.slug, slug, url: `/${st.slug}/${slug}`, assigned: [], nearby: [] };
        cityMap.set(key, city);
        st.cities.push(city);
      }
      l.city = cityMap.get(key);
      l.city.assigned.push(l);
    }
  }

  // ---- Listing slugs and URLs ----
  for (const city of cityMap.values()) {
    const used = new Set();
    for (const l of city.assigned.sort((a, b) => a.name.localeCompare(b.name))) {
      let slug = slugify(l.name) || 'waterfall';
      if (used.has(slug)) slug = `${slug}-${slugify(l.county) || l.gnisId}`;
      let n = 2;
      while (used.has(slug)) slug = `${slugify(l.name)}-${n++}`;
      used.add(slug);
      l.slug = slug;
      l.stateSlug = slugify(l.state);
      l.url = `${city.url}/${slug}`;
      l.id = `${l.stateSlug}--${city.slug}--${slug}`;
      l.cityDirection = l.cityMiles < 0.5 ? '' : bearing(city, l);
    }
  }
  // Partner (Outscraper import) slugs: /partners/[business name]
  const partnerUsed = new Set();
  for (const l of listings) {
    if (!l.os) continue;
    let s = slugify(l.os.name || l.name);
    if (partnerUsed.has(s)) s = `${s}-${l.city.slug}-${l.stateCode.toLowerCase()}`;
    partnerUsed.add(s);
    l.partnerSlug = s;
  }

  // ---- Spatial index for nearby lookups ----
  const grid = new Map();
  const gkey = (lat, lng) => `${Math.floor(lat / 0.5)}:${Math.floor(lng / 0.5)}`;
  for (const l of listings) {
    const k = gkey(l.lat, l.lng);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(l);
  }
  const within = (pt, maxMiles, exclude) => {
    const out = [];
    const spanY = Math.ceil(maxMiles / 34) + 1;
    const spanX = Math.ceil(maxMiles / (34.5 * Math.max(0.2, Math.cos(rad(pt.lat))))) + 1;
    const [cy, cx] = [Math.floor(pt.lat / 0.5), Math.floor(pt.lng / 0.5)];
    for (let dy = -spanY; dy <= spanY; dy++) for (let dx = -spanX; dx <= spanX; dx++) {
      for (const l of grid.get(`${cy + dy}:${cx + dx}`) || []) {
        if (l === exclude) continue;
        const d = miles(pt, l);
        if (d <= maxMiles) out.push({ listing: l, miles: d, direction: bearing(pt, l) });
      }
    }
    return out.sort((a, b) => a.miles - b.miles);
  };

  for (const l of listings) {
    l.nearby = within(l, 40, l).slice(0, 10);
    l.score = scoreListing(l);
  }
  for (const city of cityMap.values()) {
    city.nearby = within(city, 30, null);
    if (city.nearby.length < 6) city.nearby = within(city, 60, null).slice(0, Math.max(city.nearby.length, 12));
    city.nearbyCities = [];
  }
  // Nearby city hubs (same state) for internal linking
  for (const st of stateMap.values()) {
    for (const c of st.cities) {
      c.nearbyCities = st.cities
        .filter((o) => o !== c)
        .map((o) => ({ city: o, miles: miles(c, o) }))
        .sort((a, b) => a.miles - b.miles)
        .slice(0, 8);
    }
    st.cities.sort((a, b) => b.assigned.length - a.assigned.length || a.name.localeCompare(b.name));
    st.listings.sort(compareListings);
    // Counties
    const counties = new Map();
    for (const l of st.listings) {
      if (!l.county) continue;
      if (!counties.has(l.county)) counties.set(l.county, { name: l.county, slug: `${slugify(l.county)}-county`, listings: [] });
      counties.get(l.county).listings.push(l);
    }
    st.counties = [...counties.values()].sort((a, b) => b.listings.length - a.listings.length || a.name.localeCompare(b.name));
    st.center = {
      lat: st.listings.reduce((s, l) => s + l.lat, 0) / st.listings.length,
      lng: st.listings.reduce((s, l) => s + l.lng, 0) / st.listings.length,
    };
  }

  const states = [...stateMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  const allCities = [...cityMap.values()];

  cache = { listings, states, cities: allCities, within, hasOutscraper: outscraper.length > 0 };
  return cache;
}

function scoreListing(l) {
  let s = 0;
  if (l.os?.reviews) s += Math.log10(l.os.reviews + 1) * (l.os.rating || 3);
  if (l.os?.photo) s += 1;
  if (l.gnisDescription || l.gnisHistory) s += 1.5;
  if (l.variants?.length) s += 0.3;
  return s;
}
export function compareListings(a, b) {
  return b.score - a.score || a.name.localeCompare(b.name);
}

export function hoursSummary(os) {
  if (!os?.hours?.length) return '';
  if (os.hours.every((h) => /24 hours/i.test(h.hours))) return 'Open 24 hours';
  const uniq = [...new Set(os.hours.map((h) => h.hours))];
  if (uniq.length === 1) return `Daily: ${uniq[0]}`;
  return os.hours.map((h) => `${h.day.slice(0, 3)} ${h.hours}`).join(' · ');
}
export { DAY_ORDER };

export const imageFor = (url) => `/images/gen${url === '/' ? '/home' : url}.webp`;

export function staticPagePaths() {
  return ['/', '/states', '/blog', '/search', '/about', '/contact', '/disclaimer', '/privacy', '/terms', '/sitemap'];
}
