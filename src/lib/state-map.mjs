// Static state map of published waterfall pages. The outline is the Census
// cartographic boundary. Marker positions are the coordinates already stored
// on those listings. Nothing here is a foliage date.
import { loadData } from './core.mjs';
import { publishedListing } from './publish.mjs';
import { CENSUS_OUTLINE_CREDIT, projectState, stateOutline } from './state-outline.mjs';

function onInset(x, y) {
  return Number.isFinite(x) && Number.isFinite(y) && x >= -2 && x <= 102 && y >= -2 && y <= 102;
}

export function stateMapModel(slug, { featuredUrls = [], name } = {}) {
  const outline = stateOutline(slug);
  const stateName = name || outline.name;
  const featured = new Set(featuredUrls.filter(Boolean));
  const markers = loadData().listings
    .filter((l) => l.stateSlug === slug && publishedListing(l) && Number.isFinite(l.lat) && Number.isFinite(l.lng))
    .map((l) => {
      const [x, y] = projectState(slug, l.lng, l.lat);
      const drawn = onInset(x, y);
      return {
        name: l.name,
        url: l.url,
        county: l.county || '',
        featured: featured.has(l.url),
        x: drawn ? Math.round(x * 100) / 100 : null,
        y: drawn ? Math.round(y * 100) / 100 : null,
      };
    })
    .sort((a, b) => Number(a.featured) - Number(b.featured) || a.name.localeCompare(b.name));
  return {
    slug,
    name: stateName,
    title: `Map of waterfalls in ${stateName}`,
    outline: outline.d,
    markers,
    bounds: outline.bounds,
    source: CENSUS_OUTLINE_CREDIT,
  };
}
