import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { loadData } from '../src/lib/core.mjs';
import { publishedListing } from '../src/lib/publish.mjs';
import { fishCatalog, fishPages, fishSpecies, fishForListing } from '../src/lib/fish.mjs';
import { textHasStream, usableStream } from '../scripts/fetch-fish.mjs';

test('stream name matching rejects a different fork and accepts the named water body', () => {
  assert.equal(textHasStream('East Fork Salmon River', 'Salmon River'), false);
  assert.equal(textHasStream('Little Rock Creek', 'Rock Creek'), false);
  assert.equal(textHasStream('Multnomah Creek below the bridge', 'Multnomah Creek'), true);
  assert.equal(textHasStream('Multnomah County, OR', 'Multnomah Creek'), false);
  assert.equal(textHasStream('recorded on Rock Cr near the trail', 'Rock Creek'), true);
  assert.equal(usableStream('North Fork'), false);
  assert.equal(usableStream('North Fork Elk River'), true);
  assert.equal(usableStream('Creek'), false);
});

const ALLOWED = new Set(['CC0 1.0', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0', 'CC BY', 'CC BY-SA', 'CC BY-SA 2.0', 'CC BY-SA 2.5', 'CC BY-SA 3.0', 'CC BY-SA 4.0', 'Public domain', 'Public domain (U.S. government work)']);

test('fish catalog matches published waterfalls and does not invent presence', () => {
  const catalog = fishCatalog();
  assert.ok(catalog, 'data/fish/catalog.json is required');
  assert.equal(catalog.radiusKm, 5);
  assert.equal(catalog.yearMin, 2005);
  assert.equal(catalog.streamMaxM, 500);
  assert.equal(catalog.pageMinFalls, 5);
  const { listings } = loadData();
  const published = new Map(listings.filter(publishedListing).map((l) => [l.id, l]));
  assert.equal(catalog.speciesCount, catalog.species.length);
  assert.equal(catalog.speciesPageCount, fishPages().length);
  assert.equal(catalog.speciesWithPhoto, fishSpecies().filter((s) => s.photo).length);
  const fallIds = new Set();
  for (const species of fishSpecies()) {
    assert.ok(species.recordCount > 0, species.scientificName);
    assert.equal(species.fallsCount, species.waterfalls.length);
    assert.equal(species.page, species.fallsCount >= catalog.pageMinFalls);
    assert.ok(species.waterfalls.length >= 1);
    if (species.page) assert.ok(species.waterfalls.length >= catalog.pageMinFalls);
    const seen = new Set();
    for (const fall of species.waterfalls) {
      assert.ok(published.has(fall.id), fall.url);
      assert.equal(published.get(fall.id).url, fall.url);
      assert.ok(fall.recordCount > 0);
      assert.ok(fall.yearMin >= catalog.yearMin && fall.yearMax <= catalog.yearMax);
      assert.ok(fall.kmMax <= catalog.radiusKm + 0.05);
      assert.ok(fall.stream && fall.stream.length > 3);
      assert.equal(seen.has(fall.id), false);
      seen.add(fall.id);
      fallIds.add(fall.id);
      for (const dataset of fall.datasets) {
        assert.ok(dataset.key && dataset.name && dataset.count > 0);
      }
    }
    if (species.photo) {
      assert.ok(species.photo.alt.includes(species.scientificName));
      assert.ok(species.photo.creator);
      assert.ok(species.photo.license);
      assert.match(species.photo.src, /^\/images\/fish\/.+\.webp$/);
      assert.equal(existsSync(`public${species.photo.src}`), true);
      const licenseOk = [...ALLOWED].some((name) => species.photo.license.toLowerCase().includes(name.toLowerCase().replace('  ', ' ')))
        || /cc0|cc by|public domain/i.test(species.photo.license);
      assert.equal(/noncommercial|noderiv|all rights reserved/i.test(species.photo.license), false, species.photo.license);
      assert.ok(licenseOk, species.photo.license);
    }
  }
  assert.equal(catalog.fallsWithFish, fallIds.size);
  for (const id of fallIds) {
    const block = fishForListing(id);
    assert.ok(block.species.length > 0);
    assert.ok(block.stream);
  }
  const hub = readFileSync('src/pages/fish-species/index.astro', 'utf8');
  assert.match(hub, /recorded in/);
  assert.match(hub, /David F\./);
});
