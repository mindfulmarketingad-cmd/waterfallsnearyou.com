# WaterfallsNearYou.com

Static, SEO-first directory of US waterfalls built with Astro. Every page is pre-rendered HTML, so there is no server, database or admin panel to attack.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run build` | Imports Outscraper data, renders featured images, builds `dist/` |
| `npm run import:outscraper` | Normalize Outscraper exports only |
| `npm run data:gnis` | Re-download and rebuild the USGS waterfall + town data |

## Adding Outscraper data

1. Export Google Maps results from Outscraper as `.xlsx`, `.csv` or `.json` (keep all columns).
2. Put the file(s) in `data/outscraper/`.
3. Run `npm run build` (or `npm run import:outscraper`), then commit `data/outscraper.json` and the export.

Each record is matched to a USGS waterfall by distance and name. When it matches, that waterfall page gains the rating, review count and star breakdown, hours, phone, website, address, photos, amenities and accessibility, plus code, price range and time spent. Records that don't match become new listings under their nearest town. Permanently closed places and non-US rows are skipped.

Every imported record also gets `/partners/[business-name]`, which redirects to its listing page at `/[state]/[city]/[listing]`. That keeps one indexable URL per waterfall.

## URL structure

```
/                                   Home (video hero, location-aware carousel, FAQs)
/states  ->  /states/[state]        State hubs (listicle, town grid, counties, A-Z)
/[state]/[city]                     Town hubs (numbered listicle ranked by distance)
/[state]/[city]/[listing]           Waterfall pages
/blog    ->  /blog/[slug]           Guides (Markdown in src/content/blog)
/blog/best-waterfalls-in-[state]            Ranked by weighted Google rating
/blog/most-beautiful-waterfalls-in-[state]  Ranked by photos, five-star share, scenery mentions
/blog/must-see-waterfalls-in-[state]        Top 5 most visited, spread out, with a route
/blog/best-waterfall-hikes-in-[state]       Trail-evidenced falls ranked by rating
/blog/smallest-waterfalls-in-the-us         Smallest falls with a recorded height
/blog/best-waterfalls-[capital]-[state]     Best waterfalls near each qualifying state capital (28)
/blog/[waterfall]                           "[Waterfall] Guide Before Visiting" (waterfalls with 25+ reviews,
                                            a Google description or USGS naming history; 821 today)
/map  ->  /map/[state]              Interactive waterfall maps (MapLibre GL + OpenFreeMap tiles)
/search                             Site-wide search
/about /contact /disclaimer /privacy /terms /sitemap   /sitemap.xml /robots.txt /ads.txt
```

## Unique state and town content

- `src/content/states/<state>.json`: editorial overview, waterfall regions (mapped to counties), best season, planning notes and FAQs for each state.
- `src/lib/insights.mjs`: statistics computed for each state and town (rankings, distance bands, quick picks, review-tag themes, compass extremes, county shares).
- `src/lib/bestof.mjs`: the programmatic state list posts. They are generated only for states with more than 10 listings, and only where the data supports the list. Waterfalls flagged as private property are excluded.
- Neighboring towns under 2.5 miles apart, or under 5 miles apart with near-identical names, are merged into one hub so their pages don't duplicate each other.

## Filling rating gaps

`data/outscraper-requests/unrated-waterfalls.csv` lists every waterfall without Google data. Each row has a ready-made search `query` plus coordinates. Run it through Outscraper's Google Maps scraper and drop the export into `data/outscraper/`. The next build matches the results back and adds ratings and photos. Waterfalls that gain enough reviews also get a visitor guide automatically.

## Maps

All maps use [MapLibre GL](https://maplibre.org) with free [OpenFreeMap](https://openfreemap.org) vector tiles: no API key, no request limits, and commercial use allowed. MapLibre's prebuilt files are copied to `public/vendor/maplibre/` by `scripts/copy-vendor.mjs` (this runs before `dev` and `build`). The shared helper is `src/scripts/wmap.js`; to change the map style, edit `STYLE` there (OpenFreeMap also offers `positron` and `bright`).

## Images

Waterfall cards, listing heroes, state and city hubs, find results and blog featured images use hosted lifestyle photos, not hotlinked Google URLs.

Google Maps photo URLs from Outscraper (`lh3.googleusercontent.com`) return HTTP 403 in browsers. The old card markup loaded those URLs and, on error, swapped in the generated illustration under `public/images/gen/`. That is why every card showed the same kind of fallback art.

What the site uses now:

- `data/lifestyle-photos.json` is the catalog: Pexels and Unsplash photos, with author, license and source URL. Licenses are the [Pexels License](https://www.pexels.com/license/) and the [Unsplash License](https://unsplash.com/license). Attribution is not required; the catalog keeps the credit anyway.
- `public/images/lifestyle/*.webp` are the files the pages actually load (1200×750). They are committed, so a production build does not download them and does not need an API key.
- `src/lib/lifestyle.mjs` assigns a photo from a regional pool (Pacific Northwest, desert, tropical, alpine, Appalachia, California, Northeast, or a general forest pool) using a stable hash of the waterfall URL. The same listing always gets the same photo.
- `src/lib/photos.mjs` (`listingPhoto`, `pagePhoto`, `featuredPhoto`) returns those hosted paths. The generated illustration is only the `onerror` fallback if a file is missing.
- These are visit scenes, not a photograph of that specific waterfall. Alt text describes the scene. Visitor photos still linked from a Google Maps listing stay as an outbound link.

To refresh the files after editing the catalog:

```
node scripts/fetch-lifestyle-photos.mjs
node scripts/fetch-lifestyle-photos.mjs --force
```

`npm run photos:lifestyle` runs the same script. Commit the WebP files with the catalog.

## Data sources

- Waterfalls: USGS Geographic Names Information System, feature class "Falls" (public domain). Includes descriptions, name history, variant names and named landmarks within 2 miles.
- Towns: GeoNames cities with 1,000+ residents (CC BY 4.0; attribution is in the footer).
- Business details: Outscraper (Google Maps) exports.

## Deploying (Vercel)

Import the repo in Vercel. The settings come from `vercel.json`: the Astro preset, security headers (CSP, HSTS, frame denial and others), caching, and 301 redirects. `api/geo.js` is an Edge Function that returns the visitor's approximate location from Vercel's IP headers so the homepage can show nearby waterfalls without a permission prompt. If `vercel.json` is regenerated, run `node scripts/make-vercel-config.mjs`.

## Settings to confirm

- `src/config.mjs`: contact email and social profile URLs.
- AdSense: `ads.txt` and the Auto ads tag are already in place. In AdSense, turn on Auto ads for the site and set up a Google-certified consent message under Privacy & messaging. Google requires that message for EEA/UK visitors.
- Brand assets are generated by `node scripts/make-brand.mjs`.
