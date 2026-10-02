// Generates the logo, favicons and app icons (outputs are committed). Run: node scripts/make-brand.mjs
import sharp from 'sharp';
import opentype from 'opentype.js';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = (f) => path.join(ROOT, 'public', f);
const SLATE = '#4D5359', SLATE_LIGHT = '#7D868E', GREEN = '#3F6F5A', MIST = '#DCE6E1';

const markInner = `
  <rect width="64" height="64" rx="15" fill="${SLATE}"/>
  <circle cx="48" cy="14" r="4.5" fill="${MIST}"/>
  <path d="M0 36 L13 20 L22 28 L32 14 L45 28 L53 22 L64 32 L64 64 L0 64 Z" fill="${SLATE_LIGHT}"/>
  <path d="M0 64 L0 33 Q12 28 26.5 31 L25 64 Z" fill="${GREEN}"/>
  <path d="M39 64 L37.5 31 Q51 27.5 64 32 L64 64 Z" fill="${GREEN}"/>
  <path d="M26 30.6 C29.5 29.6 34.5 29.6 38 30.6 C38.6 38 40 45 42.5 51 L21.5 51 C24 45 25.4 38 26 30.6 Z" fill="#FFFFFF"/>
  <path d="M29.5 33 C29.3 39 28.6 44 27.5 48.5 M34.5 33 C34.7 39 35.4 44 36.5 48.5" stroke="${MIST}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M12 54.5 Q32 49.5 52 54.5" stroke="#FFFFFF" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M19 59.5 Q32 56.5 45 59.5" stroke="#FFFFFF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>`;
const markSvg = (size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><clipPath id="r"><rect width="64" height="64" rx="15"/></clipPath><g clip-path="url(#r)">${markInner}</g></svg>`;

// Wordmark: Fraunces SemiBold converted to outlines so it renders identically everywhere.
const font = opentype.parse(readFileSync(path.join(ROOT, 'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff')).buffer);
function textPath(text, x, y, size, fill) {
  const p = font.getPath(text, x, y, size);
  return { d: p.toPathData(2), width: font.getAdvanceWidth(text, size), fill };
}
const a = textPath('Waterfalls', 0, 0, 40, SLATE);
const b = textPath('NearYou', 0, 0, 40, GREEN);
const gap = 0;
const wordW = Math.ceil(a.width + gap + b.width);
const logoW = 64 + 14 + wordW;
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${logoW}" height="64" viewBox="0 0 ${logoW} 64" role="img" aria-label="WaterfallsNearYou">
<clipPath id="r"><rect width="64" height="64" rx="15"/></clipPath><g clip-path="url(#r)">${markInner}</g>
<g transform="translate(78 44)"><path d="${a.d}" fill="${a.fill}"/><g transform="translate(${(a.width + gap).toFixed(2)} 0)"><path d="${b.d}" fill="${b.fill}"/></g></g>
</svg>`;
const logoWhite = logoSvg.replace(`rx="15" fill="${SLATE}"/>`, `rx="15" fill="#5E666D"/>`).replace(`<path d="${a.d}" fill="${SLATE}"`, `<path d="${a.d}" fill="#FFFFFF"`).replace(`fill="${GREEN}"/></g></g>`, `fill="${MIST}"/></g></g>`);

writeFileSync(pub('brand/logo.svg'), logoSvg);
writeFileSync(pub('brand/logo-white.svg'), logoWhite);
writeFileSync(pub('brand/mark.svg'), markSvg());
writeFileSync(pub('favicon.svg'), markSvg());

await sharp(Buffer.from(logoSvg), { density: 400 }).resize({ width: 1200 }).png().toFile(pub('brand/logo.png'));
await sharp(Buffer.from(markSvg(512))).png().toFile(pub('brand/logo-square.png'));
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const pad = name.startsWith('apple') ? 0 : 0;
  await sharp(Buffer.from(markSvg(size))).flatten({ background: '#FFFFFF' }).resize(size - pad * 2).png().toFile(pub(name));
}
// Multi-size favicon.ico (PNG-compressed entries)
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(Buffer.from(markSvg(s)), { density: 300 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync(pub('favicon.ico'), Buffer.concat([header, ...pngs]));
console.log('Brand assets written.');
