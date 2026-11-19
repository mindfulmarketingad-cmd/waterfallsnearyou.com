// Fall foliage guides. Timing, species, and report links come only from the copy
// modules, which cite USDA Forest Service, state tourism, state forestry, or
// state park pages. Waterfall rows are published directory pages. Distances
// between stops are straight-line miles from those coordinates.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadData, miles } from './core.mjs';
import { publishedListing, publishedCity } from './publish.mjs';
import { trailFor } from './trails.mjs';
import { statedHeight } from './bestof.mjs';
import { getParks, parkQualifies } from './parks.mjs';
import { states as copyStates, hubCopy, foldedStates } from '../content/foliage/index.mjs';

const VARIES = 'Peak timing varies from year to year. A warm fall, an early frost, or a windstorm can move or mute the color, which is why the live report matters more than any calendar.';

function readImages() {
  const file = path.join(process.cwd(), 'data/foliage-images.json');
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf8'));
}

function fallView(l) {
  const trail = trailFor(l.url);
  const height = statedHeight(l);
  const usgs = height && height.source === 'USGS gazetteer' ? height.feet : null;
  return {
    name: l.name,
    url: l.url,
    county: l.county || '',
    city: l.city?.name || '',
    cityUrl: l.city && publishedCity(l.city) ? l.city.url : `/states/${l.stateSlug}#gazetteer`,
    reviews: l.os?.reviews || 0,
    rating: l.os?.rating || null,
    lat: l.lat,
    lng: l.lng,
    trailName: trail?.name || null,
    distanceText: trail?.distance?.text || null,
    elevationText: trail?.elevationGain || null,
    difficulty: trail?.difficulty || null,
    heightFeet: usgs,
    trailOrigin: trail?.distanceSource || null,
  };
}

function resolveStop(listings, stop, slug) {
  const raw = typeof stop === 'string' ? stop : '';
  const name = typeof stop === 'string' ? (raw.startsWith('/') ? '' : raw) : stop.name;
  const county = typeof stop === 'string' ? '' : (stop.county || '');
  const url = typeof stop === 'string' ? (raw.startsWith('/') ? raw : '') : (stop.url || '');
  let hits = listings.filter((l) => l.stateSlug === slug && publishedListing(l));
  if (url) hits = hits.filter((l) => l.url === url);
  else {
    hits = hits.filter((l) => l.name === name);
    if (county) hits = hits.filter((l) => l.county === county);
  }
  if (hits.length !== 1) {
    throw new Error(`Foliage stop ${slug} ${name || url} matched ${hits.length}`);
  }
  return fallView(hits[0]);
}

function parksFor(slug) {
  return getParks().filter(parkQualifies).filter((p) => p.falls.some((f) => f.stateSlug === slug)).map((p) => ({
    name: p.name,
    slug: p.slug,
    url: p.url,
    inState: p.falls.filter((f) => f.stateSlug === slug).length,
    total: p.falls.length,
  }));
}

let cache = null;

export function getFoliagePages() {
  if (cache) return cache;
  const { listings, states } = loadData();
  const images = readImages();
  cache = copyStates.map((copy) => {
    const directory = states.find((s) => s.slug === copy.slug) || null;
    const stops = (copy.stops || []).map((stop) => resolveStop(listings, stop, copy.slug));
    const legs = [];
    for (let i = 1; i < stops.length; i++) {
      legs.push({
        from: stops[i - 1].name,
        to: stops[i].name,
        miles: Math.round(miles(stops[i - 1], stops[i]) * 10) / 10,
      });
    }
    const pages = images[copy.slug] || [];
    return {
      ...copy,
      url: `/fall-foliage/${copy.slug}`,
      directoryUrl: directory?.url || null,
      stops,
      legs,
      parks: parksFor(copy.slug),
      images: pages,
      varies: VARIES,
    };
  });
  return cache;
}

export function getFoliageHub() {
  const images = readImages();
  return {
    ...hubCopy,
    url: '/fall-foliage',
    images: images.hub || [],
    varies: VARIES,
    states: getFoliagePages(),
    folded: foldedStates,
  };
}

export function foliagePaths() {
  return ['/fall-foliage', ...copyStates.map((s) => `/fall-foliage/${s.slug}`)];
}

export const FOLIAGE_VARIES = VARIES;
