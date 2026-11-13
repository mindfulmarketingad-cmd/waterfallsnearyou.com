import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadData, staticPagePaths } from '../src/lib/core.mjs';
import { indexableUrls } from '../src/lib/indexing.mjs';
import { redirectMap, listingHref, cityHref, publishedListing, publishedCity } from '../src/lib/publish.mjs';
import { getPosts } from '../src/lib/blog.mjs';
import { getStateLists, getCapitalLists, getSmallest, getRoadside } from '../src/lib/bestof.mjs';
import { getFind, findPages } from '../src/lib/find.mjs';
import { getCityHubs } from '../src/lib/cityhubs.mjs';

const BAD_PUB = 'pub-2173008413459742';
const GOOD_PUB = 'pub-9332749804326149';

test('publisher id is the approved AdSense account', () => {
  const config = readFileSync('src/config.mjs', 'utf8');
  const ads = readFileSync('public/ads.txt', 'utf8');
  const base = readFileSync('src/layouts/Base.astro', 'utf8');
  assert.match(config, new RegExp(GOOD_PUB));
  assert.match(ads, new RegExp(GOOD_PUB));
  assert.match(base, /SITE\.adsenseClient/);
  for (const text of [config, ads, base, readFileSync('vercel.json', 'utf8')]) {
    assert.equal(text.includes(BAD_PUB), false);
  }
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.ok(vercel.rewrites.some((r) => r.destination.startsWith('/api/redirect')));
});

test('auto ads are limited to indexable pages', () => {
  const base = readFileSync('src/layouts/Base.astro', 'utf8');
  assert.match(base, /showAds && <script async src=\{`https:\/\/pagead2\.googlesyndication\.com/);
  assert.match(base, /isIndexable\(path\)/);
});

test('unpublished waterfall and town URLs redirect to a page that is still built', () => {
  const { listings, cities, states } = loadData();
  const map = redirectMap();
  const built = new Set([
    ...staticPagePaths(),
    ...states.map((s) => s.url),
    ...cities.filter(publishedCity).map((c) => c.url),
    ...listings.filter(publishedListing).map((l) => l.url),
    ...getPosts().map((p) => p.url),
    ...getStateLists().map((p) => p.url),
    ...getCapitalLists().map((p) => p.url),
    getSmallest().url,
    getRoadside().url,
    '/find',
    ...getFind().map((t) => t.url),
    ...findPages().map((p) => p.url),
    '/map',
    ...states.map((s) => `/map/${s.slug}`),
    '/waterfalls-near',
    ...getCityHubs().map((h) => h.url),
  ]);
  for (const l of listings) {
    if (publishedListing(l)) assert.equal(map[l.url], undefined);
    else {
      assert.equal(map[l.url], listingHref(l));
      assert.ok(built.has(map[l.url].split('#')[0]), map[l.url]);
    }
  }
  for (const c of cities) {
    if (publishedCity(c)) assert.equal(map[c.url], undefined);
    else {
      assert.equal(map[c.url], cityHref(c));
      assert.ok(built.has(map[c.url].split('#')[0]), map[c.url]);
    }
  }
  for (const [from, to] of Object.entries(map)) {
    const dest = to.split('#')[0];
    assert.notEqual(from, dest);
    assert.equal(map[dest], undefined, `chain ${from} -> ${to}`);
    assert.ok(built.has(dest), dest);
  }
  const onDisk = JSON.parse(readFileSync('data/thin-redirects.json', 'utf8'));
  assert.deepEqual(onDisk, map);
});

test('indexed waterfall and town URLs are still published', () => {
  const { listings, cities } = loadData();
  const indexed = indexableUrls();
  for (const l of listings) {
    if (indexed.has(l.url)) assert.equal(publishedListing(l), true);
  }
  for (const c of cities) {
    if (indexed.has(c.url)) assert.equal(publishedCity(c), true);
  }
});
