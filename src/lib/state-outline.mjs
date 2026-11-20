// State outlines and bounding boxes from the U.S. Census Bureau cartographic
// boundary files, 2017 edition, redistributed as public-domain TopoJSON by
// the us-atlas project (states-10m.json). Each state is drawn in its own
// equal-area projection fitted to a 100x100 box, the same construction the
// state tiles use, so a waterfall's longitude and latitude land on that shape.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoArea, geoBounds, geoConicEqualArea, geoPath } from 'd3-geo';

const require = createRequire(import.meta.url);
const SIZE = 100;
const PAD = 4;

export const CENSUS_OUTLINE_CREDIT = 'U.S. Census Bureau cartographic boundary files, 2017 edition, redistributed as TopoJSON by the us-atlas project. The boundaries are public domain.';

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function roundBox(b) {
  return { west: round4(b.west), south: round4(b.south), east: round4(b.east), north: round4(b.north) };
}

// geoBounds crosses the antimeridian for Alaska (west > east). The embed and
// the inset both use the largest polygon that does not cross it, which is
// the mainland, the panhandle, and the Aleutians west to about 168°W.
function extentOf(f) {
  let [[west, south], [east, north]] = geoBounds(f);
  if (west > east) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let best = null;
    let bestA = -1;
    for (const coordinates of polys) {
      const g = { type: 'Polygon', coordinates };
      const [[w, s], [e, n]] = geoBounds(g);
      if (w > e) continue;
      const a = geoArea(g);
      if (a > bestA) {
        bestA = a;
        best = { west: w, south: s, east: e, north: n };
      }
    }
    if (best) return roundBox(best);
  }
  return roundBox({ west, south, east, north });
}

let cache = null;

function build() {
  if (cache) return cache;
  const topo = JSON.parse(readFileSync(require.resolve('us-atlas/states-10m.json'), 'utf8'));
  const feats = feature(topo, topo.objects.states).features;
  const states = {};
  for (const f of feats) {
    const name = f.properties.name;
    const proj = geoConicEqualArea();
    let fitTo = f;
    if (name === 'Alaska') {
      proj.rotate([152, 0]).parallels([55, 65]);
      fitTo = {
        type: 'MultiPoint',
        coordinates: [[-168, 52], [-130, 52], [-130, 71.5], [-168, 71.5], [-141, 72], [-141, 59]],
      };
    } else {
      const [[w, s], [e, n]] = geoPath().bounds(f);
      proj.rotate([-(w + e) / 2, 0]).parallels([s + (n - s) / 6, n - (n - s) / 6]);
    }
    proj.fitExtent([[PAD, PAD], [SIZE - PAD, SIZE - PAD]], fitTo);
    states[slugify(name)] = { name, d: geoPath(proj)(f), proj, bounds: extentOf(f) };
  }
  cache = states;
  return states;
}

export function stateOutline(slug) {
  const state = build()[slug];
  if (!state) throw new Error(`No Census outline for ${slug}`);
  return state;
}

export function projectState(slug, lon, lat) {
  const [x, y] = stateOutline(slug).proj([lon, lat]);
  return [x, y];
}
