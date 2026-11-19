// Measure hiking trails to published waterfall pages from OpenStreetMap.
// Run: node scripts/fetch-trails.mjs
//      node scripts/fetch-trails.mjs --url /washington/tanner/franklin-falls
//      node scripts/fetch-trails.mjs --limit 40
//
// Writes data/trails.json. Hand-checked trip-facts are applied at page build time
// and are not copied into this file. A missing fact is left out. Re-running is safe:
// Overpass responses are cached under .cache/trails/.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadData, miles } from '../src/lib/core.mjs';
import { publishedListing } from '../src/lib/publish.mjs';
import { trailFromElements } from '../src/lib/osm-trail.mjs';
import { assembleTrail, trailRows } from '../src/lib/trails.mjs';
import { tripFacts } from '../src/lib/tripfacts.mjs';

const QUERY_VERSION = 1;
const PAD_KM = 2.6;
const CACHE = path.join(process.cwd(), '.cache/trails', `v${QUERY_VERSION}`);
const OUT = path.join(process.cwd(), 'data/trails.json');
const ENDPOINTS = ['https://overpass.openstreetmap.fr/api/interpreter'];
const UA = 'WaterfallsNearYou/1.0 (https://www.waterfallsnearyou.com/contact)';

const args = process.argv.slice(2);
const limit = flagNum('--limit');
const only = new Set(flagList('--url'));
const cacheOnly = args.includes('--cache-only');

function flagNum(name) {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : 0;
}
function flagList(name) {
  const i = args.indexOf(name);
  if (i < 0) return [];
  return String(args[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function bbox(falls, padKm) {
  let south = 90, north = -90, west = 180, east = -180;
  for (const f of falls) {
    const dLat = padKm / 110.574;
    const dLng = padKm / (111.32 * Math.cos((f.lat * Math.PI) / 180));
    south = Math.min(south, f.lat - dLat);
    north = Math.max(north, f.lat + dLat);
    west = Math.min(west, f.lng - dLng);
    east = Math.max(east, f.lng + dLng);
  }
  return { south, west, north, east };
}

function clusterFalls(falls) {
  const left = [...falls].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
  const used = new Set();
  const clusters = [];
  for (const seed of left) {
    if (used.has(seed.url)) continue;
    const group = [seed];
    used.add(seed.url);
    let grew = true;
    while (grew && group.length < 3) {
      grew = false;
      for (const f of left) {
        if (used.has(f.url) || group.length >= 8) continue;
        if (!group.some((g) => miles(g, f) <= 6)) continue;
        const box = bbox([...group, f], 0);
        if (box.north - box.south > 0.08 || box.east - box.west > 0.1) continue;
        group.push(f);
        used.add(f.url);
        grew = true;
      }
    }
    clusters.push(group);
  }
  return clusters;
}

function queryFor(box) {
  const b = `${box.south},${box.west},${box.north},${box.east}`;
  // Route relations are omitted. Fetching them pulls entire long-distance trails and
  // public Overpass instances reject or stall on that. Way names and geometry are enough
  // to measure the path from a trailhead or parking node.
  return `[out:json][timeout:25];
(
  way["highway"="path"](${b});
  way["highway"="footway"](${b});
  way["highway"="bridleway"](${b});
  way["highway"="steps"](${b});
  way["highway"="track"]["foot"="yes"](${b});
  way["highway"="track"]["foot"="designated"](${b});
  node["highway"="trailhead"](${b});
  node["amenity"="parking"](${b});
  node["information"="trailhead"](${b});
);
out tags geom;`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query, prefer = 0) {
  let lastErr;
  const endpoints = [ENDPOINTS[prefer % ENDPOINTS.length], ...ENDPOINTS.filter((_, i) => i !== prefer % ENDPOINTS.length)];
  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 1; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(50000),
        });
        if (res.status === 429 || res.status === 504 || res.status === 502 || res.status === 403) {
          const wait = Number(res.headers.get('retry-after')) || 20;
          lastErr = new Error(`${endpoint} ${res.status}`);
          await sleep(wait * 1000);
          continue;
        }
        const text = await res.text();
        if (!res.ok) {
          lastErr = new Error(`${endpoint} ${res.status} ${text.slice(0, 180)}`);
          await sleep(4000 * (attempt + 1));
          continue;
        }
        if (text.length > 90_000_000) throw new Error('response too large');
        const json = JSON.parse(text);
        if (json.remark && /error|timeout/i.test(json.remark) && !json.elements) throw new Error(json.remark);
        return json.elements || [];
      } catch (err) {
        lastErr = err;
        await sleep(3000 * (attempt + 1));
      }
    }
  }
  throw lastErr || new Error('Overpass failed');
}

function cacheFile(group) {
  const key = group.map((f) => f.url).sort().join('|');
  const hash = createHash('sha1').update(`${QUERY_VERSION}:${key}`).digest('hex').slice(0, 16);
  return path.join(CACHE, `${hash}.json`);
}

async function elementsFor(group, padKm, prefer = 0) {
  const file = cacheFile(group);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  if (cacheOnly) return null;
  const t0 = Date.now();
  const box = bbox(group, padKm);
  const elements = await overpass(queryFor(box), prefer);
  console.error(`\n${group.length} falls ${(box.north - box.south).toFixed(2)}x${(box.east - box.west).toFixed(2)} deg ${Date.now() - t0}ms ${elements.length} els`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify(elements));
  await sleep(800);
  return elements;
}

function nearbyElements(fall, elements) {
  const dLat = 7000 / 110574;
  const dLng = 7000 / (111320 * Math.cos((fall.lat * Math.PI) / 180));
  const south = fall.lat - dLat;
  const north = fall.lat + dLat;
  const west = fall.lng - dLng;
  const east = fall.lng + dLng;
  const ways = new Set();
  const out = [];
  for (const el of elements) {
    if (el.type === 'relation') continue;
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    if (el.geometry?.length) {
      for (const g of el.geometry) {
        if (g.lat < minLat) minLat = g.lat;
        if (g.lat > maxLat) maxLat = g.lat;
        if (g.lon < minLng) minLng = g.lon;
        if (g.lon > maxLng) maxLng = g.lon;
      }
    } else if (typeof el.lat === 'number') {
      minLat = maxLat = el.lat;
      minLng = maxLng = el.lon;
    } else continue;
    if (maxLat < south || minLat > north || maxLng < west || minLng > east) continue;
    out.push(el);
    if (el.type === 'way') ways.add(el.id);
  }
  for (const el of elements) {
    if (el.type === 'relation' && (el.members || []).some((m) => m.type === 'way' && ways.has(m.ref))) out.push(el);
  }
  return out;
}

async function fetchCluster(group, prefer = 0) {
  try {
    return await elementsFor(group, PAD_KM, prefer);
  } catch (err) {
    if (group.length === 1) {
      try {
        return await elementsFor(group, 1.8, prefer);
      } catch (err2) {
        console.error(`skip ${group[0].url}: ${err2.message || err.message}`);
        return null;
      }
    }
    console.error(`split cluster of ${group.length}: ${err.message}`);
    const mid = Math.ceil(group.length / 2);
    const a = await fetchCluster(group.slice(0, mid), prefer);
    const b = await fetchCluster(group.slice(mid), prefer);
    if (!a) return b;
    if (!b) return a;
    return [...a, ...b];
  }
}

function strip(record) {
  const out = {};
  for (const [k, v] of Object.entries(record)) {
    if (v == null || v === '') continue;
    out[k] = v;
  }
  return out;
}

const { listings } = loadData();
let falls = listings.filter(publishedListing).map((l) => ({ url: l.url, name: l.name, lat: l.lat, lng: l.lng }));
if (only.size) falls = falls.filter((f) => only.has(f.url));
if (limit) falls = falls.slice(0, limit);
const clusters = clusterFalls(falls);
console.error(`Published falls in this run: ${falls.length}. Overpass queries: up to ${clusters.length}.`);

const osm = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')).trails || {}) : {};
if (!only.size && !limit) {
  for (const key of Object.keys(osm)) delete osm[key];
}

function saveTrails() {
  const trails = Object.fromEntries(Object.entries(osm).sort(([a], [b]) => a.localeCompare(b)));
  const doc = {
    _about: 'OpenStreetMap hiking trails for published waterfall pages, keyed by page URL. Generated by scripts/fetch-trails.mjs. Distances are measured along mapped foot paths from a trailhead or parking node. Fields are omitted when the map does not state them. Hand-checked trip facts in data/trip-facts.json override these fields at build time. This file does not decide which pages are published.',
    generated: new Date().toISOString().slice(0, 10),
    queryVersion: QUERY_VERSION,
    trails,
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
  return trails;
}

let done = 0;
let got = 0;
async function worker(prefer) {
  while (queue.length) {
    const group = queue.shift();
    const elements = await fetchCluster(group, prefer);
    done++;
    if (elements) {
      for (const fall of group) {
        let record = null;
        try {
          record = trailFromElements(fall, nearbyElements(fall, elements));
        } catch (err) {
          console.error(`\n${fall.url}: ${err.message}`);
        }
        if (record?.name || record?.distance) {
          osm[fall.url] = strip(record);
          got++;
        } else delete osm[fall.url];
      }
    }
    process.stderr.write(`\r${done}/${clusters.length} clusters, ${got} trails`);
    if (done % 10 === 0) saveTrails();
  }
}
const queue = [...clusters];
await worker(0);
process.stderr.write('\n');

const trails = saveTrails();

let total = 0;
let tripOnly = 0;
let osmOnly = 0;
let both = 0;
let withName = 0;
let withDistance = 0;
const examples = [];
for (const l of listings.filter(publishedListing)) {
  const trail = assembleTrail(tripFacts(l.url), trails[l.url] || null, l.name);
  if (!trailRows(trail).length) continue;
  total++;
  const origins = new Set((trail.sources || []).map((s) => s.origin));
  if (origins.has('trip-facts') && origins.has('openstreetmap')) both++;
  else if (origins.has('trip-facts')) tripOnly++;
  else if (origins.has('openstreetmap')) osmOnly++;
  if (trail.name) withName++;
  if (trail.distance) withDistance++;
  if (examples.length < 8 && trails[l.url]?.distance) examples.push(`${l.url} | ${trail.name || '—'} | ${trail.distance?.text || ''}`);
}
console.log(JSON.stringify({ osmRecords: Object.keys(trails).length, pagesWithSection: total, tripOnly, osmOnly, both, withName, withDistance, examples }, null, 2));
