/* ==========================================================================
   46 · CALENDAR, WEATHER, WATER & FARMING (Phase 2B)
   Weather is deterministic per world (same seed → same rain, every life):
   each day rolls from Bangkok monthly normals; rain falls as afternoon /
   evening convective events with a bell-shaped intensity. Rain fills open
   water stores outdoors (more when under the roof gutter), waters outdoor
   plots and masks outdoor noise. Water stores hold litres, part of it raw
   (untreated rain) that can make you ill unless filtered or boiled.
   ========================================================================== */

const Calendar = {
  date(day) { return new Date(CALENDAR.year, CALENDAR.month, CALENDAR.day + day); },
  /** "20 เม.ย." */
  label(day) { const d = this.date(day); return d.getDate() + ' ' + MONTHS_TH[d.getMonth()]; },
  month(day) { return this.date(day).getMonth(); },
};

const Weather = {
  memo: new Map(),
  day(n) {
    const key = (S ? S.worldSeed : 0) + '|' + n;
    if (this.memo.has(key)) return this.memo.get(key);
    const date = Calendar.date(n), C = CLIMATE[date.getMonth()];
    const dim = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const rng = RNG.local('wx|' + key);
    const wet = C.days >= 10;
    const out = { events: [], mm: 0, cloud: 0, tmax: 0, tmin: 0 };
    const rainy = rng() < C.days / dim;
    if (rainy) {
      out.mm = C.mm / C.days * (0.35 + rng() * 1.3);
      const two = rng() < 0.3;
      let start = (wet ? 13.5 + rng() * 7 : 12 + rng() * 9) * 60;
      for (let i = 0; i < (two ? 2 : 1); i++) {
        const dur = (0.6 + rng() * 2.4) * 60;
        out.events.push({ s: n * 1440 + start, e: n * 1440 + start + dur, mm: out.mm * (two ? (i ? 0.4 : 0.6) : 1) });
        start += dur + (60 + rng() * 180);
      }
    }
    out.cloud = U.clamp(C.cloud + (rainy ? 0.25 : 0) + (rng() - 0.5) * 0.2, 0.05, 0.95);
    out.tmax = C.tmax + (rng() - 0.5) * 2 - (rainy ? 1.5 : 0);
    out.tmin = C.tmin + (rng() - 0.5) * 1.5;
    if (this.memo.size > 400) this.memo.clear();
    this.memo.set(key, out);
    return out;
  },
  /** Conditions at an absolute minute: mmh (rain mm/h), cloud 0..1, temp °C, kind label key. */
  at(min) {
    const n = Math.floor(min / 1440);
    let mmh = 0, near = 0;
    const F = S && S.flags.wxForce;
    if (F && min < F.until) { mmh = F.mmh; near = 1; }
    for (const dn of [n - 1, n]) for (const ev of this.day(dn).events) {
      if (min >= ev.s && min < ev.e) { const t = (min - ev.s) / (ev.e - ev.s); mmh += ev.mm / ((ev.e - ev.s) / 60) * Math.sin(Math.PI * t) * Math.PI / 2; }
      const d = min < ev.s ? ev.s - min : min > ev.e ? min - ev.e : 0;
      near = Math.max(near, 1 - d / 90);
    }
    const D = this.day(n), h = (min % 1440) / 60;
    const cloud = U.clamp(Math.max(D.cloud, near * 0.95), 0, 1);
    const diurnal = h < 6 ? (h + 24 - 14.5) : h - 14.5;   // peak 14:30, trough ~06:00
    const temp = D.tmin + (D.tmax - D.tmin) * (0.5 + 0.5 * Math.cos(diurnal / 15.5 * Math.PI)) - Math.min(4, mmh * 0.4);
    const kind = mmh >= WEATHER.storm ? 'storm' : mmh >= WEATHER.heavy ? 'heavy' : mmh >= 0.2 ? 'rain' : cloud > 0.6 ? 'cloudy' : cloud > 0.35 ? 'partly' : 'clear';
    return { mmh, cloud, temp, kind, storm: mmh >= WEATHER.storm };
  },
  now() { return this.at(S.time.min); },
  /** 0..1 masking of outdoor sound and sight by rain. */
  rainMask() { return U.clamp(this.now().mmh / WEATHER.heavy, 0, 1); },
  /** Rain total for a day (forecast panel). */
  dayRain(n) { return this.day(n).events.reduce((a, e) => a + e.mm, 0); },
};

/* ---------- Water ---------- */
const Water = {
  stores() { return S.home.furniture.filter((f) => FURNITURE[f.type].store && f.water); },
  /** Rain-catching area in m² for an open store standing outdoors (roof gutter if by the wall). */
  catchArea(f) {
    const st = FURNITURE[f.type].store;
    if (!st || !st.open || Arrange.indoor(f.floor, f.x, f.z)) return 0;
    return st.open + (Arrange.byWall(f) ? WATER.roofArea : 0);
  },
  add(f, l, raw) {
    const cap = FURNITURE[f.type].store.cap, room = Math.max(0, cap - f.water.l), add = Math.min(room, l);
    f.water.l += add; if (raw) f.water.raw = Math.min(f.water.l, f.water.raw + add);
    return add;
  },
  /** Take litres; returns { l, raw } where raw is the untreated share taken. */
  take(f, l) {
    const w = f.water, got = Math.min(l, w.l), frac = w.l > 0 ? w.raw / w.l : 0;
    w.l -= got; w.raw = Math.max(0, w.raw - got * frac);
    if (w.l < 1e-6) { w.l = 0; w.raw = 0; }
    return { l: got, raw: got * frac };
  },
  totals() {
    let safe = 0, raw = 0;
    for (const f of this.stores()) { safe += f.water.l - f.water.raw; raw += f.water.raw; }
    return { safe: safe + (S.home.boiled || 0), raw };
  },
  minute() {
    const wx = Weather.at(S.time.min), on = Power.waterOn();
    for (const f of this.stores()) {
      const st = FURNITURE[f.type].store;
      if (st.mains && on) { f.water.l = st.cap; f.water.raw = 0; continue; }
      if (wx.mmh > 0) { const a = this.catchArea(f); if (a > 0) this.add(f, wx.mmh / 60 * a, true); }
    }
  },
  hasFilter(ch) { return Health.findItem(ch, ['water_filter']); },
  /** Drink to full from a store / the boiled pot / the tap. */
  drink(ch, src) {
    const d = ch.d, want = Math.max(0.25, (100 - d.needs.hydration) / WATER.ptsPerL);
    let got = { l: 0, raw: 0 };
    if (src === 'tap') { if (!Power.waterOn()) { Toast.show(STR.noTapWater, 'warn'); return false; } got = { l: want, raw: 0 }; }
    else if (src === 'boiled') { const l = Math.min(want, S.home.boiled || 0); S.home.boiled -= l; got = { l, raw: 0 }; }
    else got = this.take(src, want);
    if (got.l <= 0.01) { Toast.show(STR.storeEmpty, 'warn'); return false; }
    let filtered = 0;
    if (got.raw > 0) {
      const fl = this.hasFilter(ch);
      if (fl) { const n = Math.ceil(got.raw); for (let i = 0; i < n && fl.it.uses > 0; i++) Health.spend(fl); filtered = got.raw; }
    }
    d.needs.hydration = U.clamp(d.needs.hydration + got.l * WATER.ptsPerL, 0, 100);
    const rawLeft = got.raw - filtered;
    logEvent(STR.drankL(got.l.toFixed(1), src === 'tap' ? STR.tapWater : src === 'boiled' ? STR.boiledWater : src.label) + (filtered ? ' · ' + STR.filtered : rawLeft > 0 ? ' · ' + STR.rawWarn : ''), rawLeft > 0 ? 'warn' : 'info');
    if (rawLeft > 0 && RNG.next('events') < Math.min(0.6, WATER.rawRisk * rawLeft)) Illness.add(d, 'food_poison', 0.3, STR.illWater);
    Snd.play('eat');
    return true;
  },
  /** While mains water runs: top up every store from the tap (takes time). */
  fillAll() {
    if (!Power.waterOn()) { Toast.show(STR.noTapWater, 'warn'); return 0; }
    let n = 0;
    for (const f of this.stores()) { const add = this.add(f, FURNITURE[f.type].store.cap, false); if (add > 0) { f.water.raw = Math.max(0, f.water.raw * (1 - add / f.water.l)); n += add; } }
    if (n > 0) { GameClock.advance(WATER.fillMin + Math.round(n / 40)); logEvent(STR.filledStores(Math.round(n)), 'good'); }
    else Toast.show(STR.storesFull, 'info');
    return n;
  },
  /** Boil a batch of (raw) water from the nearest store at the stove → safe boiled pot. */
  boil(ch) {
    if (S.home.gas < WATER.boilGas) { Toast.show(STR.noGas, 'warn'); return false; }
    const room = WATER.boiledCap - (S.home.boiled || 0);
    if (room < 0.5) { Toast.show(STR.boiledFull, 'info'); return false; }
    const want = Math.min(WATER.boilBatchL, room);
    let got = 0;
    if (Power.waterOn()) got = want;
    else {
      const p = ch.d.pos;
      const src = this.stores().filter((f) => f.water.l > 0.1).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (!src) { Toast.show(STR.noWaterAnywhere, 'warn'); return false; }
      got = this.take(src, want).l;
    }
    S.home.boiled = (S.home.boiled || 0) + got;
    S.home.gas = Math.max(0, S.home.gas - WATER.boilGas);
    GameClock.advance(WATER.boilMin);
    Skills.gain(ch, 'cooking', 1);
    logEvent(STR.boiled(got.toFixed(1)), 'good');
    return true;
  },
  init() { GameClock.onMinute(() => this.minute()); },
};

/* ---------- Farming ---------- */
const Farm = {
  plots() { return S.home.furniture.filter((f) => f.farm); },
  kind(f) { return FURNITURE[f.type].farm.kind; },
  lv(ch) { const s = (ch || activeChar()).d.skills.farming; return s ? s.lv : 0; },
  /** Light factor: outdoors full sun (less when cloudy); indoors only near a window. */
  light(f, wx) {
    if (!Arrange.indoor(f.floor, f.x, f.z)) return FARM.lightOut * (1 - 0.25 * wx.cloud);
    let best = 99;
    for (const o of HOME.openings) {
      if (o.floor !== f.floor || o.kind !== 'window') continue;
      const mid = (o.a + o.b) / 2, d = o.axis === 'z' ? Math.hypot(f.x - mid, f.z - o.at) : Math.hypot(f.x - o.at, f.z - mid);
      best = Math.min(best, d);
    }
    return best <= FARM.windowDist ? FARM.lightWindow : FARM.lightDark;
  },
  stage(p) {
    if (!p) return -1;
    if (p.dead) return 5;
    if (p.g >= 1) return 4;
    if (p.n > 0) return 3;
    return p.g < 0.12 ? 0 : p.g < 0.45 ? 1 : p.g < 0.8 ? 2 : 3;
  },
  daysLeft(f, p) {
    const C = CROPS[p.crop], wx = Weather.now();
    const period = p.n === 0 ? C.days : C.regrow;
    const rate = this.light(f, wx) * (1 + this.lv() * FARM.skillGrow);
    return rate > 0 ? (1 - p.g) * period / rate : Infinity;
  },
  step(dt) {
    const wx = Weather.at(S.time.min), lv = this.lv();
    for (const f of this.plots()) {
      const fm = f.farm, outdoor = !Arrange.indoor(f.floor, f.x, f.z);
      const dry = (outdoor ? FARM.dryOut * (1 - wx.cloud * 0.4) : FARM.dryIn) / 1440 * dt;
      fm.moist = U.clamp(fm.moist - dry + (outdoor ? wx.mmh / 60 * dt * FARM.rainPerMm : 0), 0, 1);
      const wf = fm.moist >= FARM.wetOk ? 1 : fm.moist >= FARM.wetLow ? 0.5 : 0;
      const light = this.light(f, wx);
      fm.plots.forEach((p, i) => {
        if (!p || p.dead) return;
        const C = CROPS[p.crop];
        if (wf === 0) p.hp = Math.max(0, p.hp - dt / (FARM.wiltDays * 1440));
        else p.hp = Math.min(1, p.hp + FARM.recoverPerDay * dt / 1440 * wf);
        const old = C.life && S.time.min - p.at > C.life * 1440;
        if (p.hp <= 0 || old) { p.dead = true; logEvent(STR.cropDied(C.name, old ? STR.cropOld : STR.cropDry), 'bad'); Bus.emit('farm:changed', f); return; }
        if (p.g < 1) {
          const period = p.n === 0 ? C.days : C.regrow;
          const st0 = this.stage(p);
          p.g = Math.min(1, p.g + dt / (period * 1440) * light * wf * (0.5 + 0.5 * p.hp) * (1 + lv * FARM.skillGrow));
          if (p.g >= 1) { logEvent(STR.cropReady(C.name), 'good'); Bus.emit('toast', { kind: 'good', msg: STR.cropReady(C.name) }); }
          if (this.stage(p) !== st0) Bus.emit('farm:changed', f);
        }
        void i;
      });
    }
  },
  seedsHave(ch) {
    const out = {};
    for (const id of Object.keys(CROPS)) { const n = Barricades.countAvail(ch, CROPS[id].seed); if (n > 0) out[id] = n; }
    return out;
  },
  plant(ch, f, i, crop) {
    const C = CROPS[crop];
    if (!C.beds.includes(this.kind(f))) { Toast.show(STR.cropWrongBed(C.name), 'warn'); return false; }
    if (f.farm.plots[i]) { Toast.show(STR.plotTaken, 'warn'); return false; }
    if (Barricades.countAvail(ch, C.seed) < 1) { Toast.show(STR.noSeeds(C.name), 'warn'); return false; }
    Barricades.consume(ch, C.seed, 1);
    f.farm.plots[i] = { crop, at: S.time.min, g: 0, hp: 1, n: 0, dead: false };
    GameClock.advance(FARM.plantMin);
    Skills.gain(ch, 'farming', 2);
    logEvent(STR.planted(C.name), 'info');
    Bus.emit('farm:changed', f);
    return true;
  },
  waterNeed(f) { return FARM.waterL[this.kind(f)] * (1 - f.farm.moist); },
  /** Water a plot from the tap (if running) or the nearest water store (raw water is fine for plants). */
  water(ch, f) {
    const need = this.waterNeed(f);
    if (need < 0.05) { Toast.show(STR.plotWet, 'info'); return false; }
    if (!Power.waterOn()) {
      let left = need;
      const p = ch.d.pos;
      const srcs = Water.stores().filter((s) => s.water.l > 0.05).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
      for (const s of srcs) { if (left <= 0) break; left -= Water.take(s, left).l; }
      if (left > need - 0.05) { Toast.show(STR.noWaterAnywhere, 'warn'); return false; }
      f.farm.moist = U.clamp(f.farm.moist + (need - Math.max(0, left)) / FARM.waterL[this.kind(f)], 0, 1);
    } else f.farm.moist = 1;
    const can = Health.findItem(ch, ['watering_can', 'bucket']);
    GameClock.advance(can ? FARM.waterMinCan : FARM.waterMin);
    Skills.gain(ch, 'farming', 0.5);
    logEvent(STR.watered(f.label), 'info');
    Bus.emit('farm:changed', f);
    return true;
  },
  harvest(ch, f, i) {
    const p = f.farm.plots[i]; if (!p || p.dead || p.g < 1) return false;
    const C = CROPS[p.crop], rng = RNG.local('harvest|' + f.uid + '|' + i + '|' + p.at + '|' + p.n);
    const base = C.qty[0] + Math.floor(rng() * (C.qty[1] - C.qty[0] + 1));
    const qty = Math.max(1, Math.round(base * (p.hp > 0.6 ? 1 : 0.6) * (1 + this.lv(ch) * FARM.skillYield)));
    const it = Inv.makeItem(C.out, qty);
    if (Inv.addToAny(ch.containers(), it) > 0) { const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true); Inv.add(pile.inv, it); Scene.syncPiles(); }
    p.n++;
    if (C.harvests && p.n >= C.harvests) f.farm.plots[i] = null; else p.g = 0;
    GameClock.advance(FARM.harvestMin);
    Skills.gain(ch, 'farming', 4);
    logEvent(STR.harvested(C.name, qty), 'good');
    Snd.play('ui');
    Bus.emit('farm:changed', f); Bus.emit('inv:changed');
    return qty;
  },
  clear(f, i) { f.farm.plots[i] = null; GameClock.advance(1); Bus.emit('farm:changed', f); },
  /** First free plot index (or -1). */
  free(f) { return f.farm.plots.findIndex((p) => !p); },
  init() { GameClock.onMinute((m) => { if (m % 10 === 0) this.step(10); }); },
};
