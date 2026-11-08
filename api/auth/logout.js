import { clearCookies } from '../../src/lib/plus/auth.mjs';
import { assertSameOrigin, fail, redirect } from '../../src/lib/plus/http.mjs';
import { db } from '../../src/lib/plus/db.mjs';
import { cookieHeader } from '../../src/lib/plus/http.mjs';
import { hashToken } from '../../src/lib/plus/auth.mjs';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const token = cookieHeader(request, 'wny_session');
    if (token) {
      try {
        const sql = await db();
        await sql`delete from sessions where token_hash = ${hashToken(token)}`;
      } catch {
        /* still clear the cookie if the database is down */
      }
    }
    return redirect('/plus', clearCookies(request));
  } catch (err) {
    return fail(err);
  }
}
