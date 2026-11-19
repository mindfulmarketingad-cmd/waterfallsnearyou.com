// Named-waterfall census for the 50 states.
// Counts: USGS GNIS feature class "Falls" in data/gnis-waterfalls.json
// (scripts/prepare-gnis.mjs). Land area: data/state-land-area.json
// (scripts/prepare-state-areas.mjs, Census 2024 Gazetteer ALAND_SQMI).
// A "published page" uses the same rule as richListing in indexing.mjs.
// Kept inline so this module does not import the indexing graph.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadData, slugify, STATE_CODES } from './core.mjs';
import { tripFacts } from './tripfacts.mjs';

export const STUDY_DATE = '2026-11-19';
export const GNIS_FILE_COMMITTED = '2026-10-02';
export const MIN_NAMED_FALLS = 10;
export const GNIS_SOURCE_URL = 'https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames/DomesticNames/DomesticNames_AllStates_Text.zip';
const MIN_REVIEWS = 25;
const MIN_USGS_TEXT = 200;

// Must stay identical to richListing() in indexing.mjs. test/falls-census.test.mjs checks that.
export function samePublishedRule(listing) {
  return !!(listing.os?.rating && listing.os.reviews >= MIN_REVIEWS)
    || !!tripFacts(listing.url)?.sources?.length
    || ((listing.gnisDescription || '') + (listing.gnisHistory || '')).length >= MIN_USGS_TEXT;
}

const FIFTY = Object.keys(STATE_CODES).filter((name) => name !== 'District of Columbia');

function landAreas() {
  const file = path.join(process.cwd(), 'data/state-land-area.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

function competitionRank(rows, value) {
  const sorted = [...rows].sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name));
  let rank = 0;
  let prev = null;
  sorted.forEach((row, i) => {
    const v = value(row);
    if (prev === null || v !== prev) rank = i + 1;
    row._rank = rank;
    prev = v;
  });
  return sorted;
}

let cache = null;

export function getFallsStudy() {
  if (cache) return cache;
  const { states } = loadData();
  const byName = new Map(states.map((s) => [s.name, s]));
  const areas = landAreas();
  const rows = FIFTY.map((name) => {
    const area = areas.areas[name];
    if (!area) throw new Error(`No Census land area for ${name}`);
    const state = byName.get(name);
    const listings = state ? state.listings.filter((l) => l.source === 'gnis') : [];
    const directoryCount = state ? state.listings.length : 0;
    const counties = new Map();
    for (const l of listings) {
      const key = l.county || 'Not recorded';
      if (!counties.has(key)) counties.set(key, []);
      counties.get(key).push(l);
    }
    const countyRows = [...counties.entries()]
      .map(([county, ls]) => ({ county, count: ls.length, listings: ls }))
      .sort((a, b) => b.count - a.count || a.county.localeCompare(b.county));
    return {
      name,
      slug: state?.slug || slugify(name),
      code: STATE_CODES[name],
      hasStatePage: !!state,
      stateUrl: state ? state.url : null,
      gnisCount: listings.length,
      directoryCount,
      extraListings: directoryCount - listings.length,
      landSqMi: area.landSqMi,
      per1000: listings.length / area.landSqMi * 1000,
      counties: countyRows,
      listings,
    };
  });

  const byCount = competitionRank(rows, (r) => r.gnisCount);
  for (const row of byCount) row.countRank = row._rank;
  const byDensity = competitionRank(rows, (r) => r.per1000);
  for (const row of byDensity) row.densityRank = row._rank;
  for (const row of rows) delete row._rank;

  const totalNamed = rows.reduce((s, r) => s + r.gnisCount, 0);
  const dcArea = areas.areas['District of Columbia'];
  const dcState = byName.get('District of Columbia');
  const dcListings = dcState ? dcState.listings.filter((l) => l.source === 'gnis') : [];
  const dc = {
    name: 'District of Columbia',
    gnisCount: dcListings.length,
    landSqMi: dcArea.landSqMi,
    per1000: dcListings.length / dcArea.landSqMi * 1000,
    hasStatePage: !!dcState,
    stateUrl: dcState ? dcState.url : null,
  };

  const published = rows.filter((r) => r.gnisCount >= MIN_NAMED_FALLS).map((r) => r.slug);
  const gated = rows.filter((r) => r.gnisCount < MIN_NAMED_FALLS).map((r) => r.slug);

  cache = {
    studyDate: STUDY_DATE,
    gnisCommitted: GNIS_FILE_COMMITTED,
    gnisSourceUrl: GNIS_SOURCE_URL,
    land: {
      source: areas.source,
      sourceUrl: areas.sourceUrl,
      documentationUrl: areas.documentationUrl,
      file: areas.file,
      field: areas.field,
      retrieved: areas.retrieved,
    },
    minNamedForPage: MIN_NAMED_FALLS,
    totalNamed,
    totalWithDc: totalNamed + dc.gnisCount,
    dc,
    states: rows.sort((a, b) => a.name.localeCompare(b.name)),
    byCount: [...rows].sort((a, b) => a.countRank - b.countRank || a.name.localeCompare(b.name)),
    byDensity: [...rows].sort((a, b) => a.densityRank - b.densityRank || a.name.localeCompare(b.name)),
    publishedSlugs: published,
    gatedSlugs: gated,
  };
  return cache;
}

export function howManyPath(slug) {
  return `/blog/how-many-waterfalls-are-in-${slug}`;
}

export function howManyPaths() {
  return getFallsStudy().publishedSlugs.map(howManyPath);
}

export const fmtDensity = (n) => n.toFixed(2);
export const fmtLand = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
