// Download a few Wikimedia Commons fall-color photos per foliage page.
// Keeps CC BY, CC BY-SA, CC0, and public-domain files. Rejects NC and ND.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { states } from '../src/content/foliage/index.mjs';

const UA = 'WaterfallsNearYou/1.0 (foliage photos; https://www.waterfallsnearyou.com/)';
const ROOT = process.cwd();
const OK = /public domain|cc0|cc by$|cc by |cc by-sa/i;

function strip(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function search(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '1600',
    format: 'json',
    origin: '*',
  });
  const data = await getJson(url);
  return Object.values(data.query?.pages || {});
}

const FOLIAGE = /fall foliage|autumn foliage|fall colo[u]?r|autumn colo[u]?r|aspen|changing leaves|autumn leaves|fall leaves|in autumn|autumn in|foliage/i;
const REJECT = /wildflower|bloom|bison|caribou|reindeer|satellite|modis|\bCIRA\b|Planet Labs|pumpkin|funeral|pokeberr|sculpture|chimney|mazda|ice formation|\bsnow\b|duck|mallard|funeral|fossil bald|Winter Garden|Eastern Sierra|Imereti|Alabama Hills|Indiana County|Idaho Street|catalogue|catalog\b/i;

function usable(page, { force = false } = {}) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  if (!/image\/(jpeg|png|webp)/.test(info.mime || '')) return null;
  const width = info.thumbwidth || info.width || 0;
  const height = info.thumbheight || info.height || 0;
  if (width < 1000 || height < 1) return null;
  const meta = info.extmetadata || {};
  const license = strip(meta.LicenseShortName?.value || '');
  if (!OK.test(license) || /\bnc\b|\bnd\b|noncommercial|noderiv/i.test(license)) return null;
  const title = page.title.replace(/^File:/, '');
  const desc = strip(meta.ImageDescription?.value || '');
  const artist = strip(meta.Artist?.value || '') || 'Wikimedia Commons contributor';
  const blob = `${title} ${desc}`;
  if (REJECT.test(blob) || /logo|icon|diagram|coat of arms|flag of/i.test(blob)) return null;
  if (!force && !FOLIAGE.test(blob)) return null;
  const caption = (desc || title).replace(/\s+/g, ' ').slice(0, 280);
  return {
    title: page.title,
    thumb: info.thumburl || info.url,
    width,
    height,
    license,
    licenseUrl: meta.LicenseUrl?.value || '',
    artist: artist.slice(0, 180),
    caption,
    sourceUrl: info.descriptionurl,
    series: title.toLowerCase().replace(/\d+/g, '#').replace(/[^a-z# ]/g, '').slice(0, 42),
  };
}

function mentionsPlace(item, hint) {
  if (!hint) return true;
  const blob = `${item.title} ${item.caption}`;
  if (hint === 'Alabama') return /\bAlabama\b/.test(blob) && !/Alabama Hills/i.test(blob);
  if (hint === 'Delaware') return /\bDelaware\b/.test(blob) && !/Delaware Water Gap|Delaware River/i.test(blob);
  if (hint === 'Georgia') return /\bGeorgia\b/.test(blob) && !/Imereti|Tbilisi|country of Georgia/i.test(blob);
  if (hint === 'Indiana') return /\bIndiana\b/.test(blob) && !/Indiana County/i.test(blob);
  if (hint === 'Idaho') return /\bIdaho\b/.test(blob) && !/Idaho Street|Elko, Nevada/i.test(blob);
  if (hint === 'Mississippi') return /\bMississippi\b/.test(blob) && !/Mississippi River/i.test(blob);
  if (hint === 'Washington') return /\bWashington\b/.test(blob) && !/Washington, D\.C|District of Columbia/i.test(blob);
  const re = new RegExp(`\\b${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return re.test(blob);
}

async function pick(queries, placeHint, count) {
  const chosen = [];
  const seen = new Set();
  const series = new Set();
  const artists = new Map();
  for (const query of queries) {
    let pages = [];
    try {
      pages = await search(query);
    } catch (err) {
      console.error('search failed', query, err.message);
      continue;
    }
    for (const page of pages) {
      if (seen.has(page.title)) continue;
      const item = usable(page);
      if (!item) continue;
      if (!mentionsPlace(item, placeHint)) continue;
      if (series.has(item.series)) continue;
      const artistCount = artists.get(item.artist) || 0;
      if (artistCount >= (placeHint ? 2 : 1)) continue;
      seen.add(page.title);
      series.add(item.series);
      artists.set(item.artist, artistCount + 1);
      chosen.push(item);
      if (chosen.length >= count) return chosen;
    }
  }
  return chosen;
}

async function save(slug, items) {
  const dir = path.join(ROOT, 'public/images/foliage', slug);
  mkdirSync(dir, { recursive: true });
  const out = [];
  let n = 1;
  for (const item of items) {
    const res = await fetch(item.thumb, { headers: { 'User-Agent': UA } });
    if (!res.ok) {
      console.error('download failed', item.title, res.status);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const file = `${String(n).padStart(2, '0')}.webp`;
    const img = sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 72 });
    const meta = await img.toFile(path.join(dir, file));
    out.push({
      src: `/images/foliage/${slug}/${file}`,
      width: meta.width,
      height: meta.height,
      alt: item.caption.slice(0, 180),
      caption: item.caption,
      credit: item.artist,
      license: item.license,
      licenseUrl: item.licenseUrl,
      sourceUrl: item.sourceUrl,
      fileTitle: item.title,
    });
    n += 1;
  }
  return out;
}

const pinned = {
  hub: [
    'File:Vermont fall covered bridge 2009.JPG',
    'File:New Hampshire foliage and covered bridge.jpg',
    'File:Fall Foliage Grand Mesa, Colorado.JPG',
    'File:Mount Sterling, North Carolina Fall Foliage.JPG',
  ],
  alabama: [
    'File:Colorful foliage at Mountain Longleaf National Wildlife Refuge.jpg',
    'File:Autumn leaves on the road leading to Tuscumbia Landing Site near Sheffield, Alabama (6c2a252f-f67b-4670-867b-75e92dcba11a).JPG',
  ],
  georgia: [
    'File:Scenic view of lake in fall with autumn foliage reflected in lake at stone mountain.jpg',
    'File:Autumn in Anna Ruby Falls - panoramio.jpg',
  ],
  kansas: [
    'File:Fall Foliage Marais des Cygnes National Wildlife Refuge (8250584848).jpg',
    'File:Wetlands and Wildlife Scenic Byway - Autumn Country Lane - NARA - 7722783.jpg',
  ],
  nebraska: [
    'File:The coming of autumn is marked by the turning of the aspen to bright yellow-gold. (f5ca5b09-155d-4519-3e84-2acf3fb2a389).JPG',
    'File:Aspen are found in the Niobrara Valley, hundreds of miles from their usual range. (f5c86055-155d-4519-3e3f-8ad97357d6f1).JPG',
    'File:A walk in the leaves (3e2a223c-9ed9-41d7-829a-c66782d62af2).jpg',
  ],
  'new-mexico': [
    'File:Fall Aspen Vista, Santa Fe National Forest (51139403617).jpg',
    'File:Fall Aspen Vista, Santa Fe National Forest (51140292858).jpg',
  ],
  'north-dakota': [
    'File:Fall Foliage White Horse Hill National Game Preserve (53303864355).jpg',
    'File:Fall Foliage White Horse Hill National Game Preserve (53302522087).jpg',
  ],
  'rhode-island': [
    'File:Roger Williams Park Swan Boat Pond, Providence, RI, in Autumn.JPG',
  ],
  'south-carolina': [
    'File:Fall in Hitchcock Woods (50326185598).jpg',
    "File:Campbell's Covered Bridge 10 (7).jpg",
  ],
};

async function byTitle(title) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '1600',
    format: 'json',
  });
  const data = await getJson(url);
  const page = Object.values(data.query?.pages || {})[0];
  if (!page || page.missing != null) return null;
  return usable(page, { force: true });
}

const jobs = [
  { slug: 'hub', queries: ['Vermont fall foliage', 'New Hampshire autumn foliage', 'Colorado aspen fall foliage', 'North Carolina fall foliage mountains'], hint: '', count: 4 },
  ...states.map((s) => ({
    slug: s.slug,
    queries: [`filetype:bitmap ${s.name} fall foliage`, `filetype:bitmap ${s.name} autumn foliage`, `filetype:bitmap ${s.name} autumn leaves`],
    hint: s.name,
    count: 3,
  })),
];

const catalog = {};
for (const job of jobs) {
  process.stdout.write(`${job.slug}... `);
  const seeded = [];
  for (const title of pinned[job.slug] || []) {
    const item = await byTitle(title);
    if (item) seeded.push(item);
    else console.error('missing pin', title);
  }
  const rest = seeded.length >= job.count ? [] : await pick(job.queries, job.hint, job.count);
  const seen = new Set(seeded.map((item) => item.title));
  const finalItems = [...seeded];
  for (const item of rest) {
    if (seen.has(item.title) || finalItems.length >= job.count) continue;
    seen.add(item.title);
    finalItems.push(item);
  }
  catalog[job.slug] = await save(job.slug, finalItems);
  console.log(catalog[job.slug].length);
  await new Promise((r) => setTimeout(r, 200));
}

writeFileSync(path.join(ROOT, 'data/foliage-images.json'), JSON.stringify(catalog, null, 2));
const thin = Object.entries(catalog).filter(([, list]) => list.length < 2).map(([slug, list]) => `${slug}:${list.length}`);
console.log('thin', thin.join(', ') || 'none');
