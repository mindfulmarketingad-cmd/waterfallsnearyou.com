// Pillar model for /blog/largest-waterfalls-in-the-us-by-state.
// Heights come only from a USGS gazetteer sentence already in our data, or from
// src/data/agency-waterfall-heights.json (NPS, USFS, or a state agency page).
// Google listing blurbs are not used. Catalog totals that are not agency surveys
// stay in the national section and are not mixed into a state's height rank.
import { loadData } from './core.mjs';
import { statedHeight, isPrivate } from './bestof.mjs';
import { listingHref, publishedListing } from './publish.mjs';
import { trailFor } from './trails.mjs';
import { getPark, parkQualifies, parkForListing } from './parks.mjs';
import agencyHeights from '../data/agency-waterfall-heights.json' with { type: 'json' };

export const PILLAR_SLUG = 'largest-waterfalls-in-the-us-by-state';
export const PILLAR_URL = `/blog/${PILLAR_SLUG}`;
export const PUBLISHED = new Date('2026-10-02T12:00:00Z');
export const UPDATED = new Date('2026-11-19T12:00:00Z');
export const YOSEMITE_FEET = 2425;
export const CATALOG_TALLEST_FEET = 2953;

const PER_STATE = 5;
const TYPE_RES = [
  [/horsetail/i, 'Horsetail'],
  [/plunge|plunging|free-falling|free falling/i, 'Plunge'],
  [/tier/i, 'Tiered'],
  [/cascade|cascading|series of falls|series of cascades/i, 'Cascade'],
  [/rapids/i, 'Rapids'],
];
const PLACE_RES = [
  /((?:[\w.''ʻʼ-]+ ){0,6}National Park)/i,
  /((?:[\w.''ʻʼ-]+ ){0,6}National Forest)/i,
  /((?:[\w.''ʻʼ-]+ ){0,6}National Scenic Area)/i,
  /((?:[\w.''ʻʼ-]+ ){0,6}National Lakeshore)/i,
  /((?:[\w.''ʻʼ-]+ ){0,5}State Park)/i,
  /((?:[\w.''ʻʼ-]+ ){0,4}Wilderness)/i,
];

function typeFrom(text) {
  if (!text) return null;
  for (const [re, label] of TYPE_RES) if (re.test(text)) return label;
  return null;
}
function placeFrom(text) {
  if (!text) return null;
  for (const re of PLACE_RES) {
    const m = re.exec(text);
    if (m) return m[1].replace(/^(?:in|within|inside)\s+/i, '').replace(/\s+/g, ' ').trim();
  }
  return null;
}
function parkLink(slug) {
  if (!slug) return null;
  const park = getPark(slug);
  if (!park || !parkQualifies(park)) return null;
  return { href: park.url, name: park.name };
}

function fromListing(l, usgs) {
  const text = usgs.text || '';
  const trail = publishedListing(l) ? trailFor(l.url) : null;
  return {
    name: l.name,
    state: l.state,
    feet: usgs.feet,
    approx: /approx|about|nearly|almost/i.test(text),
    type: typeFrom(text),
    place: placeFrom(text),
    park: parkLink(parkForListing(l.url)?.slug),
    county: l.county || '',
    href: listingHref(l),
    published: publishedListing(l),
    sourceTitle: `USGS GNIS ${l.gnisId}`,
    sourceUrl: `https://edits.nationalmap.gov/apps/gaz-domestic/public/summary/${l.gnisId}`,
    detail: text.replace(/\s+/g, ' ').trim(),
    trail: trail && (trail.name || trail.distance?.text) ? {
      name: trail.name || null,
      distance: trail.distance?.text || null,
      difficulty: trail.difficulty || null,
      sourceTitle: trail.sources?.[0]?.title || null,
      sourceUrl: trail.sources?.[0]?.url || null,
    } : null,
    origin: 'usgs',
  };
}

function fromAgency(row, listing) {
  const trail = listing && publishedListing(listing) ? trailFor(listing.url) : null;
  const park = parkLink(row.parkSlug);
  return {
    name: row.name,
    state: row.state,
    feet: row.feet,
    approx: !!row.approx,
    type: row.type || null,
    place: row.place || null,
    park,
    county: listing?.county || '',
    href: listing ? listingHref(listing) : `/states/${slugifyState(row.state)}`,
    published: listing ? publishedListing(listing) : false,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    detail: row.detail,
    trail: trail && (trail.name || trail.distance?.text) ? {
      name: trail.name || null,
      distance: trail.distance?.text || null,
      difficulty: trail.difficulty || null,
      sourceTitle: trail.sources?.[0]?.title || null,
      sourceUrl: trail.sources?.[0]?.url || null,
    } : null,
    origin: 'agency',
  };
}

function slugifyState(name) {
  return name === 'District of Columbia' ? 'district-of-columbia' : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

let cache = null;
export function getLargestGuide() {
  if (cache) return cache;
  const { states, listings } = loadData();
  const byUrl = new Map(listings.map((l) => [l.url, l]));
  const sections = [];

  const extras = [{ name: 'Delaware', code: 'DE', slug: 'delaware', listings: [] }];
  const allStates = [...states, ...extras].sort((a, b) => a.name.localeCompare(b.name));

  for (const state of allStates) {
    const pool = (state.listings || []).filter((l) => !isPrivate(l));
    const usgs = [];
    for (const l of pool) {
      const h = statedHeight(l);
      if (!h || h.source !== 'USGS gazetteer' || !(h.feet > 0) || h.feet > 5000) continue;
      usgs.push(fromListing(l, h));
    }
    const agency = agencyHeights.filter((r) => r.state === state.name).map((r) => fromAgency(r, r.url ? byUrl.get(r.url) : null));
    const used = new Set(agency.map((a) => a.href));
    const merged = [...agency];
    for (const u of usgs) {
      if (used.has(u.href)) {
        const hit = merged.find((m) => m.href === u.href);
        if (hit && Math.abs(hit.feet - u.feet) >= 5) {
          hit.detail += ` The USGS gazetteer states ${u.approx ? 'about ' : ''}${u.feet} feet (${u.sourceUrl}).`;
        }
        continue;
      }
      merged.push(u);
    }
    merged.sort((a, b) => b.feet - a.feet || a.name.localeCompare(b.name));
    const tallEnough = merged.filter((f) => !(merged[0]?.feet >= 30 && f.feet < 15));
    let ranked = tallEnough.slice(0, PER_STATE);
    const cutoff = ranked[ranked.length - 1]?.feet;
    if (cutoff) {
      for (const extra of tallEnough.slice(PER_STATE)) {
        if (extra.feet !== cutoff || ranked.length >= PER_STATE + 1) break;
        ranked.push(extra);
      }
    }
    const tallest = ranked[0] || null;
    const rankedHrefs = new Set(ranked.map((f) => f.href));
    const unranked = ranked.length >= 3 ? [] : [...pool]
      .filter((l) => !rankedHrefs.has(listingHref(l)) && (l.os?.reviews || 0) > 0)
      .sort((a, b) => (b.os?.reviews || 0) - (a.os?.reviews || 0))
      .slice(0, 3)
      .map((l) => ({ name: l.name, href: listingHref(l), county: l.county || '', reviews: l.os?.reviews || 0 }));
    sections.push({
      name: state.name,
      code: state.code,
      slug: state.slug,
      anchor: `state-${state.slug}`,
      url: state.url || null,
      directoryCount: (state.listings || []).length,
      privateCount: (state.listings || []).filter(isPrivate).length,
      ranked,
      unranked,
      tallest,
      yosemiteShare: tallest ? Math.round((tallest.feet / YOSEMITE_FEET) * 1000) / 10 : null,
      catalogShare: tallest ? Math.round((tallest.feet / CATALOG_TALLEST_FEET) * 1000) / 10 : null,
    });
  }

  const listed = sections.reduce((s, sec) => s + sec.ranked.length, 0);
  const withList = sections.filter((s) => s.ranked.length > 0);
  cache = { sections, listed, withList: withList.length, empty: sections.filter((s) => s.ranked.length === 0) };
  return cache;
}

export function heightText(fall) {
  const n = Math.round(fall.feet).toLocaleString('en-US');
  return `${fall.approx ? 'about ' : ''}${n} ft`;
}
