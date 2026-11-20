import { east } from './east.mjs';
import { midatlantic } from './midatlantic.mjs';
import { south } from './south.mjs';
import { midwest } from './midwest.mjs';
import { west } from './west.mjs';

export { hubCopy, foldedStates } from './hub.mjs';

export const states = [...east, ...midatlantic, ...south, ...midwest, ...west].sort((a, b) => a.name.localeCompare(b.name));

export const publishedFoliagePaths = ['/fall-foliage', ...states.map((s) => `/fall-foliage/${s.slug}`)];
