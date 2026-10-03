/* ==========================================================================
   24 · WORLD STATE — location generation & depletion, shop payment, travel
   ========================================================================== */

const World = {
  /** Map coordinates → km (city routing factor 1.2; 200 map px = 1 km). */
  km(a, b) {
    const A = locDef(a).map, B = locDef(b).map;
    return (Math.hypot(A[0] - B[0], A[1] - B[1]) / 200) * 1.2;
  },
  loc(id) { return S.locs[id] || null; },
  /** Create a location's fixtures and stock the first time it is visited in this life. */
  ensureLoc(id) {
    if (S.locs[id]) return S.locs[id];
    const L = locDef(id);
    const diff = difficultyOf(S.difficulty);
    const furniture = L.fixtures.map(([type, x, z, rot, pool], i) => {
      const def = FURNITURE[type];
      const f = { uid: id + ':' + i, type, floor: 0, x, z, rot, label: def.name, pool };
      if (def.grid) { f.inv = Inv.makeContainer(def.grid[0], def.grid[1], def.limit, def.name, def.temp || 'ambient'); f.inv.shop = id; }
      return f;
    });
    furniture.forEach((f, i) => {
      if (!f.inv) return;
      const rng = RNG.local('loot|' + S.worldSeed + '|' + id + '|' + i);
      const fixed = FIXED_STOCK[id + ':' + f.type];
      if (fixed) for (const [iid, q] of fixed) { const it = Inv.makeItem(iid, q); Inv.add(f.inv, it); }
      if (f.pool) this.stock(f.inv, POOLS[f.pool], rng, 0.92 * (L.density || 1) * diff.loot);
    });
    for (const f of furniture) if (f.inv && f.inv.temp === 'freezer') Spoil.freezeContents(f.inv);
    const st = { furniture, piles: [], initial: 0, depletedTo: 1, visits: 0, lastVisit: null, genAt: S.time.min };
    st.initial = this.countItems(st);
    S.locs[id] = st;
    if (S.flags.outbreak) Spoil.catchUp(st);
    if (!S.flags.outbreak) this.markUnpaid(st, id);
    return st;
  },
  /** Fill a container from a weighted pool until ~fill of its cells are used. */
  stock(c, pool, rng, fill) {
    if (!pool || !pool.length) return 0;
    const sum = pool.reduce((a, p) => a + p[1], 0);
    const cells = c.w * c.h;
    const occupied = () => c.slots.reduce((a, s) => a + Inv.area(s.it), 0);
    let used = occupied(), fails = 0, n = 0;
    while (used < cells * Math.min(0.97, fill) && fails < 40) {
      let r = rng() * sum, pick = pool[0];
      for (const p of pool) { r -= p[1]; if (r <= 0) { pick = p; break; } }
      if (!ITEMS[pick[0]]) { fails++; continue; }
      const it = Inv.makeItem(pick[0], 1 + Math.floor(rng() * pick[2]));
      if (Inv.add(c, it) === 0) { n++; const u = occupied(); if (u === used) fails++; used = u; } else fails++;
    }
    return n;
  },
  countItems(st) {
    let n = 0;
    for (const f of st.furniture) if (f.inv) Inv.walk(f.inv, (it) => { n += it.qty; });
    return n;
  },
  markUnpaid(st, id) {
    for (const f of st.furniture) if (f.inv) Inv.walk(f.inv, (it) => { it.unpaid = id; });
  },
  /**
   * Other scavengers take a growing share after the outbreak (§4.2). Deterministic:
   * each slot rolls against the target remaining fraction for the current day.
   */
  deplete(id) {
    const st = S.locs[id]; if (!st || !S.flags.outbreak) return;
    const days = Math.max(0, S.time.min / 1440 - CFG.OUTBREAK_MINUTE / 1440);
    const diff = difficultyOf(S.difficulty);
    const target = Math.max(0.12, 1 - days * 0.035 * (2 - diff.loot));
    if (target >= st.depletedTo - 0.01) return;
    const takeFrac = 1 - target / st.depletedTo;
    const rng = RNG.local('deplete|' + S.worldSeed + '|' + id + '|' + Math.floor(days));
    for (const f of st.furniture) {
      if (!f.inv) continue;
      f.inv.slots = f.inv.slots.filter((s) => {
        if (rng() >= takeFrac) return true;
        if (s.it.qty > 1 && rng() < 0.5) { s.it.qty = Math.ceil(s.it.qty / 2); return true; }
        return false;
      });
    }
    st.depletedTo = target;
  },
  lootPct(id) {
    const st = S.locs[id]; if (!st || !st.initial) return 0;
    return Math.round((1 - this.countItems(st) / st.initial) * 100);
  },
  /** The outbreak voids every shop: unpaid flags are dropped everywhere. */
  clearUnpaid() {
    const clear = (c) => Inv.walk(c, (it) => { delete it.unpaid; });
    for (const id in S.locs) { for (const f of S.locs[id].furniture) if (f.inv) clear(f.inv); for (const p of S.locs[id].piles) clear(p.inv); }
    for (const d of S.chars) { clear(d.pockets); for (const k of ['back', 'hand', 'weapon']) if (d.equip[k]) { delete d.equip[k].unpaid; if (d.equip[k].inv) clear(d.equip[k].inv); } }
    for (const f of S.home.furniture) { if (f.inv) clear(f.inv); if (f.sub) clear(f.sub); }
    for (const p of S.home.piles || []) clear(p.inv);
  },
};

/** Pre-outbreak shopping: carry goods to the counter, pay with cash (§4.2). */
const Shop = {
  /** Unpaid items the character carries (incl. equipped bags/carts and the bags themselves). */
  unpaid(ch) {
    const out = [];
    const visit = (it, c, slot) => { if (it.unpaid) out.push({ it, c, slot }); };
    for (const c of [ch.d.pockets]) Inv.walk(c, visit);
    for (const k of ['back', 'hand', 'weapon']) {
      const it = ch.d.equip[k]; if (!it) continue;
      if (it.unpaid) out.push({ it, equip: k });
      if (it.inv) Inv.walk(it.inv, visit);
    }
    return out;
  },
  total(list) { return list.reduce((a, e) => a + (itemDef(e.it.id).price || 0) * e.it.qty, 0); },
  pay(ch) {
    const list = this.unpaid(ch), tot = this.total(list);
    if (tot > S.cash) return false;
    S.cash -= tot;
    for (const e of list) delete e.it.unpaid;
    logEvent(STR.paidLog(U.money(tot)), 'info');
    return true;
  },
  /** Put every unpaid carried item back into the shop (piles at the door if shelves are full). */
  returnAll(ch) {
    const st = World.loc(S.scene); if (!st) return;
    const targets = st.furniture.filter((f) => f.inv).map((f) => f.inv);
    const pile = Scene.pileNear(0, Scene.W.spawn.x, Scene.W.spawn.z, true);
    for (const e of this.unpaid(ch)) {
      if (e.equip) { ch.d.equip[e.equip] = null; Inv.addToAny([...targets, pile.inv], e.it); continue; }
      Inv.remove(e.c, e.slot);
      if (Inv.addToAny([...targets, pile.inv], e.it) > 0) console.warn('[Shop] could not return', e.it.id);
    }
    Scene.syncPiles();
  },
};

/** Travel between locations: time cost from distance, pace and load (§4.1, §4.4). */
const Travel = {
  /** Minutes to travel; pace: 'walk' | 'run'. Heavy loads slow you, running drains stamina. */
  minutes(from, to, pace) {
    const ch = activeChar();
    const km = World.km(from, to);
    const kmh = (pace === 'run' ? RUN_KMH : WALK_KMH) * Math.max(0.25, ch.speedFactor()) * (1 + ch.skill('fitness') * 0.02);
    return Math.max(2, Math.round((km / kmh) * 60));
  },
  canLeave() {
    const ch = activeChar();
    return ch.speedFactor() > 0.01;
  },
  /** Advance the clock through the trip (all systems tick), then enter the destination. */
  async go(to, pace) {
    if (S.scene === 'street') { Bus.emit('toast', { kind: 'warn', msg: STR.finishStreetFirst }); return; }
    if (!LOCATIONS[to] || LOCATIONS[to].hidden || to === S.scene) return;
    const from = S.scene, mins = this.minutes(from, to, pace);
    const d = S.chars[S.active];
    const enc = Encounters.roll(from, to, pace);
    const half = enc ? Math.max(1, Math.floor(mins / 2)) : mins;
    TravelUI.show(locDef(to).name, mins);
    d._moving = pace === 'run' ? 'run' : 'walk';
    const t0 = S.time.min;
    const run = async (n) => {
      let done = 0;
      while (done < n && d.alive) {
        const step = Math.min(n - done, Math.max(1, Math.ceil(mins / 30)));
        GameClock.advance(step); done += step;
        TravelUI.progress((S.time.min - t0) / mins, S.time.min);
        await new Promise((r) => requestAnimationFrame(r));
      }
    };
    await run(half);
    if (pace === 'run') d.needs.stamina = Math.max(0, d.needs.stamina - Math.min(80, mins * 2.2));
    S.travelLog = { from, to, at: t0, mins, enc };
    if (!d.alive) { TravelUI.hide(); return; }
    if (enc === 'zombies') { d._moving = null; TravelUI.hide(); Encounters.startStreet({ from, to, pace, left: mins - half }); return; }
    if (enc === 'ambush') {
      TravelUI.hide();
      logEvent(STR.ambushTitle, 'bad');
      await new Promise((res) => AmbushUI.open({ from, to }, res));
      if (!d.alive) return;
      TravelUI.show(locDef(to).name, mins);
      await run(mins - half);
    }
    d._moving = null;
    TravelUI.hide();
    if (d.alive) Scene.enter(to);
  },
};
