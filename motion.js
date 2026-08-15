/* ============================================================
   THORN & GRAIN — motion + enrichment layer
   Loaded after site.js. Everything here is ADDITIVE: it listens
   for events site.js dispatches rather than being called by it,
   so deleting motion.css + motion.js leaves a working store.

   🚨 Reduced motion is honoured in two different ways, and the
   difference matters:
     • Anything CSS drives is handled by the media query in
       motion.css, which forces the FINISHED state (never blank).
     • Anything JS drives — the counters, the flying chip, the
       observer — needs its OWN gate here, because a media query
       cannot stop a setInterval. A sibling concept in this network
       shipped an animated counter that ignored the setting for
       exactly this reason.
   ============================================================ */
(function () {
  'use strict';

  const STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* ---------------------------------------------------------------
     1. SCROLL REVEAL
     One observer for every kind of on-scroll entrance. Elements
     unobserve after firing — a reveal that replays on scroll-up
     reads as a glitch, not a flourish.
     --------------------------------------------------------------- */
  function reveal() {
    const targets = document.querySelectorAll('.reveal, .grain-rule, .map-wrap');
    if (!targets.length) return;

    if (STILL || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
      /* threshold is a fraction of the ELEMENT, not the viewport — a tall
         band would never reach 0.25, so this stays deliberately low. */
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach((el) => io.observe(el));
  }

  /* Give each child of a [data-reveal-group] an increasing delay, so a row of
     cells arrives as a sweep instead of a block. */
  function revealGroups() {
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      [...group.children].forEach((child, i) => {
        child.classList.add('reveal');
        child.style.setProperty('--d', `${Math.min(i, 8) * 80}ms`);
      });
    });
  }

  /* ---------------------------------------------------------------
     2. THE GRAIN RULE — this site's signature motif
     Four strokes that draw themselves like a plane pulling a shaving
     off a board. Generated rather than authored so the wave is
     different at every divider, which is what stops four identical
     SVGs reading as a repeated graphic.
     --------------------------------------------------------------- */
  function grainRules() {
    document.querySelectorAll('[data-grain]').forEach((host, index) => {
      const W = 1200;
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} 34`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('grain-rule');

      /* A deterministic wobble: seeded off the divider's index so it is
         stable between renders but different between dividers. */
      const seed = (index + 1) * 7.3;
      for (let line = 0; line < 4; line++) {
        const y = 8 + line * 6;
        const amp = 2.4 + (line % 2) * 1.6;
        let d = `M0 ${y}`;
        for (let x = 60; x <= W; x += 60) {
          const wob = Math.sin((x / W) * Math.PI * 3 + seed + line) * amp;
          d += ` Q ${x - 30} ${y + wob * 1.5}, ${x} ${y + wob * 0.4}`;
        }
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.style.setProperty('--len', W + 120);
        path.style.setProperty('--n', line);
        svg.appendChild(path);
      }
      host.replaceChildren(svg);
      /* The observer watches .grain-rule, so hand it the generated node. */
      if (STILL) svg.classList.add('is-in');
    });
  }

  /* ---------------------------------------------------------------
     3. COUNT-UP
     Needs its own reduced-motion gate: a media query cannot stop a
     requestAnimationFrame loop.
     --------------------------------------------------------------- */
  function counters() {
    const targets = [...document.querySelectorAll('[data-count-products], [data-count-makers]')];
    if (!targets.length || STILL || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const end = parseInt(el.textContent, 10);
        if (!Number.isFinite(end) || end <= 0) return;   // site.js has not filled it yet

        const DURATION = 900;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / DURATION);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(end * eased);
          if (t < 1) requestAnimationFrame(step);
          else el.textContent = end;      // land exactly on the true figure
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });

    targets.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------
     4. STICKY HEADER
     --------------------------------------------------------------- */
  function stickyHeader() {
    const head = document.querySelector('.head');
    if (!head) return;
    const onScroll = () => head.classList.toggle('is-stuck', window.scrollY > 14);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------
     5. ADD-TO-BASKET: the chip that flies to the cart
     Start and end points are only known at click time, so this is
     WAAPI rather than CSS. Fully skipped under reduced motion — the
     basket count and the toast already report the outcome, so
     nothing is lost but the flourish.
     --------------------------------------------------------------- */
  function flyToBasket() {
    document.addEventListener('tg:add', (e) => {
      const badge = document.querySelector('[data-cart-count]');
      if (badge) {
        badge.classList.remove('is-pop');
        void badge.offsetWidth;              // force reflow so the animation restarts
        badge.classList.add('is-pop');
      }

      const target = document.querySelector('a[href="cart"]');
      if (target) {
        target.classList.remove('is-hit');
        void target.offsetWidth;
        target.classList.add('is-hit');
      }
      if (STILL || !target || !e.detail.from) return;

      /* Prefer the product image nearest the click; fall back to the button. */
      const card = e.detail.from.closest('.card, .pdp, main');
      const img = card && card.querySelector('img');
      if (!img) return;

      const from = img.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (!from.width || !to.width) return;

      const chip = document.createElement('img');
      chip.src = img.currentSrc || img.src;
      chip.alt = '';
      chip.className = 'fly-chip';
      chip.style.left = `${from.left}px`;
      chip.style.top = `${from.top}px`;
      chip.style.width = `${from.width}px`;
      chip.style.height = `${from.height}px`;
      document.body.appendChild(chip);

      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);

      chip.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 0.95 },
          { transform: `translate(${dx * 0.55}px, ${dy * 0.4 - 60}px) scale(.5)`, opacity: 0.9, offset: 0.55 },
          { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0 },
        ],
        { duration: 760, easing: 'cubic-bezier(.5,.02,.62,.6)' },
      ).onfinish = () => chip.remove();
    });
  }

  /* ---------------------------------------------------------------
     6. QUICK VIEW
     A native <dialog>, so focus trapping, Escape and the backdrop
     are the platform's job rather than ours.
     --------------------------------------------------------------- */
  function quickView() {
    let dialog = null;

    const build = () => {
      dialog = document.createElement('dialog');
      dialog.className = 'qv';
      document.body.appendChild(dialog);
      dialog.addEventListener('click', (e) => {
        /* Clicking the backdrop closes: the dialog element itself fills the
           viewport, so a click landing ON it (not its children) is a backdrop
           click. */
        if (e.target === dialog) dialog.close();
        if (e.target.closest('[data-qv-close]')) dialog.close();
      });
      return dialog;
    };

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-quick]');
      if (!trigger) return;
      e.preventDefault();

      const product = byId(trigger.dataset.quick);
      if (!product) return;
      const view = effective(product);
      const maker = makerOf(product);
      if (!dialog) build();

      dialog.innerHTML = `
        <button class="qv-close" type="button" data-qv-close aria-label="Close quick view">&times;</button>
        <div class="qv-grid">
          <img src="${esc(product.image)}" alt="${esc(product.name)} by ${esc(maker.name)}">
          <div class="qv-body">
            <p class="card-maker">${esc(maker.name)} &middot; ${esc(maker.town)}</p>
            <h2>${esc(product.name)}</h2>
            <p class="pdp-price" style="margin:10px 0 4px">
              <span class="now">${money(view.price)}</span>
              ${view.was ? `<span class="was">${money(view.was)}</span>` : ''}
            </p>
            <p class="pdp-vat">VAT included &middot; ${esc(product.lead)}</p>
            <p class="pdp-desc" style="margin:16px 0">${esc(product.blurb)}</p>
            <div class="pdp-buy" style="margin:0 0 14px">
              <button type="button" class="btn" data-add="${esc(product.id)}">Add to basket</button>
              <a class="btn btn-ghost" href="product?id=${esc(product.id)}">Full details</a>
            </div>
            <dl class="spec" style="margin-top:6px">
              <div><dt>Materials</dt><dd>${esc(product.material)}</dd></div>
              <div><dt>Dimensions</dt><dd>${esc(product.size)}</dd></div>
            </dl>
          </div>
        </div>`;
      dialog.showModal();
    });
  }

  /* ---------------------------------------------------------------
     7. THE PROVENANCE MAP
     The store's whole claim is that a piece is traceable to the bench
     it was built on. This is that claim, drawn. Clicking a town
     filters the catalogue by that workshop — the same filter the shop
     sidebar drives, so the map is navigation rather than decoration.
     --------------------------------------------------------------- */
  function provenanceMap() {
    const host = document.querySelector('[data-map]');
    if (!host || typeof MAP_PATH === 'undefined') return;

    const panel = document.querySelector('[data-map-panel]');
    const svgNS = 'http://www.w3.org/2000/svg';

    /* Per-town label overrides. Real geography does not lay out politely:
       Clanwilliam and Graaff-Reinet sit on almost the same latitude, so with
       the default sides their labels run into each other. Graaff-Reinet is
       sent inland instead, where there is nothing to collide with. */
    const LABEL_SIDE = { karoo: 'right' };

    const pins = MAP_TOWNS.map((town, i) => {
      const count = PRODUCTS.filter((p) => p.maker === town.key).length;
      /* Labels run OUTWARD, into the margin, rather than across the country:
         the two eastern towns (Mbombela, Umbilo) sit on the border, so a
         label anchored to their left lies over the landmass and fights the
         outline. The svg is overflow:visible, so the margin is usable. */
      const flip = LABEL_SIDE[town.key]
        ? LABEL_SIDE[town.key] === 'right'
        : (town.x < 300 || town.x > 780);
      return `
        <g class="map-pin" data-pin="${esc(town.key)}" style="--n:${i}"
           role="button" tabindex="0"
           aria-label="${esc(MAKERS[town.key].name)}, ${esc(town.label)} — ${count} ${count === 1 ? 'piece' : 'pieces'}">
          <circle class="halo" cx="${town.x}" cy="${town.y}" r="10"></circle>
          <circle class="dot" cx="${town.x}" cy="${town.y}" r="10"></circle>
          <text x="${town.x + (flip ? 22 : -22)}" y="${town.y + 8}"
                text-anchor="${flip ? 'start' : 'end'}">${esc(town.label)}</text>
          <!-- Transparent hit target, LAST so it sits above its own siblings.
               Without it a pin is only grabbable on the 10-unit dot, which is
               about 7 real pixels — and the filled country path underneath
               swallows everything that misses. -->
          <circle class="hit" cx="${town.x}" cy="${town.y}" r="30" fill="transparent"></circle>
        </g>`;
    }).join('');

    host.innerHTML = `
      <svg class="map-svg" viewBox="${MAP_VIEWBOX}" role="img"
           aria-label="Map of South Africa showing the seven workshops">
        <path class="map-outline" d="${MAP_PATH}"></path>
        ${pins}
      </svg>`;

    /* stroke-dasharray must equal the real path length or the draw-on either
       finishes early or never completes. Measure it, do not guess. */
    const outline = host.querySelector('.map-outline');
    try {
      const len = Math.ceil(outline.getTotalLength());
      outline.style.setProperty('--map-len', len);
    } catch (err) { /* getTotalLength is unavailable in some headless contexts */ }

    const show = (key) => {
      host.querySelectorAll('.map-pin').forEach((g) => {
        g.classList.toggle('is-active', g.dataset.pin === key);
      });
      if (!panel) return;
      const maker = MAKERS[key];
      const items = PRODUCTS.filter((p) => p.maker === key);
      panel.innerHTML = `
        <div class="swap">
          <h3>${esc(maker.name)}</h3>
          <p class="meta">${esc(maker.town)} &middot; since ${maker.since} &middot; ${items.length} ${items.length === 1 ? 'piece' : 'pieces'}</p>
          <p>${esc(maker.craft)}.</p>
          <a class="link-more" href="shop?maker=${esc(key)}">See their pieces
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
          </a>
        </div>`;
    };

    host.addEventListener('click', (e) => {
      const pin = e.target.closest('.map-pin');
      if (pin) show(pin.dataset.pin);
    });
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const pin = e.target.closest('.map-pin');
      if (!pin) return;
      e.preventDefault();
      show(pin.dataset.pin);
    });
    host.addEventListener('mouseover', (e) => {
      const pin = e.target.closest('.map-pin');
      if (pin) show(pin.dataset.pin);
    });

    show(MAP_TOWNS[0].key);
  }

  /* ---------------------------------------------------------------
     8. TICKER
     Duplicated so the -50% translate loop is seamless. Built in JS so
     the duplicate cannot drift from the original, and so the copy
     exists once in the markup.
     --------------------------------------------------------------- */
  function ticker() {
    document.querySelectorAll('[data-ticker]').forEach((host) => {
      const group = host.querySelector('.ticker-group');
      if (!group) return;
      const clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');   // the copy is decorative
      group.parentElement.appendChild(clone);
    });
  }

  /* ---------------------------------------------------------------
     9. Newly-rendered grids
     site.js re-renders grids wholesale on filter changes; anything
     the observer needs to know about arrives through this event.
     --------------------------------------------------------------- */
  function watchRenders() {
    document.addEventListener('tg:render', () => {
      /* Cards animate via the .stagger CSS rule, not the observer, so there is
         nothing to re-observe — but the sticky header may now be wrong if the
         page got shorter. */
      const head = document.querySelector('.head');
      if (head) head.classList.toggle('is-stuck', window.scrollY > 14);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    revealGroups();
    grainRules();
    ticker();
    provenanceMap();
    reveal();
    counters();
    stickyHeader();
    flyToBasket();
    quickView();
    watchRenders();
  });
})();
