/* ==========================================================================
   55 · CITY MAP, TRAVEL OVERLAY, CHECKOUT (§4.3, §4.4)
   ========================================================================== */

const MapUI = {
  sel: null,
  /** atExit: opened from the gate/door (travel allowed without walking first). */
  open(atExit = false) {
    if (!S) return;
    if (InvUI.isOpen) InvUI.close();
    this.sel = this.sel && this.sel !== S.scene ? this.sel : LOC_IDS.find((id) => id !== S.scene) || 'home';
    const body = U.el('div.mapwrap');
    const svgBox = U.el('div.mapsvg', { html: this.svg() });
    const card = U.el('div.mapcard');
    body.append(svgBox, card);
    const entry = Modal.open({ title: STR.mapTitle, body, wide: true, cls: 'mapmodal' });
    const renderCard = () => {
      card.innerHTML = '';
      const id = this.sel, L = locDef(id), here = id === S.scene;
      const st = S.locs[id];
      const rows = [];
      rows.push(U.el('h3', null, L.icon + ' ' + L.name));
      if (here) rows.push(U.el('p.dim', null, STR.youAreHere));
      else {
        const walk = Travel.minutes(S.scene, id, 'walk'), run = Travel.minutes(S.scene, id, 'run');
        rows.push(U.el('div.tt-r', null, U.el('span', null, STR.distance), U.el('b', null, World.km(S.scene, id).toFixed(2) + ' กม.')));
        rows.push(U.el('div.tt-r', null, U.el('span', null, STR.travelWalk), U.el('b', null, U.dur(walk))));
        rows.push(U.el('div.tt-r', null, U.el('span', null, STR.travelRun), U.el('b', null, U.dur(run))));
        if (id !== 'home' && !S.flags.outbreak) {
          const arrive = S.time.min + walk, open = shopOpen(id, arrive);
          rows.push(U.el('div.tt-r', null, U.el('span', null, STR.hours), U.el('b' + (open ? '' : '.bad'), null, L.hours[1] === 24 && L.hours[0] === 0 ? STR.open24 : U.pad2(L.hours[0]) + ':00–' + U.pad2(L.hours[1]) + ':00' + (open ? '' : ' · ' + STR.closedAtArrival))));
        }
      }
      rows.push(U.el('div.tt-r', null, U.el('span', null, STR.danger), U.el('b', null, Danger.label(id))));
      if (id !== 'home') {
        rows.push(U.el('div.tt-r', null, U.el('span', null, STR.looted), U.el('b', null, st ? World.lootPct(id) + '%' : STR.notVisited)));
        if (st && st.lastVisit != null) { const t = U.timeOf(st.lastVisit); rows.push(U.el('div.tt-r', null, U.el('span', null, STR.lastVisit), U.el('b', null, STR.day + ' ' + t.day + ' ' + t.hhmm))); }
      }
      const ch = activeChar();
      if (ch.load() > 1) rows.push(U.el('p.warn', null, STR.travelHeavy));
      if (!here) {
        const blockedClosed = id !== 'home' && !S.flags.outbreak && !shopOpen(id, S.time.min + Travel.minutes(S.scene, id, 'walk'));
        const go = (pace) => {
          if (!Travel.canLeave()) { Toast.show(STR.tooHeavyToMove, 'warn'); return; }
          if (!Scene.isHome() && !S.flags.outbreak && Shop.unpaid(ch).length) { Modal.close(); CheckoutUI.open(true); return; }
          const doGo = () => { Modal.closeAll(); Travel.go(id, pace); };
          if (!atExit && !Scene.atExit()) { Modal.closeAll(); Scene.avatar.goTo(Scene.W.exit, 'walk', doGo) || doGo(); }
          else doGo();
        };
        rows.push(U.el('div.row', null,
          U.el('button.btn.primary', { disabled: blockedClosed, on: { click: () => go('walk') } }, '🚶 ' + STR.goWalk),
          U.el('button.btn', { disabled: blockedClosed, on: { click: () => go('run') } }, '🏃 ' + STR.goRun)));
      }
      card.append(...rows);
    };
    svgBox.addEventListener('click', (e) => {
      const n = e.target.closest('[data-loc]');
      if (n) { this.sel = n.dataset.loc; svgBox.innerHTML = this.svg(); renderCard(); }
    });
    renderCard();
    return entry;
  },
  svg() {
    const roads = [];
    // Stylised street grid: main roads + sois (lanes)
    const main = [[0, 300, 900, 300], [300, 0, 300, 520], [0, 150, 900, 170], [600, 0, 640, 520], [0, 430, 900, 410], [150, 0, 120, 520]];
    for (const [x1, y1, x2, y2] of main) roads.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3a3328" stroke-width="16" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5a4e3a" stroke-width="1.5" stroke-dasharray="10 10"/>`);
    const rng = U.makeRng(99);
    const blocks = [];
    for (let i = 0; i < 70; i++) {
      const x = rng() * 880, y = rng() * 500, w = 18 + rng() * 40, h = 14 + rng() * 30;
      blocks.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#251f18" stroke="#2f281e"/>`);
    }
    const river = '<path d="M0 470 C 200 440, 300 500, 500 470 S 800 440, 900 480 L900 520 L0 520Z" fill="#14202a"/>';
    const nodes = Object.entries(LOCATIONS).map(([id, L]) => {
      const [x, y] = L.map, sel = id === this.sel, here = id === S.scene;
      const looted = id !== 'home' && S.locs[id] ? World.lootPct(id) : null;
      const dcol = Danger.color(id);
      return `<g data-loc="${id}" style="cursor:pointer">
        <circle cx="${x}" cy="${y}" r="${sel ? 26 : 21}" fill="${here ? '#3a5a2a' : '#2a2116'}" stroke="${sel ? '#ffb347' : dcol}" stroke-width="${sel ? 3 : 2}"/>
        <text x="${x}" y="${y + 7}" font-size="20" text-anchor="middle">${L.icon}</text>
        <text x="${x}" y="${y + 42}" font-size="13" fill="#eadfc8" text-anchor="middle" font-family="Noto Sans Thai, Tahoma, sans-serif">${L.short}</text>
        ${looted != null ? `<text x="${x}" y="${y + 57}" font-size="11" fill="#a39377" text-anchor="middle">ถูกค้นแล้ว ${looted}%</text>` : ''}
        ${here ? `<text x="${x}" y="${y - 30}" font-size="11" fill="#9fd18a" text-anchor="middle">● ${STR.youAreHere}</text>` : ''}
      </g>`;
    }).join('');
    const S0 = locDef(S.scene).map, S1 = locDef(this.sel).map;
    const route = this.sel !== S.scene ? `<line x1="${S0[0]}" y1="${S0[1]}" x2="${S1[0]}" y2="${S1[1]}" stroke="#ffb347" stroke-width="3" stroke-dasharray="8 6" opacity="0.85"/>` : '';
    return `<svg viewBox="0 0 900 520" width="100%"><rect width="900" height="520" fill="#1a1611"/>${river}${blocks.join('')}${roads.join('')}${route}${nodes}</svg>`;
  },
};

/** Danger estimate shown on the map. Zombie density escalates with days (§4.2); full model in 1D. */
const Danger = {
  level(id) {
    if (!S.flags.outbreak) return 0;
    const day = S.time.min / 1440 - 1;
    const base = Math.min(1, 0.12 + day * 0.02) * difficultyOf(S.difficulty).zombie;
    const night = Render.night > 0.5 ? 1.4 : 1;
    const dense = id === 'supermarket' ? 1.3 : id === 'market' ? 1.2 : id === 'home' ? 0.6 : 1;
    return U.clamp(base * night * dense, 0, 1);
  },
  label(id) {
    const v = this.level(id);
    if (!S.flags.outbreak) return STR.dangerNone;
    return v < 0.25 ? STR.dangerLow : v < 0.5 ? STR.dangerMid : v < 0.75 ? STR.dangerHigh : STR.dangerExtreme;
  },
  color(id) { const v = this.level(id); return v < 0.25 ? '#7fbf5f' : v < 0.5 ? '#e0b23c' : v < 0.75 ? '#e07a3a' : '#d65a5a'; },
};

const TravelUI = {
  show(dest, mins) {
    const el = U.$('#travel');
    el.hidden = false;
    el.innerHTML = '';
    el.append(U.el('div.tbox', null, U.el('h3', null, STR.travelling(dest)), U.el('div.tbar', null, U.el('i#tfill')), U.el('div.ttime#ttime'), U.el('small.dim', null, STR.travelEta(U.dur(mins)))));
  },
  progress(f, min) { const i = U.$('#tfill'); if (i) i.style.width = Math.round(f * 100) + '%'; const t = U.$('#ttime'); if (t) t.textContent = STR.day + ' ' + U.timeOf(min).day + ' · ' + U.timeOf(min).hhmm; },
  hide() { U.$('#travel').hidden = true; },
};

/** Checkout counter: pay for carried unpaid goods; leaving forces a choice (§4.2). */
const CheckoutUI = {
  open(leaving = false) {
    const ch = activeChar();
    if (S.flags.outbreak) { Toast.show(STR.noPayNeeded, 'info'); return; }
    const list = Shop.unpaid(ch);
    const body = U.el('div.checkout');
    if (!list.length) body.appendChild(U.el('p.dim', null, STR.nothingToPay));
    else {
      const agg = new Map();
      for (const e of list) { const k = e.it.id; agg.set(k, (agg.get(k) || 0) + e.it.qty); }
      const tbl = U.el('table.bill');
      for (const [id, q] of agg) { const d = itemDef(id); tbl.appendChild(U.el('tr', null, U.el('td', null, d.name), U.el('td.n', null, '×' + q), U.el('td.n', null, U.money(d.price * q)))); }
      body.appendChild(tbl);
      const tot = Shop.total(list);
      body.append(U.el('div.tt-r.total', null, U.el('span', null, STR.total), U.el('b', null, U.money(tot))), U.el('div.tt-r', null, U.el('span', null, STR.cash), U.el('b' + (tot > S.cash ? '.bad' : ''), null, U.money(S.cash))));
      if (leaving) body.appendChild(U.el('p.warn', null, STR.mustPay));
    }
    const tot = Shop.total(list);
    Modal.open({ title: STR.checkoutTitle, body, actions: list.length ? [
      { label: STR.returnItems, fn: () => { Shop.returnAll(ch); Toast.show(STR.itemsReturned, 'info'); } },
      { label: STR.payBtn(U.money(tot)), primary: true, fn: () => { if (!Shop.pay(ch)) { Toast.show(STR.notEnoughCash, 'bad'); return false; } Toast.show(STR.paid, 'good'); return true; } },
    ] : [{ label: STR.ok }] });
  },
};
