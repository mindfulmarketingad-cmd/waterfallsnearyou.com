// Builds data/us-metros.json: US cities with 50,000+ people (GeoNames cities15000, CC BY 4.0, as
// packaged in the MIT-licensed geonamescache PyPI release) plus every state capital. These are the
// cities that get /find/[type]/[state]/[city] pages. Run: node scripts/prepare-metros.mjs
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const dir = mkdtempSync(path.join(tmpdir(), 'gnc-'));
execSync(`python3 -m pip download geonamescache==3.0.2 --no-deps -q -d "${dir}"`);
const whl = path.join(dir, readdirSync(dir).find((f) => f.endsWith('.whl')));
const raw = JSON.parse(execSync(`unzip -p "${whl}" geonamescache/data/cities15000.json`, { maxBuffer: 1 << 28 }).toString());
const capitals = JSON.parse(readFileSync(path.join(ROOT, 'src/data/capitals.json'), 'utf8'));
const towns = JSON.parse(readFileSync(path.join(ROOT, 'data/us-cities.json'), 'utf8'));
const CODES = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY' };
const out = new Map();
for (const c of Object.values(raw)) {
  if (c.countrycode !== 'US' || c.population < 50000 || !Object.values(CODES).includes(c.admin1code)) continue;
  const name = c.name === 'New York City' ? 'New York City' : c.name;
  out.set(`${name}|${c.admin1code}`, { name, st: c.admin1code, lat: c.latitude, lng: c.longitude, pop: c.population });
}
for (const [st, name] of Object.entries(capitals)) {
  if ([...out.values()].some((m) => m.st === st && m.name === name)) continue;
  const state = Object.keys(CODES).find((k) => CODES[k] === st);
  const t = towns.find((x) => x.name === name && x.state === state);
  if (t) out.set(`${name}|${st}`, { name, st, lat: t.lat, lng: t.lng, pop: 0, capital: true });
}
for (const [st, name] of Object.entries(capitals)) { const m = out.get(`${name}|${st}`); if (m) m.capital = true; }
const list = [...out.values()].sort((a, b) => b.pop - a.pop);
writeFileSync(path.join(ROOT, 'data/us-metros.json'), JSON.stringify(list));
console.log(`Saved ${list.length} cities (${list.filter((m) => m.capital).length} capitals).`);
