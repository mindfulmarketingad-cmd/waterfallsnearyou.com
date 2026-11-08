import { sendDueAlerts } from '../../src/lib/plus/jobs.mjs';
import { fail, json } from '../../src/lib/plus/http.mjs';

export const maxDuration = 60;

function authorized(request) {
  const secret = process.env.CRON_SECRET || '';
  return secret && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request) {
  try {
    if (!authorized(request)) return json({ error: 'Unauthorized.' }, { status: 401 });
    return json(await sendDueAlerts());
  } catch (err) {
    return fail(err);
  }
}
