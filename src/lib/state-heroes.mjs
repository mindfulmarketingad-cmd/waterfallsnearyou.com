// Featured photos for /states/[state]. Hosted files, not the lifestyle pool.
import heroes from '../data/state-heroes.json' with { type: 'json' };

const SIZES = '(max-width: 560px) calc(100vw - 32px), (max-width: 1220px) calc(100vw - 40px), 1140px';

export function stateHero(slug) {
  const hero = heroes[slug];
  if (!hero) return null;
  const srcset = hero.variants.map((w) => `/images/states/${slug}-${w}.webp ${w}w`).join(', ');
  return { ...hero, srcset, sizes: SIZES };
}

export function stateHeroRecords() {
  return heroes;
}
