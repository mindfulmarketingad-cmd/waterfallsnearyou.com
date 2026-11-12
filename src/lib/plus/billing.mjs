import { db } from './db.mjs';
import { customerIdFromCharge, invoiceSubscriptionId, subscriptionPatch } from './entitlement.mjs';
import { stripe } from './stripe-client.mjs';

export async function claimEvent(event) {
  const sql = await db();
  const rows = await sql`
    insert into stripe_events (id, type)
    values (${event.id}, ${event.type})
    on conflict (id) do nothing
    returning id`;
  return rows.length > 0;
}

async function userByCustomer(customerId) {
  if (!customerId) return null;
  const sql = await db();
  const [user] = await sql`select * from users where stripe_customer_id = ${customerId}`;
  return user || null;
}

async function userById(id) {
  if (!id) return null;
  const sql = await db();
  const [user] = await sql`select * from users where id = ${id}`;
  return user || null;
}

export async function applySubscription(userId, sub) {
  const patch = subscriptionPatch(sub);
  const sql = await db();
  await sql`
    update users set
      stripe_customer_id = coalesce(${patch.stripe_customer_id}, stripe_customer_id),
      subscription_id = ${patch.subscription_id},
      subscription_status = ${patch.subscription_status},
      price_id = ${patch.price_id},
      plan_interval = ${patch.plan_interval},
      trial_end = ${patch.trial_end},
      current_period_end = ${patch.current_period_end},
      cancel_at_period_end = ${patch.cancel_at_period_end},
      trial_consumed = trial_consumed or ${patch.trial_consumed}
    where id = ${userId}`;
}

async function syncSubscriptionId(user, subscriptionId) {
  if (!user || !subscriptionId) return;
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  await applySubscription(user.id, sub);
}

export async function setHoldByCustomer(customerId, reason) {
  if (!customerId) return false;
  const sql = await db();
  const rows = await sql`
    update users set billing_hold = true, billing_hold_reason = ${reason}
    where stripe_customer_id = ${customerId}
    returning id`;
  return rows.length > 0;
}

export async function handleStripeEvent(event) {
  const obj = event.data.object;
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const user = await userById(obj.client_reference_id) || await userByCustomer(typeof obj.customer === 'string' ? obj.customer : obj.customer?.id);
    const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
    if (user && subscriptionId && (obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required' || event.type === 'checkout.session.async_payment_succeeded')) {
      await syncSubscriptionId(user, subscriptionId);
    }
    return;
  }
  if (event.type === 'checkout.session.async_payment_failed') return;
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
    const user = await userByCustomer(customerId) || await userById(obj.metadata?.user_id);
    if (user) await applySubscription(user.id, obj);
    return;
  }
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const subscriptionId = invoiceSubscriptionId(obj);
    const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
    const user = await userByCustomer(customerId);
    if (user && subscriptionId) await syncSubscriptionId(user, subscriptionId);
    if (event.type === 'invoice.paid' && user) {
      const sql = await db();
      await sql`update users set billing_hold = false, billing_hold_reason = null where id = ${user.id} and billing_hold_reason = 'payment_failed'`;
    }
    if (event.type === 'invoice.payment_failed' && user) {
      const sql = await db();
      await sql`
        update users set subscription_status = 'past_due', billing_hold = true, billing_hold_reason = 'payment_failed'
        where id = ${user.id} and subscription_status in ('active', 'trialing', 'past_due')`;
    }
    return;
  }
  if (event.type === 'charge.dispute.created' || event.type === 'radar.early_fraud_warning.created' || event.type === 'charge.refunded') {
    let charge = obj;
    if (event.type === 'charge.dispute.created' || event.type === 'radar.early_fraud_warning.created') {
      const chargeId = typeof obj.charge === 'string' ? obj.charge : obj.charge?.id;
      if (!chargeId) return;
      charge = await stripe().charges.retrieve(chargeId);
    }
    const customerId = customerIdFromCharge(charge);
    if (event.type === 'charge.refunded' && !charge.refunded) return;
    const reason = event.type === 'charge.refunded' ? 'refunded' : event.type === 'charge.dispute.created' ? 'dispute' : 'fraud_warning';
    await setHoldByCustomer(customerId, reason);
  }
}
