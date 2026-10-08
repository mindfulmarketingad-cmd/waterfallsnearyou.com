import { loadData, staticPagePaths } from '../lib/core.mjs';
import { getPosts } from '../lib/blog.mjs';
import { getStateLists, getSmallest, getRoadside, getCapitalLists } from '../lib/bestof.mjs';
import { getGuides } from '../lib/guides.mjs';
import { getFind, findPages } from '../lib/find.mjs';
import { SITE } from '../config.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function GET() {
  const { listings, states, cities } = loadData();
  const today = new Date().toISOString().slice(0, 10);
  const posts = getPosts();
  const entries = [
    ...staticPagePaths().map((p) => ({ loc: p, lastmod: today, img: null })),
    ...posts.map((p) => ({ loc: p.url, lastmod: p.updated.toISOString().slice(0, 10), img: `/images/gen${p.url}.webp` })),
    ...[...getStateLists(), ...getCapitalLists(), getSmallest(), getRoadside()].map((p) => ({ loc: p.url, lastmod: today, img: `/images/gen${p.url}.webp` })),
    { loc: '/find', lastmod: today, img: null },
    ...getFind().map((t) => ({ loc: t.url, lastmod: today, img: null })),
    ...findPages().map((p) => ({ loc: p.url, lastmod: today, img: `/images/gen${p.url}.webp` })),
    { loc: '/map', lastmod: today, img: null },
    ...states.map((s) => ({ loc: `/map/${s.slug}`, lastmod: today, img: null })),
    ...getGuides().map((g) => ({ loc: g.url, lastmod: today, img: g.listing.os?.photo || `/images/gen${g.listing.url}.webp` })),
    ...states.map((s) => ({ loc: s.url, lastmod: today, img: `/images/gen${s.url}.webp` })),
    ...cities.map((c) => ({ loc: c.url, lastmod: today, img: `/images/gen${c.url}.webp` })),
    ...listings.map((l) => ({ loc: l.url, lastmod: l.gnisEdited || today, img: l.os?.photo || `/images/gen${l.url}.webp` })),
  ];
  const abs = (u) => (u.startsWith('http') ? u : `${SITE.url}${u === '/' ? '' : u}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.map((e) => `<url><loc>${esc(abs(e.loc))}</loc><lastmod>${e.lastmod}</lastmod>${e.img ? `<image:image><image:loc>${esc(abs(e.img))}</image:loc></image:image>` : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
