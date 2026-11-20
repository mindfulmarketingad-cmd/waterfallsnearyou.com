import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadData } from '../src/lib/core.mjs';
import { publishedListing } from '../src/lib/publish.mjs';
import { stateOutline } from '../src/lib/state-outline.mjs';
import { stateMapModel } from '../src/lib/state-map.mjs';
import { foliageEmbed } from '../src/lib/foliage-map.mjs';
import { getFoliagePages } from '../src/lib/foliage.mjs';

const { states, listings } = loadData();
const pages = getFoliagePages();

test('every state page and the District has a Census waterfall map of its published pages', () => {
  const statePage = readFileSync('src/pages/states/[state].astro', 'utf8');
  const component = readFileSync('src/components/StateWaterfallMap.astro', 'utf8');
  assert.match(statePage, /Map of waterfalls in/);
  assert.match(statePage, /id="state-waterfall-map"/);
  assert.match(statePage, /<StateWaterfallMap/);
  assert.match(component, /aspect-ratio:\s*1\s*\/\s*1/);
  assert.match(component, /Census Bureau/);
  assert.equal(states.some((s) => s.slug === 'district-of-columbia'), true);
  for (const state of states) {
    const model = stateMapModel(state.slug, { name: state.name });
    assert.equal(model.title, `Map of waterfalls in ${state.name}`, state.slug);
    assert.match(model.source, /U\.S\. Census Bureau/);
    assert.match(model.source, /public domain/);
    assert.match(model.outline, /^M/);
    const published = listings.filter((l) => l.stateSlug === state.slug && publishedListing(l));
    assert.equal(model.markers.length, published.length, state.slug);
    const urls = new Set(model.markers.map((m) => m.url));
    for (const l of published) {
      assert.equal(urls.has(l.url), true, l.url);
      const marker = model.markers.find((m) => m.url === l.url);
      assert.match(marker.url, /^\//);
      assert.equal(marker.featured, false);
    }
    const drawn = model.markers.filter((m) => m.x != null);
    if (published.length > 0 && state.slug !== 'alaska') {
      assert.ok(drawn.length / published.length >= 0.9, `${state.slug} ${drawn.length}/${published.length}`);
      for (const m of drawn) {
        assert.ok(m.x >= -2 && m.x <= 102 && m.y >= -2 && m.y <= 102, m.url);
      }
    }
  }
});

test('foliage state pages embed the hub map, centered on the Census box, with the itinerary highlighted', () => {
  const page = readFileSync('src/pages/fall-foliage/[state].astro', 'utf8');
  const embedComponent = readFileSync('src/components/FoliageMap.astro', 'utf8');
  const css = readFileSync('src/styles/global.css', 'utf8');
  assert.match(page, /<FoliageMap/);
  assert.match(page, /When color usually arrives[\s\S]*<FoliageMap[\s\S]*The live report/);
  assert.match(embedComponent, /Fall foliage map/);
  assert.match(embedComponent, /loading="lazy"/);
  assert.match(embedComponent, /title=\{embed\.title\}/);
  assert.match(embedComponent, /embed\.caption/);
  assert.match(embedComponent, /aspect-ratio:\s*1\s*\/\s*1/);
  assert.match(embedComponent, /aspect-ratio:\s*3\s*\/\s*4/);
  assert.match(embedComponent, /<StateWaterfallMap/);
  assert.match(css, /\.foliage-map iframe \{[^}]*height:\s*520px/);
  assert.equal(pages.length, 46);
  const scales = {};
  for (const foliage of pages) {
    const embed = foliageEmbed(foliage.slug, foliage.name);
    scales[foliage.slug] = embed.scale;
    assert.match(embed.src, /^https:\/\/experience\.arcgis\.com\/experience\/4c5ee350d0f745a2a4c4608f4c19db51#/);
    for (const id of ['widget_296', 'widget_384', 'widget_256', 'widget_291']) {
      assert.match(embed.src, new RegExp(`${id}=viewpoint:`), foliage.slug);
    }
    assert.doesNotMatch(embed.src, /extent=/);
    assert.match(embed.title, new RegExp(foliage.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(embed.caption, /Fall Foliage Viewing/);
    assert.match(embed.caption, /Credit: Esri/);
    assert.match(embed.caption, /The map is a supplement/);
    assert.match(embed.attribution, /Credit: Esri/);
    assert.match(embed.lead, /not the source of the dates/i);
    assert.equal(embed.lead.includes('peak week'), false);
    const decoded = decodeURIComponent(embed.src);
    assert.match(decoded, new RegExp(`"x":${embed.center.lon}`));
    assert.match(decoded, new RegExp(`"y":${embed.center.lat}`));
    assert.match(decoded, new RegExp(`"scale":${embed.scale}`));
    const { west, south, east, north } = embed.bounds;
    assert.ok(embed.center.lon >= west && embed.center.lon <= east, foliage.slug);
    assert.ok(embed.center.lat >= south && embed.center.lat <= north, foliage.slug);
    assert.ok(embed.scale > 1000 && embed.scale < 80000000, `${foliage.slug} ${embed.scale}`);
    const model = stateMapModel(foliage.slug, { name: foliage.name, featuredUrls: foliage.stops.map((s) => s.url) });
    assert.match(model.source, /Census Bureau/);
    for (const stop of foliage.stops) {
      const marker = model.markers.find((m) => m.url === stop.url);
      assert.ok(marker, `${foliage.slug} ${stop.url}`);
      assert.equal(marker.featured, true);
    }
    const featuredUrls = new Set(foliage.stops.map((s) => s.url));
    for (const marker of model.markers) {
      if (!featuredUrls.has(marker.url)) assert.equal(marker.featured, false);
    }
  }
  const vt = foliageEmbed('vermont', 'Vermont');
  assert.ok(vt.bounds.west < -73.3 && vt.bounds.west > -73.6);
  assert.ok(vt.bounds.east < -71.3 && vt.bounds.east > -71.7);
  assert.ok(vt.bounds.south < 42.9 && vt.bounds.south > 42.6);
  assert.ok(vt.bounds.north > 44.8 && vt.bounds.north < 45.2);
  const ak = stateOutline('alaska').bounds;
  assert.ok(ak.west < -150 && ak.west > -175, ak.west);
  assert.ok(ak.east < -125 && ak.east > -145, ak.east);
  assert.ok(ak.south > 50 && ak.south < 60, ak.south);
  assert.ok(ak.north > 65 && ak.north < 72, ak.north);
  assert.ok(scales['rhode-island'] < scales.vermont);
  assert.ok(scales.vermont < scales.texas);
  assert.ok(scales.texas < scales.alaska);
});
