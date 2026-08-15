/* Render map-data.js on its own so the outline can be eyeballed before any UI
   is built around it. A map that is subtly the wrong shape is worse than no
   map, and nobody in this market will miss it. */
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('file:///C:/Users/Acer/thatha/');
const { chromium } = require('playwright');
const local = createRequire(import.meta.url);
const map = local(join(ROOT, 'map-data.js'));

const pins = map.MAP_TOWNS.map((t) => `
  <circle cx="${t.x}" cy="${t.y}" r="13" fill="#C4622D" stroke="#fff" stroke-width="4"/>
  <text x="${t.x + 24}" y="${t.y + 8}" font-size="23" font-family="system-ui" fill="#241F1B">${t.label}</text>`).join('');

const html = `<body style="margin:0;background:#F7F2EA">
<svg viewBox="${map.MAP_VIEWBOX}" width="760" xmlns="http://www.w3.org/2000/svg">
  <path d="${map.MAP_PATH}" fill="#EFE7DC" stroke="#241F1B" stroke-width="3" fill-rule="evenodd"/>
  ${pins}
</svg></body>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 780, height: 700 } });
await page.setContent(html);
await page.waitForTimeout(400);
await page.screenshot({ path: join(ROOT, 'tools', 'shots', 'map-test.png') });
await browser.close();
console.log('tools/shots/map-test.png');
