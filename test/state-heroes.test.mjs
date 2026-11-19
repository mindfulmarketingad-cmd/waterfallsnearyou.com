import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { loadData } from '../src/lib/core.mjs';
import { stateHero } from '../src/lib/state-heroes.mjs';

const LICENSES = /^(public domain|cc0|cc by( \d+\.\d+)?|cc by-sa( \d+\.\d+)?)$/i;

test('every state page has a hosted hero and no new pages', async () => {
  const { states } = loadData();
  assert.equal(states.length, 50);
  let waterfalls = 0;
  let landscapes = 0;
  for (const state of states) {
    const hero = stateHero(state.slug);
    assert.ok(hero, state.slug);
    assert.equal(hero.width, 1200);
    assert.equal(hero.height, 630);
    assert.match(hero.license, LICENSES);
    assert.match(hero.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.equal(hero.src.startsWith('/images/states/'), true);
    assert.equal(hero.src.includes('/images/lifestyle/'), false);
    assert.ok(hero.variants.includes(1200));
    for (const w of hero.variants) {
      const file = `public/images/states/${state.slug}-${w}.webp`;
      assert.equal(existsSync(file), true, file);
    }
    const meta = await sharp(`public/images/states/${state.slug}-1200.webp`).metadata();
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 630);
    assert.equal(meta.format, 'webp');
    if (hero.kind === 'waterfall') {
      waterfalls += 1;
      assert.ok(hero.falls);
      assert.match(hero.alt, new RegExp(hero.falls.split(' ')[0], 'i'));
      assert.ok(hero.placePhrase);
    } else {
      landscapes += 1;
      assert.match(hero.caption, /Landscape photograph, not a waterfall/i);
      assert.doesNotMatch(hero.alt, /waterfall/i);
    }
  }
  assert.equal(waterfalls + landscapes, 50);
  assert.equal(landscapes, 5);
  assert.equal(waterfalls, 45);
});
