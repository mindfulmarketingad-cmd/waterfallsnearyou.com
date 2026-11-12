import { requirePlus } from '../../src/lib/plus/auth.mjs';
import { setAlertsEnabled, setWatch } from '../../src/lib/plus/lists.mjs';
import { assertSameOrigin, fail, json, readJson } from '../../src/lib/plus/http.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requirePlus(request);
    const body = await readJson(request);
    if (typeof body.alertsEnabled === 'boolean') {
      await setAlertsEnabled(user.id, body.alertsEnabled);
      return json({ ok: true, alertsEnabled: body.alertsEnabled });
    }
    await setWatch(user.id, body.listing, !!body.muted);
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
