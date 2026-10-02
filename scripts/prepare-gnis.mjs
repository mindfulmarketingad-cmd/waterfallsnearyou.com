// Builds data/gnis-waterfalls.json and data/us-cities.json from official public sources:
//  - USGS Geographic Names Information System (GNIS) Domestic Names, feature class "Falls"
//    https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames/
//  - GeoNames cities (population 1,000+) as packaged in the reverse_geocoder PyPI release (CC BY 4.0)
// Usage: node scripts/prepare-gnis.mjs   (downloads into .cache/gnis, requires curl, unzip, tar)
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CACHE = path.join(ROOT, '.cache/gnis');
mkdirSync(CACHE, { recursive: true });
const S3 = 'https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames';
const SOURCES = {
  domestic: `${S3}/DomesticNames/DomesticNames_AllStates_Text.zip`,
  desc: `${S3}/Topical/FeatureDescriptionHistory_National_Text.zip`,
  names: `${S3}/Topical/AllNames_National_Text.zip`,
  cities: 'https://files.pythonhosted.org/packages/source/r/reverse_geocoder/reverse_geocoder-1.5.1.tar.gz',
};

function fetchFile(url) {
  const file = path.join(CACHE, path.basename(url));
  if (!existsSync(file)) {
    console.log('Downloading', url);
    execSync(`curl -sSfL -o "${file}" "${url}"`, { stdio: 'inherit' });
  }
  return file;
}

// Stream every pipe-delimited row of every .txt inside a zip.
async function eachRow(zip, onRow, filter = '*.txt') {
  const list = execSync(`unzip -Z1 "${zip}"`).toString().split('\n').filter((f) => f.endsWith('.txt'));
  for (const entry of list) {
    if (filter !== '*.txt' && !entry.includes(filter)) continue;
    const proc = spawn('unzip', ['-p', zip, entry]);
    const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity });
    let header = null;
    for await (let line of rl) {
      if (!header) { header = line.replace(/^﻿/, '').split('|'); continue; }
      const parts = line.split('|');
      const row = {};
      header.forEach((h, i) => (row[h] = (parts[i] ?? '').trim()));
      onRow(row);
    }
  }
}

const STATES = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT',
  Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};
const LANDMARK_CLASSES = new Set(['Summit', 'Lake', 'Reservoir', 'Gap', 'Cliff', 'Arch', 'Spring', 'Pillar', 'Glacier',
  'Crater', 'Rapids', 'Stream', 'Valley', 'Ridge', 'Basin', 'Bench', 'Range']);

const R = 3958.8;
const rad = (d) => (d * Math.PI) / 180;
function miles(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const cellKey = (lat, lng) => `${Math.floor(lat * 20)}:${Math.floor(lng * 20)}`; // ~3.5 mi cells

const falls = new Map();
const landmarkGrid = new Map();
await eachRow(fetchFile(SOURCES.domestic), (r) => {
  const lat = parseFloat(r.prim_lat_dec), lng = parseFloat(r.prim_long_dec);
  if (!lat || !lng || !STATES[r.state_name]) return;
  if (r.feature_class === 'Falls') {
    if (falls.has(r.feature_id)) return;
    falls.set(r.feature_id, {
      gnisId: Number(r.feature_id), name: r.feature_name, state: r.state_name, stateCode: STATES[r.state_name],
      county: r.county_name, lat: +lat.toFixed(6), lng: +lng.toFixed(6), latDms: r.prim_lat_dms, lngDms: r.prim_long_dms,
      topoMap: r.map_name, created: r.date_created, edited: r.date_edited,
      bgnDate: r.bgn_date || '', description: '', history: '', variants: [], landmarks: [],
    });
  } else if (LANDMARK_CLASSES.has(r.feature_class)) {
    const k = cellKey(lat, lng);
    if (!landmarkGrid.has(k)) landmarkGrid.set(k, []);
    landmarkGrid.get(k).push({ name: r.feature_name, type: r.feature_class, lat, lng, id: r.feature_id });
  }
});
console.log('Falls:', falls.size);

await eachRow(fetchFile(SOURCES.desc), (r) => {
  const f = falls.get(r.feature_id);
  if (!f) return;
  f.description = (r.description || '').replace(/\s+/g, ' ').trim();
  f.history = (r.history || '').replace(/\s+/g, ' ').trim();
});

await eachRow(fetchFile(SOURCES.names), (r) => {
  const f = falls.get(r.feature_id);
  if (!f || r.feature_name_official !== 'Variant' || r.feature_name === f.name) return;
  if (!f.variants.includes(r.feature_name)) f.variants.push(r.feature_name);
});

// Named landmarks within 2 miles (closest per name, max 8)
for (const f of falls.values()) {
  const found = [];
  const [cy, cx] = [Math.floor(f.lat * 20), Math.floor(f.lng * 20)];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    for (const l of landmarkGrid.get(`${cy + dy}:${cx + dx}`) || []) {
      const d = miles(f, l);
      if (d <= 2) found.push({ name: l.name, type: l.type, miles: +d.toFixed(2), lat: +l.lat.toFixed(5), lng: +l.lng.toFixed(5) });
    }
  }
  const seen = new Set();
  f.landmarks = found.sort((a, b) => a.miles - b.miles).filter((l) => !seen.has(l.name) && seen.add(l.name)).slice(0, 8);
}

// Cities (GeoNames cities1000, US only)
const tgz = fetchFile(SOURCES.cities);
const csv = execSync(`tar -xzOf "${tgz}" reverse_geocoder-1.5.1/reverse_geocoder/rg_cities1000.csv`, { maxBuffer: 1 << 28 }).toString();
const cities = [];
for (const row of parse(csv, { columns: true, skip_empty_lines: true })) {
  const { lat, lon: lng, name, admin2, cc } = row;
  const admin1 = row.admin1 === 'Washington, D.C.' ? 'District of Columbia' : row.admin1;
  if (cc !== 'US' || !STATES[admin1]) continue;
  cities.push({ name, state: admin1, county: admin2.replace(/ (County|Parish|Borough|Census Area|Municipality)$/, ''), lat: +(+lat).toFixed(5), lng: +(+lng).toFixed(5) });
}
console.log('Cities:', cities.length);

const out = [...falls.values()].sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
writeFileSync(path.join(ROOT, 'data/gnis-waterfalls.json'), JSON.stringify(out));
writeFileSync(path.join(ROOT, 'data/us-cities.json'), JSON.stringify(cities));
console.log('Wrote data/gnis-waterfalls.json and data/us-cities.json');
