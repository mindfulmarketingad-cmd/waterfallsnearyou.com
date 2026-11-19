// Hiking trail facts for a published waterfall page.
// Hand-checked trip-facts win when they state a trail name or a labeled distance.
// data/trails.json holds OpenStreetMap measurements from scripts/fetch-trails.mjs.
// This module is not used to decide which pages are published or indexed.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tripFacts } from './tripfacts.mjs';
import { sharesToken } from './osm-trail.mjs';

let osmCache = null;
function osmByUrl() {
  if (osmCache) return osmCache;
  const file = path.join(process.cwd(), 'data/trails.json');
  if (!existsSync(file)) {
    osmCache = {};
    return osmCache;
  }
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  osmCache = raw.trails || {};
  return osmCache;
}

const NUM = '(?:\\d+(?:\\.\\d+)?|\\d+\\s*/\\s*\\d+|half|quarter)';
const KIND = '(round\\s*trip|one[\\s-]*way|each\\s*way|loop|circuit|out[\\s-]*and[\\s-]*back)';
const ADJ = '(?:(?:paved|packed|gravel|interpretive|natural|dirt|easy)\\s+)?';
const HEDGE = '((?:about|roughly|approximately|around|nearly)\\s+)?';
const rangeRe = new RegExp(`\\b${HEDGE}(${NUM})\\s*(?:to|–|—|-)\\s*(${NUM})\\s*(?:a\\s+)?-?\\s*(?:miles|mile|mi)\\s+${ADJ}${KIND}`, 'gi');
const singleRe = new RegExp(`\\b${HEDGE}(${NUM})\\s*(?:a\\s+)?-?\\s*(?:miles|mile|mi)\\s+${ADJ}${KIND}`, 'gi');
const loopIsRe = new RegExp(`\\bloop\\s+is\\s+${HEDGE}(${NUM})\\s*(?:miles|mile|mi)\\b`, 'gi');
const feetRe = /\b(\d{2,5})\s*-?\s*foot\s+(?:paved\s+|packed\s+|gravel\s+|wooden\s+)?(trail|path|walk|boardwalk)\b/i;
const NAME_RE = /\b([A-Z][\w''’\-]*(?:\s+(?:[A-Z][\w''’\-]*|\d+|#\d+)){0,8}\s(?:Trail|Loop|Path|Boardwalk)(?:\s+#?\d{2,5})?)\b/g;
const CONDITIONAL = /winter|sno-park|when the road is closed|closure gate|when [^.]*gated/i;

function parseQuantity(raw) {
  const s = String(raw).toLowerCase().replace(/\s+/g, '');
  if (s === 'half') return 0.5;
  if (s === 'quarter') return 0.25;
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    if (!b) return null;
    return a / b;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function displayQuantity(raw) {
  const s = String(raw).toLowerCase().replace(/\s+/g, '');
  if (s === 'half') return '1/2';
  if (s === 'quarter') return '1/4';
  return String(raw).replace(/\s+/g, '');
}
function unitFor(n) {
  return n > 1 ? 'miles' : 'mile';
}
function kindInfo(word) {
  const w = word.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (w === 'each way' || w === 'one way') return { kind: 'one-way', label: 'one way' };
  if (w === 'round trip') return { kind: 'round-trip', label: 'round trip' };
  if (w === 'loop' || w === 'circuit') return { kind: 'loop', label: 'loop' };
  if (w === 'out and back') return { kind: 'round-trip', label: 'out and back' };
  return null;
}
function genericName(name) {
  if (/^(trail|path|loop|boardwalk|loop trail|nature trail|falls trail|hiking trail|footpath|horse trail)$/i.test(name)) return true;
  if (/^(Short|Paved|Steep|Easy|Moderate|Main|Marked|Optional|Natural|Gravel|Dirt|Accessible|Guided|Hiking|Interpretive|Packed|Wooden|Stone|Small|Historic|Separate|Rough)\s+(Trail|Path|Loop|Boardwalk)$/.test(name)) return true;
  if (/service road/i.test(name)) return true;
  return false;
}
function cleanTrailName(name) {
  return name.replace(/^The\s+/, '').replace(/\s+/g, ' ').trim();
}
function precededBy(text, index, re) {
  return re.test(text.slice(Math.max(0, index - 24), index));
}
function trailNames(text) {
  return [...text.matchAll(NAME_RE)]
    .map((m) => ({ name: cleanTrailName(m[1]), index: m.index, end: m.index + m[0].length }))
    .filter((n) => n.name && !genericName(n.name) && !precededBy(text, n.index, /(?:separate|optional)\s+$/i) && !/\bseparate\b/i.test(text.slice(n.end, n.end + 48)) && !/^\s+(?:Road|Highway|Drive|Street|Avenue|Boulevard|Lane)\b/.test(text.slice(n.end)));
}
function pickName(cands, fallName) {
  if (!cands.length) return null;
  if (fallName) {
    const matched = cands.filter((n) => sharesToken(n.name, fallName));
    if (matched.length) return matched[0].name;
  }
  return cands[0].name;
}
function nameNear(text, distIndex, distEnd, fallName) {
  const names = trailNames(text);
  const overlap = names.filter((n) => n.index < distIndex && n.end >= distIndex && n.end - distIndex < 16);
  if (overlap.length) return pickName(overlap, fallName);
  const tight = names.filter((n) => n.end <= distIndex && distIndex - n.end <= 3);
  if (tight.length) return pickName(tight, fallName);
  const after = names.filter((n) => n.index >= distEnd && n.index - distEnd < 90 && /\b(on|via|along)(\s+the)?(?:\s+[\w’-]+){0,3}\s*$/i.test(text.slice(distEnd, n.index)));
  if (after.length) return pickName(after, fallName);
  const before = names.filter((n) => {
    if (n.end > distIndex || distIndex - n.end > 70) return false;
    const between = text.slice(n.end, distIndex);
    return /\bis(?:\s+(?:a|an|the))?\s+$/i.test(between);
  });
  if (before.length) return pickName(before, fallName);
  return null;
}
function nameWithoutDistance(text, fallName) {
  const names = trailNames(text);
  const copula = names.filter((n) => /^\s*(?:\([^)]*\)\s*)?is\b/i.test(text.slice(n.end)));
  if (copula.length) return pickName(copula, fallName);
  const matched = names.filter((n) => sharesToken(n.name, fallName));
  if (matched.length === 1) return matched[0].name;
  return null;
}

function qualifierAt(text, index) {
  const prefix = text.slice(Math.max(0, index - 16), index);
  if (/\bunder\s+$/i.test(prefix)) return 'Under ';
  if (/\bover\s+$/i.test(prefix)) return 'Over ';
  if (/\bmore than\s+$/i.test(prefix)) return 'More than ';
  if (/\bat least\s+$/i.test(prefix)) return 'At least ';
  return '';
}
function pushDistance(found, text, index, end, info, body) {
  if (!info) return;
  const q = qualifierAt(text, index);
  found.push({ index, end, kind: info.kind, label: info.label, text: `${q}${body} ${info.label}`.replace(/\s+/g, ' ').trim() });
}
function collectDistances(text) {
  const found = [];
  for (const m of text.matchAll(rangeRe)) {
    const info = kindInfo(m[4]);
    const n1 = parseQuantity(m[2]);
    const n2 = parseQuantity(m[3]);
    if (!info || n1 == null || n2 == null || n2 <= 0 || n2 > 30) continue;
    const hedge = Boolean(m[1]);
    const unit = unitFor(Math.max(n1, n2));
    pushDistance(found, text, m.index, m.index + m[0].length, info, `${hedge ? 'About ' : ''}${displayQuantity(m[2])} to ${displayQuantity(m[3])} ${unit}`);
  }
  for (const m of text.matchAll(singleRe)) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (found.some((f) => start >= f.index && start < f.end)) continue;
    const info = kindInfo(m[3]);
    const n = parseQuantity(m[2]);
    if (!info || n == null || n <= 0 || n > 30) continue;
    const hedge = Boolean(m[1]);
    pushDistance(found, text, start, end, info, `${hedge ? 'About ' : ''}${displayQuantity(m[2])} ${unitFor(n)}`);
  }
  for (const m of text.matchAll(loopIsRe)) {
    const start = m.index;
    if (found.some((f) => start >= f.index && start < f.end)) continue;
    const n = parseQuantity(m[2]);
    if (n == null || n <= 0 || n > 30) continue;
    const hedge = Boolean(m[1]);
    pushDistance(found, text, start, start + m[0].length, { kind: 'loop', label: 'loop' }, `${hedge ? 'About ' : ''}${displayQuantity(m[2])} ${unitFor(n)}`);
  }
  found.sort((a, b) => a.index - b.index);
  return found;
}
function openClauses(text) {
  const parts = text.split(';');
  const open = parts.filter((p) => !CONDITIONAL.test(p));
  return open.length ? open.join('; ') : text;
}

function primaryDistance(found) {
  if (!found.length) return null;
  const each = found.filter((f) => f.kind === 'one-way' && /each way|one way/i.test(f.text) || f.kind === 'one-way');
  const oneWays = found.filter((f) => f.kind === 'one-way');
  const rounds = found.filter((f) => f.kind === 'round-trip');
  void each;
  let pair = null;
  for (const e of oneWays) for (const r of rounds) {
    const gap = Math.abs(e.index - r.index);
    if (gap < 90 && (!pair || gap < pair.gap)) pair = { e, r, gap };
  }
  if (pair && pair.gap < 70) {
    const left = pair.e.text.replace(/ one way$/, '');
    const right = pair.r.text.replace(/^About /, '');
    return {
      index: Math.min(pair.e.index, pair.r.index),
      end: Math.max(pair.e.end, pair.r.end),
      kind: 'one-way',
      text: `${left} one way (${right})`,
    };
  }
  const first = found[0];
  return { index: first.index, end: first.end, kind: first.kind, text: first.text };
}

function feetDistance(text) {
  const m = feetRe.exec(text);
  if (!m) return null;
  if (precededBy(text, m.index, /to\s+(?:a|the)\s+$/i)) return null;
  const feet = Number(m[1]);
  if (!(feet >= 200 && feet <= 6000)) return null;
  return { index: m.index, end: m.index + m[0].length, kind: 'one-way', text: `${feet} feet one way` };
}

function typeFor(text, kind) {
  if (kind === 'loop') return 'loop';
  if (kind === 'one-way' && /\beach way\b/i.test(text)) return 'out-and-back';
  if (/\bout[\s-]*and[\s-]*back\b|\bthe same way\b/i.test(text)) return 'out-and-back';
  return null;
}
function notesFor(text, parsed) {
  if (!text || !parsed) return null;
  const interesting = /closed|closure|permit|winter|private|not allowed|no authorized|indefinitely|washout|reconstruction|gated|shuttle|do not|shut/i.test(text);
  if (interesting || text.length > 180 || text.includes(';')) return text;
  return null;
}

/** Pull a trail name and a labeled distance out of a hand-checked hike sentence. */
export function parseTripHike(hike, fallName = '') {
  const text = String(hike || '').replace(/\s+/g, ' ').trim();
  if (!text) return { name: null, distance: null, type: null, notes: null };
  const scoped = openClauses(text);
  const found = collectDistances(scoped);
  let dist = primaryDistance(found);
  if (!dist) dist = feetDistance(scoped);
  let name = dist ? nameNear(scoped, dist.index, dist.end, fallName) : nameWithoutDistance(scoped, fallName);
  if (name && /Loop$|Loop Trail$/i.test(name) && !dist) {
    const namedLen = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+is\\s+(?:a\\s+)?${HEDGE}(${NUM})(?:\\s*(?:to|–|—|-)\\s*(${NUM}))?\\s*(?:miles|mile|mi)\\b`, 'i');
    const m = namedLen.exec(scoped);
    if (m) {
      const n1 = parseQuantity(m[2]);
      const n2 = m[3] ? parseQuantity(m[3]) : null;
      if (n1 != null) {
        const hedge = Boolean(m[1]);
        const body = n2
          ? `${hedge ? 'About ' : ''}${displayQuantity(m[2])} to ${displayQuantity(m[3])} ${unitFor(Math.max(n1, n2))}`
          : `${hedge ? 'About ' : ''}${displayQuantity(m[2])} ${unitFor(n1)}`;
        dist = { index: m.index, end: m.index + m[0].length, kind: 'loop', text: `${body} loop` };
      }
    }
  }
  if (!dist && !name) return { name: null, distance: null, type: null, notes: null };
  const distance = dist ? { text: dist.text, kind: dist.kind } : null;
  const type = dist?.text?.endsWith('out and back') ? 'out-and-back' : typeFor(text, dist?.kind);
  const notes = notesFor(text, true);
  return { name, distance, type: name || distance ? type : null, notes };
}

function fromTrip(facts, fallName = '') {
  if (!facts) return null;
  const parsed = parseTripHike(facts.hike || '', fallName);
  const identified = Boolean(parsed.name || parsed.distance);
  return {
    name: parsed.name,
    distance: parsed.distance,
    type: identified ? parsed.type : null,
    elevationGain: identified ? facts.elevationGain || null : null,
    difficulty: identified ? facts.difficulty || null : null,
    parking: facts.parking || null,
    dogs: facts.dogs || null,
    fees: facts.fees || null,
    notes: identified ? parsed.notes : null,
    sources: (facts.sources || []).filter((s) => Array.isArray(s) && /^https:\/\//.test(s[1] || '')).map(([title, url]) => ({ title, url, origin: 'trip-facts' })),
    identified,
  };
}

function pickTrailhead(trip, osm, distanceSource) {
  const th = osm?.trailhead;
  if (!th || !Number.isFinite(th.lat) || !Number.isFinite(th.lng)) return null;
  if (th.lat < 15 || th.lat > 72 || th.lng < -180 || th.lng > -60) return null;
  if (distanceSource === 'openstreetmap') return th;
  if (!trip?.parking) return th;
  const hay = `${trip.parking} ${trip.name || ''} ${osm?.name || ''}`;
  if (sharesToken(th.name, hay)) return th;
  return null;
}

function dedupeSources(list) {
  const out = [];
  const seen = new Set();
  for (const s of list) {
    if (!s?.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

export function assembleTrail(facts, osm, fallName = '') {
  const trip = fromTrip(facts, fallName);
  const o = osm && (osm.name || osm.distance) ? osm : null;
  const osmNameOk = o?.name && (sharesToken(o.name, fallName) || sharesToken(o.name, trip?.name || '') || !trip?.distance);
  const name = trip?.name || (osmNameOk ? o.name : null) || null;
  const distance = trip?.distance || o?.distance || null;
  if (!name && !distance) return null;
  const sources = dedupeSources([...(trip?.identified ? trip.sources : []), ...(o?.sources || [])]);
  // Dogs, fees and parking can come from the hand-checked guide even when the
  // trail name or distance came from the map. They still need a real source.
  if (trip && !trip.identified) {
    for (const s of trip.sources) if (!sources.some((x) => x.url === s.url)) sources.push(s);
  }
  if (!sources.length) return null;
  const distanceSource = trip?.distance ? 'trip-facts' : o?.distance ? 'openstreetmap' : null;
  const identified = Boolean(trip?.identified);
  const namesAgree = Boolean(o?.name && name && (name === o.name || sharesToken(name, o.name)));
  const sameTrail = distanceSource === 'openstreetmap' || namesAgree;
  const trailhead = pickTrailhead(trip, sameTrail ? o : null, distanceSource);
  const fromOsm = Boolean(o && (
    distanceSource === 'openstreetmap'
    || (name && !trip?.name)
    || trailhead
    || (sameTrail && !(identified && trip?.type) && o.type)
    || (sameTrail && !(identified && trip?.elevationGain) && o.elevationGain)
    || (sameTrail && !(identified && trip?.difficulty) && o.difficulty)
    || (sameTrail && !trip?.dogs && o.dogs)
    || (sameTrail && !trip?.fees && o.fees)
  ));
  const usedSources = fromOsm ? sources : sources.filter((s) => s.origin !== 'openstreetmap');
  if (!usedSources.length) return null;
  return {
    name,
    nameSource: trip?.name ? 'trip-facts' : 'openstreetmap',
    distance,
    distanceSource,
    type: (identified && trip?.type) || (sameTrail && o?.type) || null,
    elevationGain: (identified && trip?.elevationGain) || (sameTrail && o?.elevationGain) || null,
    difficulty: (identified && trip?.difficulty) || (sameTrail && o?.difficulty) || null,
    trailhead,
    parking: trip?.parking || null,
    dogs: trip?.dogs || (sameTrail && o?.dogs) || null,
    fees: trip?.fees || (sameTrail && o?.fees) || null,
    notes: identified ? trip?.notes || null : null,
    sources: usedSources,
    checked: usedSources.some((s) => s.origin === 'trip-facts') ? facts?.checked || null : null,
  };
}

export function trailFor(url) {
  const hint = String(url || '').split('/').pop().replace(/-/g, ' ');
  return assembleTrail(tripFacts(url), osmByUrl()[url] || null, hint);
}

export function trailRows(trail) {
  if (!trail?.name && !trail?.distance?.text) return [];
  const rows = [];
  if (trail.name) rows.push({ label: 'Trail', text: trail.name });
  if (trail.distance?.text) rows.push({ label: 'Distance', text: trail.distance.text });
  if (trail.elevationGain) rows.push({ label: 'Elevation gain', text: trail.elevationGain });
  if (trail.difficulty) rows.push({ label: 'Difficulty', text: trail.difficulty });
  if (trail.type === 'loop') rows.push({ label: 'Type', text: 'Loop' });
  else if (trail.type === 'out-and-back') rows.push({ label: 'Type', text: 'Out and back' });
  if (trail.trailhead?.map) {
    rows.push({
      label: 'Trailhead',
      text: `${trail.trailhead.name} (${Number(trail.trailhead.lat).toFixed(5)}, ${Number(trail.trailhead.lng).toFixed(5)})`,
      href: trail.trailhead.map,
      hrefLabel: 'Map',
    });
  }
  if (trail.parking) rows.push({ label: 'Parking', text: trail.parking });
  if (trail.dogs) rows.push({ label: 'Dogs', text: trail.dogs });
  if (trail.fees) rows.push({ label: 'Permit or fee', text: trail.fees });
  if (trail.notes) rows.push({ label: 'Access notes', text: trail.notes });
  return rows;
}

/** Place node for a named trail. Omitted when we only have a distance. */
export function trailPlaceSchema(trail, id) {
  if (!trail?.name || !id) return null;
  const official = (trail.sources || []).find((s) => s.origin === 'trip-facts');
  const osm = (trail.sources || []).find((s) => s.origin === 'openstreetmap');
  const node = {
    '@type': 'Place',
    '@id': id,
    additionalType: 'HikingTrail',
    name: trail.name,
  };
  if (trail.distance?.text) node.description = trail.distance.text;
  if (official?.url) node.url = official.url;
  if (trail.trailhead?.map && Number.isFinite(trail.trailhead.lat)) {
    node.geo = { '@type': 'GeoCoordinates', latitude: trail.trailhead.lat, longitude: trail.trailhead.lng };
    node.hasMap = trail.trailhead.map;
  } else if (osm?.url) node.hasMap = osm.url;
  return node;
}
