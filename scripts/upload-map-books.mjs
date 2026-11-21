// Upload state map-book PDFs to a private Vercel Blob store.
//
//   node scripts/upload-map-books.mjs [--write-size] <directory-or-pdf>
//
// Files must be named <slug>.pdf, and the slug must be in src/data/map-books.json.
// Each file is stored at map-books/<slug>.pdf with access: 'private' and no random
// suffix, which is the path api/maps/download.js signs. The store is not public.
// BLOB_READ_WRITE_TOKEN is read from the environment, .env.local, or .env.
// --write-size sets sizeMB on the matching catalog entry from the file size.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';
import { blobPathname, loadMapBooks } from '../src/lib/map-books.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'src/data/map-books.json');

function loadDotEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!/^[A-Z0-9_]+$/.test(key) || process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function usage() {
  console.error(`Usage: node scripts/upload-map-books.mjs [--write-size] <directory-or-pdf>

Uploads <slug>.pdf files to private Blob pathnames map-books/<slug>.pdf.
The download route signs that pathname. It does not need a separate URL map.
Requires BLOB_READ_WRITE_TOKEN. --write-size records sizeMB in src/data/map-books.json.`);
}

function pdfInputs(target) {
  const abs = path.resolve(target);
  if (!existsSync(abs)) throw new Error(`Not found: ${target}`);
  const stat = statSync(abs);
  if (stat.isDirectory()) {
    return readdirSync(abs)
      .filter((name) => name.endsWith('.pdf'))
      .map((name) => path.join(abs, name));
  }
  if (stat.isFile() && abs.endsWith('.pdf')) return [abs];
  throw new Error('Pass a directory of <slug>.pdf files, or one PDF');
}

function sizeMB(bytes) {
  return Math.round((bytes / 1_000_000) * 10) / 10;
}

async function main() {
  const args = process.argv.slice(2);
  const writeSize = args.includes('--write-size');
  const inputs = args.filter((arg) => !arg.startsWith('--'));
  if (inputs.length !== 1) {
    usage();
    process.exit(1);
  }
  loadDotEnv();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Set BLOB_READ_WRITE_TOKEN. The script does not print it.');
    process.exit(1);
  }

  const books = new Map(loadMapBooks().map((book) => [book.slug, book]));
  const files = pdfInputs(inputs[0]);
  const uploaded = [];
  for (const file of files) {
    const slug = path.basename(file, '.pdf');
    const book = books.get(slug);
    if (!book) {
      console.error(`Skipping ${path.basename(file)}: ${slug} is not in src/data/map-books.json`);
      continue;
    }
    const stat = statSync(file);
    const pathname = blobPathname(slug);
    const blob = await put(pathname, readFileSync(file), {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: stat.size >= 4 * 1024 * 1024,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (blob.pathname !== pathname) {
      throw new Error(`Blob stored ${blob.pathname}, expected ${pathname}. Refusing to continue.`);
    }
    const row = { slug, pathname, sizeBytes: stat.size, sizeMB: sizeMB(stat.size), access: 'private' };
    uploaded.push(row);
    console.log(JSON.stringify(row));
  }

  if (!uploaded.length) {
    console.error('No catalog PDFs were uploaded.');
    process.exit(1);
  }
  if (writeSize) {
    const raw = JSON.parse(readFileSync(CATALOG, 'utf8'));
    const bySlug = new Map(uploaded.map((row) => [row.slug, row.sizeMB]));
    for (const book of raw.books) {
      if (bySlug.has(book.slug)) book.sizeMB = bySlug.get(book.slug);
    }
    writeFileSync(CATALOG, `${JSON.stringify(raw, null, 2)}\n`);
    console.error(`Updated sizeMB in ${path.relative(ROOT, CATALOG)}`);
  }
}

main().catch((err) => {
  console.error(err?.message || 'Upload failed');
  process.exit(1);
});
