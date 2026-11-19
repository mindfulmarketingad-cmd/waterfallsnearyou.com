// Same-stream rules for waterfall water temperature and water quality.
// A monitoring site counts only when it is on the named stream the falls sits on,
// or on the next named water that stream flows into, and only inside the distances below.
// Nothing here invents a missing month, a missing sample, or a value between two sites.

export const WATER_RULES = {
  networkKm: 12,
  straightLineKm: 12,
  snapMeters: 400,
  hintMeters: 1000,
  unnamedAnchorMeters: 200,
  attainsMeters: 1000,
  nameGapMeters: 150,
  typicalYearsMin: 3,
  recentDays: 120,
  currentHours: 48,
  sampleYears: 10,
  ecoliBeachActionValue: 235,
};

const WATER_WORD = 'Creek|River|Brook|Run|Branch|Stream|Kill|Wash|Gulch|Bayou';
const PROPER = "[A-Z][A-Za-z0-9.'’\\-]*";

const ABBREVIATIONS = [
  [/\bso fk\b/g, 'south fork'],
  [/\bs fk\b/g, 'south fork'],
  [/\bs f\b/g, 'south fork'],
  [/\bsf\b/g, 'south fork'],
  [/\bno fk\b/g, 'north fork'],
  [/\bn fk\b/g, 'north fork'],
  [/\bn f\b/g, 'north fork'],
  [/\bnf\b/g, 'north fork'],
  [/\be f\b/g, 'east fork'],
  [/\bef\b/g, 'east fork'],
  [/\bw f\b/g, 'west fork'],
  [/\bwf\b/g, 'west fork'],
  [/\bm f\b/g, 'middle fork'],
  [/\bmf\b/g, 'middle fork'],
  [/\bcrk\b/g, 'creek'],
  [/\bcr\b/g, 'creek'],
  [/\bck\b/g, 'creek'],
  [/\bbrk\b/g, 'brook'],
  [/\bbk\b/g, 'brook'],
  [/\bbr\b/g, 'branch'],
  [/\bfk\b/g, 'fork'],
  [/\brv\b/g, 'river'],
  [/\bnr\b/g, 'near'],
  [/\bblw\b/g, 'below'],
  [/\babv\b/g, 'above'],
  [/\bc\b/g, 'creek'],
  [/\br\b/g, 'river'],
  [/\bst\b/g, 'saint'],
];

const PREFIX_QUALIFIER = /\b(north fork|south fork|east fork|west fork|middle fork|little|big|upper|lower|dry|north|south|east|west)\s*$/;
const LOCATION_PREP = /\b(at|near|above|below|upstream|downstream)\b/;
const NOT_THE_STREAM = /\b(influent|effluent|wastewater|sewage|outfall|wwtp|sewer|intake|well|wells|spring|springs|canal|ditch|drain|slough|left bank|right bank|powerhouse|tailrace|penstock|flume|aqueduct|lake|lakes|reservoir|pond|bay|harbor|harbour)\b/;

export const CAUSE_LABELS = {
  algal_growth: 'algal growth',
  ammonia: 'ammonia',
  biotoxins: 'biotoxins',
  cause_unknown: 'an unknown cause',
  cause_unknown_fish_kills: 'fish kills of unknown cause',
  cause_unknown_impaired_biota: 'impaired biota of unknown cause',
  chlorine: 'chlorine',
  dioxins: 'dioxins',
  flow_alterations: 'flow alterations',
  habitat_alterations: 'habitat alterations',
  hydrologic_alteration: 'hydrologic alteration',
  mercury: 'mercury',
  metals_other_than_mercury: 'metals other than mercury',
  noxious_aquatic_plants: 'noxious aquatic plants',
  nuisance_exotic_species: 'nuisance exotic species',
  nuisance_native_species: 'nuisance native species',
  nutrients: 'nutrients',
  oil_and_grease: 'oil and grease',
  other_cause: 'other causes',
  oxygen_depletion: 'dissolved oxygen',
  pathogens: 'pathogens',
  pesticides: 'pesticides',
  pfas: 'PFAS',
  ph_acidity_caustic_conditions: 'pH',
  polychlorinated_biphenyls_pcbs: 'PCBs',
  radiation: 'radiation',
  sediment: 'sediment',
  solids_chlorides_sulfates: 'chloride, sulfate, or other solids',
  taste_color_and_odor: 'taste, color, and odor',
  temperature: 'temperature',
  total_toxics: 'toxics',
  toxic_inorganics: 'toxic inorganic chemicals',
  toxic_organics: 'toxic organic chemicals',
  trash: 'trash',
  turbidity: 'turbidity',
};

export function normalizeWaterName(value) {
  let text = String(value || '').toLowerCase();
  text = text.replace(/[’']/g, '');
  text = text.replace(/&/g, ' and ');
  text = text.replace(/[@./]/g, ' ');
  text = text.replace(/[,()]/g, ' ');
  text = text.replace(/[^a-z0-9]+/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of ABBREVIATIONS) text = text.replace(pattern, replacement);
  return text.replace(/\s+/g, ' ').trim();
}

export function streamHint(fallsName, description) {
  const text = String(description || '');
  const re = new RegExp(`\\b(?:[Oo]n|[Oo]f)\\s+(?:the\\s+)?(${PROPER}(?:\\s+${PROPER}){0,4}\\s+(?:${WATER_WORD}))\\b`, 'g');
  for (const described of text.matchAll(re)) {
    const before = text.slice(Math.max(0, described.index - 24), described.index);
    // These phrases locate the falls beside a river, not in it.
    if (/\b(?:tributar(?:y|ies)|side|mouth|bank|banks)\s+$/i.test(before) && /^[Oo]f\b/.test(described[0])) continue;
    return described[1];
  }
  const named = String(fallsName || '').match(new RegExp(`^(?:(?:Upper|Lower|Middle)\\s+)?(.+\\s+(?:${WATER_WORD}))\\s+Falls?$`, 'i'));
  if (named) return named[1];
  const ofThe = String(fallsName || '').match(new RegExp(`^Falls\\s+of\\s+(?:the\\s+)?(.+\\s+(?:${WATER_WORD}))$`, 'i'));
  return ofThe ? ofThe[1] : null;
}

function isFlowline(feature) {
  const code = Number(feature.fcode);
  return code === 55800 || (code >= 46000 && code < 46100);
}

function namedResult(feature) {
  return {
    name: String(feature.name).trim(),
    feature,
  };
}

// Pick the named NHD flowline at the falls. Ambiguous confluences return null.
// An unnamed line within unnamedAnchorMeters is returned so a downstream walk can
// look for the first named receiving water, and is never treated as a stream name.
export function chooseStream(features, hint) {
  const hintName = hint ? normalizeWaterName(hint) : '';
  const lines = (features || []).filter((feature) => isFlowline(feature) && Number.isFinite(feature.meters));
  const named = lines.filter((feature) => normalizeWaterName(feature.name));
  const closestByName = new Map();
  for (const feature of named) {
    const key = normalizeWaterName(feature.name);
    const current = closestByName.get(key);
    if (!current || feature.meters < current.meters) closestByName.set(key, feature);
  }
  const near = [...closestByName.values()].filter((feature) => feature.meters <= WATER_RULES.snapMeters);
  const hinted = [...closestByName.values()].filter((feature) => hintName && normalizeWaterName(feature.name) === hintName && feature.meters <= WATER_RULES.hintMeters);

  if (hinted.length === 1) {
    const chosen = hinted[0];
    const underfoot = near.find((feature) => normalizeWaterName(feature.name) !== hintName && feature.meters <= 80 && feature.meters + WATER_RULES.nameGapMeters < chosen.meters);
    if (!underfoot) return namedResult(chosen);
  }
  if (near.length === 1) return namedResult(near[0]);
  if (near.length > 1) {
    near.sort((a, b) => a.meters - b.meters || (b.streamOrder || 0) - (a.streamOrder || 0));
    const gap = near[1].meters - near[0].meters;
    const orderGap = (near[0].streamOrder || 0) - (near[1].streamOrder || 0);
    // A line under the falls is that stream. A second name a short distance away is a side creek.
    if (gap >= WATER_RULES.nameGapMeters || (near[0].meters <= 40 && gap >= 80) || (near[0].meters <= 50 && orderGap >= 2)) return namedResult(near[0]);
    return null;
  }
  lines.sort((a, b) => a.meters - b.meters);
  if (lines[0] && lines[0].meters <= WATER_RULES.unnamedAnchorMeters) return { name: null, feature: lines[0] };
  return null;
}

export function siteMatchesStream(siteName, streamName) {
  const stream = normalizeWaterName(streamName);
  let site = normalizeWaterName(siteName);
  if (!stream || !site) return false;
  // USGS station titles use a lone "A" for "at" between the stream and the place.
  site = site.replace(/(\S)\s+a\s+/g, '$1 at ').replace(/\s+/g, ' ').trim();
  const at = site.indexOf(stream);
  if (at < 0) return false;
  if (at > 0 && site[at - 1] !== ' ') return false;
  const end = at + stream.length;
  if (end < site.length && site[end] !== ' ') return false;
  const prefix = site.slice(0, at).trim();
  if (prefix && PREFIX_QUALIFIER.test(prefix)) return false;
  const prep = site.match(LOCATION_PREP);
  const subject = prep && prep.index > 0 ? site.slice(0, prep.index).trim() : site;
  const facility = subject.match(NOT_THE_STREAM);
  if (facility && !stream.includes(facility[0])) return false;
  return true;
}

const ATTAINS_TAIL = new Set(['lower', 'upper', 'middle', 'and', 'tribs', 'tributaries', 'minor', 'main', 'stem', 'reach', 'segment', 'part', 'of', 'the', 'unnamed']);

export function attainsMatches(auName, streamName) {
  const raw = String(auName || '').trim();
  const stream = normalizeWaterName(streamName);
  if (!raw || !stream) return false;
  if (/^huc\d*\s*name\s*:/i.test(raw)) return false;
  const stripped = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (/[A-Za-z]\s*-\s*[A-Za-z]/.test(stripped)) return false;
  const name = normalizeWaterName(stripped);
  if (name === stream) return true;
  if (!name.startsWith(`${stream} `)) return false;
  const rest = name.slice(stream.length).trim();
  if (/^(at|near|above|below|upstream|downstream|from|to|mile)\b/.test(rest)) return true;
  // "Taughannock Creek, Lower, and tribs" is that creek's assessment unit.
  // "Rock Creek and Boulder Creek" is two waters and is not accepted.
  return rest.split(' ').every((word) => ATTAINS_TAIL.has(word));
}

export function causeList(attributes) {
  if (!attributes) return [];
  const causes = [];
  for (const [key, label] of Object.entries(CAUSE_LABELS)) {
    if (String(attributes[key] || '').toLowerCase() === 'cause') causes.push(label);
  }
  if (/^(y|cause)$/i.test(String(attributes.fish_consumption_advisory || ''))) causes.push('a fish-consumption advisory');
  return causes;
}

export function haversineKm(a, b) {
  const R = 6371.0088;
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathMetrics(lat, lng, paths) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180);
  const ky = 110540;
  const project = (pointLng, pointLat) => [(pointLng - lng) * kx, (pointLat - lat) * ky];
  let best = null;
  for (const path of paths || []) {
    if (!path || path.length < 2) continue;
    const points = path.map(([pointLng, pointLat]) => project(pointLng, pointLat));
    const segLens = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const len = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      segLens.push(len);
      total += len;
    }
    if (!(total > 0)) continue;
    let walked = 0;
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, (-start[0] * dx + -start[1] * dy) / len2));
      const x = start[0] + t * dx;
      const y = start[1] + t * dy;
      const meters = Math.hypot(x, y);
      if (!best || meters < best.meters) {
        best = {
          meters,
          fraction: (walked + t * segLens[i - 1]) / total,
          lengthM: total,
          snapLng: lng + x / kx,
          snapLat: lat + y / ky,
        };
      }
      walked += segLens[i - 1];
    }
  }
  return best;
}

export function downstreamMeters(metrics, flowdir) {
  if (!metrics) return null;
  if (Number(flowdir) === 1) return metrics.lengthM * (1 - metrics.fraction);
  return metrics.lengthM;
}

// Mean of USGS monthly means for one time series. Months with fewer than
// typicalYearsMin distinct years are omitted. Series are not mixed.
export function aggregateMonthly(rows) {
  const bySeries = new Map();
  for (const row of rows || []) {
    const value = Number(row.value);
    const year = Number(row.year);
    const month = Number(row.month);
    if (!row.tsId || !Number.isFinite(value) || !Number.isInteger(year) || month < 1 || month > 12) continue;
    if (!bySeries.has(row.tsId)) bySeries.set(row.tsId, []);
    bySeries.get(row.tsId).push({ value, year, month });
  }
  let best = null;
  let bestKey = null;
  for (const [tsId, points] of bySeries) {
    const latest = Math.max(...points.map((point) => point.year * 12 + point.month));
    if (!best || latest > bestKey.latest || (latest === bestKey.latest && points.length > best.length)) {
      best = points;
      bestKey = { tsId, latest };
    }
  }
  if (!best) return null;
  const months = {};
  for (let month = 1; month <= 12; month++) {
    const points = best.filter((point) => point.month === month);
    const years = new Set(points.map((point) => point.year));
    if (years.size < WATER_RULES.typicalYearsMin) continue;
    const mean = points.reduce((sum, point) => sum + point.value, 0) / points.length;
    months[String(month)] = { c: Math.round(mean * 100) / 100, years: years.size };
  }
  const stamps = best.map((point) => point.year * 12 + point.month);
  const min = Math.min(...stamps);
  const max = Math.max(...stamps);
  const stamp = (value) => `${Math.floor((value - 1) / 12)}-${String(((value - 1) % 12) + 1).padStart(2, '0')}`;
  return {
    tsId: bestKey.tsId,
    months,
    begin: stamp(min),
    end: stamp(max),
  };
}

export function celsiusToFahrenheit(celsius) {
  if (!Number.isFinite(celsius)) return null;
  return celsius * 9 / 5 + 32;
}

export function formatTemps(celsius) {
  const fahrenheit = celsiusToFahrenheit(Number(celsius));
  if (!Number.isFinite(fahrenheit)) return null;
  const fmt = (value) => value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${fmt(fahrenheit)}°F (${fmt(Number(celsius))}°C)`;
}

export function ecoliComparison(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const compact = String(unit || '').toLowerCase().replace(/\s+/g, '');
  if (!/^(mpn|cfu|#|count)\/100ml$/.test(compact)) return null;
  const reference = WATER_RULES.ecoliBeachActionValue;
  return { value: number, reference, relation: number > reference ? 'above' : 'below' };
}

export function withinStraightLine(distanceKm) {
  return Number.isFinite(distanceKm) && distanceKm <= WATER_RULES.straightLineKm;
}

export function titleCaseStation(name) {
  const text = String(name || '').trim();
  if (!text || text !== text.toUpperCase()) return text;
  const states = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);
  return text.toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\b(Nr|Near|At|Above|Below|Of|The|On|A|And|Or|In|To|From|Blw|Abv)\b/g, (word) => word.toLowerCase())
    .replace(/\ba\b/g, 'at')
    .replace(/\bnr\b/g, 'near')
    .replace(/\b([a-z]{2})\.?$/i, (state) => states.has(state.toUpperCase()) ? state.toUpperCase() : state);
}
