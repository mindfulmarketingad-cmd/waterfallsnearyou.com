import { consumeMagicLink, createSession, isAdmin } from '../../src/lib/plus/auth.mjs';
import { isEntitled } from '../../src/lib/plus/entitlement.mjs';
import { fail, redirect } from '../../src/lib/plus/http.mjs';

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    const { user, nextPath } = await consumeMagicLink(token);
    const { cookies } = await createSession(request, user.id);
    const next = nextPath || '/account';
    const dest = isAdmin(user) && next.startsWith('/admin')
      ? next
      : isEntitled(user)
        ? next
        : '/plus?checkout=1';
    return redirect(dest, cookies);
  } catch (err) {
    return fail(err);
  }
}
