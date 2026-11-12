import { SITE } from '../config.mjs';
export function GET() {
  return new Response(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /search?
Disallow: /account
Disallow: /admin
Disallow: /signin
Disallow: /planner
Disallow: /packet
Disallow: /plus/deals
Disallow: /plus/welcome
Disallow: /plus/share

Sitemap: ${SITE.url}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
