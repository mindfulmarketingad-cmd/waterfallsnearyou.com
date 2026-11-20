// Published fish-species catalog built by scripts/fetch-fish.mjs.
// The build never invents records: if the catalog is missing, the hub is empty.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

let cache;
export function fishCatalog() {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'data/fish/catalog.json');
  cache = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  return cache;
}

export function fishSpecies() {
  return fishCatalog()?.species || [];
}

export function fishPages() {
  return fishSpecies().filter((s) => s.page);
}

export function fishBySlug(slug) {
  return fishSpecies().find((s) => s.slug === slug) || null;
}

let byListing = null;
export function fishForListing(id) {
  if (!byListing) {
    byListing = new Map();
    for (const species of fishSpecies()) {
      for (const fall of species.waterfalls) {
        if (!byListing.has(fall.id)) byListing.set(fall.id, { stream: fall.stream, streamMeters: fall.streamMeters, species: [] });
        byListing.get(fall.id).species.push({
          slug: species.slug,
          scientificName: species.scientificName,
          commonName: species.commonName,
          page: species.page,
          photo: species.photo,
          recordCount: fall.recordCount,
          yearMin: fall.yearMin,
          yearMax: fall.yearMax,
          datasets: fall.datasets,
        });
      }
    }
    for (const row of byListing.values()) {
      row.species.sort((a, b) => b.recordCount - a.recordCount || (a.commonName || a.scientificName).localeCompare(b.commonName || b.scientificName));
    }
  }
  return byListing.get(id) || null;
}

export function fishHref(species) {
  return species.page ? `/fish-species/${species.slug}` : `/fish-species#${species.slug}`;
}

export function fishLabel(species) {
  return species.commonName || species.scientificName;
}

export function nasFlagged(species) {
  return !!species.nas?.flagged;
}

export const FISH_METHOD = {
  radiusKm: 5,
  streamMaxM: 500,
  yearMin: 2005,
  yearMax: 2026,
  pageMinFalls: 5,
};
