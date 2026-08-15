# Content notes — Thorn & Grain

Everything on this site that a reasonable person might mistake for a fact, and
what it actually is. Kept because "where did this come from" always gets asked,
and because a concept site that drifts into unlabelled invention stops being a
demo and starts being a lie.

## The claims register

| On the site | Status |
|---|---|
| The brand *Thorn & Grain* | **Invented.** No such company. Collision-checked against SA furniture and homeware brands before the name was chosen. |
| The seven workshops | **Invented.** The towns (Newtown, Salt River, Umbilo, Graaff-Reinet, Mbombela, Clanwilliam, Vereeniging) are real; the businesses are not. No real workshop has been described, quoted or represented. |
| Prices | **Plausible, not quoted.** In the range South African makers charge for comparable work. Nobody has priced these pieces. |
| Product names, materials, dimensions | **Invented**, written to be internally consistent with the photograph shown. |
| Lead times (2–8 weeks) | **Invented**, chosen to be realistic for made-to-order work. |
| Star ratings and review counts | **Sample data.** See below. |
| Delivery: flat R750, free over R10 000 | **Invented figures**, but *executed* — the basket really applies them, and `tools/smoke.mjs` pins the prose to the arithmetic. |
| "Ten-year frame guarantee", "30 days to change your mind" | **Invented policy**, stated as the concept's terms. |
| Photography | **Licensed stock** (Pexels). Real furniture, real workshops, none connected to this brand. Credits below. |
| The contact form | **Has no backend** and says so on submit. Nothing is sent or stored. |
| Checkout | **Does not exist.** The button is disabled on purpose. |

## Two judgement calls worth recording

**Star ratings were kept; written reviews were not.** The reference design's
product card includes a rating row and a review count, and removing it would
break the structural fidelity this site was asked for. So the row is reproduced
as sample data. What is *not* done anywhere on this site is inventing a review
body or attributing a quote to a named person — invented testimonials read as
real in a way a star glyph does not, and that is the line. There are no
testimonials, no customer counts and no results claims on any page.

**Countdown timers count down to real deadlines.** The reference shows deal
timers (`End in: 259d : 14h : 44m : 52s`). Rather than animate a decorative
number, the three markdown products carry genuine ISO deadlines and the strip
renders the real remaining time. What happens at zero is
[deliberately unimplemented](#deliberately-unfinished) — and until it is
written, the site shows **no** discount and **no** countdown for those products
rather than inventing urgency it cannot justify.

## Deliberately unfinished

`dealState()` in `catalogue.js`. It answers: when a markdown's clock hits zero,
does the store revert quietly, announce that the deal ended, roll the timer
forward (the usual retail dark pattern), or honour a short grace window?

That is a values decision as much as a UX one, so it is left to be authored.
The fallback is the safe reading — markdown over, full price, strip hidden —
and `tools/smoke.mjs` asserts it, so the honest behaviour cannot regress by
accident.

## Image credits

All photography licensed from **Pexels** (free for commercial use, attribution
not required — recorded anyway). Downloaded and converted to webp by
`tools/fetch-assets.mjs`; the ids are in that file.

| Slot | Photographer |
|---|---|
| hero-plant | Sutee Vichaporn |
| hero-chair, hero-sofa, cat-seating, cat-sofa, p-crossback, p-bekker, p-sheesham | Rachel Claire |
| cat-table, p-marble, p-stool | Charlotte May |
| cat-light, p-slatlight | Erik Mclean |
| cat-storage, p-werf | dada _design |
| cat-bed, p-bed | Curtis Adams |
| room-living | Stanislav Kondratiev |
| room-dining, room-bed | Max Vakhtbovych |
| p-vaal | Ron Lach |
| p-loop | Meruyert Gonullu |
| p-kalahari | Skylar Kang |
| p-swivel | Rezwan Ridwan |
| p-tray | Kseniia Rastvorova |
| p-coffee | Osmany Mederos |
| p-slat | Jan van der Wolf |
| p-brass | Anete Lusina |
| p-cage | Ekrulila |
| p-basket | Bogdan Krupin |
| p-sisal | Ruby Anderson |
| p-mirror | Karolina Grabowska |
| p-kilim | Mehmet Turgut Kirkgoz |
| maker-a, maker-b | Tima Miroshnichenko |
| maker-c | Daniel Reche |
| timber | Mark Stebnicki |

### Casting

The maker photographs were selected to show African woodworkers. The entire
premise of the store is that the furniture is built by workshops here;
illustrating that with European artisans would undercut the only claim the site
makes. Alt text is kept pronoun-neutral — these are real people and their
pronouns are not ours to assert.

Note that the workshop photographs are **stock from elsewhere**, not South
African workshops. They stand in for a real shoot; on a live build they would be
replaced with photographs of the actual suppliers, and until they are, the
workshops page says plainly that the businesses are invented.

## Design decisions not to quietly reverse

- **The concept banner sits above the header on every page**, not in the footer.
  It is the first thing read, which is the point.
- **The hero product is a circular crop, not a cut-out.** The reference floats
  transparent PNG cut-outs on a peach disc. These are photographs with their own
  grounds, so the disc became the crop instead. Reverting to rectangles loses the
  whole compositional idea.
- **The About page states the four assumptions the concept rests on and how each
  could be proved wrong.** That section is the most valuable thing on the site —
  it is what separates a demo from a brochure. Do not let it get softened into
  marketing.
- **The contact page deliberately omits a showroom address and phone number.**
  An address that looks real but is not is the single most genuinely misleading
  thing a concept site can carry.
- **`robots.txt` disallows everything** and `vercel.json` sends
  `X-Robots-Tag: noindex`. An invented furniture brand ranking for real queries
  would be actively harmful to real retailers.
