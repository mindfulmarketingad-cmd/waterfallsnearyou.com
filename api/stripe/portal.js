import { requireUser } from '../../src/lib/plus/auth.mjs';
import { assertSameOrigin, fail, HttpError, json } from '../../src/lib/plus/http.mjs';
import { stripe } from '../../src/lib/plus/stripe-client.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    if (!user.stripe_customer_id) throw new HttpError(400, 'Subscribe first, then billing can be managed here.');
    const origin = new URL(request.url).origin;
    const session = await stripe().billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/account`,
    });
    return json({ url: session.url });
  } catch (err) {
    return fail(err);
  }
}
