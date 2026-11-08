import { isAdmin, refreshCookies, userFromRequest } from '../src/lib/plus/auth.mjs';
import { publicProfile } from '../src/lib/plus/entitlement.mjs';
import { fail, json } from '../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const user = await userFromRequest(request);
    if (!user) return json({ signedIn: false, plus: false, admin: false });
    return json({ signedIn: true, ...publicProfile(user, isAdmin(user)) }, { cookies: await refreshCookies(request, user) });
  } catch (err) {
    return fail(err);
  }
}
