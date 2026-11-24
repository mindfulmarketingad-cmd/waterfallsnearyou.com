// Editorial copy for the national park guides. Numbers in the sentences come from the
// analysis context (trail files, review counts, USGS heights, stream gauges). The wording
// is written separately for each park.
import { moreNarratives } from './park-more.mjs';

const num = (n) => Number(n).toLocaleString('en-US');
const mi = (m) => (m < 0.2 ? `${Math.round(m * 5280)} feet` : `${(Math.round(m * 10) / 10).toFixed(1).replace(/\.0$/, '')} miles`);
const find = (ctx, name) => ctx.falls.find((f) => f.name === name);

export const hubCopy = {
  dek: 'Find a national park with a waterfall near you. Filter by state, nearby town or distance, then open a park to see its waterfalls, walking distances, fees and the best time to go.',
  paragraphs: [
    'This list is the national parks that contain waterfall pages we already publish. A fall is included when its coordinates fall inside the National Park Service administrative boundary. Hadlock Falls is the exception: the mapped point sits just outside the Acadia polygon, but the USGS gazetteer says "Located in Acadia NP" and the park describes the fall from Waterfall Bridge. National lakeshores, parkways, monuments, seashores, and recreation areas are not in this list, even when an NPS page covers the fall.',
    'Parks with one published fall are here only because the park itself has a sourced fee, season, or access record worth reading next to that fall. Parks with no published waterfall page are left off. Bridal Veil Falls in Bedford, Ohio, falls inside the Cuyahoga Valley boundary file but the USGS text places it in Bedford Reservation, so it is not treated as a park fall.',
    'The comparison on each park page is computed, not copied from another guide. Hike length and elevation come from our trail file or a cited NPS page. Review counts are the Google totals already stored on the waterfall page. Drop comes from a height stated in the USGS gazetteer text. Stream calendars, where they appear, are monthly means of USGS daily discharge for 2019 through 2024 at a gauge within 30 miles of one of the falls. Blank cells are missing sources, not zeros.',
  ],
};

const src = (title, url) => ({ title, url });

export const parkRecords = [
  {
    slug: 'yosemite', name: 'Yosemite National Park', parkCode: 'yose', substantial: true,
    npsUrl: 'https://www.nps.gov/yose/index.htm',
    falls: [
      ['/california/yosemite-valley/bridalveil-fall'], ['/california/yosemite-valley/chilnualna-fall'], ['/california/yosemite-valley/le-conte-falls'],
      ['/california/yosemite-valley/lower-yosemite-fall'], ['/california/yosemite-valley/nevada-fall'], ['/california/yosemite-valley/pywiack-cascade'],
      ['/california/yosemite-valley/tueeulala-falls'], ['/california/yosemite-valley/vernal-fall'], ['/california/yosemite-valley/wapama-falls'],
      ['/california/yosemite-valley/wildcat-falls'], ['/california/yosemite-valley/yosemite-falls'], ['/california/yosemite-valley/horsetail-fall'],
    ].map(([url]) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$35 for seven consecutive days. The fee page says this covers the vehicle and everyone in it, and that per-person nonresident fees still apply.' },
      { label: 'On foot, bike, or horse', text: '$20 per person for seven days. People 15 and younger are free on this rate.' },
      { label: 'Motorcycle', text: '$30 for seven days, up to two private motorcycles and four people.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, on top of the standard entrance fee, unless the visitor is admitted with an annual or America the Beautiful pass.' },
      { label: 'Pass', text: 'America the Beautiful annual passes cover the entrance fee. They do not cover a reservation fee if one is in place.' },
      { label: 'Timed entry', text: 'The park said on February 18, 2026 that it will not use a timed reservation system in 2026.' },
    ],
    sources: [
      src('NPS: Yosemite fees', 'https://www.nps.gov/yose/planyourvisit/fees.htm'),
      src('NPS: Yosemite reservations, updated February 18, 2026', 'https://www.nps.gov/yose/planyourvisit/reservations.htm'),
      src('NPS: Bridalveil Fall', 'https://www.nps.gov/yose/planyourvisit/bridalveilfalltrail.htm'),
      src('NPS: Vernal and Nevada trail', 'https://www.nps.gov/yose/planyourvisit/vernalnevadatrail.htm'),
    ],
  },
  {
    slug: 'shenandoah', name: 'Shenandoah National Park', parkCode: 'shen', substantial: true,
    npsUrl: 'https://www.nps.gov/shen/index.htm',
    falls: [
      '/virginia/stanley/dark-hollow-falls', '/virginia/washington/miller-falls', '/virginia/stanley/rose-river-falls',
      '/virginia/stanardsville/south-river-falls', '/virginia/washington/overall-run-falls', '/virginia/stanley/lower-whiteoak-falls',
      '/virginia/grottoes/doyles-river-falls', '/virginia/stanley/upper-whiteoak-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$30 for seven consecutive days.' },
      { label: 'On foot or bicycle', text: '$15 for visitors 16 and older. Children under 16 are free on this rate.' },
      { label: 'Motorcycle', text: '$25 for seven days, up to two motorcycles and four people.' },
      { label: 'How to pay', text: 'Trip notes checked against the fee page: the park is cashless at these entrances, and annual and interagency passes are accepted.' },
    ],
    sources: [
      src('NPS: Shenandoah fees', 'https://www.nps.gov/shen/planyourvisit/fees.htm'),
      src('NPS: Overall Run Falls', 'https://www.nps.gov/thingstodo/overall-run-falls.htm'),
      src('NPS: Dark Hollow Falls', 'https://www.nps.gov/thingstodo/dark-hollow-falls.htm'),
    ],
  },
  {
    slug: 'yellowstone', name: 'Yellowstone National Park', parkCode: 'yell', substantial: true,
    npsUrl: 'https://www.nps.gov/yell/index.htm',
    falls: [
      '/wyoming/moose-wilson-road/albright-falls', '/wyoming/moose-wilson-road/firehole-falls', '/wyoming/cody/lower-falls-of-the-yellowstone-river',
      '/wyoming/moose-wilson-road/moose-falls', '/wyoming/moose-wilson-road/mystic-falls', '/wyoming/cody/undine-falls',
      '/wyoming/cody/upper-falls-of-the-yellowstone-river', '/wyoming/cody/wraith-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$35 for seven consecutive days. The vehicle must be private, non-commercial, and seat 15 or fewer.' },
      { label: 'On foot, bicycle, or skis', text: '$20 for visitors 16 and older.' },
      { label: 'Motorcycle or snowmobile', text: '$30 for seven days, up to two machines and four people.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the standard entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Vehicle reservation', text: 'The fee page says an entrance pass is required and vehicle reservations are not.' },
    ],
    sources: [
      src('NPS: Yellowstone fees', 'https://www.nps.gov/yell/planyourvisit/fees.htm'),
      src('NPS: Grand Canyon of the Yellowstone', 'https://www.nps.gov/thingstodo/yell-grand-canyon-of-the-yellowstone.htm'),
      src('NPS: Mystic Falls trail', 'https://www.nps.gov/thingstodo/yell-trail-mystic-falls.htm'),
    ],
  },
  {
    slug: 'rocky-mountain', name: 'Rocky Mountain National Park', parkCode: 'romo', substantial: true,
    npsUrl: 'https://www.nps.gov/romo/index.htm',
    falls: [
      '/colorado/granby/adams-falls', '/colorado/estes-park/alberta-falls', '/colorado/estes-park/bridal-veil-falls',
      '/colorado/estes-park/cascade-falls', '/colorado/estes-park/chasm-falls', '/colorado/estes-park/copeland-falls',
      '/colorado/estes-park/ouzel-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$30 for one day, or $35 for seven consecutive days. Everyone in the vehicle is covered.' },
      { label: 'On foot or bicycle', text: '$15 for one day, or $20 for seven days.' },
      { label: 'Motorcycle', text: '$25 for one day, or $30 for seven days.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Timed entry', text: 'From May 22 through October 12, 2026, a timed-entry reservation is required to enter between 9 a.m. and 2 p.m. Bear Lake Road needs its own reservation from 5 a.m. to 6 p.m., May 22 through October 18, 2026. The only charge for the reservation is a non-refundable $2 Recreation.gov fee. Entering outside those hours does not need the reservation.' },
    ],
    sources: [
      src('NPS: Rocky Mountain fees', 'https://www.nps.gov/romo/planyourvisit/fees.htm'),
      src('NPS: timed entry, 2026 dates', 'https://www.nps.gov/romo/planyourvisit/timed-entry-permit-system.htm'),
      src('NPS: hiking trails list', 'https://www.nps.gov/romo/planyourvisit/list_hiking_trails.htm'),
    ],
  },
  {
    slug: 'glacier', name: 'Glacier National Park', parkCode: 'glac', substantial: true,
    npsUrl: 'https://www.nps.gov/glac/index.htm',
    falls: [
      '/montana/north-browning/apikuni-falls', '/montana/north-browning/baring-falls', '/montana/columbia-falls/bird-woman-falls',
      '/montana/columbia-falls/mcdonald-falls', '/montana/north-browning/redrock-falls', '/montana/north-browning/running-eagle-falls',
      '/montana/north-browning/virginia-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$35 for seven days, or $25 from November 1 through April 30.' },
      { label: 'On foot or bicycle', text: '$20, or $15 in that same winter window.' },
      { label: 'Motorcycle', text: '$30, or $20 in winter.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Vehicle reservation', text: 'The park\'s 2026 vehicle-reservation page, updated June 22, 2026, says reservations will not be required. Logan Pass parking is time-limited in 2026.' },
    ],
    sources: [
      src('NPS: Glacier fees', 'https://www.nps.gov/glac/planyourvisit/fees.htm'),
      src('NPS: vehicle reservations in 2026', 'https://www.nps.gov/glac/planyourvisit/vehicle-reservations.htm'),
    ],
  },
  {
    slug: 'great-smoky-mountains', name: 'Great Smoky Mountains National Park', parkCode: 'grsm', substantial: true,
    npsUrl: 'https://www.nps.gov/grsm/index.htm',
    falls: [
      '/north-carolina/cove-creek/mouse-creek-falls', '/tennessee/maryville/abrams-falls', '/tennessee/gatlinburg/grotto-falls',
      '/tennessee/gatlinburg/laurel-falls', '/tennessee/gatlinburg/ramsey-cascades', '/tennessee/newport/hen-wallow-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    overrides: {
      '/tennessee/gatlinburg/ramsey-cascades': {
        distanceText: '8-mile round trip', miles: 8, distanceKind: 'round-trip',
        elevationText: 'more than 2,100 feet', difficulty: 'challenging',
        sourceTitle: 'NPS: Waterfalls in the Smokies', sourceUrl: 'https://www.nps.gov/grsm/planyourvisit/waterfalls.htm',
      },
    },
    fees: [
      { label: 'Entrance', text: 'No entrance fee. A parking tag is required for any stop longer than 15 minutes, anywhere in the park.' },
      { label: 'Parking tag', text: '$5 for a day, $15 for a week, $40 for a year. Tags are physical, not a screenshot, and they are not a parking space.' },
      { label: 'Passes', text: 'America the Beautiful passes, including Senior, Access, and Military, are not accepted in place of the parking tag.' },
    ],
    sources: [
      src('NPS: Smokies parking tags', 'https://www.nps.gov/grsm/planyourvisit/fees.htm'),
      src('NPS: Waterfalls in the Smokies', 'https://www.nps.gov/grsm/planyourvisit/waterfalls.htm'),
    ],
  },
  {
    slug: 'mount-rainier', name: 'Mount Rainier National Park', parkCode: 'mora', substantial: true,
    npsUrl: 'https://www.nps.gov/mora/index.htm',
    falls: [
      '/washington/eatonville/carter-falls', '/washington/eatonville/christine-falls', '/washington/eatonville/comet-falls',
      '/washington/eatonville/narada-falls', '/washington/eatonville/silver-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$30 for seven consecutive days, private vehicles with 15 or fewer seats.' },
      { label: 'Motorcycle', text: '$25 for seven days.' },
      { label: 'Timed entry', text: 'A February 25, 2026 news note on the fee page says timed entry will not be used anywhere in the park in 2026. The park is using parking management instead.' },
    ],
    sources: [
      src('NPS: Mount Rainier fees', 'https://www.nps.gov/mora/planyourvisit/fees.htm'),
      src('NPS: Narada Falls', 'https://www.nps.gov/places/narada-falls.htm'),
      src('NPS: Mount Rainier weather', 'https://www.nps.gov/mora/planyourvisit/weather.htm'),
    ],
  },
  {
    slug: 'cuyahoga-valley', name: 'Cuyahoga Valley National Park', parkCode: 'cuva', substantial: true,
    npsUrl: 'https://www.nps.gov/cuva/index.htm',
    falls: [
      '/ohio/peninsula/blue-hen-falls', '/ohio/boston-heights/brandywine-falls', '/ohio/peninsula/buttermilk-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Entrance', text: 'No entrance pass and no entrance fee. The fee page says some America the Beautiful passes are sold at Boston Mill Visitor Center, but they are not required to enter.' },
    ],
    sources: [
      src('NPS: Cuyahoga Valley fees', 'https://www.nps.gov/cuva/planyourvisit/fees.htm'),
      src('NPS: hike to Blue Hen Falls', 'https://www.nps.gov/thingstodo/hike-to-blue-hen-falls.htm'),
      src('NPS: Brandywine Falls trailhead', 'https://www.nps.gov/places/000/brandywine-falls-trailhead.htm'),
    ],
  },
  {
    slug: 'katmai', name: 'Katmai National Park', parkCode: 'katm', substantial: true,
    npsUrl: 'https://www.nps.gov/katm/index.htm',
    falls: [
      '/alaska/dillingham/brooks-falls', '/alaska/kodiak-station/fultons-falls', '/alaska/kodiak-station/wolverine-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Entrance', text: 'An entrance pass is not required.' },
      { label: 'Brooks River corridor', text: 'From June 15 through October 31 a permit is required for activities in the Brooks River corridor, from Lake Brooks downstream to the elevated bridge, within 50 yards of the water. The permit is not required for graveled roads, trails, boardwalks, or wildlife viewing platforms. Each permit lasts 7 days, groups are capped at 6, and Recreation.gov charges a $6 booking fee.' },
      { label: 'Other recreation', text: 'The permits page says there are no permits required for recreation in Katmai apart from the special-use cases and the Brooks corridor rule above.' },
    ],
    sources: [
      src('NPS: Katmai fees', 'https://www.nps.gov/katm/planyourvisit/fees.htm'),
      src('NPS: Katmai permits', 'https://www.nps.gov/katm/planyourvisit/permits.htm'),
      src('NPS: Brooks Camp', 'https://www.nps.gov/katm/planyourvisit/brooks-camp.htm'),
    ],
  },
  {
    slug: 'kings-canyon', name: 'Kings Canyon National Park', parkCode: 'kica', substantial: true,
    npsUrl: 'https://www.nps.gov/seki/index.htm',
    falls: [
      '/california/big-pine/mist-falls', '/california/three-rivers/roaring-river-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$35 for one to seven days. The same pass covers Sequoia National Park, Kings Canyon National Park, and the Hume Lake District of Sequoia National Forest.' },
      { label: 'On foot or bicycle', text: '$20 per person for one to seven days.' },
      { label: 'Motorcycle', text: '$30 for seven days.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Reservation', text: 'The basic-information page says no reservation is required to enter Sequoia and Kings Canyon. Campgrounds are reservation-only and the page says summer sites are extremely limited.' },
    ],
    sources: [
      src('NPS: Sequoia and Kings Canyon fees', 'https://www.nps.gov/seki/planyourvisit/fees.htm'),
      src('NPS: Sequoia and Kings Canyon basic information', 'https://www.nps.gov/seki/planyourvisit/basicinfo.htm'),
    ],
  },
  {
    slug: 'haleakala', name: 'Haleakalā National Park', parkCode: 'hale', substantial: true,
    npsUrl: 'https://www.nps.gov/hale/index.htm',
    falls: [
      '/hawaii/hana/makahiku-falls', '/hawaii/hana/waimoku-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$30 for three days. It admits the vehicle to both the Summit District and Kīpahulu.' },
      { label: 'On foot', text: '$15 per person. Youth 15 and under are free on this rate.' },
      { label: 'Motorcycle', text: '$25 for three days.' },
      { label: 'Summit sunrise', text: 'A vehicle reservation is required to enter from 3:00 a.m. to 7:00 a.m. Sunrise reservations are $1 on Recreation.gov and can be booked from 60 days ahead until 2 days ahead. Fee-free entrance days do not waive that sunrise reservation. The Kīpahulu waterfalls are not the summit entrance.' },
    ],
    sources: [
      src('NPS: Haleakalā fees', 'https://www.nps.gov/hale/planyourvisit/fees.htm'),
      src('NPS: Kīpahulu District', 'https://www.nps.gov/hale/planyourvisit/kipahulu.htm'),
    ],
  },
  {
    slug: 'olympic', name: 'Olympic National Park', parkCode: 'olym', substantial: true,
    npsUrl: 'https://www.nps.gov/olym/index.htm',
    falls: [
      '/washington/port-angeles/marymere-falls', '/washington/port-angeles/sol-duc-falls',
    ].map((url) => ({ url, match: 'boundary' })),
    fees: [
      { label: 'Private vehicle', text: '$30 for seven consecutive days, vehicles with 15 or fewer seats. The pass covers the occupants.' },
      { label: 'On foot or bicycle', text: '$15 for seven days. People 15 and younger are free on this rate.' },
      { label: 'Motorcycle', text: '$25 for seven days.' },
    ],
    sources: [
      src('NPS: Olympic fees', 'https://www.nps.gov/olym/planyourvisit/fees.htm'),
      src('NPS: Marymere Falls trailhead', 'https://www.nps.gov/places/000/marymere-falls-trailhead.htm'),
      src('NPS: day hiking at Olympic', 'https://www.nps.gov/olym/planyourvisit/day-hiking-at-olympic.htm'),
    ],
  },
  {
    slug: 'grand-canyon', name: 'Grand Canyon National Park', parkCode: 'grca', substantial: true,
    npsUrl: 'https://www.nps.gov/grca/index.htm',
    falls: [{ url: '/arizona/grand-canyon-village/ribbon-falls', match: 'boundary' }],
    fees: [
      { label: 'Private vehicle', text: '$35 for seven days, one private vehicle up to a 15-person van.' },
      { label: 'On foot or bicycle', text: '$20 for seven days.' },
      { label: 'Motorcycle', text: '$30 for seven days.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Timed entry', text: 'The fee page says no reservation is needed to enter, and the park does not require reservations for entry at this time. Campground reservations are a separate question and are encouraged.' },
    ],
    sources: [
      src('NPS: Grand Canyon fees', 'https://www.nps.gov/grca/planyourvisit/fees.htm'),
      src('NPS: Grand Canyon basic information', 'https://www.nps.gov/grca/planyourvisit/basicinfo.htm'),
    ],
  },
  {
    slug: 'death-valley', name: 'Death Valley National Park', parkCode: 'deva', substantial: true,
    npsUrl: 'https://www.nps.gov/deva/index.htm',
    falls: [{ url: '/california/lone-pine/darwin-falls', match: 'boundary' }],
    fees: [
      { label: 'Private vehicle', text: '$30 for seven days. The fee description says all visitors, including non-US residents, may use this vehicle fee.' },
      { label: 'On foot or bicycle', text: '$15 for seven days, and the same sentence includes non-US residents.' },
      { label: 'Motorcycle', text: '$25 for seven days.' },
      { label: 'How to pay', text: 'The park accepts cards and digital payments for entrance fees. It says no reservation is required to enter. If cash is the only option, buy the pass before arrival or use a listed third-party vendor.' },
    ],
    sources: [
      src('NPS: Death Valley fees', 'https://www.nps.gov/deva/planyourvisit/fees.htm'),
    ],
  },
  {
    slug: 'lassen-volcanic', name: 'Lassen Volcanic National Park', parkCode: 'lavo', substantial: true,
    npsUrl: 'https://www.nps.gov/lavo/index.htm',
    falls: [{ url: '/california/chester/kings-creek-falls', match: 'boundary' }],
    fees: [
      { label: 'Private vehicle, Apr 16–Nov 30', text: '$30 for up to seven days.' },
      { label: 'Private vehicle, Dec 1–Apr 15', text: '$10 for up to seven days.' },
      { label: 'Motorcycle', text: '$25 in the main season, $10 in the winter window.' },
      { label: 'On foot or bicycle', text: '$15 in the main season, $10 in winter.' },
    ],
    sources: [
      src('NPS: Lassen fees', 'https://www.nps.gov/lavo/planyourvisit/fees.htm'),
      src('NPS: Lassen weather', 'https://www.nps.gov/lavo/planyourvisit/weather.htm'),
    ],
  },
  {
    slug: 'sequoia', name: 'Sequoia National Park', parkCode: 'sequ', substantial: true,
    npsUrl: 'https://www.nps.gov/seki/index.htm',
    falls: [{ url: '/california/three-rivers/tokopah-falls', match: 'boundary' }],
    fees: [
      { label: 'Private vehicle', text: '$35 for one to seven days, shared with Kings Canyon National Park and the Hume Lake District.' },
      { label: 'On foot or bicycle', text: '$20 per person for one to seven days.' },
      { label: 'Motorcycle', text: '$30 for seven days.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Reservation', text: 'No reservation is required to enter. Winter storms can close roads until they are plowed. The weather page says Mineral King and Cedar Grove are usually open to vehicles from late spring to early fall.' },
    ],
    sources: [
      src('NPS: Sequoia and Kings Canyon fees', 'https://www.nps.gov/seki/planyourvisit/fees.htm'),
      src('NPS: Sequoia and Kings Canyon basic information', 'https://www.nps.gov/seki/planyourvisit/basicinfo.htm'),
      src('NPS: Sequoia and Kings Canyon weather', 'https://www.nps.gov/seki/planyourvisit/weather.htm'),
    ],
  },
  {
    slug: 'new-river-gorge', name: 'New River Gorge National Park and Preserve', parkCode: 'neri', substantial: true,
    npsUrl: 'https://www.nps.gov/neri/index.htm',
    falls: [{ url: '/west-virginia/hinton/sandstone-falls', match: 'boundary' }],
    fees: [
      { label: 'Entrance', text: 'The fee page says the park does not charge an entrance fee. The Sandstone Falls trip note says there is no activity fee at this site.' },
    ],
    sources: [
      src('NPS: New River Gorge fees', 'https://www.nps.gov/neri/planyourvisit/fees.htm'),
      src('NPS: Sandstone Falls', 'https://www.nps.gov/places/sandstone-falls.htm'),
      src('NPS: Sandstone Falls boardwalk', 'https://www.nps.gov/thingstodo/stroll-on-the-sandstone-boardwalk.htm'),
    ],
  },
  {
    slug: 'grand-teton', name: 'Grand Teton National Park', parkCode: 'grte', substantial: true,
    npsUrl: 'https://www.nps.gov/grte/index.htm',
    falls: [{ url: '/wyoming/moose-wilson-road/hidden-falls', match: 'boundary' }],
    fees: [
      { label: 'Private vehicle', text: '$35 for seven days.' },
      { label: 'On foot or bicycle', text: '$20 for visitors 16 and older, for seven days.' },
      { label: 'Motorcycle', text: '$30 for seven days.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Vehicle reservation', text: 'The fee page says vehicle reservations are not needed to enter. Lodging and campgrounds are reservable and can fill months ahead.' },
    ],
    sources: [
      src('NPS: Grand Teton fees', 'https://www.nps.gov/grte/planyourvisit/fees.htm'),
      src('NPS: Grand Teton weather', 'https://www.nps.gov/grte/planyourvisit/weather.htm'),
    ],
  },
  {
    slug: 'saguaro', name: 'Saguaro National Park', parkCode: 'sagu', substantial: true,
    npsUrl: 'https://www.nps.gov/sagu/index.htm',
    falls: [{ url: '/arizona/tanque-verde/bridal-wreath-falls', match: 'boundary' }],
    fees: [
      { label: 'Private vehicle', text: '$25. The fee page describes it as a dated receipt for one private, non-commercial vehicle.' },
      { label: 'On foot, horse, or bicycle', text: '$15.' },
      { label: 'Motorcycle', text: '$20 for seven days.' },
    ],
    sources: [
      src('NPS: Saguaro fees', 'https://www.nps.gov/sagu/planyourvisit/fees.htm'),
    ],
  },
  {
    slug: 'acadia', name: 'Acadia National Park', parkCode: 'acad', substantial: true,
    npsUrl: 'https://www.nps.gov/acad/index.htm',
    falls: [{ url: '/maine/bar-harbor/hadlock-falls', match: 'usgs-and-nps' }],
    fees: [
      { label: 'Private vehicle', text: '$35 for seven days, including rental cars and RVs under 16 passenger seats.' },
      { label: 'On foot or bicycle', text: '$20 for seven days. Youth 15 and under are free on this rate.' },
      { label: 'Motorcycle', text: '$30 for seven days.' },
      { label: 'Non-US residents', text: '$100 per person age 16 and older, added to the entrance fee, unless admitted with an annual or America the Beautiful pass.' },
      { label: 'Cadillac Summit Road', text: 'A separate vehicle reservation is required to drive Cadillac Summit Road from mid-May into October. It is sold only online, not at the park. That reservation is for the summit road, not for every carriage-road walk.' },
      { label: 'Pass display', text: 'Entrance passes have to be printed and left on the dashboard. Cell service in the park is described as extremely limited.' },
    ],
    sources: [
      src('NPS: Acadia fees', 'https://www.nps.gov/acad/planyourvisit/fees.htm'),
      src('NPS: Waterfall Bridge fast facts', 'https://www.nps.gov/articles/000/waterfall-bridge-fast-facts.htm'),
      src('NPS: Waterfall Bridge place page', 'https://www.nps.gov/places/waterfall-bridge.htm'),
    ],
  },
];

function gaugeLine(g, caveat) {
  if (!g) return null;
  return `${g.name} (USGS ${g.site}) is ${g.miles} miles from ${g.nearestFall}. From 2019 through 2024 its mean daily discharge peaked in ${g.peakMonth} at ${num(g.peakCfs)} cubic feet per second and was lowest in ${g.lowMonth} at ${num(g.lowCfs)}. ${caveat}`;
}

function rankedLine(ctx) {
  if (ctx.ranked.length < 2) return null;
  const top = ctx.ranked[0];
  const last = ctx.ranked[ctx.ranked.length - 1];
  return { top, last };
}

const narratives = {
  yosemite(ctx) {
    const bridal = find(ctx, 'Bridalveil Fall');
    const vernal = find(ctx, 'Vernal Fall');
    const yos = find(ctx, 'Yosemite Falls');
    const chil = find(ctx, 'Chilnualna Fall');
    const pair = rankedLine(ctx);
    return {
      dek: `${ctx.falls.length} published waterfall pages sit inside Yosemite, and the review counts pile up on two valley walks while the Hetch Hetchy, Wawona, and Tuolumne names stay quiet.`,
      overview: [
        `The park's own description says Yosemite was first protected in 1864, covers nearly 1,200 square miles, and is best known for its waterfalls, with the strongest showing in spring when most of the snowmelt occurs. That sentence is about the valley walls. The twelve names on this page are not all valley walls. USGS places Bridalveil, Yosemite Falls, and Vernal and Nevada on the Merced side of the valley, Chilnualna at Wawona, Wapama and Tueeulala at Hetch Hetchy, Le Conte on the Tuolumne, and Pywiack on Tenaya Creek.`,
        `Google reviews on these pages total ${num(ctx.totalReviews)}. ${bridal.name} alone has ${num(bridal.reviews)} and ${vernal.name} has ${num(vernal.reviews)}. Le Conte Falls, Pywiack Cascade, and Tueeulala Falls together have fewer than 15. A trip planned from popularity never leaves the valley. A trip planned from the gazetteer does.`,
      ],
      fallsIntro: 'Each link goes to the waterfall page we already publish. Trail rows appear only when the trail file or a cited NPS page states them. Yosemite Falls is stored as a one-way distance, so it is not doubled here.',
      tableLead: 'Read the distance column before comparing rows. A one-way figure and a round trip are both printed the way the source wrote them.',
      effort: pair ? [
        `${pair.top.name} leads the reviews-per-mile list because the sourced walk is only ${bridal.distanceText} with about 80 feet of gain, against ${num(bridal.reviews)} reviews. ${vernal.name} is the other valley hike with a full set of numbers: ${vernal.distanceText} and about 1,000 feet to the top, on granite stairs the trip notes call wet in high spray. That is a different day from standing at Bridalveil.`,
        `${yos.name} has ${num(yos.reviews)} reviews and a sourced distance of ${yos.distanceText}. The ratio uses 3.2 miles, not 6.4, because the trail file does not state the return. ${chil.name} is the long Wawona number, ${chil.distanceText}, with ${num(chil.reviews)} reviews, so it falls to the bottom of the ratio even though the walk is the one that gets you out of the valley. Nevada Fall has ${num(find(ctx, 'Nevada Fall').reviews)} reviews and no distance in the trail file, so it is left out of the ratio. The NPS page that covers Vernal is titled for both falls. That tells you Nevada is on the same route. It does not give a mileage we can put in the table.`,
      ] : null,
      plan: [
        `One valley day that stays inside sourced distances is Bridalveil (${bridal.distanceText}, about 80 feet) and Vernal (${vernal.distanceText}, about 1,000 feet). Both are in the valley. They are not the same trailhead, and this page does not invent a drive time between them. If the day has room for a third name, Nevada is the continuation on the NPS Vernal and Nevada page, without a separate mileage in our files.`,
        `A second day is the Yosemite Falls trail at ${yos.distanceText}, again without doubling. Wawona's Chilnualna trail, ${chil.distanceText}, does not belong on either valley day. Hetch Hetchy (Wapama and Tueeulala) is a different basin in the gazetteer, and the fee page lists a Hetch Hetchy entrance of its own. The straight-line order of all twelve coordinates, starting at the north end, is ${ctx.seeAll.order.join(', ')}. That order is a coordinate chain, not a road itinerary. The summed hike lengths we can defend are ${mi(ctx.seeAll.miles)}, and ${ctx.seeAll.missing.length} falls have no sourced distance so they are not in that sum: ${ctx.seeAll.missing.join(', ')}.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Happy Isles measures the Merced under the valley falls. It does not measure Chilnualna Creek or Falls Creek at Hetch Hetchy. Use the May peak as a valley snowmelt clock, and keep the spring sentence on the park homepage next to it: most of the snowmelt, and the best waterfall show, is in spring.')].filter(Boolean),
      feesLead: 'Yosemite is one of the parks whose 2026 fee page adds a separate charge for non-US residents and, in the same season, dropped the timed reservation.',
      access: [
        'Entrances named on the fee page for in-person passes include South Entrance, Arch Rock, Big Oak Flat, Hetch Hetchy, and Tioga. Those stations are listed as credit and debit only. Buying the pass before arrival is the park\'s suggestion for skipping the line, not a requirement.',
      ],
      safety: [
        `${vernal.name} is the fall with a sourced hazard note: the trip file calls the Mist Trail moderate to strenuous, with steep granite stairs that are wet and slippery in high spray, and it says winter ice can close the stairs or make them hazardous. That warning is not copied onto Bridalveil, whose notes call the half-mile walk easy with about 80 feet of gain. Do not treat one as the other.`,
      ],
      tips: [
        { text: 'The park homepage says the best time to see waterfalls is spring, when most of the snowmelt occurs.', title: 'NPS Yosemite homepage', url: 'https://www.nps.gov/yose/index.htm' },
        { text: 'Bridalveil\'s trip notes say flow is strongest in spring and early summer and that the fall still runs later, lighter and more windswept.', title: 'NPS Bridalveil Fall', url: 'https://www.nps.gov/yose/planyourvisit/bridalveilfalltrail.htm' },
        { text: 'As of the February 18, 2026 update, a season-wide reservation is not being used in 2026.', title: 'NPS reservations', url: 'https://www.nps.gov/yose/planyourvisit/reservations.htm' },
      ],
      towns: 'Every one of these twelve falls is filed under Yosemite Valley in our town index, including the ones USGS places at Wawona and Hetch Hetchy. The town label is the nearest place of 1,000 people in our city file, not the trailhead.',
      method: 'Reviews per mile uses the published distance as written. One-way miles are not doubled. Nevada Fall is excluded from the ratio because it has reviews and no distance. The see-them total adds only sourced hike lengths and does not pretend the basins connect. The gauge is the Merced at Happy Isles, cited above, for 2019–2024 mean daily discharge.',
    };
  },
  shenandoah(ctx) {
    const dark = find(ctx, 'Dark Hollow Falls');
    const overall = find(ctx, 'Overall Run Falls');
    const upper = find(ctx, 'Upper Whiteoak Falls');
    const lower = find(ctx, 'Lower Whiteoak Falls');
    const miller = find(ctx, 'Miller Falls');
    return {
      dek: 'Shenandoah is the park where the trail file is full enough to rank hikes, and where two of the names are the same canyon counted twice if you are careless.',
      overview: [
        'The park describes itself as 75 miles from Washington, DC, with cascading waterfalls across more than 200,000 acres. Eight of our published pages sit inside the boundary. Seven of them have a sourced distance and an elevation figure. That is a better planning set than the western parks, where the famous names often have reviews and no mileage.',
        `Dark Hollow has ${num(dark.reviews)} of the ${num(ctx.totalReviews)} reviews. Miller Falls has a USGS height of ${miller.heightFeet} feet and no hike length, so it cannot be ranked against the others. It stays on the list because the coordinate is inside the park and the gazetteer says so.`,
      ],
      fallsIntro: 'Whiteoak is the pair to read twice. Lower and upper are separate pages and separate distances, and both carry the Whiteoak Canyon Trail name.',
      tableLead: 'Elevation here is unusually complete. The dashes are Miller Falls, which has a height and no trail row.',
      effort: [
        `${dark.name} is the short, steep one: ${dark.distanceText}, ${dark.elevationText}, rated moderate by NPS with the note that the climb back up is the hard part. It also has the reviews. ${overall.name} is the long one, ${overall.distanceText} and ${overall.elevationText}, and the NPS thing-to-do page says the fall may have minimal or no flow except after plentiful rain. A high reviews-per-mile score would be the wrong reason to pick Overall Run in a dry week.`,
        `${lower.name} is ${lower.distanceText} and ${lower.elevationText}, called easiest by NPS. ${upper.name} is ${upper.distanceText} and ${upper.elevationText} on the same trail name. The mileage total below counts ${mi(upper.miles)} once, not ${mi(lower.miles + upper.miles)}. Adding both would walk the lower canyon twice. Rose River is a 4-mile loop with 910 feet, and South River is a 3.3-mile loop with 910 feet. Those are separate trails, so both stay in the sum.`,
      ],
      plan: [
        `A single short day with sourced numbers is Dark Hollow, ${dark.distanceText}. The return is the steep part, not the walk down. A longer single day that still uses one trail name is Upper Whiteoak at ${upper.distanceText}, which is the figure that covers the canyon we list twice.`,
        `Two days, without claiming the trailheads share a parking lot: day one Dark Hollow, day two either the Whiteoak Canyon Trail at the longer distance or Overall Run if you have checked that the creek is actually running. Doyles River is its own ${find(ctx, 'Doyles River Falls').distanceText} and ${find(ctx, 'Doyles River Falls').elevationText}. The straight-line chain from the northernmost coordinate is ${ctx.seeAll.order.join(', ')}. Summed hike lengths, with Whiteoak counted once, come to ${mi(ctx.seeAll.miles)}. Elevation we can add, skipping any figure that says "more than" or "descent," is ${num(ctx.seeAll.elevationFeet)} feet across ${ctx.seeAll.elevationCount} hikes.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Shenandoah\'s falls are short side streams off a ridge. One downstream gauge is a regional rain signal, not a reading for Overall Run, which NPS already says can be dry without recent rain.')].filter(Boolean),
      feesLead: 'The entrance pass is ordinary. The planning wrinkle is cashless payment and which trailhead sells the pass.',
      access: [
        'The trip notes for Lower Whiteoak say passes are sold at the Whiteoak Canyon lower trailhead. The fee page sets the price at $30 per vehicle for seven days and $15 for someone walking or biking. Annual and interagency passes are accepted.',
      ],
      safety: [
        'NPS rates Dark Hollow moderate and specifically says the climb back is the hard part of a short, rocky trail. Doyles River, Rose River, South River, and Upper Whiteoak are all marked moderate in the trip notes, with elevation gains from 910 to 1,189 feet. Lower Whiteoak is the one marked easiest. Those words are the difficulty column. They are not interchangeable.',
      ],
      tips: [
        { text: 'Overall Run may have minimal or no flow except after plentiful rain.', title: 'NPS Overall Run', url: 'https://www.nps.gov/thingstodo/overall-run-falls.htm' },
        { text: 'Lower Whiteoak is the easiest rating in this set, 2 miles round trip and 500 feet.', title: 'NPS Lower Whiteoak', url: 'https://www.nps.gov/thingstodo/lower-whiteoak-falls.htm' },
      ],
      towns: 'The town names are Stanley, Washington, Stanardsville, and Grottoes. They are the nearest cities in our index, spread along the ridge, not one base town.',
      method: 'Reviews per mile uses published round trips and loops as written. Upper and lower Whiteoak share a trail name, so the see-all mileage keeps the longer one only. Miller Falls is omitted from both sums because it has no distance. The gauge, if shown, is the nearest discharge station with a 2019–2024 daily record, not a gauge on each hollow.',
    };
  },
};

export function parkNarrative(slug, ctx) {
  const fn = narratives[slug] || moreNarratives[slug];
  if (!fn) throw new Error(`missing narrative ${slug}`);
  const story = fn(ctx);
  if (ctx.gauge && (!story.flow || !story.flow.length)) story.flow = [gaugeLine(ctx.gauge, 'This is the nearest discharge gauge with a complete 2019–2024 daily record, not a measurement of the waterfall itself.')];
  if (!ctx.gauge) story.flow = [];
  return story;
}
