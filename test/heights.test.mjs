import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadData } from '../src/lib/core.mjs';
import { statedHeight } from '../src/lib/bestof.mjs';
import { heightOf, fmtHeight } from '../src/lib/heights.mjs';
import { publishedListing } from '../src/lib/publish.mjs';

const cited = JSON.parse(readFileSync('data/cited-heights.json', 'utf8'));
const rows = Object.entries(cited).filter(([key]) => key !== '_about');

const ALLOWED_HOSTS = new Set([
  'www.worldwaterfalldatabase.com',
  'www.nps.gov',
  'www.fs.usda.gov',
  'stateparks.oregon.gov',
  'gastateparks.org',
  'parks.ny.gov',
  'dnr.wisconsin.gov',
]);

test('cited heights are sourced figures for real listings that had no height', () => {
  const { listings } = loadData();
  const byUrl = new Map(listings.map((l) => [l.url, l]));
  assert.ok(rows.length > 0);
  for (const [url, row] of rows) {
    const listing = byUrl.get(url);
    assert.ok(listing, url);
    assert.equal(publishedListing(listing), true, url);
    assert.equal(statedHeight(listing), null, url);
    assert.equal(Number.isInteger(row.feet) && row.feet > 0 && row.feet < 5000, true, url);
    assert.equal(typeof row.exact, 'boolean', url);
    assert.equal(typeof row.source, 'string', url);
    assert.ok(row.source.length > 0, url);
    const parsed = new URL(row.url);
    assert.equal(parsed.protocol, 'https:', url);
    assert.ok(ALLOWED_HOSTS.has(parsed.hostname), `${url} ${parsed.hostname}`);
    if (parsed.hostname === 'www.worldwaterfalldatabase.com') {
      assert.match(parsed.pathname, /^\/waterfall\/.+/);
    }
    const shown = heightOf(listing);
    assert.equal(shown.feet, row.feet, url);
    assert.equal(shown.source, row.source, url);
    assert.equal(shown.url, row.url, url);
    assert.equal(shown.exact, row.exact, url);
    const text = fmtHeight(shown);
    if (row.exact) assert.equal(text.startsWith('about '), false, text);
    else assert.match(text, /^about /);
  }
});

test('cited heights do not replace a height the listing already shows', () => {
  const { listings } = loadData();
  const multnomah = listings.find((l) => l.url === '/oregon/cascade-locks/multnomah-falls');
  const south = listings.find((l) => l.url === '/oregon/sublimity/south-falls');
  assert.equal(cited['/oregon/cascade-locks/multnomah-falls'], undefined);
  assert.equal(heightOf(multnomah).source, 'Google listing');
  assert.equal(heightOf(multnomah).feet, 600);
  assert.equal(fmtHeight(heightOf(multnomah)), 'about 600 ft');
  assert.equal(heightOf(south).source, 'USGS');
  assert.equal(fmtHeight(heightOf(south)), 'about 177 ft');
});

test('agency pages replace a database total when the agency states the height', () => {
  const { listings } = loadData();
  const horsetail = listings.find((l) => l.url === '/oregon/cascade-locks/horsetail-falls');
  const bridal = listings.find((l) => l.url === '/oregon/troutdale/bridal-veil-falls');
  const salt = listings.find((l) => l.url === '/oregon/oakridge/salt-creek-falls-lane');
  const elowah = listings.find((l) => l.url === '/oregon/cascade-locks/elowah-falls');
  assert.equal(fmtHeight(heightOf(horsetail)), '176 ft');
  assert.equal(heightOf(horsetail).source, 'U.S. Forest Service');
  assert.match(heightOf(horsetail).url, /^https:\/\/www\.fs\.usda\.gov\//);
  assert.equal(fmtHeight(heightOf(bridal)), 'about 120 ft');
  assert.equal(heightOf(bridal).source, 'Oregon State Parks');
  assert.equal(fmtHeight(heightOf(salt)), '286 ft');
  assert.equal(heightOf(salt).source, 'U.S. Forest Service');
  assert.equal(heightOf(elowah), null);
  assert.equal(fmtHeight({ feet: 620, source: 'Wikidata' }), '620 ft');
  assert.equal(fmtHeight({ feet: 12, source: 'USGS' }), 'about 12 ft');
});

test('Oregon is the state with the most newly cited heights', () => {
  const byState = {};
  for (const [url] of rows) {
    const state = url.split('/')[1];
    byState[state] = (byState[state] || 0) + 1;
  }
  assert.equal(byState.oregon, 50);
  assert.ok(Object.values(byState).every((n) => n <= byState.oregon));
});
