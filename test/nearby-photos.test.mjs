import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { loadData } from '../src/lib/core.mjs';
import { hostedPhotoFor, nearbyPhotos } from '../src/lib/photos.mjs';
import { lifestyleChoices, lifestyleForListing } from '../src/lib/lifestyle.mjs';

const { listings } = loadData();
const byUrl = (url) => listings.find((l) => l.url === url);
const GOOGLE = /googleusercontent\.com|ggpht\.com|maps\.googleapis\.com/i;

test('a nearby fall uses its own hosted park photo when the file is of that fall', () => {
  const vernal = byUrl('/california/yosemite-valley/vernal-fall');
  const bridalveil = byUrl('/california/yosemite-valley/bridalveil-fall');
  const nevada = byUrl('/california/yosemite-valley/nevada-fall');
  const photo = hostedPhotoFor(vernal);
  assert.equal(photo.src, '/images/parks/yosemite/03.webp');
  assert.match(photo.alt, /vernal/i);
  assert.equal(photo.fallback, '/images/gen/california/yosemite-valley/vernal-fall.webp');
  assert.equal(existsSync(`public${photo.src}`), true);
  assert.equal(hostedPhotoFor(bridalveil).src, '/images/parks/yosemite/02.webp');
  assert.equal(hostedPhotoFor(nevada).src, '/images/parks/yosemite/04.webp');
  assert.equal(GOOGLE.test(photo.src), false);
});

test('the upper fall keeps the photo that names it, not the main Yosemite Falls page', () => {
  const upper = listings.find((l) => l.name === 'Upper Yosemite Falls' && l.stateCode === 'CA');
  const main = byUrl('/california/yosemite-valley/yosemite-falls');
  assert.ok(upper);
  assert.equal(hostedPhotoFor(upper).src, '/images/parks/yosemite/01.webp');
  assert.match(hostedPhotoFor(upper).alt, /upper yosemite/i);
  assert.notEqual(hostedPhotoFor(main)?.src, '/images/parks/yosemite/01.webp');
});

test('nearby cards do not repeat the image on the next card when the pool has another', () => {
  const plain = listings.filter((l) => l.stateCode === 'CA' && !hostedPhotoFor(l)).slice(0, 8);
  assert.ok(plain.length >= 4);
  assert.ok(lifestyleChoices(plain[0]).length > 1);
  const photos = nearbyPhotos(plain);
  for (const photo of photos) {
    assert.equal(GOOGLE.test(photo.src), false);
    assert.ok(photo.alt && photo.alt.length > 8);
    assert.ok(photo.fallback == null || photo.fallback.startsWith('/images/gen'));
    assert.equal(photo.src.startsWith('/images/lifestyle/') || photo.src.startsWith('/images/gen'), true);
  }
  for (let i = 1; i < photos.length; i++) assert.notEqual(photos[i].src, photos[i - 1].src);
});

test('trailhead shots are not used as a waterfall photo', () => {
  const darwin = listings.find((l) => l.name === 'Darwin Falls');
  const abrams = listings.find((l) => l.name === 'Abrams Falls' && l.stateCode === 'TN');
  assert.ok(darwin && abrams);
  assert.equal(hostedPhotoFor(darwin), null);
  assert.equal(hostedPhotoFor(abrams), null);
  const adams = listings.find((l) => l.name === 'Adams Falls');
  assert.equal(/[a-z]/.test(hostedPhotoFor(adams).alt), true);
  assert.doesNotMatch(hostedPhotoFor(adams).alt, /TRAILHEAD/);
});

test('listing photos stay on the same lifestyle pick', () => {
  const l = byUrl('/california/yosemite-valley/yosemite-falls');
  assert.equal(lifestyleForListing(l).src, lifestyleChoices(l)[0].src);
  assert.equal(lifestyleForListing(l).src.startsWith('/images/lifestyle/'), true);
});
