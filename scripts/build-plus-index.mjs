import { writeFileSync } from 'node:fs';
import { loadData } from '../src/lib/core.mjs';
import { tripFacts } from '../src/lib/tripfacts.mjs';
import { plusFlagList } from '../src/lib/plus/flags.mjs';

const { listings } = loadData();
const compact = listings.map((l) => {
  const trip = tripFacts(l.url);
  const flags = plusFlagList(l, trip);
  return {
    url: l.url,
    name: l.name,
    lat: Math.round(l.lat * 1e5) / 1e5,
    lng: Math.round(l.lng * 1e5) / 1e5,
    state: l.state,
    stateCode: l.stateCode,
    city: l.city.name,
    cityLat: l.city.lat,
    cityLng: l.city.lng,
    county: l.county || '',
    rating: l.os?.rating || 0,
    reviews: l.os?.reviews || 0,
    photos: l.os?.photosCount || 0,
    difficulty: trip?.difficulty || null,
    hike: trip?.hike || null,
    parking: trip?.parking || null,
    fees: trip?.fees || null,
    dogs: trip?.dogs || null,
    swimming: trip?.swimming || null,
    accessibility: trip?.accessibility || null,
    bestSeason: trip?.bestSeason || null,
    flags: flags.join(' '),
    nearby: (l.nearby || []).slice(0, 6).map((n) => ({
      name: n.listing.name,
      url: n.listing.url,
      miles: Math.round(n.miles * 10) / 10,
      direction: n.direction,
    })),
  };
});
const out = { built: new Date().toISOString(), count: compact.length, listings: compact };
writeFileSync(new URL('../data/plus-index.json', import.meta.url), JSON.stringify(out));
console.log(`plus index: ${compact.length} waterfalls`);
