// Normalizes Outscraper Google Maps exports into data/outscraper.json.
// Drop any Outscraper export (.csv, .json or .xlsx) into data/outscraper/ and run:
//   npm run import:outscraper      (also runs automatically before every build)
// Every record is matched to an existing USGS waterfall by distance + name; unmatched records become new listings.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data/outscraper');
const OUT = path.join(ROOT, 'data/outscraper.json');

const STATE_CODES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
  'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
const num = (v) => {
  const n = parseFloat(str(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
function json(v) {
  if (v && typeof v === 'object') return v;
  const s = str(v);
  if (!s || !/^[[{]/.test(s)) return null;
  try { return JSON.parse(s); } catch { try { return JSON.parse(s.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')); } catch { return null; } }
}
function safeUrl(v) {
  const s = str(v);
  if (!s) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return ''; }
}

function parseHours(r) {
  const out = [];
  const obj = json(r.working_hours);
  if (obj && !Array.isArray(obj)) {
    for (const d of DAYS) {
      const v = obj[d] ?? obj[d.toLowerCase()];
      if (v !== undefined) out.push({ day: d, hours: Array.isArray(v) ? v.join(', ') : str(v) });
    }
  }
  if (!out.length && str(r.working_hours_old_format)) {
    for (const part of str(r.working_hours_old_format).split('|')) {
      const [day, ...rest] = part.split(',');
      if (DAYS.includes(day.trim())) out.push({ day: day.trim(), hours: rest.join(',').trim() });
    }
  }
  if (!out.length && typeof r.working_hours === 'string' && r.working_hours.includes(':')) {
    for (const part of r.working_hours.split(/[|;\n]/)) {
      const m = /^\s*(\w+)\s*:\s*(.+)$/.exec(part);
      if (m && DAYS.includes(m[1])) out.push({ day: m[1], hours: m[2].trim() });
    }
  }
  return out.map((h) => ({ day: h.day, hours: h.hours.replace(/ /g, ' ').replace(/^Open 24 hours$/i, 'Open 24 hours') }));
}

function parseAbout(v) {
  const obj = json(v);
  if (!obj || Array.isArray(obj)) return null;
  const out = {};
  for (const [section, items] of Object.entries(obj)) {
    if (items && typeof items === 'object') {
      const list = Object.entries(items).filter(([, on]) => on === true).map(([k]) => k);
      const negative = Object.entries(items).filter(([, on]) => on === false).map(([k]) => `No ${k.toLowerCase()}`);
      if (list.length || negative.length) out[section] = [...list, ...negative];
    }
  }
  return Object.keys(out).length ? out : null;
}

function normalize(r) {
  const name = str(r.name || r.title);
  const lat = num(r.latitude ?? r.lat), lng = num(r.longitude ?? r.lng ?? r.lon);
  if (!name || lat === null || lng === null) return null;
  const cc = str(r.country_code || r.country).toUpperCase();
  if (cc && !['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(cc)) return null;
  if (/CLOSED_PERMANENTLY/i.test(str(r.business_status))) return null;
  const stateRaw = str(r.us_state || r.state);
  const stateCode = stateRaw.length === 2 ? stateRaw.toUpperCase() : STATE_CODES[stateRaw.toLowerCase()] || '';
  const perScore = {};
  const ps = json(r.reviews_per_score);
  for (let i = 1; i <= 5; i++) {
    const v = num(r[`reviews_per_score_${i}`] ?? ps?.[i] ?? ps?.[String(i)]);
    if (v !== null) perScore[i] = v;
  }
  const photos = [];
  const photoList = json(r.photos) || (str(r.photos_sample) ? json(r.photos_sample) : null);
  if (Array.isArray(photoList)) for (const p of photoList) { const u = safeUrl(typeof p === 'string' ? p : p?.photo_url || p?.url); if (u) photos.push(u); }
  const photo = safeUrl(r.photo) || photos[0] || '';
  return {
    name,
    lat, lng,
    fullAddress: str(r.full_address || r.address),
    street: str(r.street),
    city: str(r.city),
    postalCode: str(r.postal_code),
    state: stateRaw,
    stateCode,
    county: str(r.county).replace(/ County$/, ''),
    phone: str(r.phone),
    site: safeUrl(r.site || r.website),
    rating: num(r.rating),
    reviews: num(r.reviews) ?? 0,
    reviewsPerScore: Object.keys(perScore).length ? perScore : null,
    photosCount: num(r.photos_count) ?? 0,
    photo,
    photos: [...new Set([photo, ...photos].filter(Boolean))].slice(0, 8),
    streetView: safeUrl(r.street_view),
    logo: safeUrl(r.logo),
    category: str(r.category || r.type),
    subtypes: str(r.subtypes).split(',').map((s) => s.trim()).filter(Boolean),
    description: str(r.description),
    about: parseAbout(r.about),
    hours: parseHours(r),
    businessStatus: str(r.business_status),
    priceRange: str(r.range),
    typicalTimeSpent: str(r.typical_time_spent),
    verified: /^(true|1)$/i.test(str(r.verified)),
    ownerTitle: str(r.owner_title),
    placeId: str(r.place_id),
    googleId: str(r.google_id),
    cid: str(r.cid),
    plusCode: str(r.plus_code),
    timezone: str(r.time_zone),
    locatedIn: str(r.located_in),
    locationLink: safeUrl(r.location_link),
    reviewsLink: safeUrl(r.reviews_link || r.location_reviews_link),
    bookingLink: safeUrl(r.booking_appointment_link || r.reservation_links),
    areaService: /^(true|1)$/i.test(str(r.area_service)),
  };
}

async function readRows(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.json') {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const rows = Array.isArray(data) ? data : data.data || [];
    return rows.flat(2);
  }
  if (ext === '.csv') return parse(readFileSync(file), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
  if (ext === '.xlsx') {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.worksheets[0];
    const header = ws.getRow(1).values.slice(1).map((h) => str(h));
    const rows = [];
    ws.eachRow((row, i) => {
      if (i === 1) return;
      const o = {};
      header.forEach((h, j) => { const v = row.getCell(j + 1).value; o[h] = v && typeof v === 'object' && 'text' in v ? v.text : v; });
      rows.push(o);
    });
    return rows;
  }
  return [];
}

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => /\.(csv|json|xlsx)$/i.test(f)) : [];
if (!files.length) {
  if (!existsSync(OUT)) writeFileSync(OUT, '[]\n');
  console.log('Outscraper: no export files in data/outscraper/ (kept existing data/outscraper.json).');
} else {
  const byKey = new Map();
  for (const f of files) {
    for (const row of await readRows(path.join(DIR, f))) {
      const rec = normalize(row);
      if (!rec) continue;
      const key = rec.placeId || rec.googleId || `${rec.name}|${rec.lat.toFixed(4)}|${rec.lng.toFixed(4)}`;
      const prev = byKey.get(key);
      if (!prev || (rec.reviews || 0) >= (prev.reviews || 0)) byKey.set(key, rec);
    }
  }
  const out = [...byKey.values()];
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`Outscraper: imported ${out.length} records from ${files.length} file(s).`);
}
