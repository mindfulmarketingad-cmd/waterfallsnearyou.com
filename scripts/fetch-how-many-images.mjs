// Downloads one licensed waterfall photo per published "how many" state page.
// Sources are Wikimedia Commons files with a free license (public domain, CC0, CC BY, CC BY-SA).
// Output: public/images/how-many/<slug>.webp and data/how-many-images.json
// Usage: node scripts/fetch-how-many-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'WaterfallsNearYouResearch/1.0 (https://www.waterfallsnearyou.com; named-waterfall-study)';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_DIR = path.join(ROOT, 'public/images/how-many');

// Each query is a real waterfall in that state. The file title or description must match `re`.
const JOBS = [
  { slug: 'oregon', state: 'Oregon', alt: 'Multnomah Falls, a two-tier waterfall plunging down a basalt cliff beside a footbridge in the Columbia River Gorge, Oregon', re: /multnomah falls/i, q: ['Multnomah Falls Oregon'] },
  { slug: 'new-york', state: 'New York', alt: 'Taughannock Falls, a tall plunge into a wide shale gorge near Cayuga Lake in New York', re: /taughannock/i, q: ['Taughannock Falls New York'] },
  { slug: 'michigan', state: 'Michigan', alt: 'Tahquamenon Falls, a broad amber waterfall on the Tahquamenon River in Michigan’s Upper Peninsula', re: /tahquamenon/i, q: ['Tahquamenon Falls Michigan'] },
  { slug: 'california', state: 'California', alt: 'Yosemite Falls dropping down the granite wall of Yosemite Valley in California', re: /yosemite falls/i, q: ['Yosemite Falls California'] },
  { slug: 'washington', state: 'Washington', alt: 'Snoqualmie Falls, a wide plunge on the Snoqualmie River in Washington', re: /snoqualmie falls/i, q: ['Snoqualmie Falls Washington'] },
  { slug: 'montana', state: 'Montana', alt: 'Running Eagle Falls in Glacier National Park, Montana, where a creek drops over a rock lip', re: /running eagle|trick falls/i, q: ['Running Eagle Falls Glacier', 'Kootenai Falls Montana'] },
  { slug: 'maine', state: 'Maine', alt: 'Screw Auger Falls, a series of granite cascades in Grafton Notch, Maine', re: /screw auger/i, q: ['Screw Auger Falls Maine'] },
  { slug: 'north-carolina', state: 'North Carolina', alt: 'Looking Glass Falls, a broad cascade on a rock face in Pisgah National Forest, North Carolina', re: /looking glass falls/i, q: ['Looking Glass Falls North Carolina'] },
  { slug: 'hawaii', state: 'Hawaii', alt: 'ʻAkaka Falls, a tall waterfall dropping through forest on the Hamakua Coast of Hawaii', re: /akaka falls|ʻakaka|akaka/i, q: ['Akaka Falls Hawaii'] },
  { slug: 'pennsylvania', state: 'Pennsylvania', alt: 'Dingmans Falls, a tall waterfall in a hemlock ravine in the Delaware Water Gap, Pennsylvania', re: /dingmans falls/i, q: ['Dingmans Falls Pennsylvania'] },
  { slug: 'wyoming', state: 'Wyoming', alt: 'The Lower Falls of the Yellowstone River plunging into the yellow canyon in Yellowstone National Park, Wyoming', re: /lower falls.*(yellowstone|wyoming)|yellowstone.*lower falls/i, q: ['Lower Falls Yellowstone River'] },
  { slug: 'tennessee', state: 'Tennessee', alt: 'Fall Creek Falls dropping off a sandstone cliff on the Cumberland Plateau in Tennessee', re: /fall creek falls/i, q: ['Fall Creek Falls Tennessee'] },
  { slug: 'colorado', state: 'Colorado', alt: 'Alberta Falls, a waterfall on Glacier Creek in Rocky Mountain National Park, Colorado', re: /alberta falls/i, q: ['Alberta Falls Colorado'] },
  { slug: 'idaho', state: 'Idaho', alt: 'Shoshone Falls, a wide waterfall on the Snake River canyon in Idaho', re: /shoshone falls/i, q: ['Shoshone Falls Idaho'] },
  { slug: 'new-hampshire', state: 'New Hampshire', alt: 'Arethusa Falls, a tall waterfall in Crawford Notch State Park, New Hampshire', re: /arethusa falls/i, q: ['Arethusa Falls New Hampshire'] },
  { slug: 'wisconsin', state: 'Wisconsin', alt: 'Big Manitou Falls, a waterfall on the Black River in Pattison State Park, Wisconsin', re: /manitou falls/i, q: ['Big Manitou Falls Wisconsin', 'Manitou Falls Wisconsin'] },
  { slug: 'alaska', state: 'Alaska', alt: 'Nugget Falls, a waterfall from the Juneau Icefield dropping beside Mendenhall Lake in Alaska', re: /nugget falls/i, q: ['Nugget Falls Juneau Alaska'] },
  { slug: 'minnesota', state: 'Minnesota', alt: 'Gooseberry Falls, a cascade on the Gooseberry River along Minnesota’s North Shore', re: /gooseberry falls/i, q: ['Gooseberry Falls Minnesota'] },
  { slug: 'virginia', state: 'Virginia', alt: 'Dark Hollow Falls, a cascade in Shenandoah National Park, Virginia', re: /dark hollow falls/i, q: ['Dark Hollow Falls Shenandoah'] },
  { slug: 'alabama', state: 'Alabama', alt: 'DeSoto Falls, a waterfall dropping into a gorge in DeSoto State Park, Alabama', re: /desoto falls|de soto falls/i, q: ['DeSoto Falls Alabama'] },
  { slug: 'texas', state: 'Texas', alt: 'Gorman Falls, a travertine waterfall on the Colorado River in Colorado Bend State Park, Texas', re: /gorman falls/i, q: ['Gorman Falls Texas'] },
  { slug: 'vermont', state: 'Vermont', alt: 'Texas Falls, a series of cascades in a greenstone gorge in Green Mountain National Forest, Vermont', re: /texas falls/i, q: ['Texas Falls Vermont'] },
  { slug: 'georgia', state: 'Georgia', alt: 'Amicalola Falls, a tall cascading waterfall in the North Georgia mountains', re: /amicalola/i, q: ['Amicalola Falls Georgia'] },
  { slug: 'arizona', state: 'Arizona', alt: 'Havasu Falls, a turquoise waterfall in a travertine bowl in the Grand Canyon, Arizona', re: /havasu falls/i, q: ['Havasu Falls Arizona'] },
  { slug: 'massachusetts', state: 'Massachusetts', alt: 'Bash Bish Falls, a split waterfall in a hemlock gorge in the Berkshires of Massachusetts', re: /bash bish/i, q: ['Bash Bish Falls Massachusetts'] },
  { slug: 'oklahoma', state: 'Oklahoma', alt: 'Turner Falls, a waterfall over a travertine ledge in the Arbuckle Mountains, Oklahoma', re: /turner falls/i, q: ['Turner Falls Oklahoma'] },
  { slug: 'south-carolina', state: 'South Carolina', alt: 'Issaqueena Falls, a waterfall in a forested gorge at Stumphouse Mountain, South Carolina', re: /issaqueena/i, q: ['Issaqueena Falls South Carolina'] },
  { slug: 'utah', state: 'Utah', alt: 'Bridal Veil Falls, a tall waterfall in Provo Canyon, Utah', re: /bridal veil falls/i, q: ['Bridal Veil Falls Provo Canyon Utah'] },
  { slug: 'indiana', state: 'Indiana', alt: 'A waterfall in Clifty Falls State Park, Indiana, dropping through a wooded limestone ravine', re: /clifty falls/i, q: ['Clifty Falls Indiana'] },
  { slug: 'ohio', state: 'Ohio', alt: 'Brandywine Falls, a waterfall over shale and sandstone ledges in Cuyahoga Valley National Park, Ohio', re: /brandywine falls/i, q: ['Brandywine Falls Cuyahoga'] },
  { slug: 'kentucky', state: 'Kentucky', alt: 'Cumberland Falls, a wide waterfall on the Cumberland River in Kentucky', re: /cumberland falls/i, q: ['Cumberland Falls Kentucky'] },
  { slug: 'west-virginia', state: 'West Virginia', alt: 'Blackwater Falls, an amber waterfall dropping into a gorge in Blackwater Falls State Park, West Virginia', re: /blackwater falls/i, q: ['Blackwater Falls West Virginia'] },
  { slug: 'new-mexico', state: 'New Mexico', alt: 'Sitting Bull Falls, a waterfall over a limestone ledge in the Guadalupe Mountains of New Mexico', re: /sitting bull falls/i, q: ['Sitting Bull Falls New Mexico'] },
  { slug: 'arkansas', state: 'Arkansas', alt: 'Hemmed-in-Hollow Falls, a tall waterfall in a sandstone box canyon in the Arkansas Ozarks', re: /hemmed-in-hollow|hemmed in hollow/i, q: ['Hemmed-in-Hollow Falls Arkansas'] },
  { slug: 'connecticut', state: 'Connecticut', alt: 'Kent Falls, a series of cascades over stone ledges in Kent Falls State Park, Connecticut', re: /kent falls/i, q: ['Kent Falls Connecticut'] },
  { slug: 'maryland', state: 'Maryland', alt: 'Cunningham Falls, a cascading waterfall on a boulder stream in Cunningham Falls State Park, Maryland', re: /cunningham falls/i, q: ['Cunningham Falls Maryland'] },
];

const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

function licenseOk(short) {
  const s = strip(short).toLowerCase();
  if (!s) return false;
  if (/noncommercial|\bnc\b|noderiv|\bnd\b|fair use|all rights reserved/.test(s)) return false;
  if (s.includes('cc0') || s.includes('public domain') || s === 'pd') return true;
  if (/^cc by( |-sa )?[0-9.]*$/.test(s)) return true;
  if (s.startsWith('cc by-sa') || s.startsWith('cc by ')) return true;
  return false;
}

async function api(params) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ ...params, format: 'json' })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function search(q) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${q}`,
    gsrnamespace: '6',
    gsrlimit: '10',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
  });
  return Object.values(data?.query?.pages || {});
}

function pick(pages, re) {
  const cands = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime || '')) continue;
    if ((info.width || 0) < 900) continue;
    const meta = info.extmetadata || {};
    const lic = strip(meta.LicenseShortName?.value);
    if (!licenseOk(lic)) continue;
    const title = strip(p.title);
    const desc = strip(meta.ImageDescription?.value);
    const blob = `${title} ${desc}`;
    if (!re.test(blob)) continue;
    if (/map|diagram|logo|icon|painting|illustration|postcard only/i.test(title) && !/falls|waterfall/i.test(title)) continue;
    const artist = strip(meta.Artist?.value).replace(/^by /i, '').slice(0, 180);
    cands.push({
      title,
      url: info.url.split('?')[0],
      width: info.width,
      height: info.height,
      license: lic,
      licenseUrl: strip(meta.LicenseUrl?.value),
      artist: artist || 'Wikimedia Commons',
      credit: strip(meta.Credit?.value).slice(0, 180),
      description: desc.slice(0, 240),
      landscape: info.width >= info.height ? 1 : 0,
      pixels: info.width * info.height,
    });
  }
  cands.sort((a, b) => b.landscape - a.landscape || b.pixels - a.pixels);
  return cands[0] || null;
}

mkdirSync(OUT_DIR, { recursive: true });
const out = {};
const failures = [];
for (const job of JOBS) {
  let chosen = null;
  let queryUsed = '';
  for (const q of job.q) {
    const pages = await search(q);
    chosen = pick(pages, job.re);
    queryUsed = q;
    if (chosen) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!chosen) {
    failures.push(job.slug);
    console.error('MISS', job.slug);
    continue;
  }
  const res = await fetch(chosen.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    failures.push(job.slug);
    console.error('DOWNLOAD', job.slug, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(OUT_DIR, `${job.slug}.webp`);
  await sharp(buf).rotate().resize(1200, 630, { fit: 'cover', position: 'attention' }).webp({ quality: 74 }).toFile(dest);
  const filePage = `https://commons.wikimedia.org/wiki/${encodeURIComponent(chosen.title).replace(/%3A/g, ':').replace(/%20/g, '_')}`;
  // Commons file pages use Special-style encoding: File:Name with spaces as underscores.
  const wikiTitle = chosen.title.replace(/ /g, '_');
  out[job.slug] = {
    src: `/images/how-many/${job.slug}.webp`,
    width: 1200,
    height: 630,
    alt: job.alt,
    state: job.state,
    credit: chosen.artist,
    license: chosen.license,
    licenseUrl: chosen.licenseUrl || '',
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(wikiTitle).replace(/%3A/g, ':')}`,
    fileTitle: chosen.title,
    originalUrl: chosen.url,
    query: queryUsed,
  };
  console.log('OK', job.slug, chosen.license, chosen.title.slice(0, 70), chosen.artist.slice(0, 40));
  await new Promise((r) => setTimeout(r, 200));
}
writeFileSync(path.join(ROOT, 'data/how-many-images.json'), `${JSON.stringify({ retrieved: '2026-11-19', images: out }, null, 2)}\n`);
if (failures.length) {
  console.error('Failed:', failures.join(', '));
  process.exit(1);
}
console.log('Wrote', Object.keys(out).length, 'images');
