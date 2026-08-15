/* Capture this site's card thumbnail for the Phuture Digital concept network.
 *
 * Every concept site carries a 640x400 webp screenshot of each sibling under
 * /pd-concepts/<key>.webp. This produces ours.
 *
 * 🔑 reducedMotion:'reduce' is not cosmetic — the sites in this network reveal
 * from opacity:0 and force full opacity under reduced motion, so this settles
 * the page deterministically instead of racing the reveal timeline. Capturing
 * without it produces a half-faded hero at random.
 *
 * 🔑 Encoding happens in Chromium via canvas.toDataURL('image/webp'). There is
 * no sharp and no cwebp on this box, and C:\WINDOWS\system32\convert.exe is
 * Windows' FAT converter, not ImageMagick.
 *
 * 1440x900 is 16:10 and 640x400 is 16:10, so the downscale is a clean resize
 * with no crop — which is why the viewport is that size and not 1440x800.
 *
 * Usage:  node tools/shoot-thumb.mjs [outfile]
 */
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'pd-concepts', 'thorn-grain.webp');

const require = createRequire('file:///C:/Users/Acer/thatha/');
const { chromium } = require('playwright');

const PORT = 4477;
const server = await serve(PORT);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const shot = await page.screenshot();        // viewport only, never fullPage

const webp = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx2 = canvas.getContext('2d');
  ctx2.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, 640, 400);
  return canvas.toDataURL('image/webp', 0.82);
}, shot.toString('base64'));

await mkdir(dirname(OUT), { recursive: true });
const buf = Buffer.from(webp.split(',')[1], 'base64');
await writeFile(OUT, buf);
console.log(`${OUT}  ${Math.round(buf.length / 1024)} KB`);

await browser.close();
server.close();
