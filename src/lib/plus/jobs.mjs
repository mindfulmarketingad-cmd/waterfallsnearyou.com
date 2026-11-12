import { catalog, listingByUrl } from './catalog.mjs';
import { liveReport } from './conditions.mjs';
import { alertSignals } from './conditions-logic.mjs';
import { db } from './db.mjs';
import { sendAlertEmail } from './email.mjs';
import { isEntitled } from './entitlement.mjs';

async function readCache(url) {
  const sql = await db();
  const [row] = await sql`select payload, fetched_at from condition_cache where listing_id = ${url}`;
  return row || null;
}

export async function storeReport(url, report) {
  const sql = await db();
  await sql`
    insert into condition_cache (listing_id, payload, fetched_at)
    values (${url}, ${sql.json(report)}, now())
    on conflict (listing_id) do update set payload = excluded.payload, fetched_at = now()`;
}

export async function reportFor(listing, { maxAgeHours = 12 } = {}) {
  const cached = await readCache(listing.url);
  const age = cached ? Date.now() - new Date(cached.fetched_at).getTime() : Infinity;
  if (cached && age < maxAgeHours * 3600000) return { ...cached.payload, stale: false };
  try {
    const report = await liveReport(listing);
    await storeReport(listing.url, report);
    return { ...report, stale: false };
  } catch (err) {
    if (cached) return { ...cached.payload, stale: true, error: err.message };
    return {
      url: listing.url,
      name: listing.name,
      unavailable: true,
      message: 'Conditions could not be loaded, and nothing is cached yet.',
      season: listing.bestSeason ? { text: listing.bestSeason, known: false, now: false, note: 'Shown from the visit notes only.' } : null,
      cautions: [],
      gauge: { matched: false, reason: 'Gauge data could not be checked just now.' },
      sources: [],
    };
  }
}

async function entitledWatchUrls() {
  const sql = await db();
  const rows = await sql`
    select watches.listing_id, users.*
    from watches
    join users on users.id = watches.user_id
    where watches.muted = false and users.alerts_enabled = true`;
  return rows.filter((row) => isEntitled(row));
}

export async function refreshConditions({ limit = 40 } = {}) {
  const sql = await db();
  const watches = await entitledWatchUrls();
  const urls = [...new Set(watches.map((row) => row.listing_id))];
  const popular = [...catalog().listings].sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
  const [state] = await sql`
    insert into job_state (name, cursor) values ('conditions', 0)
    on conflict (name) do update set name = excluded.name
    returning cursor`;
  const start = state?.cursor || 0;
  const extra = [];
  for (let i = 0; i < 15 && popular.length; i++) extra.push(popular[(start + i) % popular.length].url);
  await sql`update job_state set cursor = ${(start + 15) % Math.max(popular.length, 1)}, updated_at = now() where name = 'conditions'`;
  const queue = [...new Set([...urls, ...extra])].slice(0, limit);
  let refreshed = 0;
  for (const url of queue) {
    const listing = listingByUrl(url);
    if (!listing) continue;
    const cached = await readCache(url);
    const age = cached ? Date.now() - new Date(cached.fetched_at).getTime() : Infinity;
    if (age < 6 * 3600000) continue;
    try {
      await storeReport(url, await liveReport(listing));
      refreshed += 1;
    } catch (err) {
      console.error(`conditions ${url}: ${err.message}`);
    }
  }
  return { considered: queue.length, refreshed };
}

export async function sendDueAlerts({ limit = 40 } = {}) {
  const rows = await entitledWatchUrls();
  const byListing = new Map();
  for (const row of rows) {
    if (!byListing.has(row.listing_id)) byListing.set(row.listing_id, []);
    byListing.get(row.listing_id).push(row);
  }
  const urls = [...byListing.keys()].slice(0, limit);
  const pending = new Map();
  let checked = 0;
  for (const url of urls) {
    const listing = listingByUrl(url);
    if (!listing) continue;
    checked += 1;
    let report;
    try {
      report = await reportFor(listing, { maxAgeHours: 6 });
    } catch (err) {
      console.error(`alert refresh ${url}: ${err.message}`);
      continue;
    }
    if (report.unavailable) continue;
    const signals = alertSignals(report);
    if (!signals.length) continue;
    const sql = await db();
    for (const user of byListing.get(url)) {
      const fresh = [];
      for (const signal of signals) {
        const [seen] = await sql`
          select 1 from alert_sends
          where user_id = ${user.id} and listing_id = ${url} and kind = ${signal.kind} and fingerprint = ${signal.fingerprint}`;
        if (!seen) fresh.push(signal);
      }
      if (!fresh.length) continue;
      const bucket = pending.get(user.id) || { user, items: [] };
      bucket.items.push({ url, name: listing.name, signals: fresh });
      pending.set(user.id, bucket);
    }
  }
  let sent = 0;
  for (const bucket of pending.values()) {
    try {
      await sendAlertEmail({ email: bucket.user.email, unsubToken: bucket.user.unsub_token, items: bucket.items });
      const sql = await db();
      for (const item of bucket.items) {
        for (const signal of item.signals) {
          await sql`
            insert into alert_sends (user_id, listing_id, kind, fingerprint)
            values (${bucket.user.id}, ${item.url}, ${signal.kind}, ${signal.fingerprint})
            on conflict do nothing`;
        }
      }
      sent += 1;
    } catch (err) {
      console.error(`alert email ${bucket.user.email}: ${err.message}`);
    }
  }
  return { checked, emailed: sent };
}
