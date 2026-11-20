// Featured foliage maps for /fall-foliage and /fall-foliage/[state].
// Hosted WebP files rendered from USA-NPN mid-greendown and Census outlines.
import maps from '../data/foliage-maps.json' with { type: 'json' };

const SIZES = '(max-width: 560px) calc(100vw - 32px), (max-width: 1220px) calc(100vw - 40px), 1140px';

export function foliageMap(slug) {
  const map = maps[slug];
  if (!map) return null;
  const srcset = map.variants.map((w) => `/images/foliage-maps/${slug}-${w}.webp ${w}w`).join(', ');
  return { ...map, srcset, sizes: SIZES };
}

export function foliageHubMap() {
  return foliageMap('united-states');
}

export function foliageMapRecords() {
  return maps;
}
