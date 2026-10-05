// Writes vercel.json (security headers, caching, redirects). Run after the state list changes.
import { writeFileSync } from 'node:fs';
import { loadData } from '../src/lib/core.mjs';

const { states } = loadData();
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.googleadservices.com https://*.doubleclick.net https://*.gstatic.com https://fundingchoicesmessages.google.com https://*.adtrafficquality.google",
  "style-src 'self' 'unsafe-inline' https://*.gstatic.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://*.gstatic.com",
  "frame-src https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.adtrafficquality.google",
  "connect-src 'self' https://tiles.openfreemap.org https://api.weather.gov https://api.waterdata.usgs.gov https://epqs.nationalmap.gov https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.gstatic.com",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'astro',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  cleanUrls: true,
  trailingSlash: false,
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      ],
    },
    { source: '/_astro/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/images/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }] },
    { source: '/search-index.json', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] },
    { source: '/ads.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] },
  ],
  redirects: [
    { source: '/Blog', destination: '/blog', permanent: true },
    { source: '/Blog/:path*', destination: '/blog/:path*', permanent: true },
    { source: '/States', destination: '/states', permanent: true },
    { source: '/States/:path*', destination: '/states/:path*', permanent: true },
    { source: '/Search', destination: '/search', permanent: true },
    { source: '/About', destination: '/about', permanent: true },
    { source: '/Contact', destination: '/contact', permanent: true },
    { source: '/index.html', destination: '/', permanent: true },
    { source: '/home', destination: '/', permanent: true },
    { source: '/partners', destination: '/states', permanent: true },
    ...states.map((s) => ({ source: `/${s.slug}`, destination: s.url, permanent: true })),
  ],
};
writeFileSync(new URL('../vercel.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
console.log('vercel.json written');
