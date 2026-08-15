/* Thorn & Grain — download the SELECTED stock photos and convert them to webp.
 *
 * Every id below was chosen by looking at a contact sheet (tools/contact-sheet.mjs),
 * never from search metadata: Pexels returns empty alt text, so metadata cannot
 * tell you whether a frame shows a sofa or a park bench.
 *
 * ⚠️ There is no `sharp` and no `cwebp` on this machine, and C:\WINDOWS\system32\
 * convert.exe is Windows' FAT filesystem converter — running it does NOT convert
 * an image. Resizing and encoding therefore happen inside headless Chromium:
 * draw to a canvas, then canvas.toDataURL('image/webp', q).
 *
 * The cover-crop is applied to drawImage's SOURCE rect rather than in CSS,
 * because this bakes final pixels — an aspect mistake here ships, it is not a
 * style bug you can fix later in styles.css.
 *
 * Usage:  node tools/fetch-assets.mjs
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'images');

const require = createRequire('file:///C:/Users/Acer/thatha/');
const { chromium } = require('playwright');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

/* name → [pexels id, width, height, credit]
 *
 * Aspect ratios are deliberate and matched to where each image sits:
 *   1:1    product tiles in the grid (the grid is square-celled)
 *   5:4    category cards
 *   3:2    room banners and editorial bands
 *   1:1    hero cut-outs, which float on a tinted ground with lots of air
 */
const ASSETS = {
  /* --- hero ------------------------------------------------------------- */
  'hero-plant':   [8790105,  1100, 1100, 'Sutee Vichaporn'],
  'hero-chair':   [963486,   1400,  900, 'Rachel Claire'],
  'hero-sofa':    [11112731, 1100, 1100, 'Rachel Claire'],

  /* --- category cards --------------------------------------------------- */
  'cat-seating':  [11112733,  900,  720, 'Rachel Claire'],
  'cat-sofa':     [11112731,  900,  720, 'Rachel Claire'],
  'cat-table':    [6078539,   900,  720, 'Charlotte May'],
  'cat-light':    [23020540,  900,  720, 'Erik Mclean'],
  'cat-storage':  [12277013,  900,  720, 'dada _design'],
  'cat-bed':      [17994857,  900,  720, 'Curtis Adams'],

  /* --- room banners ----------------------------------------------------- */
  'room-living':  [7836571,  1200,  800, 'Stanislav Kondratiev'],
  'room-dining':  [6908357,  1200,  800, 'Max Vakhtbovych'],
  'room-bed':     [7749046,  1200,  800, 'Max Vakhtbovych'],

  /* --- products (square tiles) ------------------------------------------ */
  'p-vaal':       [14391919, 760, 760, 'Ron Lach'],
  'p-crossback':  [11112733, 760, 760, 'Rachel Claire'],
  'p-loop':       [7803376,  760, 760, 'Meruyert Gonullu'],
  'p-bekker':     [11112731, 760, 760, 'Rachel Claire'],
  'p-kalahari':   [6373480,  760, 760, 'Skylar Kang'],
  'p-swivel':     [12269762, 760, 760, 'Rezwan  Ridwan'],
  'p-werf':       [12277013, 760, 760, 'dada _design'],
  'p-sheesham':   [11643074, 760, 760, 'Rachel Claire'],
  'p-tray':       [11507951, 760, 760, 'Kseniia Rastvorova'],
  'p-coffee':     [18288703, 760, 760, 'Osmany Mederos'],
  'p-slat':       [12233290, 760, 760, 'Jan van der Wolf'],
  'p-stool':      [7193656,  760, 760, 'Charlotte May'],
  'p-brass':      [6633445,  760, 760, 'Anete Lusina'],
  'p-cage':       [22662030, 760, 760, 'Ekrulila'],
  'p-slatlight':  [23020540, 760, 760, 'Erik Mclean'],
  'p-basket':     [8356229,  760, 760, 'Bogdan Krupin'],
  'p-sisal':      [11996696, 760, 760, 'Ruby Anderson'],
  'p-mirror':     [8218187,  760, 760, 'Karolina Grabowska'],
  'p-kilim':      [37023123, 760, 760, 'Mehmet Turgut Kirkgoz'],
  'p-marble':     [6078539,  760, 760, 'Charlotte May'],
  'p-bed':        [17994857, 760, 760, 'Curtis Adams'],

  /* --- makers / workshop -------------------------------------------------
     Cast deliberately: the whole premise is "built by workshops here", so the
     people shown making the furniture are African. A South African brand
     illustrated entirely with European artisans would undercut its one claim. */
  'maker-a':      [6790757,  900, 1100, 'Tima Miroshnichenko'],
  'maker-b':      [6790098, 1200,  800, 'Tima Miroshnichenko'],
  'maker-c':      [7109998, 1200,  800, 'Daniel Reche'],
  'timber':       [12278589, 1200, 800, 'Mark Stebnicki'],
};

/* Pexels serves most photos as .jpeg but a minority are .png — guessing wrong
   404s, so try both rather than assuming. */
async function grab(id) {
  for (const ext of ['jpeg', 'png']) {
    const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&w=1800`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return { buf: Buffer.from(await res.arrayBuffer()), mime: `image/${ext}` };
  }
  throw new Error(`no source found for pexels ${id}`);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');

for (const [name, [id, w, h, credit]] of Object.entries(ASSETS)) {
  try {
    const { buf, mime } = await grab(id);
    const dataUri = `data:${mime};base64,${buf.toString('base64')}`;

    const webp = await page.evaluate(
      async ({ src, w, h }) => {
        const img = new Image();
        img.src = src;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        /* Cover-crop in the SOURCE rect: pick the largest centred region of the
           original that matches the target aspect, then scale it down. Doing it
           here (rather than letting the canvas stretch) is what stops a 3:2
           photo becoming a squashed square. */
        const target = w / h;
        const source = img.naturalWidth / img.naturalHeight;
        let sw = img.naturalWidth;
        let sh = img.naturalHeight;
        if (source > target) sw = sh * target;
        else sh = sw / target;
        const sx = (img.naturalWidth - sw) / 2;
        const sy = (img.naturalHeight - sh) / 2;

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        return canvas.toDataURL('image/webp', 0.82);
      },
      { src: dataUri, w, h },
    );

    const out = Buffer.from(webp.split(',')[1], 'base64');
    await writeFile(join(OUT, `${name}.webp`), out);
    console.log(`${name.padEnd(14)} ${String(w).padStart(4)}x${String(h).padEnd(4)} ${String(Math.round(out.length / 1024)).padStart(4)} KB  © ${credit}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
  }
}

await browser.close();
