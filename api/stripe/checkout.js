import { requireUser } from '../../src/lib/plus/auth.mjs';
import { isEntitled } from '../../src/lib/plus/entitlement.mjs';
import { assertSameOrigin, fail, json, readJson } from '../../src/lib/plus/http.mjs';
import { integrationIdentifier, priceIdFor, stripe } from '../../src/lib/plus/stripe-client.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    if (isEntitled(user)) return json({ url: '/account' });
    const body = await readJson(request);
    const interval = body.interval === 'month' ? 'month' : 'year';
    const origin = new URL(request.url).origin;
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: user.id,
      line_items: [{ price: priceIdFor(interval), quantity: 1 }],
      success_url: `${origin}/plus/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plus?checkout=cancel`,
      integration_identifier: integrationIdentifier(),
      metadata: { user_id: user.id },
      ...(user.stripe_customer_id
        ? { customer: user.stripe_customer_id }
        : { customer_email: user.email }),
      subscription_data: {
        metadata: { user_id: user.id },
        ...(user.trial_consumed ? {} : { trial_period_days: 7 }),
      },
    });
    return json({ url: session.url });
  } catch (err) {
    return fail(err);
  }
}
