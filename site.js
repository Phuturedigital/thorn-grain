/* ============================================================
   THORN & GRAIN — store behaviour
   One script for all eight pages. Each feature is guarded by the
   presence of its own DOM hook, so a page only runs the code it
   has markup for. No router, no build step.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- storage ----------------
     The basket stores { id, qty } ONLY — never a price. A markdown that
     expires mid-session must not leave stale money in the basket, so every
     line total is recomputed from effective() at render time. */
  const KEY_CART = 'tg.cart.v1';
  const KEY_WISH = 'tg.wish.v1';

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      /* Private-mode Safari throws on getItem. A store that white-screens
         because it cannot remember a basket is worse than one that forgets. */
      return fallback;
    }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* non-fatal */ }
  };

  let cart = read(KEY_CART, []);
  let wish = read(KEY_WISH, []);

  const cartQty = () => cart.reduce((n, line) => n + line.qty, 0);

  function addToCart(id, qty) {
    const product = byId(id);
    if (!product) return;
    const line = cart.find((l) => l.id === id);
    if (line) line.qty = Math.min(99, line.qty + qty);
    else cart.push({ id, qty: Math.min(99, Math.max(1, qty)) });
    write(KEY_CART, cart);
    paintCounts();
    toast(`${product.name} added to your basket`);
  }

  function setQty(id, qty) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    if (qty <= 0) cart = cart.filter((l) => l.id !== id);
    else line.qty = Math.min(99, qty);
    write(KEY_CART, cart);
    paintCounts();
  }

  function toggleWish(id) {
    const on = wish.includes(id);
    wish = on ? wish.filter((w) => w !== id) : wish.concat(id);
    write(KEY_WISH, wish);
    paintCounts();
    const product = byId(id);
    toast(on ? `${product.name} removed from your list` : `${product.name} saved to your list`);
    return !on;
  }

  function paintCounts() {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = cartQty();
      el.hidden = cartQty() === 0;
    });
    document.querySelectorAll('[data-wish-count]').forEach((el) => {
      el.textContent = wish.length;
      el.hidden = wish.length === 0;
    });
    document.querySelectorAll('[data-wish-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(wish.includes(btn.dataset.wishToggle)));
    });
  }

  /* ---------------- toast ---------------- */
  let toastEl = null;
  let toastTimer = null;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  /* ---------------- small helpers ----------------
     Escaping policy for everything built with innerHTML below: every
     interpolated value passes through esc(). The catalogue is static, authored
     content rather than user input, but the shop reads `q`, `cat` and `room`
     off the query string, and treating catalogue strings as trusted while
     treating URL strings as hostile is exactly the distinction that rots. So:
     nothing reaches innerHTML unescaped, and the two places URL input is used
     go nowhere near it — `q` is compared, and `cat` goes through CSS.escape()
     into a selector. */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>';

  function stars(rating) {
    const filled = Math.round(rating);
    let out = '<span class="stars" aria-hidden="true">';
    for (let i = 1; i <= 5; i++) out += STAR.replace('<svg', i <= filled ? '<svg' : '<svg class="off"');
    return `${out}</span>`;
  }

  /* Countdown text. Days are shown whole; below a day it drops to h/m/s so the
     strip does not read "0d" for the last stretch, which looks broken. */
  function countdownText(ms) {
    if (ms <= 0) return null;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return d > 0
      ? `${d}d : ${pad(h)}h : ${pad(m)}m : ${pad(sec)}s`
      : `${pad(h)}h : ${pad(m)}m : ${pad(sec)}s`;
  }

  /* ---------------- product card ---------------- */
  function card(product) {
    const view = effective(product);
    const maker = makerOf(product);
    const badges = [];
    if (view.off > 0) badges.push(`<span class="badge badge-sale">-${view.off}%</span>`);
    if (product.tags.includes('hot')) badges.push('<span class="badge">Hot</span>');
    if (product.tags.includes('new')) badges.push('<span class="badge badge-new">New</span>');

    const href = `product?id=${encodeURIComponent(product.id)}`;
    const priceHtml = view.was
      ? `<span class="was">${money(view.was)}</span><span class="now">${money(view.price)}</span>`
      : `<span class="now">${money(view.price)}</span>`;

    return `
      <article class="card" data-product="${esc(product.id)}">
        <div class="card-media">
          <a href="${href}">
            <img src="${esc(product.image)}" alt="${esc(product.name)} by ${esc(maker.name)}"
                 width="760" height="760" loading="lazy" decoding="async">
          </a>
          ${badges.length ? `<div class="badges">${badges.join('')}</div>` : ''}
          ${product.deal ? `<div class="timer" data-deal="${esc(product.id)}" hidden></div>` : ''}
          <div class="card-acts">
            <button type="button" data-wish-toggle="${esc(product.id)}" aria-pressed="false"
                    title="Save to your list" aria-label="Save ${esc(product.name)} to your list">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>
            </button>
            <button type="button" data-add="${esc(product.id)}"
                    title="Add to basket" aria-label="Add ${esc(product.name)} to basket">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6h15l-1.7 9.4a2 2 0 0 1-2 1.6H9.5a2 2 0 0 1-2-1.6L5.6 3.9A1 1 0 0 0 4.6 3H2"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>
            </button>
          </div>
        </div>
        <div class="card-rate">${stars(product.rating)}<span>(${product.reviews} ${product.reviews === 1 ? 'review' : 'reviews'})</span></div>
        <h3 class="card-name"><a href="${href}">${esc(product.name)}</a></h3>
        <p class="card-maker">${esc(maker.name)} &middot; ${esc(maker.town)}</p>
        <p class="price">${priceHtml}</p>
      </article>`;
  }

  const renderGrid = (el, list) => {
    el.innerHTML = list.length
      ? list.map(card).join('')
      : '<div class="empty"><b>Nothing matches that</b><p>Try clearing a filter, or browse the full range.</p></div>';
    paintCounts();
    tickDeals();
  };

  /* ---------------- countdown ticking ----------------
     Every visible strip re-reads effective() each second, so the moment a deal
     expires the badge, the price and the strip change together rather than
     drifting apart. */
  function tickDeals() {
    document.querySelectorAll('[data-deal]').forEach((el) => {
      const product = byId(el.dataset.deal);
      if (!product || !product.deal) return;
      const left = new Date(product.deal).getTime() - Date.now();
      const text = countdownText(left);
      const state = resolvedDeal(product);

      if (text && state.live) {
        el.hidden = false;
        el.classList.remove('is-done');
        el.innerHTML = `<span class="lab">Ends in</span> ${text}`;
      } else if (state.label) {
        el.hidden = false;
        el.classList.add('is-done');
        el.textContent = state.label;
      } else {
        /* No live markdown and nothing authored to say about it: show nothing
           rather than invent urgency. */
        el.hidden = true;
      }
    });
  }
  setInterval(tickDeals, 1000);

  /* ---------------- counts stated in copy ----------------
     The homepage says how many pieces and how many workshops there are. Typing
     those numbers into markup is how a concept site quietly becomes false the
     first time the catalogue changes — so they are filled from the catalogue
     itself, and tools/smoke.mjs asserts the rendered figures against it. */
  function counts() {
    const makerCount = new Set(PRODUCTS.map((p) => p.maker)).size;
    document.querySelectorAll('[data-count-products]').forEach((el) => { el.textContent = PRODUCTS.length; });
    document.querySelectorAll('[data-count-makers]').forEach((el) => { el.textContent = makerCount; });
  }

  /* ---------------- header chrome ---------------- */
  function chrome() {
    const burger = document.querySelector('[data-burger]');
    const nav = document.querySelector('[data-nav]');
    if (burger && nav) {
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
      });
    }

    document.querySelectorAll('[data-search]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = form.querySelector('input').value.trim();
        const cat = form.querySelector('select') ? form.querySelector('select').value : '';
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (cat) params.set('cat', cat);
        window.location.href = `shop${params.toString() ? `?${params}` : ''}`;
      });
    });

    /* Delegated so it also covers cards injected after load. */
    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { addToCart(add.dataset.add, 1); return; }
      const heart = e.target.closest('[data-wish-toggle]');
      if (heart) { toggleWish(heart.dataset.wishToggle); }
    });

    paintCounts();
  }

  /* ---------------- home ---------------- */
  function home() {
    /* hero carousel */
    const slides = [...document.querySelectorAll('[data-slide]')];
    const dots = [...document.querySelectorAll('[data-dot]')];
    const numEl = document.querySelector('[data-hero-num]');
    if (slides.length) {
      let at = 0;
      let timer = null;
      const show = (i) => {
        at = (i + slides.length) % slides.length;
        slides.forEach((s, n) => s.classList.toggle('is-on', n === at));
        dots.forEach((d, n) => d.setAttribute('aria-current', String(n === at)));
        if (numEl) numEl.textContent = String(at + 1).padStart(2, '0');
      };
      dots.forEach((d, n) => d.addEventListener('click', () => { show(n); restart(); }));

      /* Auto-advance is suppressed for anyone who asked for reduced motion —
         a hero that changes under you is motion, even without a transition. */
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const restart = () => {
        clearInterval(timer);
        if (!still) timer = setInterval(() => show(at + 1), 6000);
      };
      show(0);
      restart();
    }

    /* hot-products tabs */
    const grid = document.querySelector('[data-hot-grid]');
    const tabs = [...document.querySelectorAll('[data-tab]')];
    if (grid && tabs.length) {
      const paint = (tag) => {
        const list = PRODUCTS.filter((p) => p.tags.includes(tag)).slice(0, 8);
        renderGrid(grid, list);
      };
      tabs.forEach((t) => t.addEventListener('click', () => {
        tabs.forEach((o) => o.setAttribute('aria-selected', String(o === t)));
        paint(t.dataset.tab);
      }));
      paint(tabs[0].dataset.tab);
    }
  }

  /* ---------------- shop ---------------- */
  function shop() {
    const grid = document.querySelector('[data-shop-grid]');
    if (!grid) return;

    const params = new URLSearchParams(window.location.search);
    const countEl = document.querySelector('[data-shop-count]');
    const sortEl = document.querySelector('[data-sort]');
    const qEl = document.querySelector('[data-shop-q]');

    /* Pre-tick whatever the URL asked for, so a link from the nav, the search
       box or a room banner all land on a shop page that agrees with itself. */
    const wantCat = params.get('cat');
    const wantRoom = params.get('room');
    if (wantCat) {
      const box = document.querySelector(`[data-filter-cat][value="${CSS.escape(wantCat)}"]`);
      if (box) box.checked = true;
    }

    function apply() {
      const cats = [...document.querySelectorAll('[data-filter-cat]:checked')].map((b) => b.value);
      const makers = [...document.querySelectorAll('[data-filter-maker]:checked')].map((b) => b.value);
      const bands = [...document.querySelectorAll('[data-filter-price]:checked')].map((b) => b.value);
      const q = (qEl && qEl.value.trim().toLowerCase()) || (params.get('q') || '').toLowerCase();

      let list = PRODUCTS.filter((p) => {
        if (cats.length && !cats.includes(p.cat)) return false;
        if (makers.length && !makers.includes(p.maker)) return false;
        if (wantRoom && !p.rooms.includes(wantRoom)) return false;
        if (bands.length) {
          const price = effective(p).price;
          const ok = bands.some((b) => {
            const [lo, hi] = b.split('-').map(Number);
            return price >= lo && (Number.isNaN(hi) || price <= hi);
          });
          if (!ok) return false;
        }
        if (q) {
          const hay = `${p.name} ${p.cat} ${p.blurb} ${p.material} ${makerOf(p).name}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      const sort = sortEl ? sortEl.value : 'featured';
      const price = (p) => effective(p).price;
      if (sort === 'low') list = [...list].sort((a, b) => price(a) - price(b));
      if (sort === 'high') list = [...list].sort((a, b) => price(b) - price(a));
      if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));

      if (countEl) countEl.textContent = `${list.length} of ${PRODUCTS.length} pieces`;
      renderGrid(grid, list);
    }

    document.querySelectorAll('[data-filter-cat],[data-filter-maker],[data-filter-price]')
      .forEach((b) => b.addEventListener('change', apply));
    if (sortEl) sortEl.addEventListener('change', apply);
    if (qEl) {
      qEl.value = params.get('q') || '';
      qEl.addEventListener('input', apply);
    }

    const clear = document.querySelector('[data-clear]');
    if (clear) {
      clear.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-cat],[data-filter-maker],[data-filter-price]')
          .forEach((b) => { b.checked = false; });
        if (qEl) qEl.value = '';
        apply();
      });
    }

    apply();
  }

  /* ---------------- product detail ---------------- */
  function detail() {
    const mount = document.querySelector('[data-pdp]');
    if (!mount) return;

    const id = new URLSearchParams(window.location.search).get('id');
    const product = byId(id) || PRODUCTS[0];
    const view = effective(product);
    const maker = makerOf(product);

    document.title = `${product.name} · Thorn & Grain · Concept store by Phuture Digital`;
    const crumb = document.querySelector('[data-crumb-name]');
    if (crumb) crumb.textContent = product.name;

    mount.innerHTML = `
      <div class="pdp-media">
        <img src="${esc(product.image)}" alt="${esc(product.name)} by ${esc(maker.name)}"
             width="760" height="760" decoding="async">
      </div>
      <div>
        <p class="card-rate">${stars(product.rating)}<span>(${product.reviews} ${product.reviews === 1 ? 'review' : 'reviews'})</span></p>
        <h1>${esc(product.name)}</h1>
        <p class="card-maker">Built by ${esc(maker.name)} &middot; ${esc(maker.town)}</p>
        <p class="pdp-price">
          <span class="now">${money(view.price)}</span>
          ${view.was ? `<span class="was">${money(view.was)}</span>` : ''}
        </p>
        <p class="pdp-vat">VAT included. Delivery calculated at checkout.</p>
        ${product.deal ? `<p class="timer" data-deal="${esc(product.id)}" style="position:static;margin-top:14px" hidden></p>` : ''}
        <p class="pdp-desc">${esc(product.blurb)}</p>
        <div class="pdp-buy">
          <span class="qty">
            <button type="button" data-step="-1" aria-label="Decrease quantity">&minus;</button>
            <input type="text" inputmode="numeric" value="1" data-qty aria-label="Quantity">
            <button type="button" data-step="1" aria-label="Increase quantity">+</button>
          </span>
          <button type="button" class="btn" data-buy>Add to basket</button>
          <button type="button" class="btn btn-ghost" data-wish-toggle="${esc(product.id)}" aria-pressed="false">Save</button>
        </div>
        <dl class="spec">
          <div><dt>Materials</dt><dd>${esc(product.material)}</dd></div>
          <div><dt>Dimensions</dt><dd>${esc(product.size)}</dd></div>
          <div><dt>Lead time</dt><dd>${esc(product.lead)}</dd></div>
          <div><dt>Workshop</dt><dd>${esc(maker.name)}, est. ${product.since || maker.since}</dd></div>
        </dl>
      </div>`;

    const qtyEl = mount.querySelector('[data-qty]');
    mount.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const next = Math.max(1, Math.min(99, (parseInt(qtyEl.value, 10) || 1) + Number(b.dataset.step)));
      qtyEl.value = next;
    }));
    mount.querySelector('[data-buy]').addEventListener('click', () => {
      addToCart(product.id, Math.max(1, parseInt(qtyEl.value, 10) || 1));
    });

    const related = document.querySelector('[data-related]');
    if (related) {
      renderGrid(related, PRODUCTS.filter((p) => p.cat === product.cat && p.id !== product.id).slice(0, 4));
    }
    paintCounts();
    tickDeals();
  }

  /* ---------------- cart ---------------- */
  function basket() {
    const mount = document.querySelector('[data-cart]');
    if (!mount) return;
    const sumMount = document.querySelector('[data-sum]');

    function paint() {
      if (!cart.length) {
        mount.innerHTML = '<div class="empty"><b>Your basket is empty</b><p>Nothing saved yet — the range is through here.</p><p style="margin-top:16px"><a class="btn" href="shop">Browse the range</a></p></div>';
        if (sumMount) sumMount.hidden = true;
        return;
      }
      if (sumMount) sumMount.hidden = false;

      mount.innerHTML = cart.map((line) => {
        const product = byId(line.id);
        if (!product) return '';
        const view = effective(product);
        const maker = makerOf(product);
        return `
          <div class="cart-row">
            <img src="${esc(product.image)}" alt="${esc(product.name)}" width="88" height="88" loading="lazy">
            <div>
              <p class="nm"><a href="product?id=${esc(product.id)}">${esc(product.name)}</a></p>
              <p class="mk">${esc(maker.name)} &middot; ${esc(product.lead)}</p>
              <button type="button" class="rm" data-remove="${esc(product.id)}">Remove</button>
            </div>
            <span class="qty">
              <button type="button" data-line-step="-1" data-line="${esc(product.id)}" aria-label="Decrease quantity">&minus;</button>
              <input type="text" inputmode="numeric" value="${line.qty}" data-line-qty="${esc(product.id)}" aria-label="Quantity for ${esc(product.name)}">
              <button type="button" data-line-step="1" data-line="${esc(product.id)}" aria-label="Increase quantity">+</button>
            </span>
            <strong>${money(view.price * line.qty)}</strong>
          </div>`;
      }).join('');

      const subtotal = cart.reduce((sum, line) => {
        const product = byId(line.id);
        return product ? sum + effective(product).price * line.qty : sum;
      }, 0);

      /* Delivery is a flat national rate above a threshold. Both numbers are
         stated on the page itself, so the arithmetic here and the copy there
         are pinned together by tools/smoke.mjs. */
      const FREE_OVER = 10000;
      const FLAT = 750;
      const delivery = subtotal >= FREE_OVER || subtotal === 0 ? 0 : FLAT;

      if (sumMount) {
        sumMount.querySelector('[data-subtotal]').textContent = money(subtotal);
        sumMount.querySelector('[data-delivery]').textContent = delivery === 0 ? 'Free' : money(delivery);
        sumMount.querySelector('[data-total]').textContent = money(subtotal + delivery);
      }
      paintCounts();
    }

    mount.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove]');
      if (rm) { setQty(rm.dataset.remove, 0); paint(); return; }
      const step = e.target.closest('[data-line-step]');
      if (step) {
        const id = step.dataset.line;
        const line = cart.find((l) => l.id === id);
        setQty(id, (line ? line.qty : 0) + Number(step.dataset.lineStep));
        paint();
      }
    });

    mount.addEventListener('change', (e) => {
      const box = e.target.closest('[data-line-qty]');
      if (!box) return;
      setQty(box.dataset.lineQty, parseInt(box.value, 10) || 0);
      paint();
    });

    paint();
  }

  /* ---------------- rooms ---------------- */
  function rooms() {
    const mount = document.querySelector('[data-room-grid]');
    if (!mount) return;
    const room = new URLSearchParams(window.location.search).get('room');
    const list = room ? PRODUCTS.filter((p) => p.rooms.includes(room)) : PRODUCTS;
    const title = document.querySelector('[data-room-title]');
    if (title && room) {
      const found = ROOMS.find((r) => r.id === room);
      if (found) title.textContent = found.label;
    }
    renderGrid(mount, list);
  }

  /* ---------------- makers ---------------- */
  function makers() {
    const mount = document.querySelector('[data-maker-list]');
    if (!mount) return;
    mount.innerHTML = Object.entries(MAKERS).map(([key, m]) => {
      const n = PRODUCTS.filter((p) => p.maker === key).length;
      return `<div class="maker-row"><b>${esc(m.name)}</b><span>${esc(m.town)} &middot; since ${m.since} &middot; ${n} ${n === 1 ? 'piece' : 'pieces'}</span></div>`;
    }).join('');
  }

  /* ---------------- forms with no backend ---------------- */
  function forms() {
    document.querySelectorAll('[data-demo-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const note = form.querySelector('[data-form-note]');
        if (note) {
          note.hidden = false;
          note.textContent = 'This concept store has no backend, so nothing was sent or stored. On a live build this would reach the shop.';
        }
      });
    });
  }

  /* ---------------- go ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    counts();
    chrome();
    home();
    shop();
    detail();
    basket();
    rooms();
    makers();
    forms();
  });
})();
