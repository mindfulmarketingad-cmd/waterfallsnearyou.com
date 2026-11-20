import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { getFallsStudy, samePublishedRule, howManyPaths, MIN_NAMED_FALLS, fmtDensity } from '../src/lib/falls-census.mjs';
import { getHowManyPages } from '../src/lib/how-many.mjs';
import { howManyImage } from '../src/lib/how-many-images.mjs';
import { publishedListing } from '../src/lib/publish.mjs';
import { loadData } from '../src/lib/core.mjs';
import { indexableUrls } from '../src/lib/indexing.mjs';
import { getPosts } from '../src/lib/blog.mjs';

test('published-page rule matches richListing', () => {
  const { listings } = loadData();
  for (const l of listings) assert.equal(samePublishedRule(l), publishedListing(l), l.url);
});

test('GNIS census matches the extract', () => {
  const study = getFallsStudy();
  const gnis = JSON.parse(readFileSync('data/gnis-waterfalls.json', 'utf8'));
  const fifty = gnis.filter((g) => g.state !== 'District of Columbia');
  assert.equal(study.totalNamed, fifty.length);
  assert.equal(study.totalNamed, 2514);
  const oregon = study.states.find((s) => s.name === 'Oregon');
  assert.equal(oregon.gnisCount, 241);
  assert.equal(oregon.countRank, 1);
  const ca = study.states.find((s) => s.name === 'California');
  const wa = study.states.find((s) => s.name === 'Washington');
  assert.equal(ca.gnisCount, 181);
  assert.equal(wa.gnisCount, 181);
  assert.equal(ca.countRank, 4);
  assert.equal(wa.countRank, 4);
  const hi = study.states.find((s) => s.name === 'Hawaii');
  assert.equal(hi.densityRank, 1);
  assert.equal(fmtDensity(hi.per1000), '15.41');
  const de = study.states.find((s) => s.name === 'Delaware');
  assert.equal(de.gnisCount, 0);
  assert.equal(de.hasStatePage, false);
  assert.equal(study.states.length, 50);
  assert.equal(study.publishedSlugs.length, 36);
  assert.equal(study.gatedSlugs.length, 14);
  assert.ok(study.gatedSlugs.includes('delaware'));
  assert.ok(study.gatedSlugs.includes('rhode-island'));
  assert.ok(!study.publishedSlugs.includes('nevada'));
});

test('how-many pages exist only above the gate and each has a hosted hero', () => {
  const pages = getHowManyPages();
  assert.equal(pages.length, 36);
  const indexed = indexableUrls();
  for (const p of pages) {
    assert.ok(p.gnisCount >= MIN_NAMED_FALLS, p.slug);
    assert.ok(p.words >= 500, `${p.slug} ${p.words}`);
    assert.ok(p.description.length <= 170, p.description);
    assert.ok(indexed.has(p.url), p.url);
    const img = howManyImage(p.slug);
    assert.equal(img.src, `/images/how-many/${p.slug}.webp`);
    assert.ok(existsSync(`public${img.src}`), img.src);
    assert.ok(img.width >= 600 && img.height >= 400, `${p.slug} ${img.width}x${img.height}`);
    assert.ok(!img.originalUrl.includes('lh3.googleusercontent'), p.slug);
    assert.match(img.license, /CC0|CC BY|Public domain/i);
    assert.doesNotMatch(img.license, /NC|ND|NonCommercial/i);
    assert.ok(img.alt.length > 40, p.slug);
  }
  assert.equal(howManyPaths().length, 36);
  for (const slug of getFallsStudy().gatedSlugs) {
    assert.equal(pages.some((p) => p.slug === slug), false);
  }
});

test('the ranking post quotes the census and links the state pages', () => {
  const post = getPosts().find((p) => p.slug === 'states-with-the-most-waterfalls');
  assert.ok(post.words > 2500);
  assert.equal(post.updated.toISOString().slice(0, 10), '2026-11-19');
  assert.match(post.html, /241/);
  assert.match(post.html, /2,514/);
  assert.match(post.html, /how-many-waterfalls-are-in-oregon/);
  assert.match(post.html, /largest-waterfalls-in-the-us-by-state/);
  assert.equal(post.faqs[0].q, 'Which state has the most waterfalls?');
  const raw = readFileSync('src/content/blog/states-with-the-most-waterfalls.md', 'utf8');
  assert.match(raw, /src="\/images\/blog\/most-waterfalls\/multnomah-falls\.webp"/);
  assert.doesNotMatch(raw, /upload\.wikimedia\.org\/wikipedia/);
});
