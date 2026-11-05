# Blog routine log

## Site changes (not blog posts)

2026-11-02 | site | AdSense thin-content pass (commit in this file's history):
- (a) DONE: Thin pages set to `noindex, follow` and removed from sitemap.xml, /sitemap and the /blog hub. Rule lives in `src/lib/indexing.mjs`: index only static pages (not /search), hand-written posts in src/content/blog, the 2 national lists (smallest, roadside), /find, /map, state hubs, town hubs with 3+ indexable waterfalls, and waterfall pages with 25+ Google reviews or 200+ chars of USGS description/history. Noindexed: data-generated "[Waterfall] Guide Before Visiting" posts, state/capital best-of lists, /find/* and /map/* sub-pages, thin towns and waterfalls. Result: 854 indexed, 6,350 noindexed.
- (b) DONE: Canonical domain is now https://www.waterfallsnearyou.com (SITE.url and astro.config site), so canonicals, sitemap and robots.txt match the Vercel www redirect.
- (c) DONE: Google Maps (lh3.googleusercontent.com) photos are no longer hotlinked anywhere; `loadData()` strips photo URLs and pages fall back to the site's generated images.
- (d) DONE: Privacy policy names the DoubleClick cookie and links adssettings.google.com and aboutads.info; Contact shows contact@waterfallsnearyou.com.
- TODO: About page has no named owner/editor (only "WaterfallsNearYou Editorial Team"); add a real name/bio when the owner provides one.
- TODO: Grow hand-written posts; new posts in src/content/blog are indexed automatically. Thin pages can be re-indexed by enriching their data and adjusting thresholds in src/lib/indexing.mjs.

## Daily routine progress (counters)

- Trip facts (data/trip-facts.json, shown as "Plan Your Visit" on waterfall pages): 63 waterfalls covered. Next uncovered by reviews: Bonita Falls CA, Grand Falls AZ, Bridalveil Fall Yosemite, Treasure Falls CO, Triple Falls NC, Machine Falls TN; still prioritize remaining city-hub picks (Raymondskill, Great Falls Paterson, Twin Falls WA, Marymere, Sturtevant, Tahquitz). Hawk Falls and Narada now covered.
- City hubs (/waterfalls-near/[city], intros in data/city-hubs.json): 6 of 50 published (New York City, Los Angeles, Philadelphia, Seattle, Portland, Atlanta). Chicago, Houston, Phoenix, Dallas, Fort Worth, El Paso, Memphis, Milwaukee, Miami, Omaha, Mesa, Virginia Beach, Tampa have 0 indexed falls within 100 mi, so skip them for now. Next with enough picks: Charlotte (20), Fresno (19), Nashville (18), Boston (16), Washington DC (13), Denver (11), Sacramento (11), Minneapolis (10), San Jose (9), San Francisco (8).
- Filter pages (dog-friendly, swimmable, accessible...): not started; wait until trip facts cover enough falls per state.
- Friday data studies done: none yet. Next: states ranked by waterfalls per 1,000 sq mi and per resident.

## Site changes (dated)

2026-11-03 | site | Trip facts system (src/lib/tripfacts.mjs) with Plan Your Visit section, dog/swim/fee FAQs and correct isAccessibleForFree schema; /waterfalls-near hub + NYC and LA pages (indexed, in sitemap, linked from home); post linked from best-time-to-visit-waterfalls.

2026-11-04 | site | Trip facts for 20 more falls (40 total); Waterfalls Near Philadelphia and Seattle hubs; fixed Latourell pass info in the Columbia Gorge post (Oregon State Parks permit since Mar 30, 2026) and linked it to the new fees post.

2026-11-05 | site | Trip facts for 23 more falls (63 total); Waterfalls Near Portland and Atlanta hubs; Ithaca Finger Lakes road-trip post; linked Portland hub from Columbia Gorge post and Ithaca post from fees guide.

## Posts
date | slug | primary keyword | GSC basis
2026-11-03 | columbia-river-gorge-waterfalls-road-trip | columbia river gorge waterfalls | no GSC data (content-gap list: waterfall road trips)
2026-11-04 | waterfall-fees-permits-parking-passes | waterfall fees and parking passes | no GSC data (content-gap list: free vs. paid/permit falls; built from data/trip-facts.json)
2026-11-05 | ithaca-finger-lakes-waterfalls-road-trip | ithaca finger lakes waterfalls | no GSC data (content-gap list: waterfall road trips / Ithaca)
