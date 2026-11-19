// Builds the "How many waterfalls are in [state]?" pages from the GNIS census.
// Prose that is not a computed sentence lives in src/content/how-many-notes.mjs.
import { HOW_MANY_NOTES } from '../content/how-many-notes.mjs';
import { statedHeight } from './bestof.mjs';
import { getFallsStudy, howManyPath, fmtDensity, fmtLand, STUDY_DATE, GNIS_FILE_COMMITTED, MIN_NAMED_FALLS, samePublishedRule } from './falls-census.mjs';
import { parksForState } from './parks.mjs';
import { listingHref } from './publish.mjs';
import { trailFor } from './trails.mjs';

const MAIN = '/blog/states-with-the-most-waterfalls';
const PILLAR = '/blog/largest-waterfalls-in-the-us-by-state';
const PILLAR_ANCHOR = `${PILLAR}#tallest-well-documented-waterfall-in-selected-states`;
const PILLAR_STATES = new Set(['oregon', 'washington', 'california', 'hawaii', 'north-carolina', 'new-york', 'georgia']);
const VOLUME_ANCHOR = `${PILLAR}#the-largest-us-waterfalls-by-volume`;

// States that share a land boundary, including a river boundary. Alaska and Hawaii have none.
const NEIGHBORS = {
  alabama: ['florida', 'georgia', 'mississippi', 'tennessee'],
  alaska: [],
  arizona: ['california', 'colorado', 'nevada', 'new-mexico', 'utah'],
  arkansas: ['louisiana', 'mississippi', 'missouri', 'oklahoma', 'tennessee', 'texas'],
  california: ['arizona', 'nevada', 'oregon'],
  colorado: ['arizona', 'kansas', 'nebraska', 'new-mexico', 'oklahoma', 'utah', 'wyoming'],
  connecticut: ['massachusetts', 'new-york', 'rhode-island'],
  delaware: ['maryland', 'new-jersey', 'pennsylvania'],
  florida: ['alabama', 'georgia'],
  georgia: ['alabama', 'florida', 'north-carolina', 'south-carolina', 'tennessee'],
  hawaii: [],
  idaho: ['montana', 'nevada', 'oregon', 'utah', 'washington', 'wyoming'],
  illinois: ['indiana', 'iowa', 'kentucky', 'missouri', 'wisconsin'],
  indiana: ['illinois', 'kentucky', 'michigan', 'ohio'],
  iowa: ['illinois', 'minnesota', 'missouri', 'nebraska', 'south-dakota', 'wisconsin'],
  kansas: ['colorado', 'missouri', 'nebraska', 'oklahoma'],
  kentucky: ['illinois', 'indiana', 'missouri', 'ohio', 'tennessee', 'virginia', 'west-virginia'],
  louisiana: ['arkansas', 'mississippi', 'texas'],
  maine: ['new-hampshire'],
  maryland: ['delaware', 'pennsylvania', 'virginia', 'west-virginia'],
  massachusetts: ['connecticut', 'new-hampshire', 'new-york', 'rhode-island', 'vermont'],
  michigan: ['indiana', 'ohio', 'wisconsin'],
  minnesota: ['iowa', 'north-dakota', 'south-dakota', 'wisconsin'],
  mississippi: ['alabama', 'arkansas', 'louisiana', 'tennessee'],
  missouri: ['arkansas', 'illinois', 'iowa', 'kansas', 'kentucky', 'nebraska', 'oklahoma', 'tennessee'],
  montana: ['idaho', 'north-dakota', 'south-dakota', 'wyoming'],
  nebraska: ['colorado', 'iowa', 'kansas', 'missouri', 'south-dakota', 'wyoming'],
  nevada: ['arizona', 'california', 'idaho', 'oregon', 'utah'],
  'new-hampshire': ['maine', 'massachusetts', 'vermont'],
  'new-jersey': ['delaware', 'new-york', 'pennsylvania'],
  'new-mexico': ['arizona', 'colorado', 'oklahoma', 'texas', 'utah'],
  'new-york': ['connecticut', 'massachusetts', 'new-jersey', 'pennsylvania', 'vermont'],
  'north-carolina': ['georgia', 'south-carolina', 'tennessee', 'virginia'],
  'north-dakota': ['minnesota', 'montana', 'south-dakota'],
  ohio: ['indiana', 'kentucky', 'michigan', 'pennsylvania', 'west-virginia'],
  oklahoma: ['arkansas', 'colorado', 'kansas', 'missouri', 'new-mexico', 'texas'],
  oregon: ['california', 'idaho', 'nevada', 'washington'],
  pennsylvania: ['delaware', 'maryland', 'new-jersey', 'new-york', 'ohio', 'west-virginia'],
  'rhode-island': ['connecticut', 'massachusetts'],
  'south-carolina': ['georgia', 'north-carolina'],
  'south-dakota': ['iowa', 'minnesota', 'montana', 'nebraska', 'north-dakota', 'wyoming'],
  tennessee: ['alabama', 'arkansas', 'georgia', 'kentucky', 'mississippi', 'missouri', 'north-carolina', 'virginia'],
  texas: ['arkansas', 'louisiana', 'new-mexico', 'oklahoma'],
  utah: ['arizona', 'colorado', 'idaho', 'nevada', 'new-mexico', 'wyoming'],
  vermont: ['massachusetts', 'new-hampshire', 'new-york'],
  virginia: ['kentucky', 'maryland', 'north-carolina', 'tennessee', 'west-virginia'],
  washington: ['idaho', 'oregon'],
  'west-virginia': ['kentucky', 'maryland', 'ohio', 'pennsylvania', 'virginia'],
  wisconsin: ['illinois', 'iowa', 'michigan', 'minnesota'],
  wyoming: ['colorado', 'idaho', 'montana', 'nebraska', 'south-dakota', 'utah'],
};

const UP_COUNTIES = ['Alger', 'Baraga', 'Chippewa', 'Delta', 'Dickinson', 'Gogebic', 'Houghton', 'Iron', 'Keweenaw', 'Luce', 'Mackinac', 'Marquette', 'Menominee', 'Ontonagon', 'Schoolcraft'];
const FINGER_LAKES = ['Tompkins', 'Schuyler', 'Seneca', 'Yates', 'Ontario', 'Cayuga', 'Steuben', 'Chemung'];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (href, label) => `<a href="${esc(href)}">${esc(label)}</a>`;
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const listJoin = (arr) => {
  if (arr.length <= 1) return arr.join('');
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
};
const wordsIn = (html) => String(html).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const sumCounties = (row, names) => names.reduce((s, name) => s + (row.counties.find((c) => c.county === name)?.count || 0), 0);

function rankPhrase(rank, tiedNames) {
  if (rank === 1 && !tiedNames.length) return 'first';
  if (!tiedNames.length) return ordinal(rank);
  if (rank === 1) return `tied for first with ${listJoin(tiedNames)}`;
  return `tied for ${ordinal(rank)} with ${listJoin(tiedNames)}`;
}

function tiedNames(row, all, rankKey, valueKey) {
  return all
    .filter((o) => o.slug !== row.slug && o[rankKey] === row[rankKey] && o[valueKey] === row[valueKey])
    .map((o) => o.name);
}

function specialFacts(row) {
  const facts = [];
  const n = (names) => sumCounties(row, names);
  if (row.slug === 'michigan') {
    const up = n(UP_COUNTIES);
    const outside = row.listings.filter((l) => !UP_COUNTIES.includes(l.county));
    const outsideText = outside.map((l) => `${l.name} in ${l.county} County`).join('; ');
    facts.push(`${up} of the ${row.gnisCount} named falls are in the 15 Upper Peninsula counties (Alger, Baraga, Chippewa, Delta, Dickinson, Gogebic, Houghton, Iron, Keweenaw, Luce, Mackinac, Marquette, Menominee, Ontonagon and Schoolcraft). ${outside.length ? `The named fall outside that set is ${outsideText}.` : 'None of the named falls fall outside that set.'}`);
  }
  if (row.slug === 'new-york') {
    const finger = n(FINGER_LAKES);
    const stl = n(['St. Lawrence']);
    facts.push(`St. Lawrence County has ${stl} named falls. The eight Finger Lakes counties used here (Tompkins, Schuyler, Seneca, Yates, Ontario, Cayuga, Steuben and Chemung) have ${finger} combined.`);
  }
  if (row.slug === 'oregon') {
    facts.push(`Lane, Douglas and Marion counties have ${n(['Lane', 'Douglas', 'Marion'])} named falls. Multnomah, Hood River and Wasco, the Oregon side of the Columbia River Gorge, have ${n(['Multnomah', 'Hood River', 'Wasco'])}.`);
  }
  if (row.slug === 'washington') {
    facts.push(`Pierce and Lewis counties, on the Mount Rainier side of the Cascades, have ${n(['Pierce', 'Lewis'])} named falls. Skamania County, on the Washington side of the Columbia Gorge, has ${n(['Skamania'])}.`);
  }
  if (row.slug === 'north-carolina') {
    facts.push(`Transylvania, Jackson and Macon counties, on the Blue Ridge Escarpment, have ${n(['Transylvania', 'Jackson', 'Macon'])} of the state's ${row.gnisCount} named falls.`);
  }
  if (row.slug === 'hawaii') {
    facts.push(`Honolulu County, which is the island of Oahu, has ${n(['Honolulu'])} named falls. Hawaii County, Kauai and Maui hold the rest.`);
  }
  if (row.slug === 'california') {
    facts.push(`Mariposa County, which contains Yosemite Valley, has ${n(['Mariposa'])} named falls. Siskiyou and Shasta counties, in the southern Cascades, have ${n(['Siskiyou', 'Shasta'])} together.`);
  }
  return facts;
}

function build(row, study) {
  const notes = HOW_MANY_NOTES[row.slug];
  if (!notes?.geology?.length || !notes.season || !notes.faq?.q) throw new Error(`Incomplete how-many notes for ${row.slug}`);
  const tiedCount = tiedNames(row, study.states, 'countRank', 'gnisCount');
  const tiedDensity = tiedNames(row, study.states, 'densityRank', 'per1000');
  const countText = rankPhrase(row.countRank, tiedCount);
  const densityText = rankPhrase(row.densityRank, tiedDensity);
  const density = fmtDensity(row.per1000);
  const top = row.counties.slice(0, 3);
  const topSum = top.reduce((s, c) => s + c.count, 0);
  const bySlug = new Map(study.states.map((s) => [s.slug, s]));

  const lead = `${row.name} has ${row.gnisCount.toLocaleString('en-US')} named waterfall${row.gnisCount === 1 ? '' : 's'} in the U.S. Geological Survey Geographic Names Information System, the features classified as Falls. That count ranks ${row.name} ${countText} among the 50 states. The figure comes from the GNIS domestic-names extract in this site, committed ${GNIS_FILE_COMMITTED}, and this page was published ${STUDY_DATE}. The latest feature-edit date stored on these Falls records is December 30, 2020.`;

  const densityP = `Divided by the state's land area of ${fmtLand(row.landSqMi)} square miles, from the U.S. Census Bureau 2024 Gazetteer (ALAND_SQMI, land only, inland water excluded), ${row.name} has ${density} named falls per 1,000 square miles. That density ranks ${densityText} of the 50 states. The national named total in this extract is ${study.totalNamed.toLocaleString('en-US')} falls across the 50 states, so ${row.name} holds ${pct(row.gnisCount, study.totalNamed)} percent of them.`;

  const neighborBits = (NEIGHBORS[row.slug] || []).map((slug) => {
    const n = bySlug.get(slug);
    if (!n) return esc(slug);
    const dest = n.gnisCount >= MIN_NAMED_FALLS ? howManyPath(slug) : (n.stateUrl || MAIN);
    const label = n.gnisCount >= MIN_NAMED_FALLS ? `${n.name} (${n.gnisCount})` : `${n.name} (${n.gnisCount}, no separate count page)`;
    return link(dest, label);
  });
  const neighborP = neighborBits.length
    ? `Bordering states, with their named-falls counts: ${neighborBits.join('; ')}.`
    : `${row.name} shares no land boundary with another state. The right comparison is the national rank above, not a neighbor.`;

  const topBits = top.map((c) => `${esc(c.county)} (${c.count})`);
  const clusterP = top.length
    ? `${row.name}'s named falls are filed under ${row.counties.length} county equivalents. The largest counts are ${listJoin(topBits)}, ${topSum} falls and ${pct(topSum, row.gnisCount)} percent of the state total.`
    : '';
  const specials = specialFacts(row);

  const countyRows = row.counties.map((c) => {
    const examples = [...c.listings].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 3);
    const ex = examples.map((l) => link(listingHref(l), l.name)).join(', ');
    return `<tr><td>${esc(c.county)}</td><td>${c.count}</td><td>${pct(c.count, row.gnisCount)}%</td><td>${ex}</td></tr>`;
  }).join('');
  const countyTable = `<table><thead><tr><th>County or equivalent</th><th>Named falls</th><th>Share</th><th>Examples</th></tr></thead><tbody>${countyRows}</tbody></table>`;
  const mapP = row.hasStatePage
    ? `The ${link(`/map/${row.slug}`, `${row.name} waterfall map`)} plots the same named falls. County names are the labels GNIS recorded. Connecticut's file uses planning regions, Alaska's uses boroughs and census areas, and Louisiana's uses parishes, so the column is not always a traditional county.`
    : '';

  let everyTable = '';
  if (row.gnisCount <= 40) {
    const body = [...row.listings].sort((a, b) => a.name.localeCompare(b.name)).map((l) => {
      const dest = listingHref(l);
      const kind = samePublishedRule(l) ? 'Published page' : 'Listed on the state guide';
      return `<tr><td>${link(dest, l.name)}</td><td>${esc(l.county || '')}</td><td>${kind}</td></tr>`;
    }).join('');
    everyTable = `<p>Every named fall in the extract:</p><table><thead><tr><th>Name</th><th>County or equivalent</th><th>On this site</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  const published = row.listings.filter(samePublishedRule).sort((a, b) => (b.os?.reviews || 0) - (a.os?.reviews || 0) || a.name.localeCompare(b.name));
  const pubItems = published.slice(0, 12).map((l) => {
    const trail = trailFor(l.url);
    const bits = [esc(l.county || '')];
    if (l.os?.reviews) bits.push(`${l.os.reviews.toLocaleString('en-US')} Google reviews`);
    if (trail?.distance?.text) bits.push(esc(trail.distance.text));
    else if (trail?.name) bits.push(esc(trail.name));
    return `<li>${link(l.url, l.name)} <span class="muted">(${bits.filter(Boolean).join(' · ')})</span></li>`;
  });
  const extra = row.extraListings > 0
    ? ` The ${link(row.stateUrl, `${row.name} state guide`)} also lists ${row.extraListings} other place${row.extraListings === 1 ? '' : 's'} from Google Maps that ${row.extraListings === 1 ? 'is' : 'are'} not in the GNIS Falls extract, so the guide's total is ${row.directoryCount}.`
    : ` The ${link(row.stateUrl, `${row.name} state guide`)} lists these same named falls.`;
  const pubP = `We publish a full page for ${published.length} of the ${row.gnisCount} named falls. A page exists when the fall has at least 25 Google reviews, a sourced trip guide, or at least 200 characters of USGS description or history. The other ${row.gnisCount - published.length} stay on the state guide as names and coordinates.${extra}`;

  const trails = [];
  for (const l of published) {
    const trail = trailFor(l.url);
    if (!trail?.distance?.text && !trail?.name) continue;
    trails.push({ name: l.name, url: l.url, trail });
    if (trails.length === 6) break;
  }
  const trailItems = trails.map((t) => {
    const detail = [t.trail.name, t.trail.distance?.text].filter(Boolean).map(esc).join(', ');
    return `<li>${link(t.url, t.name)}: ${detail}</li>`;
  });

  const heights = row.listings
    .map((l) => ({ l, h: statedHeight(l) }))
    .filter((x) => x.h && x.h.source === 'USGS gazetteer')
    .sort((a, b) => b.h.feet - a.h.feet);
  const heightBits = heights.slice(0, 3).map((x) => `${link(listingHref(x.l), x.l.name)} at ${x.h.feet} feet`);
  const pillarHref = PILLAR_STATES.has(row.slug) ? PILLAR_ANCHOR : PILLAR;
  const tallP = [
    PILLAR_STATES.has(row.slug)
      ? `Our national roundup, ${link(PILLAR, 'the largest waterfalls in the U.S. by state')}, names a well-documented tall fall for ${row.name} in the ${link(PILLAR_ANCHOR, 'state-by-state table')}. That roundup is a height and volume study. It is not this named-count ranking.`
      : `The national roundup, ${link(PILLAR, 'the largest waterfalls in the U.S. by state')}, does not name a single well-documented tallest waterfall for ${row.name}.`,
    heightBits.length
      ? `Separately, the tallest height written into the USGS gazetteer text in our file is ${listJoin(heightBits)}. Most Falls records state no height, so this is not a ranking of the tallest waterfall in the state.`
      : `None of the USGS descriptions in our file state a height in feet for a named fall here. We do not estimate one.`,
    row.slug === 'new-york' ? `For volume rather than height, the same roundup covers Niagara in the ${link(VOLUME_ANCHOR, 'largest-by-volume section')}.` : '',
  ].filter(Boolean).join(' ');

  const parks = parksForState(row.slug).map((p) => ({
    name: p.name,
    url: p.url,
    falls: p.falls.filter((f) => f.stateSlug === row.slug),
  })).filter((p) => p.falls.length);
  const parkItems = parks.map((p) => `<li>${link(p.url, p.name)} (${p.falls.length} published waterfall${p.falls.length === 1 ? '' : 's'} in ${row.name}: ${p.falls.map((f) => link(f.url, f.name)).join(', ')})</li>`);
  const parkP = parks.length
    ? `These national park guides include a published waterfall whose coordinates fall inside the park and inside ${row.name}.`
    : `None of the national park guides on this site currently include a published waterfall inside ${row.name}. Named falls here are on other public or private land. The state guide is the place to check access. We do not assign falls to a national forest unless a park boundary in our file contains them.`;

  const method = `Named falls are records with feature class Falls in the USGS National Map GNIS domestic names, filtered to this state in data/gnis-waterfalls.json. The download script is scripts/prepare-gnis.mjs, pointed at ${link(study.gnisSourceUrl, 'the USGS domestic-names file')}. Land area is ALAND_SQMI in the Census Bureau 2024 Gazetteer national state file, written by scripts/prepare-state-areas.mjs. Density is named falls divided by land area, times 1,000. The full 50-state ranking, including states with too few named falls for their own page, is ${link(MAIN, 'Which state has the most waterfalls?')}.`;

  const sections = [
    { id: 'rank', heading: 'National rank and density', html: `<p>${densityP}</p><p>${neighborP}</p>` },
    { id: 'where', heading: 'Where the named falls cluster', html: `<p>${clusterP}</p>${specials.map((s) => `<p>${s}</p>`).join('')}${mapP ? `<p>${mapP}</p>` : ''}${countyTable}${everyTable}` },
    { id: 'why', heading: `Why ${row.name}'s count looks like this`, html: notes.geology.map((p) => `<p>${p}</p>`).join('') },
    { id: 'published', heading: 'Named falls we publish', html: `<p>${pubP}</p>${pubItems.length ? `<ul>${pubItems.join('')}</ul>` : ''}${published.length > 12 ? `<p>Those are the 12 published pages with the most Google reviews. The state guide links the rest.</p>` : ''}` },
    { id: 'tallest', heading: 'Tallest falls on the record', html: `<p>${tallP}</p>` },
    { id: 'parks', heading: 'National parks', html: `<p>${parkP}</p>${parkItems.length ? `<ul>${parkItems.join('')}</ul>` : ''}` },
    ...(trailItems.length ? [{ id: 'trails', heading: 'Trails we can measure', html: `<p>These distances come from the trail notes already attached to the published pages, either a sourced trip guide or an OpenStreetMap path. A blank distance means the map did not give one we were willing to print.</p><ul>${trailItems.join('')}</ul>` }] : []),
    { id: 'season', heading: `When to go in ${row.name}`, html: `<p>${notes.season}</p>` },
    { id: 'method', heading: 'How this number was counted', html: `<p>${method}</p>` },
  ];

  const faqs = [
    {
      q: `How many waterfalls are in ${row.name}?`,
      a: `${row.name} has ${row.gnisCount.toLocaleString('en-US')} named waterfalls in the USGS GNIS Falls class, ranking ${countText} of the 50 states. The extract used here was committed ${GNIS_FILE_COMMITTED}, and this page was published ${STUDY_DATE}.`,
    },
    {
      q: `Which county in ${row.name} has the most named waterfalls?`,
      a: top.length ? `${top[0].county} has the most, with ${top[0].count} named falls. ${top[1] ? `${top[1].county} is next with ${top[1].count}.` : ''}` : `${row.name} has no named falls in this extract.`,
    },
    {
      q: `How many ${row.name} waterfalls have a page on this site?`,
      a: `${published.length} of the ${row.gnisCount} named falls have a published page. A page requires 25 or more Google reviews, a sourced trip guide, or at least 200 characters of USGS description or history.`,
    },
    {
      q: `When is the best time to see waterfalls in ${row.name}?`,
      a: notes.season,
    },
    notes.faq,
  ];

  const related = [
    { href: MAIN, label: 'Which state has the most waterfalls?' },
    { href: '/blog/waterfall-density-by-state', label: 'Waterfall density by state' },
    { href: PILLAR, label: 'Largest waterfalls in the U.S. by state' },
    ...(row.stateUrl ? [{ href: row.stateUrl, label: `All waterfalls in ${row.name}` }] : []),
    { href: `/map/${row.slug}`, label: `${row.name} waterfall map` },
    ...(notes.also || []),
  ];

  const htmlBits = [lead, ...sections.map((s) => `${s.heading} ${s.html}`), ...faqs.map((f) => `${f.q} ${f.a}`)];
  const description = `${row.name} has ${row.gnisCount} named waterfalls in the USGS GNIS, ${countText} of 50 states. Counties, density, and the falls we publish.`;

  return {
    slug: row.slug,
    name: row.name,
    title: `How Many Waterfalls Are in ${row.name}?`,
    description,
    url: howManyPath(row.slug),
    date: STUDY_DATE,
    lead,
    sections,
    faqs,
    related,
    neighbors: neighborBits,
    words: wordsIn(htmlBits.join(' ')),
    gnisCount: row.gnisCount,
    countRank: row.countRank,
  };
}

let pages = null;
export function getHowManyPages() {
  if (pages) return pages;
  const study = getFallsStudy();
  const noteSlugs = Object.keys(HOW_MANY_NOTES);
  const missing = study.publishedSlugs.filter((s) => !HOW_MANY_NOTES[s]);
  const extra = noteSlugs.filter((s) => !study.publishedSlugs.includes(s));
  if (missing.length) throw new Error(`Missing how-many notes: ${missing.join(', ')}`);
  if (extra.length) throw new Error(`Notes exist for states below the ${MIN_NAMED_FALLS}-fall gate: ${extra.join(', ')}`);
  pages = study.publishedSlugs
    .map((slug) => study.states.find((s) => s.slug === slug))
    .sort((a, b) => a.countRank - b.countRank || a.name.localeCompare(b.name))
    .map((row) => build(row, study));
  return pages;
}

export function getHowMany(slug) {
  return getHowManyPages().find((p) => p.slug === slug) || null;
}
