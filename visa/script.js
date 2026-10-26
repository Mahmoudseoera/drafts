/* =========================================================
   Digital Passport Stamp Collection
   Vanilla JS + GSAP. Modules: Config, State, Data, Stamps,
   Cards, Vibe, Dates, Pax, Final, Flow, Celebration, Checkin.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Config ---------- */
  const Config = {
    totalSteps: 4,
    maxTravelers: 9,
    autoAdvanceDelay: 0.35, // seconds between picking a vibe and moving on
    // Placeholder promo codes. Replace with a call to your backend.
    promoCodes: { NILE10: '10% off', PHARAOH15: '15% off' },
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = (s) => (reduceMotion ? 0.001 : s);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- State ---------- */
  const State = {
    current: 0,
    busy: false,
    completed: Array(Config.totalSteps).fill(false),
    data: {
      vibe: null,
      arrival: null,
      departure: null,
      adults: 1,
      children: 0,
      infants: 0,
      promo: null,
      nationality: null,
    },
  };

  /* ---------- Data ---------- */
  // Stroke icons on a 24x24 grid. Reused in tags and inside the stamps.
  const ICONS = {
    beach: '<circle cx="12" cy="8" r="3.5"/><path d="M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 21c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    history: '<path d="M3 20L12 4l9 16z"/><path d="M7.5 13h9M5.2 17h13.6"/>',
    family: '<circle cx="8" cy="7.5" r="2.6"/><circle cx="16" cy="7.5" r="2.6"/><circle cx="12" cy="15" r="2"/><path d="M3.5 20c0-3 2-4.5 4.5-4.5M20.5 20c0-3-2-4.5-4.5-4.5"/>',
    desert: '<path d="M3 20c3-6 6-6 9 0 2-3 5-4 9 0"/><path d="M16 3.5a4.2 4.2 0 1 0 4.5 5.5 3.7 3.7 0 0 1-4.5-5.5z"/>',
    cruise: '<path d="M3 15h18l-2.2 4.5H5.2z"/><path d="M12 15V3.5l5.5 8H12"/>',
    diving: '<path d="M3 12c3.5-5.5 10-5.5 14 0-4 5.5-10.5 5.5-14 0z"/><path d="M17 12l4.5-3.2v6.4z"/><circle cx="8" cy="11" r=".7" fill="currentColor"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 3-6 6-6s6 2.5 6 6M15.5 14.5c3 0 5.5 2 5.5 5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  };

  const VIBES = [
    { id: 'beach', label: 'Beach relax' },
    { id: 'history', label: 'Historical' },
    { id: 'family', label: 'Family adventure' },
    { id: 'desert', label: 'Desert and stars' },
    { id: 'cruise', label: 'Nile cruise' },
    { id: 'diving', label: 'Diving and reefs' },
  ];

  // [name, ISO code, dial code]
  const COUNTRIES = [
    ['Egypt', 'EG', '+20'], ['United Kingdom', 'GB', '+44'], ['United States', 'US', '+1'], ['Canada', 'CA', '+1'],
    ['Germany', 'DE', '+49'], ['France', 'FR', '+33'], ['Italy', 'IT', '+39'], ['Spain', 'ES', '+34'],
    ['Netherlands', 'NL', '+31'], ['Belgium', 'BE', '+32'], ['Switzerland', 'CH', '+41'], ['Austria', 'AT', '+43'],
    ['Sweden', 'SE', '+46'], ['Norway', 'NO', '+47'], ['Denmark', 'DK', '+45'], ['Finland', 'FI', '+358'],
    ['Poland', 'PL', '+48'], ['Czechia', 'CZ', '+420'], ['Hungary', 'HU', '+36'], ['Romania', 'RO', '+40'],
    ['Greece', 'GR', '+30'], ['Turkey', 'TR', '+90'], ['Ireland', 'IE', '+353'], ['Portugal', 'PT', '+351'],
    ['Russia', 'RU', '+7'], ['Ukraine', 'UA', '+380'], ['Saudi Arabia', 'SA', '+966'], ['United Arab Emirates', 'AE', '+971'],
    ['Kuwait', 'KW', '+965'], ['Qatar', 'QA', '+974'], ['Oman', 'OM', '+968'], ['Bahrain', 'BH', '+973'],
    ['Jordan', 'JO', '+962'], ['Lebanon', 'LB', '+961'], ['Morocco', 'MA', '+212'], ['Tunisia', 'TN', '+216'],
    ['Algeria', 'DZ', '+213'], ['South Africa', 'ZA', '+27'], ['Nigeria', 'NG', '+234'], ['Kenya', 'KE', '+254'],
    ['India', 'IN', '+91'], ['Pakistan', 'PK', '+92'], ['China', 'CN', '+86'], ['Japan', 'JP', '+81'],
    ['South Korea', 'KR', '+82'], ['Singapore', 'SG', '+65'], ['Malaysia', 'MY', '+60'], ['Indonesia', 'ID', '+62'],
    ['Thailand', 'TH', '+66'], ['Australia', 'AU', '+61'], ['New Zealand', 'NZ', '+64'], ['Brazil', 'BR', '+55'],
    ['Argentina', 'AR', '+54'], ['Mexico', 'MX', '+52'], ['Chile', 'CL', '+56'], ['Israel', 'IL', '+972'],
  ];

  /* ---------- Date helpers ---------- */
  const fmtShort = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
  const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();
  const nightsBetween = (a, b) => Math.round((b - a) / 86400000);
  const rangeText = (a, b) => `${fmtShort.format(a)} to ${fmtShort.format(b)}`;
  const travelerCount = (d) => d.adults + d.children + d.infants;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  /* ---------- Elements ---------- */
  const el = {
    passport: $('#passport'),
    sheen: $('#sheen'),
    count: $('#stamp-count'),
    sub: $('#passport-sub'),
    live: $('#live'),
    slots: $$('#slots .slot'),
    game: $('#game'),
    stage: $('#stage'),
    cards: $$('.card'),
    checkin: $('#checkin'),
    ticket: $('#ticket'),
    confetti: $('#confetti'),
  };

  /* =========================================================
     Stamps: placeholder SVG stamps + the GSAP "thunk" animation
     Replace build() to return your own SVG markup per step.
     ========================================================= */
  const Stamps = {
    clip(text, max = 16) {
      const t = String(text).toUpperCase();
      return t.length > max ? t.slice(0, max - 1) + '.' : t;
    },

    content(step) {
      const d = State.data;
      switch (step) {
        case 0: {
          const v = VIBES.find((x) => x.id === d.vibe) || VIBES[0];
          return { top: 'Journey vibe', bottom: v.label, icon: ICONS[v.id] };
        }
        case 1:
          return { top: 'Dates set', bottom: `${fmtShort.format(d.arrival)} - ${fmtShort.format(d.departure)}`, icon: ICONS.calendar };
        case 2:
          return { top: 'On board', bottom: plural(travelerCount(d), 'traveler'), icon: ICONS.people };
        default: {
          const c = COUNTRIES.find((x) => x[0] === d.nationality);
          const name = d.nationality && d.nationality.length > 16 && c ? c[1] : d.nationality || 'Cleared';
          return { top: 'Cleared', bottom: name, icon: ICONS.globe };
        }
      }
    },

    // Outer decoration differs per stamp so the page feels collected, not copied.
    frame(step) {
      switch (step) {
        case 0:
          return '<circle cx="60" cy="60" r="57" stroke-width="3"/><circle cx="60" cy="60" r="53.5" stroke-width="1"/><circle cx="60" cy="60" r="35" stroke-width="1.5"/>';
        case 1:
          return '<circle cx="60" cy="60" r="57" stroke-width="2"/><circle cx="60" cy="60" r="54" stroke-width="4" stroke-dasharray="1.5 3.1"/><circle cx="60" cy="60" r="35" stroke-width="1.5"/>';
        case 2:
          return '<circle cx="60" cy="60" r="57" stroke-width="2"/><circle cx="60" cy="60" r="52.5" stroke-width="5" stroke-dasharray="0.1 6.6" stroke-linecap="round"/><circle cx="60" cy="60" r="35" stroke-width="1.5"/>';
        default:
          return '<circle cx="60" cy="60" r="57" stroke-width="3"/><circle cx="60" cy="60" r="53.5" stroke-width="1"/><polygon points="60,26 89.4,43 89.4,77 60,94 30.6,77 30.6,43" stroke-width="1.5"/>';
      }
    },

    build(step) {
      const c = this.content(step);
      return `
        <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" role="img" aria-label="${c.top}: ${c.bottom}">
          ${this.frame(step)}
          <defs>
            <path id="arc-t-${step}" d="M 19 60 A 41 41 0 0 1 101 60"/>
            <path id="arc-b-${step}" d="M 10 60 A 50 50 0 0 0 110 60"/>
          </defs>
          <g fill="currentColor" stroke="none" font-family="Bricolage Grotesque, Trebuchet MS, sans-serif" font-weight="800" font-size="9.5" letter-spacing="1.4" text-anchor="middle">
            <text><textPath href="#arc-t-${step}" startOffset="50%">${this.clip(c.top, 14)}</textPath></text>
            <text><textPath href="#arc-b-${step}" startOffset="50%">${this.clip(c.bottom)}</textPath></text>
            <circle cx="14.5" cy="60" r="1.8"/><circle cx="105.5" cy="60" r="1.8"/>
          </g>
          <g transform="translate(39.5 39.5) scale(1.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${c.icon}</g>
        </svg>`;
    },

    place(step) {
      const slot = el.slots[step];
      const holder = $('.slot__stamp', slot);
      const splash = $('.slot__splash', slot);
      holder.innerHTML = this.build(step);
      const stamp = holder.firstElementChild;
      const rot = gsap.utils.random(-14, 14, 1);

      slot.classList.add('is-stamped');

      const tl = gsap.timeline();
      tl.set(stamp, { opacity: 0, scale: 2.1, rotation: rot - 20, transformOrigin: '50% 50%' })
        // 1. the stamp comes down fast
        .to(stamp, { opacity: 0.95, scale: 0.93, rotation: rot + 3, duration: dur(0.22), ease: 'power3.in' })
        .addLabel('hit')
        // 2. impact: rebound, ink ring, passport thump
        .to(stamp, { scale: 1, rotation: rot, duration: dur(0.55), ease: 'elastic.out(1.1, 0.4)' }, 'hit')
        .fromTo(splash, { scale: 0.7, opacity: 0.55 }, { scale: 1.45, opacity: 0, duration: dur(0.6), ease: 'power2.out' }, 'hit')
        .fromTo(el.passport, { y: 0 }, { y: 4, duration: dur(0.07), yoyo: true, repeat: 1, ease: 'power1.out' }, 'hit');

      return tl;
    },
  };

  /* =========================================================
     Cards: slide out left + fade, next slides in from right
     ========================================================= */
  const Cards = {
    init() {
      el.cards.forEach((c, i) => { c.hidden = i !== 0; });
    },

    leave(i) {
      return new Promise((resolve) => {
        gsap.to(el.cards[i], { x: -80, opacity: 0, duration: dur(0.4), ease: 'power2.in', onComplete: resolve });
      });
    },

    async go(next) {
      const prev = State.current;
      const startH = el.stage.offsetHeight;
      el.stage.style.height = `${startH}px`;

      await this.leave(prev);
      el.cards[prev].hidden = true;
      el.cards[next].hidden = false;
      gsap.set(el.cards[next], { x: 80, opacity: 0 });

      el.stage.style.height = 'auto';
      const endH = el.stage.offsetHeight;
      el.stage.style.height = `${startH}px`;

      State.current = next;
      gsap.to(el.stage, { height: endH, duration: dur(0.45), ease: 'power2.inOut', onComplete: () => { el.stage.style.height = ''; } });
      gsap.to(el.cards[next], {
        x: 0, opacity: 1, duration: dur(0.55), ease: 'power3.out',
        onComplete: () => $('h2', el.cards[next]).focus({ preventScroll: true }),
      });
    },
  };

  /* =========================================================
     Step 1: Vibe
     ========================================================= */
  const Vibe = {
    init() {
      const grid = $('#vibe-grid');
      grid.innerHTML = VIBES.map((v) => `
        <button type="button" class="tag" data-vibe="${v.id}" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[v.id]}</svg>
          <span>${v.label}</span>
        </button>`).join('');

      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.tag');
        if (!btn || State.busy) return;
        $$('.tag', grid).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        State.data.vibe = btn.dataset.vibe;
        gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: dur(0.35), ease: 'back.out(3)' });
        gsap.delayedCall(Config.autoAdvanceDelay, () => Flow.complete(0));
      });
    },
  };

  /* =========================================================
     Step 2: Dates (custom range picker)
     ========================================================= */
  const Dates = {
    today: startOfDay(new Date()),
    view: null,

    init() {
      this.view = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
      this.grid = $('#cal-grid');
      this.monthEl = $('#cal-month');
      this.summary = $('#cal-summary');
      this.confirm = $('#dates-confirm');
      this.prev = $('#cal-prev');

      this.prev.addEventListener('click', () => this.shift(-1));
      $('#cal-next').addEventListener('click', () => this.shift(1));
      this.grid.addEventListener('click', (e) => {
        const day = e.target.closest('.cal__day');
        if (day && !day.disabled) this.pick(new Date(Number(day.dataset.ts)));
      });
      this.confirm.addEventListener('click', () => Flow.complete(1));
      this.render();
    },

    shift(n) {
      this.view = new Date(this.view.getFullYear(), this.view.getMonth() + n, 1);
      this.render();
      gsap.fromTo(this.grid, { x: n * 24, opacity: 0.2 }, { x: 0, opacity: 1, duration: dur(0.3), ease: 'power2.out' });
    },

    pick(date) {
      const d = State.data;
      if (!d.arrival || d.departure) {
        d.arrival = date; d.departure = null;
      } else if (date > d.arrival) {
        d.departure = date;
      } else {
        d.arrival = date;
      }
      this.render(date);
    },

    render(pickedDate) {
      const { arrival, departure } = State.data;
      const y = this.view.getFullYear();
      const m = this.view.getMonth();
      const offset = new Date(y, m, 1).getDay();
      const total = new Date(y, m + 1, 0).getDate();
      let html = '';

      for (let i = 0; i < offset; i++) html += '<span class="cal__pad"></span>';
      for (let n = 1; n <= total; n++) {
        const date = new Date(y, m, n);
        const isStart = sameDay(date, arrival);
        const isEnd = sameDay(date, departure);
        const inRange = arrival && departure && date > arrival && date < departure;
        const cls = ['cal__day', isStart && 'is-start', isEnd && 'is-end', inRange && 'in-range', isStart && !departure && 'no-range'].filter(Boolean).join(' ');
        html += `<button type="button" class="${cls}" data-ts="${date.getTime()}" aria-label="${fmtLong.format(date)}" aria-pressed="${isStart || isEnd}" ${date < this.today ? 'disabled' : ''}>${n}</button>`;
      }

      this.grid.innerHTML = html;
      this.monthEl.textContent = fmtMonth.format(this.view);
      this.prev.disabled = y === this.today.getFullYear() && m === this.today.getMonth();

      if (arrival && departure) {
        this.summary.textContent = `${rangeText(arrival, departure)}, ${plural(nightsBetween(arrival, departure), 'night')}`;
      } else if (arrival) {
        this.summary.textContent = `Arriving ${fmtShort.format(arrival)}. Now choose a departure date.`;
      } else {
        this.summary.textContent = 'Choose an arrival date.';
      }
      this.confirm.disabled = !(arrival && departure);

      if (pickedDate) {
        const btn = $(`[data-ts="${pickedDate.getTime()}"]`, this.grid);
        if (btn) gsap.fromTo(btn, { scale: 0.7 }, { scale: 1, duration: dur(0.4), ease: 'back.out(3)' });
      }
    },
  };

  /* =========================================================
     Step 3: Passengers (seat avatars)
     ========================================================= */
  const Pax = {
    rows: {},
    seatsShown: { adults: 0, children: 0, infants: 0 },

    init() {
      $$('.pax__row').forEach((row) => {
        const key = row.dataset.pax;
        this.rows[key] = {
          row,
          count: $('.pax__count', row),
          minus: $('[data-dir="-1"]', row),
          plus: $('[data-dir="1"]', row),
          seats: $('.pax__seats', row),
        };
        row.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-dir]');
          if (btn && !btn.disabled) this.change(key, Number(btn.dataset.dir));
        });
      });
      $('#pax-confirm').addEventListener('click', () => Flow.complete(2));
      this.render();
    },

    change(key, dir) {
      const d = State.data;
      d[key] += dir;
      this.render();
    },

    seat(key) {
      const kind = key === 'adults' ? '' : key === 'children' ? 'seat--child' : 'seat--infant';
      const wrap = document.createElement('span');
      wrap.innerHTML = `<svg class="seat ${kind}" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.6 3.6-8 8-8s8 3.4 8 8z"/></svg>`;
      return wrap.firstElementChild;
    },

    render() {
      const d = State.data;
      const total = travelerCount(d);

      Object.entries(this.rows).forEach(([key, r]) => {
        r.count.textContent = d[key];

        // Add or remove avatars with a small pop.
        const shown = this.seatsShown[key];
        if (d[key] > shown) {
          for (let i = shown; i < d[key]; i++) {
            const s = this.seat(key);
            r.seats.appendChild(s);
            gsap.from(s, { scale: 0, y: -10, duration: dur(0.45), ease: 'back.out(3)' });
          }
        } else if (d[key] < shown) {
          for (let i = shown; i > d[key]; i--) {
            const s = r.seats.lastElementChild;
            if (s) gsap.to(s, { scale: 0, duration: dur(0.2), onComplete: () => s.remove() });
          }
        }
        this.seatsShown[key] = d[key];
      });

      this.rows.adults.minus.disabled = d.adults <= 1 || d.adults - 1 < d.infants;
      this.rows.children.minus.disabled = d.children <= 0;
      this.rows.infants.minus.disabled = d.infants <= 0;
      this.rows.adults.plus.disabled = total >= Config.maxTravelers;
      this.rows.children.plus.disabled = total >= Config.maxTravelers;
      this.rows.infants.plus.disabled = total >= Config.maxTravelers || d.infants >= d.adults;

      $('#pax-note').textContent = total >= Config.maxTravelers
        ? 'That is the maximum of 9 travelers for one booking.'
        : d.infants >= d.adults && d.infants > 0
          ? 'Each infant needs an adult. Add another adult to add more infants.'
          : `${plural(total, 'traveler')} so far. Up to ${Config.maxTravelers} per booking.`;
    },
  };

  /* =========================================================
     Step 4: Promo code + nationality
     ========================================================= */
  const Final = {
    init() {
      this.input = $('#promo-input');
      this.box = $('#promo');
      this.msg = $('#promo-msg');
      this.select = $('#nationality');
      this.confirm = $('#final-confirm');

      [...COUNTRIES].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name]) => {
        this.select.add(new Option(name, name));
      });

      $('#promo-apply').addEventListener('click', () => this.applyPromo());
      this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.applyPromo(); } });
      this.input.addEventListener('input', () => {
        // Editing the code after applying it resets the state.
        State.data.promo = null;
        this.box.classList.remove('is-valid');
        this.setMsg('', '');
      });
      this.select.addEventListener('change', () => { this.confirm.disabled = !this.select.value; });
      this.confirm.addEventListener('click', () => this.finish());
    },

    setMsg(text, kind) {
      this.msg.textContent = text;
      this.msg.className = `msg ${kind ? `is-${kind}` : ''}`;
    },

    applyPromo() {
      const code = this.input.value.trim().toUpperCase();
      if (!code) { this.setMsg('Type a code first, or leave it empty to skip.', 'bad'); return false; }
      const label = Config.promoCodes[code];
      if (label) {
        State.data.promo = { code, label };
        this.box.classList.add('is-valid');
        this.setMsg(`${code} applied: ${label}.`, 'ok');
        gsap.fromTo(this.box, { scale: 0.97 }, { scale: 1, duration: dur(0.5), ease: 'elastic.out(1, 0.4)' });
        return true;
      }
      State.data.promo = null;
      this.box.classList.remove('is-valid');
      this.setMsg('We don\'t recognise that code. Check the spelling, or clear the field to continue without one.', 'bad');
      gsap.fromTo(this.box, { x: -6 }, { x: 0, duration: dur(0.5), ease: 'elastic.out(1, 0.25)' });
      return false;
    },

    finish() {
      // A typed but unapplied code gets checked before we move on.
      if (this.input.value.trim() && !State.data.promo && !this.applyPromo()) return;
      State.data.nationality = this.select.value;
      Flow.complete(3);
    },
  };

  /* =========================================================
     Flow: marks a step done, stamps the passport, moves on
     ========================================================= */
  const Flow = {
    complete(step) {
      if (State.busy || State.completed[step]) return;
      State.busy = true;
      State.completed[step] = true;

      const done = State.completed.filter(Boolean).length;
      el.count.textContent = done;
      el.live.textContent = `Stamp ${done} of ${Config.totalSteps} collected.`;

      const stampTl = Stamps.place(step);

      if (step === Config.totalSteps - 1) {
        Cards.leave(step);
        stampTl.eventCallback('onComplete', () => Celebration.run());
      } else {
        Cards.go(step + 1).then(() => { State.busy = false; });
      }
    },
  };

  /* =========================================================
     Celebration: all four stamps landed
     ========================================================= */
  const Celebration = {
    burst() {
      if (reduceMotion) return;
      const box = el.passport.getBoundingClientRect();
      const colors = ['#2446a8', '#c8371f', '#0f7a56', '#e0ae3c', '#f9fcfb'];
      const frag = document.createDocumentFragment();

      for (let i = 0; i < 42; i++) {
        const p = document.createElement('i');
        p.style.background = colors[i % colors.length];
        p.style.left = `${box.left + box.width / 2}px`;
        p.style.top = `${box.top + box.height / 2}px`;
        frag.appendChild(p);

        const x = gsap.utils.random(-170, 170);
        gsap.timeline({ onComplete: () => p.remove() })
          .to(p, { x, y: gsap.utils.random(-170, -50), rotation: gsap.utils.random(-240, 240), duration: 0.6, ease: 'power2.out' })
          .to(p, { y: `+=${gsap.utils.random(240, 420)}`, x: x + gsap.utils.random(-40, 40), rotation: `+=${gsap.utils.random(-300, 300)}`, opacity: 0, duration: 1.1, ease: 'power1.in' });
      }
      el.confetti.appendChild(frag);
    },

    run() {
      const d = State.data;
      el.sub.textContent = 'Passport complete. One more step to your ticket.';

      // Contact summary chips
      const chips = [
        (VIBES.find((v) => v.id === d.vibe) || {}).label,
        rangeText(d.arrival, d.departure),
        plural(travelerCount(d), 'traveler'),
        d.nationality,
        d.promo && `${d.promo.code}: ${d.promo.label}`,
      ].filter(Boolean);
      $('#checkin-summary').innerHTML = chips.map((c) => `<span>${c}</span>`).join('');

      // Phone prefix follows nationality when we can match it.
      const match = COUNTRIES.find((c) => c[0] === d.nationality);
      if (match) Checkin.dial.value = `${match[1]}`;

      el.game.style.overflow = 'hidden';
      const gameH = el.game.offsetHeight;
      const stamps = $$('.slot__stamp svg', el.passport);

      const tl = gsap.timeline();
      tl.to(stamps, { scale: 1.12, duration: dur(0.18), yoyo: true, repeat: 1, stagger: 0.08, ease: 'power2.out' })
        .fromTo(el.sheen, { xPercent: -120, opacity: 1 }, { xPercent: 140, duration: dur(0.9), ease: 'power2.inOut' }, 0)
        .add(() => this.burst(), 0.1)
        .fromTo(el.game, { height: gameH }, { height: 0, opacity: 0, duration: dur(0.5), ease: 'power2.inOut', onComplete: () => { el.game.hidden = true; } }, 0.45)
        .add(() => {
          el.checkin.hidden = false;
          el.checkin.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
        }, '>-0.05')
        .from(el.checkin, { y: 48, opacity: 0, duration: dur(0.6), ease: 'power3.out' }, '<')
        .from($$('.summary span, .field, .btn--issue', el.checkin), { y: 16, opacity: 0, duration: dur(0.4), stagger: 0.07, ease: 'power2.out' }, '<0.15')
        .add(() => $('#checkin-title').focus({ preventScroll: true }));

      State.busy = false;
    },
  };

  /* =========================================================
     Check-in form: the "boring" details, validated and submitted
     ========================================================= */
  const Checkin = {
    init() {
      this.form = $('#checkin-form');
      this.dial = $('#dial');

      COUNTRIES.forEach(([name, code, dial]) => {
        this.dial.add(new Option(`${code} ${dial}`, code));
        this.dial.options[this.dial.options.length - 1].dataset.dial = dial;
      });
      this.dial.value = 'EG';

      this.form.addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
      this.form.addEventListener('input', (e) => { if (e.target.name) this.error(e.target.name, ''); });
    },

    error(name, text) {
      const out = $(`[data-for="${name}"]`, this.form);
      const input = this.form.elements[name];
      if (out) out.textContent = text;
      if (input) input.setAttribute('aria-invalid', text ? 'true' : 'false');
    },

    validate() {
      const f = this.form.elements;
      let first = null;
      const fail = (name, text) => { this.error(name, text); first = first || f[name]; };

      if (f.name.value.trim().length < 2) fail('name', 'Enter your full name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) fail('email', 'Enter a valid email, like name@example.com.');
      if (f.phone.value.replace(/\D/g, '').length < 6) fail('phone', 'Enter your phone number without the country code.');

      if (first) {
        first.focus();
        gsap.fromTo(this.form, { x: -6 }, { x: 0, duration: dur(0.5), ease: 'elastic.out(1, 0.25)' });
      }
      return !first;
    },

    submit() {
      if (!this.validate()) return;
      const f = this.form.elements;
      const d = State.data;
      const dial = this.dial.selectedOptions[0].dataset.dial;

      const payload = {
        vibe: (VIBES.find((v) => v.id === d.vibe) || {}).label,
        arrival: d.arrival.toISOString().slice(0, 10),
        departure: d.departure.toISOString().slice(0, 10),
        adults: d.adults, children: d.children, infants: d.infants,
        promoCode: d.promo ? d.promo.code : null,
        nationality: d.nationality,
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        phone: `${dial} ${f.phone.value.trim()}`,
      };

      // Hook for your backend: listen for this event, or POST `payload` here.
      document.dispatchEvent(new CustomEvent('passport:complete', { detail: payload }));

      this.showTicket(payload);
    },

    showTicket(p) {
      const rows = [
        ['Trip vibe', p.vibe],
        ['Dates', rangeText(new Date(p.arrival + 'T00:00'), new Date(p.departure + 'T00:00'))],
        ['Travelers', [plural(p.adults, 'adult'), p.children && plural(p.children, 'child'), p.infants && plural(p.infants, 'infant')].filter(Boolean).join(', ')],
        ['Nationality', p.nationality],
        p.promoCode && ['Promo', p.promoCode],
        ['Contact', p.email],
      ].filter(Boolean);

      $('#ticket-name').textContent = `Booked for ${p.name}`;
      $('#ticket-list').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

      $('#issue').disabled = true;
      gsap.timeline()
        .to(el.checkin, { y: -24, opacity: 0, duration: dur(0.35), ease: 'power2.in', onComplete: () => { el.checkin.hidden = true; el.ticket.hidden = false; } })
        .fromTo(el.ticket, { y: 40, opacity: 0, rotation: -2 }, { y: 0, opacity: 1, rotation: 0, duration: dur(0.7), ease: 'back.out(1.6)' })
        .add(() => $('#ticket-title').focus({ preventScroll: true }));
      el.sub.textContent = 'Ticket issued. Pack your sunscreen.';
    },
  };

  /* ---------- Boot ---------- */
  Cards.init();
  Vibe.init();
  Dates.init();
  Pax.init();
  Final.init();
  Checkin.init();
})();
