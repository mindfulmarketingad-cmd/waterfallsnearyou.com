// Build data/fish/catalog.json from public occurrence records.
//
// A species is tied to a published waterfall only when all of these are true:
//   1. The waterfall sits within 500 m of a named USGS NHDPlus HR flowline.
//   2. A GBIF fish occurrence uses that same stream or water-body name in its
//      water body, locality, or verbatim locality.
//   3. The occurrence coordinate is within 5 km of the waterfall.
//   4. The occurrence year is 2005–2026.
//   5. The license is CC0 or CC BY (not NC, ND, or SA).
//   6. If a coordinate uncertainty is published, it is 5 km or less.
//
// USGS NAS is used only to flag states where the database has a nonindigenous
// record. It is not used as evidence that a fish was recorded at a waterfall.
//
// Re-run:
//   node scripts/fetch-fish.mjs
//   node scripts/fetch-fish.mjs --streams-only
//   node scripts/fetch-fish.mjs --occurrences-only
//   node scripts/fetch-fish.mjs --enrich-only
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData, slugify } from '../src/lib/core.mjs';
import { publishedListing } from '../src/lib/publish.mjs';

const YEAR_MIN = 2005;
const YEAR_MAX = 2026;
const RADIUS_KM = 5;
const STREAM_MAX_M = 500;
const UNCERTAINTY_MAX_M = 5000;
const PAGE_MIN_FALLS = 5;
const ACCESSED = '2026-11-19';
const UA = 'WaterfallsNearYou/1.0 (contact@waterfallsnearyou.com)';

const ROOT = process.cwd();
const CACHE = path.join(ROOT, 'data/fish/cache');
const IMG = path.join(ROOT, 'public/images/fish');
mkdirSync(CACHE, { recursive: true });
mkdirSync(IMG, { recursive: true });

const args = new Set(process.argv.slice(2));
const streamsOnly = args.has('--streams-only');
const occurrencesOnly = args.has('--occurrences-only');
const enrichOnly = args.has('--enrich-only');

const FISH_ORDERS = [
  ['Acipenseriformes', 1103], ['Amiiformes', 494], ['Anguilliformes', 495], ['Atheriniformes', 496],
  ['Clupeiformes', 538], ['Cypriniformes', 1153], ['Cyprinodontiformes', 547], ['Esociformes', 548],
  ['Gasterosteiformes', 550], ['Lepisosteiformes', 1167], ['Osmeriformes', 1068], ['Perciformes', 587],
  ['Percopsiformes', 1310], ['Petromyzontiformes', 771], ['Salmoniformes', 1313], ['Scorpaeniformes', 590],
  ['Siluriformes', 708], ['Synbranchiformes', 889], ['Osteoglossiformes', 1069], ['Characiformes', 537],
  ['Gobiesociformes', 1163], ['Beloniformes', 498], ['Mugiliformes', 1067],
];
const ORDER_KEYS = new Set(FISH_ORDERS.map(([, k]) => k));
const ORDER_NAME = new Map(FISH_ORDERS.map(([n, k]) => [k, n]));

const WATER = new Set(['river', 'creek', 'brook', 'stream', 'branch', 'run', 'fork', 'lake', 'pond', 'slough', 'wash', 'arroyo', 'bayou', 'kill', 'canal', 'inlet', 'outlet', 'reservoir']);
const BARE_FORK = /^(north|south|east|west|middle) fork$/;

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data));

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function usableStream(name) {
  const n = norm(name);
  if (!n || BARE_FORK.test(n)) return false;
  const tokens = n.split(' ').filter((t) => !WATER.has(t) && t !== 'of' && t !== 'the' && t !== 'and');
  return tokens.some((t) => t.length >= 3 && !['north', 'south', 'east', 'west', 'middle'].includes(t));
}

function streamPhrases(name) {
  const n = norm(name);
  const phrases = new Set([n]);
  const swap = (from, to) => {
    const next = n.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    if (next !== n) phrases.add(next.replace(/\s+/g, ' ').trim());
  };
  swap('creek', 'cr');
  swap('creek', 'ck');
  swap('brook', 'brk');
  swap('branch', 'br');
  swap('fork', 'fk');
  return [...phrases].filter((p) => p.length >= 6);
}

const NAME_MODIFIER = /^(north|south|east|west|middle|upper|lower|little|big|fork|branch|arm|prong|nf|sf|ef|wf|mf)$/;
const WATER_AFTER = /^(river|creek|brook|fork|branch|lake|pond|run|slough)$/;

export function textHasStream(text, name) {
  const blob = norm(text);
  if (!blob) return false;
  return streamPhrases(name).some((phrase) => {
    let from = 0;
    while (from <= blob.length) {
      const at = blob.indexOf(phrase, from);
      if (at < 0) return false;
      const beforeOk = at === 0 || blob[at - 1] === ' ';
      const end = at + phrase.length;
      const afterOk = end === blob.length || blob[end] === ' ';
      if (beforeOk && afterOk) {
        const prior = blob.slice(0, at).trim().split(' ').filter(Boolean);
        const next = blob.slice(end).trim().split(' ').filter(Boolean)[0] || '';
        const prev = prior[prior.length - 1] || '';
        const prev2 = prior.slice(-2).join(' ');
        const extraModifier = NAME_MODIFIER.test(prev) || /^(north|south|east|west|middle|upper|lower) fork$/.test(prev2);
        if (!extraModifier && !WATER_AFTER.test(next)) return true;
      }
      from = at + Math.max(phrase.length, 1);
    }
    return false;
  });
}

function kmBetween(a, b) {
  const R = 6371.0088;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function metersToSegment(p, a, b) {
  const lat0 = (p.lat * Math.PI) / 180;
  const kx = 111320 * Math.cos(lat0);
  const ky = 110540;
  const px = p.lng * kx;
  const py = p.lat * ky;
  const ax = a[0] * kx;
  const ay = a[1] * ky;
  const bx = b[0] * kx;
  const by = b[1] * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function featureMeters(point, feature) {
  const paths = feature.geometry?.paths || [];
  let best = Infinity;
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) best = Math.min(best, metersToSegment(point, path[i - 1], path[i]));
  }
  return best;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function getJson(url, tries = 4, timeout = 40000) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(timeout) });
      if (res.status === 429 || res.status >= 500) {
        console.error(`  retry ${res.status} in ${8 * (i + 1)}s`);
        await sleep(8000 * (i + 1));
        last = new Error(`${res.status} ${url.slice(0, 140)}`);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 180)}`);
      return await res.json();
    } catch (err) {
      last = err;
      await sleep(800 * (i + 1));
    }
  }
  throw last;
}

function publishedFalls() {
  return loadData().listings.filter(publishedListing).map((l) => ({
    id: l.id,
    name: l.name,
    url: l.url,
    state: l.state,
    stateCode: l.stateCode,
    county: l.county || '',
    city: l.city?.name || '',
    lat: l.lat,
    lng: l.lng,
  }));
}

async function nearestStream(fall, tries = 1) {
  const dlat = 500 / 110540;
  const dlng = 500 / (111320 * Math.max(0.2, Math.cos((fall.lat * Math.PI) / 180)));
  const params = new URLSearchParams({
    geometry: `${fall.lng - dlng},${fall.lat - dlat},${fall.lng + dlng},${fall.lat + dlat}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'gnisidlabel,gnisid,streamorder',
    returnGeometry: 'true',
    f: 'json',
    resultRecordCount: '40',
  });
  // 3DHP answers; the NHDPlus HR MapServer query endpoint was timing out.
  const url = `https://hydro.nationalmap.gov/arcgis/rest/services/3DHP_all/FeatureServer/50/query?${params}`;
  const data = await getJson(url, tries, 25000);
  if (data.error) throw new Error(data.error.message || 'NHD query failed');
  const named = [];
  for (const feature of data.features || []) {
    const name = feature.attributes?.gnisidlabel;
    if (!usableStream(name)) continue;
    const meters = featureMeters(fall, feature);
    if (!Number.isFinite(meters) || meters > STREAM_MAX_M) continue;
    named.push({
      name: String(name).replace(/\s+/g, ' ').trim(),
      gnisId: feature.attributes.gnisid ? String(feature.attributes.gnisid) : '',
      order: feature.attributes.streamorder || 0,
      meters: Math.round(meters),
    });
  }
  named.sort((a, b) => a.meters - b.meters || b.order - a.order);
  if (!named.length) return null;
  const best = named[0];
  const tie = named.find((n) => n.meters <= best.meters + 25 && n.order > best.order);
  return tie || best;
}

async function resolveStreams(falls) {
  const file = path.join(CACHE, 'streams.json');
  const cache = readJson(file, {});
  const pending = falls.filter((f) => !cache[f.id]);
  let n = 0;
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= pending.length) return;
      const fall = pending[i];
      try {
        const stream = await nearestStream(fall);
        cache[fall.id] = stream || { name: null };
        n++;
        if (n % 5 === 0) {
          writeJson(file, cache);
          const named = Object.values(cache).filter((s) => s?.name).length;
          console.log(`streams ${n}/${pending.length} fetched, ${named} named, last ${fall.name}: ${stream?.name || 'none'}`);
        }
      } catch (err) {
        console.error('stream failed', fall.name, err.message);
        cache[fall.id] = { name: null, error: true };
        n++;
      }
      await sleep(80);
    }
  };
  await Promise.all([worker()]);
  const missed = falls.filter((f) => !cache[f.id] || cache[f.id].error);
  if (missed.length) console.log(`retrying ${missed.length} stream lookups`);
  for (const fall of missed) {
    try {
      cache[fall.id] = (await nearestStream(fall, 2)) || { name: null };
    } catch (err) {
      console.error('stream gave up', fall.name, err.message);
      cache[fall.id] = { name: null, error: true };
    }
    await sleep(150);
  }
  writeJson(file, cache);
  const named = falls.filter((f) => cache[f.id]?.name).length;
  console.log(`streams done: ${named} of ${falls.length} published falls have a named flowline within ${STREAM_MAX_M} m`);
  return cache;
}

function cellKey(fall) {
  return `${Math.floor(fall.lat / 0.25)}:${Math.floor(fall.lng / 0.25)}`;
}

function cellPolygon(falls) {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const f of falls) {
    minLat = Math.min(minLat, f.lat);
    maxLat = Math.max(maxLat, f.lat);
    minLng = Math.min(minLng, f.lng);
    maxLng = Math.max(maxLng, f.lng);
  }
  const padLat = RADIUS_KM / 110.574;
  const mid = ((minLat + maxLat) / 2) * Math.PI / 180;
  const padLng = RADIUS_KM / (111.320 * Math.max(0.2, Math.cos(mid)));
  minLat -= padLat;
  maxLat += padLat;
  minLng -= padLng;
  maxLng += padLng;
  const ring = [
    [minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat],
  ];
  return `POLYGON((${ring.map(([x, y]) => `${x.toFixed(5)} ${y.toFixed(5)}`).join(',')}))`;
}

function licenseName(url) {
  const u = String(url || '').toLowerCase();
  if (!u) return null;
  if (u.includes('/publicdomain/zero/') || u.includes('cc0')) return 'CC0 1.0';
  if (/\/licenses\/by\/4\.0/.test(u) || u.includes('cc-by/4') || u.includes('cc_by_4')) return 'CC BY 4.0';
  if (/\/licenses\/by\/3\.0/.test(u)) return 'CC BY 3.0';
  if (/\/licenses\/by\/2\.[05]/.test(u)) return 'CC BY 2.0';
  if (u.includes('creativecommons.org/licenses/by-nc') || u.includes('by-nc') || u.includes('by_nc')) return null;
  if (u.includes('by-sa') || u.includes('by-nd') || u.includes('by_sa') || u.includes('by_nd')) return null;
  return null;
}

function binomialOf(rec) {
  const raw = rec.species || '';
  const parts = raw.replace(/[()]/g, ' ').trim().split(/\s+/);
  if (parts.length < 2) return null;
  if (!/^[A-Z][a-záéíóúü-]+$/.test(parts[0])) return null;
  if (!/^[a-z][a-záéíóúü-]+$/.test(parts[1])) return null;
  if (parts[1] === 'sp' || parts.includes('x')) return null;
  return `${parts[0]} ${parts[1]}`;
}

function recordText(rec) {
  return [
    ['waterBody', rec.waterBody],
    ['verbatimWaterBody', rec.verbatimWaterBody],
    ['locality', rec.locality],
    ['verbatimLocality', rec.verbatimLocality],
  ].filter(([, v]) => v && String(v).trim());
}

function acceptRecord(rec) {
  if (!licenseName(rec.license)) return false;
  // GBIF marks many current iNaturalist rows DETECTED rather than PRESENT.
  // ABSENT is an explicit non-detection and is not evidence the species was recorded.
  if (rec.occurrenceStatus === 'ABSENT') return false;
  if (rec.basisOfRecord === 'FOSSIL_SPECIMEN') return false;
  const year = rec.year;
  if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) return false;
  const unc = rec.coordinateUncertaintyInMeters;
  if (typeof unc === 'number' && unc > UNCERTAINTY_MAX_M) return false;
  if (typeof rec.decimalLatitude !== 'number' || typeof rec.decimalLongitude !== 'number') return false;
  if (!binomialOf(rec)) return false;
  if (rec.taxonRank && !['SPECIES', 'SUBSPECIES', 'VARIETY', 'FORM'].includes(rec.taxonRank)) return false;
  return true;
}

function emptyFallMatch() {
  return {
    count: 0,
    yearMin: null,
    yearMax: null,
    kmMin: null,
    kmMax: null,
    datasets: {},
    fields: {},
    example: '',
    licenses: {},
  };
}

function mergeBucket(dest, src) {
  for (const [species, sp] of Object.entries(src)) {
    if (!dest[species]) {
      dest[species] = sp;
      continue;
    }
    const target = dest[species];
    if (!target.family && sp.family) target.family = sp.family;
    if (!target.order && sp.order) target.order = sp.order;
    if (!target.speciesKey && sp.speciesKey) target.speciesKey = sp.speciesKey;
    if (!target.anyKey && sp.anyKey) target.anyKey = sp.anyKey;
    for (const media of sp.media) {
      if (target.media.length < 4 && !target.media.some((m) => m.identifier === media.identifier)) target.media.push(media);
    }
    for (const [id, row] of Object.entries(sp.falls)) {
      if (!target.falls[id]) target.falls[id] = row;
    }
  }
}

function addMatch(bucket, fall, rec, field, example) {
  const species = binomialOf(rec);
  if (!bucket[species]) {
    bucket[species] = {
      scientificName: species,
      family: rec.family || '',
      order: rec.order || ORDER_NAME.get(rec.orderKey) || '',
      speciesKey: rec.taxonRank === 'SPECIES' ? rec.speciesKey : null,
      anyKey: rec.speciesKey || rec.taxonKey || null,
      media: [],
      falls: {},
    };
  }
  const sp = bucket[species];
  if (!sp.family && rec.family) sp.family = rec.family;
  if (!sp.order && rec.order) sp.order = rec.order;
  if (rec.taxonRank === 'SPECIES' && rec.speciesKey) sp.speciesKey = rec.speciesKey;
  if (!sp.anyKey && (rec.speciesKey || rec.taxonKey)) sp.anyKey = rec.speciesKey || rec.taxonKey;
  const media = (rec.media || []).find((m) => m.type === 'StillImage' && licenseName(m.license) && m.identifier);
  if (media && sp.media.length < 4 && !sp.media.some((m) => m.identifier === media.identifier)) {
    sp.media.push({
      identifier: media.identifier,
      references: media.references || '',
      creator: media.creator || media.rightsHolder || '',
      license: licenseName(media.license),
      licenseUrl: media.license,
      publisher: media.publisher || 'iNaturalist',
    });
  }
  if (!sp.falls[fall.id]) sp.falls[fall.id] = emptyFallMatch();
  const row = sp.falls[fall.id];
  row.count += 1;
  row.yearMin = row.yearMin == null ? rec.year : Math.min(row.yearMin, rec.year);
  row.yearMax = row.yearMax == null ? rec.year : Math.max(row.yearMax, rec.year);
  const dist = kmBetween(fall, { lat: rec.decimalLatitude, lng: rec.decimalLongitude });
  row.kmMin = row.kmMin == null ? dist : Math.min(row.kmMin, dist);
  row.kmMax = row.kmMax == null ? dist : Math.max(row.kmMax, dist);
  const dkey = rec.datasetKey || 'unknown';
  if (!row.datasets[dkey]) row.datasets[dkey] = { key: dkey, name: rec.datasetName || 'GBIF dataset', count: 0 };
  row.datasets[dkey].count += 1;
  row.fields[field] = (row.fields[field] || 0) + 1;
  const lic = licenseName(rec.license);
  row.licenses[lic] = (row.licenses[lic] || 0) + 1;
  if (!row.example && example) row.example = String(example).replace(/\s+/g, ' ').trim().slice(0, 180);
}

async function searchPage(polygon, offset, streamName) {
  const params = new URLSearchParams();
  params.set('geometry', polygon);
  params.set('hasCoordinate', 'true');
  params.set('year', `${YEAR_MIN},${YEAR_MAX}`);
  params.set('limit', '300');
  params.set('offset', String(offset));
  if (streamName) params.set('q', streamName);
  for (const key of ORDER_KEYS) params.append('taxonKey', String(key));
  // GBIF rejects unknown license enums such as CC_BY_2_0. CC0 and CC BY 4.0
  // are the licenses the occurrence index actually facets on for these records.
  for (const lic of ['CC0_1_0', 'CC_BY_4_0']) params.append('license', lic);
  const url = `https://api.gbif.org/v1/occurrence/search?${params}`;
  return getJson(url);
}

async function consumePages(polygon, group, cellBucket, streams, firstPage, count, label, streamName) {
  let page = firstPage;
  let offset = 0;
  let pages = 0;
  const seen = new Set();
  for (;;) {
    for (const rec of page.results || []) {
      if (!rec.gbifID || seen.has(rec.gbifID) || !acceptRecord(rec)) continue;
      seen.add(rec.gbifID);
      const texts = recordText(rec);
      if (!texts.length) continue;
      for (const fall of group) {
        const stream = streams[fall.id]?.name;
        if (!stream) continue;
        const hit = texts.find(([, value]) => textHasStream(value, stream));
        if (!hit) continue;
        const dist = kmBetween(fall, { lat: rec.decimalLatitude, lng: rec.decimalLongitude });
        if (dist > RADIUS_KM) continue;
        addMatch(cellBucket, fall, rec, hit[0], hit[1]);
      }
    }
    pages++;
    offset += (page.results || []).length;
    if (page.endOfRecords || !(page.results || []).length || offset >= count) break;
    if (pages > 40) {
      console.log(`  stopping ${label} at 40 pages (${count} records)`);
      break;
    }
    await sleep(280);
    page = await searchPage(polygon, offset, streamName);
  }
  return { records: count, pages };
}

async function pageFalls(group, cellBucket, streams, label) {
  const polygon = cellPolygon(group);
  const first = await searchPage(polygon, 0);
  const count = first.count || 0;
  console.log(`  ${label} falls ${group.length} records ${count}`);
  // Coastal boxes pull in tens of thousands of marine records. Ask GBIF for the
  // stream name first; if that actually narrows the hit list, page the narrow query.
  if (count > 12000) {
    const narrowed = [];
    for (const fall of group) {
      const stream = streams[fall.id]?.name;
      if (!stream) continue;
      const probe = await searchPage(polygon, 0, stream);
      const narrowedCount = probe.count || 0;
      console.log(`  name probe ${stream}: ${narrowedCount}`);
      if (narrowedCount > 0 && narrowedCount < count * 0.5 && narrowedCount <= 6000) {
        narrowed.push({ fall, probe, count: narrowedCount });
      }
      await sleep(300);
    }
    if (narrowed.length) {
      let pages = 1;
      for (const item of narrowed) {
        const sub = await consumePages(polygon, [item.fall], cellBucket, streams, item.probe, item.count, `${label}:${item.fall.name}`, streams[item.fall.id].name);
        pages += sub.pages;
      }
      return { records: count, pages, narrowed: true };
    }
    console.log(`  skipping full page of ${count}; stream-name probe did not narrow it`);
    return { records: count, pages: 1, skippedDense: true };
  }
  if (count > 20000 && group.length > 1) {
    const sorted = [...group].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
    const mid = Math.ceil(sorted.length / 2);
    const left = await pageFalls(sorted.slice(0, mid), cellBucket, streams, `${label}a`);
    const right = await pageFalls(sorted.slice(mid), cellBucket, streams, `${label}b`);
    return { records: count, pages: left.pages + right.pages };
  }
  return consumePages(polygon, group, cellBucket, streams, first, count, label);
}

async function harvestOccurrences(falls, streams) {
  const matchFile = path.join(CACHE, 'matches.json');
  const doneFile = path.join(CACHE, 'cells-done.json');
  const bucket = readJson(matchFile, {});
  const done = readJson(doneFile, {});
  const groups = new Map();
  for (const fall of falls) {
    if (!streams[fall.id]?.name) continue;
    const key = cellKey(fall);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fall);
  }
  console.log(`GBIF cells: ${groups.size}, already done ${Object.keys(done).length}`);
  let i = 0;
  for (const [key, group] of groups) {
    i++;
    if (done[key]) continue;
    const cellBucket = {};
    try {
      const stats = await pageFalls(group, cellBucket, streams, `${key}`);
      mergeBucket(bucket, cellBucket);
      done[key] = { ...stats, at: new Date().toISOString() };
      writeJson(matchFile, bucket);
      writeJson(doneFile, done);
      console.log(`  saved cell ${key}; species so far ${Object.keys(bucket).length}`);
    } catch (err) {
      console.error('cell failed', key, err.message);
    }
    await sleep(150);
  }
  return bucket;
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function commonsOk(info) {
  const meta = info.extmetadata || {};
  const short = stripHtml(meta.LicenseShortName?.value || '');
  const terms = stripHtml(meta.UsageTerms?.value || '');
  const blob = `${short} ${terms}`.toLowerCase();
  const title = info.title || '';
  if (/map|icon|diagram|logo|range|distribution|coat of arms|skeleton only|drawing of a coin/i.test(title) && !/photograph/i.test(title)) return null;
  if (info.mime && !/^image\/(jpeg|png|webp|gif|tiff)$/.test(info.mime)) return null;
  if ((info.size || 0) > 25_000_000) return null;
  const nc = /noncommercial|\bnc\b|noderiv|\bnd\b|all rights reserved/.test(blob);
  const url = stripHtml(meta.LicenseUrl?.value || '');
  if (/cc0|public domain/.test(blob) && !/noncommercial/.test(blob)) {
    return { name: /cc0/.test(blob) ? 'CC0 1.0' : (short || 'Public domain'), url, shareAlike: false };
  }
  if (nc) return null;
  if (/cc by-sa|cc-by-sa|attribution-share/.test(blob)) {
    return { name: short || 'CC BY-SA', url, shareAlike: true };
  }
  if (/cc by|attribution/.test(blob)) return { name: short || 'CC BY', url, shareAlike: false };
  if (/government work|u\.s\. fish|noaa|fws|usda|public-domain/.test(blob)) {
    return { name: short || 'Public domain (U.S. government work)', url, shareAlike: false };
  }
  return null;
}

async function commonsByTitle(title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title.startsWith('File:') ? title : `File:${title}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*',
  });
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const page = Object.values(data.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  info.title = page.title || title;
  const lic = commonsOk(info);
  if (!lic) return null;
  const meta = info.extmetadata || {};
  return {
    download: info.thumburl || info.url,
    sourceUrl: info.descriptionurl,
    creator: stripHtml(meta.Artist?.value || ''),
    credit: stripHtml(meta.Credit?.value || ''),
    license: lic.name,
    licenseUrl: lic.url,
    shareAlike: lic.shareAlike,
    source: 'Wikimedia Commons',
  };
}

async function commonsSearch(scientificName) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${scientificName} fish`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*',
  });
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const pages = Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    info.title = page.title || '';
    if (!norm(info.title).includes(norm(scientificName).split(' ')[1] || '')) continue;
    const lic = commonsOk(info);
    if (!lic) continue;
    const meta = info.extmetadata || {};
    return {
      download: info.thumburl || info.url,
      sourceUrl: info.descriptionurl,
      creator: stripHtml(meta.Artist?.value || ''),
      credit: stripHtml(meta.Credit?.value || ''),
      license: lic.name,
      licenseUrl: lic.url,
      shareAlike: lic.shareAlike,
      source: 'Wikimedia Commons',
    };
  }
  return null;
}

async function downloadWebp(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4000) throw new Error('image too small');
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  if ((meta.width || 0) < 320 || (meta.height || 0) < 200) throw new Error('image dimensions too small');
  await img.resize(960, 960, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 74 }).toFile(dest);
}

async function wikidataFacts(names) {
  const values = names.map((n) => `"${n}"`).join(' ');
  const query = `
SELECT ?name ?len ?unit ?iucnLabel ?habitatLabel ?image ?common WHERE {
  VALUES ?name { ${values} }
  ?item wdt:P225 ?name.
  OPTIONAL { ?item p:P2043 [ psv:P2043 [ wikibase:quantityAmount ?len; wikibase:quantityUnit ?unit ] ] }
  OPTIONAL { ?item wdt:P141 ?iucn }
  OPTIONAL { ?item wdt:P2974 ?habitat }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P1843 ?common FILTER(LANG(?common) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error(`wikidata ${res.status}`);
  const data = await res.json();
  const out = {};
  for (const row of data.results.bindings) {
    const name = row.name.value;
    if (!out[name]) out[name] = { habitats: [], commons: [], lengthCm: null, iucn: '', commonsFile: '' };
    const fact = out[name];
    if (row.common?.value && !fact.common) fact.common = row.common.value;
    if (row.habitatLabel?.value && !fact.habitats.includes(row.habitatLabel.value)) fact.habitats.push(row.habitatLabel.value);
    if (row.iucnLabel?.value && row.iucnLabel.value !== 'iucn') fact.iucn = row.iucnLabel.value;
    if (row.image?.value) {
      const file = decodeURIComponent(row.image.value.split('/').pop() || '').replace(/_/g, ' ');
      if (file && !fact.commonsFile) fact.commonsFile = file;
    }
    if (row.len?.value && fact.lengthCm == null) {
      const n = Number(row.len.value);
      const unit = row.unit?.value || '';
      if (Number.isFinite(n) && n > 0) {
        // Q11573 metre, Q174728 centimetre, Q174789 millimetre. Unknown units are ignored.
        const cm = unit.endsWith('Q11573') ? n * 100 : unit.endsWith('Q174728') ? n : unit.endsWith('Q174789') ? n / 10 : null;
        if (cm && cm > 1 && cm < 2000) fact.lengthCm = Math.round(cm * 10) / 10;
      }
    }
  }
  return out;
}

function barrierFromExtract(extract) {
  if (!extract) return null;
  const sentences = extract.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => (
    /\b(waterfall|waterfalls|falls|fish passage|migration barrier|impassable)\b/i.test(s)
    && /\b(upstream|downstream|barrier|pass|migration|dam|population|spawn)\b/i.test(s)
    && s.length < 400
  ));
  if (!hit) return null;
  if (/\b(cannot|unable|impassable|prevents?|blocks?|blocked|restrict|barrier to)\b/i.test(hit)) {
    return 'blocks';
  }
  if (/\b(leap|leaps|jump|jumps|ascend|can pass|able to pass|surmount)\b/i.test(hit)) return 'passes';
  return null;
}

async function wikiExtract(scientificName) {
  const readPage = async (extra) => {
    const params = new URLSearchParams({
      action: 'query',
      redirects: '1',
      prop: 'extracts|info',
      inprop: 'url',
      explaintext: '1',
      format: 'json',
      ...extra,
    });
    const data = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
    const page = Object.values(data.query?.pages || {}).find((p) => p && !p.missing && p.pageid > 0 && p.extract);
    if (!page) return null;
    return {
      title: page.title,
      url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(String(page.title).replace(/ /g, '_'))}`,
      barrier: barrierFromExtract(page.extract || ''),
    };
  };
  const direct = await readPage({ titles: scientificName });
  if (direct) return direct;
  return readPage({ generator: 'search', gsrsearch: scientificName, gsrlimit: '1' });
}

const FISHING_PAGES = {
  AL: ['Alabama', 'https://www.outdooralabama.com/fishing/freshwater-fishing-creel-and-size-limits'],
  AK: ['Alaska', 'https://www.adfg.alaska.gov/index.cfm?adfg=fishregulations.main'],
  AZ: ['Arizona', 'https://www.azgfd.com/fishing/'],
  AR: ['Arkansas', 'https://www.agfc.com/fishing/'],
  CA: ['California', 'https://wildlife.ca.gov/Fishing'],
  CO: ['Colorado', 'https://cpw.state.co.us/fishing'],
  CT: ['Connecticut', 'https://portal.ct.gov/deep/fishing/freshwater-fishing-in-connecticut'],
  DE: ['Delaware', 'https://dnrec.delaware.gov/fish-wildlife/fishing/'],
  DC: ['District of Columbia', 'https://doee.dc.gov/service/fishing-district'],
  FL: ['Florida', 'https://myfwc.com/fishing/freshwater/'],
  GA: ['Georgia', 'https://georgiawildlife.com/fishing/angler-resources'],
  HI: ['Hawaii', 'https://dlnr.hawaii.gov/dar/fishing/fishing-regulations/'],
  ID: ['Idaho', 'https://idfg.idaho.gov/fish'],
  IL: ['Illinois', 'https://www.ifishillinois.org/'],
  IN: ['Indiana', 'https://www.in.gov/dnr/fish-and-wildlife/fishing/'],
  IA: ['Iowa', 'https://www.iowadnr.gov/things-do/fishing'],
  KS: ['Kansas', 'https://ksoutdoors.gov/Fishing'],
  KY: ['Kentucky', 'https://fw.ky.gov/Fish/Pages/default.aspx'],
  LA: ['Louisiana', 'https://www.wlf.louisiana.gov/page/fishing'],
  ME: ['Maine', 'https://www.maine.gov/ifw/fishing-boating/fishing/index.html'],
  MD: ['Maryland', 'https://dnr.maryland.gov/fisheries/pages/default.aspx'],
  MA: ['Massachusetts', 'https://www.mass.gov/freshwater-fishing'],
  MI: ['Michigan', 'https://www.michigan.gov/dnr/things-to-do/fishing'],
  MN: ['Minnesota', 'https://www.dnr.state.mn.us/fishing/index.html'],
  MS: ['Mississippi', 'https://www.mdwfp.com/fishing-boating/'],
  MO: ['Missouri', 'https://mdc.mo.gov/fishing'],
  MT: ['Montana', 'https://fwp.mt.gov/fish'],
  NE: ['Nebraska', 'https://outdoornebraska.gov/fish/'],
  NV: ['Nevada', 'https://www.ndow.org/fish/'],
  NH: ['New Hampshire', 'https://www.wildlife.nh.gov/fishing-new-hampshire'],
  NJ: ['New Jersey', 'https://dep.nj.gov/njfw/fishing/'],
  NM: ['New Mexico', 'https://www.wildlife.state.nm.us/fishing/'],
  NY: ['New York', 'https://dec.ny.gov/things-to-do/freshwater-fishing'],
  NC: ['North Carolina', 'https://www.ncwildlife.gov/fishing'],
  ND: ['North Dakota', 'https://gf.nd.gov/fishing'],
  OH: ['Ohio', 'https://ohiodnr.gov/buy-and-apply/hunting-fishing-boating/fishing-resources'],
  OK: ['Oklahoma', 'https://www.wildlifedepartment.com/fishing'],
  OR: ['Oregon', 'https://myodfw.com/fishing'],
  PA: ['Pennsylvania', 'https://www.pa.gov/agencies/fishandboat/fishing'],
  RI: ['Rhode Island', 'https://dem.ri.gov/natural-resources-bureau/fish-wildlife/freshwater-fishing'],
  SC: ['South Carolina', 'https://www.dnr.sc.gov/fishing.html'],
  SD: ['South Dakota', 'https://gfp.sd.gov/fishing/'],
  TN: ['Tennessee', 'https://www.tn.gov/twra.html'],
  TX: ['Texas', 'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/'],
  UT: ['Utah', 'https://wildlife.utah.gov/fishing.html'],
  VT: ['Vermont', 'https://vtfishandwildlife.com/fish'],
  VA: ['Virginia', 'https://dwr.virginia.gov/fishing/'],
  WA: ['Washington', 'https://wdfw.wa.gov/fishing'],
  WV: ['West Virginia', 'https://wvdnr.gov/fishing/'],
  WI: ['Wisconsin', 'https://dnr.wisconsin.gov/topic/Fishing'],
  WY: ['Wyoming', 'https://wgfd.wyo.gov/fishing-and-boating'],
};

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaterfallsNearYou/1.0; +https://www.waterfallsnearyou.com/)' },
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function nasSpeciesIndex() {
  const file = path.join(CACHE, 'nas-species.json');
  const cached = readJson(file, null);
  if (cached) return cached;
  const index = {};
  let offset = 0;
  for (;;) {
    const page = await getJson(`https://nas.er.usgs.gov/api/v2/species/search?group=Fishes&limit=200&offset=${offset}`);
    for (const row of page.results || []) {
      if (row.subspecies) continue;
      const name = `${row.genus} ${row.species}`.trim();
      if (!index[name]) index[name] = row;
    }
    if (String(page.endOfRecords) === 'true' || !(page.results || []).length) break;
    offset += (page.results || []).length;
    await sleep(150);
  }
  writeJson(file, index);
  console.log('NAS fish species indexed', Object.keys(index).length);
  return index;
}

async function nasStates(scientificName, states) {
  const [genus, species] = scientificName.split(' ');
  const out = {};
  for (const state of states) {
    const page = await getJson(`https://nas.er.usgs.gov/api/v2/occurrence/search?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}&state=${encodeURIComponent(state)}&limit=100`);
    const rows = page.results || [];
    if (!rows.length && !(page.count > 0)) {
      out[state] = { count: 0, statuses: [], yearMin: null, yearMax: null };
    } else {
      const years = rows.map((r) => r.year).filter((y) => Number.isInteger(y));
      const statuses = [...new Set(rows.map((r) => r.status).filter(Boolean))];
      out[state] = {
        count: page.count || rows.length,
        statuses,
        yearMin: years.length ? Math.min(...years) : null,
        yearMax: years.length ? Math.max(...years) : null,
        sampled: rows.length,
      };
    }
    await sleep(120);
  }
  return out;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

async function buildCatalog(falls, streams, bucket) {
  const byId = Object.fromEntries(falls.map((f) => [f.id, f]));
  const speciesNames = Object.keys(bucket).sort();
  console.log('species with at least one matched fall', speciesNames.length);
  const facts = {};
  for (let i = 0; i < speciesNames.length; i += 25) {
    const chunk = speciesNames.slice(i, i + 25);
    try {
      Object.assign(facts, await wikidataFacts(chunk));
    } catch (err) {
      console.error('wikidata chunk failed', err.message);
    }
    await sleep(400);
  }
  const nasIndex = await nasSpeciesIndex();
  const neededStates = new Set();
  for (const name of speciesNames) {
    for (const id of Object.keys(bucket[name].falls)) {
      const fall = byId[id];
      if (fall) neededStates.add(fall.stateCode);
    }
  }
  const regulations = {};
  for (const code of [...neededStates].sort()) {
    const entry = FISHING_PAGES[code];
    if (!entry) continue;
    const status = await checkUrl(entry[1]);
    console.log('fishing', code, status, entry[1]);
    if (status >= 200 && status < 400) regulations[code] = { state: entry[0], url: entry[1], checked: ACCESSED };
    await sleep(80);
  }

  const species = [];
  let photos = 0;
  for (const name of speciesNames) {
    const raw = bucket[name];
    const fallRows = [];
    for (const [id, row] of Object.entries(raw.falls)) {
      const fall = byId[id];
      const stream = streams[id];
      if (!fall || !stream?.name || !row.count) continue;
      fallRows.push({
        id,
        name: fall.name,
        url: fall.url,
        state: fall.state,
        stateCode: fall.stateCode,
        county: fall.county,
        city: fall.city,
        stream: stream.name,
        streamGnisId: stream.gnisId || '',
        streamMeters: stream.meters,
        recordCount: row.count,
        yearMin: row.yearMin,
        yearMax: row.yearMax,
        kmMin: round1(row.kmMin),
        kmMax: round1(row.kmMax),
        datasets: Object.values(row.datasets).sort((a, b) => b.count - a.count),
        fields: row.fields,
        licenses: row.licenses,
        example: row.example,
      });
    }
    fallRows.sort((a, b) => b.recordCount - a.recordCount || a.name.localeCompare(b.name));
    if (!fallRows.length) continue;
    if (!raw.family || !raw.order || !raw.speciesKey) {
      try {
        const match = await getJson(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}&kingdom=Animalia`);
        raw.family = raw.family || match.family || '';
        raw.order = raw.order || match.order || '';
        if (!raw.speciesKey && match.usageKey) raw.speciesKey = match.usageKey;
        await sleep(80);
      } catch (err) {
        console.error('species match failed', name, err.message);
      }
    }
    const states = [...new Set(fallRows.map((f) => f.stateCode))].sort();
    let nas = null;
    const nasRow = nasIndex[name];
    if (nasRow || true) {
      try {
        const byState = await nasStates(name, states);
        const flagged = Object.values(byState).some((s) => s.count > 0);
        nas = {
          speciesId: nasRow?.speciesID || null,
          commonName: nasRow?.common_name || '',
          nativeExotic: nasRow?.native_exotic || '',
          profileUrl: nasRow ? `https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=${nasRow.speciesID}` : '',
          byState,
          flagged,
        };
      } catch (err) {
        console.error('NAS failed', name, err.message);
        nas = { speciesId: nasRow?.speciesID || null, commonName: nasRow?.common_name || '', nativeExotic: nasRow?.native_exotic || '', byState: {}, flagged: false, error: true };
      }
    }
    let wiki = null;
    try {
      wiki = await wikiExtract(name);
    } catch (err) {
      console.error('wiki failed', name, err.message);
    }
    await sleep(200);
    const fact = facts[name] || {};
    const common = (nas?.commonName || fact.common || '').replace(/\s+/g, ' ').trim();
    const slug = slugify(name);
    let photo = null;
    const dest = path.join(IMG, `${slug}.webp`);
    const candidates = [];
    if (fact.commonsFile) candidates.push({ kind: 'commons-title', title: fact.commonsFile });
    candidates.push({ kind: 'commons-search' });
    for (const media of raw.media) {
      if (licenseName(media.licenseUrl) || media.license?.startsWith('CC0') || media.license?.startsWith('CC BY')) {
        candidates.push({ kind: 'inat', media });
      }
    }
    for (const candidate of candidates) {
      try {
        let picked = null;
        if (candidate.kind === 'commons-title') picked = await commonsByTitle(candidate.title);
        else if (candidate.kind === 'commons-search') picked = await commonsSearch(name);
        else {
          const media = candidate.media;
          const large = media.identifier.replace('/original.', '/large.');
          picked = {
            download: large,
            sourceUrl: media.references || large,
            creator: media.creator,
            credit: media.creator,
            license: media.license,
            licenseUrl: media.licenseUrl,
            shareAlike: false,
            source: media.publisher || 'iNaturalist',
          };
        }
        if (!picked?.download) continue;
        await downloadWebp(picked.download, dest);
        const who = picked.creator || picked.credit || 'photographer not named';
        photo = {
          src: `/images/fish/${slug}.webp`,
          alt: `Photograph of ${common || name} (${name})`,
          creator: who,
          credit: picked.credit || who,
          license: picked.license,
          licenseUrl: picked.licenseUrl || '',
          sourceUrl: picked.sourceUrl,
          source: picked.source,
          shareAlike: !!picked.shareAlike,
        };
        photos++;
        console.log('photo', name, picked.source, picked.license);
        break;
      } catch (err) {
        console.error('photo candidate failed', name, err.message);
      }
      await sleep(150);
    }
    const recordCount = fallRows.reduce((s, f) => s + f.recordCount, 0);
    const years = fallRows.flatMap((f) => [f.yearMin, f.yearMax]);
    const datasets = new Map();
    for (const f of fallRows) {
      for (const d of f.datasets) {
        const prev = datasets.get(d.key) || { key: d.key, name: d.name, count: 0 };
        prev.count += d.count;
        datasets.set(d.key, prev);
      }
    }
    species.push({
      slug,
      scientificName: name,
      commonName: common,
      family: raw.family || '',
      order: raw.order || '',
      gbifSpeciesKey: raw.speciesKey || raw.anyKey || null,
      fallsCount: fallRows.length,
      recordCount,
      yearMin: Math.min(...years),
      yearMax: Math.max(...years),
      states,
      page: fallRows.length >= PAGE_MIN_FALLS,
      nas,
      photo,
      facts: {
        lengthCm: typeof fact.lengthCm === 'number' && fact.lengthCm > 0 && fact.lengthCm < 2000 ? fact.lengthCm : null,
        habitats: (fact.habitats || []).slice(0, 8),
        iucn: fact.iucn || '',
        barrier: wiki?.barrier ? { kind: wiki.barrier, title: wiki.title, url: wiki.url, license: 'CC BY-SA 4.0', accessed: ACCESSED } : null,
      },
      datasets: [...datasets.values()].sort((a, b) => b.count - a.count),
      waterfalls: fallRows,
    });
  }
  species.sort((a, b) => b.fallsCount - a.fallsCount || (a.commonName || a.scientificName).localeCompare(b.commonName || b.scientificName));
  const fallsWithFish = new Set(species.flatMap((s) => s.waterfalls.map((w) => w.id)));
  const catalog = {
    generated: ACCESSED,
    radiusKm: RADIUS_KM,
    streamMaxM: STREAM_MAX_M,
    yearMin: YEAR_MIN,
    yearMax: YEAR_MAX,
    uncertaintyMaxM: UNCERTAINTY_MAX_M,
    pageMinFalls: PAGE_MIN_FALLS,
    licenses: ['CC0 1.0', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0'],
    publishedFallsConsidered: falls.length,
    fallsWithNamedStream: falls.filter((f) => streams[f.id]?.name).length,
    fallsWithFish: fallsWithFish.size,
    speciesCount: species.length,
    speciesPageCount: species.filter((s) => s.page).length,
    speciesWithPhoto: species.filter((s) => s.photo).length,
    regulations,
    species,
  };
  writeJson(path.join(ROOT, 'data/fish/catalog.json'), catalog);
  console.log(JSON.stringify({
    species: catalog.speciesCount,
    pages: catalog.speciesPageCount,
    fallsWithFish: catalog.fallsWithFish,
    namedStreams: catalog.fallsWithNamedStream,
    photos: catalog.speciesWithPhoto,
    photosSaved: photos,
  }, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  const falls = publishedFalls();
  console.log('published falls', falls.length);
  const streams = await resolveStreams(falls);
  if (streamsOnly) process.exit(0);
  const bucket = enrichOnly ? readJson(path.join(CACHE, 'matches.json'), {}) : await harvestOccurrences(falls, streams);
  if (occurrencesOnly) process.exit(0);
  await buildCatalog(falls, streams, bucket);
}
