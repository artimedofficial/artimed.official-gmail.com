/* ==========================================================================
   48 · FOOD PRESERVATION & WATER BOTTLES (Phase 2C, §6.5.7)
   A station (drying rack/tray, ferment jar, smoker) holds one batch:
   { m: method, items: [{id, n}], outs: [{id, n}], need: hours, prog: hours, q: quality, at, done }.
   Drying needs open sky, daylight and no rain (rain soaks the batch → quality loss);
   jars work anywhere; smoking burns one fuel per batch, stops in heavy rain and
   its smoke lures zombies outdoors. Emptied water bottles are kept and can be
   refilled from a store, the tap or the boiled-water pot (raw water is remembered).
   ========================================================================== */

const Preserve = {
  stations() { return S.home.furniture.filter((f) => FURNITURE[f.type].preserve); },
  spec(f) { return FURNITURE[f.type].preserve; },
  sources(ch) {
    const out = [...ch.containers()];
    if (Scene.isHome()) for (const f of S.home.furniture) { if (f.inv) out.push(f.inv); if (f.sub) out.push(f.sub); }
    return out;
  },
  /** Whole, sealed, usable units of an item id available to the character (home storage included). */
  usable(it) {
    if (it.unpaid || Food.ruined(it) || Food.isOpened(it)) return false;
    if ((it.frz || 0) > 0.3) return false;
    const st = Food.stage(it);
    return st === 'fresh' || st === 'aging';
  },
  available(ch, id) {
    let n = 0;
    for (const c of this.sources(ch)) Inv.walk(c, (it) => { if (it.id === id && this.usable(it)) n += it.qty; });
    return n;
  },
  /** Remove n usable units; returns how many were aging (for quality). */
  takeUnits(ch, id, n) {
    let aging = 0;
    for (const c of this.sources(ch)) {
      for (const s of [...c.slots]) {
        if (n <= 0) return aging;
        const it = s.it;
        if (it.id !== id || !this.usable(it)) continue;
        const k = Math.min(n, it.qty);
        if (Food.stage(it) === 'aging') aging += k;
        it.qty -= k; n -= k;
        if (it.qty <= 0) Inv.remove(c, s);
      }
    }
    return aging;
  },
  /** Recipes this station can run, with what the character has. */
  options(ch, f) {
    const out = [];
    for (const m of this.spec(f).methods) for (const [id, r] of Object.entries(PRESERVE[m].recipes)) {
      out.push({ m, id, r, have: this.available(ch, id) });
    }
    return out;
  },
  /** Problems that stop a batch from starting (array of strings). */
  check(ch, f, m, sel) {
    const P = PRESERVE[m], probs = [];
    const units = Object.values(sel).reduce((a, b) => a + b, 0);
    if (!units) probs.push(STR.presPickSome);
    if (units > this.spec(f).cap) probs.push(STR.presTooMany(this.spec(f).cap));
    for (const [id, n] of Object.entries(sel)) {
      const r = P.recipes[id];
      if (!r) { probs.push(STR.presNotFor(itemDef(id).name, P.name)); continue; }
      if (this.available(ch, id) < n) probs.push(STR.presNotEnough(itemDef(id).name));
      if (r.per && n % r.per) probs.push(STR.presMultiple(itemDef(id).name, r.per));
    }
    const ex = this.extras(m, sel);
    for (const [id, n] of ex) if (Barricades.countAvail(ch, id) < n && this.available(ch, id) < n) probs.push(STR.presNeedExtra(itemDef(id).name, n));
    if (P.fuel && !P.fuel.some((id) => Barricades.countAvail(ch, id) > 0)) probs.push(STR.presNeedFuel(P.fuel.map((id) => itemDef(id).name).join(' / ')));
    if (P.outdoor && Arrange.indoor(f.floor, f.x, f.z)) probs.push(STR.presNeedsOutdoor);
    return probs;
  },
  /** Extras (salt, garlic, vinegar) needed for the whole batch: the largest single requirement per id. */
  extras(m, sel) {
    const need = {};
    for (const id of Object.keys(sel)) if (sel[id] > 0 && PRESERVE[m].recipes[id]) for (const [x, n] of PRESERVE[m].recipes[id].extras) need[x] = Math.max(need[x] || 0, n);
    return Object.entries(need);
  },
  hoursFor(m, sel) { return Math.max(0, ...Object.keys(sel).filter((id) => sel[id] > 0 && PRESERVE[m].recipes[id]).map((id) => PRESERVE[m].recipes[id].h)); },
  start(ch, f, m, sel) {
    if (f.batch) { Toast.show(STR.presBusy, 'warn'); return false; }
    const probs = this.check(ch, f, m, sel);
    if (probs.length) { Toast.show(probs[0], 'warn', 4000); return false; }
    const P = PRESERVE[m];
    let units = 0, aging = 0;
    const items = [], outs = {};
    for (const [id, n] of Object.entries(sel)) {
      if (!n) continue;
      aging += this.takeUnits(ch, id, n); units += n;
      items.push({ id, n });
      const r = P.recipes[id];
      outs[r.out] = (outs[r.out] || 0) + Math.floor(n / (r.per || 1)) * r.n;
    }
    for (const [id, n] of this.extras(m, sel)) { if (Barricades.countAvail(ch, id) >= n) Barricades.consume(ch, id, n); else this.takeUnits(ch, id, n); }
    if (P.fuel) { const fuel = P.fuel.find((id) => Barricades.countAvail(ch, id) > 0); Barricades.consume(ch, fuel, 1); }
    f.batch = { m, items, outs: Object.entries(outs).map(([id, n]) => ({ id, n })), need: this.hoursFor(m, sel), prog: 0, q: U.clamp(1 - 0.25 * aging / Math.max(1, units), 0.5, 1), at: S.time.min, done: false };
    GameClock.advance(PRES.startMin + PRES.perUnitMin * units);
    Skills.gain(ch, 'cooking', 2 + units * 0.5);
    logEvent(STR.presStarted(P.name, items.map((x) => itemDef(x.id).name + ' ×' + x.n).join(', ')), 'info');
    Bus.emit('preserve:changed', f); Bus.emit('inv:changed');
    return true;
  },
  /** Why a batch is (not) progressing right now: 'ok' | 'night' | 'rain' | 'indoor' | 'storm'. */
  condition(f, wx = Weather.now()) {
    const b = f.batch, P = b && PRESERVE[b.m];
    if (!P) return 'ok';
    if (P.outdoor && Arrange.indoor(f.floor, f.x, f.z)) return 'indoor';
    if (P.sun) { if (wx.mmh >= 0.2) return 'rain'; if (Render.nightAt(S.time.min) > 0.5) return 'night'; }
    if (P.rainStop && wx.mmh >= P.rainStop) return 'storm';
    return 'ok';
  },
  rate(f, wx) { const P = PRESERVE[f.batch.m]; return P.sun ? 1 - 0.5 * wx.cloud : 1; },
  hoursLeft(f) { const b = f.batch; return b ? Math.max(0, b.need - b.prog) : 0; },
  step(dt) {
    const wx = Weather.at(S.time.min);
    for (const f of this.stations()) {
      const b = f.batch; if (!b || b.done) continue;
      const P = PRESERVE[b.m], cond = this.condition(f, wx);
      if (cond === 'rain' && !Arrange.indoor(f.floor, f.x, f.z)) {
        const was = b.q;
        b.q -= P.wetLoss * dt / 60;
        if (was >= 0.85 && b.q < 0.85) { logEvent(STR.presWet(f.label), 'warn'); Bus.emit('toast', { kind: 'warn', msg: STR.presWet(f.label) }); }
        if (b.q < PRES.qLost) { logEvent(STR.presLost(f.label), 'bad'); Bus.emit('toast', { kind: 'bad', msg: STR.presLost(f.label) }); f.batch = null; Bus.emit('preserve:changed', f); continue; }
      }
      if (cond !== 'ok') continue;
      b.prog += dt / 60 * this.rate(f, wx);
      if (P.smokeNoise && Scene.isHome() && S.time.min % 30 === 0) NoiseBus.emit(f.x, f.z, P.smokeNoise, 0, true);
      if (b.prog >= b.need) {
        b.done = true;
        logEvent(STR.presDone(P.name, f.label), 'good');
        Bus.emit('toast', { kind: 'good', msg: STR.presDone(P.name, f.label) });
        Bus.emit('preserve:changed', f);
      }
    }
  },
  collect(ch, f) {
    const b = f.batch; if (!b || !b.done) return false;
    const mul = b.q < PRES.qLow ? 0.7 : 1;
    const got = [];
    for (const o of b.outs) {
      const n = Math.max(1, Math.round(o.n * mul));
      const it = Inv.makeItem(o.id, n);
      if (Inv.addToAny(ch.containers(), it) > 0) { const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true); Inv.add(pile.inv, it); }
      got.push(itemDef(o.id).name + ' ×' + n);
    }
    Scene.syncPiles();
    f.batch = null;
    GameClock.advance(PRES.collectMin);
    Skills.gain(ch, 'cooking', 3);
    logEvent(STR.presCollected(got.join(', ')), 'good');
    Bus.emit('preserve:changed', f); Bus.emit('inv:changed');
    return got;
  },
  discard(f) { if (!f.batch) return; logEvent(STR.presDiscarded(f.label), 'warn'); f.batch = null; Bus.emit('preserve:changed', f); },
  init() { GameClock.onMinute((m) => { if (m % 10 === 0) this.step(10); }); },
};

/* ---------- Water bottles ---------- */
const Bottles = {
  empties(ch) {
    const out = [];
    for (const c of ch.containers()) Inv.walk(c, (it, cc, slot) => { if (itemDef(it.id).fills) out.push({ c: cc, slot }); });
    return out;
  },
  litresEmpty(ch) { return this.empties(ch).reduce((a, e) => a + itemDef(e.slot.it.id).litres * e.slot.it.qty, 0); },
  /** Give back the empty container after the last sip. */
  emptied(ch, c, d) {
    const it = Inv.makeItem(d.empty, 1);
    if (!(c && Inv.add(c, it) === 0) && Inv.addToAny(ch.containers(), it) > 0) {
      const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true); Inv.add(pile.inv, it); Scene.syncPiles();
    }
  },
  /** Fill every empty bottle the character carries from a source: a water store, 'tap' or 'boiled'. */
  fill(ch, src) {
    const list = this.empties(ch);
    if (!list.length) { Toast.show(STR.noEmpties, 'warn'); return 0; }
    if (src === 'tap' && !Power.waterOn()) { Toast.show(STR.noTapWater, 'warn'); return 0; }
    let filled = 0, litres = 0, rawN = 0;
    for (const e of list) {
      const d = itemDef(e.slot.it.id);
      while (e.c.slots.includes(e.slot) && e.slot.it.qty > 0) {
        let got;
        if (src === 'tap') got = { l: d.litres, raw: 0 };
        else if (src === 'boiled') { if ((S.home.boiled || 0) < d.litres - 1e-6) break; S.home.boiled -= d.litres; got = { l: d.litres, raw: 0 }; }
        else { if (src.water.l < d.litres - 1e-6) break; got = Water.take(src, d.litres); }
        const full = Inv.makeItem(d.fills, 1);
        if (got.raw > 0.01) { full.st = { raw: true }; rawN++; }
        if (e.slot.it.qty > 1) e.slot.it.qty -= 1; else Inv.remove(e.c, e.slot);
        if (Inv.add(e.c, full) > 0 && Inv.addToAny(ch.containers(), full) > 0) { const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true); Inv.add(pile.inv, full); }
        filled++; litres += got.l;
      }
    }
    Scene.syncPiles();
    if (!filled) { Toast.show(STR.storeEmpty, 'warn'); return 0; }
    GameClock.advance(Math.max(1, Math.round(litres / 2)));
    logEvent(STR.bottlesFilled(filled, litres.toFixed(1)) + (rawN ? ' · ' + STR.bottlesRaw(rawN) : ''), rawN ? 'warn' : 'good');
    Bus.emit('inv:changed');
    return filled;
  },
};
