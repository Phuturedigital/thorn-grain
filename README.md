# Thorn & Grain — concept online store by Phuture Digital

An invented South African furniture brand and a **working** online store built
around it. Made to demonstrate design and build work: a business considering a
store like this can click through a finished one instead of reading a proposal.

**Live:** https://thorn-grain-concept.phuturedigital.co.za

> **Thorn & Grain is not a real company.** The brand, the seven workshops and
> every price on the site are invented. Photography is licensed stock showing
> furniture made by people unconnected to this concept. Every page carries a
> concept banner saying so.

## The brand

| | |
|---|---|
| **Name** | Thorn & Grain — the thornveld acacia, and the grain of the plank it becomes |
| **Positioning** | *Furniture from South African workshops* |
| **Premise** | Every piece names the workshop that built it, where it is, and how long it has been going |
| **Palette** | ochre `#C4622D` · sand `#EFE7DC` · ink `#241F1B` · peach `#F6DFCB` |
| **Type** | Jost (display, light geometric) + Inter (text) |

The reference design this reproduces is a mainstream furniture-store template —
hero with an oversized ghost numeral, category tiles, inset-framed room banners,
product cards with badges, star rows and countdown strips. The **structure** is
reproduced closely. The **palette is not**: the template runs periwinkle and a
generic e-commerce orange, and re-grounding it in warm sand and burnt ochre is
what makes it read as a South African furniture house rather than a reskin.

## What actually works

This is a store, not a picture of one. All of it runs client-side against
`catalogue.js`:

- **Search** — header search and a live filter box on the shop page
- **Filters** — by category, by workshop, by price band; deep links like
  `shop?cat=lighting` arrive pre-filtered
- **Sort** — featured, price up/down, name
- **Basket** — add, change quantity, remove; persists in `localStorage`;
  subtotal, delivery and total recomputed on every render
- **Saved list** — heart toggle on every card, count in the header
- **Rooms** — a second axis over the same catalogue (a piece can be in several)
- **Countdown strips** — real deadlines, not decoration (see below)
- **Quick view** — a native `<dialog>` on every card, so focus trapping and
  Escape are the platform's job rather than ours
- **Provenance map** — the seven workshops on a real outline of South Africa;
  hover or click a town to swap the panel and land on a pre-filtered shop

## Motion

`motion.css` + `motion.js`, loaded after the design system. The whole layer is
**additive**: it listens for events `site.js` dispatches (`tg:add`, `tg:render`)
rather than being called by it, so deleting both files leaves a working store.

What moves: scroll reveals with stagger, a cross-fading hero with a drifting
product disc and a progress ring on the dots, count-up figures, a running ticker
of the seven towns, a sweep across product tiles on hover, a chip that flies
from the product to the basket, the map drawing itself, and the **grain rule** —
four strokes that draw like a plane pulling a shaving off a board. That last one
is this site's signature motif; every concept in the network has one.

### 🚨 The reduced-motion contract

Reveal animations start at `opacity: 0`. "Turn animations off" would therefore
leave the page **blank** for anyone with the OS setting on — and would blank
every screenshot in `tools/shots/`, because `shoot.mjs` captures under
`reducedMotion:'reduce'`. So the media query in `motion.css` forces the
**finished** state rather than cancelling the animation. Motion is removed;
content never is.

Anything JS drives needs its own gate, because a media query cannot stop a
`requestAnimationFrame` loop — see `STILL` in `motion.js`.

`node tools/motion-check.mjs` asserts all of this, and it is the check that
matters most in this repo after `smoke.mjs`.

There is **no checkout**. The button is deliberately dead rather than pretending
to take a card, and the contact form says outright that it sends nothing.

## Layout

```
thorn-grain/
├── index.html          Home — hero carousel, categories, room banners, hot products, makers
├── shop.html           Full catalogue + filters + sort
├── product.html        Single piece, driven by ?id=
├── rooms.html          Shop by room, driven by ?room=
├── makers.html         The seven workshops
├── cart.html           Basket + summary
├── about.html          What this is, what is invented, the assumptions it rests on
├── contact.html        Form (no backend, and says so)
│
├── catalogue.js        Products, makers, categories, rooms, money — single source of truth
├── site.js             Store behaviour for all eight pages
├── styles.css          Design system
├── vercel.json         cleanUrls + noindex + security headers
├── robots.txt          Disallow all — a concept must not compete in search
│
├── images/             37 webp assets
└── tools/              QA + sourcing (never deployed — see .vercelignore)
```

## Working on it

```bash
# Serve locally with Vercel's cleanUrls behaviour.
# Opening the files over file:// will 404 on every link — internal hrefs are
# written without .html because vercel.json sets cleanUrls.
node tools/serve.mjs          # http://localhost:4321

node tools/smoke.mjs          # 30 checks — pins the copy to the arithmetic
node tools/motion-check.mjs   # 26 checks — reduced motion, carousel, map, quick view
node tools/shoot.mjs          # screenshots, 8 pages x desktop + phone
node tools/charcheck.mjs      # look-alike whitespace scan
node tools/build-map.mjs      # regenerate map-data.js (rarely needed)
node tools/map-preview.mjs    # render the map alone, to eyeball the outline
```

**`tools/smoke.mjs` is the important one.** The site states specific figures —
how many pieces, how many workshops, what delivery costs, what a basket comes
to — and the test drives a real browser to confirm each still matches
`catalogue.js`. Change a price and the test goes red instead of the home page
quietly becoming false.

### There is no build, and no `package.json`

Deliberate. A bare manifest is enough for Vercel to detect a framework and run
an install on a site with nothing to build. The QA scripts borrow Playwright
from a sibling repo (`file:///C:/Users/Acer/thatha/`) rather than declaring a
dependency here.

### Adding a page

The pages are flat, hand-maintained HTML. Copy an existing one and edit the
`<title>`, the breadcrumb and the `class="active"` nav item. They were
originally stamped from one chrome template by a generator that was **deleted
straight after it ran** — a generator left in the repo is a second thing capable
of silently destroying the `pd-network` cross-link block, and the network stamp
already has that failure mode.

## One thing is deliberately unfinished

`dealState()` in `catalogue.js` decides what the store does the moment a
countdown reaches zero — revert quietly, say the deal ended, roll the clock
forward, or honour a grace window. It is a real trade-off between honesty and
conversion, so it is left to be authored rather than guessed.

Until it is written it returns `null`, and the site falls back to the safest
reading: the markdown is over, full price applies, the countdown hides. The
store is complete and truthful without it — `tools/smoke.mjs` asserts exactly
that, so no fake urgency can appear by accident.

---

Built by [Phuture Digital](https://www.phuturedigital.co.za) · Johannesburg
