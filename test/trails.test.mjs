import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseTripHike, assembleTrail, trailRows, trailPlaceSchema } from '../src/lib/trails.mjs';
import { trailFromElements, formatDistance } from '../src/lib/osm-trail.mjs';

test('trip-facts distances keep the source label', () => {
  const franklin = parseTripHike('2 miles round trip on Franklin Falls Trail 1036 to a 70-foot falls; in winter it is about 7 miles round trip', 'franklin falls');
  assert.equal(franklin.name, 'Franklin Falls Trail 1036');
  assert.equal(franklin.distance.text, '2 miles round trip');
  assert.equal(franklin.distance.kind, 'round-trip');

  const each = parseTripHike('Paved trail about 0.4 mile each way (0.8 mile round trip); the accessible Lion\'s Eye Trail is about 0.1 mile');
  assert.equal(each.distance.text, 'About 0.4 mile one way (0.8 mile round trip)');
  assert.equal(each.type, 'out-and-back');
  assert.equal(each.name, null);

  const vague = parseTripHike('Short walk from the park\'s lots to the viewing areas above the falls');
  assert.equal(vague.name, null);
  assert.equal(vague.distance, null);
});

test('a labeled loop length is not turned into a one-way hike', () => {
  const loop = parseTripHike('The Falls Loop Trail is about 1 to 1.2 miles', 'burney falls');
  assert.equal(loop.name, 'Falls Loop Trail');
  assert.equal(loop.distance.text, 'About 1 to 1.2 miles loop');
  assert.equal(loop.type, 'loop');
});

test('under and winter clauses are not promoted to a definite distance', () => {
  const under = parseTripHike('Short trails within the recreation area; commonly under 1 mile round trip for the main overlooks');
  assert.equal(under.distance.text, 'Under 1 mile round trip');
  const winter = parseTripHike('About 0.1 mile walk down from a pullout on Old Fall River Road; 2.2 miles round trip from the winter closure gate when the road is closed');
  assert.equal(winter.distance, null);
});

test('OpenStreetMap distance is measured along the path and labeled one way', () => {
  const elements = [
    { type: 'node', id: 1, lat: 47, lon: -121, tags: { highway: 'trailhead', name: 'Cedar Falls Trailhead' } },
    {
      type: 'way', id: 2,
      tags: { highway: 'path', name: 'Cedar Falls Trail', sac_scale: 'hiking', dog: 'leashed' },
      geometry: [[47, -121], [46.995, -121], [46.99, -121]].map(([lat, lon]) => ({ lat, lon })),
    },
  ];
  const trail = trailFromElements({ name: 'Cedar Falls', lat: 46.99015, lng: -121.00005 }, elements);
  assert.equal(trail.name, 'Cedar Falls Trail');
  assert.equal(trail.distance.kind, 'one-way');
  assert.match(trail.distance.text, /one way$/);
  assert.equal(trail.type, 'out-and-back');
  assert.equal(trail.trailhead.name, 'Cedar Falls Trailhead');
  assert.match(trail.trailhead.map, /^https:\/\/www\.openstreetmap\.org\//);
  assert.equal(trail.difficulty, 'SAC T1 hiking');
  assert.match(trail.dogs, /leash/i);
  assert.equal(trail.sources[0].origin, 'openstreetmap');
  assert.match(trail.sources[0].url, /openstreetmap\.org\/way\/2$/);
});

test('unnamed sidewalks and private paths are not reported as the hike', () => {
  const sidewalk = [{
    type: 'way', id: 9,
    tags: { highway: 'footway', footway: 'sidewalk', name: 'Main Street Sidewalk' },
    geometry: [{ lat: 40, lon: -105 }, { lat: 40.002, lon: -105 }],
  }, { type: 'node', id: 8, lat: 40, lon: -105, tags: { amenity: 'parking' } }];
  assert.equal(trailFromElements({ name: 'Town Falls', lat: 40.001, lng: -105 }, sidewalk), null);

  const priv = [{
    type: 'way', id: 4,
    tags: { highway: 'path', name: 'Secret Trail', access: 'private' },
    geometry: [{ lat: 40, lon: -105 }, { lat: 40.008, lon: -105 }],
  }, { type: 'node', id: 5, lat: 40, lon: -105, tags: { highway: 'trailhead', name: 'Secret Trailhead' } }];
  assert.equal(trailFromElements({ name: 'Secret Falls', lat: 40.007, lng: -105 }, priv), null);
});

test('a long trail to a differently named trailhead is not the hike', () => {
  const geometry = [];
  for (let i = 0; i <= 20; i++) geometry.push({ lat: 45.58 - i * 0.002, lon: -122.11 });
  const elements = [
    { type: 'node', id: 3, lat: 45.54, lon: -122.11, tags: { highway: 'trailhead', name: 'Oneonta Trailhead' } },
    { type: 'way', id: 4, tags: { highway: 'path', name: 'Gorge Trail #400' }, geometry },
  ];
  const trail = trailFromElements({ name: 'Multnomah Falls', lat: 45.58, lng: -122.11 }, elements);
  assert.equal(trail, null);
});

test('bridge names and bike trails are not shown as the hiking trail', () => {
  const bridge = [{
    type: 'way', id: 15,
    tags: { highway: 'footway', name: 'Bridge 1', bridge: 'yes' },
    geometry: [{ lat: 44.9, lon: -93.2 }, { lat: 44.901, lon: -93.2 }],
  }];
  assert.equal(trailFromElements({ name: 'Minnehaha Falls', lat: 44.9004, lng: -93.20005 }, bridge), null);
  const facts = {
    hike: '0.35 mile one way on the walk to the base of the falls',
    sources: [['Tennessee State Parks', 'https://tnstateparks.com/parks/fall-creek-falls']],
  };
  const merged = assembleTrail(facts, {
    name: 'Lake Bike Trail',
    distance: { text: '0.6 miles one way', kind: 'one-way' },
    sources: [{ title: 'OpenStreetMap contributors (way 9)', url: 'https://www.openstreetmap.org/way/9', origin: 'openstreetmap' }],
  }, 'fall creek falls');
  assert.equal(merged.distance.text, '0.35 mile one way');
  assert.equal(merged.name, null);
  assert.equal(merged.sources.some((s) => s.origin === 'openstreetmap'), false);
});

test('a named path with no trailhead still contributes its name', () => {
  const elements = [{
    type: 'way', id: 11,
    tags: { highway: 'path', name: 'Lookout Trail' },
    geometry: [{ lat: 44, lon: -122 }, { lat: 44.002, lon: -122 }],
  }];
  const trail = trailFromElements({ name: 'Lookout Falls', lat: 44.001, lng: -122.0002 }, elements);
  assert.equal(trail.name, 'Lookout Trail');
  assert.equal(trail.distance, undefined);
  assert.match(trail.sources[0].url, /way\/11$/);
});

test('hand-checked distances win over a mapped distance', () => {
  const facts = {
    checked: '2026-11-03',
    hike: '2 miles round trip on Franklin Falls Trail 1036',
    dogs: 'Allowed on leash',
    sources: [['U.S. Forest Service: Franklin Falls', 'https://www.fs.usda.gov/r06/example']],
  };
  const osm = {
    name: 'Some Other Path',
    distance: { text: '0.4 miles one way', kind: 'one-way' },
    dogs: 'Dogs not allowed (OpenStreetMap dog=no)',
    sources: [{ title: 'OpenStreetMap contributors (way 1)', url: 'https://www.openstreetmap.org/way/1', origin: 'openstreetmap' }],
  };
  const trail = assembleTrail(facts, osm, 'franklin falls');
  assert.equal(trail.name, 'Franklin Falls Trail 1036');
  assert.equal(trail.distance.text, '2 miles round trip');
  assert.equal(trail.distanceSource, 'trip-facts');
  assert.equal(trail.dogs, 'Allowed on leash');
  assert.equal(trail.sources[0].origin, 'trip-facts');
  assert.ok(trailRows(trail).some((r) => r.label === 'Distance' && r.text === '2 miles round trip'));
  const ld = trailPlaceSchema(trail, 'https://www.waterfallsnearyou.com/example#trail');
  assert.equal(ld.additionalType, 'HikingTrail');
  assert.equal(ld.name, 'Franklin Falls Trail 1036');
  assert.equal(ld.description, '2 miles round trip');
});

test('structured data is omitted when the trail has no name', () => {
  const trail = assembleTrail({
    hike: '2 miles round trip',
    sources: [['Example', 'https://example.com/falls']],
  }, null, 'sample falls');
  assert.equal(trail.name, null);
  assert.equal(trailPlaceSchema(trail, 'https://www.waterfallsnearyou.com/x#trail'), null);
  assert.ok(trailRows(trail).some((r) => r.label === 'Distance'));
});

test('indexing does not read trail data', () => {
  const src = readFileSync('src/lib/indexing.mjs', 'utf8');
  assert.equal(src.includes('trails.json'), false);
  assert.equal(src.includes('trailFor'), false);
});

test('mile rounding does not invent a shorter hike', () => {
  assert.equal(formatDistance(50, 'one-way'), null);
  const one = formatDistance(1609.344, 'one-way');
  assert.equal(one.text, '1 mile one way');
  const loop = formatDistance(3218.7, 'loop');
  assert.equal(loop.text, '2 miles loop');
});
