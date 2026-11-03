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
  paymentMethod:      '',
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
  _formOpenedAt = Date.now();
  previousFocus = document.activeElement;
  const savedDate = state.date;
  resetState();
  state.date = savedDate;
  if (pkg) state.selectedPackage = pkg;
  state.currentStep = 1;
  updateModalProgress(1);
  renderStep(1);
  document.getElementById('bookingModal').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  history.pushState({ booking: true }, '', '/book');
  setTimeout(() => {
    const first = document.querySelector('#modalPanel button, #modalPanel input');
    if (first) first.focus();
  }, 350);
}

function closeBooking() {
  document.getElementById('bookingModal').classList.remove('is-open');
  document.body.style.overflow = '';
  if (previousFocus) previousFocus.focus();
  if (window.location.pathname === '/book') {
    history.pushState({}, '', '/');
  }
}

/* Close on overlay click */
document.getElementById('bookingModal').addEventListener('click', function(e) {
  if (e.target === this) closeBooking();
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
  state.paymentMethod      = '';
  state.honeypot           = '';
  state.reference          = '';
  state.total              = 0;
}

/* ── Progress ────────────────────────────────────────────── */
const STEP_LABELS = ['How many guests?', 'Pick your date', 'Your details', 'Optional extras', 'Waiver & policies', 'Payment method', 'Review & confirm'];
const STEP_SHORT  = ['Guests', 'Date', 'Details', 'Extras', 'Waiver', 'Payment', 'Review'];

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

/* ── Step renderer ──────────────────────────────────────── */
function renderStep(step) {
  const body    = document.getElementById('modalBody');
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const header  = document.getElementById('modalHeader');
  const footer  = document.getElementById('modalFooter');

  header.style.display = '';
  footer.style.display = '';

  updateModalProgress(step);
  updateFooterTotal();

  backBtn.style.display = step > 1 ? '' : 'none';

  switch (step) {
    case 1: renderStep1(body); nextBtn.textContent = 'Continue →'; break;
    case 2: renderStep2(body); nextBtn.textContent = 'Continue →'; break;
    case 3: renderStep3(body); nextBtn.textContent = 'Continue →'; break;
    case 4: renderStep4(body); nextBtn.textContent = 'Continue →'; break;
    case 5: renderStep5(body); nextBtn.textContent = 'Continue →'; break;
    case 6: renderStep6(body); nextBtn.textContent = 'Continue →'; break;
    case 7: renderStep7(body); nextBtn.textContent = 'Confirm Booking'; break;
  }

  body.scrollTop = 0;
}

/* ── Step 1: Guest count (context-aware) ─────────────────── */
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
    <div class="stepper-group">
      <div class="stepper-group__label stepper-group__label--parent">Big Mable Tube Ride</div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Riders <span class="stepper-row__label-price">$${BIG_MABLE_PRICE} each</span></p>
          <p class="stepper-row__price">Ages 7+ &middot; max 6 per ride</p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="bigMableMinus" onclick="changeCount('bigMableCount',-1)" ${state.bigMableCount === 0 ? 'disabled' : ''}>−</button>
          <span class="stepper__count" id="bigMableCount">${state.bigMableCount}</span>
          <button class="stepper__btn" id="bigMablePlus" onclick="changeCount('bigMableCount',1)" ${state.bigMableCount >= 6 ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </div>
    <div class="price-summary">
      <div class="price-summary__rows">
        <div class="price-summary__row ${state.bigMableCount === 0 ? 'is-hidden' : ''}" id="bigMableSummaryRow">
          <span><span id="bigMableCount2">${state.bigMableCount}</span> x Big Mable Tube Ride</span>
          <strong id="bigMableSummaryAmt">${formatMoney(total)}</strong>
        </div>
      </div>
      <div class="price-summary__total">
        <span class="price-summary__total-label">Total</span>
        <span class="price-summary__total-amount" id="priceSummaryTotal">${formatMoney(calcTotal())}</span>
      </div>
    </div>
  `;
}

function renderStep1Summaz(body) {
  if (state.summazCount === 0) state.summazCount = 1;
  const price = state.summazCount === 2 ? SUMMAZ_PRICE_2 : SUMMAZ_PRICE_1;
  body.innerHTML = `
    <p class="step-sub">A private jet ski stunt ride with Summaz. 1 or 2 riders. Total price is fixed per booking, not per person.</p>
    <div class="stepper-group">
      <div class="stepper-group__label stepper-group__label--parent">The Summaz Experience</div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Riders <span class="stepper-row__label-price">1 rider $200 &middot; 2 riders $275</span></p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="summazMinus" onclick="changeSummazCount(-1)" ${state.summazCount <= 1 ? 'disabled' : ''}>−</button>
          <span class="stepper__count" id="summazCountEl">${state.summazCount}</span>
          <button class="stepper__btn" id="summazPlus" onclick="changeSummazCount(1)" ${state.summazCount >= 2 ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </div>
    <div class="price-summary">
      <div class="price-summary__rows">
        <div class="price-summary__row" id="summazSummaryRow">
          <span>The Summaz Experience &middot; <span id="summazSummaryCount">${state.summazCount}</span> rider${state.summazCount > 1 ? 's' : ''}</span>
          <strong id="summazSummaryAmt">${formatMoney(price)}</strong>
        </div>
      </div>
      <div class="price-summary__total">
        <span class="price-summary__total-label">Total</span>
        <span class="price-summary__total-amount" id="priceSummaryTotal">${formatMoney(price)}</span>
      </div>
    </div>
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

function renderStep1PackagePicker(body) {
  body.innerHTML = `
    <p class="step-sub">Not sure which to pick? Tap any option to read the full details, then book from there.</p>
    <div class="step-pkg-picker">
      <div class="step-pkg-picker__group">
        <div class="step-pkg-picker__label">Family Wave Package</div>
        <button class="step-pkg-card" onclick="selectPackageFromPicker('beachAccess')">
          <div class="step-pkg-card__left">
            <div class="step-pkg-card__name">Beach Access Package</div>
            <div class="step-pkg-card__desc">A full beach day at Arawak Cay. Chairs, kayaks, paddleboards, water toys, and snorkels included. Perfect for families and groups of all ages.</div>
            <div class="step-pkg-card__price">Adults $75 &middot; Children $60</div>
          </div>
          <svg class="step-pkg-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="step-pkg-card" onclick="selectPackageFromPicker('beachAccessJetSki')">
          <div class="step-pkg-card__left">
            <div class="step-pkg-card__name">Beach Access Package + Jet Ski Ride</div>
            <div class="step-pkg-card__desc">Everything in the beach day package plus a solo 25-minute jet ski session on open water. Ideal for adults who want more than the beach.</div>
            <div class="step-pkg-card__price">Adults $150 per person</div>
          </div>
          <svg class="step-pkg-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="step-pkg-picker__group">
        <div class="step-pkg-picker__label">Individuals</div>
        <button class="step-pkg-card" onclick="selectPackageFromPicker('jetSkiRental')">
          <div class="step-pkg-card__left">
            <div class="step-pkg-card__name">Jet Ski Rentals</div>
            <div class="step-pkg-card__desc">No beach day required. Just book a solo jet ski session by duration and go. Riders must be 16 or older.</div>
            <div class="step-pkg-card__price">From $105 per ride</div>
          </div>
          <svg class="step-pkg-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="step-pkg-card" onclick="selectPackageFromPicker('bigMable')">
          <div class="step-pkg-card__left">
            <div class="step-pkg-card__name">Big Mable Tube Ride</div>
            <div class="step-pkg-card__desc">Up to 6 riders on one giant inflatable tube, towed by a jet ski. A 10 to 12 minute group ride. Ages 7 and up.</div>
            <div class="step-pkg-card__price">$45 per person · 2 to 6 riders</div>
          </div>
          <svg class="step-pkg-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="step-pkg-card" onclick="selectPackageFromPicker('summaz')">
          <div class="step-pkg-card__left">
            <div class="step-pkg-card__name">The Summaz Experience</div>
            <div class="step-pkg-card__desc">A private stunt ride with Summaz, professional jet ski racer. Up to 2 riders. The most talked-about booking in Nassau.</div>
            <div class="step-pkg-card__price">$200 for 1 rider &middot; $275 for 2 riders</div>
          </div>
          <svg class="step-pkg-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
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
  body.innerHTML = `
    <p class="step-sub">Pick what each person in your group is getting. Beach access for everyone, jet ski session for whoever wants one.</p>
    <div class="stepper-group">
      <div class="stepper-group__label stepper-group__label--parent">The Family Wave Package</div>
      <div class="stepper-group__label">Beach Access Package</div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Adults <span class="stepper-row__label-price">$${BEACH_ADULT_PRICE}</span></p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="beachAdultMinus" onclick="changeCount('beachAdults',-1)">−</button>
          <span class="stepper__count" id="beachAdultCount">${state.beachAdults}</span>
          <button class="stepper__btn" onclick="changeCount('beachAdults',1)">+</button>
        </div>
      </div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Children <span class="stepper-row__label-price">$${BEACH_CHILD_PRICE}</span></p>
          <p class="stepper-row__sub">Under 12</p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="beachChildMinus" onclick="changeCount('beachChildren',-1)">−</button>
          <span class="stepper__count" id="beachChildCount">${state.beachChildren}</span>
          <button class="stepper__btn" onclick="changeCount('beachChildren',1)">+</button>
        </div>
      </div>
      <div class="stepper-group__label" style="margin-top:10px">Beach Access Package + Jet Ski Ride</div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Adults <span class="stepper-row__label-price">$${JETSKI_ADULT_PRICE}</span></p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="jetSkiAdultMinus" onclick="changeCount('jetSkiAdults',-1)">−</button>
          <span class="stepper__count" id="jetSkiAdultCount">${state.jetSkiAdults}</span>
          <button class="stepper__btn" onclick="changeCount('jetSkiAdults',1)">+</button>
        </div>
      </div>
    </div>
    <div class="price-summary">
      <div class="price-summary__rows">
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
      </div>
      <div class="price-summary__total">
        <span class="price-summary__total-label">Total</span>
        <span class="price-summary__total-amount" id="priceSummaryTotal">${formatMoney(calcTotal())}</span>
      </div>
    </div>
  `;
}

function renderStep1BeachAccessOnly(body) {
  const baAmt = state.beachAdults  * BEACH_ADULT_PRICE;
  const bcAmt = state.beachChildren * BEACH_CHILD_PRICE;
  body.innerHTML = `
    <p class="step-sub">Beach Access Package. How many adults and children in your group?</p>
    <div class="stepper-group">
      <div class="stepper-group__label stepper-group__label--parent">Beach Access Package</div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Adults <span class="stepper-row__label-price">$${BEACH_ADULT_PRICE}</span></p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="beachAdultMinus" onclick="changeCount('beachAdults',-1)">−</button>
          <span class="stepper__count" id="beachAdultCount">${state.beachAdults}</span>
          <button class="stepper__btn" onclick="changeCount('beachAdults',1)">+</button>
        </div>
      </div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Children <span class="stepper-row__label-price">$${BEACH_CHILD_PRICE}</span></p>
          <p class="stepper-row__sub">Under 12</p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="beachChildMinus" onclick="changeCount('beachChildren',-1)">−</button>
          <span class="stepper__count" id="beachChildCount">${state.beachChildren}</span>
          <button class="stepper__btn" onclick="changeCount('beachChildren',1)">+</button>
        </div>
      </div>
    </div>
    <div class="price-summary">
      <div class="price-summary__rows">
        <div class="price-summary__row ${state.beachAdults === 0 ? 'is-hidden' : ''}" id="beachAdultSummaryRow">
          <span><span id="beachAdultSummaryCount">${state.beachAdults}</span> x Beach Access Package (Adults)</span>
          <strong id="beachAdultSummaryAmt">${formatMoney(baAmt)}</strong>
        </div>
        <div class="price-summary__row ${state.beachChildren === 0 ? 'is-hidden' : ''}" id="beachChildSummaryRow">
          <span><span id="beachChildSummaryCount">${state.beachChildren}</span> x Beach Access Package (Children)</span>
          <strong id="beachChildSummaryAmt">${formatMoney(bcAmt)}</strong>
        </div>
      </div>
      <div class="price-summary__total">
        <span class="price-summary__total-label">Total</span>
        <span class="price-summary__total-amount" id="priceSummaryTotal">${formatMoney(calcTotal())}</span>
      </div>
    </div>
  `;
}

function renderStep1JetSkiRideOnly(body) {
  const jsAmt = state.jetSkiAdults * JETSKI_ADULT_PRICE;
  body.innerHTML = `
    <p class="step-sub">Beach Access Package + Jet Ski Ride. Adults only, $${JETSKI_ADULT_PRICE} per person. Includes a full beach day plus a 25-minute solo jet ski session.</p>
    <div class="stepper-group">
      <div class="stepper-group__label stepper-group__label--parent">Beach Access Package + Jet Ski Ride</div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Adults <span class="stepper-row__label-price">$${JETSKI_ADULT_PRICE}</span></p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="jetSkiAdultMinus" onclick="changeCount('jetSkiAdults',-1)">−</button>
          <span class="stepper__count" id="jetSkiAdultCount">${state.jetSkiAdults}</span>
          <button class="stepper__btn" onclick="changeCount('jetSkiAdults',1)">+</button>
        </div>
      </div>
    </div>
    <div class="price-summary">
      <div class="price-summary__rows">
        <div class="price-summary__row ${state.jetSkiAdults === 0 ? 'is-hidden' : ''}" id="jetSkiAdultSummaryRow">
          <span><span id="jetSkiAdultSummaryCount">${state.jetSkiAdults}</span> x Beach Access Package + Jet Ski Ride</span>
          <strong id="jetSkiAdultSummaryAmt">${formatMoney(jsAmt)}</strong>
        </div>
      </div>
      <div class="price-summary__total">
        <span class="price-summary__total-label">Total</span>
        <span class="price-summary__total-amount" id="priceSummaryTotal">${formatMoney(calcTotal())}</span>
      </div>
    </div>
  `;
}

function renderStep1JetSkiRental(body) {
  body.innerHTML = `
    <p class="step-sub">Add each rider and choose their session duration. Your total is the sum of all riders.</p>
    <div class="stepper-group">
      <div class="stepper-group__label stepper-group__label--parent">Jet Ski Rentals</div>
      <div class="stepper-row">
        <div class="stepper-row__info">
          <p class="stepper-row__label">Riders <span class="stepper-row__label-price" style="font-size:11.5px;font-weight:500;color:var(--text-muted)">16+ only</span></p>
        </div>
        <div class="stepper">
          <button class="stepper__btn" id="jsrRiderMinus" onclick="jsrChangeCount(-1)" ${state.jetSkiRentalSlots.length === 0 ? 'disabled' : ''}>−</button>
          <span class="stepper__count" id="jsrRiderCount">${state.jetSkiRentalSlots.length}</span>
          <button class="stepper__btn" onclick="jsrChangeCount(1)">+</button>
        </div>
      </div>
    </div>
    <div id="jsrSlotsContainer">${jsrSlotsHTML()}</div>
    <div class="price-summary">
      <div class="price-summary__rows" id="jsrSummaryRows">${jsrSummaryRowsHTML()}</div>
      <div class="price-summary__total">
        <span class="price-summary__total-label">Total</span>
        <span class="price-summary__total-amount" id="priceSummaryTotal">${formatMoney(calcTotal())}</span>
      </div>
    </div>
  `;
}

function jsrSlotsHTML() {
  if (state.jetSkiRentalSlots.length === 0) return '';
  return state.jetSkiRentalSlots.map((slot, i) => `
    <div class="ps-rider-slot" id="jsrModalSlot${i}">
      <div class="ps-rider-slot__label">Rider ${i + 1}</div>
      <div class="ps-rider-slot__options">
        <button class="ps-rider-slot__opt ${slot.duration === 30 ? 'is-selected' : ''}" data-duration="30" onclick="jsrSetDuration(${i},30)">30 min<br>$105</button>
        <button class="ps-rider-slot__opt ${slot.duration === 45 ? 'is-selected' : ''}" data-duration="45" onclick="jsrSetDuration(${i},45)">45 min<br>$125</button>
        <button class="ps-rider-slot__opt ${slot.duration === 60 ? 'is-selected' : ''}" data-duration="60" onclick="jsrSetDuration(${i},60)">60 min<br>$190</button>
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
    slotEl.querySelectorAll('.ps-rider-slot__opt').forEach(btn => {
      btn.classList.toggle('is-selected', parseInt(btn.dataset.duration) === dur);
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
  document.getElementById('priceSummaryTotal').textContent = formatMoney(calcTotal());
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
    <p class="step-sub">We're open daily, 10am to 6pm. No timed slots. Arrive any time.</p>
    <input
      class="date-input"
      type="date"
      id="bookingDate"
      min="${today}"
      value="${state.date || ''}"
      onchange="state.date = this.value"
      aria-label="Select visit date"
    >
    <p class="date-hint">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Dates are set in Nassau, Bahamas time. No timezone confusion.
    </p>
  `;
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

  const bundleSection = showBigMableBundle() ? `
    <div class="step-segment">
      <p class="step-segment__title">Add to your booking</p>
      <p class="step-segment__sub">Charged now and included in your total.</p>
      <div class="addon-bundle-card ${isChecked ? 'is-checked' : ''}" onclick="toggleBigMableAddon(this)">
        <img class="addon-bundle-card__photo" src="https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_160,h_160,g_auto/v1782304570/summaz/clip4-poster.jpg" alt="Big Mable Tube Ride">
        <div class="addon-bundle-card__body">
          <p class="addon-bundle-card__name">Big Mable Tube Ride</p>
          <p class="addon-bundle-card__desc">Up to 6 riders on one giant inflatable tube, towed by a jet ski. About 10 to 12 minutes. Ages 7 and up.</p>
          <p class="addon-bundle-card__price">$${BIG_MABLE_PRICE} <em>/ per person</em></p>
        </div>
        <div class="addon-bundle-card__check">
          <input type="checkbox" ${isChecked ? 'checked' : ''} aria-label="Add Big Mable Tube Ride">
          <div class="addon-bundle-card__box">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
      </div>
      <div class="addon-bundle-counter ${isChecked ? 'is-visible' : ''}" id="bigMableAddonCounter">
        <p class="addon-bundle-counter__label">How many riders?</p>
        <div class="addon-bundle-counter__ctrl">
          <button class="counter-btn" onclick="changeBigMableAddonCount(-1); event.stopPropagation()">-</button>
          <span class="counter-val" id="bigMableAddonVal">${state.bigMableAddon || 2}</span>
          <button class="counter-btn" onclick="changeBigMableAddonCount(1); event.stopPropagation()">+</button>
        </div>
        <span class="addon-bundle-counter__total" id="bigMableAddonTotal">${formatMoney((state.bigMableAddon || 2) * BIG_MABLE_PRICE)}</span>
      </div>
    </div>
  ` : '';

  const checks = ADDON_LIST.map(a => `
    <label class="addon-check ${state.addons.includes(a.id) ? 'is-checked' : ''}" onclick="toggleAddon('${a.id}', this, event)">
      <input type="checkbox" ${state.addons.includes(a.id) ? 'checked' : ''} aria-label="${a.label}">
      <div class="addon-check__box">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="addon-check__info">
        <p class="addon-check__label">${a.label}</p>
        <p class="addon-check__note">${a.note}</p>
      </div>
      <span class="addon-check__tag">${a.tag}</span>
    </label>
  `).join('');

  body.innerHTML = `
    ${bundleSection}
    <div class="step-segment">
      <p class="step-segment__title">Let us know your interests</p>
      <p class="step-segment__sub">Tick anything you might want. All paid and arranged on-site. Our team will follow up when you arrive.</p>
      <div class="addon-check-list">${checks}</div>
    </div>
    <div class="form-group" style="margin-top:4px">
      <label class="form-label" for="bookingNotes">Anything else to mention?</label>
      <textarea class="notes-textarea" id="bookingNotes" placeholder="Special requests, accessibility needs, questions for the team…" oninput="state.notes = this.value">${escHtml(state.notes)}</textarea>
    </div>
  `;
}

function toggleBigMableAddon(cardEl) {
  const isNowChecked = state.bigMableAddon === 0;
  if (isNowChecked) {
    state.bigMableAddon = 2;
    cardEl.classList.add('is-checked');
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
  updateFooterTotal();
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
}

/* ── Step 5: Waiver ──────────────────────────────────────── */
function renderStep5(body) {
  body.innerHTML = `
    <p class="step-sub">Please read the terms below and confirm before continuing.</p>
    <div class="waiver-box">
      <p><strong>Liability Waiver &amp; Terms</strong></p>
      <br>
      <p>Water sports involve inherent risk. By proceeding, you acknowledge that all guests will participate at their own risk and agree to follow safety guidelines provided by our crew. Life jackets and safety briefings are provided for all guests. Summaz Escape reserves the right to cancel or postpone bookings due to adverse weather conditions with a full refund or reschedule.</p>
    </div>
    <label class="policy-check ${state.policyAccepted ? 'is-checked' : ''}" onclick="togglePolicy(this, event)">
      <input type="checkbox" id="policyCheckbox" ${state.policyAccepted ? 'checked' : ''} aria-label="Policy agreement">
      <div class="policy-check__box">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p class="policy-check__text">
        I have read and accept the <a href="terms-and-conditions.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Terms &amp; Conditions</a>, <a href="refunds-and-cancellation.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Cancellation Policy</a>, and <a href="privacy-policy.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Privacy Policy</a>. I confirm all guests meet minimum age requirements.
      </p>
    </label>
    <p class="form-error is-visible" id="policyErr" style="display:none;margin-top:8px">You must accept the terms to continue.</p>
  `;
}

function togglePolicy(labelEl, event) {
  if (event) event.preventDefault(); // stop label from double-firing the checkbox
  state.policyAccepted = !state.policyAccepted;
  labelEl.classList.toggle('is-checked', state.policyAccepted);
  labelEl.querySelector('input[type="checkbox"]').checked = state.policyAccepted;
  const err = document.getElementById('policyErr');
  if (err) err.style.display = 'none';
}

/* ── Step 6: Payment method ──────────────────────────────── */
function renderStep6(body) {
  const methods = [
    {
      id: 'zelle', label: 'Zelle', tag: 'Send to anel@summazescape.com · or scan QR in your bank app',
      icon: '<img src="https://res.cloudinary.com/dko76z0df/image/upload/v1782304826/summaz/zelle-logo.png" class="payment-option__logo" alt="Zelle">'
    },
    {
      id: 'venmo', label: 'Venmo', tag: 'Pay via @summaz-escape · by username, link, or QR scan',
      icon: '<img src="https://res.cloudinary.com/dko76z0df/image/upload/v1782304825/summaz/venmo-logo.png" class="payment-option__logo" alt="Venmo">'
    },
    {
      id: 'arrival', label: 'Pay on Arrival', tag: 'Credit card machine on-site',
      icon: '<svg viewBox="0 0 24 16" width="34" height="23" fill="none" aria-hidden="true"><rect x=".5" y=".5" width="23" height="15" rx="2" fill="#0F172A" stroke="#334155"/><rect y="4" width="24" height="4" fill="#1E293B"/><rect x="2" y="10" width="6" height="4" rx="1" fill="#475569"/><circle cx="19.5" cy="12" r="2" fill="#EF4444" opacity=".75"/><circle cx="17" cy="12" r="2" fill="#F97316" opacity=".75"/></svg>'
    }
  ];

  const options = methods.map(m => `
    <label class="payment-option ${state.paymentMethod === m.id ? 'is-selected' : ''}" onclick="selectPayment('${m.id}', this)">
      <input type="radio" name="paymentMethod" value="${m.id}" ${state.paymentMethod === m.id ? 'checked' : ''}>
      <div class="payment-option__radio"><div class="payment-option__radio-dot"></div></div>
      <div class="payment-option__icon">${m.icon}</div>
      <div class="payment-option__info">
        <p class="payment-option__name">${m.label}</p>
        <span class="payment-option__tag">${m.tag}</span>
      </div>
    </label>
  `).join('');

  body.innerHTML = `
    <p class="step-sub">Zelle and Venmo are settled after booking. You'll receive full instructions and a QR code on the next screen and by email. Pay on Arrival means a card machine at the beach.</p>
    <div class="payment-options">${options}</div>
    <div class="payment-note is-arrival" id="arrivalNote">
      You'll pay by credit card machine when you arrive. Our team will call to confirm your booking shortly after you submit.
    </div>
    <p class="form-error" id="paymentErr" style="margin-top:8px">Please select a payment method.</p>
  `;
  if (state.paymentMethod === 'arrival') updatePaymentNotes('arrival');
}

function selectPayment(id, labelEl) {
  state.paymentMethod = id;
  document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('is-selected'));
  labelEl.classList.add('is-selected');
  labelEl.querySelector('input[type="radio"]').checked = true;
  updatePaymentNotes(id);
  const err = document.getElementById('paymentErr');
  if (err) err.style.display = 'none';
}

function updatePaymentNotes(id) {
  ['zelleNote','venmoNote','arrivalNote'].forEach(n => {
    const el = document.getElementById(n);
    if (el) el.classList.remove('is-visible');
  });
  const map = { zelle: 'zelleNote', venmo: 'venmoNote', arrival: 'arrivalNote' };
  const target = document.getElementById(map[id]);
  if (target) target.classList.add('is-visible');
}

/* ── Step 7: Review ──────────────────────────────────────── */
function renderStep7(body) {
  const total = calcTotal();
  const addonLabels = state.addons.map(id => {
    const a = ADDON_LIST.find(x => x.id === id);
    return a ? a.label : id;
  });
  const paymentLabel = { zelle: 'Zelle', venmo: 'Venmo', arrival: 'Pay on Arrival' };
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
    <p class="step-sub">Everything look right? Hit Confirm Booking when you're ready.</p>
    <div class="submit-error" id="submitError"></div>
    <div class="review-card">
      <div class="review-card__head">Booking Details</div>
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
    <div class="review-card">
      <div class="review-card__head">Your Details</div>
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
          <span class="review-row__value">${paymentLabel[state.paymentMethod] || 'Not selected'}</span>
        </div>
      </div>
    </div>
  `;
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
        alert('Please select a date for your visit.');
        document.getElementById('bookingDate')?.focus();
        return false;
      }
      if (state.date < todayInBahamas()) {
        alert('Please select today or a future date.');
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

    case 6:
      if (!state.paymentMethod) {
        const err = document.getElementById('paymentErr');
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

  if (state.currentStep === 7) {
    submitBooking();
    return;
  }

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
    paymentMethod:  state.paymentMethod,
    total:          calcTotal(),
    honeypot:       state.honeypot,
    elapsed:        Date.now() - _formOpenedAt
  };

  const scriptUrl = window.SUMMAZ_CONFIG?.scriptUrl;

  if (!scriptUrl || scriptUrl === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
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
  state.reference = data.reference;
  state.total     = data.total || calcTotal();

  const cfg    = window.SUMMAZ_CONFIG || {};
  const method = state.paymentMethod;
  const ref    = data.reference;
  const total  = formatMoney(state.total);

  const dateDisplay = state.date
    ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : '';

  let instructions = '';
  if (method === 'zelle') {
    instructions = `
      <div class="confirmation__instructions">
        <p>Open Zelle and send <strong>${total}</strong> to <strong>${escHtml(cfg.zelle)}</strong>. Or scan the QR code below in your bank's app to send the payment directly into our Zelle:</p>
        <img src="${escHtml(cfg.zelleQr)}" alt="Zelle QR code" class="confirmation__qr">
        <p style="margin-top:16px;font-weight:600;">Then send us your payment screenshot:</p>
        <ol>
          <li>Reply to your confirmation email with your screenshot attached. In the message body write: <strong>Payment for ${escHtml(ref)}</strong></li>
          <li>Or send a new email to <strong><a href="mailto:${cfg.bookingEmail}">${cfg.bookingEmail}</a></strong> with subject <strong>Payment for ${escHtml(ref)}</strong> and your screenshot attached.</li>
        </ol>
        <p style="margin-top:10px;font-size:13px;color:var(--text-muted);">Your reservation holds for 24 hours. Once we receive your screenshot, we'll confirm your booking.</p>
      </div>
    `;
  } else if (method === 'venmo') {
    instructions = `
      <div class="confirmation__instructions">
        <p>Send <strong>${total}</strong> to <strong>${escHtml(cfg.venmo)}</strong> on Venmo. You can also <a href="${cfg.venmoUrl}" target="_blank" rel="noopener" style="color:#0077B6;">click here to open Venmo</a>, or scan the QR code below to pay directly:</p>
        <img src="${escHtml(cfg.venmoQr)}" alt="Venmo QR code" class="confirmation__qr">
        <p style="margin-top:16px;font-weight:600;">Then send us your payment screenshot:</p>
        <ol>
          <li>Reply to your confirmation email with your screenshot attached. In the message body write: <strong>Payment for ${escHtml(ref)}</strong></li>
          <li>Or send a new email to <strong><a href="mailto:${cfg.bookingEmail}">${cfg.bookingEmail}</a></strong> with subject <strong>Payment for ${escHtml(ref)}</strong> and your screenshot attached.</li>
        </ol>
        <p style="margin-top:10px;font-size:13px;color:var(--text-muted);">Your reservation holds for 24 hours. Once we receive your screenshot, we'll confirm your booking.</p>
      </div>
    `;
  } else {
    instructions = `
      <div class="confirmation__instructions">
        <p>Your spot is reserved. No payment needed until you arrive. Bring your card on the day.</p>
        <p style="margin-top:12px;font-weight:600;">To confirm your place:</p>
        <ol>
          <li>Reply to your confirmation email with <strong>Confirmed ${escHtml(ref)}</strong> in the message body.</li>
          <li>Or email <strong><a href="mailto:${cfg.bookingEmail}">${cfg.bookingEmail}</a></strong> with subject <strong>Confirmed ${escHtml(ref)}</strong>.</li>
        </ol>
      </div>
    `;
  }

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
          <div class="confirmation__meta-value">${{ zelle: 'Zelle', venmo: 'Venmo', arrival: 'On Arrival' }[method] || 'Not set'}</div>
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
    if (prev) prev.disabled = track.scrollLeft <= 4;
    if (next) next.disabled = atCarouselEnd(track);
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

/* ── Carousel autoplay (reviews + Instagram feed) ───────────
   One card every few seconds, back to the start at the end.
   Pauses while hovered, touched, focused or off screen. */
(function() {
  if (prefersReducedMotion) return;
  [['reviewsTrack', 5000], ['feed', 4000]].forEach(([id, every]) => {
    const host = id === 'feed' ? document.getElementById('reels') : document.getElementById(id);
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
    document.body.style.overflow = '';
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

function openPanel(type) {
  panel.type               = type;
  panel.beachAdults        = 0;
  panel.beachChildren      = 0;
  panel.jetSkiAdults       = 0;
  panel.jetSkiRentalAdults = 0;
  panel.jetSkiRentalSlots  = [];
  panel.bigMableCount      = 0;
  panel.summazCount        = 1;
  panel.date               = '';

  const breadcrumbMap = {
    beachAccess:       'Beach Access Package',
    beachAccessJetSki: 'Beach Access Package + Jet Ski Ride',
    jetSkiRental:      'Jet Ski Rentals',
    bigMable:          'Big Mable Tube Ride',
    summaz:            'The Summaz Experience'
  };
  const bc = document.getElementById('pkgPanelBreadcrumb');
  if (bc) bc.textContent = breadcrumbMap[type] || '';

  document.getElementById('pkgPanelContent').innerHTML = buildPanelContent(type);

  // Only populate sidebar on desktop; mobile uses the bottom sheet
  if (window.innerWidth > 768) {
    document.getElementById('pkgPanelSidebar').innerHTML = buildPanelSidebar(type);
  } else {
    document.getElementById('pkgPanelSidebar').innerHTML = '';
  }

  const overlay = document.getElementById('pkgPanelOverlay');
  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  history.pushState({ panel: type }, '', '/book/' + (PANEL_SLUGS[type] || type));
}

function closePanel() {
  closePanelSheet();
  document.getElementById('pkgPanelOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
  if (window.location.pathname.startsWith('/book/')) {
    history.pushState({}, '', '/');
  }
}

function panelOverlayClick(e) {
  if (e.target === document.getElementById('pkgPanelOverlay')) closePanel();
}

function openPanelSheet() {
  const body = document.getElementById('panelSheetBody');
  if (body) body.innerHTML = buildPanelSidebar(panel.type);
  document.getElementById('panelSheetOverlay').classList.add('is-open');
}

function closePanelSheet() {
  const overlay = document.getElementById('panelSheetOverlay');
  if (overlay) overlay.classList.remove('is-open');
}

function panelSheetOverlayClick(e) {
  if (e.target === document.getElementById('panelSheetOverlay')) closePanelSheet();
}

/* ── Panel content builders ─────────────────────────────── */
function buildPanelContent(type) {
  switch (type) {
    case 'beachAccess':       return panelContentBeachAccess();
    case 'beachAccessJetSki': return panelContentBeachAccessJetSki();
    case 'jetSkiRental':      return panelContentJetSkiRental();
    case 'bigMable':          return panelContentBigMable();
    case 'summaz':            return panelContentSummaz();
    default: return '';
  }
}

function buildPanelSidebar(type) {
  if (type === 'summaz')       return panelSidebarSummaz();
  if (type === 'jetSkiRental') return panelSidebarJetSkiRental();
  if (type === 'bigMable')     return panelSidebarBigMable();
  return panelSidebarFamilyWave();
}

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
  { src: 'https://res.cloudinary.com/dko76z0df/video/upload/v1782304538/summaz/clip11.mp4', poster: 'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1782304519/summaz/clip11-poster.jpg' }
];

function galleryHTML(photos) {
  return '<div class="panel-gallery">' + photos.map((src, i) =>
    `<div class="panel-gallery__item" onclick="openImgLightbox('${src}')"><img src="${src}" alt="Photo ${i+1}" loading="lazy"></div>`
  ).join('') + '</div>';
}

function experienceHTML(videos) {
  return '<div class="panel-gallery panel-gallery--video">' + videos.map((v, i) =>
    `<div class="panel-gallery__item panel-gallery__item--video" onclick="openPanelVideo('${v.src}')">
      <img src="${v.poster}" alt="Video ${i+1}" loading="lazy">
      <div class="panel-video-play"><svg viewBox="0 0 24 24" width="36" height="36"><circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.52)"/><polygon points="10,8 10,16 17,12" fill="white"/></svg></div>
    </div>`
  ).join('') + '</div>';
}

function panelContentBeachAccess() {
  return `
    <span class="panel__cat-badge panel__cat-badge--family">Family Wave Package</span>
    <h2 class="panel__title">Beach Access Package</h2>
    <div class="panel__desc">
      <p>A full day at Arawak Cay. Beach chairs, water gear, and clear Caribbean water. Arrive any time between 10am and 6pm. No timed slots.</p>
      <p>Great for families, couples, and groups. Kids can play with floaties and water scooters while adults take out the kayaks or paddleboards. Bottled water is included and restrooms are on-site.</p>
      <p>Note: jet ski rides are not included in this package. If some of your group wants to get on the water, book those people on the Beach Access + Jet Ski Ride option instead.</p>
    </div>
    <span class="panel__section-label">What's Included</span>
    <ul class="panel__included-list">
      <li class="panel__included-item">Beach chairs and umbrella</li>
      <li class="panel__included-item">Kayaks</li>
      <li class="panel__included-item">Paddleboards</li>
      <li class="panel__included-item">Water scooters</li>
      <li class="panel__included-item">Snorkel masks</li>
      <li class="panel__included-item">Floaties</li>
      <li class="panel__included-item">Water hammock</li>
      <li class="panel__included-item">Bottled water</li>
      <li class="panel__included-item">Restrooms on-site</li>
      <li class="panel__included-item">Lifeguard on duty</li>
    </ul>
    <span class="panel__section-label">Photos</span>
    ${galleryHTML(PANEL_GALLERY_BEACH)}
    <span class="panel__section-label">Experience</span>
    ${experienceHTML(PANEL_VIDEOS_BEACH)}
    <span class="panel__section-label">Questions</span>
    <div class="panel-faq">
      <details class="panel-faq-item">
        <summary>What time should we arrive?</summary>
        <p>Any time between 10am and 6pm. No timed slots. Arrive when it works for your group.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Are children able to join?</summary>
        <p>Yes, absolutely. The Beach Access Package is open to all ages, no restrictions.</p>
      </details>
      <details class="panel-faq-item">
        <summary>What counts as a child for pricing?</summary>
        <p>Anyone under 12 books as a child at $60. Ages 12 and up are booked as adults at $75. If you're not sure, go with the age they'll be on the day of the visit.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Is food available on-site?</summary>
        <p>The Bay restaurant is located at the venue. You can order food and drinks at any point during your visit.</p>
      </details>
      <details class="panel-faq-item">
        <summary>What should we bring?</summary>
        <p>Swimwear, sunscreen, and a valid ID. Towels and extra sunscreen are recommended. Bottled water is included.</p>
      </details>
    </div>
  `;
}

function panelContentBeachAccessJetSki() {
  return `
    <span class="panel__cat-badge panel__cat-badge--family">Family Wave Package</span>
    <h2 class="panel__title">Beach Access Package + Jet Ski Ride</h2>
    <div class="panel__desc">
      <p>Everything in the Beach Access Package plus a solo 25-minute jet ski session on the open water. Book this for anyone in your group who wants to get out on the water.</p>
      <p>Your group can mix. Some people on the Beach Access Package for the day, others on Beach Access + Jet Ski Ride. You choose what each person is getting when you book.</p>
    </div>
    <span class="panel__section-label">What's Included</span>
    <ul class="panel__included-list">
      <li class="panel__included-item">Beach chairs and umbrella</li>
      <li class="panel__included-item">Kayaks</li>
      <li class="panel__included-item">Paddleboards</li>
      <li class="panel__included-item">Water scooters</li>
      <li class="panel__included-item">Snorkel masks</li>
      <li class="panel__included-item">Floaties</li>
      <li class="panel__included-item">Water hammock</li>
      <li class="panel__included-item">Bottled water</li>
      <li class="panel__included-item">25-min solo jet ski session</li>
      <li class="panel__included-item">Life jacket provided</li>
    </ul>
    <span class="panel__section-label">Photos</span>
    ${galleryHTML(PANEL_GALLERY_BEACH)}
    <span class="panel__section-label">Experience</span>
    ${experienceHTML([...PANEL_VIDEOS_JETSKI, ...PANEL_VIDEOS_BEACH])}
    <span class="panel__section-label">Questions</span>
    <div class="panel-faq">
      <details class="panel-faq-item">
        <summary>Is there a minimum age for the jet ski?</summary>
        <p>Riders must be 16 or older to operate a jet ski. Anyone under 16 in your group should be booked on the Beach Access Package instead.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Can I add someone to the jet ski after I arrive?</summary>
        <p>Yes. You can arrange extra jet ski time with the team on-site.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Is the jet ski session guided?</summary>
        <p>Our crew rides alongside you. They'll show you the route and make sure the experience is safe and enjoyable.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Can children join the beach access portion?</summary>
        <p>Yes. Book those guests on the Beach Access Package at $60 each and the adults who want the jet ski on the Beach Access + Jet Ski Ride option.</p>
      </details>
    </div>
  `;
}

function panelContentJetSkiRental() {
  return `
    <span class="panel__cat-badge panel__cat-badge--solo">Individuals</span>
    <h2 class="panel__title">Jet Ski Rentals</h2>
    <div class="panel__desc">
      <p>A standalone jet ski session right off Arawak Cay. No beach day needed, just pick your duration and get on the water.</p>
      <p>This package is for adults. You need to be 16 or older to take the wheel. Bringing younger family or friends? That's totally fine. Each jet ski has two seats, so they can ride along with you tandem at no extra charge. Just book for the adult rider and bring whoever you want on the back.</p>
    </div>
    <span class="panel__section-label">Pricing</span>
    <div class="panel-tiers">
      <div class="panel-tier">
        <div class="panel-tier__dur">30 min</div>
        <div class="panel-tier__price">$105</div>
        <div class="panel-tier__price-sub">per rider</div>
      </div>
      <div class="panel-tier">
        <div class="panel-tier__dur">45 min</div>
        <div class="panel-tier__price">$125</div>
        <div class="panel-tier__price-sub">per rider</div>
      </div>
      <div class="panel-tier">
        <div class="panel-tier__dur">60 min</div>
        <div class="panel-tier__price">$190</div>
        <div class="panel-tier__price-sub">per rider</div>
      </div>
    </div>
    <span class="panel__section-label">What's Included</span>
    <ul class="panel__included-list">
      <li class="panel__included-item">Jet ski session (solo or tandem, no extra charge)</li>
      <li class="panel__included-item">Life jacket provided</li>
      <li class="panel__included-item">Crew guidance on the water</li>
      <li class="panel__included-item">No beach access required</li>
    </ul>
    <span class="panel__section-label">Photos</span>
    ${galleryHTML([...PANEL_GALLERY_JETSKI, ...PANEL_GALLERY_BEACH])}
    <span class="panel__section-label">Experience</span>
    ${experienceHTML(PANEL_VIDEOS_JETSKI)}
    <span class="panel__section-label">Questions</span>
    <div class="panel-faq">
      <details class="panel-faq-item">
        <summary>What is the minimum age to ride?</summary>
        <p>Riders must be 16 or older. No exceptions.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Do I need to book in advance?</summary>
        <p>Booking ahead is strongly recommended, especially on weekends. Walk-ins depend on availability.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Can someone ride with me on the same jet ski?</summary>
        <p>Yes. Each jet ski seats two, so tandem riding is completely fine and there's no extra charge for a passenger. You only book and pay for the rider who's driving. Perfect if you're bringing along a younger family member or someone who just wants to come along for the ride.</p>
      </details>
      <details class="panel-faq-item">
        <summary>What if the weather is bad on my date?</summary>
        <p>If we need to cancel due to weather, you'll be offered a full reschedule or refund. We'll contact you in advance.</p>
      </details>
    </div>
  `;
}

function panelContentSummaz() {
  return `
    <span class="panel__cat-badge panel__cat-badge--solo">Individuals</span>
    <h2 class="panel__title">The Summaz Experience</h2>
    <div class="panel__desc">
      <p>Summaz is a professional jet ski racer. This is not a guided tour or a casual ride. You sit on the back, he takes you out on the open water, and he does things that will make your heart stop. Flips, sharp turns, full speed runs. Every minute of it is content.</p>
      <p>1 or 2 riders per session. The price is fixed per booking. If you bring someone along, you split one of the best experiences Nassau has to offer. If you go solo, it is entirely yours.</p>
    </div>
    <span class="panel__section-label">Pricing</span>
    <div class="panel-tiers">
      <div class="panel-tier">
        <div class="panel-tier__dur">1 Rider</div>
        <div class="panel-tier__price">$200</div>
        <div class="panel-tier__price-sub">per booking</div>
      </div>
      <div class="panel-tier">
        <div class="panel-tier__dur">2 Riders</div>
        <div class="panel-tier__price">$275</div>
        <div class="panel-tier__price-sub">per booking</div>
      </div>
    </div>
    <span class="panel__section-label">What's Included</span>
    <ul class="panel__included-list">
      <li class="panel__included-item">Private jet ski session with Summaz</li>
      <li class="panel__included-item">Stunts and open water maneuvers</li>
      <li class="panel__included-item">1 or 2 riders per session</li>
      <li class="panel__included-item">Life jacket provided</li>
    </ul>
    <span class="panel__section-label">Photos</span>
    ${galleryHTML([
      'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1786733750/summaz/summaz-exp-card.jpg',
      'https://res.cloudinary.com/dko76z0df/image/upload/c_fill,w_640,h_480,g_auto/v1782304519/summaz/clip11-poster.jpg'
    ])}
    <span class="panel__section-label">Experience</span>
    ${experienceHTML(PANEL_VIDEOS_SUMMAZ)}
    <span class="panel__section-label">Questions</span>
    <div class="panel-faq">
      <details class="panel-faq-item">
        <summary>How long is the session?</summary>
        <p>Sessions run around 15 to 20 minutes. The exact time depends on conditions and what Summaz decides to do out there. It feels shorter than it sounds.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Can 2 people ride at the same time?</summary>
        <p>Yes. The jet ski fits 2 riders. You book for 2 at $275 and both ride together for the full session. You do not get separate sessions at the 2-rider price.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Is it safe?</summary>
        <p>Summaz is a professional. He knows exactly how far to take it while keeping riders secure on the ski. Life jackets are worn for the full session.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Can I bring my phone or camera?</summary>
        <p>You can try, but the best shots come from someone filming from the shore or dock. Things happen fast on the water and phones do not survive every ride.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Is there a minimum age?</summary>
        <p>Riders should be adults. If you are bringing a younger passenger, reach out to us at booking@summazescape.com before booking so we can confirm suitability.</p>
      </details>
    </div>
  `;
}

/* ── Panel sidebars ─────────────────────────────────────── */
function panelSidebarFamilyWave() {
  const today = todayInBahamas();
  return `
    <div class="ps-title">Family Wave Package</div>
    <div class="ps-subtitle">Mix and match for your group</div>
    <span class="ps-section-label">Beach Access Package</span>
    <div class="ps-counter-row" style="border-top:1px solid #e5e9ef">
      <div>
        <div class="ps-counter-name">Adults</div>
        <div class="ps-counter-price">$${BEACH_ADULT_PRICE} per person</div>
      </div>
      <div class="ps-stepper">
        <button class="ps-stepper-btn" id="psFWBeachAdultMinus" onclick="panelCount('beachAdults',-1)" ${panel.beachAdults <= 0 ? 'disabled' : ''}>−</button>
        <span class="ps-stepper-count" id="psFWBeachAdultCount">${panel.beachAdults}</span>
        <button class="ps-stepper-btn" onclick="panelCount('beachAdults',1)">+</button>
      </div>
    </div>
    <div class="ps-counter-row">
      <div>
        <div class="ps-counter-name">Children</div>
        <div class="ps-counter-price">$${BEACH_CHILD_PRICE} per person</div>
        <div class="ps-counter-sub">Under 12</div>
      </div>
      <div class="ps-stepper">
        <button class="ps-stepper-btn" id="psFWBeachChildMinus" onclick="panelCount('beachChildren',-1)" ${panel.beachChildren <= 0 ? 'disabled' : ''}>−</button>
        <span class="ps-stepper-count" id="psFWBeachChildCount">${panel.beachChildren}</span>
        <button class="ps-stepper-btn" onclick="panelCount('beachChildren',1)">+</button>
      </div>
    </div>
    <span class="ps-section-label">Beach Access Package + Jet Ski Ride</span>
    <div class="ps-counter-row" style="border-top:1px solid #e5e9ef">
      <div>
        <div class="ps-counter-name">Adults</div>
        <div class="ps-counter-price">$${JETSKI_ADULT_PRICE} per person</div>
      </div>
      <div class="ps-stepper">
        <button class="ps-stepper-btn" id="psFWJetSkiAdultMinus" onclick="panelCount('jetSkiAdults',-1)" ${panel.jetSkiAdults <= 0 ? 'disabled' : ''}>−</button>
        <span class="ps-stepper-count" id="psFWJetSkiAdultCount">${panel.jetSkiAdults}</span>
        <button class="ps-stepper-btn" onclick="panelCount('jetSkiAdults',1)">+</button>
      </div>
    </div>
    <div class="ps-total-row">
      <span class="ps-total-label">Total</span>
      <span class="ps-total-amount" id="psPanelTotal">${formatMoney(panelTotal())}</span>
    </div>
    <button class="ps-book-btn" onclick="bookFromPanel()">Book This Package</button>
    <p class="ps-note">You'll confirm guest details in the next step. Free cancellation 7 days before.</p>
  `;
}

function panelSidebarJetSkiRental() {
  const today  = todayInBahamas();
  const count  = panel.jetSkiRentalSlots.length;
  const slotsH = count > 0 ? panel.jetSkiRentalSlots.map((slot, i) => `
    <div class="ps-rider-slot" id="psJSRSlot${i}">
      <div class="ps-rider-slot__label">Rider ${i + 1}</div>
      <div class="ps-rider-slot__options">
        <button class="ps-rider-slot__opt ${slot.duration === 30 ? 'is-selected' : ''}" data-duration="30" onclick="setPanelRiderDuration(${i},30)">30 min<br>$105</button>
        <button class="ps-rider-slot__opt ${slot.duration === 45 ? 'is-selected' : ''}" data-duration="45" onclick="setPanelRiderDuration(${i},45)">45 min<br>$125</button>
        <button class="ps-rider-slot__opt ${slot.duration === 60 ? 'is-selected' : ''}" data-duration="60" onclick="setPanelRiderDuration(${i},60)">60 min<br>$190</button>
      </div>
    </div>`).join('') : '';
  return `
    <div class="ps-title">Jet Ski Rentals</div>
    <div class="ps-subtitle">Select riders and duration</div>
    <span class="ps-section-label">Number of Riders</span>
    <div class="ps-counter-row" style="border-top:1px solid #e5e9ef">
      <div>
        <div class="ps-counter-name">Adults (16+)</div>
        <div class="ps-counter-price">Price varies by duration</div>
      </div>
      <div class="ps-stepper">
        <button class="ps-stepper-btn" id="psJSRAdultMinus" onclick="panelJSRCount(-1)" ${count <= 0 ? 'disabled' : ''}>−</button>
        <span class="ps-stepper-count" id="psJSRAdultCount">${count}</span>
        <button class="ps-stepper-btn" onclick="panelJSRCount(1)">+</button>
      </div>
    </div>
    <div id="psJSRSlots" class="ps-rider-slots">${slotsH}</div>
    <div class="ps-total-row">
      <span class="ps-total-label">Total</span>
      <span class="ps-total-amount" id="psPanelTotal">${formatMoney(panelTotal())}</span>
    </div>
    <button class="ps-book-btn" id="psPanelBookBtn" onclick="bookFromPanel()" ${count === 0 ? 'disabled' : ''}>
      ${count === 0 ? 'Add riders to book' : 'Book This Package'}
    </button>
    <p class="ps-note">Each rider picks their duration independently. Total is the sum of all riders.</p>
  `;
}

/* ── Panel counter functions ────────────────────────────── */
function panelCount(field, delta) {
  const newVal = Math.max(0, panel[field] + delta);
  panel[field] = newVal;
  const idMap  = { beachAdults: 'psFWBeachAdultCount', beachChildren: 'psFWBeachChildCount', jetSkiAdults: 'psFWJetSkiAdultCount' };
  const minMap = { beachAdults: 'psFWBeachAdultMinus', beachChildren: 'psFWBeachChildMinus', jetSkiAdults: 'psFWJetSkiAdultMinus' };
  const countEl = document.getElementById(idMap[field]);
  const minBtn  = document.getElementById(minMap[field]);
  if (countEl) countEl.textContent = newVal;
  if (minBtn)  minBtn.disabled = newVal <= 0;
  updatePanelSidebarTotal();
}

function panelJSRCount(delta) {
  const newVal = Math.max(0, panel.jetSkiRentalAdults + delta);
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

  const bookBtn = document.getElementById('psPanelBookBtn');
  if (bookBtn) {
    bookBtn.disabled = panel.jetSkiRentalAdults === 0;
    bookBtn.textContent = panel.jetSkiRentalAdults === 0 ? 'Add riders to book' : 'Book This Package';
  }
}

function setPanelRiderDuration(idx, dur) {
  if (idx >= panel.jetSkiRentalSlots.length) return;
  panel.jetSkiRentalSlots[idx] = { duration: dur, price: JETSKI_RENTAL_PRICES[dur] };
  const slotEl = document.getElementById(`psJSRSlot${idx}`);
  if (slotEl) {
    slotEl.querySelectorAll('.ps-rider-slot__opt').forEach(btn => {
      btn.classList.toggle('is-selected', parseInt(btn.dataset.duration) === dur);
    });
  }
  updatePanelSidebarTotal();
}

function renderPanelJSRSlots() {
  const container = document.getElementById('psJSRSlots');
  if (!container) return;
  container.innerHTML = panel.jetSkiRentalSlots.map((slot, i) => `
    <div class="ps-rider-slot" id="psJSRSlot${i}">
      <div class="ps-rider-slot__label">Rider ${i + 1}</div>
      <div class="ps-rider-slot__options">
        <button class="ps-rider-slot__opt ${slot.duration === 30 ? 'is-selected' : ''}" data-duration="30" onclick="setPanelRiderDuration(${i},30)">30 min<br>$105</button>
        <button class="ps-rider-slot__opt ${slot.duration === 45 ? 'is-selected' : ''}" data-duration="45" onclick="setPanelRiderDuration(${i},45)">45 min<br>$125</button>
        <button class="ps-rider-slot__opt ${slot.duration === 60 ? 'is-selected' : ''}" data-duration="60" onclick="setPanelRiderDuration(${i},60)">60 min<br>$190</button>
      </div>
    </div>`).join('');
}

function updatePanelSidebarTotal() {
  const el = document.getElementById('psPanelTotal');
  if (el) el.textContent = formatMoney(panelTotal());
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
  state.paymentMethod  = '';
  state.honeypot       = '';
  state.reference      = '';
  state.total          = 0;
  state.currentStep    = 2;

  updateModalProgress(2);
  renderStep(2);
  document.getElementById('bookingModal').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const first = document.querySelector('#modalPanel button, #modalPanel input');
    if (first) first.focus();
  }, 350);
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

function panelContentBigMable() {
  return `
    <span class="panel__cat-badge panel__cat-badge--solo">Individuals</span>
    <h2 class="panel__title">Big Mable Tube Ride</h2>
    <div class="panel__desc">
      <p>Up to 6 riders pile onto one giant inflatable tube and get towed through open water by a jet ski. It's loud, wet, and fast. A 10 to 12 minute ride that everyone remembers.</p>
      <p>Great for families with kids, friend groups, or anyone who wants a break from the beach chairs. Ages 7 and up. Combined weight limit of 600 lb per ride.</p>
    </div>
    <span class="panel__section-label">What's Included</span>
    <ul class="panel__included-list">
      <li class="panel__included-item">10 to 12 minute tube ride</li>
      <li class="panel__included-item">Up to 6 riders per tube</li>
      <li class="panel__included-item">Life jackets provided</li>
      <li class="panel__included-item">Jet ski tow crew on board</li>
    </ul>
    <span class="panel__section-label">Experience</span>
    ${experienceHTML(PANEL_VIDEOS_MABLE)}
    <span class="panel__section-label">Questions</span>
    <div class="panel-faq">
      <details class="panel-faq-item">
        <summary>What is the minimum age?</summary>
        <p>Ages 7 and up. Children under 7 are not permitted on the Big Mable for safety reasons.</p>
      </details>
      <details class="panel-faq-item">
        <summary>How many people can ride at once?</summary>
        <p>Minimum 2, maximum 6 riders per ride. The tube seats everyone together for a shared experience.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Is there a weight limit?</summary>
        <p>Yes. The combined weight of all riders must not exceed 600 lb. Our team will confirm on arrival.</p>
      </details>
      <details class="panel-faq-item">
        <summary>Do we need beach access to book this?</summary>
        <p>No. The Big Mable Tube Ride is a standalone experience. You don't need to purchase a Beach Access Package to book it.</p>
      </details>
    </div>
  `;
}

function panelSidebarBigMable() {
  const today = todayInBahamas();
  const count = panel.bigMableCount;
  return `
    <div class="ps-title">Big Mable Tube Ride</div>
    <div class="ps-subtitle">2 to 6 riders per ride · Ages 7+</div>
    <span class="ps-section-label">Riders</span>
    <div class="ps-counter-row" style="border-top:1px solid #e5e9ef">
      <div>
        <div class="ps-counter-name">Riders (Ages 7+)</div>
        <div class="ps-counter-price">$${BIG_MABLE_PRICE} per person · max 6</div>
      </div>
      <div class="ps-stepper">
        <button class="ps-stepper-btn" id="psBigMableMinus" onclick="panelBigMableCount(-1)" ${count <= 0 ? 'disabled' : ''}>−</button>
        <span class="ps-stepper-count" id="psBigMableCount">${count}</span>
        <button class="ps-stepper-btn" id="psBigMablePlus" onclick="panelBigMableCount(1)" ${count >= 6 ? 'disabled' : ''}>+</button>
      </div>
    </div>
    ${count === 1 ? '<p style="font-size:12px;color:#c05621;padding:8px 0 0;margin:0">Minimum 2 riders required.</p>' : ''}
    <div class="ps-total-row">
      <span class="ps-total-label">Total</span>
      <span class="ps-total-amount" id="psPanelTotal">${formatMoney(panelTotal())}</span>
    </div>
    <button class="ps-book-btn" id="psPanelBookBtn" onclick="bookFromPanel()" ${count < 2 ? 'disabled' : ''}>
      ${count < 2 ? 'Add at least 2 riders' : 'Book This Package'}
    </button>
    <p class="ps-note">600 lb combined weight limit. Payment handled on arrival. Confirmed via WhatsApp.</p>
  `;
}

function panelSidebarSummaz() {
  const count = panel.summazCount;
  const price = count === 2 ? SUMMAZ_PRICE_2 : SUMMAZ_PRICE_1;
  return `
    <div class="ps-title">The Summaz Experience</div>
    <div class="ps-subtitle">1 or 2 riders per session</div>
    <span class="ps-section-label">Riders</span>
    <div class="ps-counter-row" style="border-top:1px solid #e5e9ef">
      <div>
        <div class="ps-counter-name">Riders</div>
        <div class="ps-counter-price">1 rider $200 &middot; 2 riders $275</div>
      </div>
      <div class="ps-stepper">
        <button class="ps-stepper-btn" id="psSummazMinus" onclick="panelSummazCount(-1)" ${count <= 1 ? 'disabled' : ''}>−</button>
        <span class="ps-stepper-count" id="psSummazCount">${count}</span>
        <button class="ps-stepper-btn" id="psSummazPlus" onclick="panelSummazCount(1)" ${count >= 2 ? 'disabled' : ''}>+</button>
      </div>
    </div>
    <div class="ps-total-row">
      <span class="ps-total-label">Total</span>
      <span class="ps-total-amount" id="psPanelTotal">${formatMoney(price)}</span>
    </div>
    <button class="ps-book-btn" onclick="bookFromPanel()">Book This Package</button>
    <p class="ps-note">Payment handled after booking. Free cancellation 7 days before.</p>
  `;
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
  if (countEl) countEl.textContent = newVal;
  if (minBtn)  minBtn.disabled = newVal <= 0;
  if (plusBtn) plusBtn.disabled = newVal >= 6;

  updatePanelSidebarTotal();

  const bookBtn = document.getElementById('psPanelBookBtn');
  if (bookBtn) {
    bookBtn.disabled = newVal < 2;
    bookBtn.textContent = newVal < 2 ? 'Add at least 2 riders' : 'Book This Package';
  }
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
    openPanel(e.state.panel);
  } else if (e.state && e.state.booking) {
    openBooking();
  } else {
    if (overlay) { closePanelSheet(); overlay.classList.remove('is-open'); }
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


