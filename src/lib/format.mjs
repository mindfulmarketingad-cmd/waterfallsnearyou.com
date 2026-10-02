import { imageFor, hoursSummary } from './core.mjs';

export const fmtMiles = (m) => (m < 0.1 ? 'under 0.1 mi' : m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m)} mi`);
export const fmtNum = (n) => Number(n).toLocaleString('en-US');
export const stars = (r) => {
  const full = Math.round(r);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
};
export const gnisUrl = (id) => `https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/${id}`;
export const directionsUrl = (l) => `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;
export const appleMapsUrl = (l) => `https://maps.apple.com/?daddr=${l.lat},${l.lng}&q=${encodeURIComponent(l.name)}`;
export const osmUrl = (l) => `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=15/${l.lat}/${l.lng}`;
export const osmEmbed = (l, d = 0.02) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${(l.lng - d * 1.6).toFixed(5)}%2C${(l.lat - d).toFixed(5)}%2C${(l.lng + d * 1.6).toFixed(5)}%2C${(l.lat + d).toFixed(5)}&layer=mapnik&marker=${l.lat}%2C${l.lng}`;
export const topoUrl = (l) => `https://apps.nationalmap.gov/viewer/?center=${l.lng},${l.lat}&level=15`;

// Google photo URLs can expire; fall back to the generated featured image if one fails to load.
export const imgFallback = (l) => (l.os?.photo ? `this.onerror=null;this.src='${imageFor(l.url)}'` : undefined);
export const listingImage = (l) => l.os?.photo || imageFor(l.url);
export const listingImageAlt = (l) =>
  l.os?.photo ? `Photo of ${l.name} near ${l.city.name}, ${l.stateCode}` : `Illustrated featured image for ${l.name} in ${l.county ? `${l.county} County, ` : ''}${l.state}`;

export function nearText(l) {
  if (l.cityMiles < 0.5) return `in ${l.city.name}`;
  return `about ${fmtMiles(l.cityMiles).replace(' mi', ' miles')} ${l.cityDirection} of ${l.city.name}`;
}

const isPlss = (s) => /^Located in sec/i.test(s || '');

export function shortSummary(l) {
  if (l.os?.description) return l.os.description;
  const county = l.county ? `${l.county} County, ` : '';
  let s = `${l.name} is a waterfall in ${county}${l.state}, ${nearText(l)}.`;
  if (l.gnisDescription && !isPlss(l.gnisDescription)) s += ` USGS notes: ${l.gnisDescription}`;
  else if (l.gnisHistory) s += ` ${l.gnisHistory.split(/(?<=\.)\s/)[0]}`;
  else if (l.topoMap) s += ` It appears on the USGS ${l.topoMap} topographic map.`;
  return s;
}

export function longSummary(l) {
  const parts = [];
  const county = l.county ? `${l.county} County, ` : '';
  const kind = l.os?.category && !/waterfall/i.test(l.os.category) ? `${l.os.category.toLowerCase()} listed as a waterfall destination` : 'waterfall';
  parts.push(`${l.name} is a ${l.source === 'gnis' ? 'named ' : ''}${kind} in ${county}${l.state}, located ${nearText(l)}.`);
  if (l.topoMap) parts.push(`The U.S. Geological Survey records it on the ${l.topoMap} 7.5-minute topographic quadrangle at ${l.latText}, ${l.lngText} (${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}).`);
  else parts.push(`Its mapped position is ${l.latText}, ${l.lngText} (${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}).`);
  if (l.variants?.length) parts.push(`Historical sources also record the name${l.variants.length > 1 ? 's' : ''} ${listJoin(l.variants)}.`);
  const lm = (l.landmarks || []).filter((x) => x.name !== l.name).slice(0, 3);
  if (lm.length) parts.push(`Named features close by in the federal gazetteer include ${listJoin(lm.map((x) => `${x.name} (${x.type.toLowerCase()}, ${fmtMiles(x.miles)})`))}.`);
  const n = l.nearby?.[0];
  if (n) parts.push(`The nearest other waterfall in this directory is ${n.listing.name}, ${fmtMiles(n.miles).replace(' mi', ' miles')} to the ${n.direction}.`);
  return parts.join(' ');
}

export function listJoin(arr) {
  if (arr.length <= 1) return arr.join('');
  return `${arr.slice(0, -1).join(', ')}${arr.length > 2 ? ',' : ''} and ${arr[arr.length - 1]}`;
}

export function listingFacts(l) {
  const f = [];
  if (l.os?.rating) f.push(['Rating', `${l.os.rating.toFixed(1)} (${fmtNum(l.os.reviews)} Google reviews)`]);
  const h = hoursSummary(l.os);
  if (h) f.push(['Hours', h]);
  f.push(['Address', l.os?.fullAddress || `${l.county ? `${l.county} County, ` : ''}${l.stateCode} (GPS ${l.lat.toFixed(4)}, ${l.lng.toFixed(4)})`]);
  if (l.os?.phone) f.push(['Phone', l.os.phone]);
  if (l.os?.site) f.push(['Website', new URL(l.os.site).hostname.replace(/^www\./, '')]);
  f.push(['Nearest town', `${l.city.name}, ${l.stateCode} (${fmtMiles(l.cityMiles)})`]);
  if (l.topoMap) f.push(['USGS topo', `${l.topoMap} quad`]);
  return f;
}

export { hoursSummary };
