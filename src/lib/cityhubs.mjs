// "Waterfalls near [city]" hubs for big US metros. Each hub in data/city-hubs.json has a hand-written
// intro; the picks are indexed, publicly accessible waterfalls within HUB_RADIUS straight-line miles,
// ordered by Google review volume. New hubs are added a couple at a time as their intros are written.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadData, miles, bearing } from './core.mjs';
import { isPrivate } from './bestof.mjs';
import { richListing } from './indexing.mjs';
import { tripFacts } from './tripfacts.mjs';

export const HUB_RADIUS = 100;
const MAX_PICKS = 15;

let cache = null;
export function getCityHubs() {
  if (cache) return cache;
  const { listings, states } = loadData();
  const byCode = Object.fromEntries(states.map((s) => [s.code, s]));
  const metros = JSON.parse(readFileSync(path.join(process.cwd(), 'data/us-metros.json'), 'utf8'));
  const hubs = JSON.parse(readFileSync(path.join(process.cwd(), 'data/city-hubs.json'), 'utf8'));
  const pool = listings.filter((l) => !isPrivate(l) && richListing(l));
  cache = hubs.map((h) => {
    const m = metros.find((x) => x.name === h.name && x.st === h.st);
    if (!m) throw new Error(`city hub ${h.name}, ${h.st} not in data/us-metros.json`);
    const here = { lat: m.lat, lng: m.lng };
    const near = pool.map((l) => ({ listing: l, miles: miles(here, l) })).filter((x) => x.miles <= HUB_RADIUS)
      .sort((a, b) => (b.listing.os?.reviews || 0) - (a.listing.os?.reviews || 0));
    // Drop a second listing for the same falls (two names within a quarter mile).
    const picks = [];
    for (const x of near) {
      if (picks.some((p) => miles(p.listing, x.listing) < 0.25)) continue;
      picks.push({ ...x, direction: bearing(here, x.listing), trip: tripFacts(x.listing.url) });
      if (picks.length >= MAX_PICKS) break;
    }
    return { ...h, metro: m, state: byCode[h.st], url: `/waterfalls-near/${h.slug}`, picks, total: near.length,
      closest: [...picks].sort((a, b) => a.miles - b.miles)[0] };
  });
  return cache;
}
