// Card data for the /national-parks grid and its FAQ. Every value is read from the park records in
// parks.mjs (published waterfall pages inside NPS boundaries, trail files, USGS gauges, fee records);
// nothing is written by hand here.
import { getParks, parkQualifies } from './parks.mjs';
import { fmtNum } from './format.mjs';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const oneDecimal = (n) => (Math.round(n * 10) / 10).toString();

export function parkCards() {
  return getParks().filter(parkQualifies).map((p) => {
    const states = [...new Map(p.falls.map((f) => [f.stateSlug, { slug: f.stateSlug, name: f.state, code: f.stateCode }])).values()];
    const towns = [...new Map(p.falls.filter((f) => f.city).map((f) => [`${f.stateSlug}|${f.city}`, { slug: slug(f.city), name: f.city, state: f.stateSlug, stateCode: f.stateCode }])).values()];
    const counties = [...new Set(p.falls.map((f) => f.county).filter(Boolean))];
    const easy = p.analysis.easiest && p.analysis.easiest.miles > 0 ? p.analysis.easiest : null;
    const top = p.analysis.busiest;
    const img = p.images[0] || null;
    return {
      slug: p.slug,
      name: p.name,
      url: p.url,
      states,
      towns,
      counties,
      count: p.falls.length,
      points: p.falls.map((f) => [Number(f.lat.toFixed(4)), Number(f.lng.toFixed(4)), f.name, f.url]),
      nearestTown: p.analysis.towns[0] || null,
      easy: easy ? { name: easy.name, url: easy.url, miles: oneDecimal(easy.miles), kind: easy.distanceKind } : null,
      top: top ? { name: top.name, url: top.url, rating: top.rating, reviews: top.reviews } : null,
      peakMonth: p.gauge?.peakMonth || null,
      hasFees: Array.isArray(p.fees) && p.fees.length > 0,
      image: img ? { full: img.src, src: `/images/parks/${p.slug}/card.webp`, alt: img.alt, credit: img.credit, license: img.license, sourceUrl: img.sourceUrl } : null,
      searchText: [p.name, ...states.map((s) => s.name), ...towns.map((t) => t.name), ...counties].join(' ').toLowerCase(),
    };
  });
}

export const mileText = (e) => `${e.miles} ${e.miles === '1' ? 'mile' : 'miles'}${e.kind ? ` ${e.kind.replace('-', ' ')}` : ''}`;
export { fmtNum };
