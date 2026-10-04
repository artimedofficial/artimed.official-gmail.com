/* ==========================================================================
   26 · FOOD SYSTEM (§6.3, §6.5, §6.6)
   Item food state lives on the instance:
     it.age  0 = fresh … 1 = spoiled … 1.4+ = rotten (progress against life hours)
     it.frz  0 = thawed … 1 = frozen solid
     it.st   { portionsLeft, portionsTotal, opened, nut (per-portion override for dishes),
               cooked, soft, ruined, thawedRaw, risk, mustCookBy, quality }
   Spoil — hourly ageing/freezing of every container (home, carried, visited places).
   Food  — portions, opening, eating, poisoning risk.
   Body  — two-layer hunger: satiety (Needs) + energy reserve & 4 nutrient buffers.
   Meal  — "Eat Meal" planner by ration level.
   ========================================================================== */

const Food = {
  def(it) { return itemDef(it.id); },
  edibleDef(d) { return !!d.per; },
  total(it) { return (it.st && it.st.portionsTotal) || itemDef(it.id).portions || 1; },
  left(it) { return it.st && it.st.portionsLeft != null ? it.st.portionsLeft : this.total(it); },
  per(it) { return (it.st && it.st.nut) || itemDef(it.id).per; },
  isOpened(it) { return !!(it.st && it.st.opened); },
  isRaw(it) { const d = itemDef(it.id); return d.tags.includes('raw') && !(it.st && it.st.cooked); },
  ruined(it) { return !!(it.st && it.st.ruined); },
  /** Freshness stage name key. */
  stage(it) {
    if (this.ruined(it)) return 'ruined';
    const a = it.age || 0;
    return a < FRESH.aging ? 'fresh' : a < FRESH.spoiled ? 'aging' : a < FRESH.rotten ? 'spoiled' : 'rotten';
  },
  /** Can this be eaten as-is? Returns null or a reason string. */
  blockReason(it) {
    const d = itemDef(it.id);
    if (!d.per) return STR.notFood;
    if (this.ruined(it)) return STR.ruinedItem;
    if (this.stage(it) === 'rotten') return STR.rottenItem;
    if ((it.frz || 0) > 0.3 && !d.tags.includes('sweet')) return STR.frozenSolid;
    if (it.st && it.st.soft && d.tags.includes('veg')) return STR.softCookOnly;
    return null;
  },
  /** Illness probability when eating this now. */
  risk(it) {
    let r = 0;
    const s = this.stage(it);
    if (s === 'spoiled') r += 0.35;
    if (this.isRaw(it)) r += itemDef(it.id).tags.includes('meat') || itemDef(it.id).tags.includes('poultry') || itemDef(it.id).tags.includes('seafood') || itemDef(it.id).tags.includes('fish') ? 0.45 : 0.05;
    if (it.st && it.st.risk) r += it.st.risk;
    return U.clamp(r, 0, 0.95);
  },
  /** Open one unit (applies the opened spoilage clock, §6.5.2). env: storage environment. */
  open(it, env) {
    if (this.isOpened(it)) return;
    const d = itemDef(it.id);
    const remU = (1 - (it.age || 0)) * Spoil.lifeH(d, it, env);
    it.st = Object.assign(it.st || {}, { opened: true });
    const lifeO = Spoil.lifeH(d, it, env);
    it.age = U.clamp(1 - Math.min(remU, lifeO) / lifeO, it.age || 0, 2);
    if (it.st.portionsLeft == null) it.st.portionsLeft = this.total(it);
  },
  /**
   * Take n portions from a slot (splits one unit off a stack and opens it).
   * Returns { taken, per, unit } or null. Removes emptied units.
   */
  takePortions(ch, c, slot, n) {
    const it = slot.it;
    let unit = it, unitC = c;
    if (it.qty > 1) {
      unit = Inv.makeItem(it.id, 1);
      unit.age = it.age; unit.frz = it.frz;
      this.open(unit, Spoil.envOf(c));                 // opened units never stack back
      it.qty -= 1;
      const dest = [c, ...ch.containers().filter((x) => x !== c)].find((x) => Inv.add(x, unit) === 0);
      if (!dest) { it.qty += 1; return null; }
      unitC = dest;
    }
    this.open(unit, Spoil.envOf(unitC));
    const left = this.left(unit);
    const taken = Math.min(n, left);
    const per = this.per(unit);
    unit.st.portionsLeft = left - taken;
    if (unit.st.portionsLeft <= 0) { const loc = Inv.locate(unitC, unit.uid); if (loc) Inv.remove(loc.c, loc.slot); }
    return { taken, per, unit };
  },
  /**
   * Eat n portions (§6.5.2): 2–5 game minutes each; nutrients credited per whole portion.
   * Returns true if anything was eaten.
   */
  eat(ch, c, slot, n, opts = {}) {
    const it = slot.it, d = itemDef(it.id);
    const why = this.blockReason(it);
    if (why) { Bus.emit('toast', { kind: 'warn', msg: why }); return false; }
    const risk = this.risk(it);
    const res = this.takePortions(ch, c, slot, n);
    if (!res || !res.taken) { Bus.emit('toast', { kind: 'warn', msg: STR.containerFull }); return false; }
    Body.intake(ch.d, res.per, res.taken);
    if (!opts.noTime) GameClock.advance(Math.round(res.taken * (d.cat === 'drink' ? 1.5 : 3.5)));
    if (risk > 0 && RNG.next('events') < risk) Illness.add(ch.d, 'food_poison', 0.4 + risk * 0.6);
    if (!opts.silent) logEvent((d.cat === 'drink' ? STR.drank(d.name) : STR.ate(d.name)) + ' ×' + res.taken + ' ' + STR.portionUnit);
    Bus.emit('inv:changed');
    return true;
  },
  /** Display name with state suffixes. */
  label(it) {
    const d = itemDef(it.id);
    let n = d.name;
    if (it.st && it.st.ruined) n += ' ' + STR.suffixRuined;
    else if (it.st && it.st.opened) n += ' ' + STR.suffixOpened;
    return n;
  },
};

const Spoil = {
  envOf(c) {
    if (!c) return 'ambient';
    const cold = c.cold == null ? 1 : c.cold;
    if (c.temp === 'freezer' && cold > 0) return 'freezer';
    if (c.temp === 'fridge' && cold > 0) return 'fridge';
    return 'ambient';
  },
  lifeH(d, it, env) {
    const o = d.opened || { ambientH: 24, fridgeD: 2 };
    const op = (it.st && (it.st.opened || it.st.cooked)) || d.cooked;
    if (op) return Math.max(1, env === 'ambient' ? o.ambientH : o.fridgeD * 24);
    const shelfH = Math.max(1, (d.shelf || 30) * 24), store = d.store || 'ambient';
    if (store === 'ambient') return env === 'ambient' ? shelfH : shelfH * 1.5;
    if (store === 'fridge') return env === 'ambient' ? Math.min(shelfH, o.ambientH) : shelfH;
    return env === 'ambient' ? o.ambientH : o.fridgeD * 24;           // frozen goods once thawed
  },
  scale(d, base, exp) { return base * Math.pow(Math.max(0.05, d.weight) / 0.25, exp); },
  thawH(d, env) { return env === 'fridge' ? this.scale(d, THAW.fridgeH, THAW.fridgeExp) : this.scale(d, THAW.ambientH, THAW.ambientExp); },
  freezeH(d) { return this.scale(d, THAW.freezeH, THAW.freezeExp); },
  /** Advance one item by h hours in environment env. */
  stepItem(it, env, h) {
    const d = itemDef(it.id);
    if (it.inv) this.stepContainer(it.inv, h, env);
    if (!d.per) return;
    if (it.st && it.st.ruined) return;
    let frz = it.frz || 0;
    let effEnv = env;
    if (env === 'freezer') {
      if (d.freeze === 'no') {
        frz = Math.min(1, frz + h / this.freezeH(d));
        if (frz >= 0.5) { it.st = Object.assign(it.st || {}, { ruined: 'burst' }); it.frz = frz; return; }
      } else if (it.st && it.st.thawedRaw) effEnv = 'fridge';            // fully thawed raw: cannot refreeze
      else frz = Math.min(1, frz + h / this.freezeH(d));
      if (frz > 0.999) frz = 1;
    } else if (frz > 0) {
      frz = Math.max(0, frz - h / this.thawH(d, env));
      if (frz < 0.001) frz = 0;
      if (frz === 0) {
        it.st = it.st || {};
        if (d.tags.includes('raw') && !it.st.cooked) it.st.thawedRaw = true;
        if (d.freeze === 'texture') it.st.soft = true;
      }
    }
    it.frz = frz;
    if (frz >= 1) return;                                              // frozen solid: no spoilage
    if ((effEnv === 'freezer' || effEnv === 'fridge') && frz > 0) return; // still partly frozen in the cold
    if (effEnv === 'ambient' && frz > 0.5) return;                     // surface not yet warm
    it.age = (it.age || 0) + h / this.lifeH(d, it, effEnv === 'freezer' ? 'fridge' : effEnv);
    if (it.age > 3) it.age = 3;
  },
  stepContainer(c, h, envOverride) {
    const env = envOverride && envOverride !== 'ambient' && c.temp === 'ambient' ? envOverride : this.envOf(c);
    for (const s of c.slots) this.stepItem(s.it, env, h);
  },
  /** Cold-hold for a unit container: powered units recover; unpowered ones warm up. */
  stepCold(c, holdKey, powered, h) {
    if (c.cold == null) c.cold = 1;
    if (powered) c.cold = Math.min(1, c.cold + h * 0.5);
    else c.cold = Math.max(0, c.cold - h / (COLD_HOLD[holdKey] || 6));
  },
  /** Mark frozen goods in a freezer as frozen solid (initial stocking). */
  freezeContents(c) { Inv.walk(c, (it) => { const d = itemDef(it.id); if (d.per && d.freeze !== 'no') it.frz = 1; }); },
  /** Hour tick across the whole world. */
  tickHour(h = 1, atMin = S.time.min) {
    const grid = Power.gridOn(atMin);
    for (const f of S.home.furniture) {
      const def = FURNITURE[f.type];
      if (f.inv && def.temp) this.stepCold(f.inv, def.hold, Appliances.powered(f, grid), h);
      if (f.sub && def.sub) this.stepCold(f.sub, def.sub.hold, Appliances.powered(f, grid), h);
      if (f.inv) this.stepContainer(f.inv, h);
      if (f.sub) this.stepContainer(f.sub, h);
    }
    for (const p of S.home.piles || []) this.stepContainer(p.inv, h);
    for (const d of S.chars) {
      this.stepContainer(d.pockets, h);
      for (const k of ['back', 'hand', 'weapon']) if (d.equip[k]) this.stepItem(d.equip[k], d.equip[k].inv && itemDef(d.equip[k].id).tags.includes('insulated') ? 'fridge' : 'ambient', h);
    }
    if (!S.flags.outbreak) return;                                     // shops restock until the outbreak
    for (const id in S.locs) this.tickLoc(S.locs[id], h, grid);
  },
  tickLoc(st, h, grid) {
    for (const f of st.furniture) {
      if (!f.inv) continue;
      const def = FURNITURE[f.type];
      if (def.temp) this.stepCold(f.inv, def.hold, grid, h);
      this.stepContainer(f.inv, h);
    }
    for (const p of st.piles) this.stepContainer(p.inv, h);
  },
  /** Bring a freshly generated location up to date (generated after the outbreak). */
  catchUp(st) {
    const from = CFG.OUTBREAK_MINUTE, to = S.time.min;
    for (let t = from; t + 60 <= to; t += 60) this.tickLoc(st, 1, Power.gridOn(t));
  },
  init() { GameClock.onHour(() => this.tickHour(1)); },
};

/** Two-layer hunger model, long-term layer (§6.5.3). */
const Body = {
  init(d) {
    if (!d.nut || typeof d.nut !== 'object') d.nut = {};
    const n = d.nut;
    n.reserve = U.num(n.reserve, 0, -60000, 8000);
    n.buf = n.buf && typeof n.buf === 'object' ? n.buf : {};
    for (const g of ['protein', 'carb', 'fat', 'micro']) n.buf[g] = U.num(n.buf[g], 6, 0, NUTRITION.bufferDays);
    n.today = n.today && typeof n.today === 'object' ? n.today : { in: 0, out: 0 };
    n.today.in = U.num(n.today.in, 0, 0, 1e6); n.today.out = U.num(n.today.out, 0, 0, 1e6);
    n.hist = Array.isArray(n.hist) ? n.hist.filter((h) => h && isFinite(h.in) && isFinite(h.out)).slice(-14) : [];
    if (!RATIONS[n.ration]) n.ration = 'normal';
    n.auto = !!n.auto;
    if (!Array.isArray(d.ill)) d.ill = [];
    return n;
  },
  minute(d, act) {
    const n = d.nut;
    const ch = new Character(d);
    const load = Math.max(0, ch.load() - 0.5);
    const burn = (NUTRITION.baseKcal / 1440) * (NUTRITION.activity[act] || 1) * (1 + load * 0.35) * (d.ill.length ? 1.1 : 1);
    n.reserve = Math.max(-60000, n.reserve - burn);
    n.today.out += burn;
    for (const g in n.buf) n.buf[g] = Math.max(0, n.buf[g] - 1 / 1440);
  },
  dayRoll(d, day) {
    const n = d.nut;
    n.hist.push({ day: day - 1, in: Math.round(n.today.in), out: Math.round(n.today.out) });
    if (n.hist.length > 14) n.hist.shift();
    n.today = { in: 0, out: 0 };
  },
  intake(d, per, portions) {
    const n = d.nut, kcal = per.kcal * portions;
    // Refeeding bonus only on the part of today's intake that exceeds today's expenditure.
    const surplus = Math.max(0, Math.min(kcal, n.today.in + kcal - n.today.out));
    const credit = kcal + (n.reserve < 0 ? surplus * (NUTRITION.refeedEfficiency - 1) : 0);
    n.reserve = Math.min(8000, n.reserve + credit);
    n.today.in += kcal;
    for (const g of ['protein', 'carb', 'fat', 'micro']) n.buf[g] = U.clamp(n.buf[g] + (per[g] * portions) / NUTRITION.target[g], 0, NUTRITION.bufferDays);
    const poisoned = d.ill.some((x) => x.type === 'food_poison');
    d.needs.satiety = U.clamp(d.needs.satiety + per.satiety * 3.2 * portions * (poisoned ? 0.5 : 1), 0, 100);
    d.needs.hydration = U.clamp(d.needs.hydration + (per.water || 0) * portions, 0, 100);
  },
  stage(d) { const r = d.nut.reserve; return NUTRITION.stages.find((s) => r >= s.min) || NUTRITION.stages[NUTRITION.stages.length - 1]; },
  deficient(d) { return Object.keys(d.nut.buf).filter((g) => d.nut.buf[g] < NUTRITION.lowDays); },
  /** Combined effect multipliers from energy stage and nutrient deficiencies. */
  effects(d) {
    const s = this.stage(d), def = this.deficient(d), balanced = Object.values(d.nut.buf).every((v) => v > 4);
    return {
      carry: s.carry * (def.includes('protein') ? 0.92 : 1),
      speed: s.speed,
      skill: s.skill,
      heal: s.heal * (def.includes('protein') ? 0.6 : 1) * (def.includes('fat') ? 0.9 : 1) * (balanced ? 1.1 : 1),
      staminaMax: def.includes('carb') ? 70 : 100,
      staminaRegen: def.includes('fat') ? 0.7 : 1,
      infection: (def.includes('micro') ? 1.35 : 1) * (s.key === 'weak' || s.key === 'veryweak' || s.key === 'starving' ? 1.25 : 1),
    };
  },
  /** Estimated daily need (kcal) from the last two days of activity. */
  need(d) {
    const h = d.nut.hist.slice(-2);
    return h.length ? Math.max(1600, h.reduce((a, x) => a + x.out, 0) / h.length) : NUTRITION.baseKcal * 1.15;
  },
  initHooks() {
    GameClock.onDay((t) => { for (const d of S.chars) this.dayRoll(d, t.day); });
  },
};

/** Conditions such as food poisoning (illness system is extended in 1D). */
const Illness = {
  add(d, type, sev, msg = STR.illPoison) {
    const ex = d.ill.find((x) => x.type === type);
    if (ex) { ex.sev = Math.min(1, ex.sev + sev * 0.5); ex.h = Math.max(ex.h, 12 + sev * 24); }
    else d.ill.push({ type, sev: U.clamp(sev, 0.1, 1), h: 12 + sev * 24 });
    logEvent(msg, 'bad');
    Bus.emit('toast', { kind: 'bad', msg });
  },
  minute(d) {
    for (const x of d.ill) {
      if (x.type === 'food_poison') {
        d.needs.hydration = Math.max(0, d.needs.hydration - x.sev * 0.06);
        d.needs.energy = Math.max(0, d.needs.energy - x.sev * 0.02);
      }
      x.h -= 1 / 60;
    }
    d.ill = d.ill.filter((x) => x.h > 0);
  },
  /** Medicines for gut illness (ORS / antidiarrheal). Returns true if used. */
  treat(d, item) {
    const p = d.ill.find((x) => x.type === 'food_poison');
    const tags = itemDef(item.id).tags;
    if (tags.includes('electrolyte')) d.needs.hydration = Math.min(100, d.needs.hydration + 25);
    if (!p) return tags.includes('electrolyte');
    p.sev *= tags.includes('diarrhea') ? 0.5 : 0.75;
    p.h *= 0.8;
    return true;
  },
};

/** Eat Meal planner (§6.5.4). */
const Meal = {
  sources(ch) {
    const list = [...ch.containers()];
    if (S.scene === 'home') {
      for (const f of S.home.furniture) { if (f.inv) list.push(f.inv); if (f.sub) list.push(f.sub); }
      for (const p of S.home.piles || []) list.push(p.inv);
    }
    return list;
  },
  /** Food candidates: [{it, c, slot, per, left, score…}] */
  candidates(ch) {
    const out = [], reserve = S.food.reserve, exclude = S.food.exclude;
    const seen = new Set();
    const visit = (c) => {
      for (const s of c.slots) {
        const it = s.it, d = itemDef(it.id);
        if (it.inv) { visit(it.inv); continue; }
        if (!d.per || seen.has(it.uid)) continue;
        seen.add(it.uid);
        if (Food.blockReason(it)) continue;
        if (['spoiled', 'rotten'].includes(Food.stage(it))) continue;
        if (Food.isRaw(it)) continue;
        if (d.tags.some((t) => ['condiment', 'spice', 'drink_mix', 'alcohol', 'staple', 'curry_paste', 'flour'].includes(t)) && !d.cooked) continue;
        if (exclude.includes(d.id)) continue;
        if (reserve.includes(d.id) && !Food.isOpened(it)) continue;
        if (d.per.kcal < 5) continue;
        out.push({ it, c, slot: s, per: Food.per(it), avail: Food.left(it) + (it.qty - 1) * Food.total(it) });
      }
    };
    for (const c of this.sources(ch)) visit(c);
    return out;
  },
  /** Greedy composition to the ration target, preferring opened/expiring items and missing nutrients. */
  plan(ch) {
    const d = ch.d;
    const target = (Body.need(d) * RATIONS[d.nut.ration].f) / 3;
    const cands = this.candidates(ch);
    const buf = Object.assign({}, d.nut.buf);
    const picks = new Map();
    let kcal = 0, guard = 0;
    while (kcal < target * 0.95 && guard++ < 24) {
      let best = null, bs = -Infinity;
      for (const e of cands) {
        const used = picks.get(e) || 0;
        if (used >= e.avail) continue;
        const p = e.per, st = Food.stage(e.it);
        let s = 0;
        if (Food.isOpened(e.it) || used > 0) s += 120;
        if (st === 'aging') s += 70;
        const remH = (1 - (e.it.age || 0)) * Spoil.lifeH(itemDef(e.it.id), e.it, Spoil.envOf(e.c));
        if (remH < 72) s += 40 * (1 - remH / 72);
        for (const g of ['protein', 'carb', 'fat', 'micro']) s += (p[g] / NUTRITION.target[g]) * (NUTRITION.bufferDays - buf[g]) * 12;
        s += Math.min(10, p.kcal / 30);
        if (kcal + p.kcal > target * 1.25) s -= 80;
        // Meal suitability: real food over sweets/snacks; diminishing returns per extra portion of one item.
        const tags = itemDef(e.it.id).tags;
        if (tags.includes('cooked') || tags.includes('ready') || tags.includes('rice')) s += 25;
        if (tags.includes('sweet') || tags.includes('dessert') || tags.includes('snack') || tags.includes('soda')) s -= 30 + used * 25;
        s -= used * (Food.isOpened(e.it) ? 4 : 18);
        if (s > bs) { bs = s; best = e; }
      }
      if (!best) break;
      picks.set(best, (picks.get(best) || 0) + 1);
      kcal += best.per.kcal;
      for (const g of ['protein', 'carb', 'fat', 'micro']) buf[g] += best.per[g] / NUTRITION.target[g];
    }
    return { target, rows: [...picks.entries()].map(([e, n]) => ({ e, n })), cands };
  },
  totals(rows) {
    const t = { kcal: 0, protein: 0, carb: 0, fat: 0, micro: 0, satiety: 0 };
    for (const { e, n } of rows) for (const k in t) t[k] += (e.per[k] || 0) * n;
    return t;
  },
  /** Execute a planned meal. */
  eat(ch, rows) {
    let total = 0, names = [];
    for (const { e, n } of rows) {
      let left = n;
      while (left > 0) {
        const loc = Inv.locate(e.c, e.it.uid) || this.sources(ch).map((c) => Inv.locate(c, e.it.uid)).find(Boolean);
        if (!loc) break;
        const take = Math.min(left, Food.left(loc.slot.it));
        if (!Food.eat(ch, loc.c, loc.slot, take, { silent: true })) break;
        left -= take; total += take;
      }
      names.push(itemDef(e.it.id).name + ' ×' + (n - left));
    }
    if (total) logEvent(STR.mealLog(names.join(', ')), 'info');
    return total;
  },
  initAuto() {
    GameClock.onHour((t) => {
      if (![7, 12, 18].includes(t.hour)) return;
      for (const d of S.chars) {
        if (!d.alive || !d.nut.auto || d.sleeping || S.scene !== 'home') continue;
        const ch = new Character(d);
        const p = this.plan(ch);
        if (p.rows.length) { this.eat(ch, p.rows); Bus.emit('toast', { kind: 'info', msg: STR.autoMealDone }); }
      }
    });
  },
};
