import { loadData } from '../lib/core.mjs';
import { listingPhoto } from '../lib/photos.mjs';
import { getPosts } from '../lib/blog.mjs';
import { getStateLists, getSmallest, getRoadside } from '../lib/bestof.mjs';

export function GET() {
  const { listings, cities, states } = loadData();
  const body = {
    l: listings.map((l) => { const ph = listingPhoto(l); return [l.name, l.url, l.city.name, l.stateCode, +l.lat.toFixed(4), +l.lng.toFixed(4), l.county || '', ph.fallback ? ph.src : '', l.os?.rating || 0, l.os?.reviews || 0, (l.variants || []).join('|'), Math.round(l.score * 10) / 10, ph.caption || '']; }),
    c: cities.map((c) => [c.name, c.url, c.stateCode, c.nearby.filter((n) => n.miles <= 30).length]),
    s: states.map((s) => [s.name, s.url, s.code, s.listings.length]),
    b: [...getPosts().map((p) => [p.title, p.url, p.description]), ...[getRoadside(), getSmallest(), ...getStateLists()].map((p) => [p.title, p.url, p.description])],
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
