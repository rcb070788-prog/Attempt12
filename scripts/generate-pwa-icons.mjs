#!/usr/bin/env node
/**
 * Generates PWA icons: public/icon-192.png and public/icon-512.png
 *
 * With optional source image:
 *   node scripts/generate-pwa-icons.mjs [path/to/source.png]
 * Resizes the source image to 192x192 and 512x512.
 *
 * Without arguments (placeholder):
 *   node scripts/generate-pwa-icons.mjs
 * Generates MCT placeholder SVG and resizes to 192 and 512.
 *
 * Requires: npm install sharp (dev)
 */
import sharp from 'sharp';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const sourcePath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : null;

const themeColor = '#4f46e5';
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${themeColor}"/>
  <text x="256" y="280" font-family="system-ui, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle">MCT</text>
</svg>
`;

async function generate() {
  const sizes = [192, 512];

  if (sourcePath && existsSync(sourcePath)) {
    for (const size of sizes) {
      const outPath = join(publicDir, `icon-${size}.png`);
      await sharp(sourcePath).resize(size, size).png().toFile(outPath);
      console.log('Written', outPath, '(from source image)');
    }
  } else {
    if (sourcePath) {
      console.warn('Source image not found:', sourcePath);
      console.warn('Falling back to placeholder.');
    }
    const buffer = Buffer.from(svg);
    for (const size of sizes) {
      const outPath = join(publicDir, `icon-${size}.png`);
      await sharp(buffer).resize(size, size).png().toFile(outPath);
      console.log('Written', outPath, '(placeholder)');
    }
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
