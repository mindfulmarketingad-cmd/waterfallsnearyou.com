// Writes data/thin-redirects.json for the Vercel redirect function. Run before `astro build`.
import { writeFileSync } from 'node:fs';
import { redirectMap } from '../src/lib/publish.mjs';

const map = redirectMap();
const keys = Object.keys(map).sort();
const sorted = Object.fromEntries(keys.map((k) => [k, map[k]]));
const json = JSON.stringify(sorted);
// JSON for the tests. The .mjs is what the Vercel function imports: the edge
// bundler rejects `import ... with { type: 'json' }`.
writeFileSync(new URL('../data/thin-redirects.json', import.meta.url), json);
writeFileSync(new URL('../data/thin-redirects.mjs', import.meta.url), `export default ${json};\n`);
console.log(`thin redirects: ${keys.length}`);
