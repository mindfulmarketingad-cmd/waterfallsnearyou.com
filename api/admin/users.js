import { requireAdmin } from '../../src/lib/plus/auth.mjs';
import { db } from '../../src/lib/plus/db.mjs';
import { isEntitled } from '../../src/lib/plus/entitlement.mjs';
import { assertSameOrigin, fail, HttpError, json, readJson } from '../../src/lib/plus/http.mjs';
import { stripe } from '../../src/lib/plus/stripe-client.mjs';
import { applySubscription } from '../../src/lib/plus/billing.mjs';

function shape(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    status: user.subscription_status,
    complimentary: user.complimentary,
    plus: isEntitled(user),
    planInterval: user.plan_interval,
    stripeCustomerId: user.stripe_customer_id,
    subscriptionId: user.subscription_id,
    trialEnd: user.trial_end,
    currentPeriodEnd: user.current_period_end,
    cancelAtPeriodEnd: user.cancel_at_period_end,
    billingHold: user.billing_hold,
    billingHoldReason: user.billing_hold_reason,
    alertsEnabled: user.alerts_enabled,
  };
}

export async function GET(request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const q = (params.get('q') || '').trim().toLowerCase().replace(/[%_\\]/g, '');
    const status = params.get('status') || '';
    const allowed = new Set(['', 'trialing', 'active', 'complimentary', 'canceled', 'past_due', 'none']);
    if (!allowed.has(status)) throw new HttpError(400, 'Unknown status.');
    const sql = await db();
    const like = `%${q}%`;
    const rows = await sql`
      select * from users
      where (${q} = '' or email ilike ${like})
        and (
          ${status} = ''
          or (${status} = 'complimentary' and complimentary = true)
          or (${status} = 'none' and complimentary = false and subscription_status = 'none')
          or (${status} not in ('', 'complimentary', 'none') and subscription_status = ${status})
        )
      order by created_at desc
      limit 50`;
    return json({ users: rows.map(shape) });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    await requireAdmin(request);
    const body = await readJson(request);
    const sql = await db();
    const [user] = await sql`select * from users where id = ${body.userId}`;
    if (!user) throw new HttpError(404, 'User not found.');
    if (body.action === 'grant') {
      await sql`update users set complimentary = true where id = ${user.id}`;
    } else if (body.action === 'revoke') {
      await sql`update users set complimentary = false where id = ${user.id}`;
    } else if (body.action === 'cancel') {
      if (!user.subscription_id) throw new HttpError(400, 'No Stripe subscription to cancel.');
      const sub = await stripe().subscriptions.cancel(user.subscription_id);
      await applySubscription(user.id, sub);
    } else {
      throw new HttpError(400, 'Unknown action.');
    }
    const [next] = await sql`select * from users where id = ${user.id}`;
    return json({ user: shape(next) });
  } catch (err) {
    return fail(err);
  }
}
