/* ==========================================================================
   27 · APPLIANCES & HOME POWER (§9.2, §6.6.1) — generator with fuel and
   load management, appliance install into Large slots, pre-outbreak delivery.
   ========================================================================== */

const Appliances = {
  /** Home furniture that draws power (watts) and can be switched in the load panel. */
  consumers() {
    const out = [];
    for (const f of S.home.furniture) {
      const def = FURNITURE[f.type];
      if (def.temp || f.type === 'fridge') out.push({ key: f.uid, name: f.label, watts: def.power || 100, f });
    }
    out.push({ key: 'lights', name: STR.loadLights, watts: LOADS.lights });
    return out;
  },
  generator() { return S.home.furniture.find((f) => f.type === 'generator') || null; },
  genState(g) { if (!g.gen) g.gen = { on: false, fuel: 0, hours: 0 }; return g.gen; },
  loadOn(key) { return S.home.loads[key] !== false; },
  /** Which consumers the generator feeds (priority order, within capacity). */
  allocation() {
    const g = this.generator();
    if (!g) return { set: new Set(), watts: 0, cap: 0 };
    const st = this.genState(g), cap = FURNITURE.generator.capacityW;
    const set = new Set();
    let w = 0;
    if (st.on && st.fuel > 0) {
      for (const c of this.consumers()) {
        if (!this.loadOn(c.key)) continue;
        if (w + c.watts > cap) continue;
        set.add(c.key); w += c.watts;
      }
    }
    return { set, watts: w, cap };
  },
  /** Is this home appliance powered right now? (grid or generator) */
  powered(f, grid = Power.gridOn()) {
    if (grid) return true;
    return this.allocation().set.has(f.uid);
  },
  lightsPowered() { return Power.gridOn() || this.allocation().set.has('lights'); },
  /** Generator outdoor = noise source (§8.3); indoor generators are silent for gameplay. */
  generatorNoise() {
    const g = this.generator(); if (!g) return 0;
    const st = this.genState(g);
    return st.on && st.fuel > 0 && !Arrange.indoor(g.floor, g.x, g.z) ? 25 : 0;
  },
  setGen(on) {
    const g = this.generator(); if (!g) return;
    const st = this.genState(g);
    if (on && st.fuel <= 0) { Bus.emit('toast', { kind: 'warn', msg: STR.genNoFuel }); return; }
    st.on = on;
    logEvent(on ? STR.genStarted : STR.genStopped, 'info');
  },
  /** Pour carried/home gasoline into the tank. Returns litres added. */
  refuel(ch) {
    const g = this.generator(); if (!g) return 0;
    const st = this.genState(g), cap = FURNITURE.generator.tankL;
    let added = 0;
    const sources = [...ch.containers(), ...S.home.furniture.filter((f) => f.inv).map((f) => f.inv)];
    for (const c of sources) {
      for (const s of [...c.slots]) {
        const d = itemDef(s.it.id);
        if (!d.fuelL) continue;
        while (st.fuel < cap - 0.05 && c.slots.includes(s)) {      // drain one can at a time from the stack
          const left = s.it.st && s.it.st.fuelLeft != null ? s.it.st.fuelLeft : d.fuelL;
          const take = Math.min(left, cap - st.fuel);
          st.fuel += take; added += take;
          if (take >= left - 1e-6) { if (s.it.qty > 1) { s.it.qty -= 1; if (s.it.st) delete s.it.st.fuelLeft; } else Inv.remove(c, s); }
          else { s.it.st = Object.assign(s.it.st || {}, { fuelLeft: left - take }); break; }
        }
      }
    }
    if (added) logEvent(STR.genRefuel(added.toFixed(1)), 'info');
    return added;
  },
  minute() {
    const g = this.generator(); if (!g) return;
    const st = this.genState(g);
    if (!st.on) return;
    if (Power.gridOn()) return;                                      // grid present: generator idles at no load (switched off by auto-transfer)
    const a = this.allocation();
    const lph = 0.3 + 0.7 * (a.watts / a.cap);
    st.fuel = Math.max(0, st.fuel - lph / 60);
    st.hours += 1 / 60;
    if (st.fuel <= 0) { st.on = false; logEvent(STR.genOut, 'bad'); Bus.emit('toast', { kind: 'bad', msg: STR.genOut }); }
  },
  init() { GameClock.onMinute(() => this.minute()); },
};

/** Installing large appliances into home slots + pre-outbreak delivery. */
const HomeInstall = {
  freeSlots(kind) {
    return HOME_SLOTS.filter((s) => s.kind === kind && !S.home.furniture.some((f) => f.slot === s.id));
  },
  slotKind(type) { return type === 'generator' ? 'generator' : 'large'; },
  /** Create the furniture in a slot (scene, nav and containers updated). */
  place(type, slotId) {
    const slot = HOME_SLOTS.find((s) => s.id === slotId);
    const def = FURNITURE[type];
    const f = { uid: U.uid(), type, floor: slot.floor, x: slot.x, z: slot.z, rot: slot.rot, label: def.name, slot: slot.id };
    if (def.grid) { f.inv = Inv.makeContainer(def.grid[0], def.grid[1], def.limit, def.name, def.temp || 'ambient'); f.inv.cold = 0; }
    if (type === 'generator') f.gen = { on: false, fuel: 0, hours: 0 };
    S.home.furniture.push(f);
    if (Scene.W && Scene.isHome()) { Scene.addFurniture(f); Nav.build(Scene.W, Scene.furnList()); }
    return f;
  },
  /** Install an appliance item the character carries (or that sits in a home pile). */
  installItem(ch, c, slot, slotId) {
    const d = itemDef(slot.it.id), type = d.installs;
    if (!type || S.scene !== 'home') return false;
    Inv.remove(c, slot);
    this.place(type, slotId);
    GameClock.advance(FURNITURE[type].install || 30);
    Skills.gain(ch, type === 'generator' ? 'mechanics' : 'carpentry', 6);
    logEvent(STR.installed(FURNITURE[type].name), 'good');
    Bus.emit('inv:changed');
    return true;
  },
  /** Order with delivery (pre-outbreak only); arrival in DELIVERY.delayMin. */
  order(itemId, price, slotId) {
    const total = price + DELIVERY.fee;
    if (S.cash < total) { Bus.emit('toast', { kind: 'bad', msg: STR.notEnoughCash }); return false; }
    S.cash -= total;
    S.deliveries.push({ id: U.uid(), item: itemId, slot: slotId, at: S.time.min + DELIVERY.delayMin, paid: total });
    logEvent(STR.ordered(itemDef(itemId).name, U.money(total), U.timeOf(S.time.min + DELIVERY.delayMin).hhmm), 'info');
    return true;
  },
  minute() {
    if (!S.deliveries.length) return;
    const due = S.deliveries.filter((x) => S.time.min >= x.at);
    if (!due.length) return;
    S.deliveries = S.deliveries.filter((x) => S.time.min < x.at);
    for (const x of due) {
      const type = itemDef(x.item).installs;
      if (S.flags.outbreak) {
        S.cash += x.paid;
        logEvent(STR.deliveryCancelled(itemDef(x.item).name), 'bad');
        Bus.emit('toast', { kind: 'bad', msg: STR.deliveryCancelled(itemDef(x.item).name) });
        continue;
      }
      const slot = this.freeSlots(this.slotKind(type)).find((s) => s.id === x.slot) || this.freeSlots(this.slotKind(type))[0];
      if (!slot) {
        // No room: the courier leaves it boxed by the gate.
        const pile = { uid: U.uid(), floor: 0, x: 2.8, z: HOME.lot.z1 - 1.6, inv: Inv.makeContainer(8, 6, 200, STR.ground) };
        Inv.add(pile.inv, Inv.makeItem(x.item));
        S.home.piles.push(pile);
        if (Scene.isHome()) Scene.syncPiles();
      } else this.place(type, slot.id);
      logEvent(STR.delivered(itemDef(x.item).name), 'good');
      Bus.emit('toast', { kind: 'good', msg: STR.delivered(itemDef(x.item).name) });
    }
  },
  init() { GameClock.onMinute(() => this.minute()); },
};

