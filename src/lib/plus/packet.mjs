import { listingByUrl } from './catalog.mjs';
import { HttpError } from './http.mjs';

export function placeFromListing(listing) {
  const notes = [];
  if (listing.hike) notes.push(`Trail and distance: ${listing.hike}`);
  if (listing.difficulty) notes.push(`Difficulty: ${listing.difficulty}`);
  if (listing.parking) notes.push(`Parking: ${listing.parking}`);
  if (listing.fees) notes.push(`Fees and permits: ${listing.fees}`);
  if (listing.dogs) notes.push(`Dogs: ${listing.dogs}`);
  if (listing.swimming) notes.push(`Swimming: ${listing.swimming}`);
  if (listing.accessibility) notes.push(`Accessibility: ${listing.accessibility}`);
  if (listing.bestSeason) notes.push(`Season noted on the site: ${listing.bestSeason}`);
  const where = [listing.city, listing.stateCode, listing.county ? `${listing.county} County` : null].filter(Boolean).join(', ');
  return {
    name: listing.name,
    where,
    coords: `${Number(listing.lat).toFixed(5)}, ${Number(listing.lng).toFixed(5)}`,
    map: `https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`,
    osm: `https://www.openstreetmap.org/?mlat=${listing.lat}&mlon=${listing.lng}#map=14/${listing.lat}/${listing.lng}`,
    notes,
    nearby: listing.nearby || [],
    url: listing.url,
  };
}

export function packetForListing(url) {
  const listing = listingByUrl(url);
  if (!listing) throw new HttpError(404, 'That waterfall is not in the directory.');
  return {
    title: `${listing.name} day packet`,
    notes: ['Save or print this before you lose cell service. It repeats notes already published on the waterfall page.'],
    places: [placeFromListing(listing)],
  };
}

export async function packetForList(userId, listId) {
  const { db } = await import('./db.mjs');
  const sql = await db();
  const [list] = await sql`select * from lists where id = ${listId} and user_id = ${userId}`;
  if (!list) throw new HttpError(404, 'List not found.');
  const items = await sql`select * from list_items where list_id = ${listId} order by day nulls last, position`;
  const places = items.map((item) => {
    const listing = listingByUrl(item.listing_id);
    if (!listing) return null;
    const place = placeFromListing(listing);
    if (item.day) place.name = `Day ${item.day}: ${place.name}`;
    return place;
  }).filter(Boolean);
  return {
    title: list.name,
    notes: ['Printed from your Waterfalls Near You list. Blank fields were not in the site notes, so they are omitted rather than guessed.'],
    places,
  };
}
