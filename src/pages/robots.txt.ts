import { SITE } from '../config.mjs';
export function GET() {
  return new Response(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /search?

Sitemap: ${SITE.url}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
