import { json } from '../../src/lib/plus/http.mjs';

export function GET() {
  return json({
    name: 'Waterfalls Near You Plus',
    trialDays: 7,
    annual: { amount: 35.99, interval: 'year', label: '$35.99/year', configured: Boolean(process.env.STRIPE_PRICE_ID) },
    monthly: process.env.STRIPE_PRICE_ID_MONTHLY
      ? { amount: 4.99, interval: 'month', label: '$4.99/month', configured: true }
      : null,
  });
}
