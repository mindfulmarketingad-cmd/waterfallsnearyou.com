// Download a licensed waterfall photo for every state page and write
// public/images/states/{slug}-{width}.webp plus src/data/state-heroes.json.
// Sources are Wikimedia Commons (PD, CC0, CC BY, CC BY-SA). Nothing is hotlinked.
//
//   node scripts/fetch-state-heroes.mjs
//   node scripts/fetch-state-heroes.mjs --only=oregon,iowa
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { loadData } from '../src/lib/core.mjs';
import { richListing } from '../src/lib/indexing.mjs';

const UA = 'WaterfallsNearYou/1.0 (state hero images; https://www.waterfallsnearyou.com)';
const PREFER = {
  connecticut: /Kent Falls State Park Lower Section/i,
  arkansas: /Eden Falls - Lost Valley State Park/i,
  pennsylvania: /Dingmans Falls - Pennsylvania \(5677591961\)/i,
};
const EXCLUDE = new Set([
  'File:Noccalula Falls park train - July 2006.jpg',
  'File:Kent Falls State Park.JPG',
  'File:Rainbow Falls, Hilo (504319) (23458548051).jpg',
  'File:Creek near Little Falls of Potomac R., Washington LCCN2004661957.jpg',
  'File:Creek near Little Falls of Potomac R., Washington LCCN2004661957.tif',
  'File:Mineral Springs Falls in Black Rock Forest, NY.jpg',
  'File:Admiring the swirling Yellowstone River just above the Lower Falls, Yellowstone National Park, 2009.jpg',
  'File:Hiking Havasu Falls (Unsplash).jpg',
  'File:Eden Cave - Eden Falls - panoramio.jpg',
  'File:Kyle Canyon Mary Jane Falls 1.jpg',
  'File:Kyle Canyon Mary Jane Falls 2.jpg',
  'File:Kyle Canyon Mary Jane Falls 3.jpg',
  'File:Charleston Peak from Mary Jane Falls 1.jpg',
  'File:Bushkill Falls - 20200620 114354.jpg',
]);
const STATE_WORDS = [
  ['Alabama', /\bAlabama\b/], ['Alaska', /\bAlaska\b/], ['Arizona', /\bArizona\b/], ['Arkansas', /\bArkansas\b/],
  ['California', /\bCalifornia\b/], ['Colorado', /\bColorado\b/], ['Connecticut', /\bConnecticut\b/],
  ['Florida', /\bFlorida\b/], ['Georgia', /\bGeorgia\b/], ['Hawaii', /\bHawaiʻ?i\b/], ['Idaho', /\bIdaho\b/],
  ['Illinois', /\bIllinois\b/], ['Indiana', /\bIndiana\b/], ['Iowa', /\bIowa\b/], ['Kansas', /\bKansas\b/],
  ['Kentucky', /\bKentucky\b/], ['Louisiana', /\bLouisiana\b/], ['Maine', /\bMaine\b/], ['Maryland', /\bMaryland\b/],
  ['Massachusetts', /\bMassachusetts\b/], ['Michigan', /\bMichigan\b/], ['Minnesota', /\bMinnesota\b/],
  ['Mississippi', /\bMississippi\b|\bMiss\.\b/], ['Missouri', /\bMissouri\b/], ['Montana', /\bMontana\b/],
  ['Nebraska', /\bNebraska\b/], ['Nevada', /\bNevada\b/], ['New Hampshire', /\bNew Hampshire\b/],
  ['New Jersey', /\bNew Jersey\b/], ['New Mexico', /\bNew Mexico\b/], ['New York', /\bNew York\b|\bNY\b/],
  ['North Carolina', /\bNorth Carolina\b|\bN\.C\./], ['North Dakota', /\bNorth Dakota\b|\bN\.D\./],
  ['Ohio', /\bOhio\b/], ['Oklahoma', /\bOklahoma\b/], ['Oregon', /\bOregon\b/], ['Pennsylvania', /\bPennsylvania\b/],
  ['Rhode Island', /\bRhode Island\b/], ['South Carolina', /\bSouth Carolina\b/], ['South Dakota', /\bSouth Dakota\b/],
  ['Tennessee', /\bTennessee\b/], ['Texas', /\bTexas\b/], ['Utah', /\bUtah\b/], ['Vermont', /\bVermont\b/],
  ['Virginia', /\bVirginia\b/], ['Washington', /\bWashington State\b|\b, WA\b/], ['West Virginia', /\bWest Virginia\b/],
  ['Wisconsin', /\bWisconsin\b/], ['Wyoming', /\bWyoming\b/],
];
function otherStateInTitle(title, state) {
  if (state.slug !== 'new-york' && /\bNY\b|,\s*N\.Y\./.test(title)) return true;
  for (const [name, re] of STATE_WORDS) {
    if (name === state.name) continue;
    if (state.name === 'District of Columbia' && name === 'Washington') continue;
    if (re.test(title)) return true;
  }
  return false;
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const IMG_DIR = path.join(ROOT, 'public/images/states');
const JSON_PATH = path.join(ROOT, 'src/data/state-heroes.json');
const WIDTHS = [640, 1200, 1600];
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

const { listings } = loadData();

function miles(a, b) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

function findHref(stateName, listingName, lat, lng) {
  if (!listingName) return null;
  const hits = listings.filter((l) => l.state === stateName && l.name.toLowerCase() === listingName.toLowerCase());
  const near = hits.filter((l) => miles({ lat: l.lat, lng: l.lng }, { lat, lng }) < 40);
  const pool = near.length ? near : hits;
  const pub = pool.find((l) => richListing(l));
  return pub?.url || null;
}

function strip(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function licenseOk(short = '') {
  const s = short.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return false;
  if (/non-?commercial|\bnc\b|no.?deriv|\bnd\b|all rights reserved|copyrighted|gfdl|fair use/.test(s)) return false;
  if (/public domain|^cc0\b|no restrictions|creative commons zero/.test(s)) return true;
  if (/^cc by-sa\b/.test(s)) return true;
  if (/^cc by(?!-sa)\b/.test(s)) return true;
  return false;
}

function cleanCredit(meta) {
  const bad = /^(own work|self|unknown|anonymous|n\/a|see below|see file|wikimedia commons)$/i;
  for (const key of ['Artist', 'Credit', 'Attribution']) {
    const text = strip(meta[key]?.value || '').replace(/\s*\(talk\)/gi, '').trim();
    if (text && !bad.test(text)) return text.length > 160 ? `${text.slice(0, 157)}...` : text;
  }
  return 'Wikimedia Commons';
}

function gpsOf(page) {
  const list = page.coordinates || [];
  const c = list.find((x) => x.primary) || list[0];
  if (!c) return null;
  const lat = Number(c.lat);
  const lng = Number(c.lon ?? c.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function inBox(gps, bbox) {
  if (!gps || !bbox) return true;
  const [south, west, north, east] = bbox;
  const m = bbox.margin ?? 0.2;
  return gps.lat >= south - m && gps.lat <= north + m && gps.lng >= west - m && gps.lng <= east + m;
}

async function api(params, attempt = 0) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error(`Commons ${res.status}`);
  const data = await res.json();
  if (data.error) {
    if (/maxlag|ratelimit/i.test(data.error.info || '') && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return api(params, attempt + 1);
    }
    return { query: { pages: [] }, error: data.error };
  }
  return data;
}

async function searchFiles(q) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: q,
    gsrnamespace: '6',
    gsrlimit: '18',
    prop: 'imageinfo|coordinates',
    iiprop: 'url|size|mime|extmetadata',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Attribution|UsageTerms',
    iiurlwidth: '2400',
  });
  return data.query?.pages || [];
}

function consider(page, choice, state, trusted) {
  const ii = page.imageinfo?.[0];
  if (!ii) return { ok: false, reason: 'no-info' };
  if (!/^image\/(jpeg|png|webp|tiff)$/.test(ii.mime || '')) return { ok: false, reason: 'mime' };
  if ((ii.width || 0) < 1200 || (ii.height || 0) < 630) return { ok: false, reason: 'small' };
  const title = page.title || '';
  if (/\.(svg|gif|pdf|ogv|webm|stl)$/i.test(title)) return { ok: false, reason: 'type' };
  const meta = ii.extmetadata || {};
  const desc = strip(meta.ImageDescription?.value || '');
  const text = `${title} ${desc}`;
  const fileTitle = title.replace(/^File:/, '');
  if (/\b(locator map|location map|logo|icon|diagram|coat of arms|flag of|road sign|welcome sign|entrance sign|plaque|historical marker|parking lot|oil on canvas|watercolor|painting by)\b/i.test(text)) {
    return { ok: false, reason: 'not-photo' };
  }
  if (EXCLUDE.has(title)) return { ok: false, reason: 'excluded' };
  if (choice.kind !== 'landscape') {
    const nameOk = choice.titleMust ? choice.titleMust.test(fileTitle) : true;
    if (!nameOk || !/falls?|fals/i.test(fileTitle)) return { ok: false, reason: 'title-not-falls' };
    if (otherStateInTitle(fileTitle, state)) return { ok: false, reason: 'other-state' };
    if (/\b(bridge|inn|hotel|road|highway|route|trail|sign|painting|canvas|artwork|flower|flowers|plant|mahonia|christmas|light show|lights|visitor center|glacier|overlook|vista|landscape|covered|dam|canal|church|cemetery|monument|statue|plaque|marker|parking|restroom|diagram|train|locomotive|railroad|mill|lookout|sketch|drawing|engraving)\b/i.test(fileTitle)) {
      return { ok: false, reason: 'title-not-subject' };
    }
    if (/\b(covered bridge|locomotive|park train|the sign|lookout sign|pencil drawing|engraving|sketch of|illustration of|drawing of|watercolor)\b/i.test(`${fileTitle} ${desc}`)) {
      return { ok: false, reason: 'desc-not-subject' };
    }
    if (/\bview (from|northwest|northeast|southwest|southeast|west along|east along|north along|south along)\b/i.test(fileTitle)) {
      return { ok: false, reason: 'title-view' };
    }
  } else if (/\b(oil on canvas|watercolor|painting by|artwork|heade|sign|portrait|visitor center|capitol)\b/i.test(text)) {
    return { ok: false, reason: 'not-landscape' };
  }
  const license = strip(meta.LicenseShortName?.value || '');
  if (!licenseOk(license)) return { ok: false, reason: `license:${license || 'none'}` };
  if (choice.rejectText && choice.rejectText.test(text)) return { ok: false, reason: 'reject-text' };
  const gps = gpsOf(page);
  if (gps && !inBox(gps, state.bbox)) return { ok: false, reason: 'outside-state' };
  let gpsMiles = null;
  if (choice.lat != null) {
    if (gps) {
      gpsMiles = miles(gps, { lat: choice.lat, lng: choice.lng });
      if (gpsMiles > choice.maxMiles) return { ok: false, reason: `far:${gpsMiles.toFixed(0)}mi` };
    } else if (!trusted && !(choice.mustMatch && choice.mustMatch.test(text))) {
      return { ok: false, reason: 'unlocated' };
    }
  } else if (!gps && !trusted && !(choice.mustMatch && choice.mustMatch.test(text))) {
    return { ok: false, reason: 'unlocated' };
  }
  const ratio = ii.width / ii.height;
  let score = choice.priority || 0;
  if (ratio >= 1.35 && ratio <= 2.3) score += 50;
  else if (ratio >= 1.15) score += 28;
  else if (ratio < 1) score -= 20;
  if (/lower section|upper section|waterfall|cascade/i.test(title)) score += 90;
  if (PREFER[state.slug]?.test(title)) score += 1000;
  if (ii.width >= 2400) score += 12;
  if (gps && (choice.lat == null || gpsMiles <= choice.maxMiles)) score += 24;
  if (choice.mustMatch && choice.mustMatch.test(text)) score += 16;
  if (/\b(sign|poster|painting|drawing|illustration|engraving|postcard|stamp)\b/i.test(text)) score -= 40;
  if (/\b(selfie|wedding|portrait of)\b/i.test(text)) score -= 20;
  const licenseUrl = strip(meta.LicenseUrl?.value || '');
  return {
    ok: true,
    score,
    title,
    desc: desc.slice(0, 240),
    license,
    licenseUrl: /^https?:/i.test(licenseUrl) ? licenseUrl.replace(/^http:\/\//, 'https://') : '',
    credit: cleanCredit(meta),
    sourceUrl: (ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`).replace(/^http:\/\//, 'https://'),
    downloadUrl: ii.thumbwidth >= 1400 && ii.thumburl ? ii.thumburl : ii.url,
    width: ii.width,
    height: ii.height,
    gpsMiles,
    choice,
  };
}

async function rankedFor(state, choices) {
  const seen = new Set();
  const good = [];
  const rejected = [];
  for (const choice of choices) {
    for (const query of choice.queries) {
      const q = typeof query === 'string' ? query : query.q;
      const trust = typeof query === 'string' ? q.includes('incategory:') : !!query.trust;
      let pages = [];
      try {
        pages = await searchFiles(q);
      } catch (err) {
        rejected.push(`${choice.falls || 'landscape'}: ${err.message}`);
        continue;
      }
      for (const page of pages) {
        if (!page.title || seen.has(page.title)) continue;
        seen.add(page.title);
        const row = consider(page, choice, state, trust);
        if (!row.ok) rejected.push(`${page.title.slice(0, 60)} [${row.reason}]`);
        else good.push(row);
      }
    }
  }
  good.sort((a, b) => b.score - a.score);
  return { good, rejected };
}

async function download(url, attempt = 0) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    return download(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const image = buf[0] === 0xff || buf[0] === 0x89 || buf.slice(0, 4).toString() === 'RIFF';
  if (!image && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    return download(url, attempt + 1);
  }
  if (!image) throw new Error('not an image');
  return buf;
}

async function renderVariants(slug, buf) {
  const base = sharp(buf).rotate();
  const meta = await base.metadata();
  const made = [];
  for (const w of WIDTHS) {
    const h = Math.round((w * 630) / 1200);
    if ((meta.width || 0) < w || (meta.height || 0) < h) continue;
    const cap = w >= 1600 ? 170000 : w >= 1200 ? 120000 : 55000;
    let quality = 72;
    let out;
    do {
      out = await sharp(buf).rotate().resize(w, h, { fit: 'cover', position: 'centre', withoutEnlargement: true }).webp({ quality, effort: 4 }).toBuffer();
      quality -= 6;
    } while (out.length > cap && quality >= 52);
    const file = path.join(IMG_DIR, `${slug}-${w}.webp`);
    await writeFile(file, out);
    const info = await sharp(out).metadata();
    made.push({ w, h: info.height, bytes: out.length });
  }
  if (!made.some((m) => m.w === 1200 && m.h === 630)) return null;
  for (const w of WIDTHS) {
    if (!made.some((m) => m.w === w)) {
      await unlink(path.join(IMG_DIR, `${slug}-${w}.webp`)).catch(() => {});
    }
  }
  return made;
}

function recordOf(state, pick, variants) {
  const c = pick.choice;
  const href = c.kind === 'landscape' ? null : findHref(state.name, c.listingName || c.falls, c.lat, c.lng);
  let caption = c.caption || null;
  if (c.kind === 'landscape' && !caption) {
    const desc = (pick.desc || '').replace(/\s+/g, ' ').trim();
    const usable = desc.length > 12 && desc.length < 160 && new RegExp(state.name.split(' ').pop(), 'i').test(desc);
    caption = usable
      ? `${desc.replace(/\.$/, '')}. Landscape photograph, not a waterfall.`
      : `Landscape in ${state.name}. This photograph does not show a waterfall.`;
  }
  return {
    slug: state.slug,
    kind: c.kind || 'waterfall',
    falls: c.falls || null,
    placePhrase: c.placePhrase || null,
    href,
    alt: c.alt,
    caption,
    credit: pick.credit,
    license: pick.license,
    licenseUrl: pick.licenseUrl,
    sourceUrl: pick.sourceUrl,
    fileTitle: pick.title,
    width: 1200,
    height: 630,
    src: `/images/states/${state.slug}-1200.webp`,
    variants: variants.map((v) => v.w),
    gpsMiles: pick.gpsMiles == null ? null : Math.round(pick.gpsMiles * 10) / 10,
  };
}

// bbox: [south, west, north, east]. margin overrides the default 0.2°.
const M = (margin) => ({ margin });
const STATES = [
  { slug: 'alabama', name: 'Alabama', bbox: [30.1, -88.6, 35.1, -84.8],
    waterfalls: [wf('Noccalula Falls', 'at Noccalula Falls Park in Gadsden, Alabama', 'Noccalula Falls, a waterfall dropping over a rock ledge at Noccalula Falls Park in Gadsden, Alabama.', 34.0415, -86.0211, ['incategory:"Noccalula Falls"', '"Noccalula Falls" Gadsden'], /noccalula/i)] },
  { slug: 'alaska', name: 'Alaska', bbox: [51.0, -170, 71.6, -129],
    waterfalls: [wf('Nugget Falls', 'beside the Mendenhall Glacier near Juneau, Alaska', 'Nugget Falls, a waterfall pouring off a cliff beside the Mendenhall Glacier near Juneau, Alaska.', 58.4269, -134.5376, ['incategory:"Nugget Falls"', '"Nugget Falls" Mendenhall'], /nugget|mendenhall/i)] },
  { slug: 'arizona', name: 'Arizona', bbox: [31.3, -114.9, 37.1, -109.0],
    waterfalls: [wf('Havasu Falls', 'in the Grand Canyon, Arizona', 'Havasu Falls, a waterfall plunging into a pool in the Grand Canyon, Arizona.', 36.2551, -112.698, ['incategory:"Havasu Falls"', '"Havasu Falls" Arizona'], /havasu/i, /california|oregon/i)] },
  { slug: 'arkansas', name: 'Arkansas', bbox: [33.0, -94.7, 36.6, -89.6],
    waterfalls: [
      wf('Falling Water Falls', 'in Pope County, Arkansas', 'Falling Water Falls, a waterfall in the Ozark Mountains of Pope County, Arkansas.', 35.722, -92.9493, ['"Falling Water Falls" Arkansas', 'incategory:"Falling Water Falls"'], /falling water|arkansas|pope county|ozark/i, null, 'Falling Water Falls', 100),
      wf('Eden Falls', 'in Lost Valley, Newton County, Arkansas', 'Eden Falls, a waterfall inside Eden Cave at Lost Valley in the Buffalo National River, Arkansas.', 36.0176, -93.3874, ['"Eden Falls" "Lost Valley"', 'incategory:"Eden Falls (Arkansas)"'], /eden falls/i, /california|oregon/i, 'Eden Falls', 80),
    ] },
  { slug: 'california', name: 'California', bbox: [32.5, -124.5, 42.1, -114.1],
    waterfalls: [
      wf('Yosemite Falls', 'on the granite wall of Yosemite Valley, California', 'Yosemite Falls, a tall waterfall on the granite wall of Yosemite Valley, California.', 37.756, -119.596, ['incategory:"Yosemite Falls"', '"Yosemite Falls"'], /yosemite/i, null, 'Yosemite Falls', 100),
      wf('Burney Falls', 'at McArthur-Burney Falls Memorial State Park, California', 'Burney Falls, a wide waterfall at McArthur-Burney Falls Memorial State Park, California.', 41.0107, -121.6528, ['incategory:"Burney Falls"', '"Burney Falls"'], /burney/i, null, 'Burney Falls', 50),
    ] },
  { slug: 'colorado', name: 'Colorado', bbox: [36.9, -109.1, 41.1, -102.0],
    waterfalls: [
      wf('Bridal Veil Falls', 'above Telluride, Colorado', 'Bridal Veil Falls, a waterfall dropping from a cliff above Telluride, Colorado.', 37.9192, -107.77, ['incategory:"Bridal Veil Falls (Telluride)"', '"Bridal Veil Falls" Telluride'], /telluride|san miguel/i, /provo|oregon|niagara|washington|yosemite/i, 'Bridal Veil Falls', 100, 12),
      wf('Helen Hunt Falls', 'in North Cheyenne Cañon Park, Colorado Springs, Colorado', 'Helen Hunt Falls, a waterfall in North Cheyenne Cañon Park in Colorado Springs, Colorado.', 38.7886, -104.903, ['incategory:"Helen Hunt Falls"', '"Helen Hunt Falls"'], /helen hunt/i, null, 'Helen Hunt Falls', 55),
    ] },
  { slug: 'connecticut', name: 'Connecticut', bbox: [40.9, -73.8, 42.1, -71.7],
    waterfalls: [
      wf('Kent Falls', 'in Kent Falls State Park, Connecticut', 'Kent Falls, a waterfall cascading over rock ledges in Kent Falls State Park, Connecticut.', 41.7778, -73.4211, ['incategory:"Kent Falls State Park"', '"Kent Falls" Connecticut'], /kent falls|connecticut/i, /california|marin|new york/i, null, 100, 18),
      wf('Chapman Falls', 'at Devil\'s Hopyard State Park, Connecticut', 'Chapman Falls, a waterfall at Devil\'s Hopyard State Park in East Haddam, Connecticut.', 41.4834, -72.3406, ['"Chapman Falls" Connecticut', 'incategory:"Chapman Falls"'], /chapman/i, null, 'Chapman Falls', 50),
    ] },
  { slug: 'district-of-columbia', name: 'District of Columbia', bbox: Object.assign([38.79, -77.15, 39.0, -76.9], M(0.03)),
    waterfalls: [wf('Little Falls', 'on the Potomac River, where Washington, D.C. meets Maryland', 'Little Falls, a cascade on the Potomac River where Washington, D.C. meets Maryland.', 38.933, -77.118, ['"Little Falls" Potomac', 'incategory:"Little Falls (Potomac River)"'], /little falls/i, /great falls|minnesota|wisconsin|new york/i, 'Little Falls', 100, 4)],
    landscapes: [land('District of Columbia', 'incategory:"Landscapes of Washington, D.C." filetype:bitmap filew:>1500', /washington|district of columbia|potomac|tidal basin|rock creek/i)] },
  { slug: 'florida', name: 'Florida', bbox: [24.4, -87.7, 31.1, -80.0],
    waterfalls: [
      wf('Falling Creek Falls', 'in Columbia County, Florida', 'Falling Creek Falls, a waterfall on Falling Creek in Columbia County, Florida.', 30.26, -82.668, ['"Falling Creek Falls" Florida', '"Falling Creek" waterfall Florida'], /falling creek/i, /georgia|tennessee/i, 'Falling Creek Falls', 100, 25),
      wf('Falling Waters', 'at Falling Waters State Park near Chipley, Florida', 'Falling Waters, a waterfall sinking into a sinkhole at Falling Waters State Park near Chipley, Florida.', 30.7244, -85.5297, ['"Falling Waters" Chipley', 'incategory:"Falling Waters State Park"'], /falling water/i, /tennessee|arkansas/i, 'Falling Water', 70, 15),
    ] },
  { slug: 'georgia', name: 'Georgia', bbox: [30.3, -85.7, 35.1, -80.7],
    waterfalls: [
      wf('Amicalola Falls', 'in Amicalola Falls State Park, Georgia', 'Amicalola Falls, a tall waterfall tumbling down a forested slope in Amicalola Falls State Park, Georgia.', 34.564, -84.2396, ['incategory:"Amicalola Falls"', '"Amicalola Falls"'], /amicalola/i, null, 'Amicalola Falls', 100),
      wf('Anna Ruby Falls', 'near Helen, Georgia', 'Anna Ruby Falls, a waterfall in the Chattahoochee National Forest near Helen, Georgia.', 34.7634, -83.7121, ['incategory:"Anna Ruby Falls"', '"Anna Ruby Falls"'], /anna ruby/i, null, 'Anna Ruby Falls', 60),
    ] },
  { slug: 'hawaii', name: 'Hawaii', bbox: [18.8, -160.4, 22.3, -154.7],
    waterfalls: [wf('Rainbow Falls', 'on the Wailuku River in Hilo, Hawaii', 'Rainbow Falls, a waterfall on the Wailuku River in Hilo on the island of Hawaii.', 19.7196, -155.1098, ['incategory:"Rainbow Falls (Hawaii)"', '"Rainbow Falls" Hilo'], /hilo|wailuku/i, /california|michigan|oregon|tennessee|washington|wyoming|carolina|montana|colorado|kauai|maui/i, 'Rainbow Falls', 100, 20)] },
  { slug: 'idaho', name: 'Idaho', bbox: [41.9, -117.3, 49.1, -111.0],
    waterfalls: [wf('Shoshone Falls', 'on the Snake River near Twin Falls, Idaho', 'Shoshone Falls, a wide waterfall on the Snake River near Twin Falls, Idaho.', 42.5952, -114.4009, ['incategory:"Shoshone Falls"', '"Shoshone Falls"'], /shoshone/i, null, 'Shoshone Falls')] },
  { slug: 'illinois', name: 'Illinois', bbox: [36.9, -91.6, 42.6, -87.4],
    waterfalls: [wf('Burden Falls', 'in the Shawnee National Forest, Illinois', 'Burden Falls, a waterfall in the Shawnee National Forest in southern Illinois.', 37.5637, -88.642, ['"Burden Falls" Illinois', 'incategory:"Burden Falls"'], /burden/i, null, 'Burden Falls', 100, 30)] },
  { slug: 'indiana', name: 'Indiana', bbox: [37.7, -88.1, 41.8, -84.7],
    waterfalls: [wf('Cataract Falls', 'on Mill Creek in Owen County, Indiana', 'Cataract Falls, a waterfall on Mill Creek in Owen County, Indiana.', 39.434, -86.813, ['incategory:"Cataract Falls (Indiana)"', '"Cataract Falls" Indiana'], /indiana|owen county/i, /california|marin/i, 'Upper Cataract Falls')] },
  { slug: 'iowa', name: 'Iowa', bbox: [40.3, -96.7, 43.6, -90.1],
    waterfalls: [
      wf('Dunnings Spring Falls', 'in Decorah, Iowa', 'Dunnings Spring Falls, a waterfall in a limestone hollow at Dunnings Spring Park in Decorah, Iowa.', 43.3048, -91.7856, ['"Dunnings Spring" Decorah', '"Dunning\'s Spring" Iowa'], /dunning/i, null, null, 100, 12),
      wf('Black Falls', 'in Winneshiek County, Iowa', 'Black Falls, a waterfall in Winneshiek County, Iowa.', 43.4177, -92.0129, ['"Black Falls" Iowa', '"Black Falls" Winneshiek'], /black falls/i, /arizona|georgia/i, 'Black Falls', 50, 20),
    ],
    landscapes: [land('Iowa', 'incategory:"Landscapes of Iowa" filetype:bitmap filew:>1500', /iowa/i)] },
  { slug: 'kansas', name: 'Kansas', bbox: [36.9, -102.1, 40.1, -94.5],
    waterfalls: [wf('Butcher Falls', 'in Chautauqua County, Kansas', 'Butcher Falls, a waterfall in Chautauqua County, Kansas.', 37.1473, -96.2681, ['"Butcher Falls" Kansas', 'incategory:"Butcher Falls"'], /butcher/i, null, 'Butcher Falls', 100, 30)],
    landscapes: [land('Kansas', 'incategory:"Landscapes of Kansas" filetype:bitmap filew:>1500', /kansas/i)] },
  { slug: 'kentucky', name: 'Kentucky', bbox: [36.5, -89.6, 39.2, -81.9],
    waterfalls: [wf('Cumberland Falls', 'on the Cumberland River in Cumberland Falls State Resort Park, Kentucky', 'Cumberland Falls, a wide waterfall on the Cumberland River in Kentucky.', 36.8388, -84.345, ['incategory:"Cumberland Falls"', '"Cumberland Falls" Kentucky'], /cumberland falls/i, null, 'Cumberland Falls')] },
  { slug: 'louisiana', name: 'Louisiana', bbox: [28.9, -94.1, 33.1, -88.8],
    waterfalls: [wf('Kisatchie Falls', 'in Kisatchie National Forest, Louisiana', 'Kisatchie Falls, a waterfall in Kisatchie National Forest, Louisiana.', 31.4077, -93.131, ['"Kisatchie" waterfall Louisiana', 'incategory:"Kisatchie Falls"'], /kisatchie/i, null, 'Kisatchie Fall', 100, 25)],
    landscapes: [land('Louisiana', 'incategory:"Landscapes of Louisiana" filetype:bitmap filew:>1500', /louisiana/i)] },
  { slug: 'maine', name: 'Maine', bbox: [42.9, -71.1, 47.5, -66.8],
    waterfalls: [
      wf('Screw Auger Falls', 'in Grafton Notch State Park, Maine', 'Screw Auger Falls, a waterfall cutting through granite in Grafton Notch State Park, Maine.', 44.572, -70.9101, ['"Screw Auger Falls" Grafton', 'incategory:"Screw Auger Falls (Maine)"'], /grafton|bethel|oxford county|maine/i, null, 'Screw Auger Falls', 100, 15),
      wf('Smalls Falls', 'on the Sandy River in Franklin County, Maine', 'Smalls Falls, a waterfall on the Sandy River in western Maine.', 44.8589, -70.5167, ['incategory:"Smalls Falls"', '"Smalls Falls" Maine'], /smalls falls/i, null, 'Smalls Falls', 55),
    ] },
  { slug: 'maryland', name: 'Maryland', bbox: [37.9, -79.5, 39.8, -75.0],
    waterfalls: [
      wf('Muddy Creek Falls', 'in Swallow Falls State Park, Maryland', 'Muddy Creek Falls, a waterfall in Swallow Falls State Park in Garrett County, Maryland.', 39.5012, -79.4178, ['"Muddy Creek Falls" Maryland', 'incategory:"Muddy Creek Falls"'], /muddy creek/i, null, 'Muddy Creek Falls', 100),
      wf('Cunningham Falls', 'in Cunningham Falls State Park, Maryland', 'Cunningham Falls, a waterfall in Cunningham Falls State Park near Thurmont, Maryland.', 39.6315, -77.4714, ['"Cunningham Falls" Maryland', 'incategory:"Cunningham Falls State Park"'], /cunningham/i, null, 'Cunningham Falls', 60),
    ] },
  { slug: 'massachusetts', name: 'Massachusetts', bbox: [41.2, -73.6, 42.9, -69.9],
    waterfalls: [wf('Bash Bish Falls', 'in the Berkshire Hills of southwestern Massachusetts', 'Bash Bish Falls, a waterfall in the Berkshire Hills of southwestern Massachusetts.', 42.1148, -73.4929, ['incategory:"Bash Bish Falls"', '"Bash Bish Falls"'], /bash bish/i, null, 'Bash Bish Falls')] },
  { slug: 'michigan', name: 'Michigan', bbox: [41.6, -90.5, 48.3, -82.3],
    waterfalls: [wf('Tahquamenon Falls', 'in Tahquamenon Falls State Park, Michigan', 'Tahquamenon Falls, the Upper Falls of the Tahquamenon River in Michigan\'s Upper Peninsula.', 46.575, -85.2573, ['incategory:"Tahquamenon Falls"', '"Tahquamenon" "Upper Falls"'], /tahquamenon/i, null, 'Upper Falls')] },
  { slug: 'minnesota', name: 'Minnesota', bbox: [43.4, -97.3, 49.4, -89.4],
    waterfalls: [wf('Minnehaha Falls', 'on Minnehaha Creek in Minneapolis, Minnesota', 'Minnehaha Falls, a waterfall on Minnehaha Creek in Minneapolis, Minnesota.', 44.9147, -93.2099, ['incategory:"Minnehaha Falls"', '"Minnehaha Falls" Minneapolis'], /minnehaha/i, /arizona|ohio|carolina/i, 'Minnehaha Falls', 100, 15)] },
  { slug: 'mississippi', name: 'Mississippi', bbox: [30.1, -91.7, 35.1, -88.1],
    waterfalls: [wf('Dunns Falls', 'in Lauderdale County, Mississippi', 'Dunns Falls, a waterfall on the Chunky River in Lauderdale County, Mississippi.', 32.2288, -88.8214, ['"Dunns Falls" Mississippi', '"Dunn\'s Falls" Mississippi'], /dunn/i, null, 'Dunns Falls', 100, 25)],
    landscapes: [land('Mississippi', 'incategory:"Landscapes of Mississippi (state)" filetype:bitmap filew:>1500', /mississippi/i)] },
  { slug: 'missouri', name: 'Missouri', bbox: [35.9, -95.8, 40.7, -89.1],
    waterfalls: [
      wf('Mina Sauk Falls', 'on Taum Sauk Mountain, Missouri', 'Mina Sauk Falls, a waterfall on Taum Sauk Mountain in the St. Francois Mountains of Missouri.', 37.5625, -90.7412, ['incategory:"Mina Sauk Falls"', '"Mina Sauk Falls"'], /mina sauk/i, null, 'Mina Sauk Falls', 100),
      wf('Rocky Falls', 'in the Ozark National Scenic Riverways, Missouri', 'Rocky Falls, a waterfall over a rock shelf in Shannon County, Missouri.', 37.0934, -91.2096, ['"Rocky Falls" Missouri', 'incategory:"Rocky Falls"'], /rocky falls/i, /mississippi|new york/i, 'Rocky Falls', 60),
    ] },
  { slug: 'montana', name: 'Montana', bbox: [44.3, -116.1, 49.1, -104.0],
    waterfalls: [wf('Kootenai Falls', 'on the Kootenai River in northwest Montana', 'Kootenai Falls, a waterfall on the Kootenai River in Lincoln County, Montana.', 48.4555, -115.7632, ['incategory:"Kootenai Falls"', '"Kootenai Falls" Montana'], /kootenai/i, null, 'Kootenai Falls')] },
  { slug: 'nebraska', name: 'Nebraska', bbox: [39.9, -104.1, 43.1, -95.3],
    waterfalls: [wf('Smith Falls', 'in Smith Falls State Park, Nebraska', 'Smith Falls, a waterfall on a spring-fed creek in Smith Falls State Park, Nebraska.', 42.8878, -100.3158, ['incategory:"Smith Falls"', '"Smith Falls" Nebraska'], /smith falls/i, /idaho|oregon/i, 'Smith Falls', 100, 20)] },
  { slug: 'nevada', name: 'Nevada', bbox: [35.0, -120.1, 42.1, -114.0],
    waterfalls: [wf('Mary Jane Falls', 'in the Spring Mountains west of Las Vegas, Nevada', 'Mary Jane Falls, a waterfall in the Spring Mountains west of Las Vegas, Nevada.', 36.2795, -115.6712, ['"Mary Jane Falls" Nevada', 'incategory:"Mary Jane Falls"'], /mary jane/i, null, 'Mary Jane Falls', 100, 15)],
    landscapes: [land('Nevada', 'incategory:"Landscapes of Nevada" filetype:bitmap filew:>1500', /nevada/i)] },
  { slug: 'new-hampshire', name: 'New Hampshire', bbox: [42.6, -72.6, 45.4, -70.5],
    waterfalls: [
      wf('Sabbaday Falls', 'in the White Mountain National Forest, New Hampshire', 'Sabbaday Falls, a waterfall in a rocky gorge in the White Mountain National Forest, New Hampshire.', 43.9948, -71.3965, ['incategory:"Sabbaday Falls"', '"Sabbaday Falls"'], /sabbaday/i, null, 'Sabbaday Falls', 100),
      wf('Arethusa Falls', 'in Crawford Notch State Park, New Hampshire', 'Arethusa Falls, a tall waterfall in Crawford Notch State Park, New Hampshire.', 44.1476, -71.3854, ['incategory:"Arethusa Falls"', '"Arethusa Falls"'], /arethusa/i, null, 'Arethusa Falls', 60),
    ] },
  { slug: 'new-jersey', name: 'New Jersey', bbox: [38.9, -75.6, 41.4, -73.9],
    waterfalls: [wf('Great Falls of the Passaic River', 'in Paterson, New Jersey', 'Great Falls of the Passaic River, a waterfall in Paterson, New Jersey.', 40.9166, -74.1817, ['incategory:"Great Falls (Passaic River)"', '"Great Falls" Paterson Passaic'], /passaic|paterson/i, /potomac|virginia|maryland/i, 'Great Falls', 100, 8)] },
  { slug: 'new-mexico', name: 'New Mexico', bbox: [31.3, -109.1, 37.1, -103.0],
    waterfalls: [wf('Sitting Bull Falls', 'in the Lincoln National Forest, New Mexico', 'Sitting Bull Falls, a waterfall over a desert cliff in the Lincoln National Forest, New Mexico.', 32.2433, -104.6974, ['incategory:"Sitting Bull Falls"', '"Sitting Bull Falls"'], /sitting bull/i, null, 'Sitting Bull Falls')] },
  { slug: 'new-york', name: 'New York', bbox: [40.4, -79.8, 45.1, -71.8],
    waterfalls: [
      wf('American Falls', 'at Niagara Falls, New York', 'American Falls, the waterfall on the United States side of Niagara Falls, New York.', 43.0853, -79.0689, ['incategory:"American Falls"', '"American Falls" Niagara'], /american falls|niagara/i, /minnesota|koochiching/i, 'American Falls', 100, 8),
      wf('Kaaterskill Falls', 'in the Catskill Mountains, New York', 'Kaaterskill Falls, a two-tier waterfall in the Catskill Mountains of New York.', 42.1934, -74.0632, ['incategory:"Kaaterskill Falls"', '"Kaaterskill Falls"'], /kaaterskill/i, null, 'Kaaterskill Falls', 55),
    ] },
  { slug: 'north-carolina', name: 'North Carolina', bbox: [33.8, -84.4, 36.6, -75.4],
    waterfalls: [
      wf('Looking Glass Falls', 'in Pisgah National Forest, North Carolina', 'Looking Glass Falls, a waterfall sliding down a broad rock face in Pisgah National Forest, North Carolina.', 35.2965, -82.7679, ['incategory:"Looking Glass Falls"', '"Looking Glass Falls" North Carolina'], /looking glass/i, null, 'Looking Glass Falls', 100),
      wf('Dry Falls', 'in Nantahala National Forest, North Carolina', 'Dry Falls, a waterfall you can walk behind in the Nantahala National Forest, North Carolina.', 35.0685, -83.239, ['"Dry Falls" Highlands North Carolina', 'incategory:"Dry Falls (North Carolina)"'], /dry falls/i, /washington|grant county/i, 'Dry Falls', 55, 20),
    ] },
  { slug: 'north-dakota', name: 'North Dakota', bbox: [45.9, -104.1, 49.1, -96.5],
    waterfalls: [wf('Mineral Springs Falls', 'near Lisbon, North Dakota', 'Mineral Springs Falls, a small waterfall near Lisbon, North Dakota.', 46.5034, -97.9012, ['"Mineral Springs" waterfall Lisbon North Dakota', '"Mineral Springs Falls" North Dakota'], /mineral spring/i, null, 'Mineral Springs Falls', 100, 20)],
    landscapes: [land('North Dakota', 'incategory:"Landscapes of North Dakota" filetype:bitmap filew:>1500', /north dakota|badlands|theodore roosevelt/i)] },
  { slug: 'ohio', name: 'Ohio', bbox: [38.4, -84.9, 42.0, -80.5],
    waterfalls: [wf('Brandywine Falls', 'in Cuyahoga Valley National Park, Ohio', 'Brandywine Falls, a waterfall over layered rock in Cuyahoga Valley National Park, Ohio.', 41.277, -81.5382, ['incategory:"Brandywine Falls (Ohio)"', '"Brandywine Falls" Cuyahoga'], /brandywine/i, /pennsylvania|british columbia/i, 'Brandywine Falls', 100, 15)] },
  { slug: 'oklahoma', name: 'Oklahoma', bbox: [33.6, -103.1, 37.1, -94.4],
    waterfalls: [wf('Turner Falls', 'in the Arbuckle Mountains of Oklahoma', 'Turner Falls, a waterfall over a travertine cliff in the Arbuckle Mountains of Oklahoma.', 34.4254, -97.1486, ['incategory:"Turner Falls"', '"Turner Falls" Oklahoma'], /turner falls/i, /montana/i, 'Turner Falls')] },
  { slug: 'oregon', name: 'Oregon', bbox: [41.9, -124.6, 46.3, -116.4],
    waterfalls: [wf('Multnomah Falls', 'in the Columbia River Gorge, Oregon', 'Multnomah Falls, a tall waterfall on a basalt cliff in the Columbia River Gorge, Oregon.', 45.5761, -122.1154, ['incategory:"Multnomah Falls"', '"Multnomah Falls" Oregon'], /multnomah/i, /okanogan/i, 'Multnomah Falls')] },
  { slug: 'pennsylvania', name: 'Pennsylvania', bbox: [39.7, -80.6, 42.3, -74.7],
    waterfalls: [
      wf('Dingmans Falls', 'in the Delaware Water Gap, Pennsylvania', 'Dingmans Falls, a waterfall in the Delaware Water Gap National Recreation Area, Pennsylvania.', 41.2306, -74.8918, ['incategory:"Dingmans Falls"', '"Dingmans Falls"'], /dingman/i, null, 'Dingmans Falls', 100),
      wf('Bushkill Falls', 'in the Pocono Mountains of Pennsylvania', 'Bushkill Falls, a waterfall in the Pocono Mountains of Pennsylvania.', 41.1165, -75.0121, ['incategory:"Bushkill Falls"', '"Bushkill Falls" Pennsylvania'], /bushkill/i, null, 'Bushkill Falls', 40),
    ] },
  { slug: 'rhode-island', name: 'Rhode Island', bbox: [41.1, -71.9, 42.1, -71.1],
    waterfalls: [wf('Stepstone Falls', 'in Arcadia Management Area, Rhode Island', 'Stepstone Falls, a waterfall on the Wood River in Arcadia Management Area, Rhode Island.', 41.6118, -71.7603, ['"Stepstone Falls" Rhode Island', 'incategory:"Stepstone Falls"'], /stepstone/i, null, 'Stepstone Falls', 100, 20)],
    landscapes: [land('Rhode Island', 'incategory:"Landscapes of Rhode Island" filetype:bitmap filew:>1500', /rhode island/i)] },
  { slug: 'south-carolina', name: 'South Carolina', bbox: [32.0, -83.4, 35.2, -78.5],
    waterfalls: [wf('Isaqueena Falls', 'at Stumphouse Tunnel Park in Oconee County, South Carolina', 'Isaqueena Falls, a waterfall at Stumphouse Tunnel Park in Oconee County, South Carolina.', 34.8062, -83.121, ['"Isaqueena Falls"', '"Issaqueena Falls"'], /isaqueena|issaqueena/i, null, 'Isaqueena Falls', 100, 25)] },
  { slug: 'south-dakota', name: 'South Dakota', bbox: [42.4, -104.1, 46.0, -96.4],
    waterfalls: [wf('Spearfish Falls', 'in Spearfish Canyon, South Dakota', 'Spearfish Falls, a waterfall in Spearfish Canyon in the Black Hills of South Dakota.', 44.3528, -103.9297, ['incategory:"Spearfish Falls"', '"Spearfish Falls"'], /spearfish falls/i, null, 'Spearfish Falls')] },
  { slug: 'tennessee', name: 'Tennessee', bbox: [34.9, -90.4, 36.7, -81.6],
    waterfalls: [
      wf('Fall Creek Falls', 'in Fall Creek Falls State Park, Tennessee', 'Fall Creek Falls, a tall waterfall in Fall Creek Falls State Park, Tennessee.', 35.6659, -85.3558, ['incategory:"Fall Creek Falls"', '"Fall Creek Falls" Tennessee'], /fall creek falls/i, /idaho|oregon/i, 'Fall Creek Falls', 100, 25),
      wf('Ruby Falls', 'inside Lookout Mountain in Chattanooga, Tennessee', 'Ruby Falls, an underground waterfall inside Lookout Mountain in Chattanooga, Tennessee.', 35.0192, -85.3397, ['incategory:"Ruby Falls"', '"Ruby Falls" Chattanooga'], /ruby falls/i, /georgia/i, 'Ruby Falls', 40),
    ] },
  { slug: 'texas', name: 'Texas', bbox: [25.8, -106.7, 36.6, -93.5],
    waterfalls: [
      wf('Gorman Falls', 'at Colorado Bend State Park, Texas', 'Gorman Falls, a waterfall over travertine at Colorado Bend State Park, Texas.', 31.0582, -98.4823, ['incategory:"Gorman Falls"', '"Gorman Falls" Texas'], /gorman/i, null, 'Gorman Falls', 100),
      wf('Pedernales Falls', 'in Pedernales Falls State Park, Texas', 'Pedernales Falls, a limestone cascade on the Pedernales River in Texas.', 30.3396, -98.2547, ['incategory:"Pedernales Falls"', '"Pedernales Falls"'], /pedernales/i, null, 'Pedernales Falls', 55),
    ] },
  { slug: 'utah', name: 'Utah', bbox: [36.9, -114.1, 42.1, -109.0],
    waterfalls: [wf('Bridal Veil Falls', 'in Provo Canyon, Utah', 'Bridal Veil Falls, a waterfall on a cliff in Provo Canyon, Utah.', 40.3379, -111.6007, ['incategory:"Bridal Veil Falls (Utah)"', '"Bridal Veil Falls" Provo'], /provo|utah/i, /telluride|oregon|niagara|colorado|washington|yosemite|alaska/i, 'Bridal Veil Falls', 100, 15)] },
  { slug: 'vermont', name: 'Vermont', bbox: [42.7, -73.5, 45.1, -71.4],
    waterfalls: [
      wf('Moss Glen Falls', 'near Stowe, Vermont', 'Moss Glen Falls, a waterfall in a wooded gorge near Stowe, Vermont.', 44.4822, -72.6241, ['"Moss Glen Falls" Stowe', 'incategory:"Moss Glen Falls (Stowe, Vermont)"'], /stowe|morristown|lamoille/i, /granville/i, 'Moss Glen Falls', 80, 12),
      wf('Moss Glen Falls', 'in Granville, Vermont', 'Moss Glen Falls, a waterfall plunging down a roadside cliff in Granville, Vermont.', 44.0181, -72.8504, ['"Moss Glen Falls" Granville', 'incategory:"Moss Glen Falls (Granville, Vermont)"'], /granville/i, /stowe/i, 'Moss Glen Falls', 80, 12),
      wf('Texas Falls', 'in Green Mountain National Forest, Vermont', 'Texas Falls, a waterfall in a rocky gorge in the Green Mountain National Forest, Vermont.', 43.9348, -72.9004, ['incategory:"Texas Falls"', '"Texas Falls" Vermont'], /texas falls/i, /state of texas/i, 'Texas Falls', 50),
    ] },
  { slug: 'virginia', name: 'Virginia', bbox: [36.5, -83.7, 39.5, -75.2],
    waterfalls: [wf('Crabtree Falls', 'in the Blue Ridge Mountains of Nelson County, Virginia', 'Crabtree Falls, a series of cascades in the Blue Ridge Mountains of Nelson County, Virginia.', 37.8432, -79.0745, ['"Crabtree Falls" Virginia', 'incategory:"Crabtree Falls (Virginia)"'], /crabtree/i, /north carolina|mitchell county/i, 'Crabtree Falls', 100, 15)] },
  { slug: 'washington', name: 'Washington', bbox: [45.5, -124.8, 49.1, -116.9],
    waterfalls: [wf('Snoqualmie Falls', 'on the Snoqualmie River in Washington', 'Snoqualmie Falls, a wide waterfall on the Snoqualmie River east of Seattle, Washington.', 47.5418, -121.8379, ['incategory:"Snoqualmie Falls"', '"Snoqualmie Falls"'], /snoqualmie/i, null, 'Snoqualmie Falls')] },
  { slug: 'west-virginia', name: 'West Virginia', bbox: [37.1, -82.7, 40.7, -77.7],
    waterfalls: [wf('Blackwater Falls', 'in Blackwater Falls State Park, West Virginia', 'Blackwater Falls, an amber waterfall in Blackwater Falls State Park, West Virginia.', 39.1138, -79.4832, ['incategory:"Blackwater Falls"', '"Blackwater Falls"'], /blackwater/i, null, 'Blackwater Falls')] },
  { slug: 'wisconsin', name: 'Wisconsin', bbox: [42.4, -92.9, 47.1, -86.2],
    waterfalls: [wf('Big Manitou Falls', 'in Pattison State Park near Superior, Wisconsin', 'Big Manitou Falls, a tall waterfall in Pattison State Park near Superior, Wisconsin.', 46.5361, -92.1213, ['incategory:"Big Manitou Falls"', '"Big Manitou Falls" Wisconsin'], /manitou/i, /minnesota/i, 'Big Manitou Falls', 100, 20)] },
  { slug: 'wyoming', name: 'Wyoming', bbox: [40.9, -111.1, 45.1, -104.0],
    waterfalls: [wf('Lower Falls of the Yellowstone River', 'in the Grand Canyon of the Yellowstone, Wyoming', 'Lower Falls of the Yellowstone River, a waterfall in the Grand Canyon of the Yellowstone, Wyoming.', 44.718, -110.4964, ['incategory:"Lower Falls of the Yellowstone River"', '"Lower Falls" Yellowstone'], /yellowstone/i, /niagara|yosemite/i, 'Lower Falls of the Yellowstone River', 100, 15)] },
];

function wf(falls, placePhrase, alt, lat, lng, queries, mustMatch, rejectText = null, listingName = null, priority = 100, maxMiles = 20) {
  return {
    kind: 'waterfall',
    falls,
    placePhrase,
    alt,
    lat,
    lng,
    maxMiles,
    priority,
    listingName: listingName === null ? falls : listingName,
    mustMatch,
    rejectText,
    titleMust: new RegExp(falls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    queries: [
      { q: `intitle:"${falls}" filetype:bitmap filew:>1200`, trust: false },
      ...queries.map((q, i) => ({ q: `${q} filetype:bitmap filew:>1200`, trust: i === 0 && q.includes('incategory:') })),
    ],
  };
}

function land(stateName, q, mustMatch) {
  return {
    kind: 'landscape',
    falls: null,
    placePhrase: null,
    alt: `A landscape in ${stateName}.`,
    caption: null,
    priority: 10,
    lat: null,
    lng: null,
    mustMatch,
    rejectText: /\b(capitol|skyline|downtown|state house|portrait|wedding)\b/i,
    queries: [{ q, trust: true }],
  };
}

async function sheet(rows) {
  const cols = 5;
  const tw = 360;
  const th = 189;
  const label = 44;
  const n = rows.length;
  const rowsN = Math.ceil(n / cols);
  const composites = [];
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const left = (i % cols) * tw;
    const top = Math.floor(i / cols) * (th + label);
    const img = await sharp(path.join(IMG_DIR, `${r.slug}-640.webp`)).resize(tw, th).jpeg({ quality: 70 }).toBuffer();
    const line1 = `${r.slug} · ${r.kind === 'landscape' ? 'LANDSCAPE' : r.falls}`.slice(0, 42);
    const line2 = `${r.license}`.slice(0, 42);
    const svg = `<svg width="${tw}" height="${label}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1c1f22"/><text x="6" y="18" fill="#fff" font-size="13" font-family="DejaVu Sans, sans-serif">${escapeXml(line1)}</text><text x="6" y="36" fill="#c5ccc8" font-size="12" font-family="DejaVu Sans, sans-serif">${escapeXml(line2)}</text></svg>`;
    composites.push({ input: img, left, top }, { input: Buffer.from(svg), left, top: top + th });
  }
  const out = path.join('/tmp', 'state-hero-sheet.jpg');
  await sharp({ create: { width: cols * tw, height: rowsN * (th + label), channels: 3, background: '#111' } })
    .composite(composites)
    .jpeg({ quality: 76 })
    .toFile(out);
  return out;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const bySlug = (slug) => STATES.find((s) => s.slug === slug);
bySlug('new-jersey').waterfalls[0].titleMust = /passaic falls|great falls/i;
bySlug('wyoming').waterfalls[0].titleMust = /yellowstone/i;
bySlug('wyoming').waterfalls[0].queries.unshift({ q: 'intitle:"Lower Falls" Yellowstone filetype:bitmap filew:>1200', trust: false });
bySlug('iowa').waterfalls[0].titleMust = /dunning/i;
bySlug('mississippi').waterfalls[0].titleMust = /dunn'?s falls/i;
bySlug('north-dakota').waterfalls[0].mustMatch = /north dakota|lisbon/i;
bySlug('north-dakota').waterfalls[0].rejectText = /new york|black rock|\bNY\b/i;
bySlug('iowa').waterfalls[0].queries.unshift({ q: 'intitle:"Dunning Falls" Decorah filetype:bitmap filew:>1200', trust: false });
bySlug('kentucky').waterfalls[0].titleMust = /cumberland fal/i;
bySlug('district-of-columbia').waterfalls[0].mustMatch = /potomac|chain bridge|district of columbia/i;
bySlug('rhode-island').landscapes[0].queries.push(
  { q: 'incategory:"Beaches of Rhode Island" filetype:bitmap filew:>1500', trust: true },
  { q: '"Narragansett" Rhode Island beach filetype:bitmap filew:>1500', trust: true },
);
bySlug('north-dakota').landscapes[0].queries.push(
  { q: 'incategory:"Theodore Roosevelt National Park" filetype:bitmap filew:>1600 fileh:>900', trust: true },
);

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  const targets = STATES.filter((s) => !only.length || only.includes(s.slug));
  const unknown = only.filter((s) => !STATES.some((t) => t.slug === s));
  if (unknown.length) throw new Error(`Unknown slugs: ${unknown.join(', ')}`);
  let existing = {};
  if (only.length) {
    try { existing = JSON.parse(await readFile(JSON_PATH, 'utf8')); } catch { existing = {}; }
  }
  const report = [];
  for (const state of targets) {
    process.stdout.write(`\n${state.slug} `);
    const water = await rankedFor(state, state.waterfalls);
    let pool = water.good;
    let usedLandscape = false;
    if (!pool.length && state.landscapes) {
      const lands = await rankedFor(state, state.landscapes);
      pool = lands.good;
      usedLandscape = true;
      water.rejected.push(...lands.rejected.slice(0, 6));
    }
    let saved = null;
    let pick = null;
    for (const candidate of pool.slice(0, 6)) {
      try {
        const buf = await download(candidate.downloadUrl);
        const variants = await renderVariants(state.slug, buf);
        if (!variants) {
          process.stdout.write('crop-skip ');
          continue;
        }
        saved = variants;
        pick = candidate;
        break;
      } catch (err) {
        process.stdout.write(`dl-fail:${err.message} `);
      }
    }
    if (!saved) {
      report.push(`FAIL ${state.slug}\n  ${water.rejected.slice(0, 8).join('\n  ')}`);
      process.stdout.write('FAIL');
      continue;
    }
    const rec = recordOf(state, pick, saved);
    if (usedLandscape) rec.kind = 'landscape';
    existing[state.slug] = rec;
    const kb = saved.map((v) => `${v.w}:${Math.round(v.bytes / 1024)}kb`).join(' ');
    const where = pick.gpsMiles == null ? 'no-gps' : `${pick.gpsMiles.toFixed(1)}mi`;
    process.stdout.write(`${rec.kind === 'landscape' ? 'landscape' : rec.falls} ${where} ${kb}`);
    report.push(`${state.slug}\t${rec.kind}\t${rec.falls || ''}\t${rec.license}\t${where}\t${pick.title}\t${rec.href || ''}`);
  }
  const ordered = {};
  for (const state of STATES) if (existing[state.slug]) ordered[state.slug] = existing[state.slug];
  await writeFile(JSON_PATH, `${JSON.stringify(ordered, null, 2)}\n`);
  await writeFile('/tmp/state-hero-report.txt', `${report.join('\n')}\n`);
  const rows = STATES.map((s) => ordered[s.slug]).filter(Boolean);
  if (rows.length >= 5 && rows.every((r) => r.variants?.includes(640))) {
    const file = await sheet(rows);
    console.log(`\nSheet ${file}`);
  }
  const fails = report.filter((l) => l.startsWith('FAIL')).length;
  console.log(`\nWrote ${Object.keys(ordered).length} heroes, ${fails} failures`);
  if (fails) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
