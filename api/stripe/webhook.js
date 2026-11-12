import { claimEvent, handleStripeEvent } from '../../src/lib/plus/billing.mjs';
import { db } from '../../src/lib/plus/db.mjs';
import { fail, json } from '../../src/lib/plus/http.mjs';
import { stripe } from '../../src/lib/plus/stripe-client.mjs';

export const maxDuration = 60;

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'Webhook is not configured.' }, { status: 503 });
  const raw = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, request.headers.get('stripe-signature') || '', secret);
  } catch {
    return json({ error: 'Invalid signature.' }, { status: 400 });
  }
  try {
    if (!(await claimEvent(event))) return json({ received: true, duplicate: true });
    await handleStripeEvent(event);
    return json({ received: true });
  } catch (err) {
    try {
      const sql = await db();
      await sql`delete from stripe_events where id = ${event.id}`;
    } catch { /* leave the claim if the database is unreachable */ }
    return fail(err);
  }
}
