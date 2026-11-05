/* ============================================================
   SUMMAZ ESCAPE — Booking Form Logic
   ============================================================ */

const STEPS = 7;
const BEACH_ADULT_PRICE  = 75;
const BEACH_CHILD_PRICE  = 60;
const JETSKI_ADULT_PRICE = 150;
const BIG_MABLE_PRICE    = 45;
const SUMMAZ_PRICE_1     = 200;
const SUMMAZ_PRICE_2     = 275;

const PANEL_SLUGS = {
  beachAccess:       'beach-access-package',
  beachAccessJetSki: 'beach-access-package-with-jetski',
  jetSkiRental:      'jet-ski-rentals',
  bigMable:          'big-mable-tube-ride',
  summaz:            'the-summaz-experience'
};
const SLUG_TO_PANEL = Object.fromEntries(Object.entries(PANEL_SLUGS).map(([k,v]) => [v,k]));

/* Booking state */
let state = {
  beachAdults:        0,
  beachChildren:      0,
  jetSkiAdults:       0,
  bigMableCount:      0,
  bigMableAddon:      0,
  summazCount:        0,
  selectedPackage:    '',
  jetSkiRentalSlots:  [],
  date:               '',
  name:               '',
  email:              '',
  phone:              '',
  addons:             [],
  notes:              '',
  policyAccepted:     false,
  honeypot:           '',
  currentStep:        1,
  reference:          '',
  total:              0
};

/* ── Utility ────────────────────────────────────────────── */
const JETSKI_RENTAL_PRICES = { 30: 105, 45: 125, 60: 190 };

function calcTotal() {
  if (state.selectedPackage === 'summaz') {
    return state.summazCount === 2 ? SUMMAZ_PRICE_2 : state.summazCount === 1 ? SUMMAZ_PRICE_1 : 0;
  }
  if (state.selectedPackage === 'bigMable') {
    return state.bigMableCount * BIG_MABLE_PRICE;
  }
  const base = state.selectedPackage === 'jetSkiRental'
    ? state.jetSkiRentalSlots.reduce((s, slot) => s + slot.price, 0)
    : (state.beachAdults * BEACH_ADULT_PRICE)
    + (state.beachChildren * BEACH_CHILD_PRICE)
    + (state.jetSkiAdults  * JETSKI_ADULT_PRICE);
  return base + (state.bigMableAddon * BIG_MABLE_PRICE);
}

function formatMoney(n) {
  return '$' + n.toLocaleString();
}


/* Returns today's date string (YYYY-MM-DD) in Bahamas Eastern time */
function todayInBahamas() {
  const now = new Date();
  const bahamasOffset = -4; // EDT (Bahamas observes same as US Eastern)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bahamas = new Date(utc + (3600000 * bahamasOffset));
  const y = bahamas.getFullYear();
  const m = String(bahamas.getMonth() + 1).padStart(2, '0');
  const d = String(bahamas.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ── Nav scroll handling ────────────────────────────────── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.remove('nav--transparent');
    nav.classList.add('nav--solid');
  } else {
    nav.classList.remove('nav--solid');
    nav.classList.add('nav--transparent');
  }
}, { passive: true });


/* ── Nav liquid glass ───────────────────────────────────────
   Bends the page behind the pill's edge like a lens. Blur can't do that, so this
   draws a displacement map for the pill's exact shape and runs the backdrop through
   an SVG filter. Only Chromium supports SVG filters in backdrop-filter; other
   browsers keep the frost and rim from home.css. */
(function() {
  const pill = document.querySelector('.d-nav__pill');
  if (!pill || !/\bChrome\//.test(navigator.userAgent)) return;

  const BEZEL = 20;   // how far in from the edge the glass bends, px
  const BEND  = 44;   // strongest shift at the very edge, px
  const NS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  svg.innerHTML = `<filter id="navGlass" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB" x="0" y="0">
    <feImage result="map" preserveAspectRatio="none" x="0" y="0"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${BEND * 2}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
  document.body.appendChild(svg);
  const filter = svg.querySelector('filter');
  const image  = svg.querySelector('feImage');

  /* Red = sideways shift, green = up/down shift, 128 = none. Each pixel in the
     bezel points inward, strongest at the edge, tracing the capsule's curve */
  function drawMap(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const r = h / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + .5 - w / 2, py = y + .5 - h / 2;
        const qx = Math.abs(px) - (w / 2 - r), qy = Math.abs(py) - (h / 2 - r);
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        const len = Math.hypot(ox, oy) || 1;
        const depth = r - Math.hypot(ox, oy) - Math.min(Math.max(qx, qy), 0); // px in from the edge
        const t = Math.min(Math.max(depth / BEZEL, 0), 1);
        const pull = (1 - t) * (1 - t);
        const nx = -Math.sign(px) * ox / len, ny = -Math.sign(py) * oy / len;
        const i = (y * w + x) * 4;
        img.data[i]     = 128 + 127 * pull * nx;
        img.data[i + 1] = 128 + 127 * pull * ny;
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }

  function apply() {
    const w = Math.round(pill.offsetWidth), h = Math.round(pill.offsetHeight);
    if (!w || !h) return;
    filter.setAttribute('width', w);
    filter.setAttribute('height', h);
    image.setAttribute('width', w);
    image.setAttribute('height', h);
    image.setAttribute('href', drawMap(w, h));
    pill.style.backdropFilter = 'url(#navGlass) blur(2px) saturate(1.05)';
  }
  new ResizeObserver(apply).observe(pill);
})();

/* ── Sidebar booking widget ─────────────────────────────── */
(function() {
  updateSidebarMinusButtons();
})();

function sidebarCount(field, delta) {
  const newVal = Math.max(0, state[field] + delta);
  state[field] = newVal;
  const idMap = { beachAdults: 'wBeachAdultCount', beachChildren: 'wBeachChildCount', jetSkiAdults: 'wJetSkiAdultCount' };
  const countEl = document.getElementById(idMap[field]);
  if (countEl) countEl.textContent = newVal;
  updateSidebarTotal();
  updateSidebarMinusButtons();
  updateMobileBarTotal();
}

function updateSidebarTotal() {
  const t = calcTotal();
  const el = document.getElementById('wTotal');
  if (el) el.textContent = formatMoney(t);
}

function updateMobileBarTotal() {
  const t = calcTotal();
  const el = document.getElementById('mobileBarTotal');
  if (el) el.textContent = formatMoney(t) + ' est.';
}

function updateSidebarMinusButtons() {
  const bam = document.getElementById('wBeachAdultMinus');
  const bcm = document.getElementById('wBeachChildMinus');
  const jsm = document.getElementById('wJetSkiAdultMinus');
  if (bam) bam.disabled = state.beachAdults  <= 0;
  if (bcm) bcm.disabled = state.beachChildren <= 0;
  if (jsm) jsm.disabled = state.jetSkiAdults  <= 0;
}

function openBookingFromSidebar() {
  const checked = document.querySelector('input[name="selectedPkg"]:checked');
  openBooking(checked ? checked.value : undefined);
}

/* ── Modal open / close ─────────────────────────────────── */
let previousFocus = null;
let _formOpenedAt = 0;

function openBooking(pkg) {
  previousFocus = document.activeElement;
  // Closed part-way through? Pick up where they left off, unless they chose another package
  const resuming = state.selectedPackage && !state.reference && (!pkg || pkg === state.selectedPackage);
  if (!resuming) {
    _formOpenedAt = Date.now();
    const savedDate = state.date;
    resetState();
    state.date = savedDate;
    if (pkg) state.selectedPackage = pkg;
    state.currentStep = 1;
  }
  updateModalProgress(state.currentStep);
  renderStep(state.currentStep);
  document.getElementById('bookingModal').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  history.pushState({ booking: true }, '', '/book');
  focusBookingModal();
}

function focusBookingModal() {
  setTimeout(() => {
    const first = document.querySelector('#modalBody input, #modalBody button, #modalHeader button');
    if (first) first.focus();
  }, 350);
}

function closeBooking() {
  // A payment is being submitted: closing now would hide its result
  if (document.getElementById('loadingOverlay').classList.contains('is-visible')) return;
  document.getElementById('bookingModal').classList.remove('is-open');
  document.body.style.overflow = '';
  if (previousFocus) previousFocus.focus();
  if (window.location.pathname === '/book') {
    history.pushState({}, '', '/');
  }
}

/* Close on overlay click. The press must start on the overlay too: a drag that starts
   in a field and ends outside (selecting text) also fires a click on the overlay */
let pressedOverlay = false;
document.getElementById('bookingModal').addEventListener('mousedown', function(e) {
  pressedOverlay = e.target === this;
});
document.getElementById('bookingModal').addEventListener('click', function(e) {
  if (e.target === this && pressedOverlay) closeBooking();
});

/* Close on Escape */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('bookingModal').classList.contains('is-open')) {
    closeBooking();
  }
});

function resetState() {
  state.beachAdults        = 0;
  state.beachChildren      = 0;
  state.jetSkiAdults       = 0;
  state.bigMableCount      = 0;
  state.bigMableAddon      = 0;
  state.summazCount        = 0;
  state.selectedPackage    = '';
  state.jetSkiRentalSlots  = [];
  state.date               = '';
  state.name               = '';
  state.email              = '';
  state.phone              = '';
  state.addons             = [];
  state.notes              = '';
  state.policyAccepted     = false;
  state.honeypot           = '';
  state.reference          = '';
  state.total              = 0;
}

/* ── Progress ────────────────────────────────────────────── */
const STEP_LABELS = ['How many guests?', 'Pick your date', 'Your details', 'Optional extras', 'Waiver & policies', 'Review & confirm', 'Pay with PayPal'];
const STEP_SHORT  = ['Guests', 'Date', 'Details', 'Extras', 'Waiver', 'Review', 'PayPal'];

function updateModalProgress(step) {
  const fill = document.getElementById('modalProgressFill');
  if (fill) fill.style.width = ((step / STEPS) * 100) + '%';
  const counter = document.getElementById('modalStepCounter');
  if (counter) counter.textContent = `Step ${step} of ${STEPS} · ${STEP_SHORT[step - 1]}`;
  const title = document.getElementById('modalStepTitle');
  if (title) title.textContent = STEP_LABELS[step - 1];
}

/* ── Footer total ───────────────────────────────────────── */
function updateFooterTotal() {
  const t = calcTotal();
  document.getElementById('footerTotalAmount').textContent = formatMoney(t);
}

const BK_ARROW = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18m-5-5 5 5-5 5"/></svg>';

/* ── Step renderer ──────────────────────────────────────── */
/* ── Step transitions ──────────────────────────────────────
   Call before swapping content: it measures the modal, then (after the
   synchronous re-render) glides the height and fades the new step in.
   dir 1 = forward (enters from the right), -1 = back (from the left). */
let bkLastStep = 0;
function bkAnimateSwap(dir) {
  const modal   = document.getElementById('bookingModal');
  const panelEl = document.getElementById('modalPanel');
  if (!modal || !panelEl || !modal.classList.contains('is-open')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  panelEl.getAnimations().forEach(a => { if (a.id === 'bkHeight') a.cancel(); });
  const prevH = panelEl.getBoundingClientRect().height;
  const EASE  = 'cubic-bezier(.2,.7,.2,1)';
  queueMicrotask(() => {
    const newH = panelEl.getBoundingClientRect().height;
    if (Math.abs(newH - prevH) > 2) {
      const h = panelEl.animate([{ height: prevH + 'px' }, { height: newH + 'px' }], { duration: 340, easing: EASE });
      h.id = 'bkHeight';
    }
    const x = dir * 20;
    [['modalStepCounter', 0], ['modalStepTitle', 30], ['modalBody', 70]].forEach(([id, delay]) => {
      const el = document.getElementById(id);
      if (!el || el.offsetParent === null) return;
      el.getAnimations().forEach(a => a.cancel());
      el.animate(
        [{ opacity: 0, transform: `translateX(${x}px)` }, { opacity: 1, transform: 'none' }],
        { duration: 380, delay, easing: EASE, fill: 'backwards' }
      );
    });
  });
}

function renderStep(step) {
  const body    = document.getElementById('modalBody');
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const header  = document.getElementById('modalHeader');
  const footer  = document.getElementById('modalFooter');

  bkAnimateSwap(step >= bkLastStep ? 1 : -1);
  bkLastStep = step;

  header.style.display = '';
  footer.style.display = '';

  updateModalProgress(step);
  updateFooterTotal();

  backBtn.style.display = step > 1 ? '' : 'none';

  switch (step) {
    case 1: renderStep1(body); break;
    case 2: renderStep2(body); break;
    case 3: renderStep3(body); break;
    case 4: renderStep4(body); break;
    case 5: renderStep5(body); break;
    case 6: renderStep6(body); break;
    case 7: renderStep7(body); break;
  }
  // Steps can set defaults while rendering (e.g. Summaz starts at 1 rider), so total again after
  updateFooterTotal();
  // The PayPal step pays from its own buttons
  nextBtn.style.display = step === STEPS ? 'none' : '';
  nextBtn.innerHTML = `<span>${step === STEPS - 1 ? 'Continue to Payment' : 'Continue'}</span>${BK_ARROW}`;
  document.getElementById('modalPanel').dataset.step = step;

  body.scrollTop = 0;
}

/* ── Step 1: Guest count (context-aware) ─────────────────── */
function bkStepper(o) {
  return `
    <div class="bk-counter">
      <div class="bk-counter__info">
        <p class="bk-counter__name">${o.name}</p>
        <p class="bk-counter__sub">${o.sub}</p>
      </div>
      <div class="bk-stepper">
        <button type="button" class="bk-stepper__btn" id="${o.minusId}" onclick="${o.minus}" aria-label="Remove one: ${o.name}" ${o.minDisabled ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg></button>
        <span class="bk-stepper__count" id="${o.countId}" aria-live="polite">${o.count}</span>
        <button type="button" class="bk-stepper__btn" ${o.plusId ? `id="${o.plusId}"` : ''} onclick="${o.plus}" aria-label="Add one: ${o.name}" ${o.maxDisabled ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg></button>
      </div>
    </div>`;
}

function bkSummary(rows) {
  return `
    <p class="bk-label">Summary</p>
    <div class="bk-box price-summary">
      <div class="price-summary__rows" id="bkSummaryRows">${rows}</div>
      <div class="price-summary__total">
        <span class="price-summary__total-label">Total</span>
        <span class="price-summary__total-amount" id="priceSummaryTotal">${formatMoney(calcTotal())}</span>
      </div>
    </div>`;
}

function renderStep1(body) {
  if (!state.selectedPackage) {
    renderStep1PackagePicker(body);
    return;
  }
  if (state.selectedPackage === 'jetSkiRental') {
    renderStep1JetSkiRental(body);
  } else if (state.selectedPackage === 'bigMable') {
    renderStep1BigMable(body);
  } else if (state.selectedPackage === 'summaz') {
    renderStep1Summaz(body);
    return;
  } else {
    renderStep1AllFamilyWave(body);
  }
  updateStepperButtons();
}

function renderStep1BigMable(body) {
  const total = state.bigMableCount * BIG_MABLE_PRICE;
  body.innerHTML = `
    <p class="step-sub">2 to 6 riders per ride. Ages 7 and up. $45 per person. 600 lb combined weight limit.</p>
    <p class="bk-label">Big Mable Tube Ride</p>
    ${bkStepper({ name: 'Riders', sub: `$${BIG_MABLE_PRICE} each · Ages 7+ · max 6 per ride`, minusId: 'bigMableMinus', plusId: 'bigMablePlus', countId: 'bigMableCount', minus: "changeCount('bigMableCount',-1)", plus: "changeCount('bigMableCount',1)", count: state.bigMableCount, minDisabled: state.bigMableCount === 0, maxDisabled: state.bigMableCount >= 6 })}
    ${bkSummary(`
        <div class="price-summary__row ${state.bigMableCount === 0 ? 'is-hidden' : ''}" id="bigMableSummaryRow">
          <span><span id="bigMableCount2">${state.bigMableCount}</span> x Big Mable Tube Ride</span>
          <strong id="bigMableSummaryAmt">${formatMoney(total)}</strong>
        </div>`)}
  `;
}

function renderStep1Summaz(body) {
  if (state.summazCount === 0) state.summazCount = 1;
  const price = state.summazCount === 2 ? SUMMAZ_PRICE_2 : SUMMAZ_PRICE_1;
  body.innerHTML = `
    <p class="step-sub">A private jet ski stunt ride with Summaz. 1 or 2 riders. Total price is fixed per booking, not per person.</p>
    <p class="bk-label">The Summaz Experience</p>
    ${bkStepper({ name: 'Riders', sub: `1 rider $${SUMMAZ_PRICE_1} · 2 riders $${SUMMAZ_PRICE_2}`, minusId: 'summazMinus', plusId: 'summazPlus', countId: 'summazCountEl', minus: 'changeSummazCount(-1)', plus: 'changeSummazCount(1)', count: state.summazCount, minDisabled: state.summazCount <= 1, maxDisabled: state.summazCount >= 2 })}
    ${bkSummary(`
        <div class="price-summary__row" id="summazSummaryRow">
          <span>The Summaz Experience &middot; <span id="summazSummaryCount">${state.summazCount}</span> rider${state.summazCount > 1 ? 's' : ''}</span>
          <strong id="summazSummaryAmt">${formatMoney(price)}</strong>
        </div>`)}
  `;
}

function changeSummazCount(delta) {
  const newVal = Math.max(1, Math.min(2, state.summazCount + delta));
  state.summazCount = newVal;
  const price = newVal === 2 ? SUMMAZ_PRICE_2 : SUMMAZ_PRICE_1;

  const countEl = document.getElementById('summazCountEl');
  if (countEl) countEl.textContent = newVal;

  const minBtn = document.getElementById('summazMinus');
  const plusBtn = document.getElementById('summazPlus');
  if (minBtn)  minBtn.disabled  = newVal <= 1;
  if (plusBtn) plusBtn.disabled = newVal >= 2;

  const row = document.getElementById('summazSummaryRow');
  if (row) {
    row.querySelector('span').innerHTML = `The Summaz Experience &middot; <span id="summazSummaryCount">${newVal}</span> rider${newVal > 1 ? 's' : ''}`;
    const amt = document.getElementById('summazSummaryAmt');
    if (amt) amt.textContent = formatMoney(price);
  }
  const totalEl = document.getElementById('priceSummaryTotal');
  if (totalEl) totalEl.textContent = formatMoney(price);
  updateFooterTotal();
}

const BK_PICKER = [
  { group: 'Family Wave Package', items: [
    { id: 'beachAccess',       name: 'Beach Access Package',               price: 'Adults $75 · Children $60', desc: 'A full beach day at Arawak Cay. Chairs, kayaks, paddleboards, water toys, and snorkels included. Perfect for families and groups of all ages.' },
    { id: 'beachAccessJetSki', name: 'Beach Access Package + Jet Ski Ride', price: '$150 per person',           desc: 'Everything in the beach day package plus a solo 25-minute jet ski session on open water. Ideal for adults who want more than the beach.' }
  ]},
  { group: 'Individuals', items: [
    { id: 'jetSkiRental', name: 'Jet Ski Rentals',       price: 'From $105 per ride',               desc: 'No beach day required. Just book a solo jet ski session by duration and go. Riders must be 16 or older.' },
    { id: 'bigMable',     name: 'Big Mable Tube Ride',   price: '$45 per person · 2 to 6 riders',   desc: 'Up to 6 riders on one giant inflatable tube, towed by a jet ski. A 10 to 12 minute group ride. Ages 7 and up.' },
    { id: 'summaz',       name: 'The Summaz Experience', price: '$200 for 1 rider · $275 for 2 riders', desc: 'A private stunt ride with Summaz, professional jet ski racer. Up to 2 riders. The most talked-about booking in Nassau.' }
  ]}
];

function renderStep1PackagePicker(body) {
  body.innerHTML = `
    <p class="step-sub">Not sure which to pick? Tap any option to read the full details, then book from there.</p>
    ${BK_PICKER.map(g => `
      <p class="bk-label">${g.group}</p>
      <div class="bk-list">
        ${g.items.map(it => `
          <button type="button" class="bk-pkg" onclick="selectPackageFromPicker('${it.id}')">
            <span class="bk-pkg__top">
              <span class="bk-pkg__name">${it.name}</span>
              <span class="bk-pkg__price">${it.price}</span>
            </span>
            <span class="bk-pkg__desc">${it.desc}</span>
          </button>`).join('')}
      </div>`).join('')}
  `;
}

function selectPackageFromPicker(pkg) {
  closeBooking();
  openPanel(pkg);
}

function renderStep1AllFamilyWave(body) {
  const baAmt = state.beachAdults  * BEACH_ADULT_PRICE;
  const bcAmt = state.beachChildren * BEACH_CHILD_PRICE;
  const jsAmt = state.jetSkiAdults  * JETSKI_ADULT_PRICE;
  const beach = `
    <p class="bk-label">Beach Access Package</p>
    <div class="bk-list bk-list--grid">
      ${bkStepper({ name: 'Adults', sub: `$${BEACH_ADULT_PRICE} per person`, minusId: 'beachAdultMinus', countId: 'beachAdultCount', minus: "changeCount('beachAdults',-1)", plus: "changeCount('beachAdults',1)", count: state.beachAdults })}
      ${bkStepper({ name: 'Children', sub: `$${BEACH_CHILD_PRICE} per person · Under 12`, minusId: 'beachChildMinus', countId: 'beachChildCount', minus: "changeCount('beachChildren',-1)", plus: "changeCount('beachChildren',1)", count: state.beachChildren })}
    </div>`;
  const jet = `
    <p class="bk-label">Beach Access Package + Jet Ski Ride</p>
    ${bkStepper({ name: 'Adults (16+)', sub: `$${JETSKI_ADULT_PRICE} per person`, minusId: 'jetSkiAdultMinus', countId: 'jetSkiAdultCount', minus: "changeCount('jetSkiAdults',-1)", plus: "changeCount('jetSkiAdults',1)", count: state.jetSkiAdults })}`;
  body.innerHTML = `
    <p class="step-sub">Pick what each person in your group is getting. Beach access for everyone, jet ski session for whoever wants one.</p>
    ${state.selectedPackage === 'beachAccessJetSki' ? jet + beach : beach + jet}
    ${bkSummary(`
        <div class="price-summary__row ${state.beachAdults === 0 ? 'is-hidden' : ''}" id="beachAdultSummaryRow">
          <span><span id="beachAdultSummaryCount">${state.beachAdults}</span> x Beach Access Package (Adults)</span>
          <strong id="beachAdultSummaryAmt">${formatMoney(baAmt)}</strong>
        </div>
        <div class="price-summary__row ${state.beachChildren === 0 ? 'is-hidden' : ''}" id="beachChildSummaryRow">
          <span><span id="beachChildSummaryCount">${state.beachChildren}</span> x Beach Access Package (Children)</span>
          <strong id="beachChildSummaryAmt">${formatMoney(bcAmt)}</strong>
        </div>
        <div class="price-summary__row ${state.jetSkiAdults === 0 ? 'is-hidden' : ''}" id="jetSkiAdultSummaryRow">
          <span><span id="jetSkiAdultSummaryCount">${state.jetSkiAdults}</span> x Beach Access Package + Jet Ski Ride</span>
          <strong id="jetSkiAdultSummaryAmt">${formatMoney(jsAmt)}</strong>
        </div>
        <p class="bk-summary-empty" id="bkSummaryEmpty" ${calcTotal() > 0 ? 'hidden' : ''}>Add at least one guest to see your total.</p>`)}
  `;
}





function renderStep1JetSkiRental(body) {
  const count = state.jetSkiRentalSlots.length;
  body.innerHTML = `
    <p class="step-sub">Add each rider and choose their session duration. Your total is the sum of all riders.</p>
    <p class="bk-label">Jet Ski Rentals</p>
    ${bkStepper({ name: 'Riders', sub: '16+ only · price varies by duration', minusId: 'jsrRiderMinus', countId: 'jsrRiderCount', minus: 'jsrChangeCount(-1)', plus: 'jsrChangeCount(1)', count, minDisabled: count === 0 })}
    <div id="jsrSlotsContainer" class="bk-slots">${jsrSlotsHTML()}</div>
    ${bkSummary(`<div id="jsrSummaryRows">${jsrSummaryRowsHTML()}</div>`)}
  `;
}

function jsrSlotsHTML() {
  if (state.jetSkiRentalSlots.length === 0) return '';
  return state.jetSkiRentalSlots.map((slot, i) => `
    <div class="bk-slot" id="jsrModalSlot${i}">
      <p class="bk-slot__label">Rider ${i + 1}</p>
      <div class="bk-slot__opts" role="group" aria-label="Rider ${i + 1} duration">
        ${[30, 45, 60].map(d => `
          <button type="button" class="bk-slot__opt ${slot.duration === d ? 'is-selected' : ''}" data-duration="${d}" onclick="jsrSetDuration(${i},${d})" aria-pressed="${slot.duration === d}">
            <strong>${d} min</strong><span>$${JETSKI_RENTAL_PRICES[d]}</span>
          </button>`).join('')}
      </div>
    </div>`).join('');
}

function jsrSummaryRowsHTML() {
  if (state.jetSkiRentalSlots.length === 0) return '';
  return state.jetSkiRentalSlots.map((slot, i) => `
    <div class="price-summary__row">
      <span>Rider ${i + 1} · ${slot.duration} min</span>
      <strong>${formatMoney(slot.price)}</strong>
    </div>`).join('');
}

function jsrChangeCount(delta) {
  if (delta > 0) {
    state.jetSkiRentalSlots.push({ duration: 30, price: JETSKI_RENTAL_PRICES[30] });
  } else if (delta < 0 && state.jetSkiRentalSlots.length > 0) {
    state.jetSkiRentalSlots.pop();
  }
  const count = state.jetSkiRentalSlots.length;
  const countEl = document.getElementById('jsrRiderCount');
  if (countEl) countEl.textContent = count;
  const minBtn = document.getElementById('jsrRiderMinus');
  if (minBtn) minBtn.disabled = count === 0;
  const slotsEl = document.getElementById('jsrSlotsContainer');
  if (slotsEl) slotsEl.innerHTML = jsrSlotsHTML();
  const summEl = document.getElementById('jsrSummaryRows');
  if (summEl) summEl.innerHTML = jsrSummaryRowsHTML();
  const totalEl = document.getElementById('priceSummaryTotal');
  if (totalEl) totalEl.textContent = formatMoney(calcTotal());
  updateFooterTotal();
}

function jsrSetDuration(idx, dur) {
  if (idx >= state.jetSkiRentalSlots.length) return;
  state.jetSkiRentalSlots[idx] = { duration: dur, price: JETSKI_RENTAL_PRICES[dur] };
  const slotEl = document.getElementById(`jsrModalSlot${idx}`);
  if (slotEl) {
    slotEl.querySelectorAll('.bk-slot__opt').forEach(btn => {
      const on = parseInt(btn.dataset.duration, 10) === dur;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }
  const summEl = document.getElementById('jsrSummaryRows');
  if (summEl) summEl.innerHTML = jsrSummaryRowsHTML();
  const totalEl = document.getElementById('priceSummaryTotal');
  if (totalEl) totalEl.textContent = formatMoney(calcTotal());
  updateFooterTotal();
}

function changeCount(field, delta) {
  const maxVal = field === 'bigMableCount' ? 6 : Infinity;
  const newVal = Math.max(0, Math.min(maxVal, state[field] + delta));
  state[field] = newVal;
  const countIds = { beachAdults: 'beachAdultCount', beachChildren: 'beachChildCount', jetSkiAdults: 'jetSkiAdultCount', bigMableCount: 'bigMableCount' };
  const rowIds   = { beachAdults: 'beachAdultSummaryRow', beachChildren: 'beachChildSummaryRow', jetSkiAdults: 'jetSkiAdultSummaryRow', bigMableCount: 'bigMableSummaryRow' };
  const amtIds   = { beachAdults: 'beachAdultSummaryAmt', beachChildren: 'beachChildSummaryAmt', jetSkiAdults: 'jetSkiAdultSummaryAmt', bigMableCount: 'bigMableSummaryAmt' };
  const prices   = { beachAdults: BEACH_ADULT_PRICE, beachChildren: BEACH_CHILD_PRICE, jetSkiAdults: JETSKI_ADULT_PRICE, bigMableCount: BIG_MABLE_PRICE };
  const labels   = {
    beachAdults:   'Beach Access Package (Adults)',
    beachChildren: 'Beach Access Package (Children)',
    jetSkiAdults:  'Beach Access Package + Jet Ski Ride',
    bigMableCount: 'Big Mable Tube Ride'
  };

  const countEl = document.getElementById(countIds[field]);
  if (countEl) countEl.textContent = newVal;

  const row = document.getElementById(rowIds[field]);
  const amt = document.getElementById(amtIds[field]);
  if (row && amt) {
    row.querySelector('span').innerHTML = '<span>' + newVal + '</span> x ' + labels[field];
    amt.textContent = formatMoney(newVal * prices[field]);
    row.classList.toggle('is-hidden', newVal === 0);
  }
  const totalEl = document.getElementById('priceSummaryTotal');
  if (totalEl) totalEl.textContent = formatMoney(calcTotal());
  const emptyEl = document.getElementById('bkSummaryEmpty');
  if (emptyEl) emptyEl.hidden = calcTotal() > 0;
  updateFooterTotal();
  updateStepperButtons();
}

function updateStepperButtons() {
  const bam = document.getElementById('beachAdultMinus');
  const bcm = document.getElementById('beachChildMinus');
  const jsm = document.getElementById('jetSkiAdultMinus');
  const bmm = document.getElementById('bigMableMinus');
  const bmp = document.getElementById('bigMablePlus');
  if (bam) bam.disabled = state.beachAdults   <= 0;
  if (bcm) bcm.disabled = state.beachChildren  <= 0;
  if (jsm) jsm.disabled = state.jetSkiAdults   <= 0;
  if (bmm) bmm.disabled = state.bigMableCount  <= 0;
  if (bmp) bmp.disabled = state.bigMableCount  >= 6;
}

/* ── Step 2: Date ────────────────────────────────────────── */
function renderStep2(body) {
  const today = todayInBahamas();
  body.innerHTML = `
    <p class="step-sub">We're open daily, <strong>10am to 6pm</strong>. No timed slots. Arrive any time.</p>
    <div class="bk-date ${state.date ? 'has-value' : ''}" id="bkDateWrap">
      <input
        class="bk-date__input"
        type="date"
        id="bookingDate"
        min="${today}"
        value="${state.date || ''}"
        onchange="state.date = this.value; document.getElementById('bkDateWrap').classList.toggle('has-value', !!this.value); clearFieldErr('dateErr')"
        onclick="bkOpenDatePicker()"
        aria-label="Select visit date"
      >
      <span class="bk-date__placeholder" aria-hidden="true">DD/MM/YY</span>
      <button type="button" class="bk-date__icon" onclick="bkOpenDatePicker()" aria-label="Open calendar">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>
      </button>
    </div>
    <p class="form-error" id="dateErr"></p>
    <p class="bk-hint">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M12 7.5v5.5M12 16.25v.25"/></svg>
      Dates are set in Nassau, Bahamas time. No timezone confusion.
    </p>
  `;
}

function bkOpenDatePicker() {
  const el = document.getElementById('bookingDate');
  if (!el) return;
  try { el.showPicker(); } catch (e) { el.focus(); }
}

/* ── Step 3: Lead guest details ──────────────────────────── */
function renderStep3(body) {
  body.innerHTML = `
    <p class="step-sub">We only need the lead guest's details, the person making the booking.</p>
    <div class="form-group">
      <label class="form-label" for="guestName">Full name <span>*</span></label>
      <input class="form-input" type="text" id="guestName" placeholder="Your full name"
        autocomplete="name" value="${escHtml(state.name)}"
        oninput="state.name = this.value; clearFieldErr('nameErr')">
      <p class="form-error" id="nameErr">Please enter your full name.</p>
    </div>
    <div class="form-group">
      <label class="form-label" for="guestEmail">Email address <span>*</span></label>
      <input class="form-input" type="email" id="guestEmail" placeholder="you@example.com"
        autocomplete="email" value="${escHtml(state.email)}"
        oninput="state.email = this.value; clearFieldErr('emailErr')">
      <p class="form-error" id="emailErr">Please enter a valid email address.</p>
    </div>
    <div class="form-group">
      <label class="form-label" for="guestPhone">Phone number <span>*</span></label>
      <input class="form-input" type="tel" id="guestPhone" placeholder="+1 (555) 000-0000"
        autocomplete="tel" value="${escHtml(state.phone)}"
        oninput="state.phone = this.value; clearFieldErr('phoneErr')">
      <p class="form-error" id="phoneErr">Please enter a valid phone number.</p>
    </div>
  `;
}

/* ── Step 4: Extras + Add-on interest ───────────────────── */
const ADDON_LIST = [
  { id: 'drone',    label: 'Drone Photos & Video',              note: '$45 · delivered same day',     tag: '$45' },
  { id: 'extra_js', label: 'Extra Jet Ski Time',                note: 'Priced on the day',            tag: 'Ask staff' },
  { id: 'lunch',    label: 'Lunch Package',                     note: 'At The Bay restaurant on-site',tag: 'On-site' },
  { id: 'transfer', label: 'Airport / Hotel Pickup or Drop-Off',note: 'Arranged via WhatsApp',        tag: 'WhatsApp' }
];

const showBigMableBundle = () => state.selectedPackage !== 'bigMable' && state.selectedPackage !== 'summaz';

function renderStep4(body) {
  const isChecked = state.bigMableAddon > 0;
  const count = state.bigMableAddon || 2;

  const bundleSection = showBigMableBundle() ? `
    <p class="bk-label">Add to your booking</p>
    <p class="bk-label-sub">Charged now and included in your total.</p>
    <div class="bk-check bk-check--bundle ${isChecked ? 'is-checked' : ''}" role="checkbox" tabindex="0" aria-checked="${isChecked}" onclick="toggleBigMableAddon(this)" onkeydown="bkCheckKey(event, this)">
      <input type="checkbox" ${isChecked ? 'checked' : ''} tabindex="-1" aria-hidden="true">
      <span class="bk-check__box">${BK_TICK}</span>
      <span class="bk-check__body">
        <span class="bk-check__top">
          <span class="bk-check__name">Big Mable Tube Ride</span>
          <span class="bk-check__tag">$${BIG_MABLE_PRICE} / per person</span>
        </span>
        <span class="bk-check__note">Up to 6 riders on one giant inflatable tube, towed by a jet ski. About 10 to 12 minutes. Ages 7 and up.</span>
        <span class="bk-bundle-counter ${isChecked ? 'is-visible' : ''}" id="bigMableAddonCounter" onclick="event.stopPropagation()">
          <span class="bk-bundle-counter__label">How many riders?</span>
          <span class="bk-stepper">
            <button type="button" class="bk-stepper__btn" id="bigMableAddonMinus" onclick="changeBigMableAddonCount(-1)" aria-label="Remove a rider" ${count <= 2 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg></button>
            <span class="bk-stepper__count" id="bigMableAddonVal">${count}</span>
            <button type="button" class="bk-stepper__btn" id="bigMableAddonPlus" onclick="changeBigMableAddonCount(1)" aria-label="Add a rider" ${count >= 6 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg></button>
          </span>
          <strong class="bk-bundle-counter__total" id="bigMableAddonTotal">${formatMoney(count * BIG_MABLE_PRICE)}</strong>
        </span>
      </span>
    </div>
  ` : '';

  const checks = ADDON_LIST.map(a => {
    const on = state.addons.includes(a.id);
    return `
    <div class="bk-check ${on ? 'is-checked' : ''}" role="checkbox" tabindex="0" aria-checked="${on}" onclick="toggleAddon('${a.id}', this, event)" onkeydown="bkCheckKey(event, this)">
      <input type="checkbox" ${on ? 'checked' : ''} tabindex="-1" aria-hidden="true">
      <span class="bk-check__box">${BK_TICK}</span>
      <span class="bk-check__body">
        <span class="bk-check__top">
          <span class="bk-check__name">${a.label}</span>
          <span class="bk-check__tag">${a.tag}</span>
        </span>
        <span class="bk-check__note">${a.note}</span>
      </span>
    </div>`;
  }).join('');

  body.innerHTML = `
    ${bundleSection}
    <p class="bk-label">Let us know your interests</p>
    <p class="bk-label-sub">Tick anything you might want. All paid and arranged on-site. Our team will follow up when you arrive.</p>
    <div class="bk-list bk-list--grid">${checks}</div>
    <label class="bk-label" for="bookingNotes">Anything else to mention?</label>
    <textarea class="bk-textarea" id="bookingNotes" placeholder="Special requests, accessibility needs, questions for the team…" oninput="state.notes = this.value">${escHtml(state.notes)}</textarea>
  `;
}

const BK_TICK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8"/></svg>';

function bkCheckKey(e, el) {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); el.click(); }
}

function toggleBigMableAddon(cardEl) {
  const isNowChecked = state.bigMableAddon === 0;
  if (isNowChecked) {
    state.bigMableAddon = 2;
    cardEl.classList.add('is-checked');
    cardEl.setAttribute('aria-checked', 'true');
    bkSyncAddonStepper(2);
    cardEl.querySelector('input[type="checkbox"]').checked = true;
    const counter = document.getElementById('bigMableAddonCounter');
    if (counter) counter.classList.add('is-visible');
    const val = document.getElementById('bigMableAddonVal');
    if (val) val.textContent = '2';
    const tot = document.getElementById('bigMableAddonTotal');
    if (tot) tot.textContent = formatMoney(2 * BIG_MABLE_PRICE);
  } else {
    state.bigMableAddon = 0;
    cardEl.classList.remove('is-checked');
    cardEl.setAttribute('aria-checked', 'false');
    cardEl.querySelector('input[type="checkbox"]').checked = false;
    const counter = document.getElementById('bigMableAddonCounter');
    if (counter) counter.classList.remove('is-visible');
  }
  updateFooterTotal();
}

function changeBigMableAddonCount(delta) {
  const next = (state.bigMableAddon || 2) + delta;
  if (next < 2 || next > 6) return;
  state.bigMableAddon = next;
  const val = document.getElementById('bigMableAddonVal');
  if (val) val.textContent = next;
  const tot = document.getElementById('bigMableAddonTotal');
  if (tot) tot.textContent = formatMoney(next * BIG_MABLE_PRICE);
  bkSyncAddonStepper(next);
  updateFooterTotal();
}

function bkSyncAddonStepper(n) {
  const m = document.getElementById('bigMableAddonMinus');
  const p = document.getElementById('bigMableAddonPlus');
  if (m) m.disabled = n <= 2;
  if (p) p.disabled = n >= 6;
}

function toggleAddon(id, labelEl, event) {
  if (event) event.preventDefault();
  const idx = state.addons.indexOf(id);
  if (idx === -1) {
    state.addons.push(id);
    labelEl.classList.add('is-checked');
  } else {
    state.addons.splice(idx, 1);
    labelEl.classList.remove('is-checked');
  }
  labelEl.querySelector('input[type="checkbox"]').checked = idx === -1;
  labelEl.setAttribute('aria-checked', String(idx === -1));
}

/* ── Step 5: Waiver ──────────────────────────────────────── */
function renderStep5(body) {
  body.innerHTML = `
    <p class="step-sub">Please read the terms below and confirm before continuing.</p>
    <div class="bk-waiver">
      <p class="bk-waiver__title">Liability Waiver &amp; Terms</p>
      <p>Water sports involve inherent risk. By proceeding, you acknowledge that all guests will participate at their own risk and agree to follow safety guidelines provided by our crew. Life jackets and safety briefings are provided for all guests. Summaz Escape reserves the right to cancel or postpone bookings due to adverse weather conditions with a full refund or reschedule.</p>
    </div>
    <div class="bk-check bk-check--policy ${state.policyAccepted ? 'is-checked' : ''}" role="checkbox" tabindex="0" aria-checked="${state.policyAccepted}" onclick="togglePolicy(this, event)" onkeydown="bkCheckKey(event, this)">
      <input type="checkbox" id="policyCheckbox" ${state.policyAccepted ? 'checked' : ''} tabindex="-1" aria-hidden="true">
      <span class="bk-check__box">${BK_TICK}</span>
      <span class="bk-check__note">
        I have read and accept the <a href="terms-and-conditions.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Terms &amp; Conditions</a>, <a href="refunds-and-cancellation.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Cancellation Policy</a>, and <a href="privacy-policy.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Privacy Policy</a>. I confirm all guests meet minimum age requirements.
      </span>
    </div>
    <p class="form-error" id="policyErr">You must accept the terms to continue.</p>
  `;
}

function togglePolicy(labelEl, event) {
  if (event) event.preventDefault(); // stop label from double-firing the checkbox
  state.policyAccepted = !state.policyAccepted;
  labelEl.classList.toggle('is-checked', state.policyAccepted);
  labelEl.setAttribute('aria-checked', String(state.policyAccepted));
  labelEl.querySelector('input[type="checkbox"]').checked = state.policyAccepted;
  const err = document.getElementById('policyErr');
  if (err) err.style.display = 'none';
}

/* ── Step 6: Review ──────────────────────────────────────── */
function renderStep6(body) {
  const total = calcTotal();
  const addonLabels = state.addons.map(id => {
    const a = ADDON_LIST.find(x => x.id === id);
    return a ? a.label : id;
  });
  const dateDisplay = state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'Not set';
  const isJSR    = state.selectedPackage === 'jetSkiRental';
  const isMable  = state.selectedPackage === 'bigMable';
  const isSummaz = state.selectedPackage === 'summaz';

  const mableAddonRow = state.bigMableAddon > 0 ? `<div class="review-row">
          <span class="review-row__label">Big Mable Tube Ride (add-on)</span>
          <span class="review-row__value">${state.bigMableAddon} x $${BIG_MABLE_PRICE} = ${formatMoney(state.bigMableAddon * BIG_MABLE_PRICE)}</span>
        </div>` : '';

  const guestRows = isSummaz
    ? `<div class="review-row">
          <span class="review-row__label">The Summaz Experience</span>
          <span class="review-row__value">${state.summazCount} rider${state.summazCount > 1 ? 's' : ''} &middot; ${formatMoney(total)}</span>
        </div>`
    : isJSR
    ? state.jetSkiRentalSlots.map((slot, i) => `
        <div class="review-row">
          <span class="review-row__label">Jet Ski Rental - Rider ${i + 1} (${slot.duration} min)</span>
          <span class="review-row__value">${formatMoney(slot.price)}</span>
        </div>`).join('') + mableAddonRow
    : isMable
    ? `<div class="review-row">
          <span class="review-row__label">Big Mable Tube Ride</span>
          <span class="review-row__value">${state.bigMableCount} x $${BIG_MABLE_PRICE} = ${formatMoney(state.bigMableCount * BIG_MABLE_PRICE)}</span>
        </div>`
    : `
        ${state.beachAdults > 0 ? `<div class="review-row">
          <span class="review-row__label">Beach Access Package (Adults)</span>
          <span class="review-row__value">${state.beachAdults} x $${BEACH_ADULT_PRICE} = ${formatMoney(state.beachAdults * BEACH_ADULT_PRICE)}</span>
        </div>` : ''}
        ${state.beachChildren > 0 ? `<div class="review-row">
          <span class="review-row__label">Beach Access Package (Children)</span>
          <span class="review-row__value">${state.beachChildren} x $${BEACH_CHILD_PRICE} = ${formatMoney(state.beachChildren * BEACH_CHILD_PRICE)}</span>
        </div>` : ''}
        ${state.jetSkiAdults > 0 ? `<div class="review-row">
          <span class="review-row__label">Beach Access Package + Jet Ski Ride</span>
          <span class="review-row__value">${state.jetSkiAdults} x $${JETSKI_ADULT_PRICE} = ${formatMoney(state.jetSkiAdults * JETSKI_ADULT_PRICE)}</span>
        </div>` : ''}
        ${mableAddonRow}`;

  body.innerHTML = `
    <p class="step-sub">Everything look right? Continue to pay with PayPal.</p>
    <p class="bk-label">Booking Details</p>
    <div class="review-card bk-box">
      <div class="review-card__rows">
        <div class="review-row">
          <span class="review-row__label">Date</span>
          <span class="review-row__value">${dateDisplay}</span>
        </div>
        ${guestRows}
        ${addonLabels.length > 0 ? `<div class="review-row">
          <span class="review-row__label">Extras interest</span>
          <span class="review-row__value">${addonLabels.join(', ')}</span>
        </div>` : ''}
      </div>
      <div class="review-total">
        <span class="review-total__label">Total due</span>
        <span class="review-total__amount">${formatMoney(total)}</span>
      </div>
    </div>
    <p class="bk-label">Your Details</p>
    <div class="review-card bk-box">
      <div class="review-card__rows">
        <div class="review-row">
          <span class="review-row__label">Name</span>
          <span class="review-row__value">${escHtml(state.name)}</span>
        </div>
        <div class="review-row">
          <span class="review-row__label">Email</span>
          <span class="review-row__value">${escHtml(state.email)}</span>
        </div>
        <div class="review-row">
          <span class="review-row__label">Phone</span>
          <span class="review-row__value">${escHtml(state.phone)}</span>
        </div>
        <div class="review-row">
          <span class="review-row__label">Payment</span>
          <span class="review-row__value">PayPal</span>
        </div>
      </div>
    </div>
  `;
}

/* ── Step 7: PayPal (mockup) ─────────────────────────────────
   Stand-in for the real PayPal buttons. It never asks for a login or card
   details: both buttons just pretend PayPal approved, then submit the booking.
   To go live, swap payWithPayPalMock() for the PayPal SDK's approval callback. */
function renderStep7(body) {
  const dateDisplay = state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'Not set';
  body.innerHTML = `
    <p class="step-sub">Last step. Pay with your PayPal balance, or with a debit or credit card through PayPal.</p>
    <div class="submit-error" id="submitError"></div>
    <p class="bk-paypal__demo"><strong>Demo checkout.</strong> This is a mockup of the PayPal step. No money is taken.</p>
    <div class="review-card bk-box">
      <div class="review-card__rows">
        <div class="review-row">
          <span class="review-row__label">Paying</span>
          <span class="review-row__value">Summaz Escape</span>
        </div>
        <div class="review-row">
          <span class="review-row__label">Visit date</span>
          <span class="review-row__value">${dateDisplay}</span>
        </div>
      </div>
      <div class="review-total">
        <span class="review-total__label">Total due</span>
        <span class="review-total__amount">${formatMoney(calcTotal())}</span>
      </div>
    </div>
    <div class="bk-paypal__actions">
      <button type="button" class="bk-paypal__btn bk-paypal__btn--gold" onclick="payWithPayPalMock()" aria-label="Pay with PayPal">
        <span>Pay with</span> <span class="bk-paypal__mark"><b>Pay</b><b>Pal</b></span>
      </button>
      <button type="button" class="bk-paypal__btn bk-paypal__btn--card" onclick="payWithPayPalMock()">Debit or Credit Card</button>
    </div>
    <p class="bk-hint bk-paypal__note">Your PayPal login and card details are only ever entered with PayPal, never on this site.</p>
  `;
}

function payWithPayPalMock() {
  const loading = document.getElementById('loadingOverlay');
  if (loading.classList.contains('is-visible')) return;
  loading.classList.add('is-visible');
  setTimeout(submitBooking, 900);
}

/* ── Validation helpers ──────────────────────────────────── */
function showFieldErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  el.style.display = 'block';
}

function clearFieldErr(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('is-visible');
  el.style.display = 'none';
}

/* ── Validation ─────────────────────────────────────────── */
async function validateStep(step) {
  switch (step) {
    case 1:
      if (!state.selectedPackage) {
        alert('Please select a package to continue.');
        return false;
      }
      if (state.selectedPackage === 'jetSkiRental') {
        if (state.jetSkiRentalSlots.length === 0) {
          alert('Please add at least one rider.');
          return false;
        }
        return true;
      }
      if (state.selectedPackage === 'bigMable') {
        if (state.bigMableCount < 2) {
          alert('Big Mable requires a minimum of 2 riders. Please add at least 2.');
          return false;
        }
        return true;
      }
      if (state.selectedPackage === 'summaz') {
        if (state.summazCount < 1) {
          alert('Please add at least 1 rider.');
          return false;
        }
        return true;
      }
      if (state.beachAdults + state.beachChildren + state.jetSkiAdults < 1) {
        alert('Please add at least one guest.');
        return false;
      }
      return true;

    case 2:
      if (!state.date) {
        showFieldErr('dateErr', 'Please select a date for your visit.');
        return false;
      }
      if (state.date < todayInBahamas()) {
        showFieldErr('dateErr', 'Please select today or a future date.');
        return false;
      }
      return true;

    case 3: {
      ['nameErr','emailErr','phoneErr'].forEach(id => clearFieldErr(id));
      let valid = true;

      /* Read straight from the inputs: some autofill sets values without firing input events */
      const nameEl  = document.getElementById('guestName');
      const emailEl = document.getElementById('guestEmail');
      const phoneEl = document.getElementById('guestPhone');
      if (nameEl)  state.name  = nameEl.value;
      if (emailEl) state.email = emailEl.value;
      if (phoneEl) state.phone = phoneEl.value;

      /* Name: any letters, spaces, hyphens, periods, straight or curly apostrophes, min 2 chars */
      const nameTrimmed = state.name.trim();
      if (nameTrimmed.length < 2) {
        showFieldErr('nameErr', 'Please enter your full name.');
        valid = false;
      } else if (!/^[\p{L}\p{M}\s'’.\-]+$/u.test(nameTrimmed)) {
        showFieldErr('nameErr', 'Name should contain letters only, no numbers or symbols.');
        valid = false;
      }

      /* Email: format */
      const emailTrimmed = state.email.trim().toLowerCase();
      const emailRe = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
      if (!emailRe.test(emailTrimmed)) {
        showFieldErr('emailErr', 'Please enter a valid email address.');
        valid = false;
      }

      /* Phone: min 7 digits, not all-same */
      const digits = state.phone.replace(/\D/g, '');
      if (digits.length < 7) {
        showFieldErr('phoneErr', 'Please enter a valid phone number (at least 7 digits).');
        valid = false;
      } else if (/^(\d)\1+$/.test(digits)) {
        showFieldErr('phoneErr', 'Please enter a valid phone number.');
        valid = false;
      }

      if (!valid) return false;


      return true;
    }

    case 4: return true;

    case 5:
      if (!state.policyAccepted) {
        const err = document.getElementById('policyErr');
        if (err) err.style.display = 'block';
        return false;
      }
      return true;

    default: return true;
  }
}

/* ── Navigation ─────────────────────────────────────────── */
async function nextStep() {
  if (!await validateStep(state.currentStep)) return;

  state.currentStep++;
  renderStep(state.currentStep);
}

function prevStep() {
  if (state.currentStep <= 1) return;
  state.currentStep--;
  renderStep(state.currentStep);
}

/* ── Form submission ─────────────────────────────────────── */
function submitBooking() {
  const loading = document.getElementById('loadingOverlay');
  loading.classList.add('is-visible');

  const addonStr = state.addons
    .map(id => { const a = ADDON_LIST.find(x => x.id === id); return a ? a.label : id; })
    .join(', ');

  const payload = {
    selectedPackage:    state.selectedPackage,
    beachAdults:        state.beachAdults,
    beachChildren:      state.beachChildren,
    jetSkiAdults:       state.jetSkiAdults,
    bigMableAddon:      state.bigMableAddon,
    bigMableCount:      state.bigMableCount,
    summazCount:        state.summazCount,
    jetSkiRentalSlots:  state.selectedPackage === 'jetSkiRental' ? state.jetSkiRentalSlots : [],
    date:               state.date,
    name:           state.name.trim(),
    email:          state.email.trim().toLowerCase(),
    phone:          state.phone.trim(),
    addons:         addonStr,
    notes:          state.notes.trim(),
    policyAccepted: true,
    paymentMethod:  'paypal',
    total:          calcTotal(),
    honeypot:       state.honeypot,
    elapsed:        Date.now() - _formOpenedAt
  };

  const scriptUrl = window.SUMMAZ_CONFIG?.scriptUrl;

  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!scriptUrl || scriptUrl === 'YOUR_APPS_SCRIPT_WEB_APP_URL' || isLocal) {
    // Dev mode: simulate a successful response
    setTimeout(() => {
      loading.classList.remove('is-visible');
      showConfirmation({
        reference: 'SE-' + Math.floor(100000 + Math.random() * 900000),
        total: payload.total
      });
    }, 1200);
    return;
  }

  fetch(scriptUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(data => {
    loading.classList.remove('is-visible');
    if (data.success) {
      showConfirmation(data);
    } else {
      showSubmitError((data.error || 'Something went wrong.') + ' Please try again or contact us via WhatsApp.');
    }
  })
  .catch(err => {
    loading.classList.remove('is-visible');
    console.error('Booking fetch error:', err);
    showSubmitError('Could not reach our booking server. Please try again, or WhatsApp us directly to book.');
  });
}

function showSubmitError(msg) {
  const err = document.getElementById('submitError');
  if (err) {
    err.textContent = msg;
    err.classList.add('is-visible');
    err.style.display = 'block';
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/* ── Confirmation screen ─────────────────────────────────── */
function showConfirmation(data) {
  bkAnimateSwap(1);
  state.reference = data.reference;
  state.total     = data.total || calcTotal();

  const cfg    = window.SUMMAZ_CONFIG || {};
  const ref    = data.reference;
  const total  = formatMoney(state.total);

  const dateDisplay = state.date
    ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : '';

  const instructions = `
    <div class="confirmation__instructions">
      <p class="bk-paypal__demo"><strong>Demo checkout.</strong> No money was taken. The live version takes the <strong>${total}</strong> through PayPal here.</p>
      <p style="margin-top:10px;">Questions? Email <strong><a href="mailto:${cfg.bookingEmail}">${cfg.bookingEmail}</a></strong> with your reference.</p>
    </div>
  `;

  const addonLabels = state.addons.map(id => {
    const a = ADDON_LIST.find(x => x.id === id);
    return a ? a.label : id;
  });

  // Hide header/footer, show confirmation in body
  document.getElementById('modalHeader').style.display = 'none';
  document.getElementById('modalFooter').style.display = 'none';
  document.getElementById('modalProgressFill').style.width = '100%';

  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="confirmation">
      <div class="confirmation__check">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 class="confirmation__title">You're booked.</h2>
      <p class="confirmation__sub">Save your booking reference. You will need it when you arrive.</p>
      <p class="confirmation__email-notice">We sent a confirmation to <strong>${escHtml(state.email)}</strong></p>
      <div class="reference-box">
        <div class="reference-box__label">Booking Reference</div>
        <div class="reference-box__code" id="refCode">${ref}</div>
        <button class="copy-btn" onclick="copyReference('${ref}', this)" aria-label="Copy reference number">Copy reference</button>
      </div>
      ${instructions}
      <div class="confirmation__meta">
        <div class="confirmation__meta-item">
          <div class="confirmation__meta-label">Date</div>
          <div class="confirmation__meta-value">${dateDisplay}</div>
        </div>
        <div class="confirmation__meta-item">
          <div class="confirmation__meta-label">Total</div>
          <div class="confirmation__meta-value">${total}</div>
        </div>
        <div class="confirmation__meta-item">
          <div class="confirmation__meta-label">Payment</div>
          <div class="confirmation__meta-value">PayPal</div>
        </div>
      </div>
      <button class="btn btn--outline btn--full confirmation__close-btn" onclick="closeBooking()">Close</button>
    </div>
  `;
}

function copyReference(ref, btn) {
  navigator.clipboard.writeText(ref).then(() => {
    btn.textContent = '✓ Copied';
    setTimeout(() => { btn.textContent = 'Copy reference'; }, 2500);
  }).catch(() => {
    const range = document.createRange();
    const el = document.getElementById('refCode');
    if (el) {
      range.selectNode(el);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = 'Copy reference'; }, 2500);
    }
  });
}

/* ── Helpers ────────────────────────────────────────────── */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Hero background crossfade ──────────────────────────── */
(function() {
  const slides = [1,2,3,4,5,6].map(function(n) {
    return document.querySelector('.hero__slide--' + n);
  }).filter(Boolean);
  if (slides.length < 2) return;
  let current = 0;
  setInterval(function() {
    slides[current].style.opacity = '0';
    current = (current + 1) % slides.length;
    slides[current].style.opacity = '1';
  }, 5000);
})();

/* ── Mobile bar: hide during hero, fade in once scrolled past */
(function() {
  const hero = document.querySelector('.d-hero');
  const bar  = document.querySelector('.mobile-bar');
  if (!hero || !bar) return;
  const obs = new IntersectionObserver(entries => {
    bar.classList.toggle('is-visible', !entries[0].isIntersecting);
  }, { threshold: 0 });
  obs.observe(hero);
})();

/* ── Floating Book Now: slide up between the hero and the closing CTA,
   both of which already show their own Book Now button */
(function() {
  const fab = document.getElementById('bookFab');
  const zones = [...document.querySelectorAll('.d-hero, .d-cta')];
  if (!fab || !zones.length) return;
  const inView = new Set();
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? inView.add(e.target) : inView.delete(e.target));
    const show = inView.size === 0;
    fab.classList.toggle('is-visible', show);
    fab.inert = !show;
  }, { rootMargin: '0px 0px -120px 0px' });
  zones.forEach(z => obs.observe(z));
})();

/* ── Testimonials column — duplicate for seamless loop ───── */
(function() {
  document.querySelectorAll('.tcol-inner').forEach(col => {
    col.innerHTML += col.innerHTML;
  });
})();

/* ── Behold Instagram feed ───────────────────────────────── */
const BEHOLD_FEED_URL  = 'https://feeds.behold.so/2SE3Lr6MzDuMSlLkdgxr';
const BEHOLD_CACHE_KEY = 'summaze_behold_feed';
const BEHOLD_CACHE_MS  = 60 * 60 * 1000; // 1 hour

async function getFeedData() {
  try {
    const raw = localStorage.getItem(BEHOLD_CACHE_KEY);
    if (raw) {
      const { timestamp, data } = JSON.parse(raw);
      if (Date.now() - timestamp < BEHOLD_CACHE_MS) return data;
    }
  } catch (e) {}

  const res  = await fetch(BEHOLD_FEED_URL);
  const data = await res.json();

  try {
    localStorage.setItem(BEHOLD_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (e) {}

  return data;
}

// Behold's CDN occasionally 502s on a single image: drop that card instead of showing an empty box
function dropFeedItem(img) {
  const item = img.closest('.d-feed__item');
  if (item && item.parentElement && item.parentElement.children.length > 1) item.remove();
  updateCarouselArrows();
}

function renderReels(posts) {
  const track = document.getElementById('beholdReelsTrack');
  if (!track) return;

  const reels = posts.filter(p => p.mediaType === 'VIDEO' && p.isReel === true);
  // Keep the static fallback cards if the feed has no reels
  if (reels.length === 0) return;

  track.innerHTML = reels.map(reel => {
    // Behold-hosted sizes first: Instagram's thumbnailUrl expires
    const sizes = reel.sizes || {};
    const thumb = (sizes.large && sizes.large.mediaUrl) || (sizes.medium && sizes.medium.mediaUrl) || reel.thumbnailUrl || '';
    return `<a href="${escHtml(reel.permalink)}" target="_blank" rel="noopener" class="d-feed__item">
      ${thumb ? `<img src="${escHtml(thumb)}" alt="Summaz Escape reel" loading="lazy" onerror="dropFeedItem(this)">` : ''}
    </a>`;
  }).join('');
  track.scrollLeft = 0;
}

function renderGallery(posts) {
  const grid = document.getElementById('beholdGalleryGrid');
  const tab  = document.querySelector('[data-feed-tab="gallery"]');
  if (!grid) return;

  const items = [];
  for (const post of posts) {
    if (post.isReel) continue;
    if (post.mediaType === 'VIDEO') continue;
    if (post.mediaType === 'IMAGE') {
      const url = post.sizes && post.sizes.medium && post.sizes.medium.mediaUrl;
      if (url) items.push({ url, permalink: post.permalink, w: post.sizes.medium.width, h: post.sizes.medium.height });
    } else if (post.mediaType === 'CAROUSEL_ALBUM' && post.children) {
      for (const child of post.children) {
        if (child.mediaType === 'IMAGE') {
          const url = child.sizes && child.sizes.medium && child.sizes.medium.mediaUrl;
          if (url) items.push({ url, permalink: post.permalink, w: child.sizes.medium.width, h: child.sizes.medium.height });
        }
      }
    }
  }

  if (items.length === 0) return;

  grid.innerHTML = items.map(it => `
    <a href="${escHtml(it.permalink)}" target="_blank" rel="noopener" class="d-feed__item">
      <img src="${escHtml(it.url)}" alt="Summaz Escape" loading="lazy" width="${it.w}" height="${it.h}" onerror="dropFeedItem(this)">
    </a>`).join('');
  if (tab) tab.disabled = false;
}

// Disabled: the reels and photos tabs use the static images in the markup.
// Call initBehold() again to pull them from Instagram instead.
async function initBehold() {
  try {
    const data = await getFeedData();
    if (data && Array.isArray(data.posts)) {
      renderReels(data.posts);
      renderGallery(data.posts);
    }
  } catch (e) {
    // Static reel cards in the markup stay as the fallback
    console.error('Behold feed failed:', e);
  }
}

/* ── Feed tabs (photos / reels) ─────────────────────────── */
function setFeedTab(name) {
  const tracks = { reels: 'beholdReelsTrack', gallery: 'beholdGalleryGrid' };
  const target = document.getElementById(tracks[name]);
  if (!target || !target.children.length) return;
  document.querySelectorAll('[data-feed-tab]').forEach(btn => {
    const active = btn.dataset.feedTab === name;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active);
  });
  Object.values(tracks).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = el !== target;
  });
}

document.querySelectorAll('[data-feed-tab]').forEach(btn => {
  btn.addEventListener('click', () => { setFeedTab(btn.dataset.feedTab); updateCarouselArrows(); });
});
document.querySelectorAll('a[href="#gallery"]').forEach(a => {
  a.addEventListener('click', () => setFeedTab('gallery'));
});

/* ── Carousel arrows ────────────────────────────────────── */
function carouselTrack(id) {
  if (id === 'feed') {
    return [...document.querySelectorAll('.d-feed')].find(el => !el.hidden);
  }
  return document.getElementById(id);
}

function scrollCarousel(id, dir, count) {
  const track = carouselTrack(id);
  if (!track || !track.children.length) return;
  const card = track.children[0];
  const gap  = parseFloat(getComputedStyle(track).columnGap) || 0;
  const step = card.getBoundingClientRect().width + gap;
  // Move by as many whole cards as fit, at least one
  const n = count || Math.max(1, Math.floor((track.clientWidth + gap) / step) - 1);
  if (track.dataset.loop) {
    // Endless track: jump to the matching copy if this move would run off an end,
    // then land on a card edge, as the track has no snapping to line it up
    const setWidth = step * Number(track.dataset.loop);
    let from = track.scrollLeft;
    if (from >= setWidth) from -= setWidth;
    if (dir < 0 && from < step * n) from += setWidth;
    track.scrollTo({ left: from, behavior: 'instant' });
    track.scrollTo({ left: (Math.round(from / step) + dir * n) * step, behavior: 'smooth' });
    return;
  }
  track.scrollBy({ left: dir * step * n, behavior: 'smooth' });
}

function atCarouselEnd(track) {
  return track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
}

/* Dim an arrow when its track can't move further that way */
function updateCarouselArrows() {
  const ids = new Set([...document.querySelectorAll('[data-carousel-prev]')].map(b => b.dataset.carouselPrev));
  ids.forEach(id => {
    const track = carouselTrack(id);
    if (!track) return;
    const prev = document.querySelector(`[data-carousel-prev="${id}"]`);
    const next = document.querySelector(`[data-carousel-next="${id}"]`);
    const endless = Boolean(track.dataset.loop);
    if (prev) prev.disabled = !endless && track.scrollLeft <= 4;
    if (next) next.disabled = !endless && atCarouselEnd(track);
  });
}
document.querySelectorAll('.d-track').forEach(track => {
  track.addEventListener('scroll', updateCarouselArrows, { passive: true });
});
window.addEventListener('resize', updateCarouselArrows);
window.addEventListener('load', updateCarouselArrows);

document.querySelectorAll('[data-carousel-prev]').forEach(btn => {
  btn.addEventListener('click', () => scrollCarousel(btn.dataset.carouselPrev, -1));
});
document.querySelectorAll('[data-carousel-next]').forEach(btn => {
  btn.addEventListener('click', () => scrollCarousel(btn.dataset.carouselNext, 1));
});

/* Experience strip opens with the first clip peeking in from the left */
(function() {
  const track = document.querySelector('[data-peek]');
  if (!track || window.innerWidth < 1024) return;
  requestAnimationFrame(() => {
    const card = track.children[0];
    const gap  = parseFloat(getComputedStyle(track).columnGap) || 0;
    if (card) track.scrollLeft = card.getBoundingClientRect().width + gap;
    updateCarouselArrows();
  });
})();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Endless auto-slide (reviews + experience clips) ────────
   Drifts continuously and loops forever: the cards are copied once, and the
   track jumps back by one set as it reaches the copies. Eases to a stop while
   hovered; holds while touched, off screen, after an arrow click, or while a
   video, the booking modal or a package panel is open (they all lock the page). */
['reviewsTrack', 'expTrack'].forEach(function(id) {
  const track = document.getElementById(id);
  if (prefersReducedMotion || !track) return;

  const SPEED = 48; // px per second
  const cards = [...track.children];
  cards.forEach(card => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    if (copy.hasAttribute('tabindex')) copy.tabIndex = -1; // no duplicate keyboard stops
    track.appendChild(copy);
  });
  track.dataset.loop = cards.length;

  let hovered = false, held = false, visible = false, resumeTimer;
  let speed = 0, x = 0, last = performance.now();

  const hold = (ms) => {
    held = true;
    speed = 0;
    clearTimeout(resumeTimer);
    if (ms) resumeTimer = setTimeout(() => { held = false; }, ms);
  };
  track.addEventListener('mouseenter', () => { hovered = true; });
  track.addEventListener('mouseleave', () => { hovered = false; });
  track.addEventListener('touchstart', () => hold(), { passive: true });
  track.addEventListener('touchend', () => hold(4000));
  document.querySelectorAll(`[data-carousel-prev="${id}"], [data-carousel-next="${id}"]`).forEach(btn => {
    btn.addEventListener('click', () => hold(4000));
  });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(track);

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const pageLocked = document.body.style.overflow === 'hidden';
    if (held || !visible || document.hidden || pageLocked) { speed = 0; x = track.scrollLeft; return; }

    speed += ((hovered ? 0 : SPEED) - speed) * Math.min(1, dt * 6);
    if (speed < 1) { x = track.scrollLeft; return; } // stopped: let the visitor scroll by hand

    const setWidth = track.children[cards.length].offsetLeft - cards[0].offsetLeft;
    x += speed * dt;
    if (x >= setWidth) x -= setWidth;
    track.scrollLeft = x;
  }
  requestAnimationFrame(tick);
});

/* ── Instagram feed autoplay ────────────────────────────────
   One card every few seconds, back to the start at the end.
   Pauses while hovered, touched, focused or off screen. */
(function() {
  if (prefersReducedMotion) return;
  [['feed', 4000]].forEach(([id, every]) => {
    const host = document.getElementById('reels');
    if (!host) return;
    let paused = false, visible = false, resumeTimer;
    const pause  = () => { paused = true; clearTimeout(resumeTimer); };
    const resume = (delay) => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { paused = false; }, delay); };
    host.addEventListener('mouseenter', pause);
    host.addEventListener('mouseleave', () => resume(800));
    host.addEventListener('touchstart', pause, { passive: true });
    host.addEventListener('touchend', () => resume(4000));
    host.addEventListener('focusin', pause);
    host.addEventListener('focusout', () => resume(800));
    // Arrow clicks count as interaction: give the visitor time before moving again
    document.querySelectorAll(`[data-carousel-prev="${id}"], [data-carousel-next="${id}"]`).forEach(btn => {
      btn.addEventListener('click', () => { pause(); resume(8000); });
    });
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0.3 }).observe(host);

    setInterval(() => {
      if (paused || !visible || document.hidden) return;
      const track = carouselTrack(id);
      if (!track || track.scrollWidth <= track.clientWidth + 4) return;
      if (atCarouselEnd(track)) track.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollCarousel(id, 1, 1);
    }, every);
  });
})();

/* ── Scroll reveal ──────────────────────────────────────── */
(function() {
  const groups = [
    '.d-head', '.d-title', '.d-pkg', '.d-overview__hero', '.d-overview__cols', '.d-overview__track',
    '.d-extra', '.d-extras__link', '.d-map', '.d-bar', '.d-steps li', '.d-faq__item',
    '.d-kids__text > *', '.d-kids__videos .d-video', '.d-experience__track', '.d-experience .d-row',
    // The feed wrapper, not each feed: the hidden tab would never intersect and stay invisible
    '#reels > .d-wrap-inner:not(.d-head)', '.d-reviews__track', '.d-cta__content', '.d-footer__card'
  ];
  const all = [...document.querySelectorAll(groups.join(','))];
  // Skip anything nested in another reveal target so motion doesn't double up
  const els = all.filter(el => !all.some(other => other !== el && other.contains(el)));
  if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('d-reveal-ready');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Stagger siblings that come into view together (card grids, FAQ rows)
      const siblings = [...el.parentElement.children].filter(c => c.classList.contains('d-reveal') && !c.classList.contains('is-in'));
      el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 70 + 'ms';
      el.classList.add('is-in');
      // Hand transform back to hover effects once the reveal has played
      el.addEventListener('transitionend', () => {
        el.classList.remove('d-reveal', 'is-in');
        el.style.transitionDelay = '';
      }, { once: true });
      obs.unobserve(el);
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
  els.forEach(el => { el.classList.add('d-reveal'); obs.observe(el); });
})();

/* ── Homepage FAQ: animated open / close ─────────────────── */
(function() {
  const EASE = 'cubic-bezier(.2,.7,.2,1)';
  document.querySelectorAll('.d-faq__item').forEach(item => {
    const summary = item.querySelector('summary');
    const answer  = item.querySelector('.d-faq__answer');
    if (!summary || !answer) return;
    let anim = null;

    summary.addEventListener('click', e => {
      if (prefersReducedMotion) return;
      e.preventDefault();
      if (anim) anim.cancel();
      const pad = getComputedStyle(answer).paddingBottom;
      answer.style.overflow = 'hidden';

      if (!item.open || item.classList.contains('is-closing')) {
        item.classList.remove('is-closing');
        item.open = true;
        const h = answer.scrollHeight + 'px';
        anim = answer.animate([
          { height: '0px', paddingBottom: '0px', opacity: 0, transform: 'translateY(-6px)' },
          { height: h, paddingBottom: pad, opacity: 1, transform: 'none' }
        ], { duration: 360, easing: EASE });
      } else {
        item.classList.add('is-closing');
        const h = answer.offsetHeight + 'px';
        anim = answer.animate([
          { height: h, paddingBottom: pad, opacity: 1, transform: 'none' },
          { height: '0px', paddingBottom: '0px', opacity: 0, transform: 'translateY(-6px)' }
        ], { duration: 280, easing: 'ease' });
      }
      // Settle on 'finish', with a timer backup in case the event is delayed
      // (e.g. a backgrounded tab pauses animation frames)
      const current = anim;
      const closing = item.classList.contains('is-closing');
      let settled = false;
      const settle = () => {
        if (settled || anim !== current) return;
        settled = true;
        if (closing) { item.open = false; item.classList.remove('is-closing'); }
        answer.style.overflow = '';
        anim = null;
      };
      current.addEventListener('finish', settle);
      setTimeout(settle, (closing ? 280 : 360) + 80);
    });
  });
})();

/* ── Review stars ───────────────────────────────────────── */
document.querySelectorAll('.d-stars[data-stars]').forEach(el => {
  const n = Number(el.dataset.stars) || 5;
  el.innerHTML = Array.from({ length: n }, () => '<img src="/assets/figma/icon-star.svg" width="16" height="16" alt="">').join('');
  el.setAttribute('aria-label', `${n} out of 5 stars`);
});

/* ── Video lightbox ──────────────────────────────────────── */
(function() {
  const lb      = document.getElementById('vlightbox');
  const wrap    = document.getElementById('vlightboxWrap');
  const closeBtn= document.getElementById('vlightboxClose');
  if (!lb || !wrap || !closeBtn) return;

  function openVideo(src) {
    const v = document.createElement('video');
    v.src        = src;
    v.controls   = true;
    v.autoplay   = true;
    v.playsInline= true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    wrap.appendChild(v);
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    v.play().catch(function() {});
  }

  function closeVideo() {
    const v = wrap.querySelector('video');
    if (v) { v.pause(); v.src = ''; wrap.removeChild(v); }
    lb.classList.remove('is-open');
    document.body.style.overflow = (typeof isPanelOpen === 'function' && isPanelOpen()) ? 'hidden' : '';
  }

  window.openPanelVideo = openVideo;

  closeBtn.addEventListener('click', closeVideo);
  lb.addEventListener('click', function(e) { if (e.target === lb) closeVideo(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && lb.classList.contains('is-open')) closeVideo(); });

  document.querySelectorAll('.vcard').forEach(function(card) {
    card.addEventListener('click', function() { openVideo(card.dataset.src); });
    card.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideo(card.dataset.src); } });
  });
})();


/* ══════════════════════════════════════════════════════════
   PACKAGE PANELS
   ══════════════════════════════════════════════════════════ */

/* Panel working state (separate from booking state) */
let panel = {
  type: null,
  beachAdults: 0,
  beachChildren: 0,
  jetSkiAdults: 0,
  jetSkiRentalAdults: 0,
  jetSkiRentalSlots: [],
  bigMableCount: 0,
  summazCount: 1,
  date: ''
};
let panelMedia        = [];
let panelReturnFocus  = null;
let panelBookObserver = null;

function panelTotal() {
  if (panel.type === 'summaz') {
    return panel.summazCount === 2 ? SUMMAZ_PRICE_2 : panel.summazCount >= 1 ? SUMMAZ_PRICE_1 : 0;
  }
  if (panel.type === 'jetSkiRental') {
    return panel.jetSkiRentalSlots.reduce((s, slot) => s + slot.price, 0);
  }
  if (panel.type === 'bigMable') {
    return panel.bigMableCount * BIG_MABLE_PRICE;
  }
  return (panel.beachAdults  * BEACH_ADULT_PRICE)
       + (panel.beachChildren * BEACH_CHILD_PRICE)
       + (panel.jetSkiAdults  * JETSKI_ADULT_PRICE);
}

/* ── Panel media ────────────────────────────────────────── */
const PANEL_GALLERY_BEACH = [
  'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1784948510/summaz/beach-pkg-photo2.jpg',
  'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1784948514/summaz/beach-pkg-photo3.jpg',
  'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1784948516/summaz/beach-pkg-photo4.jpg',
  'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1784948499/summaz/beach-pkg-photo1.jpg'
];

const PANEL_VIDEOS_BEACH = [
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1782304506/summaz/clip1.mp4',        poster: 'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1782304497/summaz/clip1-poster.jpg' },
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1782304545/summaz/clip2.mp4',        poster: 'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1782304540/summaz/clip2-poster.jpg' },
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1782304624/summaz/clip5.mp4',        poster: 'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1782304622/summaz/clip5-poster.jpg' },
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1784948520/summaz/beach-pkg-clip1.mp4', poster: 'https://res.cloudinary.com/dko76z0df/video/upload/c_fill,w_640,h_480,g_auto/v1784948520/summaz/beach-pkg-clip1.jpg' },
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1784950714/summaz/beach-pkg-clip2.mp4', poster: 'https://res.cloudinary.com/dko76z0df/video/upload/c_fill,w_640,h_480,g_auto/v1784950714/summaz/beach-pkg-clip2.jpg' }
];

const PANEL_VIDEOS_JETSKI = [
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1784951674/summaz/jetski-rental-clip1.mp4', poster: 'https://res.cloudinary.com/dko76z0df/video/upload/c_fill,w_640,h_480,g_auto/v1784951674/summaz/jetski-rental-clip1.jpg' },
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1784951689/summaz/jetski-rental-clip2.mp4', poster: 'https://res.cloudinary.com/dko76z0df/video/upload/c_fill,w_640,h_480,g_auto/v1784951689/summaz/jetski-rental-clip2.jpg' }
];

const PANEL_GALLERY_JETSKI = [
  'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1784952080/summaz/jetski-photo1.jpg',
  'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1784952085/summaz/jetski-photo2.jpg',
  'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1784952091/summaz/jetski-photo3.jpg'
];

const PANEL_VIDEOS_MABLE = [
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1784952633/summaz/mable-clip1.mp4', poster: 'https://res.cloudinary.com/dko76z0df/video/upload/c_fill,w_640,h_480,g_auto/v1784952633/summaz/mable-clip1.jpg' },
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1784952652/summaz/mable-clip2.mp4', poster: 'https://res.cloudinary.com/dko76z0df/video/upload/c_fill,w_640,h_480,g_auto/v1784952652/summaz/mable-clip2.jpg' }
];

const PANEL_VIDEOS_SUMMAZ = [
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1782304538/summaz/clip11.mp4', poster: 'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1786733750/summaz/summaz-exp-card.jpg' }
];

/* Resize a Cloudinary crop (local assets pass through untouched) */
function cldSize(url, w, h) {
  return url.replace(/c_fill,w_\d+,h_\d+/, `c_fill,w_${w},h_${h}`);
}
const mPhoto = src => ({ type: 'photo', src });
const mVideo = v   => ({ type: 'video', src: v.src, poster: v.poster });

/* ── Package detail content ─────────────────────────────── */
const PKG_DETAILS = {
  summaz: {
    title: 'The Summaz Experience',
    bookSub: '1 or 2 riders per session',
    desc: [
      'Summaz is a professional jet ski racer. This is not a guided tour or a casual ride. You sit on the back, he takes you out on the open water, and he does things that will make your heart stop. Flips, sharp turns, full speed runs. Every minute of it is content.',
      '1 or 2 riders per session. The price is fixed per booking. If you bring someone along, you split one of the best experiences Nassau has to offer. If you go solo, it is entirely yours.'
    ],
    tiers: [
      { label: '1 Rider', price: SUMMAZ_PRICE_1, sub: 'per booking', act: { kind: 'summaz', value: 1 } },
      { label: '2 Rider', price: SUMMAZ_PRICE_2, sub: 'per booking', act: { kind: 'summaz', value: 2 } }
    ],
    included: ['Private jet ski session with Summaz', 'Stunts and open water maneuvers', '1 or 2 riders per session', 'Life jacket provided'],
    media: [
      mVideo(PANEL_VIDEOS_SUMMAZ[0]),
      mPhoto(PANEL_GALLERY_BEACH[1]),
      mPhoto('https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1782304519/summaz/clip11-poster.jpg'),
      mPhoto(PANEL_GALLERY_BEACH[0])
    ],
    faqs: [
      ['How long is the session?', 'Sessions run around 15 to 20 minutes. The exact time depends on conditions and what Summaz decides to do out there. It feels shorter than it sounds.'],
      ['Can 2 people ride at the same time?', 'Yes. The jet ski fits 2 riders. You book for 2 at $275 and both ride together for the full session. You do not get separate sessions at the 2-rider price.'],
      ['Is it safe?', 'Summaz is a professional. He knows exactly how far to take it while keeping riders secure on the ski. Life jackets are worn for the full session.'],
      ['Can I bring my phone or camera?', 'You can try, but the best shots come from someone filming from the shore or dock. Things happen fast on the water and phones do not survive every ride.'],
      ['Is there a minimum age?', 'Riders should be adults. If you are bringing a younger passenger, reach out to us at booking@summazescape.com before booking so we can confirm suitability.']
    ]
  },

  beachAccessJetSki: {
    title: 'Beach Access Package + Jet Ski Ride',
    bookSub: 'Mix and match for your group',
    desc: [
      'Everything in the Beach Access Package plus a solo 25-minute jet ski session on the open water. Book this for anyone in your group who wants to get out on the water.',
      'Your group can mix. Some people on the Beach Access Package for the day, others on Beach Access + Jet Ski Ride. You choose what each person is getting when you book.'
    ],
    tiers: [
      { label: 'Beach + Jet Ski', price: JETSKI_ADULT_PRICE, sub: 'per person', act: { kind: 'count', field: 'jetSkiAdults' } },
      { label: 'Beach Adult',     price: BEACH_ADULT_PRICE,  sub: 'per person', act: { kind: 'count', field: 'beachAdults' } },
      { label: 'Beach Child',     price: BEACH_CHILD_PRICE,  sub: 'under 12',   act: { kind: 'count', field: 'beachChildren' } }
    ],
    included: ['Beach chairs and umbrella', 'Kayaks', 'Paddleboards', 'Water scooters', 'Snorkel masks', 'Floaties', 'Water hammock', 'Bottled water', '25-min solo jet ski session', 'Life jacket provided'],
    media: [
      mVideo(PANEL_VIDEOS_JETSKI[0]),
      ...PANEL_GALLERY_BEACH.map(mPhoto),
      mVideo(PANEL_VIDEOS_JETSKI[1]),
      ...PANEL_GALLERY_JETSKI.map(mPhoto),
      mVideo(PANEL_VIDEOS_BEACH[3])
    ],
    faqs: [
      ['Is there a minimum age for the jet ski?', 'Riders must be 16 or older to operate a jet ski. Anyone under 16 in your group should be booked on the Beach Access Package instead.'],
      ['Can I add someone to the jet ski after I arrive?', 'Yes. You can arrange extra jet ski time with the team on-site.'],
      ['Is the jet ski session guided?', "Our crew rides alongside you. They'll show you the route and make sure the experience is safe and enjoyable."],
      ['Can children join the beach access portion?', 'Yes. Book those guests on the Beach Access Package at $60 each and the adults who want the jet ski on the Beach Access + Jet Ski Ride option.']
    ]
  },

  beachAccess: {
    title: 'Beach Access Package',
    bookSub: 'Mix and match for your group',
    desc: [
      'A full day at Arawak Cay. Beach chairs, water gear, and clear Caribbean water. Arrive any time between 10am and 6pm. No timed slots.',
      'Great for families, couples, and groups. Kids can play with floaties and water scooters while adults take out the kayaks or paddleboards. Bottled water is included and restrooms are on-site.',
      'Note: jet ski rides are not included in this package. If some of your group wants to get on the water, book those people on the Beach Access + Jet Ski Ride option instead.'
    ],
    tiers: [
      { label: 'Adult', price: BEACH_ADULT_PRICE, sub: 'per person', act: { kind: 'count', field: 'beachAdults' } },
      { label: 'Child', price: BEACH_CHILD_PRICE, sub: 'under 12',   act: { kind: 'count', field: 'beachChildren' } }
    ],
    included: ['Beach chairs and umbrella', 'Kayaks', 'Paddleboards', 'Water scooters', 'Snorkel masks', 'Floaties', 'Water hammock', 'Bottled water', 'Restrooms on-site', 'Lifeguard on duty'],
    media: [
      mVideo(PANEL_VIDEOS_BEACH[4]),
      ...PANEL_GALLERY_BEACH.map(mPhoto),
      ...PANEL_VIDEOS_BEACH.slice(0, 4).map(mVideo)
    ],
    faqs: [
      ['What time should we arrive?', 'Any time between 10am and 6pm. No timed slots. Arrive when it works for your group.'],
      ['Are children able to join?', 'Yes, absolutely. The Beach Access Package is open to all ages, no restrictions.'],
      ['What counts as a child for pricing?', "Anyone under 12 books as a child at $60. Ages 12 and up are booked as adults at $75. If you're not sure, go with the age they'll be on the day of the visit."],
      ['Is food available on-site?', 'The Bay restaurant is located at the venue. You can order food and drinks at any point during your visit.'],
      ['What should we bring?', 'Swimwear, sunscreen, and a valid ID. Towels and extra sunscreen are recommended. Bottled water is included.']
    ]
  },

  jetSkiRental: {
    title: 'Jet Ski Rentals',
    bookSub: 'Select riders and duration',
    desc: [
      'A standalone jet ski session right off Arawak Cay. No beach day needed, just pick your duration and get on the water.',
      "This package is for adults. You need to be 16 or older to take the wheel. Bringing younger family or friends? That's totally fine. Each jet ski has two seats, so they can ride along with you tandem at no extra charge. Just book for the adult rider and bring whoever you want on the back."
    ],
    tiers: [
      { label: '30 min', price: JETSKI_RENTAL_PRICES[30], sub: 'per rider', act: { kind: 'jsr', dur: 30 } },
      { label: '45 min', price: JETSKI_RENTAL_PRICES[45], sub: 'per rider', act: { kind: 'jsr', dur: 45 } },
      { label: '60 min', price: JETSKI_RENTAL_PRICES[60], sub: 'per rider', act: { kind: 'jsr', dur: 60 } }
    ],
    included: ['Jet ski session (solo or tandem)', 'Life jacket provided', 'Crew guidance on the water', 'No beach access required'],
    media: [
      mVideo(PANEL_VIDEOS_JETSKI[0]),
      ...PANEL_GALLERY_JETSKI.map(mPhoto),
      mVideo(PANEL_VIDEOS_JETSKI[1]),
      mPhoto(PANEL_GALLERY_BEACH[0])
    ],
    faqs: [
      ['What is the minimum age to ride?', 'Riders must be 16 or older. No exceptions.'],
      ['Do I need to book in advance?', 'Booking ahead is strongly recommended, especially on weekends. Walk-ins depend on availability.'],
      ['Can someone ride with me on the same jet ski?', "Yes. Each jet ski seats two, so tandem riding is completely fine and there's no extra charge for a passenger. You only book and pay for the rider who's driving. Perfect if you're bringing along a younger family member or someone who just wants to come along for the ride."],
      ['What if the weather is bad on my date?', "If we need to cancel due to weather, you'll be offered a full reschedule or refund. We'll contact you in advance."]
    ]
  },

  bigMable: {
    title: 'Big Mable Tube Ride',
    bookSub: '2 to 6 riders per ride · Ages 7+',
    desc: [
      "Up to 6 riders pile onto one giant inflatable tube and get towed through open water by a jet ski. It's loud, wet, and fast. A 10 to 12 minute ride that everyone remembers.",
      'Great for families with kids, friend groups, or anyone who wants a break from the beach chairs. Ages 7 and up. Combined weight limit of 600 lb per ride.'
    ],
    tiers: [
      { label: 'Per Rider', price: BIG_MABLE_PRICE,     sub: 'per person',      act: { kind: 'mable' } },
      { label: 'Full Tube', price: BIG_MABLE_PRICE * 6, sub: '6 riders · per ride', act: { kind: 'mable', value: 6 } }
    ],
    included: ['10 to 12 minute tube ride', 'Up to 6 riders per tube', 'Life jackets provided', 'Jet ski tow crew on board'],
    media: [
      mVideo(PANEL_VIDEOS_MABLE[0]),
      mPhoto('/assets/figma/pkg-bigmable.webp'),
      mVideo(PANEL_VIDEOS_MABLE[1])
    ],
    faqs: [
      ['What is the minimum age?', 'Ages 7 and up. Children under 7 are not permitted on the Big Mable for safety reasons.'],
      ['How many people can ride at once?', 'Minimum 2, maximum 6 riders per ride. The tube seats everyone together for a shared experience.'],
      ['Is there a weight limit?', 'Yes. The combined weight of all riders must not exceed 600 lb. Our team will confirm on arrival.'],
      ['Do we need beach access to book this?', "No. The Big Mable Tube Ride is a standalone experience. You don't need to purchase a Beach Access Package to book it."]
    ]
  }
};

/* ── Icons ──────────────────────────────────────────────── */
const PD_ICON = {
  check:   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9.5 12 15l5.5-5.5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  minus:   '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
  plus:    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>',
  play:    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  prev:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
};

/* ── Panel builders ─────────────────────────────────────── */
function buildPanelHTML(type) {
  const d = PKG_DETAILS[type];
  if (!d) return '';
  panelMedia = d.media;

  const media = d.media.map((m, i) => {
    const thumb = cldSize(m.type === 'video' ? m.poster : m.src, 1280, 740);
    const label = m.type === 'video' ? `Play video ${i + 1}` : `View photo ${i + 1}`;
    return `
      <button type="button" class="pd-media__item${m.type === 'video' ? ' pd-media__item--video' : ''}" onclick="openPanelMedia(${i})" aria-label="${label}">
        <img src="${thumb}" alt="" ${i > 1 ? 'loading="lazy"' : ''} draggable="false">
        ${m.type === 'video' ? `<span class="pd-media__play">${PD_ICON.play}</span>` : ''}
      </button>`;
  }).join('');

  const dots = d.media.length > 1
    ? `<div class="pd-media__dots" id="pdMediaDots">${d.media.map((_, i) => `<span class="${i === 0 ? 'is-active' : ''}"></span>`).join('')}</div>`
    : '';

  const tiers = d.tiers.map((t, i) => `
    <button type="button" class="pd-tier" data-tier="${i}" onclick="panelTierClick(${i})" aria-pressed="false">
      <span class="pd-tier__label">${t.label}</span>
      <span class="pd-tier__price">$${t.price}</span>
      <span class="pd-tier__sub">${t.sub}</span>
      <span class="pd-tier__badge" hidden></span>
    </button>`).join('');

  const included = d.included.map(item => `
    <li class="pd-included__item"><span class="pd-included__icon">${PD_ICON.check}</span><span>${item}</span></li>`).join('');

  const faqs = d.faqs.map(([q, a], i) => `
    <div class="pd-faq__item">
      <button type="button" class="pd-faq__q" id="pdFaqQ${i}" aria-expanded="false" aria-controls="pdFaqA${i}" onclick="togglePanelFaq(this)">
        <span>${q}</span>${PD_ICON.chevron}
      </button>
      <div class="pd-faq__a" id="pdFaqA${i}" role="region" aria-labelledby="pdFaqQ${i}"><div><p>${a}</p></div></div>
    </div>`).join('');

  return `
    <div class="pd-media">
      <div class="pd-media__track" id="pdMediaTrack">${media}</div>
      <button type="button" class="pd-media__nav pd-media__nav--prev" id="pdMediaPrev" onclick="scrollPanelMedia(-1)" aria-label="Previous media">${PD_ICON.prev}</button>
      <button type="button" class="pd-media__nav pd-media__nav--next" id="pdMediaNext" onclick="scrollPanelMedia(1)" aria-label="Next media">${PD_ICON.next}</button>
      ${dots}
    </div>

    <div class="pd-grid">
      <div class="pd-intro">
        <h2 class="pd-title" id="pdTitle">${d.title}</h2>
        <div class="pd-desc">${d.desc.map(p => `<p>${p}</p>`).join('')}</div>
      </div>

      <aside class="pd-aside">
        <h3 class="pd-label pd-label--pricing">Pricing</h3>
        <div class="pd-tiers" style="--pd-cols:${d.tiers.length}">${tiers}</div>
        <div class="pd-book" id="pdBook">${buildPanelSidebar(type)}</div>
      </aside>

      <div class="pd-details">
        <h3 class="pd-label">What's Included</h3>
        <ul class="pd-included">${included}</ul>
        <h3 class="pd-label">Questions</h3>
        <div class="pd-faq">${faqs}</div>
      </div>
    </div>`;
}

function buildPanelSidebar(type) {
  if (type === 'summaz')       return panelSidebarSummaz();
  if (type === 'jetSkiRental') return panelSidebarJetSkiRental();
  if (type === 'bigMable')     return panelSidebarBigMable();
  return panelSidebarFamilyWave();
}

/* Shared booking card pieces */
function pdCounterHTML(o) {
  return `
    <div class="pd-counter">
      <div class="pd-counter__info">
        <div class="pd-counter__name">${o.name}</div>
        <div class="pd-counter__sub">${o.sub}</div>
      </div>
      <div class="pd-stepper">
        <button type="button" class="pd-stepper__btn" id="${o.minusId}" onclick="${o.minus}" aria-label="Remove one: ${o.name}" ${o.minDisabled ? 'disabled' : ''}>${PD_ICON.minus}</button>
        <span class="pd-stepper__count" id="${o.countId}" aria-live="polite">${o.count}</span>
        <button type="button" class="pd-stepper__btn" ${o.plusId ? `id="${o.plusId}"` : ''} onclick="${o.plus}" aria-label="Add one: ${o.name}" ${o.maxDisabled ? 'disabled' : ''}>${PD_ICON.plus}</button>
      </div>
    </div>`;
}

function pdBookHTML(o) {
  return `
    <h3 class="pd-book__title">${o.title}</h3>
    <p class="pd-book__sub">${o.sub}</p>
    ${o.body}
    <div class="pd-book__total"><span>Total</span><strong id="psPanelTotal">${formatMoney(panelTotal())}</strong></div>
    <button type="button" class="pd-book__btn" id="psPanelBookBtn" onclick="bookFromPanel()" ${o.disabled ? 'disabled' : ''}>${o.btn}</button>
    ${o.note ? `<p class="pd-book__note">${o.note}</p>` : ''}`;
}

function familyBookBtnText() {
  return panelTotal() === 0 ? 'Add guests to book' : 'Book This Package';
}

function panelSidebarFamilyWave() {
  const beach = `
    <span class="pd-book__label">Beach Access Package</span>
    ${pdCounterHTML({ name: 'Adults', sub: `$${BEACH_ADULT_PRICE} per person`, countId: 'psFWBeachAdultCount', minusId: 'psFWBeachAdultMinus', minus: "panelCount('beachAdults',-1)", plus: "panelCount('beachAdults',1)", count: panel.beachAdults, minDisabled: panel.beachAdults <= 0 })}
    ${pdCounterHTML({ name: 'Children', sub: `$${BEACH_CHILD_PRICE} per person · Under 12`, countId: 'psFWBeachChildCount', minusId: 'psFWBeachChildMinus', minus: "panelCount('beachChildren',-1)", plus: "panelCount('beachChildren',1)", count: panel.beachChildren, minDisabled: panel.beachChildren <= 0 })}`;
  const jet = `
    <span class="pd-book__label">Beach Access + Jet Ski Ride</span>
    ${pdCounterHTML({ name: 'Adults (16+)', sub: `$${JETSKI_ADULT_PRICE} per person`, countId: 'psFWJetSkiAdultCount', minusId: 'psFWJetSkiAdultMinus', minus: "panelCount('jetSkiAdults',-1)", plus: "panelCount('jetSkiAdults',1)", count: panel.jetSkiAdults, minDisabled: panel.jetSkiAdults <= 0 })}`;
  return pdBookHTML({
    title: PKG_DETAILS[panel.type].title,
    sub: PKG_DETAILS[panel.type].bookSub,
    body: panel.type === 'beachAccessJetSki' ? jet + beach : beach + jet,
    disabled: panelTotal() === 0,
    btn: familyBookBtnText(),
    note: "You'll confirm guest details in the next step. Free cancellation 7 days before."
  });
}

function jsrSlotHTML(slot, i) {
  return `
    <div class="pd-slot" id="psJSRSlot${i}">
      <div class="pd-slot__label">Rider ${i + 1}</div>
      <div class="pd-slot__opts" role="group" aria-label="Rider ${i + 1} duration">
        ${[30, 45, 60].map(dur => `
          <button type="button" class="pd-slot__opt ${slot.duration === dur ? 'is-selected' : ''}" data-duration="${dur}" onclick="setPanelRiderDuration(${i},${dur})" aria-pressed="${slot.duration === dur}">
            <strong>${dur} min</strong><span>$${JETSKI_RENTAL_PRICES[dur]}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function panelSidebarJetSkiRental() {
  const count = panel.jetSkiRentalSlots.length;
  return pdBookHTML({
    title: 'Jet Ski Rentals',
    sub: PKG_DETAILS.jetSkiRental.bookSub,
    body: `
      <span class="pd-book__label">Riders</span>
      ${pdCounterHTML({ name: 'Adults (16+)', sub: 'Price varies by duration', countId: 'psJSRAdultCount', minusId: 'psJSRAdultMinus', minus: 'panelJSRCount(-1)', plus: 'panelJSRCount(1)', count, minDisabled: count <= 0 })}
      <div id="psJSRSlots" class="pd-slots">${panel.jetSkiRentalSlots.map(jsrSlotHTML).join('')}</div>`,
    disabled: count === 0,
    btn: count === 0 ? 'Add riders to book' : 'Book This Package',
    note: 'Each rider picks their duration. Total is the sum of all riders.'
  });
}

function panelSidebarBigMable() {
  const count = panel.bigMableCount;
  return pdBookHTML({
    title: 'Big Mable Tube Ride',
    sub: PKG_DETAILS.bigMable.bookSub,
    body: `
      <span class="pd-book__label">Riders</span>
      ${pdCounterHTML({ name: 'Riders (Ages 7+)', sub: `$${BIG_MABLE_PRICE} per person · max 6`, countId: 'psBigMableCount', minusId: 'psBigMableMinus', plusId: 'psBigMablePlus', minus: 'panelBigMableCount(-1)', plus: 'panelBigMableCount(1)', count, minDisabled: count <= 0, maxDisabled: count >= 6 })}
      <p class="pd-book__warn" id="psBigMableWarn" ${count === 1 ? '' : 'hidden'}>Minimum 2 riders required.</p>`,
    disabled: count < 2,
    btn: count < 2 ? 'Add at least 2 riders' : 'Book This Package',
    note: '600 lb combined weight limit. Pay with PayPal at checkout.'
  });
}

function panelSidebarSummaz() {
  const count = panel.summazCount;
  return pdBookHTML({
    title: 'The Summaz Experience',
    sub: PKG_DETAILS.summaz.bookSub,
    body: `
      <span class="pd-book__label">Riders</span>
      ${pdCounterHTML({ name: 'Riders', sub: `1 rider $${SUMMAZ_PRICE_1} · 2 riders $${SUMMAZ_PRICE_2}`, countId: 'psSummazCount', minusId: 'psSummazMinus', plusId: 'psSummazPlus', minus: 'panelSummazCount(-1)', plus: 'panelSummazCount(1)', count, minDisabled: count <= 1, maxDisabled: count >= 2 })}`,
    disabled: false,
    btn: 'Book This Package',
    note: ''
  });
}

/* ── Open / close ───────────────────────────────────────── */
function openPanel(type) {
  if (!PKG_DETAILS[type]) return;
  const overlay = document.getElementById('pkgPanelOverlay');
  if (!overlay.classList.contains('is-open')) panelReturnFocus = document.activeElement;

  panel.type               = type;
  panel.beachAdults        = 0;
  panel.beachChildren      = 0;
  panel.jetSkiAdults       = 0;
  panel.jetSkiRentalAdults = 0;
  panel.jetSkiRentalSlots  = [];
  panel.bigMableCount      = 0;
  panel.summazCount        = 1;
  panel.date               = '';

  document.getElementById('pkgPanelContent').innerHTML = buildPanelHTML(type);
  const scroller = document.getElementById('pkgPanelScroll');
  if (scroller) scroller.scrollTop = 0;
  updatePanelSidebarTotal();

  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  initPanelMedia();
  initPanelBookBar();
  setTimeout(() => {
    const closeBtn = document.getElementById('pkgPanelClose');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }, 60);

  const path = '/book/' + (PANEL_SLUGS[type] || type);
  if (window.location.pathname !== path) history.pushState({ panel: type }, '', path);
}

function closePanel() {
  const overlay = document.getElementById('pkgPanelOverlay');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (panelBookObserver) { panelBookObserver.disconnect(); panelBookObserver = null; }
  if (panelReturnFocus && document.contains(panelReturnFocus)) panelReturnFocus.focus({ preventScroll: true });
  panelReturnFocus = null;
  if (window.location.pathname.startsWith('/book/')) {
    history.pushState({}, '', '/');
  }
}

function panelOverlayClick(e) {
  if (e.target === document.getElementById('pkgPanelOverlay')) closePanel();
}

/* Kept for the popstate handler; the mobile booking card is inline now */
function closePanelSheet() {}

function isPanelOpen() {
  const o = document.getElementById('pkgPanelOverlay');
  return !!(o && o.classList.contains('is-open'));
}

/* Escape closes the top-most layer; Tab stays inside the panel */
document.addEventListener('keydown', function(e) {
  if (!isPanelOpen()) return;
  const imgLb = document.getElementById('imgLightbox');
  const vidLb = document.getElementById('vlightbox');
  const lightboxOpen = (imgLb && imgLb.classList.contains('is-open')) || (vidLb && vidLb.classList.contains('is-open'));

  if (e.key === 'Escape') {
    if (imgLb && imgLb.classList.contains('is-open')) { closeImgLightbox(); return; }
    if (lightboxOpen) return;
    closePanel();
    return;
  }
  if (lightboxOpen) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const track = document.getElementById('pdMediaTrack');
    if (track && track.contains(document.activeElement)) {
      e.preventDefault();
      scrollPanelMedia(e.key === 'ArrowLeft' ? -1 : 1);
    }
    return;
  }
  if (e.key === 'Tab') {
    const modal = document.getElementById('pkgPanel');
    const focusables = [...modal.querySelectorAll('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ── Media strip ────────────────────────────────────────── */
function openPanelMedia(i) {
  const m = panelMedia[i];
  if (!m) return;
  if (m.type === 'video') openPanelVideo(m.src);
  else openImgLightbox(cldSize(m.src, 1800, 1200));
}

function panelMediaStep(track) {
  const item = track.querySelector('.pd-media__item');
  if (!item) return track.clientWidth;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  return item.getBoundingClientRect().width + gap;
}

function scrollPanelMedia(dir) {
  const track = document.getElementById('pdMediaTrack');
  if (!track) return;
  track.scrollBy({ left: dir * panelMediaStep(track), behavior: 'smooth' });
}

function updatePanelMediaNav() {
  const track = document.getElementById('pdMediaTrack');
  if (!track) return;
  const max  = track.scrollWidth - track.clientWidth;
  const prev = document.getElementById('pdMediaPrev');
  const next = document.getElementById('pdMediaNext');
  const scrollable = max > 4;
  if (prev) prev.classList.toggle('is-hidden', !scrollable || track.scrollLeft <= 4);
  if (next) next.classList.toggle('is-hidden', !scrollable || track.scrollLeft >= max - 4);

  const dots = document.querySelectorAll('#pdMediaDots span');
  if (dots.length) {
    const idx = track.scrollLeft >= max - 4
      ? dots.length - 1
      : Math.round(track.scrollLeft / panelMediaStep(track));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }
}

function initPanelMedia() {
  const track = document.getElementById('pdMediaTrack');
  if (!track) return;
  let raf = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updatePanelMediaNav);
  }, { passive: true });
  track.querySelectorAll('img').forEach(img => img.addEventListener('load', updatePanelMediaNav, { once: true }));
  requestAnimationFrame(updatePanelMediaNav);
}
window.addEventListener('resize', () => { if (isPanelOpen()) updatePanelMediaNav(); });

/* ── Mobile sticky bar: shown while the booking card is off-screen ── */
function initPanelBookBar() {
  const bar  = document.getElementById('panelMobileBar');
  const card = document.getElementById('pdBook');
  if (panelBookObserver) panelBookObserver.disconnect();
  if (!bar || !card || !('IntersectionObserver' in window)) return;
  bar.classList.remove('is-hidden');
  panelBookObserver = new IntersectionObserver(entries => {
    entries.forEach(en => bar.classList.toggle('is-hidden', en.isIntersecting));
  }, { root: document.getElementById('pkgPanelScroll'), threshold: 0.25 });
  panelBookObserver.observe(card);
}

function scrollToPanelBook() {
  const card = document.getElementById('pdBook');
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashPanelBook();
}

function flashPanelBook() {
  const card = document.getElementById('pdBook');
  if (!card) return;
  card.classList.remove('is-flash');
  void card.offsetWidth;
  card.classList.add('is-flash');
}

/* ── FAQ accordion ──────────────────────────────────────── */
function togglePanelFaq(btn) {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  btn.parentElement.classList.toggle('is-open', open);
}

/* ── Pricing tiers ──────────────────────────────────────── */
function panelTierClick(i) {
  const d = PKG_DETAILS[panel.type];
  const t = d && d.tiers[i];
  if (!t) return;
  const a = t.act;
  if (a.kind === 'summaz') {
    panelSummazCount(a.value - panel.summazCount);
  } else if (a.kind === 'count') {
    panelCount(a.field, 1);
  } else if (a.kind === 'jsr') {
    panel.jetSkiRentalSlots.push({ duration: a.dur, price: JETSKI_RENTAL_PRICES[a.dur] });
    panelJSRCount(0);
  } else if (a.kind === 'mable') {
    panelBigMableCount(a.value ? a.value - panel.bigMableCount : 1);
  }
  flashPanelBook();
}

function syncPanelTiers() {
  const d = PKG_DETAILS[panel.type];
  if (!d) return;
  document.querySelectorAll('.pd-tier').forEach(el => {
    const t = d.tiers[Number(el.dataset.tier)];
    if (!t) return;
    const a = t.act;
    let active = false, n = 0;
    if (a.kind === 'summaz')      active = panel.summazCount === a.value;
    else if (a.kind === 'count')  { n = panel[a.field]; active = n > 0; }
    else if (a.kind === 'jsr')    { n = panel.jetSkiRentalSlots.filter(s => s.duration === a.dur).length; active = n > 0; }
    else if (a.kind === 'mable')  { active = a.value ? panel.bigMableCount === a.value : panel.bigMableCount > 0 && panel.bigMableCount < 6; n = a.value ? 0 : panel.bigMableCount; }
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-pressed', String(active));
    const badge = el.querySelector('.pd-tier__badge');
    if (badge) {
      badge.hidden = !(n > 0 && active);
      badge.textContent = n > 0 ? `× ${n}` : '';
    }
  });
}

/* ── Panel counter functions ────────────────────────────── */
function setPanelBookBtn(disabled, text) {
  const btn = document.getElementById('psPanelBookBtn');
  if (!btn) return;
  btn.disabled = disabled;
  btn.textContent = text;
}

function panelCount(field, delta) {
  const newVal = Math.max(0, panel[field] + delta);
  panel[field] = newVal;
  const idMap  = { beachAdults: 'psFWBeachAdultCount', beachChildren: 'psFWBeachChildCount', jetSkiAdults: 'psFWJetSkiAdultCount' };
  const minMap = { beachAdults: 'psFWBeachAdultMinus', beachChildren: 'psFWBeachChildMinus', jetSkiAdults: 'psFWJetSkiAdultMinus' };
  const countEl = document.getElementById(idMap[field]);
  const minBtn  = document.getElementById(minMap[field]);
  if (countEl) countEl.textContent = newVal;
  if (minBtn)  minBtn.disabled = newVal <= 0;
  setPanelBookBtn(panelTotal() === 0, familyBookBtnText());
  updatePanelSidebarTotal();
}

function panelJSRCount(delta) {
  if (delta > 0) {
    panel.jetSkiRentalSlots.push({ duration: 30, price: JETSKI_RENTAL_PRICES[30] });
  } else if (delta < 0 && panel.jetSkiRentalSlots.length > 0) {
    panel.jetSkiRentalSlots.pop();
  }
  panel.jetSkiRentalAdults = panel.jetSkiRentalSlots.length;

  const countEl = document.getElementById('psJSRAdultCount');
  const minBtn  = document.getElementById('psJSRAdultMinus');
  if (countEl) countEl.textContent = panel.jetSkiRentalAdults;
  if (minBtn)  minBtn.disabled = panel.jetSkiRentalAdults <= 0;

  renderPanelJSRSlots();
  updatePanelSidebarTotal();
  setPanelBookBtn(panel.jetSkiRentalAdults === 0, panel.jetSkiRentalAdults === 0 ? 'Add riders to book' : 'Book This Package');
}

function setPanelRiderDuration(idx, dur) {
  if (idx >= panel.jetSkiRentalSlots.length) return;
  panel.jetSkiRentalSlots[idx] = { duration: dur, price: JETSKI_RENTAL_PRICES[dur] };
  const slotEl = document.getElementById(`psJSRSlot${idx}`);
  if (slotEl) {
    slotEl.querySelectorAll('.pd-slot__opt').forEach(btn => {
      const on = parseInt(btn.dataset.duration, 10) === dur;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }
  updatePanelSidebarTotal();
}

function renderPanelJSRSlots() {
  const container = document.getElementById('psJSRSlots');
  if (!container) return;
  container.innerHTML = panel.jetSkiRentalSlots.map(jsrSlotHTML).join('');
}

function updatePanelSidebarTotal() {
  const total = formatMoney(panelTotal());
  const el  = document.getElementById('psPanelTotal');
  const bar = document.getElementById('pdBarTotal');
  if (el)  el.textContent  = total;
  if (bar) bar.textContent = total;
  syncPanelTiers();
}

function panelSummazCount(delta) {
  const newVal = Math.max(1, Math.min(2, panel.summazCount + delta));
  panel.summazCount = newVal;

  const countEl = document.getElementById('psSummazCount');
  const minBtn  = document.getElementById('psSummazMinus');
  const plusBtn = document.getElementById('psSummazPlus');
  if (countEl) countEl.textContent = newVal;
  if (minBtn)  minBtn.disabled  = newVal <= 1;
  if (plusBtn) plusBtn.disabled = newVal >= 2;

  updatePanelSidebarTotal();
}

function panelBigMableCount(delta) {
  const newVal = Math.max(0, Math.min(6, panel.bigMableCount + delta));
  panel.bigMableCount = newVal;

  const countEl = document.getElementById('psBigMableCount');
  const minBtn  = document.getElementById('psBigMableMinus');
  const plusBtn = document.getElementById('psBigMablePlus');
  const warn    = document.getElementById('psBigMableWarn');
  if (countEl) countEl.textContent = newVal;
  if (minBtn)  minBtn.disabled = newVal <= 0;
  if (plusBtn) plusBtn.disabled = newVal >= 6;
  if (warn)    warn.hidden = newVal !== 1;

  updatePanelSidebarTotal();
  setPanelBookBtn(newVal < 2, newVal < 2 ? 'Add at least 2 riders' : 'Book This Package');
}

/* ── Book from panel ────────────────────────────────────── */
function bookFromPanel() {

  if (panel.type === 'jetSkiRental') {
    if (panel.jetSkiRentalAdults === 0) {
      alert('Please add at least one rider.');
      return;
    }
    state.selectedPackage   = 'jetSkiRental';
    state.jetSkiRentalSlots = panel.jetSkiRentalSlots.map(s => ({ ...s }));
    state.beachAdults       = 0;
    state.beachChildren     = 0;
    state.jetSkiAdults      = 0;
    state.bigMableCount     = 0;
  } else if (panel.type === 'bigMable') {
    if (panel.bigMableCount < 2) {
      alert('Big Mable requires a minimum of 2 riders.');
      return;
    }
    state.selectedPackage   = 'bigMable';
    state.bigMableCount     = panel.bigMableCount;
    state.beachAdults       = 0;
    state.beachChildren     = 0;
    state.jetSkiAdults      = 0;
    state.jetSkiRentalSlots = [];
  } else if (panel.type === 'summaz') {
    state.selectedPackage   = 'summaz';
    state.summazCount       = panel.summazCount;
    state.beachAdults       = 0;
    state.beachChildren     = 0;
    state.jetSkiAdults      = 0;
    state.bigMableCount     = 0;
    state.jetSkiRentalSlots = [];
  } else {
    if (panelTotal() === 0) {
      alert('Please add at least one guest.');
      return;
    }
    state.selectedPackage   = panel.type;
    state.beachAdults       = panel.beachAdults;
    state.beachChildren     = panel.beachChildren;
    state.jetSkiAdults      = panel.jetSkiAdults;
    state.bigMableCount     = 0;
    state.jetSkiRentalSlots = [];
  }

  state.date = '';
  closePanel();
  openBookingAtStep2();
}

/* ── Open modal at step 2 (from panel) ───────────────────── */
function openBookingAtStep2() {
  _formOpenedAt    = Date.now();
  previousFocus    = document.activeElement;
  state.name           = '';
  state.email          = '';
  state.phone          = '';
  state.addons         = [];
  state.notes          = '';
  state.policyAccepted = false;
  state.honeypot       = '';
  state.reference      = '';
  state.total          = 0;
  state.currentStep    = 2;

  updateModalProgress(2);
  renderStep(2);
  document.getElementById('bookingModal').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  focusBookingModal();
}

/* ── Jet Ski Rental WhatsApp submission ──────────────────── */
function submitJetSkiRentalViaWhatsApp() {
  const loading = document.getElementById('loadingOverlay');
  if (loading) loading.classList.add('is-visible');

  const dateDisplay = state.date
    ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBD';

  const ridersText = state.jetSkiRentalSlots.map((slot, i) =>
    `Rider ${i + 1}: ${slot.duration} min ($${slot.price})`
  ).join(', ');

  const total  = calcTotal();
  const cfg    = window.SUMMAZ_CONFIG || {};
  const waNum  = cfg.whatsapp || '12428175387';
  const msg    = `Hi! I'd like to book a Jet Ski Rental.\n\nName: ${state.name}\nDate: ${dateDisplay}\nRiders: ${ridersText}\nTotal: $${total}\nPhone: ${state.phone}\nEmail: ${state.email}`;
  const waUrl  = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;

  setTimeout(() => {
    if (loading) loading.classList.remove('is-visible');
    window.open(waUrl, '_blank');
    showJetSkiRentalConfirmation(dateDisplay, total, cfg);
  }, 800);
}

function showJetSkiRentalConfirmation(dateDisplay, total, cfg) {
  bkAnimateSwap(1);
  const body   = document.getElementById('modalBody');
  const header = document.getElementById('modalHeader');
  const footer = document.getElementById('modalFooter');
  if (header) header.style.display = 'none';
  if (footer) footer.style.display = 'none';

  body.innerHTML = `
    <div class="confirmation__wrap">
      <div class="confirmation__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#00C4A1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 class="confirmation__title">WhatsApp Opened</h2>
      <p class="confirmation__sub">Your details have been sent. Our team will confirm your jet ski slot within 24 hours.</p>
      <div class="confirmation__meta">
        ${dateDisplay && dateDisplay !== 'Date TBD' ? `<div class="confirmation__meta-item"><strong>Date</strong>${dateDisplay}</div>` : ''}
        <div class="confirmation__meta-item"><strong>Riders</strong>${state.jetSkiRentalSlots.length} rider${state.jetSkiRentalSlots.length > 1 ? 's' : ''}</div>
        <div class="confirmation__meta-item"><strong>Total</strong>${formatMoney(total)}</div>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:16px;text-align:center">If WhatsApp didn't open, <a href="https://wa.me/${(cfg||{}).whatsapp || '12428175387'}" target="_blank" rel="noopener" style="color:var(--sea)">tap here to send your booking</a>.</p>
      <button class="btn btn--primary" style="margin-top:24px;width:100%;justify-content:center" onclick="closeBooking()">Close</button>
    </div>
  `;
}

/* ── Photo lightbox ──────────────────────────────────────── */
function openImgLightbox(src) {
  const lb  = document.getElementById('imgLightbox');
  const img = document.getElementById('imgLightboxImg');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.add('is-open');
}

function closeImgLightbox() {
  const lb = document.getElementById('imgLightbox');
  if (!lb) return;
  lb.classList.remove('is-open');
}

/* ── Sidebar package selector ──────────────────────────── */
function sidebarPackageChange(value) {
  state.selectedPackage = value;
}

/* ── Big Mable WhatsApp submission ───────────────────────── */
function submitBigMableViaWhatsApp() {
  const loading = document.getElementById('loadingOverlay');
  if (loading) loading.classList.add('is-visible');

  const dateDisplay = state.date
    ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBD';

  const total  = calcTotal();
  const cfg    = window.SUMMAZ_CONFIG || {};
  const waNum  = cfg.whatsapp || '12428175387';
  const msg    = `Hi! I'd like to book a Big Mable Tube Ride.\n\nName: ${state.name}\nDate: ${dateDisplay}\nRiders: ${state.bigMableCount}\nTotal: $${total}\nPhone: ${state.phone}\nEmail: ${state.email}`;
  const waUrl  = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;

  setTimeout(() => {
    if (loading) loading.classList.remove('is-visible');
    window.open(waUrl, '_blank');
    showBigMableConfirmation(dateDisplay, total, cfg);
  }, 800);
}

function showBigMableConfirmation(dateDisplay, total, cfg) {
  bkAnimateSwap(1);
  const body   = document.getElementById('modalBody');
  const header = document.getElementById('modalHeader');
  const footer = document.getElementById('modalFooter');
  if (header) header.style.display = 'none';
  if (footer) footer.style.display = 'none';

  body.innerHTML = `
    <div class="confirmation__wrap">
      <div class="confirmation__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#00C4A1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 class="confirmation__title">WhatsApp Opened</h2>
      <p class="confirmation__sub">Your Big Mable booking request has been sent. Our team will confirm your slot within 24 hours.</p>
      <div class="confirmation__meta">
        ${dateDisplay && dateDisplay !== 'Date TBD' ? `<div class="confirmation__meta-item"><strong>Date</strong>${dateDisplay}</div>` : ''}
        <div class="confirmation__meta-item"><strong>Riders</strong>${state.bigMableCount}</div>
        <div class="confirmation__meta-item"><strong>Total</strong>${formatMoney(total)}</div>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:16px;text-align:center">If WhatsApp didn't open, <a href="https://wa.me/${(cfg||{}).whatsapp || '12428175387'}" target="_blank" rel="noopener" style="color:var(--sea)">tap here to send your booking</a>.</p>
      <button class="btn btn--primary" style="margin-top:24px;width:100%;justify-content:center" onclick="closeBooking()">Close</button>
    </div>
  `;
}

/* ── Mobile nav menu ──────────────────────────────────── */
function toggleMobileMenu() {
  const menu = document.getElementById('navMobileMenu');
  const btn  = document.getElementById('navHamburger');
  const isOpen = menu.classList.toggle('is-open');
  btn.classList.toggle('is-open', isOpen);
  nav.classList.toggle('is-menu-open', isOpen);
  btn.setAttribute('aria-expanded', isOpen);
  menu.setAttribute('aria-hidden', !isOpen);
}

function closeMobileMenu() {
  const menu = document.getElementById('navMobileMenu');
  const btn  = document.getElementById('navHamburger');
  menu.classList.remove('is-open');
  btn.classList.remove('is-open');
  nav.classList.remove('is-menu-open');
  btn.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');
}

document.addEventListener('click', function(e) {
  if (nav.classList.contains('is-menu-open') && !nav.contains(e.target)) closeMobileMenu();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && nav.classList.contains('is-menu-open')) closeMobileMenu();
});

/* ── Panel + booking URL routing ─────────────────────── */
window.addEventListener('popstate', function(e) {
  const overlay = document.getElementById('pkgPanelOverlay');
  const modal   = document.getElementById('bookingModal');
  if (e.state && e.state.panel) {
    if (modal) modal.classList.remove('is-open');
    openPanel(e.state.panel);
  } else if (e.state && e.state.booking) {
    if (overlay) { overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); }
    openBooking();
  } else {
    if (overlay) { overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); }
    if (modal)   modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
});

setTimeout(function() {
  const path = window.location.pathname;
  const match = path.match(/^\/book\/([^/]+)/);
  if (match) {
    const type = SLUG_TO_PANEL[match[1]];
    if (type) { openPanel(type); return; }
  }
  if (path === '/book') {
    openBooking();
  }
}, 0);


