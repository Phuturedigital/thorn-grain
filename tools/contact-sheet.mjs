/* Render tools/previews/ into labelled contact sheets.
 *
 * Pexels returns EMPTY alt text, so a candidate cannot be judged from its
 * metadata — it has to be looked at. Reviewing ~190 separate JPEGs one at a time
 * is impractical, so this lays them out as labelled grids, which makes the whole
 * shortlist reviewable in a handful of images.
 *
 * ⚠️ Images MUST be inlined as base64 data URIs. A page built with setContent()
 * has an about:blank origin and silently renders every file:// img as a broken
 * icon — the sheet then looks empty rather than erroring, which reads as "the
 * search returned nothing".
 *
 * Usage:  node tools/contact-sheet.mjs             # review search candidates
 *         node tools/contact-sheet.mjs --assets    # review what actually shipped
 *         node tools/contact-sheet.mjs --only p-   # slots with this prefix
 */
import { createRequire } from 'node:module';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools', 'sheets');

/* This repo has no node_modules; borrow Playwright from a sibling concept.
   Node cannot resolve Git-Bash style /c/Users/... paths, hence the file:/// URL. */
const require = createRequire('file:///C:/Users/Acer/thatha/');
const { chromium } = require('playwright');

const ASSETS_MODE = process.argv.includes('--assets');
const ONLY = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;

const SRC = ASSETS_MODE ? join(ROOT, 'images') : join(ROOT, 'tools', 'previews');
const EXT = ASSETS_MODE ? '.webp' : '.jpg';
const MIME = ASSETS_MODE ? 'image/webp' : 'image/jpeg';

const files = (await readdir(SRC)).filter((f) => f.endsWith(EXT)).sort();

/* Group by slot name — everything before the trailing "-<index>-<pexelsId>". */
const bySlot = new Map();
for (const f of files) {
  const slot = ASSETS_MODE ? 'shipped' : f.replace(/-\d+-\d+\.jpg$/, '');
  /* --only takes a comma-separated list of prefixes, so an ad-hoc group of
     re-searched slots can be reviewed in ONE sheet instead of one per slot. */
  if (ONLY && !ONLY.split(',').some((p) => slot.startsWith(p.trim()))) continue;
  if (!bySlot.has(slot)) bySlot.set(slot, []);
  bySlot.get(slot).push(f);
}

const slots = [...bySlot.keys()];
const CHUNK = 6;
const sheets = [];
for (let i = 0; i < slots.length; i += CHUNK) sheets.push(slots.slice(i, i + CHUNK));

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

for (const [n, group] of sheets.entries()) {
  let html = `<style>
    body{font:13px/1.3 system-ui;background:#fff;margin:0;padding:14px}
    h2{font:600 15px system-ui;margin:14px 0 6px;padding:4px 8px;background:#111;color:#fff}
    .row{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
    figure{margin:0}
    img{width:100%;height:165px;object-fit:contain;display:block;background:#eee;border:1px solid #ccc}
    figcaption{font:11px/1.25 ui-monospace,monospace;padding:3px 0;word-break:break-all}
  </style>`;

  for (const slot of group) {
    html += `<h2>${slot}</h2><div class="row">`;
    for (const f of bySlot.get(slot)) {
      const b64 = (await readFile(join(SRC, f))).toString('base64');
      html += `<figure><img src="data:${MIME};base64,${b64}"><figcaption>${f.replace(`${slot}-`, '')}</figcaption></figure>`;
    }
    html += `</div>`;
  }

  const tmp = join(OUT, `sheet-${n}.html`);
  await writeFile(tmp, html);
  await page.goto(`file:///${tmp.replace(/\\/g, '/')}`);
  await page.screenshot({ path: join(OUT, `sheet-${n}.png`), fullPage: true });
  console.log(`sheet-${n}.png  ${group.join(', ')}`);
}

await browser.close();
