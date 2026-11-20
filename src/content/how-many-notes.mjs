// Original prose for the "How many waterfalls are in [state]?" pages.
// Numbers (counts, ranks, trail lengths, heights) are not stored here.
// They are computed in src/lib/how-many.mjs from the GNIS extract.
// Each entry has to mention that state's leading GNIS county by its recorded name.

export const HOW_MANY_NOTES = {
  oregon: {
    geology: [
      'Oregon’s lead is a western Cascade count, not a Columbia River Gorge count. Lane, Douglas and Marion counties, on the wet west slope of the Cascades, hold more named falls than Multnomah, Hood River and Wasco put together. Those three gorge counties are where the famous roadside drops sit. The larger named inventory is upstream and south, in forested canyons cut through stacked basalt.',
      'The rock is the Columbia River Basalt Group and the younger Cascade lavas: hard flows with softer beds between them, so streams fall off a ledge instead of rasping an even slope. East of the crest the climate flips. The Deschutes side is in the rain shadow, and named falls thin out even though rimrock still makes an occasional drop after snowmelt. The Coast Range adds another wet set, fed by Pacific storms rather than by a high snowpack.',
    ],
    season: 'West of the Cascades, rain does most of the work from November through May, which is when Gorge and Coast Range falls look fullest. High Cascade falls such as Sahalie and Koosah ride snowmelt and often peak later, into early summer, after the low-elevation rain falls have already started to shrink. Late summer is the dry season. Smaller creeks thin out, and some higher roads are the ones that were still closed in June.',
    faq: {
      q: 'Does the Columbia River Gorge account for Oregon’s lead?',
      a: 'No. The Gorge is the famous cluster, and it is dense with tall basalt falls along the Historic Columbia River Highway, but Lane, Douglas and Marion counties each record more named falls than Multnomah County. Oregon leads the country because the west-side Cascades add a much larger named inventory on top of the Gorge.',
    },
    also: [{ href: '/blog/columbia-river-gorge-waterfalls-road-trip', label: 'Columbia River Gorge waterfall road trip' }],
  },
  'new-york': {
    geology: [
      'New York is second, and the reason is not Niagara. St. Lawrence County alone holds the state’s biggest block of named falls, with Essex County next, along the Adirondack side. The Finger Lakes gorges that visitors drive to, Taughannock, Ithaca, Watkins Glen, are real and spectacular, and they are a smaller share of the named count than the northern counties.',
      'Ice did the rearranging. The last ice sheet gouged the Finger Lakes troughs, left side streams hanging, and scraped the Adirondack and Tug Hill uplands down to ledges. Streams then cut those ledges into the glens and flumes that dominate the gazetteer. Niagara is a different object: a high-volume river on a dolomite cap, one complex rather than a crowd of named creeks. Treat “most waterfalls” and “largest waterfall” as separate questions. New York can be near the top of both, for different reasons.',
    ],
    season: 'Creek falls across the state usually look strongest from snowmelt and spring rain, roughly late March into May, before the forest canopy closes. Gorge trails in the Finger Lakes can be icy in early spring and closed when rock is unstable. Niagara runs all year because the river is regulated, not because of local snowpack. Adirondack brooks stay high later than the Hudson Valley.',
    faq: {
      q: 'Is New York’s waterfall count mostly Niagara and the Finger Lakes?',
      a: 'No. Niagara is a single high-volume complex, and the famous Finger Lakes gorges are a modest share of the named list. St. Lawrence County has the most named falls in the state, and Essex County is second. The count is a northern and Adirondack story as much as a gorge-tourism story.',
    },
    also: [{ href: '/blog/ithaca-finger-lakes-waterfalls-road-trip', label: 'Ithaca and Finger Lakes waterfall road trip' }],
  },
  michigan: {
    geology: [
      'Michigan’s named falls are an Upper Peninsula inventory. Gogebic, Marquette, Baraga, Ontonagon and Alger counties, on the Canadian Shield, account for most of the list. The rock is old and uneven: basalt, conglomerate, sandstone and other resistant beds that streams have not graded into a smooth profile. Rivers running toward Lake Superior still hit those steps.',
      'The Lower Peninsula was glaciated too, but the bedrock there is younger and softer and the relief is lower, so a stream usually slides instead of dropping. In this extract the Lower Peninsula exception is Ocqueoc Falls in Presque Isle County. Pictured Rocks country around Munising, the Black River harbor falls in Gogebic County, and Bond Falls on the Ontonagon side are the places where that Shield geology is easy to see.',
    ],
    season: 'Upper Peninsula falls are a late-spring sight. Snow holds in the north, and the strongest flows often come in April and May, with black flies arriving as the melt finishes. Larger rivers still run in summer. By winter many of the same drops freeze into ice curtains, and some forest roads are not plowed. The Lake Superior shore stays cool even in July.',
    faq: {
      q: 'Are Michigan’s waterfalls in the Lower Peninsula?',
      a: 'Almost none of the named ones are. The gazetteer places them in Upper Peninsula counties, on old Shield rock above Lake Superior. Ocqueoc Falls in Presque Isle County is the Lower Peninsula name in this extract.',
    },
  },
  california: {
    geology: [
      'California is tied with Washington for fourth, and the named falls are not only Yosemite. Mariposa County, which holds Yosemite Valley, is the largest single county count, which is exactly what hanging-valley geology predicts: glaciers deepened the Merced canyon and left Bridalveil, Yosemite, Vernal and Nevada falling from the rims. Siskiyou and Shasta counties add a second, wetter cluster in the southern Cascades, including Burney Falls, where basalt and spring water matter more than Sierra granite.',
      'The rest of the state is a thin scatter. The Coast Ranges and the Transverse Ranges have some named drops, McWay on the Big Sur coast among them, but southern California’s named list is short because the climate does not keep small creeks running. A Sierra county can record a fall that flows hard for six weeks and is a stain on the rock by August. That still counts in GNIS if someone named it.',
    ],
    season: 'Sierra and Yosemite falls track the snowpack. The National Park Service’s own description of Yosemite Falls puts the strong season from about November through July, with a May peak, and several valley walls are dry by late summer. Burney Falls is the exception people notice: it is spring-fed and stays comparatively steady. Coast Range falls such as McWay and Alamere follow winter rain more than June snowmelt.',
    faq: {
      q: 'Are California’s named waterfalls mostly in Yosemite?',
      a: 'Mariposa County, where Yosemite Valley sits, has the state’s largest county count, and several of the tall granite falls are there. It is not the whole state. Siskiyou and Shasta counties add a large Cascade cluster, and named falls continue south through the Sierra into Tulare County. Southern California has very few by comparison.',
    },
  },
  washington: {
    geology: [
      'Washington ties California, and Pierce County, not the Columbia Gorge, holds the most names. Pierce and Lewis counties cover much of the Mount Rainier side of the Cascades, where glaciers and a huge snowpack cut valleys into andesite and left creeks dropping off the walls. Skamania County, on the Washington side of the Gorge, is a real cluster of basalt falls, and it is smaller than the Rainier counties in this file.',
      'The Olympics are the other half of the recipe: steep, wet, and close to the ocean, which is why Marymere and the north-slope falls behave like a rainforest rather than like an east-side coulee. Cross the crest and the named list thins. Palouse Falls is the famous exception, a plunge over flood-carved basalt in a dry canyon, not a Cascade snowmelt creek.',
    ],
    season: 'The west side is a winter-rain and spring-snowmelt coast. Low-elevation falls in the Gorge and along the Mountain Loop Highway run hard from late fall through spring. Rainier’s waterfalls and the high trails often are not reachable until the roads open, commonly late May or June, and then they ride meltwater into midsummer. East-side falls such as Palouse depend on a river with a distant headwater, so they do not follow the Seattle rain calendar.',
    faq: {
      q: 'Does Washington have more waterfalls than Oregon?',
      a: 'Not in the USGS GNIS Falls class. Washington is tied with California, behind Oregon, New York and Michigan. The Columbia Gorge and the North Cascades make Washington look waterfall-rich, and it is, but Oregon’s west-side Cascade counties record more named falls.',
    },
  },
  montana: {
    geology: [
      'Montana’s named falls sit in the western third of the state, where the northern Rockies break into separate ranges. Glacier County leads, which matches the map: Glacier National Park’s hanging valleys and U-shaped troughs are full of named creeks. Gallatin and Flathead counties add the next blocks, around the Yellowstone high country and the Flathead basin.',
      'East of the mountains the plains have almost nothing to drop over. The streams that do fall are snow-fed and short. Kootenai Falls on the Kootenai River is the high-volume exception people drive to, a river drop rather than a cirque trickle. Winter snowpack is the water source. A dry winter shows up the next June as a thin fall in a valley that still looks alpine.',
    ],
    season: 'Going-to-the-Sun Road and the high trails in Glacier set the practical season more than the calendar does. Many park falls are not approachable until late June or July, and that is also when snowmelt is still strong. Lower river falls such as Kootenai run earlier and longer. By September the high creeks have dropped and some park roads are near closing.',
    faq: {
      q: 'Are Montana’s waterfalls mostly in Glacier National Park?',
      a: 'Glacier County has the most named falls, and several published pages sit inside the park boundary. The gazetteer also records sizable groups in Gallatin, Flathead and Lincoln counties, so the park is the densest piece of a wider Rocky Mountain pattern, not the entire count.',
    },
  },
  maine: {
    geology: [
      'Maine is seventh, which surprises people who picture a low coastal state. The interior is not low. Piscataquis County, covering the high Katahdin country, holds the most named falls, then Oxford County on the New Hampshire border. The bedrock is old: granite, slate and other metamorphic rock worn into plateaus, then scoured by an ice sheet that covered the whole state.',
      'When the ice left, rivers reoccupied valleys that no longer matched the old drainage, and they still fall off ledges that the ice plucked clean. Rumford Falls is the tall industrial drop on the Androscoggin. Most of the other names are brook falls in spruce woods, a long drive from the coast. Acadia’s published fall, Hadlock, is a coastal-mountain exception, not the center of the count.',
    ],
    season: 'Mud season and high water arrive together. April and May usually bring the strongest flows and the worst unpaved roads. Higher trails around Katahdin stay snowed in later than the Oxford County swimming holes. By late summer many of the smaller slate ledges are a trickle. Fall color in late September and early October is the dry, pretty window.',
    faq: {
      q: 'Are Maine’s waterfalls on the coast?',
      a: 'A few are near the coast, including Hadlock Falls in Acadia. The named count is inland. Piscataquis and Oxford counties lead, in the high interior and along the New Hampshire line, not on the Atlantic shore.',
    },
  },
  'north-carolina': {
    geology: [
      'North Carolina is the state people name when they mean “waterfall country,” and in this file it is eighth, not first. The names are packed against the state line. Transylvania County leads, then Jackson and Macon, which is the Blue Ridge Escarpment: the plateau ends and rivers drop off the Blue Ridge into the Piedmont over a few miles of gorge. That is why Transylvania County has a reputation out of proportion to a mid-size state total.',
      'East of the escarpment the Piedmont and the coastal plain barely appear in the Falls class. The rock on the escarpment is old metamorphic rock, wet enough that the creeks keep their names in the gazetteer. Great Smoky Mountains National Park holds some of those names on the Tennessee line, but the big named cluster in this extract is the escarpment counties south of the park, not the park alone.',
    ],
    season: 'The escarpment is one of the wettest parts of the East, so falls run in every month, with the fullest creeks from winter rain through May. Summer thunderstorms refill them for a day and then the humidity stays. October color on the Parkway is the crowded season, and a dry fall will show on the smaller drops even while Looking Glass and Whitewater still have a respectable flow.',
    faq: {
      q: 'Does North Carolina have the most waterfalls?',
      a: 'Not by the USGS named-falls count. North Carolina is eighth. It leads a different conversation: a tight cluster of tall, accessible escarpment falls in Transylvania, Jackson and Macon counties. That is a density of famous falls, not the largest statewide inventory.',
    },
    also: [{ href: '/blog/blue-ridge-parkway-waterfalls', label: 'Blue Ridge Parkway waterfalls' }],
  },
  hawaii: {
    geology: [
      'Hawaii is ninth by count and first by a wide margin once you divide by land area. The named falls are split across the four counties that are the islands: Hawaii County, Kauai and Maui hold almost all of them, and Honolulu County, which is Oahu, has only a handful. The pattern is windward. Trade winds hit the volcanoes, drop rain on the northeast slopes, and the streams fall off valley walls that are only a few hundred thousand years old.',
      'Kauai’s counts are high for its size because the island is older and more deeply eroded than the Big Island’s active slopes. Waimea Canyon and the Na Pali coast are incised valleys, not a single cliff. The Big Island adds tall valley-head falls on the windward Kohala and Hamakua coasts, many of them on private land or at the end of a road that floods. Named, in this file, is not the same as legally reachable.',
    ],
    season: 'Windward falls run in every month because the trades do not take a season off. They are fullest when a winter storm or a passing low sits on the islands, and they drop within a day when the ridge to windward goes quiet. Flash floods are the planning problem, not a spring melt calendar. Leeward slopes can be dry in the same hour a windward fall is in flood.',
    faq: {
      q: 'Does Hawaii have the most waterfalls?',
      a: 'Hawaii has the most named falls per 1,000 square miles, and it does not have the most named falls. Oregon, New York, Michigan, California and Washington all record more names. Hawaii’s rank flips as soon as the question becomes density rather than a raw total.',
    },
  },
  pennsylvania: {
    geology: [
      'Pennsylvania’s named falls cluster in the glaciated northeast. Luzerne County leads, then Pike and Monroe, the Pocono plateau where the last ice sheet stopped, deranged the drainage, and left creeks falling off the sandstone edge of the Allegheny Plateau. Ricketts Glen, Dingmans and Bushkill are the visited version of that geology. The gazetteer has many more names in the same counties that never became a park brochure.',
      'South and west of the glacial limit the plateau is still dissected, but the falls are fewer. The Youghiogheny at Ohiopyle is a river rapid and drop in Fayette County, a different kind of feature from a Pocono glen. The state’s rank, tenth, comes from the northeast counties, not from a statewide carpet of falls.',
    ],
    season: 'March through May is the reliable window: snowmelt off the plateau plus spring rain. Pocono and Ricketts Glen trails are at their best then and at their most crowded on warm weekends. Summer leaves the smaller glens dependent on a recent storm. Winter ice is a reason some glen trails close, not a reason to scramble the closed ones.',
    faq: {
      q: 'Are Pennsylvania’s waterfalls mostly in the Poconos?',
      a: 'The named count is. Luzerne, Pike and Monroe counties lead the state, on the glaciated Pocono plateau. Western Pennsylvania has a shorter list, with the Youghiogheny drops around Ohiopyle as the best-known exception.',
    },
  },
  wyoming: {
    geology: [
      'Wyoming’s named falls are a mountain-island count on a dry map. Teton County holds about half of them by itself, which is Yellowstone’s southern half and the Tetons: a volcanic plateau and a fault-block range, both heavily glaciated, with creeks falling out of cirques. Park County is second, covering the rest of Yellowstone’s famous canyon, including the Upper and Lower Falls of the Yellowstone.',
      'The basins between the ranges are high and dry and contribute almost nothing. Sublette and Fremont counties pick up the Wind River side. A named fall in Wyoming is usually a snowmelt drop at the head of a canyon, not a river that runs all summer. The Lower Falls of the Yellowstone is the exception that carries real volume, and it is one name, not the reason the state ranks eleventh.',
    ],
    season: 'Yellowstone’s roads open in stages, often from late April into late May, and the canyon falls are already running on meltwater when the plows finish. High Teton and Wind River trails come later, commonly late June, which is also when the snowpack is still feeding them. By August the small cirque falls have dropped. September is quieter and lower.',
    faq: {
      q: 'Are Wyoming’s waterfalls all in Yellowstone?',
      a: 'Teton and Park counties, which cover Yellowstone and the Tetons, hold most of the named falls. They do not hold all of them. Sublette, Fremont and Big Horn counties add named falls in the Wind River Range and the Bighorns.',
    },
  },
  tennessee: {
    geology: [
      'Tennessee’s count is a plateau count with a mountain tail. Coffee County, on the western Cumberland Plateau, leads the named list. The plateau is capped by hard sandstone and conglomerate. Streams cross the cap and drop into shale gorges, which is the shape of Fall Creek Falls, Cummins and Burgess. Rhea and Van Buren counties repeat that pattern farther east along the same escarpment.',
      'Sevier County is the Smokies share: fewer names than the plateau counties, and several of them inside Great Smoky Mountains National Park, where the rock is older and the trails are longer. People who only know Laurel Falls and Rainbow Falls in the park are seeing the mountain edge of a list that is larger on the plateau.',
    ],
    season: 'The plateau and the Smokies are wettest from winter into spring, so January through May is when the gorges look fullest. Summer thunderstorms refill a cove for an afternoon. A dry September shows up first on the smaller plateau creeks. Fall color in the Smokies arrives while the plateau is still warm, and both are busy on October weekends.',
    faq: {
      q: 'Are Tennessee’s waterfalls mostly in the Smokies?',
      a: 'The Smokies hold several of the famous trail falls, and Great Smoky Mountains National Park has a group of published pages. The larger named count is on the Cumberland Plateau. Coffee County leads the state, which is plateau country, not the park.',
    },
  },
  colorado: {
    geology: [
      'Colorado’s named falls follow the snow, and the snow follows the Front Range and the high parks. Larimer County leads, then Boulder County: the east side of Rocky Mountain National Park and the foothill canyons north of Denver. Glaciers left hanging valleys and steep troughs. The creeks that drain them are short, cold and strongly seasonal.',
      'Garfield County, farther west, is a different rock: canyon country where a stream can fall over a ledge and, at Rifle Falls, over travertine. The San Juans and the Elk Mountains add names in small batches. The eastern plains do not. A Colorado “waterfall county” is almost always a county that includes a piece of the Continental Divide or a deep canyon cut into it.',
    ],
    season: 'Foothill falls often peak in May. Falls inside Rocky Mountain National Park and the San Juans usually peak later, from early June into July, and the trails that reach them may still be snowbound on the first of those months. Afternoon lightning is the summer constraint above treeline. By September the high creeks are down and the aspens are the reason to go.',
    faq: {
      q: 'Which part of Colorado has the most named waterfalls?',
      a: 'Larimer County has the most, with Boulder County next. That is the Front Range and the east side of Rocky Mountain National Park, not the Western Slope and not the plains. Western counties such as Garfield have real falls, and fewer names.',
    },
  },
  idaho: {
    geology: [
      'Idaho splits into two waterfall regions that should not be averaged together. The south is the Snake River Plain, a stack of basalt flows. Twin Falls County leads the named count because the Snake has cut a canyon through that stack: Shoshone Falls and the smaller drops around it are ledge falls on a river, not mountain brooks. North of the plain, the Panhandle is wetter, glaciated, and closer to the Columbia forests. Bonner and Boundary counties pick up that share.',
      'The central mountains, the Sawtooths and the Salmon River country, have the relief and not the road network. Idaho County’s names are often a long gravel drive from a town. The state’s rank sits in the middle of the national list because both the basalt plain and the wet north contribute, and neither one is as large as Oregon’s west-side Cascade inventory.',
    ],
    season: 'Shoshone Falls is the date everyone can check: it usually runs fullest from about April into early June, and irrigation withdrawals upstream can cut it back later in the summer even when the weather is fine. Panhandle falls peak with melt in May and June. Central Idaho trailheads often are not open until late June. A July trip can be perfect in the Panhandle and disappointing at Shoshone in a dry, heavily diverted year.',
    faq: {
      q: 'Is Shoshone Falls why Idaho has so many named waterfalls?',
      a: 'Shoshone Falls is why Twin Falls County leads the state, and it is one river canyon, not dozens of falls. The rest of the count is split between the wet Panhandle and the central mountain counties. Idaho’s total is those regions added together.',
    },
  },
  'new-hampshire': {
    geology: [
      'New Hampshire ranks high for its size because the White Mountains are a small, steep, heavily glaciated range with a long habit of naming every brook that falls off a notch. Grafton County leads, then Coos. Crawford, Franconia and Pinkham notches are glacial valleys. The side brooks come in high and drop over schist and granite that the ice plucked into steps.',
      'South of the Whites the named list thins quickly. The Merrimack valley has mills and ledges, not a second White Mountain inventory. The state’s density rank is what makes New Hampshire look bigger than its raw total: a few dozen names on a small land area, concentrated in two northern counties.',
    ],
    season: 'April through early June is the usual peak, snowmelt in the notches plus spring rain. The lower brooks peak first. The high ones in Franconia and Pinkham are still running hard in June, which is also when the trails dry out enough to be pleasant. By August many of the named falls are a thin sheet unless a storm has just crossed the range. Fall color in late September is colder water and fewer bugs.',
    faq: {
      q: 'Are New Hampshire’s waterfalls all in the White Mountains?',
      a: 'Most of the named ones are. Grafton and Coos counties, which cover the Whites, lead the state. Southern New Hampshire has a short list by comparison, which is why the state ranks much higher per square mile than it does by raw count.',
    },
  },
  wisconsin: {
    geology: [
      'Most of Wisconsin was planed by ice into country that does not make waterfalls. The names that exist are in the north, on the Canadian Shield. Marinette County leads, then Menominee, along the northeast edge where rivers still drop off hard volcanic rock toward Green Bay and the Menominee River. Douglas County adds a smaller Lake Superior shore group.',
      'South of the Shield the glacial deposits bury the old ledges. A named fall in the south is an oddity, not a pattern. The state’s total looks modest next to Michigan’s Upper Peninsula because Wisconsin only owns a strip of that same rock, along its northern border, rather than a whole peninsula of it.',
    ],
    season: 'April and May are the peak, when the northern snowpack melts and the Shield rivers come up. Black flies arrive with the end of that melt. Summer is lower and warmer, and the sandstone and basalt ledges are still slippery. Winter ice on the Marinette County drops is a local season of its own, and the roads that reach them are not all plowed for sightseeing.',
    faq: {
      q: 'Where in Wisconsin are the named waterfalls?',
      a: 'In the north. Marinette County has the most, Menominee County is next, and a smaller group sits in Douglas County on Lake Superior. Southern Wisconsin was glaciated into low relief and has very few named falls.',
    },
  },
  alaska: {
    geology: [
      'Alaska has fewer named falls than Maine, which is the opposite of what the relief suggests. Juneau and the Chugach census area lead a short list. The coast ranges fall straight into fjords, glaciers leave hanging valleys, and the rain is heavy. The gazetteer still records only a few dozen names because most of those drops were never named in a federal file. A count of named features measures mapping and settlement as well as geology.',
      'What is named clusters on the road and ferry system: Juneau, the Chugach, Prince of Wales, Skagway. The Alaska Range and the Brooks Range are full of unnamed water and almost empty of Falls-class records. Katmai National Park has published pages where a named fall happens to sit inside the boundary. That is a handful of records, not a statewide inventory.',
    ],
    season: 'The practical season is late May into September. Southcentral snowmelt is strongest in late May and June. Glacier-fed creeks keep running later, and they are silty and extremely cold. Coastal trails around Juneau can be raining in any of those months. Outside that window, roads, ferries and daylight all get harder, and a named fall you cannot reach does not belong on a weekend plan.',
    faq: {
      q: 'Why doesn’t Alaska have the most named waterfalls?',
      a: 'Because this ranking counts names in the USGS Falls class, not every drop in the mountains. Alaska’s coast ranges and glaciers produce vast numbers of falls that were never entered as a named feature. The named list is short and clustered on the accessible coast.',
    },
  },
  minnesota: {
    geology: [
      'Minnesota’s named falls are a North Shore count. Lake County leads, then St. Louis and Cook, the three counties along Lake Superior. The rock is a stack of ancient lava from the Midcontinent Rift. Glaciers deepened the lake basin, and the rivers that used to reach a higher outlet now fall off the rim. Gooseberry, Baptism, Temperance and the other named drops are that rim, repeated.',
      'The rest of the state was glaciated into lakes and low divides. A fall needs a lip. Southern and western Minnesota rarely have one that anyone named. Minneapolis’s namesake falls were a real bedrock step on the Mississippi and were largely erased as a natural drop by dams and mills, which is why the modern named inventory is not a Twin Cities inventory.',
    ],
    season: 'North Shore rivers usually come up from mid-April through May as the snowpack goes, and they can be loud for a few weeks. By late summer the same falls are often a fraction of the spring flow unless a storm has just crossed the ridge. Superior’s shore is cold in June. Winter freezes the smaller drops and ices the trails that follow the basalt.',
    faq: {
      q: 'Are Minnesota’s waterfalls along Lake Superior?',
      a: 'Yes. Lake, St. Louis and Cook counties, the North Shore, hold the named count. The rest of the state has very few Falls-class records, because the glacial landscape south and west of the shore does not keep a bedrock lip.',
    },
  },
  virginia: {
    geology: [
      'Virginia’s named falls are strung along the mountains rather than piled into one county. Madison and Giles counties tie for the largest share, and both shares are small. That fits the map: the Blue Ridge, the Valley and Ridge, and the Allegheny front each contribute a few names, and none of them produces a Transylvania-sized cluster. Shenandoah National Park holds several of the published pages, in Madison and neighboring counties, where basalt and greenstone make short, steep hollows.',
      'The Piedmont and the coastal plain drop out of the list. The fall line at Richmond is a rapid and a historic drop on the James, and it is not a crowd of named mountain falls. Virginia’s total sits in the middle of the national list because the mountains are long and the named creeks are scattered along them.',
    ],
    season: 'March through May is the usual high-water window in Shenandoah and the western highlands, rain plus what snow the Blue Ridge held. Early summer still runs if the spring was wet. By late summer the shorter hollows in the park are dependent on a recent storm. October is the crowded month on Skyline Drive, often with less water than April.',
    faq: {
      q: 'Does Virginia have a single waterfall region?',
      a: 'No. The names are spread along the Blue Ridge and the Valley and Ridge. Madison and Giles counties have the most, and each has only a small share of the state total. Shenandoah holds several of the falls people actually visit, inside that longer mountain belt.',
    },
    also: [{ href: '/blog/shenandoah-national-park-waterfalls', label: 'Shenandoah National Park waterfalls' }],
  },
  alabama: {
    geology: [
      'Alabama’s named falls are the last of the Appalachians. DeKalb County leads, on Lookout Mountain and Sand Mountain, where the Cumberland Plateau’s sandstone cap is still intact and creeks fall off the rim. Marshall, Jackson and the other northeast counties repeat that rim. South of the plateau the state is coastal plain. The Falls class almost disappears.',
      'These are not tall western falls. They are caprock drops, often seasonal, in a humid climate that grows a lot of rhododendron and a lot of poison ivy on the same trail. The state’s rank is a northeast-corner rank. Birmingham and the Gulf coast are not part of the count in any meaningful way.',
    ],
    season: 'December through April is the dependable stretch, when frontal storms keep the plateau creeks up. A dry May can already shrink the smaller DeKalb County drops. Summer thunderstorms refill them briefly and make the rock slick. Winter is mild enough to hike and wet enough to be worth it, which is the opposite of the northern states on this list.',
    faq: {
      q: 'Where in Alabama are the named waterfalls?',
      a: 'In the northeast, on the tail of the Cumberland Plateau. DeKalb County has the most. South Alabama’s coastal plain has essentially none in this extract.',
    },
  },
  texas: {
    geology: [
      'Texas is large and has a short named list, and the list is scattered on purpose. No county has a real cluster. Parker County and Comal County sit at the top with a handful each. The Hill Country names are limestone and spring-fed creeks on the Edwards Plateau. Farther west, a couple of names are desert-mountain drops that run when a storm happens to cross them.',
      'The Piney Woods, the plains and the coast do not make waterfalls. There is relief in the west and water in the east, and they rarely coincide. A ranking that rewards named features will never put Texas near Oregon, and a ranking that rewards land area will put it near the bottom on density. Both results describe the same map.',
    ],
    season: 'March through early June is when Hill Country creeks and springs are most likely to be up, because that is when the storms come. July and August are hot enough that a small fall can be gone between weekends. West Texas names are opportunistic: they need a recent rain, and the road to them may be the harder problem. There is no snowmelt season to plan around except on a few high west-Texas slopes.',
    faq: {
      q: 'Why does Texas have so few named waterfalls for its size?',
      a: 'Water and relief are in different parts of the state. The wet east is low, and the high west is dry. The named falls that do exist are scattered, with no county holding more than a few, mostly in the Hill Country and a few western canyons.',
    },
  },
  vermont: {
    geology: [
      'Vermont’s names follow the Green Mountains from the Massachusetts line to the Canadian border. Windsor, Addison and Windham counties lead, a south-to-central band of schist, gneiss and quartzite that the ice sheet rounded and then plucked into steps. The falls are brook and river ledges in those mountains, not a plateau rim and not a basalt gorge.',
      'The Champlain lowland and the Connecticut River valley contribute little. Vermont’s total is smaller than New Hampshire’s even though the two states share a range, because the White Mountains’ notches concentrated names on the New Hampshire side of the same geology. Vermont’s falls are more evenly strung down the spine.',
    ],
    season: 'April into May is peak flow and mud season at the same time. Unpaved roads suffer, and higher trails are easily damaged while the frost is leaving. Lower falls are the ones to visit then. By July the smaller ledges have dropped. Late September is cold water, good color in the Greens, and fewer people than foliage weekend.',
    faq: {
      q: 'Are Vermont’s waterfalls in the Green Mountains?',
      a: 'Yes. Windsor, Addison and Windham counties, along the Green Mountain spine, lead the named count. The Champlain lowland is not waterfall country in this extract.',
    },
  },
  georgia: {
    geology: [
      'Georgia’s named falls are a northern-border phenomenon. Rabun County leads, then Lumpkin and Union, which is the Blue Ridge where it crosses into the state from North Carolina. The escarpment does the same work it does in Transylvania County: streams leave the high plateau and fall toward the Piedmont. Amicalola, on the Dawson County side, is the tall cascade people use as the Southeast’s measuring stick, and it is one name in a short state list.',
      'Northwest Georgia adds a few plateau-rim falls where the Cumberland and the Ridge and Valley reach the state. Atlanta and the coastal plain are absent. Georgia ranks well behind North Carolina because it owns a smaller piece of the same escarpment, not because the geology is different.',
    ],
    season: 'Late winter through May is the full-creek season, rain systems plus whatever snow the high gap held. Rhododendron and mountain laurel come in as the flows start to ease. Summer still works if you accept afternoon storms and weekend crowds at Anna Ruby and Amicalola. A dry October is pretty on the approach and thin on the smaller creeks.',
    faq: {
      q: 'Are Georgia’s waterfalls near the North Carolina line?',
      a: 'Yes. Rabun, Lumpkin and Union counties lead the named count, in the Blue Ridge along the northern border. The Piedmont and the coastal plain contribute essentially nothing to the Falls class.',
    },
  },
  arizona: {
    geology: [
      'Arizona’s named falls are a high-country and canyon count in a dry state. Coconino County leads by a clear margin. That is the Mogollon Rim, the San Francisco volcanic field, and the Grand Canyon’s rims: places where elevation still wrings a storm or a snowpack out of the air, and where a creek can fall off a limestone or basalt lip. The rest of the counties are ones and twos.',
      'A desert fall is often a pour-off that runs for hours after a monsoon cell and is a dry stain the next day. GNIS records the name anyway. Grand Canyon National Park and Saguaro National Park each have a published page where a named fall sits inside the boundary. Neither park is the reason Coconino County leads. The rim and the high plateaus are.',
    ],
    season: 'There are two water seasons, and they do not match. Winter storms and snowmelt, late winter into spring, feed the high rims and the sky-island creeks. The summer monsoon, July into early September, is what makes the ephemeral canyon pour-offs run, sometimes dangerously and briefly. A spring trip and a monsoon trip are not interchangeable, and a June trip is often the gap between them.',
    faq: {
      q: 'Which Arizona county has the most named waterfalls?',
      a: 'Coconino County. It covers the Mogollon Rim, the San Francisco Peaks country and part of the Grand Canyon region. The other counties have only a few named falls each.',
    },
  },
  massachusetts: {
    geology: [
      'Massachusetts’s named falls are a Berkshire count. Berkshire County has about half of them, in the Taconic and Berkshire hills, where schist, gneiss and quartzite were glaciated into steps. East of the Connecticut River the state is lower, and the named list becomes a mill ledge or a small drop in a town conservation area.',
      'The ice sheet covered all of Massachusetts. It only left waterfalls where it also left a hill to fall off. That is why Worcester County is a distant second and the Boston basin is almost absent. The state’s density looks respectable because the land area is small, not because every county has a glen.',
    ],
    season: 'Late March through May is the peak, snowmelt in the Berkshires plus spring rain. The hills melt out later than the coastal plain. Summer is low unless a storm has just passed, and the hemlock gorges stay humid. Fall color in the Berkshires is mid-October, often with less water than April and with busier trailhead roads.',
    faq: {
      q: 'Are Massachusetts waterfalls in the Berkshires?',
      a: 'Most of the named ones are. Berkshire County leads by a wide margin. Eastern Massachusetts has a short list of small, often historic mill drops, not a second mountain inventory.',
    },
  },
  oklahoma: {
    geology: [
      'Oklahoma’s plains are not the waterfall map. The named falls sit in the old, worn hills that break the prairie, and one of those hills dominates the file. Murray County, in the Arbuckle Mountains, holds about half the state’s names by itself. The Arbuckles are a small, intensely folded range of limestone and granite. Turner Falls is the visited piece of a county that the gazetteer treats as a cluster.',
      'The Ouachitas and the Ozark edge in the east add a thinner share, rain-fed sandstone creeks rather than the Arbuckle limestone. Western Oklahoma does not appear. The state’s rank is an Arbuckle rank with a small Ouachita footnote.',
    ],
    season: 'Rain peaks in late spring, so March through early June is when both the Arbuckle and the eastern hills are most likely to be running. A hot, dry July can reduce the smaller creeks to a seep even when Turner Falls, on a larger spring-fed system, still has a flow. Fall storms are a second, less reliable window. Winter is generally too dry to be the reason to go.',
    faq: {
      q: 'Why does Murray County have so many of Oklahoma’s named waterfalls?',
      a: 'Because the Arbuckle Mountains are there. Murray County holds about half the state’s Falls-class records, in a small range of limestone and granite surrounded by plains that do not produce named falls.',
    },
  },
  'south-carolina': {
    geology: [
      'South Carolina’s named falls are an Upstate escarpment count. Greenville County leads, Oconee is close behind, and the rest of the state is a token. The Blue Ridge ends here in a steep drop from the North Carolina plateau to the Piedmont, the same escarpment that fills Transylvania County on the other side of the line. South Carolina owns the bottom of that drop, not the top, so it has fewer names than North Carolina and the same kind of falls.',
      'East of the escarpment the Piedmont and the coastal plain have no bedrock lip worth naming. A “waterfall trip in South Carolina” that starts in Columbia or Charleston is a drive to the northwest corner. The geology does not repeat itself downstate.',
    ],
    season: 'February through May is the wet, reliable season, with the escarpment creeks up and the trails still relatively open before full summer growth. Summer storms keep the larger falls going and turn the paths slick. Fall color arrives earlier on the escarpment than on the coast, and a dry autumn shows on the smaller named creeks first.',
    faq: {
      q: 'Are there named waterfalls in the South Carolina lowcountry?',
      a: 'Essentially no. Greenville and Oconee counties, on the Blue Ridge Escarpment in the northwest, hold the named count. The coastal plain is not in this extract in any meaningful way.',
    },
  },
  utah: {
    geology: [
      'Utah’s named falls are a Wasatch and a canyon-spring count in a dry state. Utah County leads a short list, with Salt Lake County next, which is the Wasatch Front: a fault-block range that catches snow and drops creeks down steep canyons into the valleys. San Juan and the other southern counties add a different kind of name, often a spring or a storm drop in sandstone, not a June snowmelt creek.',
      'The basins and the salt flats contribute nothing. Twenty-two named falls is a small inventory for a state with this much relief, and it is small because most of the relief is arid. A waterfall in southern Utah can be a permanent spring on a canyon wall or a pour-off that exists for an afternoon. GNIS does not distinguish those, and a trip plan has to.',
    ],
    season: 'Wasatch and Uinta falls peak with snowmelt, typically late May through June, later in a big snow year. Provo Canyon and the other front canyons come in earlier than the high Uintas. Southern Utah is less predictable: a spring-fed drop can be visited in any mild month, and a slickrock pour-off should be treated as a flash-flood feature, not as a seasonal schedule.',
    faq: {
      q: 'Where are Utah’s named waterfalls concentrated?',
      a: 'On the Wasatch Front. Utah and Salt Lake counties lead the short statewide list. Southern Utah’s canyon country adds a smaller number of named falls, many of them springs or storm drops rather than snowmelt creeks.',
    },
  },
  indiana: {
    geology: [
      'Indiana was scraped flat across the north and middle, and the named falls are where the ice stopped. Jefferson County, on the Ohio River bluffs, holds more than half the state’s names by itself. That is Clifty Falls country: streams falling off a bedrock bluff that the glaciers did not bury, into ravines cut down toward the river. The rest of the counties are single names.',
      'Northern Indiana’s glacial till does not hold a lip, so it does not hold falls. The state’s total is small, and it is geographically lopsided. A waterfall map of Indiana that looks statewide is mostly a map of one river county plus a few sandstone hollows in the south-central hills.',
    ],
    season: 'These are rain falls, not snowmelt falls. March through May, when the ground is already wet and the storms keep coming, is the reliable stretch. Clifty’s ravines come up fast and drop fast. A dry August can leave the smaller named falls as a damp rock. Winter ice in the ravines is possible and the stone steps stay slick either way.',
    faq: {
      q: 'Why does Jefferson County have most of Indiana’s named waterfalls?',
      a: 'Because that is where bedrock bluffs along the Ohio River escaped the glacial bury that flattened the rest of the state. Jefferson County holds the majority of the named falls, including the Clifty Falls group. Northern Indiana has almost none.',
    },
  },
  ohio: {
    geology: [
      'Ohio’s named list is short because glaciers smoothed the northern two-thirds of the state and filled the old valleys. What remains are local lips: the Berea sandstone and the shale gorges of the Cuyahoga Valley, and the Black Hand sandstone hollows farther south. Cuyahoga County leads with a handful, Summit County next. Neither is a mountain county. They are river counties where a hard bed happens to cross a creek.',
      'Cuyahoga Valley National Park holds some of the published pages, in a low, wooded valley rather than on an escarpment. Hocking Hills, to the south, is the other familiar name, a sandstone gorge system that reads as a destination even though the statewide count stays small. Ohio is on this list because ten or more named falls is enough to describe honestly, not because it competes with Michigan.',
    ],
    season: 'February through May is the dependable stretch, a thaw plus spring rain. The Cuyahoga Valley and the Hocking Hills gorges respond within a day or two of a storm and look ordinary after a dry fortnight. There is no high snowpack to stretch the season into July. Autumn leaf fall is the other reason people go, often on lower water.',
    faq: {
      q: 'Does Ohio have a mountain waterfall region?',
      a: 'No. The named falls are local bedrock steps. Cuyahoga County has the most, in the Cleveland area and the Cuyahoga Valley, and a second group sits in the sandstone hollows of the southeast. The totals are small because glaciers flattened most of the state.',
    },
  },
  kentucky: {
    geology: [
      'Kentucky’s named falls sit on the Cumberland Plateau, where a sandstone cap lies over softer shale. A creek that cuts through the cap drops into a gorge instead of wearing the whole slope down. Whitley and McCreary counties, on the Tennessee line, are at the top of a very flat list. No county has a large cluster. The Red River Gorge and the Daniel Boone country are the visited version of that caprock.',
      'The Bluegrass and the western coal field are not in the Falls class in any number that matters. Kentucky’s total is small, and it is small in a specific way: the right rock is only in the east and south, and even there the named inventory never builds the way it does on the Tennessee side of the same plateau.',
    ],
    season: 'Late winter through May is when the plateau creeks are most likely to be up. February can already be worth a trip in a wet year. By midsummer the smaller caprock drops depend on a recent storm, and the gorge trails are hot. Fall is a second window if the rains return. A long dry spell does not leave a snowmelt reserve. These falls are rain falls.',
    faq: {
      q: 'Where in Kentucky are the named waterfalls?',
      a: 'On the Cumberland Plateau in the east and south. Whitley and McCreary counties have the most, and even they have only a few each. The Bluegrass region is not part of the named-falls count.',
    },
  },
  'west-virginia': {
    geology: [
      'West Virginia is mountainous and still has a short named list. The Allegheny Plateau is a sandstone and shale tableland cut into steep hollows, which ought to be full of falls, and the gazetteer records only a modest number. Summers and Webster counties lead with a few names each. The falls exist. They were not named into the federal file at the rate they were in North Carolina or New York.',
      'Blackwater and the highland drops in Tucker County are the famous piece, a hard sandstone lip on a river, and they do not pull the statewide count up by themselves. New River Gorge National Park has a published page where a named fall falls inside the boundary. The gorge itself is a canyon of rapids more than a catalog of Falls-class points. The state’s lesson is that relief is not enough. Someone has to name the drop.',
    ],
    season: 'March through May is the full season, highland snowmelt plus rain. The Allegheny high country holds snow longer than the Ohio valley side, so Tucker County can still be a late-spring trip when the southern counties are already green. Summer thunderstorms refill a hollow overnight. Winter access to the high falls is a plowed-road question as much as a scenery question.',
    faq: {
      q: 'Why doesn’t mountainous West Virginia rank higher?',
      a: 'The plateau is steep, and the USGS Falls class still lists only a modest number of names. Summers and Webster counties lead with a few each. Many hollow drops were never entered as a named feature, so the count understates the terrain.',
    },
  },
  'new-mexico': {
    geology: [
      'New Mexico’s named falls are scattered mountain names in a dry state. Sandoval County leads with a small group, in the Jemez country, where volcanic rock and a slightly wetter highland coincide. The Sangre de Cristo names sit in the north-central counties and depend on snow that the basins never see. No county has a cluster that would look large in Oregon.',
      'The rest of the state is basin, range and desert. A named fall is often a creek that exists because a range stuck up into the storms. It may run for a few weeks. GNIS records the name without recording the hydrograph. Fourteen names is enough to say where they are, and not enough to pretend New Mexico is waterfall country in the Oregon sense.',
    ],
    season: 'Snowmelt in the Sangre de Cristo and the Jemez usually peaks from about April into June, later at the higher trailheads. That is the window for the named mountain falls. The summer monsoon can start a desert pour-off that is not the same trip and is often a flash-flood hazard in a narrow canyon. June, between melt and monsoon, is the awkward month.',
    faq: {
      q: 'Are New Mexico’s waterfalls in one range?',
      a: 'No. Sandoval County, including the Jemez, has the most, and other names are scattered in the Sangre de Cristo counties. The dry basins between the ranges have essentially none.',
    },
  },
  arkansas: {
    geology: [
      'Every named fall in this extract sits in the Interior Highlands, not in the Delta. The Ozark Plateau, and the Boston Mountains in particular, is sandstone and limestone cut into hollows. Fulton and Newton counties lead a flat list. Two names is the top of the table. The Ouachitas to the south add a few more. The Mississippi Alluvial Plain to the east adds none.',
      'These are rain-fed hollow falls. They appear after a storm system and disappear in a drought, which is why a complete list of twelve names still does not describe a reliable summer circuit. The geology explains where a fall can exist. The weather decides whether it exists on the day you drive up.',
    ],
    season: 'February through May is the storm season that keeps Ozark hollows running. A wet week in March can put a fall in a creek that is dry in August. Summer is hot and uneven. There is no snowpack to stretch the season. If the two weeks before a trip were dry, assume the smaller names are off and aim for a fall on a larger creek.',
    faq: {
      q: 'Are there named waterfalls in the Arkansas Delta?',
      a: 'No. The Falls-class records are in the Ozarks and the Ouachitas. Fulton and Newton counties lead, with only a few names each. The Delta and the Gulf coastal plain do not appear.',
    },
  },
  connecticut: {
    geology: [
      'Connecticut’s names are glacial steps on old crystalline rock. The state is schist, gneiss and granite, with a sandstone central lowland, and the ice sheet left ledges that brooks still fall over. GNIS files several of them under planning-region names rather than the old eight counties. Southeastern Connecticut is the label with the most records, then the Lower Connecticut River Valley. The counts are small either way.',
      'The western uplands, toward the Berkshires, are steeper and hold some of the better-known drops, and they do not dominate the file the way Berkshire County dominates Massachusetts. Eleven named falls is a real list. It is not a region you can spend a week driving between. Several of the published pages are short walks to a single ledge.',
    ],
    season: 'Late March into May is the peak, snowmelt off the western hills plus spring rain, before the canopy closes. Early summer is still reasonable after a wet spring. By August the smaller ledges need a recent rain. Fall color in mid-October is a reason to walk the same short trails on lower water. Winter ice on the shaded ledges is common and the approaches are not long.',
    faq: {
      q: 'Why do Connecticut’s waterfall counties have unfamiliar names?',
      a: 'GNIS records several of them under the state’s planning regions, such as Southeastern Connecticut and the Lower Connecticut River Valley, rather than under the eight traditional counties. The named falls are real. The geographic labels in the file are the modern county equivalents.',
    },
  },
  maryland: {
    geology: [
      'Maryland’s named falls sit on the boundaries between provinces. Garrett County, on the Allegheny Plateau, has the most: sandstone streams dropping off nearly flat-lying beds in the state’s highest, wettest corner. Farther east, the Catoctin and the Frederick County names are Blue Ridge foothill falls. The Great Falls of the Potomac is the fall-line feature, a river dropping off Piedmont rock into the coastal plain, and it is one famous name rather than a county full of them.',
      'Eleven names is enough to see the pattern and not enough to fill a week without repeating trails. The western plateau and the Potomac gorge are different trips, two hours apart, and they should not be described as one waterfall region.',
    ],
    season: 'Spring is the strong season in Garrett County, snowmelt plus rain on the plateau. The Potomac at Great Falls answers to the whole upstream basin, so it can be high in late winter from rain and melt in the mountains and low in late summer even when a Garrett County creek just had a storm. October color in the western counties usually arrives with less water than April.',
    faq: {
      q: 'Is Great Falls the reason Maryland has a waterfall count?',
      a: 'Great Falls is the famous Potomac drop, and it is one feature. Garrett County, on the Allegheny Plateau, holds the largest share of the state’s named falls. The count is a western-plateau count plus a few Blue Ridge and fall-line names.',
    },
  },
};
