import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { getParks, parkQualifies, parkForListing } from '../src/lib/parks.mjs';
import { isIndexable } from '../src/lib/indexing.mjs';
import { readFileSync } from 'node:fs';

const parks = getParks().filter(parkQualifies);

test('national park guides meet the publish bar', () => {
  assert.ok(parks.length >= 18 && parks.length <= 35, parks.length);
  assert.equal(isIndexable('/national-parks'), true);
  const paragraphs = [];
  for (const park of parks) {
    assert.equal(isIndexable(park.url), true, park.slug);
    assert.ok(park.falls.length >= 1);
    assert.ok(park.narrative.overview.length >= 2, park.slug);
    assert.ok(park.narrative.method.length > 80, park.slug);
    assert.ok(park.images.length >= 3, `${park.slug} images`);
    assert.equal(park.falls.some((f) => f.url.includes('bedford/bridal-veil')), false);
    for (const img of park.images) {
      assert.equal(existsSync(`public${img.src}`), true, img.src);
      assert.equal(/nc|nd/i.test(img.license), false, img.license);
      assert.ok(img.credit && img.caption && img.alt);
    }
    if (park.gauge) {
      assert.equal(park.gauge.monthlyCfs.length, 12);
      assert.ok(park.gauge.miles <= 30);
      assert.equal(/\bBL\b|\bBELOW\b/i.test(park.gauge.name) && /DAM/i.test(park.gauge.name), false, park.gauge.name);
    }
    for (const chunk of [park.narrative.dek, park.narrative.method, ...park.narrative.overview, ...(park.narrative.effort || []), ...(park.narrative.plan || [])]) {
      assert.equal(/\b(we|i) hiked\b|\bour hike\b/i.test(chunk), false, park.slug);
      paragraphs.push(chunk);
    }
  }
  const dupes = paragraphs.filter((text, i) => paragraphs.indexOf(text) !== i);
  assert.deepEqual(dupes, []);
});

test('waterfall pages can point at a real park', () => {
  const yos = parkForListing('/california/yosemite-valley/vernal-fall');
  assert.equal(yos.slug, 'yosemite');
  const outside = parkForListing('/arizona/grand-canyon-village/havasu-falls');
  assert.equal(outside, null);
  const header = readFileSync('src/components/Header.astro', 'utf8');
  assert.match(header, /href: '\/national-parks', label: 'National Parks'/);
});
