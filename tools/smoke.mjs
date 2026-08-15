/* Thorn & Grain — smoke test.
 *
 * This is not a rendering test. It exists to stop the site quietly becoming
 * FALSE: the pages state specific figures (how many pieces, how many
 * workshops, what delivery costs, what a basket comes to) and this drives a
 * real browser to check that each of those figures still matches the catalogue
 * and the cart arithmetic it claims to describe.
 *
 * Edit a price in catalogue.js and the test goes red, instead of the home page
 * quietly starting to lie. That is the whole point of it.
 *
 * Usage:  node tools/smoke.mjs
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

const PORT = 4455;
const server = await serve(PORT);
const base = `http://localhost:${PORT}`;

let failures = 0;
const check = (name, actual, expected) => {
  const ok = String(actual) === String(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        expected ${JSON.stringify(String(expected))}\n        actual   ${JSON.stringify(String(actual))}`}`);
};
const assert = (name, condition, detail = '') => {
  if (!condition) failures++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : `  ${detail}`}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const settle = () => page.waitForTimeout(700);

/* ---------------------------------------------------------------
   1. The figures the home page states about itself
   --------------------------------------------------------------- */
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await settle();

const makerCount = new Set(cat.PRODUCTS.map((p) => p.maker)).size;
check('home states the real product count',
  await page.locator('[data-count-products]').first().textContent(), cat.PRODUCTS.length);
check('home states the real workshop count',
  await page.locator('[data-count-makers]').first().textContent(), makerCount);

/* The delivery promise is made in prose on the home page and executed as
   arithmetic in site.js. Pin the prose to the numbers. */
const trust = await page.locator('.trust').innerText();
assert('home quotes the flat delivery rate (R750)', /R\s?750/.test(trust), trust.slice(0, 120));
assert('home quotes the free-delivery threshold (R10 000)', /R\s?10 ?000/.test(trust), trust.slice(0, 120));

/* ---------------------------------------------------------------
   2. No invented urgency while dealState() is unimplemented

   Three products carry a `deal` deadline. Until dealState() is written, the
   site must fall back to "the markdown is over" — full price, no discount
   badge, no countdown. A concept store inventing a fake sale is exactly the
   failure this suite is here to prevent.
   --------------------------------------------------------------- */
const dealProducts = cat.PRODUCTS.filter((p) => p.deal);
assert('catalogue actually has deal products to test', dealProducts.length > 0);

const authored = cat.dealState(dealProducts[0], new Date());
for (const product of dealProducts) {
  await page.goto(`${base}/product?id=${product.id}`, { waitUntil: 'networkidle' });
  await settle();
  const shown = await page.locator('.pdp-price .now').textContent();
  const expectedPrice = authored ? cat.money(cat.effective(product).price) : cat.money(product.was);
  check(`${product.id}: price shown matches effective() (${authored ? 'authored dealState' : 'safe fallback'})`,
    shown.trim(), expectedPrice);

  if (!authored) {
    const timerVisible = await page.locator(`[data-deal="${product.id}"]`).isVisible();
    assert(`${product.id}: no countdown shown while dealState() is unimplemented`, !timerVisible);
  }
}

/* ---------------------------------------------------------------
   3. Cart arithmetic — the exact figures a shopper would see
   --------------------------------------------------------------- */
const tray = cat.byId('tray');       // R3 200, no markdown
const trayPrice = cat.effective(tray).price;

await page.goto(`${base}/product?id=tray`, { waitUntil: 'networkidle' });
await settle();
await page.locator('[data-step="1"]').click();          // qty 1 -> 2
await page.locator('[data-buy]').click();
await settle();

check('basket badge counts units, not lines',
  await page.locator('[data-cart-count]').first().textContent(), '2');

await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
await settle();

const FLAT = 750;
const FREE_OVER = 10000;
const sub1 = trayPrice * 2;
check('cart subtotal = unit price x qty',
  (await page.locator('[data-subtotal]').textContent()).trim(), cat.money(sub1));
check('cart charges flat delivery below the threshold',
  (await page.locator('[data-delivery]').textContent()).trim(), cat.money(FLAT));
check('cart total = subtotal + delivery',
  (await page.locator('[data-total]').textContent()).trim(), cat.money(sub1 + FLAT));
assert('subtotal really is below the free-delivery threshold', sub1 < FREE_OVER, `${sub1}`);

/* Add a big-ticket piece to cross the free-delivery threshold. */
const bekker = cat.byId('bekker');
const bekkerPrice = cat.effective(bekker).price;
await page.goto(`${base}/product?id=bekker`, { waitUntil: 'networkidle' });
await settle();
await page.locator('[data-buy]').click();
await settle();
await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
await settle();

const sub2 = sub1 + bekkerPrice;
assert('subtotal now crosses the free-delivery threshold', sub2 >= FREE_OVER, `${sub2}`);
check('cart subtotal across two lines',
  (await page.locator('[data-subtotal]').textContent()).trim(), cat.money(sub2));
check('delivery goes free above the threshold',
  (await page.locator('[data-delivery]').textContent()).trim(), 'Free');
check('total equals subtotal when delivery is free',
  (await page.locator('[data-total]').textContent()).trim(), cat.money(sub2));

/* The cart page repeats the delivery promise in prose. Pin it too. */
const sumNote = await page.locator('.sum small').innerText();
assert('cart prose quotes the same flat rate', /R\s?750/.test(sumNote), sumNote.slice(0, 120));
assert('cart prose quotes the same threshold', /R\s?10 ?000/.test(sumNote), sumNote.slice(0, 120));

/* Removing everything must empty the basket, not leave a stale total. */
await page.locator('[data-remove]').first().click();
await settle();
await page.locator('[data-remove]').first().click();
await settle();
assert('emptied basket hides the summary', !(await page.locator('[data-sum]').isVisible()));

/* ---------------------------------------------------------------
   4. Shop filtering agrees with the catalogue
   --------------------------------------------------------------- */
await page.goto(`${base}/shop`, { waitUntil: 'networkidle' });
await settle();
check('shop lists the whole catalogue by default',
  await page.locator('[data-shop-grid] .card').count(), cat.PRODUCTS.length);

await page.locator('[data-filter-cat][value="lighting"]').check();
await settle();
const lighting = cat.PRODUCTS.filter((p) => p.cat === 'lighting').length;
check('category filter matches the catalogue',
  await page.locator('[data-shop-grid] .card').count(), lighting);

await page.locator('[data-filter-cat][value="lighting"]').uncheck();
await page.locator('[data-filter-maker][value="cederberg"]').check();
await settle();
const cederberg = cat.PRODUCTS.filter((p) => p.maker === 'cederberg').length;
check('workshop filter matches the catalogue',
  await page.locator('[data-shop-grid] .card').count(), cederberg);

/* A deep link from the nav must arrive pre-filtered, not showing everything. */
await page.goto(`${base}/shop?cat=seating`, { waitUntil: 'networkidle' });
await settle();
const seating = cat.PRODUCTS.filter((p) => p.cat === 'seating').length;
check('shop?cat= deep link arrives pre-filtered',
  await page.locator('[data-shop-grid] .card').count(), seating);

/* ---------------------------------------------------------------
   5. Nothing claims to take money
   --------------------------------------------------------------- */
await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
await settle();
await page.goto(`${base}/contact`, { waitUntil: 'networkidle' });
await settle();
await page.locator('#c-name').fill('Test');
await page.locator('#c-email').fill('test@example.co.za');
await page.locator('#c-msg').fill('Testing');
await page.locator('form[data-demo-form] button[type="submit"]').click();
await settle();
const formNote = await page.locator('[data-form-note]').innerText();
assert('contact form admits it sends nothing', /nothing was sent|no backend/i.test(formNote), formNote);

await browser.close();
server.close();

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures ? 1 : 0);
