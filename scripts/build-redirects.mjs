// Writes data/thin-redirects.json for the Vercel redirect function. Run before `astro build`.
import { writeFileSync } from 'node:fs';
import { redirectMap } from '../src/lib/publish.mjs';

const map = redirectMap();
const keys = Object.keys(map).sort();
const sorted = Object.fromEntries(keys.map((k) => [k, map[k]]));
writeFileSync(new URL('../data/thin-redirects.json', import.meta.url), JSON.stringify(sorted));
console.log(`thin redirects: ${keys.length}`);
