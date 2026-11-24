// GeoJSON of U.S. state outlines with each state's typical fall color window, for the foliage maps.
// Built once at build time into a static file. Outlines: U.S. Census Bureau 2017 cartographic boundary
// files via us-atlas (public domain), simplified and rounded to keep the file small.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { getFoliagePages } from '../../lib/foliage.mjs';

const require = createRequire(import.meta.url);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const round = (n: number) => Math.round(n * 1000) / 1000;
const roundCoords = (c: any): any => (typeof c[0] === 'number' ? [round(c[0]), round(c[1])] : c.map(roundCoords));

export function GET() {
  const peaks = JSON.parse(readFileSync(`${process.cwd()}/data/foliage-peaks.json`, 'utf8'));
  const guides = new Map(getFoliagePages().map((p: any) => [p.slug, p.url]));
  let topo: any = JSON.parse(readFileSync(require.resolve('us-atlas/states-10m.json'), 'utf8'));
  topo = simplify(presimplify(topo), quantile(presimplify(topo), 0.12));
  const features = (feature(topo, topo.objects.states) as any).features
    .map((f: any) => {
      const slug = slugify(f.properties.name);
      // Alaska's Aleutians cross the antimeridian and would draw a band across the map.
      let geometry = f.geometry;
      if (slug === 'alaska') {
        const polys = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates).filter((poly: any) => poly[0].every((p: number[]) => p[0] < 0));
        geometry = { type: 'MultiPolygon', coordinates: polys };
      }
      return {
        type: 'Feature',
        geometry: { type: geometry.type, coordinates: roundCoords(geometry.coordinates) },
        properties: { slug, name: f.properties.name, win: peaks[slug] || null, guide: guides.get(slug) || '' },
      };
    });
  return new Response(JSON.stringify({ type: 'FeatureCollection', features }), { headers: { 'Content-Type': 'application/json' } });
}
