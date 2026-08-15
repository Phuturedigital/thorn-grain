/* ============================================================
   THORN & GRAIN — catalogue
   The single source of truth for products, makers and money.

   Every page reads from here. Nothing is duplicated into markup:
   the product grid, the shop filters, the product page and the
   cart are all rendered from this file, so a price can only ever
   be wrong in one place.

   ⚠️ CONCEPT DATA. Thorn & Grain is an invented brand and every
   workshop named below is invented too. Prices are plausible
   South African retail figures, not quotes. See CONTENT-NOTES.md.
   ============================================================ */

/* Workshops. The premise of the store is that each piece is traceable to the
   bench it was built on, so `maker` is a first-class field on every product
   rather than a marketing line — the product card, the product page and the
   makers page all read the same record. */
const MAKERS = {
  mokoena:   { name: 'Mokoena Joinery',      town: 'Newtown, Johannesburg', since: 2009, craft: 'Solid-timber casework and dining' },
  saltgrain: { name: 'Salt & Grain Studio',  town: 'Salt River, Cape Town',  since: 2014, craft: 'Cabinetry, veneer and finishing' },
  ndlovu:    { name: 'Ndlovu Bros Woodwork', town: 'Umbilo, Durban',         since: 2003, craft: 'Hardwood frames and leatherwork' },
  karoo:     { name: 'Karoo Bench Co.',      town: 'Graaff-Reinet',          since: 2017, craft: 'Benches, stools and stone tops' },
  thabang:   { name: 'Thabang Metal & Wood', town: 'Mbombela',               since: 2012, craft: 'Steel frames and lighting' },
  cederberg: { name: 'Cederberg Cane',       town: 'Clanwilliam',            since: 1998, craft: 'Cane, sisal and hand weaving' },
  vaal:      { name: 'Vaal Upholstery',      town: 'Vereeniging',            since: 2006, craft: 'Upholstery, foam and textiles' },
};

const CATEGORIES = [
  { id: 'seating',  label: 'Seating',   blurb: 'Dining chairs, stools, benches and lounge seating.' },
  { id: 'sofas',    label: 'Sofas',     blurb: 'Two- and three-seaters, upholstered here.' },
  { id: 'tables',   label: 'Tables',    blurb: 'Dining, coffee and side tables.' },
  { id: 'storage',  label: 'Storage',   blurb: 'Sideboards, dressers and mirrors.' },
  { id: 'lighting', label: 'Lighting',  blurb: 'Pendants, floor lamps and shades.' },
  { id: 'textiles', label: 'Textiles',  blurb: 'Rugs, cushions and woven baskets.' },
  { id: 'beds',     label: 'Beds',      blurb: 'Frames built to take a South African mattress.' },
];

/* Rooms exist as a second axis over the same catalogue — the template's promo
   banners shop by room, while the nav shops by category. One product can sit in
   several rooms, which is why this is not just another category. */
const ROOMS = [
  { id: 'living', label: 'Living room', image: 'images/room-living.webp', blurb: 'Seating, low tables, light and floor covering.' },
  { id: 'dining', label: 'Dining room', image: 'images/room-dining.webp', blurb: 'The long table, the chairs around it, the sideboard behind.' },
  { id: 'bedroom', label: 'Bedroom',    image: 'images/room-bed.webp',    blurb: 'Frames, side tables and soft light.' },
];

/* ---------------------------------------------------------------
   PRODUCTS

   price  — current selling price, in rands, VAT inclusive
   was    — previous price; presence of `was` is what makes it a markdown
   deal   — ISO timestamp the markdown ends. Drives the countdown strip.
   rating / reviews — SAMPLE DATA. See the note in CONTENT-NOTES.md: the
            card anatomy in the reference design includes a star row, so it
            is reproduced, but no written testimonial is invented anywhere
            on this site and no review text exists.
   --------------------------------------------------------------- */
const PRODUCTS = [
  { id: 'vaal', name: 'Vaal Dining Chair', cat: 'seating', rooms: ['dining'], maker: 'vaal',
    image: 'images/p-vaal.webp', price: 2450, was: 3200, deal: '2026-08-31T18:00:00+02:00',
    rating: 4.5, reviews: 2, tags: ['latest', 'best'],
    material: 'Kiaat frame, full-grain leather seat', size: 'W 46 × D 52 × H 84 cm', lead: '3–4 weeks',
    blurb: 'A low-backed diner with a leather sling seat. The frame is cut from kiaat offcuts too short for a table top, which is why it costs what it does.' },

  { id: 'crossback', name: 'Wynberg Cross-Back Chair', cat: 'seating', rooms: ['dining'], maker: 'saltgrain',
    image: 'images/p-crossback.webp', price: 1890, rating: 4, reviews: 1, tags: ['latest', 'new'],
    material: 'Steamed oak, woven seagrass seat', size: 'W 44 × D 50 × H 91 cm', lead: '2–3 weeks',
    blurb: 'The farmhouse cross-back, built square and heavy enough to survive being dragged across a stoep for twenty years.' },

  { id: 'loop', name: 'Loop Side Chair', cat: 'seating', rooms: ['dining', 'living'], maker: 'mokoena',
    image: 'images/p-loop.webp', price: 1650, was: 2100, deal: '2026-10-31T18:00:00+02:00',
    rating: 4, reviews: 3, tags: ['latest', 'best', 'hot'],
    material: 'Moulded ply shell, powder-coated steel legs', size: 'W 42 × D 48 × H 80 cm', lead: 'In stock',
    blurb: 'A pressed-ply shell on a thin steel frame. Stacks four high, which matters when the chairs live in a cupboard between Sundays.' },

  { id: 'bekker', name: 'Bekker Two-Seater', cat: 'sofas', rooms: ['living'], maker: 'vaal',
    image: 'images/p-bekker.webp', price: 14900, was: 18500, deal: '2026-09-30T18:00:00+02:00',
    rating: 5, reviews: 4, tags: ['latest', 'top', 'best'],
    material: 'Hardwood frame, high-resilience foam, wool-blend weave', size: 'W 158 × D 82 × H 78 cm', lead: '5–6 weeks',
    blurb: 'A buttoned two-seater on tapered legs. The frame is jointed rather than stapled, so it can be re-upholstered instead of replaced.' },

  { id: 'kalahari', name: 'Kalahari Lounge Chair', cat: 'seating', rooms: ['living'], maker: 'ndlovu',
    image: 'images/p-kalahari.webp', price: 8750, rating: 4.5, reviews: 2, tags: ['top', 'hot'],
    material: 'Solid meranti arms, tan hide', size: 'W 66 × D 74 × H 79 cm', lead: '4 weeks',
    blurb: 'A low reading chair with an exposed timber arm. The hide is vegetable-tanned and will go darker where your hands land.' },

  { id: 'swivel', name: 'Ridge Swivel Armchair', cat: 'seating', rooms: ['living'], maker: 'vaal',
    image: 'images/p-swivel.webp', price: 9400, was: 11200, rating: 4, reviews: 0, tags: ['latest'],
    material: 'Moulded shell, bouclé cover, cast base', size: 'W 72 × D 70 × H 76 cm', lead: '4–5 weeks',
    blurb: 'A swivel chair that turns without squeaking, which is the entire brief. Cover comes off for cleaning.' },

  { id: 'werf', name: 'Werf Sideboard', cat: 'storage', rooms: ['dining', 'living'], maker: 'mokoena',
    image: 'images/p-werf.webp', price: 16400, rating: 5, reviews: 3, tags: ['top', 'best'],
    material: 'American walnut veneer, solid walnut edging', size: 'W 180 × D 45 × H 72 cm', lead: '6 weeks',
    blurb: 'Four doors, two adjustable shelves, a cable notch in the back panel. Named for the walled yard it is meant to sit against.' },

  { id: 'sheesham', name: 'Malmesbury Dresser', cat: 'storage', rooms: ['dining'], maker: 'saltgrain',
    image: 'images/p-sheesham.webp', price: 12750, was: 15900, rating: 4.5, reviews: 2, tags: ['best'],
    material: 'Solid sheesham, hand-waxed', size: 'W 160 × D 45 × H 80 cm', lead: '4–5 weeks',
    blurb: 'Six drawers and two cupboards in solid sheesham. Heavy on purpose — it is meant to be the thing you never move.' },

  { id: 'tray', name: 'Tray Side Table', cat: 'tables', rooms: ['living'], maker: 'karoo',
    image: 'images/p-tray.webp', price: 3200, rating: 4, reviews: 1, tags: ['latest', 'new'],
    material: 'Solid oak tray, blackened steel base', size: 'Ø 46 × H 52 cm', lead: 'In stock',
    blurb: 'The tray lifts off the base and becomes a tray, which is less of a gimmick than it sounds when guests arrive.' },

  { id: 'coffee', name: 'Highveld Coffee Table', cat: 'tables', rooms: ['living'], maker: 'thabang',
    image: 'images/p-coffee.webp', price: 7900, was: 9600, rating: 4.5, reviews: 5, tags: ['top', 'best', 'hot'],
    material: 'Reclaimed pine top, raw steel spider base', size: 'W 120 × D 70 × H 42 cm', lead: '3 weeks',
    blurb: 'Reclaimed roof pine over a welded spider base. Every top is a different colour because every roof was.' },

  { id: 'slat', name: 'Slat Bench', cat: 'seating', rooms: ['dining', 'bedroom'], maker: 'karoo',
    image: 'images/p-slat.webp', price: 4300, rating: 4, reviews: 0, tags: ['latest'],
    material: 'Solid ash, oiled', size: 'W 150 × D 34 × H 45 cm', lead: '2 weeks',
    blurb: 'Five slats, four legs, no upholstery to wear out. Doubles as the end-of-bed bench when the table gets full.' },

  { id: 'stool', name: 'Workshop Bar Stool', cat: 'seating', rooms: ['dining'], maker: 'mokoena',
    image: 'images/p-stool.webp', price: 2150, was: 2750, rating: 4.5, reviews: 6, tags: ['best', 'hot'],
    material: 'Solid beech, adjustable steel column', size: 'Ø 34 × H 62–82 cm', lead: 'In stock',
    blurb: 'A machinist stool that wound up in kitchens. Winds up and down, and the seat is a single piece of turned beech.' },

  { id: 'brass', name: 'Reader Floor Lamp', cat: 'lighting', rooms: ['living', 'bedroom'], maker: 'thabang',
    image: 'images/p-brass.webp', price: 4650, rating: 5, reviews: 2, tags: ['top', 'latest'],
    material: 'Brushed brass stem, linen shade', size: 'H 152 cm, shade Ø 32 cm', lead: '3 weeks',
    blurb: 'An angled reading lamp that puts light on the page instead of in your eyes. Takes a standard E27 globe.' },

  { id: 'cage', name: 'Cage Pendant', cat: 'lighting', rooms: ['dining'], maker: 'thabang',
    image: 'images/p-cage.webp', price: 1450, was: 1850, rating: 3.5, reviews: 1, tags: ['best'],
    material: 'Powder-coated steel cage, fabric flex', size: 'Ø 22 × H 30 cm, 2 m flex', lead: 'In stock',
    blurb: 'A bare cage pendant for over a counter. Hang three in a row and the room is finished.' },

  { id: 'slatlight', name: 'Bloom Pendant', cat: 'lighting', rooms: ['dining', 'living'], maker: 'cederberg',
    image: 'images/p-slatlight.webp', price: 3350, rating: 5, reviews: 3, tags: ['latest', 'new', 'top'],
    material: 'Laser-cut birch ply, cotton flex', size: 'Ø 48 × H 40 cm', lead: '2–3 weeks',
    blurb: 'Ninety cut ply ribs that throw a striped light across the ceiling. Ships flat and clicks together in about ten minutes.' },

  { id: 'basket', name: 'Cederberg Basket Pair', cat: 'textiles', rooms: ['living', 'bedroom'], maker: 'cederberg',
    image: 'images/p-basket.webp', price: 890, rating: 4.5, reviews: 4, tags: ['best'],
    material: 'Hand-woven palm and sisal', size: 'Large Ø 38 × H 42 cm, small Ø 24 × H 26 cm', lead: 'In stock',
    blurb: 'Two baskets, woven by hand in Clanwilliam. No two are the same size, and the weave tightens with use.' },

  { id: 'sisal', name: 'Sisal Floor Rug', cat: 'textiles', rooms: ['living'], maker: 'cederberg',
    image: 'images/p-sisal.webp', price: 5400, was: 6800, rating: 4, reviews: 2, tags: ['best', 'top'],
    material: '100% sisal, cotton-bound edge', size: '200 × 290 cm', lead: '2 weeks',
    blurb: 'A flat sisal weave that takes sand and dog without showing it. Bound rather than fringed so it lies flat under a door.' },

  { id: 'mirror', name: 'Strap Mirror', cat: 'storage', rooms: ['bedroom', 'living'], maker: 'saltgrain',
    image: 'images/p-mirror.webp', price: 2650, rating: 4.5, reviews: 1, tags: ['latest'],
    material: 'Oak frame, bridle-leather strap', size: 'Ø 60 cm, strap 90 cm', lead: 'In stock',
    blurb: 'Hangs from a single leather strap on one hook, which means you can move it without patching a wall.' },

  { id: 'kilim', name: 'Kalahari Cushion Set', cat: 'textiles', rooms: ['living', 'bedroom'], maker: 'vaal',
    image: 'images/p-kilim.webp', price: 1250, rating: 4, reviews: 3, tags: ['hot', 'best'],
    material: 'Woven wool fronts, cotton backs, feather inners', size: 'Three covers, 45 × 45 cm', lead: 'In stock',
    blurb: 'Three woven covers and three feather inners. Covers zip off; the inners are the part most sets skimp on.' },

  { id: 'marble', name: 'Stone Round Table', cat: 'tables', rooms: ['dining'], maker: 'karoo',
    image: 'images/p-marble.webp', price: 18900, was: 22400, deal: '2026-12-24T18:00:00+02:00',
    rating: 5, reviews: 2, tags: ['top', 'best'],
    material: 'Honed limestone top, solid oak legs', size: 'Ø 130 × H 75 cm', lead: '6–8 weeks',
    blurb: 'A honed limestone round on four turned oak legs. Seats six comfortably and eight if everyone is friendly.' },

  { id: 'bed', name: 'Riempie Bed Frame', cat: 'beds', rooms: ['bedroom'], maker: 'mokoena',
    image: 'images/p-bed.webp', price: 21500, rating: 5, reviews: 1, tags: ['top', 'latest'],
    material: 'Solid oak frame, woven leather headboard', size: 'Queen — W 168 × L 202 × H 105 cm', lead: '6 weeks',
    blurb: 'An oak frame with a hand-woven leather headboard, in the riempie tradition. Sized for a standard SA queen mattress.' },
];

/* ---------------------------------------------------------------
   MONEY + DERIVED VALUES
   --------------------------------------------------------------- */

/* South African convention: R, thousands separated by a space, no decimals on
   whole rands.

   ⚠️ toLocaleString('en-ZA') separates thousands with U+00A0 (and on some
   engines U+202F) — NOT a plain space. Those two render identically to a normal
   space and compare unequal, which is how a failing test prints two strings
   that look the same. The separators are therefore BUILT FROM CHAR CODES here
   rather than pasted, so the character stays visible in source, and the result
   is normalised to U+0020 so callers can compare against an ordinary space. */
const LOOKALIKE_SPACES = new RegExp(
  [160, 8239, 8201].map((c) => String.fromCharCode(c)).join('|'),
  'g',
);

function money(rands) {
  return `R${Math.round(rands).toLocaleString('en-ZA').replace(LOOKALIKE_SPACES, ' ')}`;
}

function discountPct(product) {
  if (!product.was || product.was <= product.price) return 0;
  return Math.round((1 - product.price / product.was) * 100);
}

const byId = (id) => PRODUCTS.find((p) => p.id === id) || null;
const makerOf = (product) => MAKERS[product.maker];

/* ---------------------------------------------------------------
   DEAL EXPIRY  ← deliberately left for you to write

   Three products carry a `deal` timestamp, which drives the countdown strip
   on the product card. The question this function answers is: what should the
   store do at the moment that clock reaches zero?

   This is a real trade-off, not boilerplate, and it is the reason the function
   is empty. The usual retail answers are:

     • Revert quietly — drop the badge, charge `was`, say nothing. Honest, but
       a shopper who saw the price an hour ago has no idea what happened.
     • Say it ended — revert the price AND show "Deal ended". Most honest,
       slightly deflating, and it dates the page if nobody tends it.
     • Roll it forward — reset the clock to next week and keep the price. This
       is what most stores do. It is also a dark pattern: the urgency is fake,
       and it is exactly the kind of claim this studio's own rules forbid.
     • Extend a grace window — honour the price for a few more hours so nobody
       who was mid-checkout gets a surprise, then revert.

   Return an object shaped:
     { live: boolean,   // is the markdown still in force?
       price: number,   // the price to actually charge right now
       label: string }  // what the countdown strip should read

   `now` is passed in rather than read from the clock so this stays testable —
   tools/smoke.mjs drives it with fixed dates on both sides of the deadline.

   Until this is written it returns null, and site.js falls back to the safest
   reading: the markdown is over, the full price applies and the strip hides.
   The store is complete and truthful without it; what you write here decides
   how it behaves at the edge.
   --------------------------------------------------------------- */
function dealState(product, now = new Date()) {
  if (!product || !product.deal) return null;

  // TODO — see the note above. Return { live, price, label }.
  return null;
}

/* The safe reading used whenever dealState() declines to answer: treat the
   markdown as finished. Never invents urgency it cannot justify. */
function resolvedDeal(product, now = new Date()) {
  const authored = dealState(product, now);
  if (authored && typeof authored.live === 'boolean') return authored;
  return { live: false, price: product.was || product.price, label: '' };
}

/* A product only has a live markdown if it has BOTH a `was` and, where a
   deadline exists, a deadline that has not passed. Everything downstream —
   card badge, card price, product page, cart line — goes through here, so the
   sale price cannot disagree with itself between two pages. */
function effective(product, now = new Date()) {
  if (!product.was) return { price: product.price, was: null, off: 0, deal: null };
  if (!product.deal) return { price: product.price, was: product.was, off: discountPct(product), deal: null };

  const state = resolvedDeal(product, now);
  return state.live
    ? { price: state.price ?? product.price, was: product.was, off: discountPct(product), deal: state }
    : { price: state.price ?? product.was, was: null, off: 0, deal: state };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUCTS, MAKERS, CATEGORIES, ROOMS, money, discountPct, byId, makerOf, dealState, resolvedDeal, effective };
}
