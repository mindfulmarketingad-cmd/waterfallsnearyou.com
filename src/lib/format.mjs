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

export function addressText(l) {
  const a = l.os?.fullAddress || '';
  if (a.includes(',')) return a;
  const zip = l.os?.postalCode ? ` ${l.os.postalCode}` : '';
  return `${l.county ? `${l.county} County, ` : ''}${l.stateCode}${zip} (GPS ${l.lat.toFixed(4)}, ${l.lng.toFixed(4)})`;
}

export function listingFacts(l) {
  const f = [];
  if (l.os?.rating) f.push(['Rating', `${l.os.rating.toFixed(1)} (${fmtNum(l.os.reviews)} Google reviews)`]);
  const h = hoursSummary(l.os);
  if (h) f.push(['Hours', h]);
  f.push(['Address', addressText(l)]);
  if (l.os?.phone) f.push(['Phone', l.os.phone]);
  if (l.os?.site) f.push(['Website', new URL(l.os.site).hostname.replace(/^www\./, '')]);
  if (l.os?.reviewTags?.length) f.push(['Known for', l.os.reviewTags.slice(0, 5).join(', ')]);
  f.push(['Nearest town', `${l.city.name}, ${l.stateCode} (${fmtMiles(l.cityMiles)})`]);
  if (l.topoMap) f.push(['USGS topo', `${l.topoMap} quad`]);
  return f;
}

export { hoursSummary };

// Town-relative summary for listicles on town pages, so neighboring towns that share
// waterfalls still describe each one from their own vantage point.
export function relativeSummary(l, ctx) {
  const { from, miles: m, direction, index, reviewRank, total } = ctx;
  const parts = [];
  const where = l.county ? ` in ${l.county} County` : '';
  parts.push(index === 0
    ? `${l.name} is the closest named waterfall to ${from}, ${fmtMiles(m).replace(' mi', ' miles')} to the ${direction}${where}.`
    : `${l.name} lies ${fmtMiles(m).replace(' mi', ' miles')} ${direction} of ${from}${where}, number ${index + 1} of ${total} by distance.`);
  if (reviewRank) parts.push(reviewRank === 1 ? `It draws more Google reviews than any other waterfall near ${from}.` : `It ranks ${reviewRank}${['th', 'st', 'nd', 'rd'][reviewRank % 10 > 3 || [11, 12, 13].includes(reviewRank % 100) ? 0 : reviewRank % 10]} for review count among waterfalls near ${from}.`);
  if (l.os?.description) parts.push(l.os.description);
  else if (l.gnisDescription && !isPlss(l.gnisDescription)) parts.push(`USGS notes: ${l.gnisDescription}`);
  else if (l.city.name !== from) parts.push(`Its own nearest town is ${l.city.name}.`);
  return parts.join(' ');
}

// Official USGS name plus the popular Google Maps name when they clearly differ,
// e.g. "Upper Falls (Tahquamenon Falls)".
const nameKey = (n) => String(n).normalize('NFKD').replace(/[\u0300-\u036f\u02bb\u2018\u2019']/g, '').toLowerCase().replace(/\b(the|falls?|waterfalls?|of|upper|lower|middle)\b|[^a-z]/g, '');
export function displayName(l) {
  const g = l.os?.name;
  if (!g || l.source !== 'gnis' || !/[a-z]/i.test(g)) return l.name;
  if (/squaw/i.test(g)) return l.name; // retired derogatory name; USGS replaced it
  if (/state park|natural area|conservation|wildlife|scenic site|\bin california\b|,/i.test(g)) return l.name;
  const a = nameKey(l.name), b = nameKey(g);
  if (!b || a === b) return l.name;
  if (a && (a.includes(b) || b.includes(a) || dice(a, b) > 0.5)) return l.name; // same name, different spelling
  return `${l.name} (${g})`;
}
function dice(x, y) {
  const grams = (t) => { const m = new Map(); for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const gx = grams(x), gy = grams(y);
  let inter = 0;
  for (const [g, n] of gx) inter += Math.min(n, gy.get(g) || 0);
  return (2 * inter) / Math.max(1, x.length - 1 + y.length - 1);
}
