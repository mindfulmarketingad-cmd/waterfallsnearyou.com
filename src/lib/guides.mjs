// "[Waterfall] Guide Before Visiting" posts. Built only for waterfalls with enough real material to
// say something specific (25+ Google reviews, a Google description, or USGS naming history); every
// statement comes from that waterfall's data, its state content, or general safety guidance.
import { loadData, slugify } from './core.mjs';
import { isPrivate } from './bestof.mjs';
import { regionForCounty, stateContent, tagMatches } from './insights.mjs';
import { fmtMiles, listJoin } from './format.mjs';

export const GUIDE_YEAR = 2026;
export const GUIDES_PUBLISHED = new Date('2026-10-05T12:00:00Z');
const isPlss = (s) => /^Located in sec/i.test(s || '');
const fmt = (n) => Number(n).toLocaleString('en-US');
const mi = (m) => fmtMiles(m).replace(' mi', ' miles');
const DESERT = new Set(['AZ', 'NM', 'NV', 'UT']);
const NORTH = new Set(['AK', 'ME', 'MN', 'MT', 'ND', 'NH', 'VT', 'WI', 'MI', 'WY', 'ID']);
const HARD = /steep|strenuous|elevation|rocky|climb|difficult|incline|scramble|stairs|steps/i;
const EASY = /easy|short|flat|paved|accessible|boardwalk|walk to falls|roadside|parking/i;
const HIKE = /hik|trail|trek|loop|path/i;

export const qualifies = (l) => !isPrivate(l) && (l.os?.reviews >= 25 || !!l.gnisHistory || !!l.os?.description);

let cache = null;
export function getGuides() {
  if (cache) return cache;
  const { listings } = loadData();
  const picks = listings.filter(qualifies);
  const nameCount = {};
  for (const l of picks) nameCount[slugify(l.name)] = (nameCount[slugify(l.name)] || 0) + 1;
  const used = new Set();
  const titleCount = {};
  for (const l of picks) titleCount[l.name] = (titleCount[l.name] || 0) + 1;
  cache = picks.map((l) => {
    let slug = slugify(l.name);
    if (nameCount[slug] > 1) slug = `${slug}-${slugify(l.county || l.city.name)}-${l.stateCode.toLowerCase()}`;
    let n = 2;
    while (used.has(slug)) slug = `${slugify(l.name)}-${slugify(l.city.name)}-${l.stateCode.toLowerCase()}${n > 2 ? `-${n}` : ''}`, n++;
    used.add(slug);
    const g = build(l, slug);
    if (titleCount[l.name] > 1) g.title = `${g.title} (${l.county ? `${l.county} County, ` : `${l.city.name}, `}${l.stateCode})`;
    return g;
  });
  return cache;
}
export const guideFor = (l) => getGuides().find((g) => g.listing === l) || null;

function crowdLevel(r) {
  if (!r) return null;
  if (r >= 1000) return { label: 'Very busy', note: `With ${fmt(r)} Google reviews, this is one of the most visited waterfalls in the area. Arrive early, ideally on a weekday, and expect parking to fill on summer weekends and holidays.` };
  if (r >= 250) return { label: 'Popular', note: `${fmt(r)} Google reviews make it a well-known stop. Weekday mornings are the quietest time to visit.` };
  if (r >= 50) return { label: 'Moderate', note: `${fmt(r)} Google reviews suggest steady but manageable traffic outside peak weekends.` };
  return { label: 'Quieter', note: `With ${fmt(r)} reviews, it sees fewer visitors than the region's headline falls, so you may have it to yourself on a weekday.` };
}

function difficulty(l) {
  const tags = l.os?.reviewTags || [];
  const desc = l.os?.description || '';
  const hard = [...tags.filter((t) => HARD.test(t)), ...(HARD.test(desc) ? [desc] : [])];
  const easy = [...tags.filter((t) => EASY.test(t)), ...(EASY.test(desc) && !HIKE.test(desc) ? [desc] : [])];
  if (hard.length && !easy.length) return { label: 'Expect effort', note: `Reviewers mention ${listJoin(tags.filter((t) => HARD.test(t)).slice(0, 3).map((t) => `"${t}"`)) || 'a demanding approach'}, so plan for uneven or steep ground.` };
  if (easy.length && !hard.length) return { label: 'Easy access reported', note: `Reviewers describe the approach with ${listJoin(tags.filter((t) => EASY.test(t)).slice(0, 3).map((t) => `"${t}"`)) || 'easy-access language'}.` };
  if (easy.length && hard.length) return { label: 'Mixed reports', note: 'Reviews mention both easy sections and steep or rocky stretches; footing varies with the route you take.' };
  if (tags.some((t) => HIKE.test(t)) || HIKE.test(desc)) return { label: 'Short hike likely', note: 'Visitors reach it on foot by trail. Check the current trail map for distance and elevation before you go.' };
  return null;
}

function packingList(l) {
  const items = [
    ['Offline map and coordinates', `Save ${l.lat.toFixed(5)}, ${l.lng.toFixed(5)} and download offline maps; cell service is often weak near waterfalls.`],
    ['Shoes with real grip', 'Rock near falling water stays wet and slick even in dry weather.'],
    ['Water and a snack', 'More than you think you need, even for a short walk.'],
    ['A light rain layer', 'Spray from the falls and quick-moving showers can soak you.'],
  ];
  const tags = (l.os?.reviewTags || []).join(' ').toLowerCase();
  const swim = tagMatches(l, 'swim');
  if (swim) items.push(['Towel, water shoes and a plan', 'Visitors mention swimming here. Water is often cold and currents near falls can be strong; never swim above a drop, and keep children within reach.']);
  if (HARD.test(tags)) items.push(['Trekking poles', 'Helpful on steep or rocky sections that reviewers mention.']);
  if (tagMatches(l, 'dogs')) items.push(['Leash and waste bags', 'Reviewers mention dogs; keep them leashed near drop-offs and pack out waste.']);
  if (tagMatches(l, 'family')) items.push(['Extra layers for kids', 'Children chill quickly in the spray zone; bring a dry change of clothes.']);
  if ((l.os?.photosCount || 0) >= 200) items.push(['Camera and a small tripod', `Visitors have shared ${fmt(l.os.photosCount)} photos of it; a tripod lets you shoot silky water in low light.`]);
  if (DESERT.has(l.stateCode)) items.push(['Sun protection and extra water', 'Desert heat builds fast; carry more water than usual and check for flash flood warnings before entering any canyon.']);
  if (NORTH.has(l.stateCode)) items.push(['Warm layers', 'Northern and mountain weather changes quickly; spring and fall mornings can be near freezing.']);
  if (l.stateCode === 'HI') items.push(['Rain gear and insect repellent', 'Hawaiian waterfall trails are often muddy, and stream levels can rise quickly after upstream rain.']);
  items.push(['Headlamp', 'In case your visit runs later than planned; check sunset time in the conditions panel above.']);
  return items;
}

function history(l, state) {
  const out = [];
  if (l.gnisHistory) out.push(`According to the U.S. Geological Survey's naming record: ${l.gnisHistory.replace(/\s+/g, ' ').trim()}`);
  if (l.variants?.length) out.push(`Older maps and records also list it as ${listJoin(l.variants.slice(0, 3))}${l.variants.length > 3 ? `, among ${l.variants.length} recorded variant names` : ''}.`);
  if (l.gnisDescription && !isPlss(l.gnisDescription)) out.push(`The federal gazetteer describes it this way: ${l.gnisDescription.replace(/\s+/g, ' ').trim()}`);
  if (l.gnisCreated) {
    const d = new Date(l.gnisCreated);
    out.push(`${l.name} was entered in the Geographic Names Information System on ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}${l.topoMap ? `, and it appears on the USGS ${l.topoMap} 7.5-minute topographic map` : ''}.`);
  }
  if (l.bgnDate) out.push(`The U.S. Board on Geographic Names made a formal decision on its name on ${new Date(l.bgnDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}.`);
  const lm = (l.landmarks || []).filter((m) => m.name !== l.name).slice(0, 4);
  if (lm.length) out.push(`Its neighbors on the map tell the story of the surrounding land: ${listJoin(lm.map((m) => `${m.name} (${m.type.toLowerCase()}, ${fmtMiles(m.miles)})`))}.`);
  const region = regionForCounty(state, l.county);
  return { lines: out, region };
}

function build(l, slug) {
  const { states } = loadData();
  const state = states.find((s) => s.name === l.state);
  const content = stateContent(state.slug);
  const crowd = crowdLevel(l.os?.reviews);
  const diff = difficulty(l);
  const hist = history(l, state);
  const share = l.os?.reviewsPerScore?.[5] && l.os.reviews ? Math.round((l.os.reviewsPerScore[5] / l.os.reviews) * 100) : null;
  const countyRank = l.os?.reviews ? state.listings.filter((x) => x.county === l.county && x.os?.reviews > l.os.reviews).length + 1 : null;
  const title = `${l.name} Guide Before Visiting ${GUIDE_YEAR} Updated`;
  return {
    slug,
    url: `/blog/${slug}`,
    listing: l,
    state,
    content,
    title,
    description: `Everything to know before visiting ${l.name} near ${l.city.name}, ${l.stateCode}: weather, directions, what to bring, crowds, safety and the history of the area.`.slice(0, 160),
    crowd, diff, hist, share, countyRank,
    packing: packingList(l),
    swim: tagMatches(l, 'swim'),
    minutes: 6,
  };
}

export { mi };
