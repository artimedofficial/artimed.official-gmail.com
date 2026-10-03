/* ==========================================================================
   28 · COOKING (§6.5.5) — portion-aware recipes with tag substitutions,
   batch multiplier, stations (home gas stove, portable stove, microwave,
   no-cook), fuel/power/water use, cooking-from-frozen, quality from skill.
   ========================================================================== */

const Cook = {
  /** Ingredient sources: carried + (at home, if enabled) every home container. */
  sources(ch) {
    const list = [...ch.containers()];
    if (S.scene === 'home' && P.settings.autoDraw) {
      for (const f of S.home.furniture) { if (f.inv) list.push(f.inv); if (f.sub) list.push(f.sub); }
      for (const p of S.home.piles || []) list.push(p.inv);
    }
    return list;
  },
  matchesSlot(slot, d) {
    return slot.any.some((m) => (m.startsWith('tag:') ? d.tags.includes(m.slice(4)) : d.id === m.slice(3)));
  },
  /** Candidate ingredient entries for a recipe slot. */
  candidates(ch, slot) {
    const out = [];
    const visit = (c) => {
      for (const s of c.slots) {
        if (s.it.inv) { visit(s.it.inv); continue; }
        const d = itemDef(s.it.id);
        if (!d.per || !this.matchesSlot(slot, d)) continue;
        if (Food.ruined(s.it) || Food.stage(s.it) === 'rotten') continue;
        out.push({ it: s.it, c, slot: s, avail: Food.left(s.it) + (s.it.qty - 1) * Food.total(s.it) });
      }
    };
    for (const c of this.sources(ch)) visit(c);
    // Prefer opened and older items first (use them before they spoil)
    out.sort((a, b) => (Food.isOpened(b.it) - Food.isOpened(a.it)) || ((b.it.age || 0) - (a.it.age || 0)));
    return out;
  },
  /** Available cooking stations right now. */
  stations(ch) {
    const out = [];
    const home = S.scene === 'home';
    const stove = home && S.home.furniture.find((f) => f.type === 'stove');
    if (stove) out.push({ id: 'stove', name: STR.stHomeStove + ' (' + STR.gasLeft(Math.round(S.home.gas)) + ')', ok: S.home.gas > 0, why: STR.noGas });
    const portable = ch.containers().some((c) => Inv.count(c, 'portable_stove') > 0);
    const canister = this.findTagged(ch, 'gas');
    if (portable) out.push({ id: 'portable', kind: 'stove', name: STR.stPortable, ok: !!canister, why: STR.noCanister });
    const mw = home && S.home.furniture.find((f) => f.type === 'microwave');
    if (mw) out.push({ id: 'microwave', name: STR.stMicrowave, ok: Appliances.powered(mw) && (Power.gridOn() || Appliances.allocation().watts + 800 <= FURNITURE.generator.capacityW), why: STR.noPower });
    out.push({ id: 'none', name: STR.stNone, ok: true });
    return out;
  },
  findTagged(ch, tag) {
    for (const c of this.sources(ch)) for (const s of c.slots) { const d = itemDef(s.it.id); if (d.tags.includes(tag) && (s.it.uses == null || s.it.uses > 0)) return { c, slot: s }; }
    return null;
  },
  stationKind(st) { return st.kind || st.id; },
  /**
   * Validate and preview. choices: [{ entry, amt }] aligned with recipe.slots (entry null = skip).
   * Returns {ok, why, minutes, outPortions, per, quality, risk, water}
   */
  preview(ch, r, choices, batch, station, longer) {
    let kcalSum = 0, frozen = false, thick = false, seasoning = false, spoiledRisk = 0;
    const sum = { kcal: 0, protein: 0, carb: 0, fat: 0, micro: 0, satiety: 0, water: 0 };
    for (let i = 0; i < r.slots.length; i++) {
      const sl = r.slots[i], ch_ = choices[i];
      if (!ch_ || !ch_.entry) { if (!sl.optional) return { ok: false, why: STR.missingIng(sl.label) }; continue; }
      const amt = ch_.amt * batch;
      if (amt > ch_.entry.avail) return { ok: false, why: STR.notEnoughIng(sl.label) };
      const it = ch_.entry.it, per = Food.per(it);
      for (const k in sum) sum[k] += (per[k] || 0) * amt;
      kcalSum += per.kcal * amt;
      if ((it.frz || 0) > 0.3) { frozen = true; if (itemDef(it.id).weight > 0.6) thick = true; }
      if (sl.seasoning) seasoning = true;
      if (Food.stage(it) === 'spoiled') spoiledRisk += 0.25;
    }
    const kind = this.stationKind(station);
    if (!r.station.includes(kind)) return { ok: false, why: STR.wrongStation };
    if (!station.ok) return { ok: false, why: station.why };
    const sk = ch.skill('cooking');
    const quality = U.clamp(0.55 + sk * 0.04 + (seasoning ? 0.1 : 0) + (ch.hasTrait('thrifty') ? 0.03 : 0), 0.3, 1);
    let minutes = r.time * Math.sqrt(batch) * (1 - sk * 0.035);
    if (frozen) minutes *= THAW.cookFromFrozenMul * (longer ? 1.35 : 1);
    if (kind === 'microwave') minutes *= 0.7;
    const ref = itemDef(r.out).refKcal || 150;
    const thrift = ch.hasTrait('thrifty') ? 1.1 : 1;
    const outPortions = Math.max(1, Math.round((kcalSum * thrift) / ref));
    const retention = 0.82 + quality * 0.18;
    const per = {
      kcal: (sum.kcal * thrift) / outPortions,
      protein: sum.protein / outPortions,
      carb: sum.carb / outPortions,
      fat: sum.fat / outPortions,
      micro: (sum.micro * retention) / outPortions,
      satiety: Math.max(itemDef(r.out).per.satiety, (sum.satiety / outPortions) * (r.water ? 1.25 : 1.05)) * (0.9 + quality * 0.2),
      water: (r.water ? 8 : 0) + sum.water / outPortions,
    };
    const risk = U.clamp((thick && !longer ? 0.3 : 0) * (1.2 - quality) + spoiledRisk * (r.method === 'none' ? 1 : 0.4), 0, 0.9);
    const water = (r.water || 0) * Math.ceil(batch);
    return { ok: true, minutes: Math.round(minutes), outPortions, per, quality, risk, water, frozen, thick };
  },
  /** Consume the water needed for boiling: tap (utilities on, at home) or carried drinking water. */
  takeWater(ch, units) {
    if (!units) return true;
    if (S.scene === 'home' && Power.waterOn()) return true;
    let need = units;
    for (const c of this.sources(ch)) {
      for (const s of [...c.slots]) {
        if (need <= 0) break;
        const d = itemDef(s.it.id);
        if (!d.tags.includes('water')) continue;
        while (need > 0 && Inv.locate(c, s.it.uid)) {
          const r = Food.takePortions(ch, c, s, 1);
          if (!r || !r.taken) break;
          need -= 1;
        }
      }
    }
    return need <= 0;
  },
  /** Cook it. Returns the produced dish item or null. */
  make(ch, r, choices, batch, station, longer) {
    const pv = this.preview(ch, r, choices, batch, station, longer);
    if (!pv.ok) { Bus.emit('toast', { kind: 'warn', msg: pv.why }); return null; }
    if (!this.takeWater(ch, pv.water)) { Bus.emit('toast', { kind: 'warn', msg: STR.noWater }); return null; }
    // Fuel / power
    if (station.id === 'stove') S.home.gas = Math.max(0, S.home.gas - pv.minutes * 0.05);
    if (station.id === 'portable') { const g = this.findTagged(ch, 'gas'); if (g) { g.slot.it.uses = Math.max(0, (g.slot.it.uses || 0) - Math.ceil(pv.minutes / 2)); if (g.slot.it.uses <= 0) Inv.remove(g.c, g.slot); } }
    // Consume ingredients
    for (let i = 0; i < r.slots.length; i++) {
      const c = choices[i]; if (!c || !c.entry) continue;
      let left = c.amt * batch;
      while (left > 0) {
        const loc = this.sources(ch).map((x) => Inv.locate(x, c.entry.it.uid)).find(Boolean);
        if (!loc) break;
        const res = Food.takePortions(ch, loc.c, loc.slot, left);
        if (!res || !res.taken) break;
        left -= res.taken;
      }
    }
    GameClock.advance(pv.minutes);
    const dish = Inv.makeItem(r.out, 1);
    dish.age = 0; dish.frz = 0;
    dish.st = { cooked: true, portionsTotal: pv.outPortions, portionsLeft: pv.outPortions, nut: pv.per, quality: Math.round(pv.quality * 100) / 100, risk: pv.risk || 0 };
    const dest = [...ch.containers()];
    if (Inv.addToAny(dest, dish) > 0) {
      const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true);
      Inv.add(pile.inv, dish); Scene.syncPiles();
    }
    Skills.gain(ch, 'cooking', 4 + pv.outPortions * 1.5);
    logEvent(STR.cooked(r.name, pv.outPortions), 'good');
    Bus.emit('inv:changed');
    return dish;
  },
  /** Microwave defrost (§6.6.4): fast thaw, should be cooked soon after. */
  microwaveThaw(ch, c, slot) {
    const mw = S.home.furniture.find((f) => f.type === 'microwave');
    if (!mw || S.scene !== 'home' || !Appliances.powered(mw)) { Bus.emit('toast', { kind: 'warn', msg: STR.noPower }); return false; }
    const it = slot.it;
    GameClock.advance(Math.round(THAW.microwaveMin * Math.sqrt(Math.max(0.25, itemDef(it.id).weight) / 0.25)));
    it.frz = 0;
    it.st = Object.assign(it.st || {}, { mustCookBy: S.time.min + 60 });
    if (Food.isRaw(it)) it.st.thawedRaw = true;
    logEvent(STR.microThawed(itemDef(it.id).name), 'info');
    return true;
  },
};
