// Turn nearby OpenStreetMap elements into one trail record for a waterfall.
// Distances are measured along mapped foot paths from a trailhead or parking node.
// A field is left off when the map does not state it. Nothing here is estimated
// from elevation models, reviews, or typical hike lengths.

const SAC_RANK = ['hiking', 'mountain_hiking', 'demanding_mountain_hiking', 'alpine_hiking', 'demanding_alpine_hiking', 'difficult_alpine_hiking'];
const SAC_LABEL = {
  hiking: 'SAC T1 hiking',
  mountain_hiking: 'SAC T2 mountain hiking',
  demanding_mountain_hiking: 'SAC T3 demanding mountain hiking',
  alpine_hiking: 'SAC T4 alpine hiking',
  demanding_alpine_hiking: 'SAC T5 demanding alpine hiking',
  difficult_alpine_hiking: 'SAC T6 difficult alpine hiking',
};
const STOP = new Set(['falls', 'fall', 'waterfall', 'waterfalls', 'the', 'of', 'and', 'creek', 'river', 'brook', 'fork', 'branch', 'north', 'south', 'east', 'west', 'upper', 'lower', 'little', 'big', 'lake', 'mount', 'mountain', 'park', 'state', 'national', 'trail', 'loop', 'path', 'near', 'old', 'new', 'high', 'low', 'middle', 'area', 'parking', 'mapped', 'trailhead', 'run', 'road', 'base', 'top', 'side']);

export function meters(a, b) {
  const r = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function sharesToken(a, b) {
  const tb = new Set(tokens(b));
  return tokens(a).some((t) => tb.has(t));
}
function tokens(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['’ʻʼ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t))
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

export function cleanOsmName(name) {
  if (!name) return null;
  const n = String(name).replace(/[\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (n.length < 3 || n.length > 80) return null;
  if (/^(path|trail|footpath|hiking trail|track|sidewalk|steps|boardwalk|footway)$/i.test(n)) return null;
  if (/sidewalk|crosswalk|driveway|private road/i.test(n)) return null;
  return n;
}

export function formatDistance(metersLen, kind) {
  if (!(metersLen >= 60 && metersLen <= 8 * 1609.344)) return null;
  const label = kind === 'loop' ? 'loop' : 'one way';
  const outKind = kind === 'loop' ? 'loop' : 'one-way';
  const mi = metersLen / 1609.344;
  if (mi < 0.2) {
    const feet = Math.round(metersLen * 3.28084 / 10) * 10;
    if (feet < 200) return null;
    return { text: `${feet} feet ${label}`, kind: outKind };
  }
  const rounded = Math.round(mi * 10) / 10;
  if (!(rounded >= 0.2 && rounded <= 8)) return null;
  const num = rounded.toFixed(1).replace(/\.0$/, '');
  const unit = Number(num) === 1 ? 'mile' : 'miles';
  return { text: `${num} ${unit} ${label}`, kind: outKind };
}

function usableWay(tags) {
  const t = tags || {};
  if (t.area === 'yes') return false;
  if (['private', 'no', 'customers'].includes(t.access)) return false;
  if (['no', 'private', 'use_sidepath'].includes(t.foot)) return false;
  if (t.informal === 'yes') return false;
  const hw = t.highway;
  if (hw === 'footway' && ['sidewalk', 'crossing', 'traffic_island'].includes(t.footway)) return false;
  if (['path', 'footway', 'bridleway', 'steps'].includes(hw)) return true;
  if (hw === 'track' && (['yes', 'designated', 'permissive'].includes(t.foot) || t.sac_scale)) return true;
  return false;
}

function metaOf(el) {
  const t = el.tags || {};
  return {
    wayId: el.id,
    name: cleanOsmName(t.name),
    highway: t.highway || '',
    sac: SAC_LABEL[t.sac_scale] ? t.sac_scale : null,
    difficulty: /^(easy|moderate|hard|difficult|strenuous)$/i.test(t.difficulty || '') ? t.difficulty.toLowerCase() : null,
    dog: t.dog || null,
    fee: t.fee || null,
    charge: t.charge || null,
    bridge: t.bridge === 'yes' || t.tunnel === 'yes',
  };
}
const LONG_TRAIL = /pacific crest|appalachian trail|continental divide|ice age national|florida national scenic|arizona trail|colorado trail|john muir trail|wonderland trail|mountains-to-sea|north country trail|superior hiking trail|pacific northwest trail/i;
function badTrailName(name) {
  if (!name) return false;
  if (/bike|bicycle|snowmobile|\batv\b|\bohv\b/i.test(name)) return true;
  if (/^(bridge|footbridge|pier|dam|culvert)\b/i.test(name)) return true;
  if (LONG_TRAIL.test(name)) return true;
  return false;
}
function routeOk(fall, pathName, target, distanceMeters, type) {
  if (badTrailName(pathName)) return false;
  if (pathName && sharesToken(pathName, fall.name)) return true;
  if (target?.name && sharesToken(target.name, fall.name)) return true;
  const generic = !target?.name || /^(Mapped parking|Mapped trailhead)$/.test(target.name);
  // A neighboring path with no shared name is kept only when the mapped walk
  // is long enough to be the approach, not a few hundred feet of a different trail.
  if (generic && type === 'out-and-back' && pathName && distanceMeters >= 400 && distanceMeters <= 2 * 1609.344) return true;
  return false;
}
function nameOnlyOk(name, fallName) {
  // A name with no measured route is shown only when it shares a distinctive word
  // with the waterfall. Nearby trails with unrelated names are left off.
  if (!name || badTrailName(name)) return false;
  return sharesToken(name, fallName);
}

function projectPoint(p, a, b) {
  const lat0 = (p.lat * Math.PI) / 180;
  const mlat = 111320;
  const mlng = 111320 * Math.cos(lat0);
  const bx = (b.lng - a.lng) * mlng;
  const by = (b.lat - a.lat) * mlat;
  const px = (p.lng - a.lng) * mlng;
  const py = (p.lat - a.lat) * mlat;
  const len2 = bx * bx + by * by;
  let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = bx * t;
  const y = by * t;
  return {
    d: Math.hypot(px - x, py - y),
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    dA: Math.hypot(x, y),
    dB: Math.hypot(bx - x, by - y),
  };
}

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].d <= a[i].d) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length && last) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let s = i;
        if (l < a.length && a[l].d < a[s].d) s = l;
        if (r < a.length && a[r].d < a[s].d) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]];
        i = s;
      }
    }
    return top;
  }
}

class Graph {
  constructor() {
    this.nodes = new Map();
    this.grid = new Map();
    this.segments = [];
  }
  add(lat, lng) {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    let n = this.nodes.get(key);
    if (n) return n;
    n = { key, lat, lng, edges: [] };
    this.nodes.set(key, n);
    const gk = `${Math.round(lat * 1000)},${Math.round(lng * 1000)}`;
    const bucket = this.grid.get(gk);
    if (bucket) bucket.push(n);
    else this.grid.set(gk, [n]);
    return n;
  }
  connect(a, b, d, meta) {
    if (!(d >= 0.5) || a === b) return;
    const e1 = { to: b, d, meta };
    const e2 = { to: a, d, meta };
    e1.rev = e2;
    e2.rev = e1;
    a.edges.push(e1);
    b.edges.push(e2);
    const seg = { a, b, d, meta, e1, e2, dead: false };
    e1.seg = seg;
    e2.seg = seg;
    this.segments.push(seg);
  }
  split(seg, lat, lng, dA, dB) {
    if (!seg || seg.dead) return null;
    if (dA < 4) return seg.a;
    if (dB < 4) return seg.b;
    seg.dead = true;
    seg.a.edges = seg.a.edges.filter((e) => e !== seg.e1);
    seg.b.edges = seg.b.edges.filter((e) => e !== seg.e2);
    const m = this.add(lat, lng);
    this.connect(seg.a, m, dA, seg.meta);
    this.connect(m, seg.b, dB, seg.meta);
    return m;
  }
  project(p, maxM) {
    let best = null;
    for (const seg of this.segments) {
      if (seg.dead) continue;
      const proj = projectPoint(p, seg.a, seg.b);
      if (proj.d <= maxM && (!best || proj.d < best.d)) best = { seg, ...proj };
    }
    return best;
  }
}

function pointOf(el) {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') return { lat: el.lat, lng: el.lon };
  if (el.center && typeof el.center.lat === 'number') return { lat: el.center.lat, lng: el.center.lon };
  if (el.geometry?.length) {
    let lat = 0;
    let lng = 0;
    for (const g of el.geometry) { lat += g.lat; lng += g.lon; }
    return { lat: lat / el.geometry.length, lng: lng / el.geometry.length };
  }
  return null;
}

function buildGraph(elements) {
  const graph = new Graph();
  const relByWay = new Map();
  for (const el of elements) {
    if (el.type === 'way' && usableWay(el.tags) && el.geometry?.length >= 2) {
      const meta = metaOf(el);
      let prev = graph.add(el.geometry[0].lat, el.geometry[0].lon);
      for (let i = 1; i < el.geometry.length; i++) {
        const next = graph.add(el.geometry[i].lat, el.geometry[i].lon);
        if (next === prev) continue;
        const d = meters(prev, next);
        if (d > 0.5 && d < 4000) graph.connect(prev, next, d, meta);
        prev = next;
      }
    } else if (el.type === 'relation' && el.tags?.type === 'route' && /^(hiking|foot)$/.test(el.tags.route || '')) {
      const rel = {
        id: el.id,
        name: cleanOsmName(el.tags.name),
        ascent: el.tags.ascent || null,
        distance: el.tags.distance || null,
        roundtrip: el.tags.roundtrip || null,
        ways: new Set((el.members || []).filter((m) => m.type === 'way').map((m) => m.ref)),
      };
      if (!rel.ways.size && !rel.name) continue;
      for (const id of rel.ways) {
        const list = relByWay.get(id);
        if (list) list.push(rel);
        else relByWay.set(id, [rel]);
      }
    }
  }
  return { graph, relByWay };
}

function snapTarget(graph, el, kind) {
  const p = pointOf(el);
  if (!p) return null;
  const tags = el.tags || {};
  if (['private', 'no', 'customers'].includes(tags.access)) return null;
  if (tags.parking === 'private') return null;
  const proj = graph.project(p, 45);
  if (!proj) return null;
  const node = graph.split(proj.seg, proj.lat, proj.lng, proj.dA, proj.dB) || proj.seg.a;
  return {
    node,
    snap: proj.d,
    kind,
    name: kind === 'trailhead'
      ? (cleanOsmName(tags.name) || 'Mapped trailhead')
      : (cleanOsmName(tags.name) || 'Mapped parking'),
    lat: p.lat,
    lng: p.lng,
    osmType: el.type === 'way' ? 'way' : 'node',
    osmId: el.id,
  };
}

function routeFrom(graph, startNode, startDist, targetNodes, maxM) {
  const dist = new Map([[startNode, startDist]]);
  const prev = new Map([[startNode, null]]);
  const heap = new MinHeap();
  heap.push({ n: startNode, d: startDist });
  const reached = new Map();
  while (heap.size) {
    const cur = heap.pop();
    if (!cur || cur.d !== dist.get(cur.n)) continue;
    if (targetNodes.has(cur.n) && !reached.has(cur.n)) reached.set(cur.n, cur.d);
    if (cur.d > maxM) continue;
    for (const e of cur.n.edges) {
      const nd = cur.d + e.d;
      if (nd > maxM + 1) continue;
      if (!dist.has(e.to) || nd < dist.get(e.to)) {
        dist.set(e.to, nd);
        prev.set(e.to, { from: cur.n, edge: e });
        heap.push({ n: e.to, d: nd });
      }
    }
  }
  return { prev, reached };
}

function reconstruct(prev, node) {
  const edges = [];
  const guard = new Set();
  let cur = node;
  while (prev.get(cur) && !guard.has(cur)) {
    guard.add(cur);
    const step = prev.get(cur);
    edges.push(step.edge);
    cur = step.from;
  }
  edges.reverse();
  return { edges, start: cur };
}

function continuesPast(start, pathEdges) {
  const ban = new Set(pathEdges);
  for (const e of pathEdges) if (e.rev) ban.add(e.rev);
  const dist = new Map([[start, 0]]);
  const heap = new MinHeap();
  heap.push({ n: start, d: 0 });
  while (heap.size) {
    const cur = heap.pop();
    if (!cur || cur.d !== dist.get(cur.n)) continue;
    if (cur.d > 150) return true;
    for (const e of cur.n.edges) {
      if (ban.has(e)) continue;
      const nd = cur.d + e.d;
      if (nd > 220) continue;
      if (!dist.has(e.to) || nd < dist.get(e.to)) {
        dist.set(e.to, nd);
        heap.push({ n: e.to, d: nd });
      }
    }
  }
  return false;
}

function diverges(altEdges, pathNodes) {
  let maxAway = 0;
  const pts = [];
  for (const e of altEdges) pts.push(e.to);
  for (const p of pts) {
    let near = Infinity;
    for (const n of pathNodes) near = Math.min(near, meters(p, n));
    if (near > maxAway) maxAway = near;
    if (maxAway > 60) return true;
  }
  return false;
}

function unanimous(map, total, minShare) {
  let tagged = 0;
  let best = null;
  let bestM = 0;
  for (const [k, m] of map) {
    if (!k) continue;
    tagged += m;
    if (m > bestM) { best = k; bestM = m; }
  }
  if (!best || tagged < total * minShare) return null;
  if (bestM < tagged * 0.8) return null;
  return best;
}

function dogText(tag) {
  const v = String(tag).toLowerCase();
  if (v === 'leashed' || v === 'leash') return 'Dogs allowed on leash (OpenStreetMap dog=leashed)';
  if (v === 'yes' || v === 'designated') return 'Dogs allowed (OpenStreetMap dog=yes)';
  if (v === 'no') return 'Dogs not allowed (OpenStreetMap dog=no)';
  return null;
}
function feeText(fee, charge) {
  if (charge && String(charge).length <= 40 && !/[,;]/.test(charge)) return `Charge ${charge} (OpenStreetMap charge=${charge})`;
  const v = String(fee || '').toLowerCase();
  if (v === 'yes') return 'Fee required (OpenStreetMap fee=yes)';
  if (v === 'no') return 'No fee (OpenStreetMap fee=no)';
  return null;
}
function sacText(map, total) {
  let hardest = -1;
  let label = null;
  for (const [k, m] of map) {
    if (m < total * 0.2) continue;
    const rank = SAC_RANK.indexOf(k);
    if (rank > hardest) { hardest = rank; label = SAC_LABEL[k]; }
  }
  return label;
}
function difficultyText(map, total) {
  const tag = unanimous(map, total, 0.5);
  if (!tag) return null;
  const pretty = tag.charAt(0).toUpperCase() + tag.slice(1);
  return `${pretty} (OpenStreetMap difficulty=${tag})`;
}

function mapLink(lat, lng) {
  const la = lat.toFixed(5);
  const ln = lng.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${ln}#map=16/${la}/${ln}`;
}
function elementUrl(type, id) {
  return `https://www.openstreetmap.org/${type}/${id}`;
}
function elementSource(type, id) {
  return { title: `OpenStreetMap contributors (${type} ${id})`, url: elementUrl(type, id), origin: 'openstreetmap' };
}

function nearestNamed(graph, fall) {
  let best = null;
  for (const seg of graph.segments) {
    if (seg.dead || !seg.meta.name || seg.meta.bridge || badTrailName(seg.meta.name)) continue;
    const proj = projectPoint(fall, seg.a, seg.b);
    if (proj.d > 120) continue;
    const match = sharesToken(seg.meta.name, fall.name) ? 100 : 0;
    const score = proj.d - match;
    if (!best || score < best.score) best = { name: seg.meta.name, wayId: seg.meta.wayId, score, d: proj.d };
  }
  return best;
}

function relationDistanceMiles(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d+(?:\.\d+)?)\s*(km|mi|miles)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!(n > 0)) return null;
  const unit = (m[2] || 'km').toLowerCase();
  const miles = unit.startsWith('mi') ? n : n * 0.621371;
  if (miles > 20) return null;
  return miles;
}
function ascentText(raw, relationMiles, measuredMiles) {
  const miles = relationDistanceMiles(String(raw ? relationMiles : ''));
  if (miles == null || measuredMiles == null) return null;
  if (Math.abs(miles - measuredMiles) / measuredMiles > 0.4 && Math.abs(miles - measuredMiles * 2) / (measuredMiles * 2) > 0.4) return null;
  const m = String(raw).trim().match(/^(\d+(?:\.\d+)?)\s*(m|meters|ft|feet)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!(n > 0 && n < 5000)) return null;
  const unit = (m[2] || 'm').toLowerCase();
  if (unit.startsWith('f')) return `${Math.round(n)} feet`;
  return `${Math.round(n)} m (${Math.round(n * 3.28084)} feet)`;
}

/**
 * @param {{name: string, lat: number, lng: number}} fall
 * @param {object[]} elements Overpass elements (ways with geometry, nodes, relations)
 * @returns {object|null}
 */
export function trailFromElements(fall, elements) {
  if (!fall || !Number.isFinite(fall.lat) || !Number.isFinite(fall.lng)) return null;
  const { graph, relByWay } = buildGraph(elements || []);
  if (!graph.segments.length) return null;

  const targets = [];
  for (const el of elements) {
    const tags = el.tags || {};
    let kind = null;
    if (el.type === 'node' && (tags.highway === 'trailhead' || tags.information === 'trailhead')) kind = 'trailhead';
    else if ((el.type === 'node' || el.type === 'way') && tags.amenity === 'parking') kind = 'parking';
    if (!kind) continue;
    const target = snapTarget(graph, el, kind);
    if (target) targets.push(target);
  }

  const fallProj = graph.project(fall, 120);
  const named = nearestNamed(graph, fall);
  if (!fallProj) {
    if (!named) return null;
    return { name: named.name, sources: [elementSource('way', named.wayId)] };
  }
  const start = graph.split(fallProj.seg, fallProj.lat, fallProj.lng, fallProj.dA, fallProj.dB) || fallProj.seg.a;
  const startDist = fallProj.d;

  const targetNodes = new Map();
  for (const t of targets) {
    const prev = targetNodes.get(t.node);
    if (!prev || t.snap < prev.snap || (t.kind === 'trailhead' && prev.kind !== 'trailhead' && t.snap < prev.snap + 15)) targetNodes.set(t.node, t);
  }
  const maxM = 8 * 1609.344;
  const { prev, reached } = routeFrom(graph, start, startDist, new Set(targetNodes.keys()), maxM);

  const atTheFalls = [...reached.entries()].some(([, d]) => d <= 100);
  let best = null;
  if (!atTheFalls) {
    for (const [node, graphDist] of reached) {
      const target = targetNodes.get(node);
      if (!target) continue;
      const pathMeters = graphDist + target.snap;
      if (pathMeters < 60 || pathMeters > maxM) continue;
      const built = describePath(fall, prev, node, target, pathMeters, relByWay);
      if (!built) continue;
      const nameBlob = `${target.name} ${built.name || ''}`;
      let score = pathMeters;
      if (sharesToken(nameBlob, fall.name)) score *= 0.6;
      if (target.kind === 'trailhead') score *= 0.9;
      if (!best || score < best.score) best = { score, built };
    }
  }

  if (best) return best.built;
  if (named && named.d <= 120 && nameOnlyOk(named.name, fall.name)) return { name: named.name, sources: [elementSource('way', named.wayId)] };
  return null;
}

function describePath(fall, prev, targetNode, target, pathMeters, relByWay) {
  const { edges, start } = reconstruct(prev, targetNode);
  if (!edges.length) return null;
  let total = 0;
  const named = new Map();
  const sac = new Map();
  const dogs = new Map();
  const fees = new Map();
  const charges = new Map();
  const diffs = new Map();
  const ways = new Map();
  for (const e of edges) {
    total += e.d;
    const meta = e.meta;
    if (meta.name && !meta.bridge && !badTrailName(meta.name)) named.set(meta.name, (named.get(meta.name) || 0) + e.d);
    if (meta.sac) sac.set(meta.sac, (sac.get(meta.sac) || 0) + e.d);
    if (meta.dog) dogs.set(meta.dog, (dogs.get(meta.dog) || 0) + e.d);
    if (meta.fee) fees.set(meta.fee, (fees.get(meta.fee) || 0) + e.d);
    if (meta.charge) charges.set(meta.charge, (charges.get(meta.charge) || 0) + e.d);
    if (meta.difficulty) diffs.set(meta.difficulty, (diffs.get(meta.difficulty) || 0) + e.d);
    ways.set(meta.wayId, (ways.get(meta.wayId) || 0) + e.d);
  }
  if (!(total > 0)) return null;

  const rels = [];
  const seenRel = new Set();
  for (const wayId of ways.keys()) {
    for (const rel of relByWay.get(wayId) || []) {
      if (seenRel.has(rel.id)) continue;
      seenRel.add(rel.id);
      let cover = 0;
      for (const e of edges) if (rel.ways.has(e.meta.wayId)) cover += e.d;
      rels.push({ ...rel, cover: cover / total });
    }
  }
  const relNamed = rels.some((r) => r.name && r.cover >= 0.4);

  let pathName = null;
  let nameScore = -1;
  let nameWay = null;
  for (const [n, m] of named) {
    if (m < total * 0.2) continue;
    const score = m / total + (sharesToken(n, fall.name) ? 0.75 : 0);
    if (score > nameScore) {
      nameScore = score;
      pathName = n;
      let top = 0;
      for (const [id, len] of ways) {
        const sample = edges.find((e) => e.meta.wayId === id);
        if (sample?.meta.name === n && len > top) { top = len; nameWay = id; }
      }
    }
  }
  let nameRel = null;
  for (const rel of rels) {
    if (!rel.name || rel.cover < 0.45) continue;
    const score = rel.cover + (sharesToken(rel.name, fall.name) ? 0.75 : 0);
    if (score > nameScore + 0.05) {
      nameScore = score;
      pathName = rel.name;
      nameRel = rel;
    }
  }
  if (!pathName && target.kind !== 'trailhead' && !relNamed) return null;
  let track = 0;
  for (const e of edges) if (e.meta.highway === 'track') track += e.d;
  if (!pathName && track > total * 0.6) return null;

  const deadEnd = !continuesPast(start, edges);
  let type = deadEnd ? 'out-and-back' : null;
  let distanceMeters = pathMeters;
  let distanceKind = 'one-way';

  const ban = new Set(edges);
  for (const e of edges) if (e.rev) ban.add(e.rev);
  const altEdges = otherWayBack(start, targetNode, ban);
  if (altEdges && altEdges.reduce((s, e) => s + e.d, 0) > 150) {
    const pathNodes = [start, targetNode, ...edges.map((e) => e.to)];
    if (diverges(altEdges, pathNodes)) {
      const loopMeters = target.snap + total + altEdges.reduce((s, e) => s + e.d, 0);
      if (loopMeters <= 12 * 1609.344) {
        type = 'loop';
        distanceMeters = loopMeters;
        distanceKind = 'loop';
      }
    }
  }

  const distance = formatDistance(distanceMeters, distanceKind);
  if (!distance && !pathName) return null;

  let source = nameRel
    ? elementSource('relation', nameRel.id)
    : elementSource('way', nameWay || [...ways.entries()].sort((a, b) => b[1] - a[1])[0][0]);

  const measuredMiles = distanceMeters / 1609.344;
  let elevationGain = null;
  for (const rel of rels) {
    if (rel.cover < 0.5 || !rel.ascent) continue;
    const text = ascentText(rel.ascent, rel.distance, measuredMiles);
    if (text) { elevationGain = text; break; }
  }

  const trail = {
    sources: [source],
  };
  if (pathName) trail.name = pathName;
  if (distance) {
    trail.distance = distance;
    if (type) trail.type = type;
  }
  const sacLabel = sacText(sac, total);
  const diffLabel = difficultyText(diffs, total);
  if (sacLabel) trail.difficulty = sacLabel;
  else if (diffLabel) trail.difficulty = diffLabel;
  if (elevationGain) trail.elevationGain = elevationGain;
  const dogLine = dogText(unanimous(dogs, total, 0.5));
  if (dogLine) trail.dogs = dogLine;
  const fee = feeText(unanimous(fees, total, 0.5), unanimous(charges, total, 0.5));
  if (fee) trail.fees = fee;
  if (target && Number.isFinite(target.lat) && Number.isFinite(target.lng)) {
    trail.trailhead = { name: target.name, lat: target.lat, lng: target.lng, map: mapLink(target.lat, target.lng) };
  }
  if (!trail.name && !trail.distance) return null;
  if (!routeOk(fall, trail.name, target, distanceMeters, trail.type || null)) return null;
  return trail;
}

function otherWayBack(start, targetNode, ban) {
  const from = targetNode;
  const to = start;
  const dist = new Map([[from, 0]]);
  const prev = new Map([[from, null]]);
  const heap = new MinHeap();
  heap.push({ n: from, d: 0 });
  const maxM = 10 * 1609.344;
  while (heap.size) {
    const cur = heap.pop();
    if (!cur || cur.d !== dist.get(cur.n)) continue;
    if (cur.n === to) break;
    if (cur.d > maxM) continue;
    for (const e of cur.n.edges) {
      if (ban.has(e)) continue;
      const nd = cur.d + e.d;
      if (nd > maxM) continue;
      if (!dist.has(e.to) || nd < dist.get(e.to)) {
        dist.set(e.to, nd);
        prev.set(e.to, { from: cur.n, edge: e });
        heap.push({ n: e.to, d: nd });
      }
    }
  }
  if (!dist.has(to)) return null;
  const edges = reconstruct(prev, to).edges;
  return edges.length ? edges : null;
}
