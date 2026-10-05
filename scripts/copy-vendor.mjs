// Copies MapLibre GL's prebuilt files to public/vendor/maplibre so the browser can load the main
// module and its worker from the same folder (MapLibre resolves the worker relative to itself).
import { mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(ROOT, 'node_modules/maplibre-gl/dist');
const dest = path.join(ROOT, 'public/vendor/maplibre');
mkdirSync(dest, { recursive: true });
for (const f of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css', 'LICENSE.txt']) {
  copyFileSync(path.join(f === 'LICENSE.txt' ? path.dirname(src) : src, f), path.join(dest, f));
}
console.log('MapLibre copied to public/vendor/maplibre');
