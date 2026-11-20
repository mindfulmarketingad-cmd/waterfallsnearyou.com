import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { getFoliagePages, getFoliageHub } from '../src/lib/foliage.mjs';
import { isIndexable } from '../src/lib/indexing.mjs';
import { foldedStates } from '../src/content/foliage/index.mjs';

const pages = getFoliagePages();
const hub = getFoliageHub();
const folded = new Set(foldedStates.map((s) => s.slug));

test('fall foliage hub and state pages are indexable and sourced', () => {
  assert.equal(pages.length, 46);
  assert.equal(isIndexable('/fall-foliage'), true);
  assert.equal(folded.has('florida'), true);
  assert.equal(folded.has('hawaii'), true);
  assert.equal(pages.some((p) => p.slug === 'florida' || p.slug === 'hawaii'), false);
  const chunks = [];
  for (const page of pages) {
    assert.equal(isIndexable(page.url), true, page.slug);
    assert.ok(page.regions.length >= 2, page.slug);
    assert.ok(page.faqs.length >= 3, page.slug);
    assert.match(page.varies, /year to year/i);
    const words = [page.dek, ...page.overview, ...page.regions.map((r) => r.text), page.fallsIntro, ...page.drive, page.parksNote || '', ...page.faqs.flatMap((f) => [f.q, f.a])].join(' ').split(/\s+/).length;
    assert.ok(words >= 300, `${page.slug} ${words}`);
    for (const region of page.regions) {
      assert.ok(region.season && region.sourceUrl && region.text, page.slug);
      assert.match(region.sourceUrl, /^https:\/\//);
    }
    assert.match(page.report.url, /^https:\/\//);
    const minImages = page.slug === 'delaware' ? 0 : page.slug === 'mississippi' ? 1 : 2;
    assert.ok(page.images.length >= minImages, `${page.slug} images ${page.images.length}`);
    for (const img of page.images) {
      assert.equal(existsSync(`public${img.src}`), true, img.src);
      assert.equal(/\bnc\b|\bnd\b|noncommercial|noderiv/i.test(img.license), false, img.license);
      assert.ok(img.credit && img.caption && img.alt);
    }
    for (const chunk of [...page.overview, ...page.regions.map((r) => r.text), page.fallsIntro, ...page.drive]) {
      assert.equal(chunks.includes(chunk), false, `${page.slug} duplicate`);
      chunks.push(chunk);
    }
  }
  assert.ok(hub.images.length >= 3);
  assert.match(hub.esri.url, /experience\.arcgis\.com/);
  const header = readFileSync('src/components/Header.astro', 'utf8');
  assert.match(header, /href: '\/fall-foliage', label: 'Fall Foliage'/);
  const csp = readFileSync('vercel.json', 'utf8');
  assert.match(csp, /experience\.arcgis\.com/);
});
