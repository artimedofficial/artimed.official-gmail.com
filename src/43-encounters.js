/* ==========================================================================
   43 · TRAVEL ENCOUNTERS (§4.4, §8.5) — zombie street scenes and hostile
   survivor ambushes with Fight / Give some / Flee and real consequences.
   ========================================================================== */

LOCATIONS.street = { name: 'ถนนระหว่างทาง', short: 'ถนน', icon: '🛣️', map: [0, 0], dist: 0, hidden: true };
LOC_IDS.splice(0, LOC_IDS.length, ...Object.keys(LOCATIONS).filter((k) => k !== 'home' && !LOCATIONS[k].hidden));

const StreetWorld = {
  build(scene) {
    const W = { root: new THREE.Group(), floors: [{ group: new THREE.Group(), walls: [], cutGroup: new THREE.Group() }], blockers: [[]], lights: [], furn: new Map(), pickables: [], windowMats: new Map(), outdoor: new THREE.Group(), animated: [] };
    W.root.add(W.floors[0].group); W.root.add(W.outdoor);
    const pb = new PB('street-enc');
    const road = new THREE.PlaneGeometry(60, 8); road.rotateX(-Math.PI / 2);
    pb.geo(road, Mat.tex('asphalt', '#ffffff', 0.92, 0, 0.6), 0, 0, 0);
    for (const z of [-5, 5]) pb.box(60, 0.14, 2, Mat.tex('pavers', '#9a958a', 0.9), 0, -0.02, z);
    for (let x = -28; x < 30; x += 4) { const p = new THREE.PlaneGeometry(2, 0.12); p.rotateX(-Math.PI / 2); pb.geo(p, Mat.color('#e8e0c8', 0.8), x, 0.005, 0); }
    // Abandoned cars and debris
    const rng = U.makeRng(U.hashSeed('streetenc' + (S.travel ? S.travel.from + S.travel.to : '')));
    W.outdoor.add(pb.build({ uvTile: 2.4, cast: false }));
    for (let i = 0; i < 4; i++) {
      const car = AssetRegistry.create('prop.car', { seed: 'sc' + i });
      const x = -12 + i * 8 + rng() * 2, z = (rng() < 0.5 ? -1.6 : 1.8);
      car.position.set(x, 0, z); car.rotation.y = Math.PI / 2 + (rng() - 0.5) * 0.8;
      W.outdoor.add(car);
      W.blockers[0].push({ x0: x - 2.3, x1: x + 2.3, z0: z - 1.1, z1: z + 1.1 });
    }
    for (let i = 0; i < 9; i++) {
      const b = HomeWorld.shophouse(rng, U.pick(rng, ['ร้านปิดถาวร', 'ให้เช่า', 'ร้านทอง', 'ซ่อมรถ', 'ร้านข้าว']));
      b.position.set(-24 + i * 6, 0, -6.2); W.outdoor.add(b);
      const b2 = HomeWorld.shophouse(rng, U.pick(rng, ['ร้านยา', 'ร้านน้ำชา', 'ร้านเสริมสวย']));
      b2.position.set(-21 + i * 6, 0, 6.2); b2.rotation.y = Math.PI; W.outdoor.add(b2);
    }
    W.blockers[0].push({ x0: -40, x1: 40, z0: -9, z1: -6.1 }, { x0: -40, x1: 40, z0: 6.1, z1: 9 });
    const arrow = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 24), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.7, depthWrite: false }));
    arrow.rotation.x = -Math.PI / 2; arrow.position.set(17.5, 0.02, 0); W.outdoor.add(arrow); W.exitMarker = arrow;
    W.streetLamps = [new THREE.Vector3(-10, 5.5, -4.5), new THREE.Vector3(8, 5.5, 4.5)];
    scene.add(W.root);
    Object.assign(W, {
      kind: 'street', layout: { rooms: [], openings: [], bounds: { x0: -19, x1: 19, z0: -5, z1: 5 } }, floorsCount: 1, stairs: null,
      groundY: () => 0, navAreas: [{ x0: -19.5, x1: 19.5, z0: -6, z1: 6 }],
      camBounds: { x0: -20, x1: 20, z0: -6, z1: 10 }, pickY0: 0, slab: null, dustRect: { x0: -5, x1: 5, z0: -3, z1: 3 },
      isIndoor: () => false, exit: { x: 17.5, z: 0, floor: 0 }, spawn: { x: -17, z: 0.3, floor: 0, rot: Math.PI / 2 },
    });
    return W;
  },
};

const Encounters = {
  /** Roll an encounter for a trip. Returns null | 'zombies' | 'ambush'. */
  roll(from, to, pace) {
    if (!S.flags.outbreak) return null;
    const km = World.km(from, to);
    const night = Render.nightAt(S.time.min) > 0.5 ? 1 : 0;
    const dz = (Danger.level(from) + Danger.level(to)) / 2;
    const pZ = U.clamp((0.04 + dz * 0.55 + night * 0.3) * Math.min(1.5, 0.6 + km * 0.5) * (pace === 'run' ? 0.85 : 1), 0, 0.85);
    const ch = activeChar();
    const haul = ch.containers().reduce((a, c) => a + Inv.value(c), 0);
    const pA = U.clamp(AMBUSH.baseChance * (night ? AMBUSH.nightMul : 1) * (1 + haul * AMBUSH.haulMul) * Math.min(1, S.time.min / 1440 / 4), 0, 0.5);
    const r = RNG.next('events');
    if (r < pA) return 'ambush';
    if (r < pA + pZ) return 'zombies';
    return null;
  },
  /** Begin a street scene mid-trip. */
  startStreet(plan) {
    S.travel = plan;
    logEvent(STR.encZombies, 'bad');
    Bus.emit('toast', { kind: 'bad', msg: STR.encZombies, dur: 6000 });
    Scene.enter('street');
  },
  spawnStreet() {
    const night = Render.nightAt(S.time.min) > 0.5;
    const n = Math.round(2 + Danger.level(S.travel.to) * 5 + (night ? 2 : 0));
    const rng = RNG.local('streetspawn|' + S.time.min);
    for (let i = 0; i < n; i++) {
      let p = null;
      for (let k = 0; k < 10 && !p; k++) { const x = -8 + rng() * 24, z = -4 + rng() * 8; if (Nav.walkable(0, x, z)) p = { x, z }; }
      if (p) Zombies.spawn(Zombies.pickType(rng), p.x, p.z);
    }
    Zombies.rebuildGrid();
  },
  /** Reached the far end of the street: finish the trip. */
  async finish() {
    const t = S.travel; if (!t) return;
    S.travel = null;
    TravelUI.show(locDef(t.to).name, t.left);
    let done = 0;
    while (done < t.left) { const step = Math.min(t.left - done, Math.max(1, Math.ceil(t.left / 20))); GameClock.advance(step); done += step; TravelUI.progress(done / t.left, S.time.min); await new Promise((r) => requestAnimationFrame(r)); }
    TravelUI.hide();
    Scene.enter(t.to);
  },
};

/** Hostile survivors (§8.5). */
const AmbushUI = {
  open(plan, resume) {
    const ch = activeChar();
    const rng = () => RNG.next('events');
    const n = 2 + Math.floor(rng() * 2);
    const haul = ch.containers().reduce((a, c) => a + Inv.value(c), 0) + (ch.d.equip.back ? 0 : 0);
    const demand = Math.max(150, Math.round(haul * U.range(rng, AMBUSH.demandFrac[0], AMBUSH.demandFrac[1])));
    const { w } = Combat.weapon(ch);
    const fightP = U.clamp(0.3 + ch.skill('melee') * 0.05 + w.dmg / 120 - n * 0.08 + (ch.health() - 70) / 300, 0.05, 0.85);
    const fleeP = U.clamp(0.35 + ch.d.needs.stamina / 260 + ch.skill('fitness') * 0.03 - Math.max(0, ch.load() - 0.7) * 0.6, 0.05, 0.85);
    const body = U.el('div.ambush', null,
      U.el('p', null, STR.ambushText(n)),
      U.el('p.warn', null, STR.ambushDemand(U.money(demand))),
      U.el('div.dim', null, STR.ambushOdds(Math.round(fightP * 100), Math.round(fleeP * 100))));
    const done = (msg, kind) => { Modal.close(); logEvent(msg, kind); Toast.show(msg, kind, 7000); resume(); };
    Modal.open({ title: STR.ambushTitle, body, dismissible: false, actions: [
      { label: '⚔ ' + STR.ambFight, close: false, fn: () => this.fight(ch, n, fightP, done) },
      { label: '🎁 ' + STR.ambGive, close: false, fn: () => this.give(ch, demand, done) },
      { label: '🏃 ' + STR.ambFlee, close: false, fn: () => this.flee(ch, n, fleeP, fightP, done) },
    ] });
  },
  injure(ch, count, max) {
    const parts = ['armL', 'armR', 'torso', 'legL', 'legR', 'head'];
    for (let i = 0; i < count; i++) Health.damage(ch.d, parts[Math.floor(RNG.next('combat') * parts.length)], U.range(() => RNG.next('combat'), max * 0.4, max), RNG.next('combat') < 0.5 ? 'blunt' : 'blade');
  },
  takeItems(ch, frac) {
    const all = [];
    for (const c of ch.containers()) for (const s of c.slots) all.push({ c, s });
    all.sort(() => RNG.next('events') - 0.5);
    const n = Math.ceil(all.length * frac);
    for (const e of all.slice(0, n)) Inv.remove(e.c, e.s);
    return n;
  },
  fight(ch, n, p, done) {
    Skills.gain(ch, 'melee', 8);
    if (RNG.next('combat') < p) {
      this.injure(ch, 1, 14);
      const loot = Inv.makeItem(U.pick(() => RNG.next('events'), ['canned_tuna', 'energy_bar', 'water_1500', 'paracetamol', 'batteries']), 2);
      Inv.addToAny(ch.containers(), loot);
      S.flags.rep = (S.flags.rep || 0) - 1;
      done(STR.ambWon(itemDef(loot.id).name), 'good');
    } else {
      this.injure(ch, 2 + n - 2, 22);
      const lost = this.takeItems(ch, 0.5);
      if (ch.d.equip.weapon && RNG.next('events') < 0.5) { ch.d.equip.weapon = null; Scene.avatar && Scene.avatar.refreshGear(); }
      done(STR.ambLost(lost), 'bad');
    }
  },
  flee(ch, n, p, fightP, done) {
    ch.d.needs.stamina = Math.max(0, ch.d.needs.stamina - 35);
    Skills.gain(ch, 'fitness', 4);
    if (RNG.next('combat') < p) {
      let dropped = 0;
      if (ch.load() > 0.7) dropped = this.takeItems(ch, 0.15);
      done(dropped ? STR.ambFledDrop(dropped) : STR.ambFled, dropped ? 'warn' : 'good');
    } else { Modal.close(); Toast.show(STR.ambCaught, 'bad'); setTimeout(() => this.forceFight(ch, n, fightP - 0.15, done), 50); }
  },
  forceFight(ch, n, p, done) {
    Modal.open({ title: STR.ambushTitle, body: U.el('p.warn', null, STR.ambCaught), dismissible: false, actions: [{ label: '⚔ ' + STR.ambFight, close: false, fn: () => this.fight(ch, n, Math.max(0.05, p), done) }] });
  },
  /** Grid picker: choose items to hand over until their value covers the demand. */
  give(ch, demand, done) {
    const rows = [];
    for (const c of ch.containers()) for (const s of c.slots) rows.push({ c, s, on: false });
    const body = U.el('div.givepick');
    const total = U.el('div.mealtot');
    const btn = U.el('button.btn.primary', { disabled: true }, STR.ambHand);
    const upd = () => {
      const v = rows.filter((r) => r.on).reduce((a, r) => a + (itemDef(r.s.it.id).price || 0) * r.s.it.qty, 0);
      total.textContent = STR.ambGiveTotal(U.money(v), U.money(demand));
      btn.disabled = v < demand;
    };
    const grid = U.el('div.givegrid');
    for (const r of rows) {
      const d = itemDef(r.s.it.id);
      const cell = U.el('button.givecell', { title: d.name, on: { click: () => { r.on = !r.on; cell.classList.toggle('on', r.on); upd(); } } }, U.el('img', { src: Icons.get(r.s.it.id) }), U.el('small', null, (r.s.it.qty > 1 ? '×' + r.s.it.qty + ' ' : '') + U.money((d.price || 0) * r.s.it.qty)));
      grid.appendChild(cell);
    }
    btn.addEventListener('click', () => {
      for (const r of rows) if (r.on) Inv.remove(r.c, r.s);
      S.flags.rep = (S.flags.rep || 0) - 0.5;
      Modal.close();
      done(STR.ambGave, 'warn');
    });
    body.append(U.el('p.dim', null, STR.ambGiveHint), grid, total, btn);
    if (!rows.length) body.append(U.el('p.warn', null, STR.ambNothing));
    upd();
    Modal.open({ title: STR.ambGive, body, wide: true, dismissible: false, actions: [{ label: STR.back, close: false, fn: () => { Modal.close(); } }] });
  },
};
