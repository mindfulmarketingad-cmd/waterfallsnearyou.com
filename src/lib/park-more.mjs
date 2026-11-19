const num = (n) => Number(n).toLocaleString('en-US');
const mi = (m) => (m < 0.2 ? `${Math.round(m * 5280)} feet` : `${(Math.round(m * 10) / 10).toFixed(1).replace(/\.0$/, '')} miles`);
const find = (ctx, name) => ctx.falls.find((f) => f.name === name);

function gaugeLine(g, caveat) {
  if (!g) return null;
  return `${g.name} (USGS ${g.site}) sits ${g.miles} miles from ${g.nearestFall}. Across 2019–2024 the mean daily flow was highest in ${g.peakMonth} (${num(g.peakCfs)} cfs) and lowest in ${g.lowMonth} (${num(g.lowCfs)} cfs). ${caveat}`;
}

export const moreNarratives = {
  yellowstone(ctx) {
    const mystic = find(ctx, 'Mystic Falls');
    const upper = find(ctx, 'Upper Falls of the Yellowstone River');
    const wraith = find(ctx, 'Wraith Falls');
    const albright = find(ctx, 'Albright Falls');
    return {
      dek: 'Yellowstone\'s published falls split into a reviewed canyon and geyser-basin set, plus Albright Falls in Bechler with no reviews and no trail row.',
      overview: [
        'The park marks March 1, 1872 as the date it became the first national park. The eight waterfall pages inside the boundary are all in Wyoming in our directory. Review counts are not subtle: Mystic Falls has 706, the Upper Falls of the Yellowstone have 229, and Albright Falls has none. Most of the park sits at 6,000 feet or higher, and the weather page says snow is possible in every month.',
        'Upper Falls carries the only sourced season line in this set: late spring and early summer for peak snowmelt, with the added note that park roads are seasonal. That sentence does not automatically describe Firehole Falls or Wraith Falls. They are separate coordinates.',
      ],
      fallsIntro: 'Mystic Falls is the one busy fall with a round-trip distance. Wraith Falls is a short one-way figure. The canyon falls have the audiences and, in our files, no hike length.',
      tableLead: 'The elevation cell for Mystic Falls is left blank on purpose. The trail note says "modest to the falls" and then a further climb to an overlook. That is not a single gain number, so it is not added to anything.',
      effort: [
        `Only two of these falls have both reviews and a distance: ${mystic.name} at ${mystic.distanceText} with ${num(mystic.reviews)} reviews, and ${wraith.name} at ${wraith.distanceText} with ${num(wraith.reviews)} reviews. Wraith's distance is one way. It is not doubled, so its reviews-per-mile number looks kinder than a round trip of the same path would. The canyon falls cannot enter the ratio. Ranking Yellowstone waterfalls by effort using only these two would hide the places people actually write about.`,
        `${albright.name} is the other gap. USGS puts it in Bechler Canyon, on a tributary of the Fall River drainage, named for the park's first civilian superintendent. There is no trail length and no review count. It is inside the boundary and that is why it is listed. It is not a roadside stop in this data.`,
      ],
      plan: [
        `A sourced short walk is Wraith Falls, ${wraith.distanceText}. A sourced half-day with a difficulty word attached is Mystic Falls, ${mystic.distanceText}, called moderately strenuous by the park, with a modest climb to the falls and more if you continue to the overlook. Those are two different basins. The straight-line chain is ${ctx.seeAll.order.join(', ')}. Do not read that list as a driving loop.`,
        `There is no honest two-day waterfall itinerary that visits every named fall here, because five of the eight have no hike length: ${ctx.seeAll.missing.join(', ')}. The summed distances we do have are ${mi(ctx.seeAll.miles)}. Upper Falls is the one with a season: go in late spring or early summer for snowmelt, and expect the road to that overlook to be a seasonal road.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'A Yellowstone River gauge, if that is the station chosen, speaks for the canyon falls more than for Firehole Falls or a Bechler tributary. Read the station name before treating the month as parkwide.')].filter(Boolean),
      feesLead: 'Entrance is required. A vehicle reservation is not. Non-US residents pay an added per-person fee on this park\'s 2026 fee page.',
      access: [
        'Passes can be bought before arrival or at an entrance station. The weather page\'s practical point for waterfall timing is elevation: daytime spring and fall temperatures often sit between the teens and the 60s, with a foot of snow in a day not treated as unusual.',
      ],
      safety: [
        'The Mystic Falls trip note is the specific one: the park rates the trail moderately strenuous. Upper Falls adds seasonal roads. Neither note is a substitute for the park\'s thermal-area rules, which this waterfall file does not restate because they are not attached to these eight records.',
      ],
      tips: [
        { text: 'Vehicle reservations are not required. An entrance pass is.', title: 'NPS Yellowstone fees', url: 'https://www.nps.gov/yell/planyourvisit/fees.htm' },
        { text: 'Upper Falls: late spring and early summer for peak snowmelt, and park roads are seasonal.', title: 'NPS Grand Canyon of the Yellowstone', url: 'https://www.nps.gov/thingstodo/yell-grand-canyon-of-the-yellowstone.htm' },
      ],
      towns: 'The directory files the Bechler and Firehole and Mystic names under Moose Wilson Road, and the canyon and Wraith and Undine names under Cody. Cody is the nearest city of 1,000 people in our file for those coordinates, which is not the same thing as the nearest parking lot.',
      method: 'The ratio only includes falls with both a review count and a parsed distance. Mystic\'s elevation text is excluded from any elevation sum because it is not a single number. One-way distances are not doubled. The coordinate order is a straight-line chain from the northernmost fall.',
    };
  },
  'rocky-mountain'(ctx) {
    const adams = find(ctx, 'Adams Falls');
    const alberta = find(ctx, 'Alberta Falls');
    const copeland = find(ctx, 'Copeland Falls');
    const ouzel = find(ctx, 'Ouzel Falls');
    const cascade = find(ctx, 'Cascade Falls');
    return {
      dek: 'Rocky Mountain is a timed-entry park in 2026, and the short waterfall walks are not all on the same side of the park as Bear Lake Road.',
      overview: [
        'NPS places the park in northern Colorado, a bit over 415 square miles, from montane meadows up to alpine tundra. Seven published falls sit inside the boundary. The hike lengths we have run from Copeland\'s 0.6-mile round trip to Cascade Falls at 3.5 miles one way, which the same sentence also states as 7 miles round trip. The table stores the round trip when both are written down.',
        `Reviews total ${num(ctx.totalReviews)}. Adams Falls, on the west side near Grand Lake, has the most, at ${num(adams.reviews)}. Bridal Veil Falls and Chasm Falls have reviews and no distance, so they sit in the table and out of the ratio.`,
      ],
      fallsIntro: 'Alberta Falls is the Bear Lake Road hike. The trip notes start it at Glacier Gorge Junction. Adams Falls is the west-side walk. Timed entry does not treat those trailheads the same way.',
      tableLead: 'Where a source gives both one way and round trip, the distance used for the ratio is the round trip. That is why Ouzel, Alberta, and Cascade do not show up as half-length hikes.',
      effort: [
        `${copeland.name} is the small number: ${copeland.distanceText} and ${copeland.elevationText}, called easy by NPS. ${adams.name} is next, ${adams.distanceText} and about 150 feet, with ${num(adams.reviews)} reviews, so it leads reviews per mile. ${alberta.name} is ${alberta.distanceText} and 160 feet, from Glacier Gorge Junction on Bear Lake Road.`,
        `${ouzel.name} is the long Wild Basin hike in this set, ${ouzel.distanceText} and 950 feet. ${cascade.name} is longer still on the printed round trip, ${cascade.distanceText} and 300 feet. Chasm Falls has an NPS thing-to-do page and a fee note, and no mileage in the trail file. It is not given a fake distance so it can be ranked.`,
      ],
      plan: [
        `A west-side hour is Adams Falls, about three quarters of a mile round trip. A Wild Basin short stop is Copeland, 0.6 miles and 15 feet. Those are the two sourced walks that stay under a mile. They are not the same entrance.`,
        `Bear Lake Road is the other day. Alberta Falls starts at Glacier Gorge Junction, and from May 22 through October 18, 2026 the Bear Lake corridor needs a timed-entry reservation between 5 a.m. and 6 p.m. Ouzel Falls is the longer Wild Basin commitment, 5.4 miles round trip. The whole-park timed entry, 9 a.m. to 2 p.m. from May 22 through October 12, 2026, still applies on the west side even though the Bear Lake reservation does not. The straight-line order is ${ctx.seeAll.order.join(', ')}. Counted hike miles, using round trips where both were published, total ${mi(ctx.seeAll.miles)}. Missing distances: ${ctx.seeAll.missing.join(', ') || 'none'}.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Snow stays on trails here into summer according to the pattern at similar Front Range parks, but this page does not borrow that sentence. The months below are the gauge, and only the gauge.')].filter(Boolean),
      feesLead: 'Budget the entrance pass and, in the dates above, the $2 reservation fee. They are different charges.',
      access: [
        'Passes are sold at entrance stations and listed as card only in the trip notes. The reservation is bought on Recreation.gov, not instead of the pass. Arriving before 9 a.m., or after 2 p.m., is the stated way to enter without a timed-entry reservation. Bear Lake Road keeps its own longer window.',
      ],
      safety: [
        'Difficulty words we actually have: Copeland is easy, Adams is a short walk with about 150 feet of gain, and the longer trails carry hundreds of feet. No separate hazard paragraph in the trip file rises above those ratings, so none is invented here.',
      ],
      tips: [
        { text: 'Timed entry for the whole park: May 22–October 12, 2026, 9 a.m. to 2 p.m. Bear Lake Road: May 22–October 18, 2026, 5 a.m. to 6 p.m. Reservation fee $2.', title: 'NPS timed entry', url: 'https://www.nps.gov/romo/planyourvisit/timed-entry-permit-system.htm' },
        { text: 'Alberta Falls is described as starting on Bear Lake Road, so the corridor reservation applies to that hike in those hours.', title: 'NPS hiking list', url: 'https://www.nps.gov/romo/planyourvisit/list_hiking_trails.htm' },
      ],
      towns: 'Adams Falls is filed under Granby. The other six are filed under Estes Park. That split matches the west-side versus east-side trailheads better than a single "nearest town" would.',
      method: 'Round trip replaces one way when the same sentence contains both. Reviews per mile then uses that round trip. Falls with reviews and no distance are shown in the table and omitted from the ratio. Bear Lake rules are applied only to the hike whose source names Bear Lake Road.',
    };
  },
  glacier(ctx) {
    const virginia = find(ctx, 'Virginia Falls');
    const running = find(ctx, 'Running Eagle Falls');
    const apikuni = find(ctx, 'Apikuni Falls');
    return {
      dek: 'In Glacier the fall people review most has no hike length in our files, and the two falls that do are short one-way walks.',
      overview: [
        'The park\'s description is melting glaciers, alpine meadows, more than 700 miles of trails, and the Going-to-the-Sun Road. Seven published waterfall pages fall inside the boundary. Virginia Falls has 95 reviews and no distance. Running Eagle Falls has a 0.3-mile one-way trail and 42 reviews. Apikuni Falls has 0.9 miles one way and 30 reviews. The popularity order and the measured-hike order are not the same list.',
        'For 2026 the park says vehicle reservations will not be required, and that Logan Pass parking will be time-limited. That is a change from earlier years. It is also not a trail description for these seven falls. Bird Woman Falls is the one USGS pins to a mountainside: an unnamed stream 0.5 mile west-northwest of Mount Oberlin.',
      ],
      fallsIntro: 'Distances below are one way. They are not doubled into round trips, because the trail file does not say the walk returns on the same path.',
      tableLead: 'Most of this table is dashes in the distance column. That is the finding. Five falls, including the most reviewed, have no sourced hike length.',
      effort: [
        `The ratio can only see ${running.name} (${running.distanceText}, ${num(running.reviews)} reviews) and ${apikuni.name} (${apikuni.distanceText}, ${num(apikuni.reviews)} reviews). ${virginia.name} leads the park with ${num(virginia.reviews)} reviews and contributes nothing to the ratio. Using the ratio as a "best of Glacier" list would drop the fall readers mention most.`,
      ],
      plan: [
        `The only sourced short walk is Running Eagle, 0.3 miles one way. Apikuni is the other sourced walk, 0.9 miles one way. A day that claims Virginia Falls, McDonald Falls, Baring Falls, Redrock Falls, or Bird Woman Falls has to leave the mileage blank. This page does.`,
        `Two days do not appear, because a second day would be an invented route between falls that have coordinates and no trail stats. The straight-line order from the north is ${ctx.seeAll.order.join(', ')}. Summed one-way distances are ${mi(ctx.seeAll.miles)}. Missing: ${ctx.seeAll.missing.join(', ')}.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Glacier\'s creeks respond to snow at Logan Pass and to rain on the west side at different times. One gauge is a basin average. It is cited so the month can be checked, not so every fall can be assigned that month.')].filter(Boolean),
      feesLead: 'The entrance fee has a winter rate. The 2026 vehicle-reservation answer is no.',
      access: [
        'From November 1 through April 30 the vehicle fee drops from $35 to $25, and the per-person fee from $20 to $15. Non-US residents have the additional $100 charge on the fee page. Logan Pass parking is time-limited in 2026 even though a vehicle reservation is not required to enter the park.',
      ],
      safety: [
        'The weather page says it is generally 10 to 15 degrees cooler at Logan Pass than lower in the park, and that snow can fall in any month. No trail-specific hazard is stored for these seven falls beyond that climate note, so none is added.',
      ],
      tips: [
        { text: 'Vehicle reservations will not be required in 2026. The page was updated June 22, 2026.', title: 'NPS vehicle reservations', url: 'https://www.nps.gov/glac/planyourvisit/vehicle-reservations.htm' },
        { text: 'Logan Pass parking is time-limited in 2026.', title: 'NPS vehicle reservations', url: 'https://www.nps.gov/glac/planyourvisit/vehicle-reservations.htm' },
      ],
      towns: 'Five falls are filed under North Browning and two under Columbia Falls. Those are the nearest cities in our index, on opposite sides of the park.',
      method: 'One-way distances stay one way. The effort ratio is withheld as a recommendation because the most-reviewed fall has no distance. The 2026 reservation sentence is taken from the dated NPS page, not from older trip notes.',
    };
  },
  'great-smoky-mountains'(ctx) {
    const laurel = find(ctx, 'Laurel Falls');
    const ramsey = find(ctx, 'Ramsey Cascades');
    return {
      dek: 'The Smokies do not charge an entrance fee, and the waterfall with the shortest stored hike is not the one NPS calls the tallest.',
      overview: [
        'The park straddles the North Carolina–Tennessee line and calls itself the most visited national park in the country. Six of our pages are inside the boundary: Mouse Creek Falls on the North Carolina side, and Abrams, Grotto, Laurel, Ramsey Cascades, and Hen Wallow in Tennessee. NPS says the high country averages more than 85 inches of rain a year, and the lowlands about 55. That is the flow story. There is no single snowmelt month in the park\'s waterfall text.',
        `Laurel Falls has ${num(laurel.reviews)} reviews and a trail file distance of ${laurel.distanceText}. Ramsey Cascades has no reviews in our file and, on the NPS waterfall page, an 8-mile round trip with more than 2,100 feet of gain. NPS calls Ramsey the tallest waterfall in the Smokies and groups Abrams, Grotto, Laurel, and Rainbow Falls as the hikes that together see more than 200,000 visits a year. Rainbow Falls is not one of our published pages, so it is not in the table.`,
      ],
      fallsIntro: 'Ramsey\'s distance and elevation are copied from the NPS waterfall page, not from the OpenStreetMap trail file, which did not have a length. The other distances are from the trail file.',
      tableLead: 'Laurel\'s distance is one way. Ramsey\'s is a round trip. They are not the same kind of number, and the ratio below does not pretend they are.',
      effort: [
        `If you divide reviews by published miles, ${laurel.name} wins on attention and ${ramsey.name} wins on work: ${num(laurel.reviews)} reviews over ${laurel.distanceText}, versus zero reviews over 8 miles and more than 2,100 feet. Abrams, Grotto, Hen Wallow, and Mouse Creek have reviews and no length, so they are not in that division. Grotto is one of the four hikes NPS names as heavily used, which the review count only partly shows.`,
      ],
      plan: [
        `The short sourced hike is Laurel Falls, ${laurel.distanceText}. NPS lists it among the crowded ones and says parking is often limited. A parking tag is required for more than 15 minutes, and most trailheads do not sell the tag. Buy it before you reach the lot.`,
        `The long sourced hike is Ramsey Cascades, 8 miles round trip, more than 2,100 feet, called challenging. That is the second day if the goal is the tall fall rather than the busy one. There is no sourced chain that adds Abrams or Grotto onto Laurel, so they are not given a combined mileage. Straight-line order: ${ctx.seeAll.order.join(', ')}. Counted miles: ${mi(ctx.seeAll.miles)}. No distance on file for ${ctx.seeAll.missing.join(', ')}.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Eighty-five inches of rain at the high peaks is a year-round supply. A gauge\'s wettest month is extra information, not a replacement for that rainfall sentence. After heavy rain, NPS says falls show up along Little River Road, Tremont Road, and Newfound Gap Road that are not there in a dry week.')].filter(Boolean),
      feesLead: 'The cost is a parking tag, not an entrance fee, and the federal annual pass does not replace it.',
      access: [
        'Daily tags are $5, weekly $15, annual $40. They have to be the physical tag, displayed in the vehicle. America the Beautiful passes are not accepted instead. The tag does not reserve a parking space, and many trailheads have no tag machine.',
      ],
      safety: [
        'NPS says water recreation is not recommended. Drowning is one of the leading causes of death in the park, and the waterfall page ties injuries to swimming, climbing around falls, and tubing. That warning covers the popular falls by name only in the sense that the page is about park waterfalls generally. It is the park\'s warning, not a trail-by-trail note.',
      ],
      tips: [
        { text: 'Ramsey Cascades is an 8-mile round trip with more than 2,100 feet of gain, and NPS calls it the tallest in the Smokies.', title: 'NPS waterfalls', url: 'https://www.nps.gov/grsm/planyourvisit/waterfalls.htm' },
        { text: 'Parking tags: $5 / $15 / $40. Not replaced by an America the Beautiful pass.', title: 'NPS fees', url: 'https://www.nps.gov/grsm/planyourvisit/fees.htm' },
        { text: 'High country averages more than 85 inches of rain a year. Lowlands average 55.', title: 'NPS waterfalls', url: 'https://www.nps.gov/grsm/planyourvisit/waterfalls.htm' },
      ],
      towns: 'Mouse Creek Falls is filed in North Carolina. The other five are filed in Tennessee, under Maryville, Gatlinburg, and Newport. The state line is the point of the park, and the town list shows it.',
      method: 'Ramsey\'s 8 miles and "more than 2,100 feet" come from the NPS waterfall page and are flagged by source. "More than" is not added into a numeric elevation total. Laurel\'s one-way mile is not doubled. Review counts are Google totals on our pages, which understate Ramsey because the page has none.',
    };
  },
  'mount-rainier'(ctx) {
    const narada = find(ctx, 'Narada Falls');
    const comet = find(ctx, 'Comet Falls');
    const silver = find(ctx, 'Silver Falls');
    return {
      dek: 'Narada Falls is a 0.2-mile one-way walk with the reviews. Comet Falls is 1.8 miles one way with far fewer. Timed entry is not in place for 2026.',
      overview: [
        'NPS describes Rainier as 14,410 feet, the most glaciated peak in the contiguous United States, with five major rivers off the ice. The park homepage names Narada Falls as one of dozens of waterfalls fed by glacier and snowmelt creeks. Five published pages are inside the boundary. Christine Falls and Carter Falls have reviews and no distance. Narada, Silver, and Comet have distances, all of them one way.',
        `Narada has ${num(narada.reviews)} of the ${num(ctx.totalReviews)} reviews. The trip notes say the upper viewpoint is open year-round and the lower trail is hazardous when snow-covered, and they put the best snow-free season for that lower trail in summer and early fall. The weather page adds that snow remains between 5,000 and 8,000 feet well into mid-July, and that late July and August are generally the driest, warmest months, with rain still possible.`,
      ],
      fallsIntro: 'Narada\'s elevation note is a descent to the lower viewpoint, about 200 feet down and back up. It is shown in the table and kept out of any elevation sum, because the parser skips the word descent.',
      tableLead: 'One-way distances are labeled. Christine and Carter stay in the table without a length.',
      effort: [
        `${narada.name} is ${narada.distanceText} with ${num(narada.reviews)} reviews, so it dominates reviews per mile. The trip file calls the upper viewpoint easy and the lower trail moderate and slippery. ${silver.name} is ${silver.distanceText}. ${comet.name} is ${comet.distanceText}. Christine Falls has ${num(find(ctx, 'Christine Falls').reviews)} reviews and the USGS-style listing text calls it a waterfall framed by a stone bridge, which is a description, not a mileage.`,
      ],
      plan: [
        `The short stop is Narada, and the season to use the lower trail is the one in the trip notes: summer and early fall, when snow is off it. A longer single hike, still one way in the file, is Comet Falls at 1.8 miles. Silver Falls at 0.3 miles one way sits between them in length and is not described as the same trailhead.`,
        `A second day is not built by adding Carter and Christine, because we do not have their distances. Straight-line order: ${ctx.seeAll.order.join(', ')}. Sum of the three one-way figures: ${mi(ctx.seeAll.miles)}. No length for ${ctx.seeAll.missing.join(', ')}.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Rainier\'s falls are described as glacier- and snow-fed. A river gauge downstream will rise with melt and with rain. Mid-July snow at 5,000 to 8,000 feet, from the weather page, is the reason a June gauge peak may still be a snow-covered trail.')].filter(Boolean),
      feesLead: 'The vehicle pass is $30 for seven days. Timed entry is explicitly not required in 2026.',
      access: [
        'The February 25, 2026 note says the park will manage full parking lots instead of using a reservation. That is a reason to go early, and it is the park\'s wording rather than a shuttle schedule. No shuttle time is stored for these five falls, so none is printed.',
      ],
      safety: [
        'Narada\'s lower trail is the sourced hazard: about 200 feet of descent, slippery, and a poor idea under snow. The upper pullout is the year-round option in the same note. Comet and Silver do not have a matching hazard sentence in the trip file.',
      ],
      tips: [
        { text: 'Timed entry will not be used in the park in 2026.', title: 'NPS fees', url: 'https://www.nps.gov/mora/planyourvisit/fees.htm' },
        { text: 'Snow remains at 5,000 to 8,000 feet well into mid-July. Late July and August are generally the driest months.', title: 'NPS weather', url: 'https://www.nps.gov/mora/planyourvisit/weather.htm' },
        { text: 'Narada\'s lower trail is the summer and early-fall walk. The upper viewpoint is the year-round one.', title: 'NPS Narada Falls', url: 'https://www.nps.gov/places/narada-falls.htm' },
      ],
      towns: 'All five falls are filed under Eatonville. That is a function of our city index, not five trailheads in Eatonville.',
      method: 'One-way miles are not doubled. Narada\'s "descent" elevation is excluded from sums. The 2026 timed-entry sentence is the February 25 news note on the fee page. Review ratio uses only the three falls with a distance.',
    };
  },
  'cuyahoga-valley'(ctx) {
    const brandy = find(ctx, 'Brandywine Falls');
    const blue = find(ctx, 'Blue Hen Falls');
    const butter = find(ctx, 'Buttermilk Falls');
    return {
      dek: 'Cuyahoga Valley charges no entrance fee. Brandywine Falls is an 86-foot drop, a third of a mile round trip, and most of the reviews.',
      overview: [
        'The park sits between the urban edges of Cleveland and Akron and describes the Cuyahoga River, deep forest, and the Ohio & Erie Canal towpath. Three published falls are inside the boundary. Brandywine has an 86-foot height in the USGS text, about 0.3 miles round trip in the trip notes, and 551 reviews. Blue Hen is about 3 miles round trip, called steep, rocky, and often muddy, with 250 reviews. Buttermilk Falls has the Boston Township location in the gazetteer and no hike length.',
        'A fourth name, Bridal Veil Falls near Bedford, lands inside the boundary polygon and is not on this page. USGS places that one in Bedford Reservation. The polygon is the legislated line, and the gazetteer is the place name. The gazetteer wins when they disagree.',
      ],
      fallsIntro: 'Brandywine is the short walk. Blue Hen is the half-day that the NPS hike page and our trip notes both describe as rough underfoot. Buttermilk is a location without a trail row.',
      tableLead: 'Height appears only for Brandywine, because that is the one USGS sentence with a number of feet.',
      effort: [
        `${brandy.name} is ${mi(brandy.miles)} and ${num(brandy.reviews)} reviews, so the reviews-per-mile figure is enormous next to ${blue.name}, which is ${blue.distanceText} with ${num(blue.reviews)} reviews. That gap is the planning fact. The easy walk is also the crowded one. Blue Hen is where the trail file says steep and muddy. ${butter.name} cannot be placed on the ratio.`,
      ],
      plan: [
        `One day, if the goal is the falls with the height and the short walk, is Brandywine: ${brandy.distanceText}. The trip notes call it easy. A second outing, not a second lap of the same path, is Blue Hen at ${blue.distanceText}. Nothing in the sources chains them into one loop, and their straight-line separation is part of the coordinate order: ${ctx.seeAll.order.join(', ')}.`,
        `Counted miles are ${mi(ctx.seeAll.miles)}. ${butter.name} is the missing distance. There is no entrance gate between them. The fee page says the park does not charge one.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'This is a rain-fed park, not a snowmelt canyon. The weather page talks about spring rain and lake-effect snow off Erie. The gauge month should be read as the river\'s response to that, not as a promise that Blue Hen is at its best in the peak month.')].filter(Boolean),
      feesLead: 'There is nothing to buy to walk to these falls. Shelter reservations in the Virginia Kendall area are a different product and are not required for the trails.',
      access: [
        'Boston Mill Visitor Center sells some America the Beautiful passes in season, and the fee page says to call ahead from December through April if you need a ranger to issue one. You do not need the pass to park at Brandywine or Blue Hen.',
      ],
      safety: [
        'Blue Hen is the sourced caution: steep, rocky, often muddy, about 3 miles round trip. Brandywine is the one called easy, about 0.3 miles. Buttermilk has no trail caution on file.',
      ],
      tips: [
        { text: 'No entrance fee and no entrance pass.', title: 'NPS fees', url: 'https://www.nps.gov/cuva/planyourvisit/fees.htm' },
        { text: 'Blue Hen is the steep, muddy hike. Brandywine is the short one.', title: 'NPS Blue Hen', url: 'https://www.nps.gov/thingstodo/hike-to-blue-hen-falls.htm' },
      ],
      towns: 'Brandywine is filed under Boston Heights. Blue Hen and Buttermilk are filed under Peninsula. Both towns sit in the valley the park is named for.',
      method: 'USGS height is used only when the gazetteer text states feet. The Bedford Bridal Veil point was dropped because the gazetteer names a different reservation. Reviews per mile uses the two sourced distances. The gauge is regional rainfall, labeled as such.',
    };
  },
  katmai(ctx) {
    const brooks = find(ctx, 'Brooks Falls');
    return {
      dek: 'Katmai has no entrance fee, three named falls inside the boundary, and a trail file with no distances. The useful rule is which part of Brooks River needs a permit.',
      overview: [
        'The park was established in 1918 around Novarupta and the Valley of Ten Thousand Smokes, and the current description adds salmon habitat and brown bears. Brooks Falls is the published page with reviews: 21. USGS places it at the outlet of Lake Brooks. Fultons Falls and Wolverine Falls are also inside the boundary, in the old "national monument" wording of the gazetteer, and neither has a review count or a hike length.',
        'There is no effort ranking. A ranking would require distances. What the official pages do provide is a permit line that is easy to misread. From June 15 through October 31, activities in the Brooks River corridor need a permit. The corridor is the river and 50 yards of bank, from the Lake Brooks inlet down to the elevated bridge. Boardwalks, viewing platforms, graveled roads, and trails are excluded from that permit. The booking fee is $6, the permit lasts 7 days, and the group cap is 6.',
      ],
      fallsIntro: 'Brooks Falls is the only one of the three with a public reputation in our review data. The other two are gazetteer names inside the park, not trail descriptions.',
      tableLead: 'Every distance cell is blank. That is an empty trail file, not a claim that the walks are zero.',
      effort: [
        `No fall has a sourced mileage, so reviews per mile is not computed. ${brooks.name} has ${num(brooks.reviews)} reviews and the other two have none. Attention is concentrated on one bear-viewing waterfall. Effort is not something this dataset can score.`,
      ],
      plan: [
        'A one-day or two-day hiking itinerary is not written, because there is no trail length to add. The plan the sources support is about the permit geography at Brooks, not about linking Fultons Falls to Wolverine Falls on foot. The straight-line order of the three coordinates is ' + ctx.seeAll.order.join(', ') + '. Those points are far enough apart, in a park with no road between them in our files, that a chained hike would be fiction.',
      ],
      flow: [gaugeLine(ctx.gauge, 'Katmai gauges are scarce relative to the size of the park. If the station is not on the Brooks River, the month is a peninsula climate signal and is labeled with the station name for that reason.')].filter(Boolean),
      feesLead: 'Entrance is free. The Brooks corridor permit is seasonal and does not cover the viewing platform.',
      access: [
        'The permits page says no permit is required for ordinary recreation outside the cases it lists. Reaching Brooks Camp is a trip-planning problem the waterfall file does not solve with a road distance. Our town index files Brooks Falls under Dillingham and the other two under Kodiak Station, which is a clue about how remote the coordinates are, not a driving direction.',
      ],
      safety: [
        'The sourced caution is the bear corridor itself: the permit exists because of salmon season on that stretch of river, and the park carves the platforms out of the permit so people can watch from the built walkway. This page does not add distance rules or food-storage rules that are not in the three sources cited.',
      ],
      tips: [
        { text: 'No entrance pass.', title: 'NPS fees', url: 'https://www.nps.gov/katm/planyourvisit/fees.htm' },
        { text: 'Brooks corridor permit: June 15–October 31, not required on the viewing platforms. $6 booking fee, 7 days, group of 6.', title: 'NPS Brooks Camp', url: 'https://www.nps.gov/katm/planyourvisit/brooks-camp.htm' },
      ],
      towns: `Brooks Falls is filed under ${brooks.city}, about ${brooks.cityMiles.toFixed(0)} straight-line miles from that town in our index. The other two use a different town. Treat those distances as "not a day trip from the city," not as a route.`,
      method: 'With no trail distances, the effort ratio and the mileage total are omitted rather than filled. The permit exception for platforms is quoted narrowly so the page does not say "no permit" and "permit required" about the same spot. Review counts are the crowd measure, and they only illuminate Brooks Falls.',
    };
  },
  'kings-canyon'(ctx) {
    const mist = find(ctx, 'Mist Falls');
    const roar = find(ctx, 'Roaring River Falls');
    const apart = ctx.seeAll.pairMiles != null ? (Math.round(ctx.seeAll.pairMiles * 10) / 10) : null;
    return {
      dek: 'Kings Canyon shares a $35 pass with Sequoia, has two published falls inside the boundary, and has no hike lengths in the trail file for either.',
      overview: [
        `Mist Falls has ${num(mist.reviews)} reviews and Roaring River Falls has ${num(roar.reviews)}. The counts are almost the same, which is unusual next to parks where one overlook takes nearly all the reviews. Neither fall has a distance, elevation, or difficulty in the trail file or the trip notes. A Google blurb on Roaring River mentions a short paved path. That blurb is not used here.`,
        `The two coordinates are about ${apart} miles apart in a straight line. That is too far to call them one hike, and it is not a driving time. The shared entrance pass with Sequoia means a Tokopah Falls day and a Kings Canyon day can be the same seven-day receipt. They are still different parks.`,
      ],
      fallsIntro: 'Both falls are listed because the boundary contains them. The blank trail rows are the reason this page does not rank them.',
      tableLead: 'The review column is the only complete numeric column. Treat the dashes as missing measurements.',
      effort: [
        'Reviews per mile cannot be computed. The two review totals are close enough that a crowd ranking is almost a tie, and a tie without distances does not tell you which walk is shorter. No easiest option is stated.',
      ],
      plan: [
        `There is no one-day plan that visits both, because ${apart} straight-line miles is not a trail connection and we have no road time. There is no two-day hiking plan with miles to add. What can be said is that the entrance fee covers both this park and Sequoia for up to seven days, and that no reservation is required to enter.`,
        `Rivers in these parks are called extremely hazardous in spring and early summer, when snowmelt makes them swift and cold. That is the season sentence the basic-information page gives. It is about the rivers, which is as close as the official text gets to a flow calendar for these two falls.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Use the station name. A Kaweah gauge and a Kings River gauge are not interchangeable, and neither is Mist Falls itself.')].filter(Boolean),
      feesLead: 'One vehicle pass covers Sequoia, Kings Canyon, and the Hume Lake District. Non-US residents pay an added $100 per person on this fee page.',
      access: [
        'No entrance reservation. Campgrounds are reservation-only, and the park says summer availability is extremely limited. Cedar Grove, on the weather page, is usually open to vehicles from late spring into early fall. Roads can close after winter storms until they are plowed.',
      ],
      safety: [
        'The basic-information page says every river in the parks is extremely hazardous in spring and early summer because of cold, fast snowmelt. That is the safety note for a waterfall trip here. There is no trail-specific note for Mist Falls or Roaring River Falls in our files.',
      ],
      tips: [
        { text: 'No reservation to enter. The vehicle pass is $35 for one to seven days and covers both parks.', title: 'NPS fees', url: 'https://www.nps.gov/seki/planyourvisit/fees.htm' },
        { text: 'Rivers are extremely hazardous in spring and early summer.', title: 'NPS basic information', url: 'https://www.nps.gov/seki/planyourvisit/basicinfo.htm' },
      ],
      towns: 'Mist Falls is filed under Big Pine and Roaring River Falls under Three Rivers. Three Rivers is the usual gateway town in our index for the Kaweah side. Big Pine is a straight-line assignment on the other side of the Sierra, which is a reason not to treat the town label as the trailhead.',
      method: 'No distances, so no ratio and no mileage total. The separation between the falls is straight-line miles from the coordinates, rounded to one decimal. The paved-path claim that appears in a Google description is excluded. The river warning is the NPS basic-information sentence.',
    };
  },
  haleakala(ctx) {
    const wai = find(ctx, 'Waimoku Falls');
    const maka = find(ctx, 'Makahiku Falls');
    return {
      dek: 'Both of Haleakalā\'s published falls are in Kīpahulu, past Hāna. The sunrise reservation is a summit rule and does not govern this side of the park.',
      overview: [
        `The Kīpahulu page says the district is 12 miles past Hāna on the Hāna Highway, and that visitors get waterfalls, ocean views, and a cultural landscape. Waimoku Falls has a trail-file distance of ${wai.distanceText} on the Pīpīwai Trail and ${num(wai.reviews)} reviews. Makahiku Falls has ${num(maka.reviews)} reviews, a USGS note that it is in the park, and no distance. The Pools of ʻOheʻo are closed to entry. The park says to view them from the Kūloa Point Trail.`,
        'The summit and Kīpahulu are one entrance fee and two climates. The weather page puts a high near 80°F at Kīpahulu and a low near 30°F at the summit on the same day. A vehicle reservation from 3 a.m. to 7 a.m. is for sunrise at the summit. It is not a permit for the waterfall trail.',
      ],
      fallsIntro: 'Waimoku is the fall with a hike length. Makahiku is the other named fall on the way through the same district, without a length in our file.',
      tableLead: 'One distance is one way. It is not doubled.',
      effort: [
        `Only ${wai.name} can be scored, and a one-fall ratio is not a ranking. The number that matters is the hike itself: ${wai.distanceText}, against ${num(wai.reviews)} reviews. ${maka.name} has reviews and no miles, so "easiest" cannot be assigned by comparing them.`,
      ],
      plan: [
        `The sourced walk is the Pīpīwai Trail to Waimoku, ${wai.distanceText}. Makahiku is named by USGS inside the park and has its own page. This dataset does not say whether that page\'s fall is passed on the way to Waimoku, so the two are not added into one mileage. A second day is not constructed.`,
        `Getting to the trailhead is the Hāna Highway drive the Kīpahulu page describes: 12 miles past Hāna. That is a road description, not a hike. The vehicle fee is $30 for three days and covers both districts, so the summit and Kīpahulu can share a receipt without sharing a morning.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'East Maui streams are flashy. A gauge on a different gulch is not Waimoku Falls. The station name is the check.')].filter(Boolean),
      feesLead: 'The vehicle fee lasts three days, not seven, and it covers the summit and Kīpahulu. Sunrise is an extra reservation with a $1 fee.',
      access: [
        'Kīpahulu is reached by continuing 12 miles past Hāna. The summit entrance before 7 a.m. needs a sunrise reservation booked on Recreation.gov. Fee-free days do not include that sunrise window. The waterfall trail is on the other side of the island\'s drive.',
      ],
      safety: [
        'The Kīpahulu page closes the Pools of ʻOheʻo to entry because of safety concerns and tells visitors to stay on the Kūloa Point Trail for the view. It also says the district is often wet. Those are the sourced cautions. No separate warning is stored for the Pīpīwai Trail beyond the distance.',
      ],
      tips: [
        { text: 'Kīpahulu is 12 miles past Hāna. The pools are closed to entry.', title: 'NPS Kīpahulu', url: 'https://www.nps.gov/hale/planyourvisit/kipahulu.htm' },
        { text: 'Sunrise vehicles need a reservation from 3 a.m. to 7 a.m. It does not apply to an afternoon in Kīpahulu.', title: 'NPS fees', url: 'https://www.nps.gov/hale/planyourvisit/fees.htm' },
      ],
      towns: 'Both falls are filed under Hāna, which matches the access description better than most of these town assignments do.',
      method: 'The sunrise reservation is kept off the waterfall hike because the fee page limits it to the 3 a.m.–7 a.m. summit window. Waimoku\'s one-way mile is not doubled. Makahiku is not assumed to lie on the Pīpīwai Trail without a sentence that says so.',
    };
  },
  olympic(ctx) {
    const mary = find(ctx, 'Marymere Falls');
    const sol = find(ctx, 'Sol Duc Falls');
    return {
      dek: 'Marymere Falls has a round-trip distance and a wet-season note. Sol Duc Falls has a one-way distance and no season sentence. They are not the same valley.',
      overview: [
        'Olympic\'s description stresses range: nearly a million acres, glacier-capped mountains, temperate rain forest, and more than 70 miles of wild coastline. Two published falls are inside the boundary. Marymere is 0.9 miles one way, also stated as 1.8 miles round trip, with 267 reviews. The trip notes say it flows year-round and is strongest from fall through spring. Sol Duc is 1.1 miles one way, 101 reviews, and the trail file gives a difficulty code (SAC T1) without a season.',
        'The park charges $30 per vehicle for seven days and $15 for someone without a vehicle. No timed-entry rule showed up on the fee page we checked. Wilderness camping permits are a different system and are not required by anything stored for these two day hikes.',
      ],
      fallsIntro: 'Marymere\'s distance is stored as the round trip because the source gives both numbers. Sol Duc stays one way.',
      tableLead: 'The flow note exists for Marymere only. It is not copied onto Sol Duc.',
      effort: [
        `${mary.name} has more reviews (${num(mary.reviews)}) and a stated round trip of 1.8 miles. ${sol.name} has ${num(sol.reviews)} reviews and ${sol.distanceText}. Comparing reviews per mile across a round trip and a one-way walk flatters the one-way number. Both are short. Marymere is the one called easy, with stairs at the viewpoints. Sol Duc\'s trail file says SAC T1, which is a classification, not a sentence about families.`,
      ],
      plan: [
        `A single easy hike with a full sentence behind it is Marymere: 1.8 miles round trip, strongest from fall through spring, runnable year-round. Sol Duc is a separate 1.1-mile one-way walk. USGS places Sol Duc Falls along the Sol Duc River, southeast of Sol Duc Hot Springs. That is a different drainage from Marymere at Lake Crescent. They are not chained.`,
        `Two days means one valley each, not a combined mileage. The straight-line order is ${ctx.seeAll.order.join(', ')}. Adding the published figures gives ${mi(ctx.seeAll.miles)}, mixing a round trip and a one-way distance, which is why the total is labeled as a sum of published lengths and not as a single route.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'The peninsula\'s west side is much wetter than a gauge in the rain shadow. Marymere\'s own season note, fall through spring, is the better timing line for that fall. The gauge is context for the river it actually measures.')].filter(Boolean),
      feesLead: 'A standard seven-day vehicle pass. No timed entry turned up on the fee page.',
      access: [
        'The fee page points wilderness camping, filming, and lodging to a permits page. Day hikes to these two falls are covered by the entrance pass in the trip notes. Marymere\'s notes describe stairs up to the upper and lower viewpoints.',
      ],
      safety: [
        'Marymere is called easy, with stairs. No separate hazard about the water is stored. Sol Duc has a short one-way distance and a SAC T1 tag and nothing further. The park\'s general warning that weather can differ by 10 to 20 degrees between the coast and the high country is the climate note, and it matters if the two days are in different valleys.',
      ],
      tips: [
        { text: 'Marymere flows year-round and is strongest from fall through spring.', title: 'NPS Marymere Falls', url: 'https://www.nps.gov/places/000/marymere-falls-trailhead.htm' },
        { text: 'Vehicle entrance is $30 for seven days.', title: 'NPS fees', url: 'https://www.nps.gov/olym/planyourvisit/fees.htm' },
      ],
      towns: 'Both falls are filed under Port Angeles. Sol Duc Hot Springs, named in the USGS sentence for Sol Duc Falls, is the more specific landmark than the city.',
      method: 'Marymere uses the round trip embedded in the distance text. Sol Duc stays one way, and the reviews-per-mile comparison says so. The season sentence is not copied from one fall to the other. Straight-line order is not offered as a driving route.',
    };
  },
  'grand-canyon'(ctx) {
    const ribbon = ctx.falls[0];
    return {
      dek: 'Ribbon Falls is the one published waterfall whose coordinates sit inside Grand Canyon National Park. The famous Havasupai falls sit outside that boundary.',
      overview: [
        `NPS says the park is entirely in Arizona and includes 278 miles of the Colorado River. ${ribbon.name} has ${num(ribbon.reviews)} reviews, a trail name in the map file, and no distance or elevation. USGS does not give a height in the gazetteer text we store. The page exists because one sourced fall plus the park's fee and entry record is enough to be specific, and because leaving Havasu Falls off is a boundary decision visitors get wrong.`,
        'Havasu, Mooney, Beaver, and Navajo Falls are published on this site and sit just outside the NPS polygon, in Havasu Canyon. Havasu Falls\' own source in our trip file is the park\'s Havasupai page, which is about the reservation, not a park trail. They are not listed here.',
      ],
      fallsIntro: 'Ribbon Falls is the whole list. The blank distance is a missing measurement, not a claim that the trail is short. A Wikimedia caption mentions the North Kaibab Trail and Bright Angel Creek. That caption is on the photograph, not in our trail file, so it is not promoted into the table.',
      tableLead: 'One row, mostly dashes, is the honest table.',
      effort: [
        `There is no second fall to rank against. ${ribbon.name} has ${num(ribbon.reviews)} reviews and no miles, so reviews per mile is undefined. "Easiest" is not assigned.`,
      ],
      plan: [
        'A one-day or two-day itinerary with miles would be invented. The entrance rule is the part that is sourced: no reservation is required to enter the park. Campground reservations are encouraged and, at some campgrounds, required in season. That is lodging, not the fall.',
      ],
      flow: [gaugeLine(ctx.gauge, 'The Colorado River\'s seasonal pattern is not Ribbon Falls. If the chosen station is on the river or on Bright Angel Creek, the name says which. The month is that station\'s month.')].filter(Boolean),
      feesLead: 'A $35 vehicle pass, a $20 walk-in rate, and the $100 nonresident surcharge are all on the fee page. Entry itself is not on a timed ticket.',
      access: [
        'The basic-information page says reservations are strongly recommended for lodging in spring, summer, and fall, and the fee page says you do not need a reservation to enter. Those are different sentences. Ribbon Falls is not given a shuttle time because no shuttle time is in the sources tied to it.',
      ],
      safety: [
        'No trail-specific hazard for Ribbon Falls is in the trip file. The park\'s general canyon warnings are real and are not restated here as if they had been checked against this one fall.',
      ],
      tips: [
        { text: 'No reservation is required to enter.', title: 'NPS fees', url: 'https://www.nps.gov/grca/planyourvisit/fees.htm' },
        { text: 'The park is entirely in Arizona and covers 278 miles of the Colorado River.', title: 'NPS Grand Canyon', url: 'https://www.nps.gov/grca/index.htm' },
      ],
      towns: `${ribbon.name} is filed under ${ribbon.city}, about ${ribbon.cityMiles.toFixed(0)} straight-line miles away in our index. Grand Canyon Village is the place name. It is not a promise that the trail starts in the village.`,
      method: 'Inclusion is the boundary test. Havasupai falls fail that test and are named so the omission is visible. No distance is inferred from photo captions. The fee and reservation sentences are quoted from the fee page only.',
    };
  },
  'death-valley'(ctx) {
    const darwin = ctx.falls[0];
    return {
      dek: 'Darwin Falls is the one published fall inside Death Valley, and the USGS text calls it the park\'s highest at 80 feet. The hike on file is 1 mile one way.',
      overview: [
        `The park\'s description is a below-sea-level basin, record heat, and the contrast of snow on the peaks and oases in the canyons. ${darwin.name} is that oasis in the data we have: ${num(darwin.reviews)} reviews, ${darwin.distanceText}, and the gazetteer height. The fee page is unusually explicit that non-US residents may use the standard vehicle fee. It does not show the separate $100 surcharge that Yosemite, Yellowstone, and several other parks itemize.`,
        'No reservation is required to enter. Payment is card or digital at the park. If cash is the only option, the fee page says to buy the pass ahead or use an authorized vendor.',
      ],
      fallsIntro: 'One fall, one sourced one-way distance, one USGS height. That is the whole trail record.',
      tableLead: 'The distance is one way. The drop is the gazetteer\'s 80 feet.',
      effort: [
        `With one fall, the ratio is just ${num(darwin.reviews)} reviews over ${darwin.distanceText}. There is no second hike to call harder. The useful comparison is outside this park: an 80-foot fall an hour\'s walk up a canyon, in a park whose weather page is mostly about heat. The walk length does not cancel the heat. The weather page\'s heat records are about the valley floor. Darwin Canyon is not given its own temperature in our files.`,
      ],
      plan: [
        `The sourced outing is the Darwin Falls trail, ${darwin.distanceText}. A second day is not built. There is not another published fall inside the boundary to add. The straight-line distance from ${darwin.city} is about ${darwin.cityMiles.toFixed(0)} miles, which is the town assignment, not the trailhead drive.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'A gauge on the Amargosa or a valley wash is a poor stand-in for a spring-fed canyon fall. It is shown only with the station name and the mileage, so the mismatch is visible. If the station is many miles away, treat the calendar as climate, not as Darwin Creek.')].filter(Boolean),
      feesLead: 'The vehicle fee is $30 for seven days, and the fee text says non-US residents can use it. That is different from the parks that add $100 per person.',
      access: [
        'No entrance reservation. Card or digital payment at the park. Furnace Creek and Stovepipe Wells are among the places the fee page lists for buying a pass in person.',
      ],
      safety: [
        'The weather page documents long runs of days over 120°F on the valley floor. It does not mention Darwin Falls. The heat record is the park context for going at all. It is not a measured temperature at the fall. Carry that distinction.',
      ],
      tips: [
        { text: 'The standard vehicle fee applies to non-US residents on this park\'s fee page. No entrance reservation.', title: 'NPS fees', url: 'https://www.nps.gov/deva/planyourvisit/fees.htm' },
        { text: 'USGS calls Darwin Falls the highest in the park, at 80 feet.', title: 'Darwin Falls page, USGS text', url: darwin.url },
      ],
      towns: `${darwin.city} is the nearest city of 1,000 people in our index, ${darwin.cityMiles.toFixed(0)} straight-line miles off. Lone Pine is a highway town west of the park, not the canyon parking lot.`,
      method: 'Height is the USGS gazetteer figure, not a listing blurb. Distance is one way from the trail file and is not doubled. The absence of a $100 nonresident line is itself from the fee page wording, which says the vehicle fee covers those visitors. The gauge is labeled with its real station so a valley river is not mistaken for the fall.',
    };
  },
  'lassen-volcanic'(ctx) {
    const kings = ctx.falls[0];
    return {
      dek: 'Kings Creek Falls is a 1.1-mile one-way hike inside Lassen, and the entrance fee drops from $30 to $10 for the winter window when the trails are under snow.',
      overview: [
        `The park describes fumaroles, wildflower meadows, and a volcanic landscape that is still being shaped by hot water. ${kings.name} is the published fall inside the boundary: ${num(kings.reviews)} reviews, ${kings.distanceText}, difficulty recorded as SAC T2. USGS places it on Kings Creek in the park. The weather page says trails snow over in winter and melt out in spring, and that the main road is dug out from 30 to 40 feet of snow each year.`,
        'The fee changes with that season. A private vehicle is $30 from April 16 through November 30 and $10 from December 1 through April 15. The cheap window is the buried-trail window. That is the planning tension, and it is entirely from the fee page and the weather page.',
      ],
      fallsIntro: 'One distance, one way, with a trail classification and no elevation gain in the file.',
      tableLead: 'SAC T2 is the difficulty cell. It is a classification from the trail file, not a sentence about who the hike suits.',
      effort: [
        `There is no second fall to rank. The single figure is ${kings.distanceText} and ${num(kings.reviews)} reviews. "Easiest in the park" would require another measured hike. What can be said is that 1.1 miles one way is a short distance on paper, and the weather page says the trail may not be melted out until spring.`,
      ],
      plan: [
        `The outing is Kings Creek Falls, ${kings.distanceText}. A second day is not added. The road opening is the other half of the plan: the park clears 30 to 40 feet of snow off the main road every spring, so a date on the calendar is not the same as an open trailhead.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Kings Creek is a small stream. A gauge on a larger river in the same mountains will share the snowmelt timing and not the volume. The peak month is still the right question: it should line up with the weather page\'s "melt out in spring" if the station is in this drainage.')].filter(Boolean),
      feesLead: 'Two vehicle prices, split on April 16 and December 1. The lower price is the snow season.',
      access: [
        'When the entrance station is not staffed, the fee page says digital passes can be bought online. That is the winter practicality. No timed-entry system is described on the pages checked.',
      ],
      safety: [
        'The hazard on file is seasonal access, not a cliff warning: snow on the trails in winter, melt in spring, and a road that starts the year under 30 to 40 feet of snow. SAC T2 is the only difficulty tag.',
      ],
      tips: [
        { text: 'Trails snow over in winter and melt out in spring. The main road is cleared of 30–40 feet of snow.', title: 'NPS weather', url: 'https://www.nps.gov/lavo/planyourvisit/weather.htm' },
        { text: 'Vehicle fee is $30 from April 16 to November 30 and $10 from December 1 to April 15.', title: 'NPS fees', url: 'https://www.nps.gov/lavo/planyourvisit/fees.htm' },
      ],
      towns: `${kings.city} is the nearest city in our index, about ${kings.cityMiles.toFixed(0)} straight-line miles away. Chester is the town label, not the Kings Creek trailhead.`,
      method: 'One fall, so no ranking. The one-way mile is not doubled. The fee split and the snow sentence are kept together because they describe the same season from two NPS pages. The gauge is accepted only as a dated discharge record at the named station.',
    };
  },
  sequoia(ctx) {
    const tok = ctx.falls[0];
    return {
      dek: 'Tokopah Falls is the published fall inside Sequoia. USGS calls it a 1,200-foot drop over granite. Our trail file has no hike length for it.',
      overview: [
        `The joint park page with Kings Canyon talks about huge mountains, deep canyons, and the largest trees. ${tok.name} is the waterfall in our published set: ${num(tok.reviews)} reviews, a USGS description of a 1,200-foot granite drop, and no distance in the trail file. A photograph caption on Wikimedia mentions 1.7 miles. That caption is not moved into the table.`,
        'The entrance pass is the same $35, seven-day instrument as Kings Canyon, including the nonresident $100 charge. No reservation is required to enter. The weather page says the foothills can be in spring flower while Giant Forest still has snow, and that Mineral King is usually open to vehicles only from late spring to early fall. Tokopah is on the Marble Fork side of the park, not in Mineral King, so the Mineral King dates are context for the park and not a trailhead calendar for this fall.',
      ],
      fallsIntro: 'The height is the sourced fact. The hike length is the gap.',
      tableLead: 'Drop is filled. Distance, elevation, and difficulty are dashes.',
      effort: [
        `Reviews per mile is undefined without miles. ${num(tok.reviews)} reviews say the fall is written about. They do not say how long the walk is. No "easy" or "family" label is attached, because the trail file does not support one.`,
      ],
      plan: [
        'A day plan with a mileage would invent the approach. The sourced plan is the entrance rule and the season of the rivers: no reservation to drive in, and rivers that are extremely hazardous in spring and early summer when snowmelt is high. A second day inside this park is not available from a second published fall. Kings Canyon\'s two falls can share the same pass and are a different park\'s page.',
      ],
      flow: [gaugeLine(ctx.gauge, 'The Marble Fork of the Kaweah is the creek in the USGS description of the area around Tokopah. A gauge on that fork is meaningful. A gauge on a different fork should be read by its station name, which is printed above the months.')].filter(Boolean),
      feesLead: 'Same pass as Kings Canyon, including the nonresident surcharge, and no entrance reservation.',
      access: [
        'Winter storms close roads until they are plowed. The basic-information page says the parks are otherwise open all day, all year. Giant Forest and the foothills can be in different seasons on the same afternoon, which matters for what "spring" means on the way to the trailhead.',
      ],
      safety: [
        'Rivers in the parks are called extremely hazardous in spring and early summer because of cold, fast snowmelt. That is the waterfall-relevant warning on the basic-information page. There is no separate Tokopah hazard sentence in the trip file.',
      ],
      tips: [
        { text: 'USGS: a 1,200-foot drop over granite in Sequoia National Park.', title: 'Waterfall page, USGS text', url: tok.url },
        { text: 'No entrance reservation. Rivers are most dangerous in spring and early summer.', title: 'NPS basic information', url: 'https://www.nps.gov/seki/planyourvisit/basicinfo.htm' },
      ],
      towns: `${tok.city} is the nearest city in our index, about ${tok.cityMiles.toFixed(0)} straight-line miles away. Three Rivers is the gateway town for the Kaweah drainage in that index.`,
      method: 'Height is taken from the USGS gazetteer sentence, not from a photo caption that also mentions 1.7 miles. The missing hike length stays missing. The shared pass with Kings Canyon is stated once, as a fee fact, not as a combined itinerary.',
    };
  },
  'new-river-gorge'(ctx) {
    const sand = ctx.falls[0];
    return {
      dek: 'Sandstone Falls is a boardwalk, not a backcountry hike: 390 feet one way, no entrance fee, and a season note that says the river runs all year and harder in spring.',
      overview: [
        `The park describes a rugged river that flows north, more than 70,000 acres, and the New River as one of the oldest on the continent. ${sand.name} is the published fall inside the boundary used for this page, the current National Park and Preserve polygon. It has ${num(sand.reviews)} reviews, which is more than many multi-fall parks\' busiest single fall. The trail file distance is ${sand.distanceText}.`,
        'The trip notes say the fall runs year-round and is strong in spring, and that there is no activity fee. The fee page agrees there is no entrance fee. Effort-to-reward, if the phrase means reviews per mile of walking, makes this an outlier: hundreds of reviews for a few hundred feet of boardwalk. That is a real pattern in the data, and it is a different pattern from Ramsey Cascades or the Mist Trail.',
      ],
      fallsIntro: 'One fall. The distance is in feet in the source, which is why it looks nothing like a trail-mileage row.',
      tableLead: '390 feet one way is the whole hike record. There is no elevation gain and no difficulty word.',
      effort: [
        `${num(sand.reviews)} reviews divided by ${mi(sand.miles)} is a huge reviews-per-mile number because the denominator is a boardwalk. Using that number to compare Sandstone Falls with a mountain trail in another park would be an abuse of the ratio. Inside this park there is no second fall to compare. The ratio is reported so the method stays visible, and then set aside.`,
      ],
      plan: [
        `The visit is the boardwalk: ${sand.distanceText}. A second day of waterfall hiking is not in this dataset. The park has miles of river that are not waterfall pages on our site. Spring is the sourced "strong flow" season, and the notes also say the fall does not dry up in summer the way a Sierra wall fall does.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'The New River is the right water for this fall if the station is on the New River near Hinton or Sandstone. The spring bump in the trip notes should show up as a higher spring month. If the peak is elsewhere, the gauge and the trip note disagree and both stay on the page.')].filter(Boolean),
      feesLead: 'No entrance fee, and the trip note says no activity fee at Sandstone.',
      access: [
        'The NPS place page and the boardwalk thing-to-do are the access documents. Nothing in them, as stored in our trip file, describes a shuttle or a timed entry. Parking is the boardwalk lot, and the distance from the lot is the 390 feet.',
      ],
      safety: [
        'No hazard sentence specific to the boardwalk is in the trip file beyond the usual implication of a river overlook. None is added. The river description on the park homepage, whitewater in a deep canyon, is about the gorge as a whole and is not restated as a swimming warning for this overlook.',
      ],
      tips: [
        { text: 'No entrance fee.', title: 'NPS fees', url: 'https://www.nps.gov/neri/planyourvisit/fees.htm' },
        { text: 'Year-round flow, stronger in spring. Boardwalk is 390 feet one way. No activity fee.', title: 'NPS Sandstone Falls', url: 'https://www.nps.gov/places/sandstone-falls.htm' },
      ],
      towns: `${sand.city} is the nearest city in our index, about ${sand.cityMiles.toFixed(0)} straight-line miles away. Hinton is the town at this end of the gorge.`,
      method: 'The boardwalk length is converted to miles only inside the ratio, and the ratio is then flagged as misleading for cross-park comparison. Flow timing comes from the trip note, checked against the gauge if the station is actually on the New River. The boundary is the current park-and-preserve polygon, not the older "national river" label.',
    };
  },
  'grand-teton'(ctx) {
    const hidden = ctx.falls[0];
    return {
      dek: 'Hidden Falls is the published fall inside Grand Teton. USGS puts it on Cascade Creek. The trail file has no distance, and the weather page says snow often stays in the mountains until mid-July.',
      overview: [
        `The park\'s description is the Teton Range over Jackson Hole, wildlife, and lakes. ${hidden.name} has ${num(hidden.reviews)} reviews and the gazetteer line "In Grand Teton NP, on Cascade Creek." There is no hike length, elevation, or difficulty in the trail file. A boat shuttle across Jenny Lake is a well-known way to shorten the approach. It is not in our sources for this fall, so it is not written up as a schedule or a fare.`,
        'Entrance is $35 per vehicle for seven days. Vehicle reservations are not required. Non-US residents pay the additional $100 on this fee page. Lodging and campgrounds are reservable and the park says they can fill months ahead. That is beds, not the trail.',
      ],
      fallsIntro: 'One fall, identified by the USGS sentence, without a trail row to plan from.',
      tableLead: 'The review count is the filled cell. Distance and difficulty are not.',
      effort: [
        'Reviews per mile is undefined. "Easy" is not inferred from the review count. The weather constraint that is sourced is snow in the mountains until mid-July, which can leave a trail in the range under snow after the valley has warmed. The weather page separates those two climates on purpose.',
      ],
      plan: [
        `There is no mileage itinerary. One day or two days cannot be assigned a distance. The dated constraint is the snow line: the weather page says snow often remains in the mountains until mid-July, while Moose, at the visitor center, reaches the 80s in summer and can see more than a dozen feet of snow in winter. ${hidden.name} is on Cascade Creek, which is a mountain creek in the gazetteer, so the mountain sentence is the relevant one.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Cascade Creek is a small tributary. A Snake River gauge at Moose measures the valley river. The station name decides whether the month belongs to this fall. Snow until mid-July is the trail constraint even if the river peaks earlier.')].filter(Boolean),
      feesLead: 'An entrance fee, no vehicle reservation, and the nonresident surcharge. Campground reservations are separate and can be gone months out.',
      access: [
        'The fee page says to expect lines at the gates and crowds at popular areas in summer, and it says you do not need a reservation to enter. No shuttle timetable for Hidden Falls is stored, so the page stops there.',
      ],
      safety: [
        'Afternoon storms, lightning, and rockfall are on the weather page as mountain conditions, distinct from the valley. Snow on trails in summer is stated. Those are the sourced mountain cautions. A fall-specific swimming or current warning is not in the trip file.',
      ],
      tips: [
        { text: 'Snow often stays in the mountains until mid-July.', title: 'NPS weather', url: 'https://www.nps.gov/grte/planyourvisit/weather.htm' },
        { text: 'Vehicle reservations are not required. The entrance fee is.', title: 'NPS fees', url: 'https://www.nps.gov/grte/planyourvisit/fees.htm' },
      ],
      towns: `${hidden.city} is the town label in our index, about ${hidden.cityMiles.toFixed(0)} straight-line miles from the coordinate. Moose Wilson Road is that label. It is not the trailhead name.`,
      method: 'No trail distance, so no ratio and no itinerary miles. The Jenny Lake boat is omitted because it is not in the cited sources. Snow timing is the weather page\'s mountain sentence, not a valley forecast. The gauge is printed with its station name so a Snake River record is not silently treated as Cascade Creek.',
    };
  },
  saguaro(ctx) {
    const bridal = ctx.falls[0];
    return {
      dek: 'Bridal Wreath Falls is the published fall inside Saguaro. The trail file names a trail and does not give a distance. The park is the desert on both sides of Tucson, and this page does not invent a rainy-season claim for the fall.',
      overview: [
        `Saguaro National Park is the cactus forest east and west of Tucson. ${bridal.name} has ${num(bridal.reviews)} reviews and a trail name in the map file, ${bridal.trailName || 'with no name stored'}. There is no distance, elevation, difficulty, USGS height, or season sentence. A desert fall is often episodic. Saying so without a source would be a guess, so the season cell stays empty.`,
        'The vehicle fee is $25. The fee page describes it as a dated receipt for one private vehicle. Hikers, riders, and cyclists are $15. Motorcycles are $20 for seven days. No timed entry is described on the fee page we used.',
      ],
      fallsIntro: 'The trail name is the only trail fact. Everything else in the table is a dash.',
      tableLead: 'An empty row of measurements is preferable to a borrowed description from a different Bridal Wreath.',
      effort: [
        'No mileage, so no reviews-per-mile score and no "shortest hike" award. Twenty-seven reviews say the place is known to some visitors and not a major reviewed destination next to Brandywine or Narada. That is the crowd statement the data supports.',
      ],
      plan: [
        'No one-day mileage and no second fall. The plan that is sourced is the entrance receipt and the setting: a desert park on both sides of Tucson, with this fall filed under Tanque Verde. The Rincon Mountains are the east unit. The trail name is the lead for finding the route on a map, not a length.',
      ],
      flow: [gaugeLine(ctx.gauge, 'A gauge on Tanque Verde Wash or a similar desert channel spends much of the year near zero and spikes after storms. That pattern is the wash, not a measured flow over Bridal Wreath Falls. The station name and the mileage are there so the difference stays obvious.')].filter(Boolean),
      feesLead: 'A modest vehicle fee, sold as a dated receipt. No timed entry on the fee page.',
      access: [
        'The park flanks Tucson. Our directory files this fall under Tanque Verde, which is the east side. The west district is a separate drive. Nothing in the trip file says which district the trailhead is in beyond the coordinate and the town label, so the page does not assign a visitor center.',
      ],
      safety: [
        'The weather page says interpretive programs are intermittent in late spring and summer because of the heat, and that winter is when more ranger programs run. That is a heat calendar for being in the park. It is not a statement that the fall flows in winter. No fall-specific hazard is on file.',
      ],
      tips: [
        { text: 'Vehicle entrance is $25, described as a dated receipt.', title: 'NPS fees', url: 'https://www.nps.gov/sagu/planyourvisit/fees.htm' },
        { text: 'Summer programs are limited because of heat. That is about being outside, not about waterfall volume.', title: 'NPS weather', url: 'https://www.nps.gov/sagu/planyourvisit/weather.htm' },
      ],
      towns: `${bridal.city} is the nearest city in our index, about ${bridal.cityMiles.toFixed(0)} straight-line miles from the coordinate.`,
      method: 'No season is inferred from the desert setting. No distance is taken from the trail name alone. The heat note is kept in the safety section and explicitly separated from flow. Reviews are the crowd measure, with the small count stated rather than dressed up.',
    };
  },
  acadia(ctx) {
    const hadlock = ctx.falls[0];
    return {
      dek: 'Hadlock Falls is a seasonal cascade under Waterfall Bridge on Acadia\'s carriage roads. It is not a summit hike, and the Cadillac reservation does not apply to it.',
      overview: [
        `Acadia protects the highest rocky headlands on the Atlantic coast of the United States, with 27 miles of historic motor roads, 158 miles of hiking trails, and 45 miles of carriage roads. ${hadlock.name} is the published fall tied to the park. USGS says "Located in Acadia NP." The mapped coordinate sits just outside the digitized boundary, within two kilometers, which is why the match is the gazetteer plus the NPS description rather than the polygon alone.`,
        `NPS says Waterfall Bridge, built in 1925, carries a carriage road over Upper Hadlock Brook at a 40-foot waterfall. The fall is not always there. The fast-facts article says it usually appears in spring and autumn, sometimes in early summer after enough rain, and that it is absent when the brook is low. The trail file gives ${hadlock.distanceText} on ${hadlock.trailName || 'the mapped trail'}. That distance is one way.`,
      ],
      fallsIntro: 'This is a carriage-road view of a brook that turns on and off, not a plunge you can count on in August. The article is the source for that, not a guess from the latitude.',
      tableLead: 'Distance is one way. Height is not filled from the "40-foot" bridge sentence unless you read the place page yourself. The place page says the bridge is 31 feet at its highest point and that the arch crosses a 40-foot waterfall. The table leaves the drop blank because our USGS text for the fall does not state a height, and the 40-foot figure is the bridge article\'s description of the scene.',
      effort: [
        `One fall, ${hadlock.distanceText}, ${num(hadlock.reviews)} reviews. Reviews per mile is a single number and not a ranking. The walk is as long as the trail file says and no easier or harder word is stored, so no difficulty is displayed. The crowd signal is the small review count next to a famous park: Hadlock is not the place the review data says everyone writes about.`,
      ],
      plan: [
        `The sourced outing is the carriage-road approach in the trail file, ${hadlock.distanceText}, timed for spring, autumn, or a rainy early summer if you want water in the brook. A second day of waterfall hiking is not in this dataset. Cadillac Summit Road, which needs its own vehicle reservation from mid-May into October, is a different destination. The fee page says that reservation is sold only online.`,
      ],
      flow: [gaugeLine(ctx.gauge, 'Hadlock Brook is a small carriage-road stream. A gauge on a larger Mount Desert stream is a rainfall cousin, not a measurement of this brook. The NPS sentence about spring and autumn is the timing line to trust for the fall itself.')].filter(Boolean),
      feesLead: 'A $35 vehicle pass, a printed dashboard pass, and a separate summit-road reservation that this hike does not use.',
      access: [
        'Entrance passes must be printed and displayed. The fee page says cell service is extremely limited, so an unprinted QR code is a bad plan. Non-US residents pay an additional $100 per person unless they hold an annual or America the Beautiful pass. The summit reservation is extra and is not sold at the park.',
      ],
      safety: [
        'The sourced risk is showing up when the brook is dry and calling it closed. The article says there is a waterfall when there is enough water, typically spring and autumn. No cliff or tide warning is attached to this fall in the sources, so none is added. The carriage roads are closed to cars. That is the design of the road system in the bridge article, not a trail closure.',
      ],
      tips: [
        { text: 'The fall under Waterfall Bridge is typically seen in spring and autumn, and sometimes in early summer after rain.', title: 'NPS Waterfall Bridge', url: 'https://www.nps.gov/articles/000/waterfall-bridge-fast-facts.htm' },
        { text: 'Cadillac Summit Road reservations are separate, online only, mid-May into October.', title: 'NPS fees', url: 'https://www.nps.gov/acad/planyourvisit/fees.htm' },
        { text: 'Print the entrance pass. Cell service is described as extremely limited.', title: 'NPS fees', url: 'https://www.nps.gov/acad/planyourvisit/fees.htm' },
      ],
      towns: `${hadlock.city} is the nearest city in our index, about ${hadlock.cityMiles.toFixed(0)} straight-line miles from the coordinate. Bar Harbor is the town on Mount Desert Island in that index.`,
      method: 'The fall is included because USGS names Acadia and NPS describes Hadlock Falls from Waterfall Bridge, even though the point misses the high-resolution boundary. The 40-foot figure stays in the prose as the bridge article\'s words and out of the USGS height column. One-way trail miles are not doubled. The summit reservation is kept off this hike by the fee page\'s own scope.',
    };
  },
};
