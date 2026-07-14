#!/usr/bin/env node
/**
 * Copy full PNGs + convert 2400 thumbs to WebP for the static site.
 *
 * Source: data/source-png/{full,2400}/  (committed to the repo)
 * Output: public/images/full/, public/images/thumbs/, data/images-manifest.json
 *
 * If a source PNG is missing locally, it is fetched once from
 *   https://mikeozornin.ru/blog/pictures/<name>
 * as a fallback for newly added runs that have not been committed yet.
 * The fetched file lands in data/source-png/ so subsequent runs are offline
 * and the new PNG becomes part of the next commit.
 *
 * Files are content-hashed (sha1, first 8 hex chars) and written as
 * `<name>.<hash>.<ext>`. data/images-manifest.json maps the logical name
 * (e.g. `thumbs/paper__x__all.webp`) to the hashed on-disk name so nginx
 * can serve them with `Cache-Control: public, max-age=31536000, immutable`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');

// Local source PNG dirs (gitignored — fetched from blog on first run).
const sourceFullDir = path.join(siteRoot, 'data', 'source-png', 'full');
const sourceThumbsDir = path.join(siteRoot, 'data', 'source-png', '2400');

const fullOut = path.join(siteRoot, 'public', 'images', 'full');
const thumbsOut = path.join(siteRoot, 'public', 'images', 'thumbs');
const manifestPath = path.join(siteRoot, 'data', 'images-manifest.json');
const runsPath = path.join(siteRoot, 'data', 'runs.json');

const BLOG_PICTURE_BASE = 'https://mikeozornin.ru/blog/pictures/';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function clearDir(dir) {
  // Wipe contents so old hashed files don't accumulate across builds.
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries.map((name) => fs.rm(path.join(dir, name), { recursive: true, force: true })),
  );
}

async function listPngs(dir) {
  try {
    const entries = await fs.readdir(dir);
    return entries.filter((f) => f.endsWith('.png') && !f.includes('ffconcat'));
  } catch {
    return [];
  }
}

function thumbBasename(fullName) {
  // paper__x__all@2x.png → paper__x__all-2400@2x.png
  return fullName.replace(/@2x\.png$/, '-2400@2x.png');
}

function webpName(fullName) {
  return fullName.replace(/@2x\.png$/, '.webp');
}

/** Insert `<hash>` before the extension: `paper__x__all.webp` → `paper__x__all.a1b2c3d4.webp` */
function hashFileName(name, hash) {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return `${name}.${hash}`;
  return `${name.slice(0, dot)}.${hash}${name.slice(dot)}`;
}

function sha1Hex(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 8);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch a single PNG from the blog and write it to `destPath`.
 * Skips silently if the file already exists locally.
 * Returns true on success, false on failure (network error or non-200).
 */
async function fetchFromBlogIfMissing(name, destPath) {
  if (await pathExists(destPath)) return true;
  const url = `${BLOG_PICTURE_BASE}${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  fetch failed: ${name} → HTTP ${res.status}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buf);
    return true;
  } catch (err) {
    console.warn(`  fetch error: ${name} → ${err.message}`);
    return false;
  }
}

async function main() {
  await ensureDir(sourceFullDir);
  await ensureDir(sourceThumbsDir);
  await ensureDir(fullOut);
  await ensureDir(thumbsOut);
  await clearDir(fullOut);
  await clearDir(thumbsOut);

  const runs = JSON.parse(await fs.readFile(runsPath, 'utf8'));
  const needed = new Set();
  for (const run of runs) {
    for (const v of Object.values(run.images || {})) {
      if (v) needed.add(v);
    }
  }

  const manifest = {};
  let copied = 0;
  let converted = 0;
  let fetched = 0;
  const missing = [];

  for (const name of needed) {
    // --- Full PNG ---
    const srcFull = path.join(sourceFullDir, name);
    if (!(await pathExists(srcFull))) {
      const ok = await fetchFromBlogIfMissing(name, srcFull);
      if (ok) fetched++;
      else {
        missing.push(name);
        continue;
      }
    }
    const fullBuf = await fs.readFile(srcFull);
    const fullHash = sha1Hex(fullBuf);
    const fullHashedName = hashFileName(name, fullHash);
    await fs.writeFile(path.join(fullOut, fullHashedName), fullBuf);
    copied++;

    const meta = await sharp(fullBuf).metadata();
    manifest[`full/${name}`] = {
      hashed: `full/${fullHashedName}`,
      width: meta.width || 0,
      height: meta.height || 0,
      bytes: fullBuf.length,
    };

    // --- WebP thumb (prefers 2400 source, falls back to resizing full) ---
    const tName = thumbBasename(name);
    const tSrc = path.join(sourceThumbsDir, tName);
    if (!(await pathExists(tSrc))) {
      await fetchFromBlogIfMissing(tName, tSrc);
    }

    const wName = webpName(name);
    const thumbExists = await pathExists(tSrc);
    let webpBuf;
    if (thumbExists) {
      webpBuf = await sharp(tSrc)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
    } else {
      webpBuf = await sharp(fullBuf)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
    }
    const thumbHash = sha1Hex(webpBuf);
    const thumbHashedName = hashFileName(wName, thumbHash);
    await fs.writeFile(path.join(thumbsOut, thumbHashedName), webpBuf);
    converted++;

    const tMeta = await sharp(webpBuf).metadata();
    manifest[`thumbs/${wName}`] = {
      hashed: `thumbs/${thumbHashedName}`,
      width: tMeta.width || 0,
      height: tMeta.height || 0,
      bytes: webpBuf.length,
    };
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Copied full PNGs: ${copied}`);
  console.log(`WebP thumbs: ${converted}`);
  if (fetched > 0) console.log(`Fetched from blog: ${fetched}`);
  console.log(`Manifest: ${manifestPath}`);
  if (missing.length) {
    console.warn(`Missing source files (${missing.length}):`);
    for (const m of missing.slice(0, 20)) console.warn('  -', m);
    if (missing.length > 20) console.warn(`  ... and ${missing.length - 20} more`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
