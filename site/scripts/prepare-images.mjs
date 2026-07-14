#!/usr/bin/env node
/**
 * Copy full PNGs + convert 2400 thumbs to WebP for the static site.
 * Source: ../2026-05-07 Пост про ии-дизайн/png/
 * Output: public/images/full/, public/images/thumbs/, data/images-manifest.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const sourceDir = path.join(repoRoot, '2026-05-07 Пост про ии-дизайн', 'png');
const thumbsSourceDir = path.join(sourceDir, '2400');
const fullOut = path.join(siteRoot, 'public', 'images', 'full');
const thumbsOut = path.join(siteRoot, 'public', 'images', 'thumbs');
const manifestPath = path.join(siteRoot, 'data', 'images-manifest.json');
const runsPath = path.join(siteRoot, 'data', 'runs.json');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
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

async function main() {
  await ensureDir(fullOut);
  await ensureDir(thumbsOut);

  const runs = JSON.parse(await fs.readFile(runsPath, 'utf8'));
  const needed = new Set();
  for (const run of runs) {
    for (const v of Object.values(run.images || {})) {
      if (v) needed.add(v);
    }
  }

  const fullFiles = await listPngs(sourceDir);
  const thumbFiles = new Set(await listPngs(thumbsSourceDir));
  const manifest = {};
  let copied = 0;
  let converted = 0;
  const missing = [];

  for (const name of needed) {
    const srcFull = path.join(sourceDir, name);
    if (!fullFiles.includes(name)) {
      missing.push(name);
      continue;
    }

    const destFull = path.join(fullOut, name);
    await fs.copyFile(srcFull, destFull);
    copied++;

    const meta = await sharp(destFull).metadata();
    manifest[`full/${name}`] = {
      width: meta.width || 0,
      height: meta.height || 0,
      bytes: (await fs.stat(destFull)).size,
    };

    const tName = thumbBasename(name);
    const tSrc = path.join(thumbsSourceDir, tName);
    const wName = webpName(name);
    const destWebp = path.join(thumbsOut, wName);

    if (thumbFiles.has(tName)) {
      await sharp(tSrc)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(destWebp);
    } else {
      // Fallback: resize from full
      await sharp(srcFull)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(destWebp);
    }
    converted++;

    const tMeta = await sharp(destWebp).metadata();
    manifest[`thumbs/${wName}`] = {
      width: tMeta.width || 0,
      height: tMeta.height || 0,
      bytes: (await fs.stat(destWebp)).size,
    };
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Copied full PNGs: ${copied}`);
  console.log(`WebP thumbs: ${converted}`);
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
