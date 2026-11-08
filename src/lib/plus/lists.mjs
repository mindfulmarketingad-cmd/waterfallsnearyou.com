import { db } from './db.mjs';
import { listingByUrl } from './catalog.mjs';
import { HttpError } from './http.mjs';
import { newToken } from './auth.mjs';

export async function savedList(userId) {
  const sql = await db();
  const [existing] = await sql`select * from lists where user_id = ${userId} and kind = 'saved'`;
  if (existing) return existing;
  const [created] = await sql`
    insert into lists (id, user_id, name, kind)
    values (${crypto.randomUUID()}, ${userId}, 'Saved', 'saved')
    returning *`;
  return created;
}

async function watch(userId, listingId) {
  const sql = await db();
  await sql`
    insert into watches (user_id, listing_id, muted)
    values (${userId}, ${listingId}, false)
    on conflict (user_id, listing_id) do nothing`;
}

export async function saveListing(userId, url) {
  const listing = listingByUrl(url);
  if (!listing) throw new HttpError(404, 'That waterfall is not in the directory.');
  const list = await savedList(userId);
  const sql = await db();
  await sql`
    insert into list_items (list_id, listing_id, position)
    values (${list.id}, ${listing.url}, 0)
    on conflict (list_id, listing_id) do nothing`;
  await watch(userId, listing.url);
  return listing;
}

export async function createList(userId, name, kind = 'custom') {
  const clean = String(name || '').trim().slice(0, 80);
  if (!clean) throw new HttpError(400, 'Name the list.');
  const sql = await db();
  const [created] = await sql`
    insert into lists (id, user_id, name, kind)
    values (${crypto.randomUUID()}, ${userId}, ${clean}, ${kind})
    returning *`;
  return created;
}

export async function addToList(userId, listId, url, day = null) {
  const listing = listingByUrl(url);
  if (!listing) throw new HttpError(404, 'That waterfall is not in the directory.');
  const sql = await db();
  const [list] = await sql`select * from lists where id = ${listId} and user_id = ${userId}`;
  if (!list) throw new HttpError(404, 'List not found.');
  const [{ n }] = await sql`select count(*)::int as n from list_items where list_id = ${listId}`;
  await sql`
    insert into list_items (list_id, listing_id, position, day)
    values (${listId}, ${listing.url}, ${n}, ${day})
    on conflict (list_id, listing_id) do update set day = excluded.day`;
  await watch(userId, listing.url);
  return listing;
}

export async function removeFromList(userId, listId, url) {
  const sql = await db();
  const [list] = await sql`select * from lists where id = ${listId} and user_id = ${userId}`;
  if (!list) throw new HttpError(404, 'List not found.');
  await sql`delete from list_items where list_id = ${listId} and listing_id = ${url}`;
  const [{ n }] = await sql`
    select count(*)::int as n from list_items
    join lists on lists.id = list_items.list_id
    where lists.user_id = ${userId} and list_items.listing_id = ${url}`;
  if (!n) await sql`delete from watches where user_id = ${userId} and listing_id = ${url}`;
}

export async function deleteList(userId, listId) {
  const sql = await db();
  const [list] = await sql`select * from lists where id = ${listId} and user_id = ${userId}`;
  if (!list) throw new HttpError(404, 'List not found.');
  if (list.kind === 'saved') throw new HttpError(400, 'The Saved list stays on the account.');
  const items = await sql`select listing_id from list_items where list_id = ${listId}`;
  await sql`delete from lists where id = ${listId}`;
  for (const item of items) {
    const [{ n }] = await sql`
      select count(*)::int as n from list_items
      join lists on lists.id = list_items.list_id
      where lists.user_id = ${userId} and list_items.listing_id = ${item.listing_id}`;
    if (!n) await sql`delete from watches where user_id = ${userId} and listing_id = ${item.listing_id}`;
  }
}

export async function shareList(userId, listId) {
  const sql = await db();
  const [list] = await sql`select * from lists where id = ${listId} and user_id = ${userId}`;
  if (!list) throw new HttpError(404, 'List not found.');
  if (list.share_token) return list.share_token;
  const token = newToken();
  await sql`update lists set share_token = ${token} where id = ${listId}`;
  return token;
}

function shapeItem(row) {
  const listing = listingByUrl(row.listing_id);
  return {
    url: row.listing_id,
    day: row.day,
    name: listing?.name || row.listing_id,
    city: listing?.city || null,
    stateCode: listing?.stateCode || null,
  };
}

export async function listsForUser(userId) {
  const sql = await db();
  await savedList(userId);
  const lists = await sql`select * from lists where user_id = ${userId} order by created_at`;
  const items = await sql`
    select list_items.* from list_items
    join lists on lists.id = list_items.list_id
    where lists.user_id = ${userId}
    order by list_items.position, list_items.listing_id`;
  const watches = await sql`select * from watches where user_id = ${userId} order by listing_id`;
  return {
    lists: lists.map((list) => ({
      id: list.id,
      name: list.name,
      kind: list.kind,
      shareToken: list.share_token,
      items: items.filter((item) => item.list_id === list.id).map(shapeItem),
    })),
    watches: watches.map((watch) => {
      const listing = listingByUrl(watch.listing_id);
      return { url: watch.listing_id, muted: watch.muted, name: listing?.name || watch.listing_id };
    }),
  };
}

export async function setWatch(userId, url, muted) {
  const sql = await db();
  const rows = await sql`
    update watches set muted = ${!!muted}
    where user_id = ${userId} and listing_id = ${url}
    returning listing_id`;
  if (!rows.length) throw new HttpError(404, 'That waterfall is not on a saved list.');
}

export async function setAlertsEnabled(userId, enabled) {
  const sql = await db();
  await sql`update users set alerts_enabled = ${!!enabled} where id = ${userId}`;
}

export async function sharedList(token) {
  if (!token || token.length < 20) throw new HttpError(404, 'List not found.');
  const sql = await db();
  const [list] = await sql`select * from lists where share_token = ${token}`;
  if (!list) throw new HttpError(404, 'List not found.');
  const items = await sql`select * from list_items where list_id = ${list.id} order by day nulls last, position, listing_id`;
  return {
    name: list.name,
    kind: list.kind,
    items: items.map(shapeItem),
  };
}

export async function saveItinerary(userId, name, plan) {
  const list = await createList(userId, name || `Trip to ${plan.anchor?.label || 'waterfalls'}`, 'trip');
  let position = 0;
  for (const day of plan.days || []) {
    for (const stop of day.stops || []) {
      await addToList(userId, list.id, stop.url, day.day || null);
      position += 1;
    }
  }
  return { id: list.id, stops: position };
}
