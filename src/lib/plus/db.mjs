import postgres from 'postgres';
import { HttpError } from './http.mjs';

const SCHEMA = [
  `create table if not exists users (
    id uuid primary key,
    email text unique not null,
    created_at timestamptz not null default now(),
    stripe_customer_id text unique,
    subscription_id text,
    subscription_status text not null default 'none',
    price_id text,
    plan_interval text,
    trial_end timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    complimentary boolean not null default false,
    trial_consumed boolean not null default false,
    alerts_enabled boolean not null default true,
    unsub_token text unique not null,
    billing_hold boolean not null default false,
    billing_hold_reason text
  )`,
  `create table if not exists sessions (
    token_hash text primary key,
    user_id uuid not null references users(id) on delete cascade,
    expires_at timestamptz not null
  )`,
  `create table if not exists magic_links (
    token_hash text primary key,
    email text not null,
    next_path text not null default '/account',
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists stripe_events (
    id text primary key,
    type text not null,
    received_at timestamptz not null default now()
  )`,
  `create table if not exists lists (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    kind text not null default 'custom',
    share_token text unique,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists list_items (
    list_id uuid not null references lists(id) on delete cascade,
    listing_id text not null,
    position int not null default 0,
    day int,
    primary key (list_id, listing_id)
  )`,
  `create table if not exists watches (
    user_id uuid not null references users(id) on delete cascade,
    listing_id text not null,
    muted boolean not null default false,
    primary key (user_id, listing_id)
  )`,
  `create table if not exists condition_cache (
    listing_id text primary key,
    payload jsonb not null,
    fetched_at timestamptz not null
  )`,
  `create table if not exists alert_sends (
    user_id uuid not null references users(id) on delete cascade,
    listing_id text not null,
    kind text not null,
    fingerprint text not null,
    sent_at timestamptz not null default now(),
    primary key (user_id, listing_id, kind, fingerprint)
  )`,
  `create table if not exists job_state (
    name text primary key,
    cursor int not null default 0,
    updated_at timestamptz not null default now()
  )`,
];

let sqlPromise;

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || '';
}

export function getSql() {
  const url = databaseUrl();
  if (!url) throw new HttpError(503, 'Database is not configured. Set DATABASE_URL (or SUPABASE_DB_URL / POSTGRES_URL).');
  if (!sqlPromise) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    sqlPromise = postgres(url, { max: 1, prepare: false, ssl: local ? false : 'require', idle_timeout: 20 });
  }
  return sqlPromise;
}

let ready;
export async function db() {
  const sql = getSql();
  if (!ready) {
    ready = (async () => {
      for (const statement of SCHEMA) await sql.unsafe(statement);
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
  return sql;
}
