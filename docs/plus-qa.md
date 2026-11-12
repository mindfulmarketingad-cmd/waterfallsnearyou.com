# Plus QA checklist

Run `npm test` for the logic checks (flags, gauge matching, planner, entitlements, alert signals, PDF). The flows below need Stripe test mode, a Postgres database, Resend, and the env vars in `.env.example`.

## Public pages stay public

- Logged out, open a waterfall, a state page, a city hub, and a blog post. The full page renders. Noindex is unchanged on thin pages (search stays noindex; a rich waterfall stays indexable).
- `/plus` is indexable. `/account`, `/admin/users`, `/signin`, `/planner`, `/packet`, and `/plus/deals` send noindex.
- A waterfall with a season note still shows that note without signing in. The Plus block is a teaser, and the existing weather and conditions panels are still there.
- Free state, search, and hub filters still list every waterfall until a Plus filter is checked. Locked Plus filters do not hide the directory.

## Subscribe

- Sign in with an email link. A new visitor is sent to Checkout.
- Complete Checkout in Stripe test mode on the annual price. The welcome page becomes Plus after the webhook, without a manual unlock.
- Open the same waterfall. The conditions panel fills from cached or live public data. If no gauge name matches, the panel says so and does not show a discharge number.
- Save the waterfall, open the trip planner, save a trip, open the printable packet, and download the PDF.
- Ads script is not injected when the Plus cookie is set.

## Cancel

- Account → Manage billing → cancel in the Stripe portal.
- While the period is still active, Plus remains. After `customer.subscription.deleted` (or an immediate admin cancel), Plus features return 403 and the public pages still render.

## Alerts

- Saved falls start watched. Mute one, and turn the account-level switch off.
- `GET /api/cron/alerts` with `Authorization: Bearer $CRON_SECRET` sends at most one email per user per day for a new signal, and the unsubscribe link sets alerts off.

## Admin

- Sign in as an address in `ADMIN_EMAILS` and open `/admin/users`.
- Search by email and by status.
- Grant complimentary Plus to a user with no subscription and confirm they can open a packet. Revoke it and confirm the packet locks.
- Cancel Stripe only for a user who has a subscription id.

## Honest gaps

- With `DATABASE_URL` or Stripe unset, the public site still builds. Plus API routes respond that the service is not configured.
- Conditions and alerts crons are daily so they run on Vercel Hobby. Opening a Plus conditions panel refreshes that waterfall if the cache is older than 12 hours.
