/* Thorn & Grain — motion layer checks.
 *
 * Separate from smoke.mjs on purpose: smoke.mjs asks "is what this page says
 * still true", this asks "does the motion layer behave".
 *
 * 🚨 The check that matters most is the FIRST one. Every reveal animation
 * starts at opacity:0. If the reduced-motion rules ever stop forcing the
 * finished state — a refactor, a reordered stylesheet, a stray `animation:
 * none` — then anyone with the OS setting on gets a blank page, and every
 * screenshot in tools/shots/ silently goes blank too, because shoot.mjs
 * captures under reducedMotion:'reduce'. Nothing else would catch it.
 *
 * Usage:  node tools/motion-check.mjs
 */
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('file:///C:/Users/Acer/thatha/');
const { chromium } = require('playwright');
const local = createRequire(import.meta.url);
const cat = local(join(ROOT, 'catalogue.js'));

const PORT = 4466;
const server = await serve(PORT);
const base = `http://localhost:${PORT}`;

let failures = 0;
const assert = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`);
};
const check = (name, actual, expected) =>
  assert(name, String(actual) === String(expected), `expected ${expected}, got ${actual}`);

const browser = await chromium.launch();

/* ===============================================================
   1. THE REDUCED-MOTION CONTRACT
   Content must be VISIBLE, not merely un-animated.
   =============================================================== */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();

  for (const path of ['/', '/makers', '/shop']) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const hidden = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.reveal, .stagger > *, .grain-rule, .map-outline, .map-pin')
        .forEach((el) => {
          const cs = getComputedStyle(el);
          if (parseFloat(cs.opacity) < 0.99) {
            out.push(`${el.className || el.tagName} opacity=${cs.opacity}`);
          }
        });
      return out;
    });
    assert(`reduced motion: nothing invisible on ${path}`, hidden.length === 0, hidden.slice(0, 4).join(' | '));

    /* A transform left applied would leave content shifted off its grid. */
    const shifted = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal, .stagger > *')]
        .filter((el) => {
          const t = getComputedStyle(el).transform;
          return t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)';
        }).length);
    check(`reduced motion: no leftover transforms on ${path}`, shifted, 0);
  }

  /* The hero must not auto-advance for these users. */
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const firstSlide = await page.locator('.hero-slide.is-on').first().getAttribute('data-slide');
  await page.waitForTimeout(7200);            // longer than one slide interval
  const stillFirst = await page.locator('.hero-slide.is-on').count();
  check('reduced motion: hero still shows exactly one slide', stillFirst, 1);
  assert('reduced motion: hero did not auto-advance',
    (await page.locator('.hero-slide').first().getAttribute('class')).includes('is-on'),
    `first slide attr ${firstSlide}`);

  await ctx.close();
}

/* ===============================================================
   2. FULL-MOTION BEHAVIOUR
   =============================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  /* --- hero carousel actually advances, and drives one interval --- */
  const interval = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--hero-interval').trim());
  assert('hero interval is published to CSS as one source of truth',
    /^\d+ms$/.test(interval), `got "${interval}"`);

  const before = await page.evaluate(() =>
    [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-on')));
  await page.waitForTimeout(parseInt(interval, 10) + 1400);
  const after = await page.evaluate(() =>
    [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-on')));
  assert('hero advances on its own', after !== before, `stayed on slide ${before}`);

  /* Inactive slides must be out of the a11y tree and the tab order — they are
     cross-faded, not display:none, so this is not automatic. */
  const leaked = await page.evaluate(() =>
    [...document.querySelectorAll('.hero-slide:not(.is-on)')]
      .filter((s) => !s.hasAttribute('inert')).length);
  check('inactive hero slides are inert', leaked, 0);

  /* --- ticker is duplicated for a seamless loop --- */
  check('ticker duplicated once', await page.locator('.ticker-group').count(), 2);
  check('ticker copy is hidden from assistive tech',
    await page.locator('.ticker-group[aria-hidden="true"]').count(), 1);

  /* --- grain rule generated --- */
  assert('grain rule drew its strokes',
    (await page.locator('.grain-rule path').count()) >= 4);

  /* --- provenance map --- */
  await page.goto(`${base}/makers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const makerCount = new Set(cat.PRODUCTS.map((p) => p.maker)).size;
  check('map draws one pin per workshop',
    await page.locator('.map-pin').count(), makerCount);
  check('every pin has a hit target bigger than its dot',
    await page.locator('.map-pin circle.hit').count(), makerCount);
  assert('country outline does not intercept pointer events',
    await page.evaluate(() =>
      getComputedStyle(document.querySelector('.map-outline')).pointerEvents === 'none'));

  /* Clicking a pin must actually change the panel. */
  await page.locator('[data-pin="cederberg"] .hit').click({ force: true });
  await page.waitForTimeout(400);
  check('clicking a pin swaps the panel',
    (await page.locator('[data-map-panel] h3').textContent()).trim(),
    cat.MAKERS.cederberg.name);

  /* ...and the panel's link must land on a pre-filtered shop. */
  const href = await page.locator('[data-map-panel] a').getAttribute('href');
  check('panel links to that workshop', href, 'shop?maker=cederberg');
  await page.goto(`${base}/${href}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  check('map hand-off lands on a pre-filtered shop',
    await page.locator('[data-shop-grid] .card').count(),
    cat.PRODUCTS.filter((p) => p.maker === 'cederberg').length);

  /* --- quick view --- */
  await page.goto(`${base}/shop`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('[data-quick="tray"]').first().click({ force: true });
  await page.waitForTimeout(500);
  assert('quick view opens as a modal dialog',
    await page.evaluate(() => !!document.querySelector('dialog.qv[open]')));
  check('quick view shows the product asked for',
    (await page.locator('dialog.qv h2').textContent()).trim(), cat.byId('tray').name);

  /* Escape must close it — that is the reason for using <dialog>. */
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  assert('Escape closes quick view',
    await page.evaluate(() => !document.querySelector('dialog.qv[open]')));

  /* --- add to basket from a card still works with motion in the way --- */
  await page.locator('[data-add="tray"]').first().click({ force: true });
  await page.waitForTimeout(900);
  check('adding from a card updates the badge',
    (await page.locator('[data-cart-count]').first().textContent()).trim(), '1');
  assert('the flying chip cleans itself up',
    await page.evaluate(() => document.querySelectorAll('.fly-chip').length === 0));

  check('no console errors with motion running', errors.length, 0);
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log(`      ${e}`));
  await ctx.close();
}

await browser.close();
server.close();

console.log(`\n${failures === 0 ? 'ALL MOTION CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures ? 1 : 0);
