import { db } from '../../src/lib/plus/db.mjs';
import { fail, html } from '../../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    if (token.length < 20) return html('<!doctype html><title>Unsubscribe</title><p>This unsubscribe link is not valid.</p>', { status: 400 });
    const sql = await db();
    const rows = await sql`
      update users set alerts_enabled = false
      where unsub_token = ${token}
      returning email`;
    const message = rows.length
      ? 'Condition alerts are off. You can turn them back on from your account page.'
      : 'This unsubscribe link is not valid.';
    return html(`<!doctype html><meta name="robots" content="noindex"><title>Unsubscribe</title><body style="font-family:sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem"><h1>Alerts</h1><p>${message}</p><p><a href="/account">Account</a></p></body>`);
  } catch (err) {
    return fail(err);
  }
}
