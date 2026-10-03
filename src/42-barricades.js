/* ==========================================================================
   42 · BARRICADES (§9.1) — board windows, reinforce doors, secure the gate.
   State: S.home.barr[key] = { layers, hp, max, glass (window), door (door base hp) }
   Ground-floor exterior windows/doors and the yard gate are breach points.
   ========================================================================== */

const Barricades = {
  _list: null,
  /** Static list of breach points (computed once from HOME data). */
  list() {
    if (this._list) return this._list;
    const out = [];
    const b = HOME.bounds;
    HOME.openings.forEach((o, i) => {
      if (o.floor !== 0 || o.kind === 'arch') return;
      const ext = (o.axis === 'z' && (o.at === b.z0 || o.at === b.z1)) || (o.axis === 'x' && (o.at === b.x0 || o.at === b.x1));
      if (!ext) return;
      const outward = o.axis === 'z' ? (o.at === b.z0 ? -1 : 1) : (o.at === b.x0 ? -1 : 1);
      const mid = (o.a + o.b) / 2;
      const t = 0.42;
      const rect = o.axis === 'z' ? { x0: o.a, x1: o.b, z0: o.at - t, z1: o.at + t } : { x0: o.at - t, x1: o.at + t, z0: o.a, z1: o.b };
      const outP = o.axis === 'z' ? { x: mid, z: o.at + outward * 0.75 } : { x: o.at + outward * 0.75, z: mid };
      const inP = o.axis === 'z' ? { x: mid, z: o.at - outward * 0.75 } : { x: o.at - outward * 0.75, z: mid };
      const kind = o.kind === 'window' ? 'window' : 'door';
      out.push({ key: 'o' + i, kind, o, rect, out: outP, in: inP, outward, name: o.name || (kind === 'window' ? STR.windowAt(i) : STR.doorAt(i)) });
    });
    const g = HOME.gate, lot = HOME.lot;
    out.push({ key: 'gate', kind: 'gate', rect: { x0: g.x0 - 0.1, x1: g.x0 + 2.7, z0: lot.z1 - 0.45, z1: lot.z1 + 0.45 }, out: { x: g.x0 + 1.3, z: lot.z1 + 0.8 }, in: { x: g.x0 + 1.3, z: lot.z1 - 0.9 }, name: STR.gateName, outward: 1 });
    this._list = out;
    return out;
  },
  get(key) {
    if (!S.home.barr) S.home.barr = {};
    let st = S.home.barr[key];
    if (!st) {
      const b = this.list().find((x) => x.key === key); if (!b) return null;
      st = S.home.barr[key] = { layers: 0, hp: 0, max: 0, glass: b.kind === 'window' ? 20 : 0, door: b.kind === 'door' ? 60 : 0 };
    }
    return st;
  },
  info(key) { return this.list().find((x) => x.key === key); },
  /** Can zombies pass this opening right now? */
  passable(key) {
    const b = this.info(key), st = this.get(key);
    if (!b) return true;
    if (st.hp > 0) return false;
    if (b.kind === 'window') return st.glass <= 0;
    if (b.kind === 'door') return st.door <= 0;
    return true;                                   // gate: open unless barricaded
  },
  hit(key, dmg) {
    const st = this.get(key), b = this.info(key);
    const before = this.passable(key);
    if (st.hp > 0) { st.hp = Math.max(0, st.hp - dmg); if (st.hp <= 0) { st.layers = 0; st.layersMax = 0; st.max = 0; } }
    else if (b.kind === 'window') st.glass = Math.max(0, st.glass - dmg);
    else if (b.kind === 'door') st.door = Math.max(0, st.door - dmg);
    Snd.play(b.kind === 'window' && st.hp <= 0 ? 'glass' : 'bang', b.out.x, b.out.z);
    NoiseBus.emit(b.out.x, b.out.z, 10, 0, true);
    if (!before && this.passable(key)) {
      logEvent(STR.breached(b.name), 'bad');
      Bus.emit('toast', { kind: 'bad', msg: STR.breached(b.name), dur: 6000 });
      Zombies.rebuildGrid();
    }
    this.refreshVisual(key);
  },
  /** How strongly the house draws zombies at night: lit windows + outdoor generator. */
  attraction() {
    let a = 0;
    if (S.home.lightsOn && Appliances.lightsPowered() && Render.night > 0.4) a += 1;
    if (Appliances.generatorNoise()) a += 1;
    return a;
  },
  nearestTarget(x, z) {
    const outsideLot = z > HOME.lot.z1 - 0.2;
    let best = null, bd = Infinity;
    for (const b of this.list()) {
      if (this.passable(b.key)) continue;
      if (outsideLot && b.kind !== 'gate' && !this.passable('gate')) continue;
      const d = Math.hypot(b.out.x - x, b.out.z - z);
      if (d < bd) { bd = d; best = { key: b.key, x: b.out.x, z: b.out.z }; }
    }
    return best;
  },
  materials(kind) { return BARRICADE[kind]; },
  /** Which material set the character can afford (primary or alternative). */
  pickUses(ch, kind) {
    const B = BARRICADE[kind];
    for (const set of [B.uses, B.alt]) {
      if (set.every(([id, n]) => this.countAvail(ch, id) >= n)) return set;
    }
    return null;
  },
  countAvail(ch, id) {
    let n = 0;
    const d = itemDef(id);
    const sources = [...ch.containers()];
    if (S.scene === 'home' && P.settings.autoDraw) for (const f of S.home.furniture) if (f.inv) sources.push(f.inv);
    for (const c of sources) Inv.walk(c, (it) => { if (it.id === id) n += d.uses ? (it.uses || 0) + (it.qty - 1) * d.uses : it.qty; });
    return n;
  },
  consume(ch, id, n) {
    const d = itemDef(id);
    const sources = [...ch.containers()];
    if (S.scene === 'home' && P.settings.autoDraw) for (const f of S.home.furniture) if (f.inv) sources.push(f.inv);
    for (const c of sources) {
      for (const s of [...c.slots]) {
        if (n <= 0) return;
        if (s.it.id !== id) continue;
        if (d.uses) { while (n > 0 && c.slots.includes(s)) { const f = { it: s.it, c, slot: s }; Health.spend(f); n--; } }
        else { const take = Math.min(n, s.it.qty); s.it.qty -= take; n -= take; if (s.it.qty <= 0) Inv.remove(c, s); }
      }
    }
  },
  /** Add one layer (or repair). Requires a hammer for planks/nails. Gate work happens outdoors (noise). */
  build(ch, key) {
    const b = this.info(key), kind = b.kind, B = BARRICADE[kind], st = this.get(key);
    const uses = this.pickUses(ch, kind);
    const repairing = st.layers > 0 && st.hp < st.max * 0.98;
    if (!repairing && st.layers >= B.layers) { Toast.show(STR.barMax, 'info'); return false; }
    if (!uses) { Toast.show(STR.barNeeds(B.uses.map(([id, n]) => itemDef(id).name + ' ×' + n).join(', ')), 'warn', 5000); return false; }
    const needsHammer = uses.some(([id]) => id === 'nails_1kg');
    if (needsHammer && !Health.findItem(ch, ['hammer'])) { Toast.show(STR.needHammer, 'warn'); return false; }
    for (const [id, n] of uses) this.consume(ch, id, repairing ? Math.ceil(n / 2) : n);
    const hpLayer = B.hp * (1 + ch.skill('carpentry') * BARRICADE.perCarpentry);
    if (kind === 'gate') st.mat = uses[0][0] === 'chain' ? 'chain' : 'wood';
    if (repairing) st.hp = st.max;
    else { st.layers += 1; st.layersMax = st.layers; st.max = (st.max || 0) + hpLayer; st.hp = Math.min(st.max, st.hp + hpLayer); }
    GameClock.advance(Math.round(B.minutes * (1 - ch.skill('carpentry') * 0.05)));
    Skills.gain(ch, 'carpentry', 8);
    if (B.outdoor || kind === 'gate') NoiseBus.emit(b.in.x, b.in.z, 22, 0, true);
    else NoiseBus.emit(b.in.x, b.in.z, 22, 0);       // indoors: no gameplay effect (§8.3)
    Snd.play('hammer');
    logEvent(repairing ? STR.barRepaired(b.name) : STR.barBuilt(b.name, st.layers), 'good');
    Zombies.rebuildGrid();
    this.refreshVisual(key);
    return true;
  },
  /* ---------- Visuals ---------- */
  objs: new Map(),
  renderAll() { this.objs.clear(); for (const b of this.list()) this.refreshVisual(b.key); },
  refreshVisual(key) {
    if (!Scene.W || !Scene.isHome()) return;
    const b = this.info(key), st = this.get(key);
    const prev = this.objs.get(key);
    if (prev) { prev.parent && prev.parent.remove(prev); prev.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
    const pb = new PB('barr' + key);
    const wood = Mat.tex('wood_floor', '#c9a46a', 0.85), metal = Mat.color('#3a3f44', 0.5, 0.7);
    const visibleLayers = st.max ? Math.ceil((st.hp / st.max) * (st.layersMax || st.layers)) : 0;
    if (b.kind === 'gate') {
      if (st.layers > 0 && st.hp > 0) {
        if (st.mat === 'chain') pb.box(2.6, 0.06, 0.06, metal, b.rect.x0 + 1.35, 0.9 + HomeWorld.YARD_Y, HOME.lot.z1);
        for (let i = 0; i < visibleLayers * 2; i++) pb.box(2.7, 0.18, 0.05, wood, b.rect.x0 + 1.35, HomeWorld.YARD_Y + 0.3 + i * 0.32, HOME.lot.z1 + 0.05, 0, [0, 0, (i % 2 ? 0.08 : -0.08)]);
      }
    } else {
      const o = b.o, len = o.b - o.a, mid = (o.a + o.b) / 2;
      const y0 = o.kind === 'window' ? (o.sill || 0.9) : 0.1, y1 = o.kind === 'window' ? 2.2 : 2.0;
      const off = b.outward * 0.16;
      for (let i = 0; i < visibleLayers; i++) {
        const n = 3;
        for (let k = 0; k < n; k++) {
          const y = y0 + (y1 - y0) * ((k + 0.5) / n) + i * 0.05;
          const tilt = (k - 1) * 0.12 + (i % 2 ? 0.1 : -0.1);
          if (o.axis === 'z') pb.box(len + 0.3, 0.16, 0.04, wood, mid, y, o.at + off + i * 0.03 * b.outward, 0, [0, 0, tilt]);
          else pb.box(0.04, 0.16, len + 0.3, wood, o.at + off + i * 0.03 * b.outward, y, mid, 0, [tilt, 0, 0]);
        }
      }
      if (o.kind === 'window' && st.glass <= 0 && st.hp <= 0) {
        // Broken glass shards
        const shard = Mat.color('#9fc4d8', 0.1, 0.2, { transparent: true, opacity: 0.5 });
        for (let k = 0; k < 4; k++) { const s = 0.15 + k * 0.05; if (o.axis === 'z') pb.box(s, s * 1.4, 0.01, shard, o.a + 0.15 + k * len / 4, y0 + 0.05, o.at, 0, [0, 0, k]); else pb.box(0.01, s * 1.4, s, shard, o.at, y0 + 0.05, o.a + 0.15 + k * len / 4, 0, [k, 0, 0]); }
      }
    }
    const obj = pb.parts.length ? pb.build() : new THREE.Group();
    (b.kind === 'gate' ? Scene.W.outdoor : Scene.W.floors[0].group).add(obj);
    this.objs.set(key, obj);
  },
};
