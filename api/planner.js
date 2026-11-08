import { requirePlus } from '../src/lib/plus/auth.mjs';
import { catalog } from '../src/lib/plus/catalog.mjs';
import { saveItinerary } from '../src/lib/plus/lists.mjs';
import { addDates, planTrip, resolveArea } from '../src/lib/plus/planner.mjs';
import { assertSameOrigin, fail, json, readJson } from '../src/lib/plus/http.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requirePlus(request);
    const body = await readJson(request);
    const resolved = resolveArea(catalog().listings, body.area || '');
    if (resolved.error) return json(resolved, { status: 400 });
    if (resolved.choices) return json(resolved);
    let plan = planTrip({
      listings: catalog().listings,
      anchor: resolved.anchor,
      days: body.days,
      prefs: {
        maxDriveHours: body.maxDriveHours,
        difficulty: body.difficulty || 'any',
        swimming: !!body.swimming,
        dogs: !!body.dogs,
        crowds: body.crowds === 'less' ? 'less' : 'any',
      },
    });
    plan = addDates(plan, body.start || '');
    if (body.save && plan.days.length) {
      const saved = await saveItinerary(user.id, body.name || `Trip: ${plan.anchor.label}`, plan);
      plan.listId = saved.id;
    }
    return json(plan);
  } catch (err) {
    return fail(err);
  }
}
