#!/usr/bin/env node
/**
 * Generates PWA placeholder icons: public/icon-192.png and public/icon-512.png
 * Run: node scripts/generate-pwa-icons.mjs
 * Requires: npm install sharp (dev)
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const themeColor = '#4f46e5';
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${themeColor}"/>
  <text x="256" y="280" font-family="system-ui, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle">MCT</text>
</svg>
`;

async function generate() {
  const sizes = [192, 512];
  const buffer = Buffer.from(svg);
  for (const size of sizes) {
    const outPath = join(publicDir, `icon-${size}.png`);
    await sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log('Written', outPath);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
