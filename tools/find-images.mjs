/* Thorn & Grain concept — stock image sourcing.
 *
 * Queries Pexels for each image slot the store design needs and writes small
 * preview JPEGs to tools/previews/ so every candidate can be LOOKED at before
 * anything ships. Nothing here runs at build or deploy time; the site is static
 * and serves only the converted webp files under images/.
 *
 * Two distinct kinds of frame are needed, and they have different rules:
 *
 *   PRODUCT slots  — a single piece of furniture on a plain, bright, uncluttered
 *     ground. These sit on pale tiles in a grid; anything shot in a busy room
 *     turns the grid into visual noise and stops the product reading at 280px.
 *
 *   ROOM / MAKER slots — full scenes, used behind text or as banners. These want
 *     depth and warmth, and must clear a scrim without hiding what they show.
 *
 * Casting: the maker slots look deliberately for African woodworkers. A South
 * African brand whose whole premise is "made by workshops here" illustrated with
 * European artisans would undercut the only claim the site makes.
 *
 * Pexels licence: free for commercial use, no attribution required. Credits are
 * recorded in CONTENT-NOTES.md anyway — "where did this image come from" always
 * gets asked on a client-facing concept.
 *
 * Usage:  node tools/find-images.mjs <slot>     # search + download previews
 *         node tools/find-images.mjs --all      # every slot
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_DIR = join(ROOT, 'tools', 'previews');

/* Pexels' web client key. Public — it ships in their own front-end bundle.
   Unsplash's search endpoint 401s without a registered app key; this is the
   working path. */
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  Accept: 'application/json',
  'Secret-Key': 'H2jk9uKnhRmL6WPwh89zBezWvr',
};

const SLOTS = {
  /* --- hero carousel: one statement piece, generous negative space --- */
  'hero-chair':  'armchair chair plain background studio minimal',
  'hero-table':  'wooden side table plain background minimal',
  'hero-sofa':   'sofa couch plain light background studio',

  /* --- category tiles --- */
  'cat-seating': 'dining chair wooden plain white background',
  'cat-sofa':    'grey sofa isolated plain background',
  'cat-table':   'round table plain background interior',
  'cat-light':   'pendant lamp hanging plain background',
  'cat-storage': 'wooden sideboard cabinet plain background',
  'cat-bed':     'bed frame wooden bedroom plain minimal',

  /* --- product grid --- */
  'p-armchair':  'armchair upholstered fabric studio product',
  'p-diner':     'wooden dining chair product shot',
  'p-lounge':    'lounge chair leather minimal product',
  'p-coffee':    'coffee table wood minimal product shot',
  'p-side':      'side table small round product shot',
  'p-pendant':   'pendant light shade minimal product',
  'p-floorlamp': 'floor lamp minimal product shot',
  'p-bench':     'wooden bench seat product shot',
  'p-stool':     'wooden stool product shot minimal',
  'p-sideboard': 'sideboard credenza wood product shot',
  'p-mirror':    'round mirror wall minimal product',
  'p-basket':    'woven basket seagrass product shot',
  'p-rug':       'woven rug floor natural fibre',
  'p-cushion':   'cushion pillow textile woven product',

  /* --- room banners --- */
  'room-living': 'living room interior warm natural light minimal',
  'room-dining': 'dining room interior wooden table natural light',
  'room-bed':    'bedroom interior calm natural light minimal',

  /* --- makers / workshop --- */
  'maker-a':     'african carpenter workshop woodworking',
  'maker-b':     'black woman carpenter workshop wood',
  'maker-c':     'craftsman hands sanding wood workshop',
  'workshop':    'woodworking workshop timber tools interior',
  'timber':      'stacked timber planks wood texture',
  'weaving':     'hands weaving cane rattan chair seat',

  /* --- second pass ---------------------------------------------------------
     "coffee table" returns cups of coffee; "bench" returns park benches. Both
     needed the furniture context spelled out. `hero-plant` was added after
     re-reading the reference: its hero pairs the table with a potted plant, and
     the plant is doing half the compositional work. */
  'p-coffeetable': 'coffee table living room furniture wooden modern',
  'p-benchseat':   'wooden bench indoor entryway furniture minimal',
  'hero-plant':    'potted plant monstera white pot plain background',
  'room-living2':  'scandinavian living room sofa plants bright airy',
};

async function search(query, perPage = 6) {
  const url =
    `https://www.pexels.com/en-us/api/v3/search/photos` +
    `?query=${encodeURIComponent(query)}&per_page=${perPage}&page=1&orientation=all`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Pexels ${res.status} for "${query}"`);
  const { data = [] } = await res.json();
  return data.map((d) => ({
    id: d.id,
    photographer: d.attributes?.user?.first_name
      ? `${d.attributes.user.first_name} ${d.attributes.user.last_name ?? ''}`.trim()
      : 'unknown',
    alt: (d.attributes?.image?.alt ?? '').replace(/\s+/g, ' ').trim(),
    width: d.attributes?.width,
    height: d.attributes?.height,
    /* Strip Pexels' download-disposition params so the CDN can re-size it. */
    base: String(d.attributes?.image?.download_link ?? '').split('?')[0],
  })).filter((c) => c.base);
}

const sized = (base, w) => `${base}?auto=compress&cs=tinysrgb&w=${w}`;

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

const wanted = process.argv[2] === '--all' ? Object.keys(SLOTS) : [process.argv[2]];
await mkdir(PREVIEW_DIR, { recursive: true });

for (const slot of wanted) {
  const query = SLOTS[slot];
  if (!query) { console.error(`unknown slot: ${slot}`); continue; }
  try {
    const results = await search(query);
    console.log(`\n=== ${slot} :: "${query}" ===`);
    for (const [i, c] of results.entries()) {
      const file = join(PREVIEW_DIR, `${slot}-${i}-${c.id}.jpg`);
      await download(sized(c.base, 400), file);
      console.log(`[${i}] id=${c.id} ${c.width}x${c.height} by ${c.photographer} :: ${c.alt}`);
    }
  } catch (err) {
    console.error(`FAIL ${slot}: ${err.message}`);
  }
}
