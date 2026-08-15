/* Build the provenance map: a real outline of South Africa plus the seven
 * workshop towns, projected into SVG coordinates and written to map-data.js.
 *
 * The whole premise of this store is that a piece is traceable to the bench it
 * was built on. Saying so in prose is cheap; showing the seven towns on a map
 * of the country is the argument made visually. That only works if the outline
 * is actually South Africa — a hand-drawn approximation reads as amateur
 * immediately, and everyone here knows the shape.
 *
 * So the border comes from public GeoJSON, is simplified (Douglas–Peucker) to
 * something a browser can paint cheaply, and is projected with a cos(lat)
 * correction so the country is not horizontally stretched. Lesotho arrives as
 * an interior ring in the source data and is kept — it is the detail that makes
 * the shape unmistakable.
 *
 * Run once; map-data.js is committed. Re-run only to change the projection.
 *
 * Usage:  node tools/build-map.mjs
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE =
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/ZAF.geo.json';

const WIDTH = 1000;
const HEIGHT = 860;
const PAD = 26;

/* The seven workshops, at their real coordinates. `key` matches MAKERS in
   catalogue.js so the map can drive the same filters as the shop sidebar. */
const TOWNS = [
  { key: 'mokoena',   label: 'Newtown, Johannesburg', lat: -26.2041, lon: 28.0333 },
  { key: 'vaal',      label: 'Vereeniging',           lat: -26.6731, lon: 27.9261 },
  { key: 'thabang',   label: 'Mbombela',              lat: -25.4753, lon: 30.9694 },
  { key: 'ndlovu',    label: 'Umbilo, Durban',        lat: -29.8700, lon: 30.9900 },
  { key: 'karoo',     label: 'Graaff-Reinet',         lat: -32.2520, lon: 24.5308 },
  { key: 'cederberg', label: 'Clanwilliam',           lat: -32.1833, lon: 18.8833 },
  { key: 'saltgrain', label: 'Salt River, Cape Town', lat: -33.9270, lon: 18.4650 },
];

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
const geo = await res.json();

/* ZAF is a MultiPolygon: the mainland (with Lesotho as an interior ring) plus
   the Prince Edward Islands, which are ~1800km into the Southern Ocean and
   would wreck the bounding box. Keep only rings with real area near the
   mainland. */
const geom = geo.features[0].geometry;
const polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];

const rings = [];
for (const poly of polygons) {
  for (const ring of poly) {
    /* Drop the sub-Antarctic islands: anything south of 40°S is not mainland. */
    if (ring.some(([, lat]) => lat < -40)) continue;
    if (ring.length < 8) continue;
    rings.push(ring);
  }
}

/* --- Douglas–Peucker ------------------------------------------------------
   The raw outline is ~1500 points. At the size this renders, most of them are
   sub-pixel. Simplifying keeps the silhouette while making the path cheap
   enough to animate a stroke along. */
function perpendicular([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const cx = ax + Math.max(0, Math.min(1, t)) * dx;
  const cy = ay + Math.max(0, Math.min(1, t)) * dy;
  return Math.hypot(px - cx, py - cy);
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

const simplified = rings.map((r) => simplify(r, 0.035));

/* --- projection -----------------------------------------------------------
   Equirectangular with a cos(mid-latitude) correction on x. Without it South
   Africa comes out noticeably too wide, because a degree of longitude at 30°S
   is only ~87% of a degree of latitude. */
const all = simplified.flat();
const lons = all.map(([lon]) => lon);
const lats = all.map(([, lat]) => lat);
const minLon = Math.min(...lons);
const maxLon = Math.max(...lons);
const minLat = Math.min(...lats);
const maxLat = Math.max(...lats);
const midLat = (minLat + maxLat) / 2;
const kx = Math.cos((midLat * Math.PI) / 180);

const spanX = (maxLon - minLon) * kx;
const spanY = maxLat - minLat;
const scale = Math.min((WIDTH - PAD * 2) / spanX, (HEIGHT - PAD * 2) / spanY);
const offX = (WIDTH - spanX * scale) / 2;
const offY = (HEIGHT - spanY * scale) / 2;

const project = (lon, lat) => [
  +(offX + (lon - minLon) * kx * scale).toFixed(1),
  +(offY + (maxLat - lat) * scale).toFixed(1),   // y grows downward
];

const toPath = (ring) => {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  return `M${pts.map((p) => p.join(' ')).join('L')}Z`;
};

/* Largest ring first so the mainland paints before Lesotho's hole. */
const ordered = [...simplified].sort((a, b) => b.length - a.length);
const path = ordered.map(toPath).join('');

const towns = TOWNS.map((t) => {
  const [x, y] = project(t.lon, t.lat);
  return { ...t, x, y };
});

const out = `/* GENERATED by tools/build-map.mjs — do not hand-edit.
 *
 * A real, simplified outline of South Africa (public-domain GeoJSON) projected
 * into a ${WIDTH}x${HEIGHT} viewBox, plus the seven workshop towns at their true
 * coordinates. \`key\` matches MAKERS in catalogue.js, so a pin can drive the
 * same filter the shop sidebar does.
 *
 * Projection is equirectangular with a cos(${midLat.toFixed(1)}°) correction on x,
 * without which the country renders too wide.
 */
const MAP_VIEWBOX = '0 0 ${WIDTH} ${HEIGHT}';
const MAP_PATH = '${path}';
const MAP_TOWNS = ${JSON.stringify(towns, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MAP_VIEWBOX, MAP_PATH, MAP_TOWNS };
}
`;

await writeFile(join(ROOT, 'map-data.js'), out);
console.log(`rings kept: ${rings.length} -> simplified points: ${simplified.reduce((n, r) => n + r.length, 0)}`);
console.log(`path length: ${path.length} chars`);
console.log(`bbox lon ${minLon.toFixed(2)}..${maxLon.toFixed(2)}  lat ${minLat.toFixed(2)}..${maxLat.toFixed(2)}`);
towns.forEach((t) => console.log(`  ${t.key.padEnd(10)} ${String(t.x).padStart(6)},${String(t.y).padStart(6)}  ${t.label}`));
