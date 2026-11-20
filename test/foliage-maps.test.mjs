import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { states as foliageStates } from '../src/content/foliage/index.mjs';
import { foliageHubMap, foliageMap } from '../src/lib/foliage-maps.mjs';

const SIZES = [
  [640, 336],
  [1200, 630],
  [1600, 840],
];

test('every foliage page has a hosted hero map and a credit', async () => {
  assert.equal(foliageStates.length, 46);
  let bands = 0;
  let outlines = 0;
  for (const state of foliageStates) {
    const hero = foliageMap(state.slug);
    assert.ok(hero, state.slug);
    assert.equal(hero.width, 1200);
    assert.equal(hero.height, 630);
    assert.equal(hero.credit, 'USA National Phenology Network');
    assert.equal(hero.license, 'CC BY');
    assert.match(hero.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/$/);
    assert.equal(hero.sourceUrl, 'https://www.usanpn.org/data/maps/land_surface_phenology');
    assert.match(hero.outlineSourceUrl, /^https:\/\/www\.census\.gov\//);
    assert.equal(hero.src, `/images/foliage-maps/${state.slug}-1200.webp`);
    assert.equal(hero.src.includes('/images/lifestyle/'), false);
    assert.match(hero.alt, new RegExp(state.name, 'i'));
    assert.match(hero.caption, /mid-greendown|Outline only/i);
    assert.ok(hero.caption.length > 40, state.slug);
    for (const [w, h] of SIZES) {
      const file = `public/images/foliage-maps/${state.slug}-${w}.webp`;
      assert.equal(existsSync(file), true, file);
      const meta = await sharp(file).metadata();
      assert.equal(meta.width, w, file);
      assert.equal(meta.height, h, file);
      assert.equal(meta.format, 'webp', file);
    }
    if (hero.mode === 'outline') {
      outlines++;
      assert.equal(hero.legend.length, 0, state.slug);
      assert.match(hero.caption, /Outline only/);
      assert.match(hero.caption, /not drawn|no cells/i);
      assert.match(hero.caption, new RegExp(state.indexLine.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    } else {
      bands++;
      assert.equal(hero.mode, 'bands', state.slug);
      assert.ok(hero.legend.length >= 1, state.slug);
      assert.match(hero.caption, /September 1|legend lists/i);
      assert.match(hero.caption, /not a ranger forecast/i);
      for (const item of hero.legend) {
        assert.ok(item.startDoy >= 244, `${state.slug} ${item.label}`);
        assert.match(item.color, /^#[0-9a-f]{6}$/i);
        assert.match(item.label, /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Oct|Nov|Dec) |^After /);
      }
    }
  }
  assert.equal(bands + outlines, 46);
  assert.equal(outlines, 1);
  assert.equal(bands, 45);
  const alaska = foliageMap('alaska');
  assert.equal(alaska.mode, 'outline');
  assert.match(alaska.caption, /Inside Passage/);
  const vermont = foliageMap('vermont');
  assert.equal(vermont.mode, 'bands');
  assert.ok(vermont.legend.length >= 3);
  assert.ok(vermont.legend.every((item) => item.startDoy >= 244 && item.startDoy < 320));

  const hub = foliageHubMap();
  assert.equal(hub.slug, 'united-states');
  assert.equal(hub.mode, 'bands');
  assert.match(hub.caption, /mid-greendown/i);
  assert.match(hub.caption, /Gray land|outside that grid/i);
  assert.ok(hub.legend.length >= 4);
  for (const [w, h] of SIZES) {
    const meta = await sharp(`public/images/foliage-maps/united-states-${w}.webp`).metadata();
    assert.equal(meta.width, w);
    assert.equal(meta.height, h);
    assert.equal(meta.format, 'webp');
  }

  const statePage = readFileSync('src/pages/fall-foliage/[state].astro', 'utf8');
  const hubPage = readFileSync('src/pages/fall-foliage/index.astro', 'utf8');
  const hero = readFileSync('src/components/FoliageMapHero.astro', 'utf8');
  assert.match(statePage, /preloadSrcset=\{map\.srcset\}/);
  assert.match(statePage, /image=\{map\.src\}/);
  assert.match(statePage, /FoliageMapHero/);
  assert.match(hubPage, /preloadSrcset=\{map\.srcset\}/);
  assert.match(hubPage, /src=\{hub\.esri\.url\}/);
  assert.match(hubPage, /<iframe/);
  assert.match(hero, /srcset=\{hero\.srcset\}/);
  assert.match(hero, /hero\.credit/);
  assert.match(hero, /width=\{hero\.width\}/);
  assert.match(hero, /height=\{hero\.height\}/);
});
