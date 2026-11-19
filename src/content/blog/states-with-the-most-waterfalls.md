---
title: "Which State Has the Most Waterfalls?"
description: "Oregon has 241 named waterfalls, the most of any U.S. state in the USGS GNIS Falls records. New York is second with 215 and Michigan third with 199."
pubDate: 2026-09-28
updatedDate: 2026-11-19
category: "Data"
imageAlt: "Multnomah Falls, a two-tier waterfall on a basalt cliff in the Columbia River Gorge, Oregon, with the Benson Bridge crossing the lower drop"
faqs:
  - q: "Which state has the most waterfalls?"
    a: "Oregon. The USGS Geographic Names Information System records 241 features classified as Falls in Oregon, more than any other state. New York is second with 215 and Michigan is third with 199. The count is named features only, from the extract committed to this site on October 2, 2026."
  - q: "Which state has the most waterfalls per square mile?"
    a: "Hawaii. It has 99 named falls on 6,423 square miles of land, or 15.41 named falls per 1,000 square miles, using U.S. Census Bureau 2024 Gazetteer land area. New Hampshire is second among the states at 5.47. The District of Columbia is not a state. Its single named fall on 61 square miles would score higher than Hawaii, which is a small-denominator effect."
  - q: "Does Washington or North Carolina have more waterfalls than Oregon?"
    a: "Not in the USGS GNIS Falls class. Washington has 181 named falls, tied with California for fourth. North Carolina has 105 and ranks eighth. Both states are famous for tall, accessible falls. That is a different question from which state has the most named features."
  - q: "How many named waterfalls are in the United States?"
    a: "This extract contains 2,514 features classified as Falls in the 50 states. The District of Columbia adds one more. Delaware has none. Many unnamed drops are not in the file."
  - q: "Which state has the fewest named waterfalls?"
    a: "Delaware has no feature in the Falls class. Florida, Iowa, and North Dakota each have one. We did not give states with fewer than 10 named falls their own count page, because there is not enough of a pattern to write about without padding."
  - q: "How many of these falls have a page on WaterfallsNearYou?"
    a: "681 of the 2,514 named falls in the 50 states have a published page. A page requires at least 25 Google reviews, a sourced trip guide, or at least 200 characters of USGS description or history. The rest are listed by name and coordinates on the state guides."
---

Oregon has the most waterfalls of any U.S. state if the question means named features in the U.S. Geological Survey’s Geographic Names Information System. The Falls class in our copy of that file lists **241 in Oregon**, **215 in New York**, and **199 in Michigan**. California and Washington tie for fourth at 181 each. The 50 states together have **2,514** named falls. This page was updated November 19, 2026, from the extract committed October 2, 2026. The newest feature-edit date stored on those records is December 30, 2020.

That sentence is the whole answer only for this definition. Hawaii has the most named falls per square mile. Niagara, in New York, is the largest by volume. The tallest drops people usually cite are in Hawaii. North Carolina’s Blue Ridge Escarpment has a tighter cluster of famous, hikeable falls than its eighth-place total suggests. The rest of this page is the count, the density, what we actually publish, and why the leaders look the way they do.

<figure>
<img src="/images/blog/most-waterfalls/multnomah-falls.webp" alt="Multnomah Falls, a two-tier waterfall on a basalt cliff in the Columbia River Gorge, Oregon, with the Benson Bridge crossing the lower drop" width="1536" height="2048" />
<figcaption>Multnomah Falls, Oregon. The gorge is famous. It is not why Oregon leads the named count. Photo: <a href="https://commons.wikimedia.org/wiki/File:Multnomah_Falls_1.jpg">Slinkyo</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>, via Wikimedia Commons.</figcaption>
</figure>

## How the count was made

Every number in the ranking comes from files in this repository.

- **Names.** `data/gnis-waterfalls.json` is the feature class Falls from the USGS National Map domestic names, built by `scripts/prepare-gnis.mjs` from the [public domestic-names file](https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames/DomesticNames/DomesticNames_AllStates_Text.zip). One record is one named feature. We did not add Google Maps places to this ranking. The directory on the state guides sometimes includes those extra places, which is why a state guide can show a higher total than the table below.
- **Land area.** `data/state-land-area.json` is the ALAND_SQMI column of the U.S. Census Bureau [2024 Gazetteer national state file](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_state_national.zip), retrieved November 19, 2026. Land area excludes inland water. Density is named falls divided by that land area, times 1,000. The script is `scripts/prepare-state-areas.mjs`.
- **Published pages.** A waterfall page on this site exists when the place has at least 25 Google reviews, a sourced trip guide, or at least 200 characters of USGS description or history. Of the 2,514 named falls, **681** clear that bar.
- **What we left off a separate page.** A state with fewer than 10 named falls does not get a “how many waterfalls are in this state” article. Fourteen states are in that group. Their counts are in the table and in the section at the bottom. The other 36 states each have a page linked from the table.

A companion piece, [waterfall density by state](/blog/waterfall-density-by-state), divides the full directory, including the extra Google listings, by an earlier Census land-area series and by 2020 population. Use that page for a per-resident view. Use this page when the question is the named USGS count.

## The top 10 by named falls

The top 10 states hold 1,548 of the 2,514 named falls, 61.6 percent of the national file. Each name below links to that state’s count page, which breaks the same file out by county.

1. **[Oregon](/blog/how-many-waterfalls-are-in-oregon), 241.** Lane, Douglas, and Marion counties, on the wet west slope of the Cascades, have 73 named falls. Multnomah, Hood River, and Wasco, the Oregon side of the Columbia River Gorge, have 34. The gorge is the famous cluster. The count is larger south of it, in basalt canyons that take Pacific storms all winter. [Multnomah Falls](/oregon/cascade-locks/multnomah-falls) is the most reviewed page we publish. The trail file puts the walk at 2.4 miles round trip. No national park guide of ours currently holds a published Oregon waterfall. The gorge is a national scenic area, covered in the [Columbia River Gorge road trip](/blog/columbia-river-gorge-waterfalls-road-trip).
2. **[New York](/blog/how-many-waterfalls-are-in-new-york), 215.** St. Lawrence County alone has 41 named falls. The eight Finger Lakes counties of Tompkins, Schuyler, Seneca, Yates, Ontario, Cayuga, Steuben, and Chemung have 17 combined. Niagara is a volume record, not the reason for second place. [Taughannock Falls](/new-york/trumansburg/taughannock-falls) and [Kaaterskill Falls](/new-york/palenville/kaaterskill-falls) are the pages people start with. The gorge trail at Taughannock is about 0.75 mile one way.
3. **[Michigan](/blog/how-many-waterfalls-are-in-michigan), 199.** 198 of those names sit in the 15 Upper Peninsula counties, on Canadian Shield rock above Lake Superior. The exception in this file is Ocqueoc Falls in Presque Isle County. Gogebic County leads with 42. [Upper Falls](/michigan/newberry/upper-falls) near Newberry, the drop people call Tahquamenon, is the most reviewed Michigan page we publish.

<figure>
<img src="/images/blog/most-waterfalls/tahquamenon-falls.webp" alt="Tahquamenon Falls, a broad amber waterfall over sandstone in Michigan’s Upper Peninsula" width="1600" height="1040" />
<figcaption>Tahquamenon Falls, Michigan, recorded by USGS as Upper Falls in Luce County. Photo: <a href="https://commons.wikimedia.org/wiki/File:Tahquamenon_Falls_Michigan_Thomas_B._Griffin.jpg">Thomas B. Griffin</a>, public domain, via Wikimedia Commons.</figcaption>
</figure>

4. **[California](/blog/how-many-waterfalls-are-in-california) and [Washington](/blog/how-many-waterfalls-are-in-washington), 181 each.** Mariposa County, which holds Yosemite Valley, has 23 of California’s names. Siskiyou and Shasta together have 27, so the southern Cascades outnumber the valley even though neither county does alone. [Yosemite Falls](/california/yosemite-valley/yosemite-falls) is the tall, easy-to-see one. The park guide is [Yosemite National Park](/national-parks/yosemite). In Washington, Pierce and Lewis counties have 49 named falls, many of them on the Rainier side, against 15 in Skamania County on the gorge. [Snoqualmie Falls](/washington/snoqualmie/snoqualmie-falls) is the most reviewed Washington page. Park guides: [Mount Rainier](/national-parks/mount-rainier) and [Olympic](/national-parks/olympic).
5. **[Montana](/blog/how-many-waterfalls-are-in-montana), 119.** Glacier County has 34. [Glacier National Park](/national-parks/glacier) is the dense piece, not the whole list. [Running Eagle Falls](/montana/north-browning/running-eagle-falls) is 0.3 mile one way in the trail file.
6. **[Maine](/blog/how-many-waterfalls-are-in-maine), 117.** Piscataquis County, the Katahdin high country, has 32. The coast is not the inventory. [Acadia](/national-parks/acadia) contributes Hadlock Falls, one published page.
7. **[North Carolina](/blog/how-many-waterfalls-are-in-north-carolina), 105.** Transylvania, Jackson, and Macon counties, on the Blue Ridge Escarpment, have 46 of them. That is the “waterfall state” people mean, and it is eighth in this file, not first. Start with [Dry Falls](/north-carolina/franklin/dry-falls) and the [Blue Ridge Parkway guide](/blog/blue-ridge-parkway-waterfalls). [Great Smoky Mountains](/national-parks/great-smoky-mountains) holds one published North Carolina fall in our park match.
8. **[Hawaii](/blog/how-many-waterfalls-are-in-hawaii), 99.** Ninth by count, first by density, at 15.41 named falls per 1,000 square miles. Honolulu County, the island of Oahu, has 4. Hawaii County, Kauai, and Maui hold the rest. [Haleakalā](/national-parks/haleakala) has two published falls. [Rainbow Falls](/hawaii/hilo/rainbow-falls) in Hilo is the most reviewed page.
9. **[Pennsylvania](/blog/how-many-waterfalls-are-in-pennsylvania), 91.** Luzerne, Pike, and Monroe counties, the glaciated Pocono plateau, lead. [Dingmans Falls](/pennsylvania/birchwood-lakes/dingmans-falls) is the tall glen people drive to. The USGS text in our file states its height at 130 feet. Most records state no height, so that is not a ranking of the state’s tallest fall.

The height and volume questions live on [the largest waterfalls in the U.S. by state](/blog/largest-waterfalls-in-the-us-by-state), including the [table of well-documented tall falls by state](/blog/largest-waterfalls-in-the-us-by-state#tallest-well-documented-waterfall-in-selected-states). That page is not this count. A state can lead the named list and not appear on the height list.

<figure>
<img src="/images/blog/most-waterfalls/taughannock-falls.webp" alt="Lower Taughannock Falls, a wide cascade on Taughannock Creek in a shale gorge in New York" width="1600" height="1200" />
<figcaption>Lower Taughannock Falls, New York. The state is second by named count because of northern counties, not because of one gorge. Photo: <a href="https://commons.wikimedia.org/wiki/File:Lower_Taughannock_Falls_April_2024.jpg">Awinch1001</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>, via Wikimedia Commons.</figcaption>
</figure>

## Density: named falls per 1,000 square miles

Raw count rewards states with a lot of wet, named country. Density asks how tightly those names are packed. Hawaii is alone at the top. Rhode Island is third on density with only five named falls, because the state has 1,034 square miles of land. We still did not give Rhode Island its own count page. Five names are a list, not a study. The rank belongs in this table so the density answer is not hidden.

| Density rank | State | Named falls | Land area (sq mi) | Per 1,000 sq mi |
|---|---|---:|---:|---:|
| 1 | [Hawaii](/blog/how-many-waterfalls-are-in-hawaii) | 99 | 6,423 | 15.41 |
| 2 | [New Hampshire](/blog/how-many-waterfalls-are-in-new-hampshire) | 49 | 8,954 | 5.47 |
| 3 | [Rhode Island](/states/rhode-island) | 5 | 1,034 | 4.84 |
| 4 | [New York](/blog/how-many-waterfalls-are-in-new-york) | 215 | 47,123 | 4.56 |
| 5 | [Maine](/blog/how-many-waterfalls-are-in-maine) | 117 | 30,845 | 3.79 |
| 6 | [Michigan](/blog/how-many-waterfalls-are-in-michigan) | 199 | 56,611 | 3.52 |
| 7 | [Massachusetts](/blog/how-many-waterfalls-are-in-massachusetts) | 26 | 7,801 | 3.33 |
| 8 | [Vermont](/blog/how-many-waterfalls-are-in-vermont) | 29 | 9,217 | 3.15 |
| 9 | [Washington](/blog/how-many-waterfalls-are-in-washington) | 181 | 66,455 | 2.72 |
| 10 | [Oregon](/blog/how-many-waterfalls-are-in-oregon) | 241 | 95,997 | 2.51 |

Oregon, first by count, is tenth by density. New Hampshire, fifteenth by count, is second by density because the White Mountains put 49 names on a small map. The District of Columbia’s one named fall is Little Falls, on 61.126 square miles of land. That is about 16.36 per 1,000 square miles, above Hawaii. It is not a state, and one name on a federal district is not a waterfall region. It is left out of the 50-state ranks on purpose.

Land areas in the table are rounded to the nearest square mile for reading. The density uses the unrounded ALAND_SQMI value, so 15.41 is 99 divided by 6,422.587, times 1,000.

## All 50 states

Rank is the competition rank: California and Washington share fourth, and Montana is sixth. “Pages we publish” counts only GNIS Falls records that meet the page rule, not extra Google listings. A state name links to its count page when we published one, and to the state guide when we did not.

| Rank | State | Named falls | Per 1,000 sq mi | Density rank | Pages we publish |
|---|---|---:|---:|---:|---:|
| 1 | [Oregon](/blog/how-many-waterfalls-are-in-oregon) | 241 | 2.51 | 10 | 64 |
| 2 | [New York](/blog/how-many-waterfalls-are-in-new-york) | 215 | 4.56 | 4 | 54 |
| 3 | [Michigan](/blog/how-many-waterfalls-are-in-michigan) | 199 | 3.52 | 6 | 55 |
| 4 | [California](/blog/how-many-waterfalls-are-in-california) | 181 | 1.16 | 15 | 56 |
| 4 | [Washington](/blog/how-many-waterfalls-are-in-washington) | 181 | 2.72 | 9 | 39 |
| 6 | [Montana](/blog/how-many-waterfalls-are-in-montana) | 119 | 0.82 | 21 | 19 |
| 7 | [Maine](/blog/how-many-waterfalls-are-in-maine) | 117 | 3.79 | 5 | 9 |
| 8 | [North Carolina](/blog/how-many-waterfalls-are-in-north-carolina) | 105 | 2.16 | 12 | 39 |
| 9 | [Hawaii](/blog/how-many-waterfalls-are-in-hawaii) | 99 | 15.41 | 1 | 17 |
| 10 | [Pennsylvania](/blog/how-many-waterfalls-are-in-pennsylvania) | 91 | 2.03 | 13 | 21 |
| 11 | [Wyoming](/blog/how-many-waterfalls-are-in-wyoming) | 88 | 0.91 | 18 | 14 |
| 12 | [Tennessee](/blog/how-many-waterfalls-are-in-tennessee) | 81 | 1.96 | 14 | 35 |
| 13 | [Colorado](/blog/how-many-waterfalls-are-in-colorado) | 80 | 0.77 | 24 | 22 |
| 14 | [Idaho](/blog/how-many-waterfalls-are-in-idaho) | 64 | 0.77 | 23 | 16 |
| 15 | [New Hampshire](/blog/how-many-waterfalls-are-in-new-hampshire) | 49 | 5.47 | 2 | 15 |
| 16 | [Wisconsin](/blog/how-many-waterfalls-are-in-wisconsin) | 48 | 0.89 | 19 | 18 |
| 17 | [Alaska](/blog/how-many-waterfalls-are-in-alaska) | 46 | 0.08 | 43 | 17 |
| 18 | [Minnesota](/blog/how-many-waterfalls-are-in-minnesota) | 41 | 0.51 | 28 | 13 |
| 18 | [Virginia](/blog/how-many-waterfalls-are-in-virginia) | 41 | 1.04 | 17 | 14 |
| 20 | [Alabama](/blog/how-many-waterfalls-are-in-alabama) | 37 | 0.73 | 25 | 11 |
| 21 | [Texas](/blog/how-many-waterfalls-are-in-texas) | 30 | 0.11 | 37 | 4 |
| 22 | [Vermont](/blog/how-many-waterfalls-are-in-vermont) | 29 | 3.15 | 8 | 6 |
| 23 | [Georgia](/blog/how-many-waterfalls-are-in-georgia) | 28 | 0.49 | 29 | 16 |
| 24 | [Arizona](/blog/how-many-waterfalls-are-in-arizona) | 26 | 0.23 | 35 | 8 |
| 24 | [Massachusetts](/blog/how-many-waterfalls-are-in-massachusetts) | 26 | 3.33 | 7 | 12 |
| 24 | [Oklahoma](/blog/how-many-waterfalls-are-in-oklahoma) | 26 | 0.38 | 32 | 2 |
| 27 | [South Carolina](/blog/how-many-waterfalls-are-in-south-carolina) | 25 | 0.83 | 20 | 8 |
| 28 | [Utah](/blog/how-many-waterfalls-are-in-utah) | 22 | 0.27 | 33 | 10 |
| 29 | [Indiana](/blog/how-many-waterfalls-are-in-indiana) | 21 | 0.59 | 27 | 4 |
| 30 | [Ohio](/blog/how-many-waterfalls-are-in-ohio) | 18 | 0.44 | 30 | 9 |
| 31 | [Kentucky](/blog/how-many-waterfalls-are-in-kentucky) | 17 | 0.43 | 31 | 5 |
| 32 | [West Virginia](/blog/how-many-waterfalls-are-in-west-virginia) | 16 | 0.67 | 26 | 7 |
| 33 | [New Mexico](/blog/how-many-waterfalls-are-in-new-mexico) | 14 | 0.12 | 36 | 3 |
| 34 | [Arkansas](/blog/how-many-waterfalls-are-in-arkansas) | 12 | 0.23 | 34 | 5 |
| 35 | [Connecticut](/blog/how-many-waterfalls-are-in-connecticut) | 11 | 2.27 | 11 | 6 |
| 35 | [Maryland](/blog/how-many-waterfalls-are-in-maryland) | 11 | 1.13 | 16 | 5 |
| 37 | [Nebraska](/states/nebraska) | 8 | 0.10 | 39 | 3 |
| 37 | [Nevada](/states/nevada) | 8 | 0.07 | 44 | 3 |
| 39 | [South Dakota](/states/south-dakota) | 7 | 0.09 | 40 | 4 |
| 40 | [Illinois](/states/illinois) | 6 | 0.11 | 38 | 1 |
| 40 | [Missouri](/states/missouri) | 6 | 0.09 | 41 | 5 |
| 40 | [New Jersey](/states/new-jersey) | 6 | 0.82 | 22 | 2 |
| 43 | [Rhode Island](/states/rhode-island) | 5 | 4.84 | 3 | 1 |
| 44 | [Mississippi](/states/mississippi) | 4 | 0.09 | 42 | 1 |
| 45 | [Kansas](/states/kansas) | 3 | 0.04 | 46 | 1 |
| 45 | [Louisiana](/states/louisiana) | 3 | 0.07 | 45 | 1 |
| 47 | [Florida](/states/florida) | 1 | 0.02 | 47 | 1 |
| 47 | [Iowa](/states/iowa) | 1 | 0.02 | 48 | 0 |
| 47 | [North Dakota](/states/north-dakota) | 1 | 0.01 | 49 | 0 |
| 50 | Delaware | 0 | 0.00 | 50 | 0 |

Wyoming through Maryland, ranks 11 through 35, are the middle of the file and each has its own page. A few patterns are worth pulling out before the bottom of the list. [Wyoming](/blog/how-many-waterfalls-are-in-wyoming) puts 46 of its 88 names in Teton County. [Yellowstone](/national-parks/yellowstone) and [Grand Teton](/national-parks/grand-teton) are the park pages. [Tennessee](/blog/how-many-waterfalls-are-in-tennessee) is a Cumberland Plateau count more than a Smokies count. Coffee County leads. [Great Smoky Mountains](/national-parks/great-smoky-mountains) still has five published Tennessee falls. [Colorado](/blog/how-many-waterfalls-are-in-colorado) leads with Larimer County, the east side of [Rocky Mountain National Park](/national-parks/rocky-mountain). [Alaska](/blog/how-many-waterfalls-are-in-alaska) has 46 names on 571,242 square miles, 0.08 per 1,000. The mountains are full of water that nobody entered as a Falls feature. The named list sits on the ferry and road system, Juneau and the Chugach among it.

## The bottom of the list

These 14 states have fewer than 10 named falls. A separate article would have been a template with the geology paragraph stretched over one or two names. The names are here instead. Delaware has no state guide because the directory has nothing to list.

**Delaware, 0.** The coastal plain has no Falls-class record. There is no `/states/delaware` page.

**Florida, Iowa, and North Dakota, 1 each.** Florida’s name is Falling Water, in Washington County. The peninsula is low and the limestone is porous, so streams disappear instead of dropping off a lip. Iowa’s name is Black Falls, in Winneshiek County, on the Driftless edge where a little bedrock still sticks out of the glacial cover. North Dakota’s name is Mineral Springs Falls, in Ransom County. The glaciated plains do not keep a ledge. Iowa and North Dakota have no published page. Florida has one.

**Kansas, 3, and Louisiana, 3.** Kansas has Butcher Falls and Osro Falls in Chautauqua County and Kansas Falls in Geary County. Louisiana has Kisatchie Fall and Odum Falls in Natchitoches Parish and Woodriff Falls in West Feliciana Parish. Soft coastal-plain sediment does not hold a waterfall the way a sandstone cap does.

**Mississippi, 4.** Dunns Falls, Rocky Falls, Scutchalo Falls, and Seminary Falls, each in a different county. There is no cluster.

**Rhode Island, 5.** Albion Falls, Pawtucket Falls, and Woonsocket Falls are in Providence County. Horseshoe Falls and Stepstone Falls are in Washington County. Several of those are mill ledges on rivers, which is what a small, glaciated, industrial state names. The density rank is real. The inventory is still five names, so the page stops here. One of them has a published guide.

**Illinois, 6, Missouri, 6, and New Jersey, 6.** Illinois spreads from Burden Falls in Pope County, in the Shawnee hills, to the Great Falls of the Illinois River at LaSalle. Missouri’s Ozark names include Mina Sauk Falls in Iron County and Rocky Falls in Shannon County. Five of the six Missouri names have a published page, which is why the [Missouri guide](/states/missouri) is the useful page and a count article would not add a pattern. New Jersey’s six include Passaic Falls, the Great Falls of the Passaic at Paterson, where the river crosses the Watchung basalt. Warren County has two of the six. The state is small, the density rank is 22nd, and the named list is still short.

**South Dakota, 7.** Lawrence and Pennington counties, the Black Hills, hold Bridal Veil, Roughlock, Spearfish, Grizzly Bear, and Thunderhead. Sioux Falls in Minnehaha County is a prairie-river name, not part of that hills cluster. Cascade Falls is in Fall River County.

**Nebraska, 8, and Nevada, 8.** Seven of Nebraska’s eight are in Cherry County, on the Niobrara: Berry, Big, Fort, Horseshoe, Smith, Snake River, and Tyler Falls. Rock Falls is the Holt County exception. That is a real cluster, and it is still eight names on a plains river. Nevada’s eight are scattered across Clark, Nye, Washoe, Lander, Churchill, and Lincoln counties. Dry ranges produce a named drop where a storm or a spring happens to persist. They do not produce a county with dozens.

West Virginia is the instructive case just above the gate, with 16 named falls and its own page. The state is steep from end to end and the Falls class is still modest. Relief is not the same thing as a federal name. Alaska is the large version of that lesson. Florida is the flat version.

## Why the leaders have so many

The top of the file is not one geology. It is four, and the county counts separate them.

**Basalt and a wet west slope.** Oregon and Washington share the Columbia River Basalt and the Cascade volcanoes. Hard flows over softer beds give a stream a lip. West of the crest, Pacific storms and a deep snowpack keep the streams running. East of the crest the named list thins, which is why Oregon’s lead is Lane, Douglas, and Marion, not the dry side. The Missoula Floods steepened the gorge walls and left side creeks hanging. That is the 34 names in the three gorge counties, a famous minority of Oregon’s 241.

**Ice on old rock in the north.** New York, Michigan, Maine, New Hampshire, Wisconsin, and Minnesota were under ice. The ice plucked ledges and left drainage that does not match the old valleys. In Michigan the ledges are Shield rock, and 198 of 199 names are in the Upper Peninsula. In Minnesota the same idea is the North Shore: Lake, St. Louis, and Cook counties, where rivers fall off the basalt rim into the basin the ice deepened. In New York the ice explains both the Finger Lakes gorges and the much larger named pile in St. Lawrence and Essex counties. People remember the gorges they can park beside. The file remembers every named brook.

**Hanging valleys in the western ranges.** California, Montana, Wyoming, Idaho, and Colorado get many of their names from glaciers that deepened a main valley and left the side creek in the air. Yosemite is the diagram. It is also 23 names in one county, not 181. Washington’s Rainier side, Pierce and Lewis, is the same pattern in andesite and a heavier snowpack, and it outnumbers the Washington gorge.

**An escarpment with a wet climate.** North Carolina, Tennessee, Georgia, and South Carolina share the southern Appalachians, and they do not share one count. North Carolina owns more of the Blue Ridge Escarpment, where the plateau ends and creeks fall toward the Piedmont in a few miles of gorge. Transylvania County has 21 names. South Carolina owns the bottom of that same drop and has 25 in the whole state, almost all of them in Greenville and Oconee counties. Tennessee’s larger share is the Cumberland Plateau sandstone cap, Coffee County first, not the Smokies. Alabama is the last of that plateau, DeKalb County first, and then the coastal plain takes over and the names stop.

**Young volcanoes and trade winds.** Hawaii is the density champion because the islands are small and the windward slopes are wet. Streams fall off valley walls that are geologically young. Oahu has four named falls in this file. The other islands have the rain and the relief.

Flat country fails the test for a simple reason. A waterfall needs a lip that lasts. The coastal plains, the glacial till of the Midwest, and the dry basins do not keep one. Where a caprock or a bluff escapes the ice, a few names appear, which is Jefferson County in Indiana and the Arbuckle Mountains in Murray County, Oklahoma. Those are local explanations, and the totals stay small.

## What “the most” is allowed to mean

People argue because they are counting different things. This file answers one of them.

- **Named features in GNIS.** Oregon, 241. Consistent nationwide. Blind to beauty, height, flow, and whether you can legally stand there. Also blind to drops nobody named. Alaska’s 46 is the clearest example.
- **Named falls per square mile.** Hawaii, 15.41 per 1,000 square miles. New Hampshire second. Oregon falls to tenth.
- **Tallest.** The [largest-waterfalls roundup](/blog/largest-waterfalls-in-the-us-by-state) puts Oloʻupena Falls in Hawaii first, and it says the height has never been formally surveyed. Height leaders are not count leaders.
- **Volume.** The same roundup puts Niagara first by a treaty minimum of 100,000 cubic feet per second in the tourist-season daytime, and Willamette Falls in Oregon second. One river does not make a state first in a count of names.
- **Famous and hikeable.** North Carolina, Washington, and Oregon all win this argument in different towns. Transylvania County feels like the most waterfalls because several tall ones sit near parking. Pierce County has more named falls than Skamania and less of the postcard. Our published-page column is closer to this meaning than the raw count is: California has 56 published pages from 181 names, North Carolina 39 from 105, Oregon 64 from 241. Even then, a page means we had reviews or a USGS write-up, not that a ranger ranked it.

If a list online gives Washington, Oregon, North Carolina, New York, or Hawaii as the winner, ask what was counted. A hobby catalog that includes unnamed drops, a tourism bureau counting only public trailheads, and a federal gazetteer of named features will not agree. We are not reprinting those other totals, because we did not recompute them. The number we can recompute is the one in the table.

## Using the table

Open the count page for any state at rank 35 or above. It has the county table, the published links, the trails we can measure, and the national parks whose boundaries contain a published fall. The state guide, linked from ranks 37 through 47, lists the few names with coordinates. Delaware has nowhere to send you.

For a trip rather than a ranking, the practical starts are still the published pages: [Multnomah Falls](/oregon/cascade-locks/multnomah-falls), [Yosemite Falls](/california/yosemite-valley/yosemite-falls), [Snoqualmie Falls](/washington/snoqualmie/snoqualmie-falls), [Kaaterskill Falls](/new-york/palenville/kaaterskill-falls), and [Dry Falls](/north-carolina/franklin/dry-falls). Seasons and closures are on those pages and on the count pages, not in this ranking. A named fall is a point in a federal file. It is not a promise that the trail is open.
