const ENTITLED = new Set(['active', 'trialing']);

export function isEntitled(user) {
  if (!user) return false;
  if (user.complimentary) return true;
  if (user.billing_hold) return false;
  return ENTITLED.has(user.subscription_status);
}

export function unixToIso(seconds) {
  if (!seconds || !Number.isFinite(Number(seconds))) return null;
  return new Date(Number(seconds) * 1000).toISOString();
}

export function subscriptionPatch(sub) {
  const item = sub?.items?.data?.[0] || null;
  const periodEnd = item?.current_period_end || sub?.current_period_end || null;
  const customer = sub?.customer;
  return {
    subscription_id: sub?.id || null,
    subscription_status: sub?.status || 'none',
    stripe_customer_id: typeof customer === 'string' ? customer : customer?.id || null,
    price_id: item?.price?.id || null,
    plan_interval: item?.price?.recurring?.interval || null,
    trial_end: unixToIso(sub?.trial_end),
    current_period_end: unixToIso(periodEnd),
    cancel_at_period_end: !!sub?.cancel_at_period_end,
    trial_consumed: sub?.status === 'trialing' || !!sub?.trial_end,
  };
}

export function customerIdFromCharge(charge) {
  if (!charge) return null;
  const customer = charge.customer;
  return typeof customer === 'string' ? customer : customer?.id || null;
}

export function invoiceSubscriptionId(invoice) {
  if (!invoice) return null;
  if (typeof invoice.subscription === 'string') return invoice.subscription;
  const sub = invoice.parent?.subscription_details?.subscription;
  return typeof sub === 'string' ? sub : sub?.id || null;
}

export function publicProfile(user, admin) {
  return {
    email: user.email,
    plus: isEntitled(user),
    admin: !!admin,
    status: user.complimentary && !ENTITLED.has(user.subscription_status) ? 'complimentary' : user.subscription_status || 'none',
    complimentary: !!user.complimentary,
    billingHold: !!user.billing_hold,
    billingHoldReason: user.billing_hold_reason || null,
    planInterval: user.plan_interval || null,
    trialEnd: user.trial_end || null,
    currentPeriodEnd: user.current_period_end || null,
    cancelAtPeriodEnd: !!user.cancel_at_period_end,
    alertsEnabled: user.alerts_enabled !== false,
    stripeCustomerId: user.stripe_customer_id || null,
  };
}
