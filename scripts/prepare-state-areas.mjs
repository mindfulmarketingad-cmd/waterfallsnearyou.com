// Writes data/state-land-area.json from the U.S. Census Bureau 2024 Gazetteer
// national state file (ALAND_SQMI: land area in square miles, inland water excluded).
// Usage: node scripts/prepare-state-areas.mjs
// Source: https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_state_national.zip
// Docs:   https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ZIP_URL = 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_state_national.zip';
const DOC_URL = 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html';

const dir = mkdtempSync(path.join(tmpdir(), 'gaz-'));
const zip = path.join(dir, 'gaz.zip');
execSync(`curl -fsSL -A "WaterfallsNearYou/1.0" -o "${zip}" "${ZIP_URL}"`, { stdio: 'inherit' });
const entry = execSync(`unzip -Z1 "${zip}"`).toString().trim().split('\n')[0];
const text = execSync(`unzip -p "${zip}" "${entry}"`).toString().replace(/^\uFEFF/, '');
rmSync(dir, { recursive: true, force: true });

const lines = text.split(/\r?\n/).filter((ln) => ln.trim());
const header = lines[0].split('\t').map((h) => h.trim());
const idx = (name) => header.indexOf(name);
const areas = {};
for (const ln of lines.slice(1)) {
  const cols = ln.split('\t');
  const name = cols[idx('NAME')]?.trim();
  const usps = cols[idx('USPS')]?.trim();
  const geoid = cols[idx('GEOID')]?.trim();
  const land = Number(cols[idx('ALAND_SQMI')]);
  if (!name || !usps || !Number.isFinite(land)) continue;
  if (usps === 'PR') continue;
  areas[name] = { usps, geoid, landSqMi: land };
}

const out = {
  source: 'U.S. Census Bureau, 2024 Gazetteer Files, national state file',
  sourceUrl: ZIP_URL,
  documentationUrl: DOC_URL,
  file: entry,
  field: 'ALAND_SQMI',
  notes: 'Land area in square miles. Excludes inland water. Puerto Rico is omitted. Retrieved 2026-11-19 for the named-waterfall study.',
  retrieved: '2026-11-19',
  areas,
};
writeFileSync(path.join(ROOT, 'data/state-land-area.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log('Wrote', Object.keys(areas).length, 'areas');
