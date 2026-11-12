import { createHash, randomBytes } from 'node:crypto';
import { db } from './db.mjs';
import { isEntitled } from './entitlement.mjs';
import { HttpError, cookieHeader, requestIsSecure, serializeCookie } from './http.mjs';

const SESSION_DAYS = 45;

function pepper() {
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length < 16) throw new HttpError(503, 'AUTH_SECRET is not configured.');
  return secret;
}

export function hashToken(token) {
  return createHash('sha256').update(`${pepper()}:${token}`).digest('hex');
}

export function newToken() {
  return randomBytes(32).toString('base64url');
}

function sessionCookies(request, sessionToken, user) {
  const secure = requestIsSecure(request);
  const plus = isEntitled(user);
  return [
    serializeCookie('wny_session', sessionToken, { maxAge: SESSION_DAYS * 86400, httpOnly: true, secure }),
    serializeCookie('wny_auth', '1', { maxAge: SESSION_DAYS * 86400, httpOnly: false, secure }),
    serializeCookie('wny_plus', plus ? '1' : '', { maxAge: plus ? SESSION_DAYS * 86400 : 0, httpOnly: false, secure }),
  ];
}

export function clearCookies(request) {
  const secure = requestIsSecure(request);
  return ['wny_session', 'wny_auth', 'wny_plus'].map((name) => serializeCookie(name, '', { maxAge: 0, httpOnly: name === 'wny_session', secure }));
}

export async function createSession(request, userId) {
  const sql = await db();
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${hashToken(token)}, ${userId}, ${expires})`;
  const [user] = await sql`select * from users where id = ${userId}`;
  return { token, cookies: sessionCookies(request, token, user), user };
}

export async function userFromRequest(request) {
  const token = cookieHeader(request, 'wny_session');
  if (!token) return null;
  const sql = await db();
  const [row] = await sql`
    select users.* from sessions
    join users on users.id = sessions.user_id
    where sessions.token_hash = ${hashToken(token)} and sessions.expires_at > now()`;
  return row || null;
}

export async function requireUser(request) {
  const user = await userFromRequest(request);
  if (!user) throw new HttpError(401, 'Sign in required.');
  return user;
}

export async function requirePlus(request) {
  const user = await requireUser(request);
  if (!isEntitled(user)) throw new HttpError(403, 'Waterfalls Near You Plus is required.');
  return user;
}

export function isAdmin(user) {
  if (!user?.email) return false;
  const list = (process.env.ADMIN_EMAILS || '').split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(user.email.toLowerCase());
}

export async function requireAdmin(request) {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, 'Admin access only.');
  return user;
}

export async function findOrCreateUser(email) {
  const sql = await db();
  const normalized = email.trim().toLowerCase();
  const [existing] = await sql`select * from users where email = ${normalized}`;
  if (existing) return existing;
  const [created] = await sql`
    insert into users (id, email, unsub_token)
    values (${crypto.randomUUID()}, ${normalized}, ${newToken()})
    returning *`;
  return created;
}

export async function issueMagicLink(email, nextPath) {
  const sql = await db();
  const normalized = email.trim().toLowerCase();
  const [{ n }] = await sql`select count(*)::int as n from magic_links where email = ${normalized} and created_at > now() - interval '1 hour'`;
  if (n >= 5) throw new HttpError(429, 'Too many sign-in emails. Try again in an hour.');
  const token = newToken();
  await sql`
    insert into magic_links (token_hash, email, next_path, expires_at)
    values (${hashToken(token)}, ${normalized}, ${nextPath}, now() + interval '30 minutes')`;
  return { token, code };
}

export async function consumeMagicLink(token) {
  const sql = await db();
  const [link] = await sql`
    update magic_links set used_at = now()
    where token_hash = ${hashToken(token)} and used_at is null and expires_at > now()
    returning *`;
  if (!link) throw new HttpError(400, 'This sign-in link is invalid or expired.');
  const user = await findOrCreateUser(link.email);
  return { user, nextPath: link.next_path || '/account' };
}

export async function refreshCookies(request, user) {
  const token = cookieHeader(request, 'wny_session');
  if (!token) return sessionCookies(request, '', user).slice(1);
  return sessionCookies(request, token, user);
}
