/* Screenshot every page at desktop and phone width.
 *
 * ⚠️ fullPage screenshots LIE on image-heavy pages: lazily-loaded images sized
 * by their container come out unpainted even when complete === true. Judge
 * rendering from the VIEWPORT shots; the fullPage ones are for layout flow only.
 *
 * Captured with reducedMotion:'reduce' so the hero carousel and reveal
 * transitions settle deterministically instead of racing the shutter.
 *
 * Usage:  node tools/shoot.mjs              # all pages, both widths
 *         node tools/shoot.mjs index shop   # named pages only
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools', 'shots');
const require = createRequire('file:///C:/Users/Acer/thatha/');
const { chromium } = require('playwright');

const PAGES = ['index', 'shop', 'product', 'rooms', 'makers', 'cart', 'about', 'contact'];
const wanted = process.argv.length > 2 ? process.argv.slice(2) : PAGES;

const VIEWS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

const PORT = 4399;
const server = await serve(PORT);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const view of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  for (const name of wanted) {
    const url = `http://localhost:${PORT}/${name === 'index' ? '' : name}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    /* A fixed settle beats waiting on a reveal deadline: the grids render from
       JS after DOMContentLoaded and the countdown strips paint on the tick. */
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT, `${name}-${view.name}.png`) });
    await page.screenshot({ path: join(OUT, `${name}-${view.name}-full.png`), fullPage: true });

    /* Horizontal overflow is measured on documentElement.scrollWidth — body
       can be narrower than the overflowing child and report clean. */
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));
    const bad = overflow.doc > overflow.win + 1;
    console.log(
      `${view.name.padEnd(7)} ${name.padEnd(8)} ${bad ? `⚠ OVERFLOW ${overflow.doc}>${overflow.win}` : 'ok'}` +
      (errors.length ? `  ⚠ ${errors.length} console error(s)` : ''),
    );
    errors.length = 0;
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\nshots in tools/shots/`);
