/* ==========================================================================
   44 · FREE FURNITURE ARRANGEMENT (§9.1, Phase 2B)
   Move / rotate any home furniture on a 0.25 m grid, or place new pieces
   (installed items, built furniture). A footprint marker shows green/red;
   rules: inside one room (or the yard), no overlap, stairs and doorways kept
   clear, and every storage/appliance plus both stair landings must stay
   reachable from the gate (checked on the real nav grid before committing).
   ========================================================================== */

const Arrange = {
  STEP: 0.25, WALL: 0.09,
  active: null,          // { f, isNew, orig, onDone, valid, why }
  marker: null,

  movable(f) { return !!f && Scene.isHome() && !FIXED_FURNITURE.has(f.type) && f.onTop == null; },
  rect(type, x, z, rot) {
    let [w, d] = FURNITURE[type].size;
    if (rot % 2) [w, d] = [d, w];
    if (type === 'mango_tree') { w = 0.6; d = 0.6; }
    return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
  },
  hit(a, b, m = 0) { return a.x0 < b.x1 - m && a.x1 > b.x0 + m && a.z0 < b.z1 - m && a.z1 > b.z0 + m; },
  within(r, a, m) { return r.x0 >= a.x0 + m - 1e-6 && r.x1 <= a.x1 - m + 1e-6 && r.z0 >= a.z0 + m - 1e-6 && r.z1 <= a.z1 - m + 1e-6; },
  indoor(floor, x, z) { const b = HOME.bounds; return floor === 1 || (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1); },
  /** Is an open water store / plot right next to the outside of the house wall (gutter run-off)? */
  byWall(f) {
    if (f.floor !== 0 || this.indoor(0, f.x, f.z)) return false;
    const b = HOME.bounds, r = this.rect(f.type, f.x, f.z, f.rot), g = WATER.gutterDist;
    const dx = Math.max(b.x0 - r.x1, r.x0 - b.x1, 0), dz = Math.max(b.z0 - r.z1, r.z0 - b.z1, 0);
    return Math.hypot(dx, dz) <= g;
  },

  /** Static placement rules. Returns { ok, why } (why = STR.arr* key). */
  check(f, x, z, rot, floor) {
    const def = FURNITURE[f.type], r = this.rect(f.type, x, z, rot);
    const inside = this.indoor(floor, x, z);
    if (inside) {
      if (def.outdoorOnly) return { ok: false, why: 'arrOutdoorOnly' };
      const room = HomeWorld.roomAt(floor, x, z);
      if (!room || !this.within(r, room, this.WALL)) return { ok: false, why: 'arrWall' };
    } else {
      if (!def.yardOK && !def.outdoor && !def.outdoorOnly) return { ok: false, why: 'arrIndoorOnly' };
      const lot = HOME.lot, b = HOME.bounds;
      if (!this.within(r, lot, 0.35)) return { ok: false, why: 'arrLot' };
      if (this.hit(r, { x0: b.x0 - 0.12, x1: b.x1 + 0.12, z0: b.z0 - 0.12, z1: b.z1 + 0.12 })) return { ok: false, why: 'arrWall' };
      if (this.hit(r, { x0: HOME.gate.x0 - 0.2, x1: HOME.gate.x1 + 0.2, z0: lot.z1 - 1.4, z1: lot.z1 + 1 })) return { ok: false, why: 'arrGate' };
    }
    const s = HOME.stairs;
    const stair = floor === 0 ? { x0: s.x0 - 0.15, x1: s.x1 + 0.15, z0: s.zBottom - 0.95, z1: s.zTop + 0.05 } : { x0: s.x0 - 0.15, x1: s.x1 + 0.15, z0: s.zBottom - 0.05, z1: s.zTop + 0.95 };
    if (this.hit(r, stair)) return { ok: false, why: 'arrStairs' };
    if (!def.walk) {
      for (const o of HOME.openings) {
        if (o.floor !== floor || o.kind === 'window') continue;
        const c = o.axis === 'z' ? { x0: o.a, x1: o.b, z0: o.at - 0.7, z1: o.at + 0.7 } : { x0: o.at - 0.7, x1: o.at + 0.7, z0: o.a, z1: o.b };
        if (this.hit(r, c)) return { ok: false, why: 'arrDoor' };
      }
      for (const g of S.home.furniture) {
        if (g === f || g.floor !== floor || g.onTop != null || FURNITURE[g.type].walk) continue;
        if (this.hit(r, this.rect(g.type, g.x, g.z, g.rot), 0.02)) return { ok: false, why: 'arrOverlap' };
      }
    }
    return { ok: true };
  },
  /** Flood-fill the nav grid from the gate (crossing the stair link) and test that everything stays reachable. */
  reachable() {
    const W = Scene.W, seen = [new Uint8Array(Nav.grids[0].block.length), new Uint8Array(Nav.grids[1].block.length)];
    const q = [];
    const push = (floor, x, z) => { const p = Nav.nearestWalkable(floor, x, z, 1.5); if (!p) return; const c = Nav.cellOf(floor, p.x, p.z); if (c && !seen[floor][c.i]) { seen[floor][c.i] = 1; q.push([floor, c.ix, c.iz]); } };
    push(0, W.exit.x, W.exit.z - 1.0);
    let linked = false;
    while (q.length) {
      const [fl, ix, iz] = q.pop(), g = Nav.grids[fl];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = ix + dx, nz = iz + dz;
        if (nx < 0 || nz < 0 || nx >= g.nx || nz >= g.nz) continue;
        const i = nz * g.nx + nx;
        if (g.block[i] || seen[fl][i]) continue;
        seen[fl][i] = 1; q.push([fl, nx, nz]);
      }
      if (!linked && Nav.stair) {
        const cb = Nav.cellOf(0, Nav.stair.bottom.x, Nav.stair.bottom.z);
        if (cb && seen[0][cb.i]) { linked = true; push(1, Nav.stair.top.x, Nav.stair.top.z); }
      }
      if (!q.length && !linked && Nav.stair) { const cb = Nav.cellOf(0, Nav.stair.bottom.x, Nav.stair.bottom.z); if (cb && seen[0][cb.i]) { linked = true; push(1, Nav.stair.top.x, Nav.stair.top.z); } }
    }
    if (!linked) return { ok: false, what: STR.arrStairsName };
    // A piece is usable if some reached cell lies within arm's reach of its footprint, on the same side of the walls.
    const usable = (g) => {
      const r = this.rect(g.type, g.x, g.z, g.rot), reach = 0.75, grid = Nav.grids[g.floor];
      const inside = this.indoor(g.floor, g.x, g.z), room = inside ? HomeWorld.roomAt(g.floor, g.x, g.z) : null;
      for (let z = r.z0 - reach; z <= r.z1 + reach; z += Nav.cell) for (let x = r.x0 - reach; x <= r.x1 + reach; x += Nav.cell) {
        const c = Nav.cellOf(g.floor, x, z);
        if (!c || !seen[g.floor][c.i] || grid.block[c.i]) continue;
        const p = Nav.center(g.floor, c.ix, c.iz);
        if (inside) { if (HomeWorld.roomAt(g.floor, p.x, p.z) !== room) continue; }
        else if (this.indoor(g.floor, p.x, p.z)) continue;
        return true;
      }
      return false;
    };
    for (const g of S.home.furniture) {
      const def = FURNITURE[g.type];
      if (!(g.inv || def.act || def.store || def.farm) || g.onTop != null) continue;
      if (!usable(g)) return { ok: false, what: g.label };
    }
    return { ok: true };
  },

  /* ---------- mode ---------- */
  /** Begin moving an existing piece. */
  start(f) {
    if (!this.movable(f)) { Toast.show(STR.arrFixed, 'warn'); return false; }
    if (this.active) this.cancel();
    if (InvUI.isOpen) InvUI.close();
    this.active = { f, isNew: false, orig: { x: f.x, z: f.z, rot: f.rot, floor: f.floor } };
    this.begin();
    return true;
  },
  /** Place a brand-new piece; onPlaced(f) runs after it is committed (consume items there). */
  startNew(type, onPlaced, label) {
    if (!Scene.isHome()) { Toast.show(STR.installHomeOnly, 'warn'); return false; }
    if (this.active) this.cancel();
    if (InvUI.isOpen) InvUI.close();
    Modal.closeAll();
    const d = S.chars[S.active].pos, def = FURNITURE[type];
    const f = initFurnState({ uid: U.uid(), type, floor: d.floor, x: d.x, z: d.z, rot: 0, label: label || def.name });
    if (def.grid) { f.inv = Inv.makeContainer(def.grid[0], def.grid[1], def.limit, f.label, def.temp || 'ambient'); f.inv.cold = 0; }
    if (def.sub) f.sub = Inv.makeContainer(def.sub.grid[0], def.sub.grid[1], def.sub.limit, def.sub.name, def.sub.temp);
    if (type === 'generator') f.gen = { on: false, fuel: 0, hours: 0 };
    Scene.addFurniture(f);
    this.active = { f, isNew: true, orig: null, onDone: onPlaced };
    this.begin();
    return true;
  },
  begin() {
    GameClock.pauseLocks++;
    Render.showHover(null);
    if (!this.marker) {
      this.marker = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x5fd35f, transparent: true, opacity: 0.42, depthWrite: false, depthTest: false }));
      this.marker.rotation.x = -Math.PI / 2; this.marker.renderOrder = 5;
    }
    Render.scene.add(this.marker);
    const f = this.active.f;
    Render.setViewFloor(f.floor);
    this.preview(f.x, f.z, f.rot, f.floor);
    HUD.setHint(STR.arrHint);
    Bus.emit('arrange:start', f);
  },
  /** Snap to the grid, then hug a nearby wall so pieces can stand flush against it. */
  snap(type, x, z, rot, floor) {
    const st = this.STEP;
    x = Math.round(x / st) * st; z = Math.round(z / st) * st;
    const r = this.rect(type, x, z, rot);
    const room = this.indoor(floor, x, z) ? HomeWorld.roomAt(floor, x, z) : null;
    if (room) {
      const m = this.WALL + 0.005;
      if (r.x0 - (room.x0 + m) < 0.3 && r.x0 - (room.x0 + m) > -0.3) x += room.x0 + m - r.x0;
      else if ((room.x1 - m) - r.x1 < 0.3 && (room.x1 - m) - r.x1 > -0.3) x += room.x1 - m - r.x1;
      if (r.z0 - (room.z0 + m) < 0.3 && r.z0 - (room.z0 + m) > -0.3) z += room.z0 + m - r.z0;
      else if ((room.z1 - m) - r.z1 < 0.3 && (room.z1 - m) - r.z1 > -0.3) z += room.z1 - m - r.z1;
    }
    return { x, z };
  },
  preview(x, z, rot, floor) {
    const A = this.active, f = A.f;
    const p = this.snap(f.type, x, z, rot, floor);
    A.pos = { x: p.x, z: p.z, rot, floor };
    const res = this.check(f, p.x, p.z, rot, floor);
    A.valid = res.ok; A.why = res.why;
    const obj = Scene.W.furn.get(f.uid);
    if (obj) {
      obj.position.set(p.x, this.baseY(f, p.x, p.z, floor), p.z);
      obj.rotation.y = -rot * Math.PI / 2;
    }
    const r = this.rect(f.type, p.x, p.z, rot);
    this.marker.scale.set(r.x1 - r.x0 + 0.24, r.z1 - r.z0 + 0.24, 1);
    this.marker.position.set(p.x, this.baseY(f, p.x, p.z, floor) + 0.03, p.z);
    this.marker.material.color.set(res.ok ? 0x5fd35f : 0xe04a3a);
    HUD.setHint(res.ok ? STR.arrHint : '⚠ ' + STR[res.why]);
  },
  baseY(f, x, z, floor) { return floor * CFG.FLOOR_H + (floor === 0 ? HomeWorld.groundY(x, z, 0) : 0) + (f.onTop || 0); },
  move(clientX, clientY) {
    if (!this.active) return;
    const hit = Render.pick(clientX, clientY);
    const g = hit && hit.ground; if (!g) return;
    const A = this.active;
    this.preview(g.x, g.z, A.pos.rot, g.floor);
  },
  rotate() { const A = this.active; if (!A) return; this.preview(A.pos.x, A.pos.z, (A.pos.rot + 1) % 4, A.pos.floor); Snd.play('ui'); },
  confirm() {
    const A = this.active; if (!A) return false;
    if (!A.valid) { Toast.show(STR[A.why] || STR.arrWall, 'warn'); return false; }
    const f = A.f, prev = A.isNew ? null : { x: f.x, z: f.z, rot: f.rot, floor: f.floor };
    Object.assign(f, { x: A.pos.x, z: A.pos.z, rot: A.pos.rot, floor: A.pos.floor });
    if (A.isNew) S.home.furniture.push(f);
    Nav.build(Scene.W, Scene.furnList());
    const reach = this.reachable();
    if (!reach.ok) {
      if (A.isNew) S.home.furniture.splice(S.home.furniture.indexOf(f), 1);
      else Object.assign(f, prev);
      Nav.build(Scene.W, Scene.furnList());
      Toast.show(STR.arrBlocks(reach.what), 'warn', 4500);
      return false;
    }
    delete f.slot;
    Scene.refreshFurniture(f);
    this.finish();
    Zombies.rebuildGrid();
    const def = FURNITURE[f.type], ch = activeChar();
    if (A.isNew) { if (A.onDone) A.onDone(f); }
    else {
      const mins = MOVE_MIN[def.slot] || 5;
      GameClock.advance(mins);
      Skills.gain(ch, 'strength', mins * 0.4);
      logEvent(STR.arrMoved(f.label), 'info');
    }
    Bus.emit('inv:changed');
    return true;
  },
  cancel() {
    const A = this.active; if (!A) return;
    if (A.isNew) Scene.removeFurnitureObj(A.f);
    else { Object.assign(A.f, A.orig); Scene.refreshFurniture(A.f); }
    this.finish();
  },
  finish() {
    this.active = null;
    GameClock.pauseLocks = Math.max(0, GameClock.pauseLocks - 1);
    if (this.marker && this.marker.parent) this.marker.parent.remove(this.marker);
    HUD.setHint(null);
    Bus.emit('arrange:end');
  },

  /** Put an item-made piece (pot, drum, appliance) back into the inventory. Must be empty. */
  pickUp(f) {
    const def = FURNITURE[f.type], item = def.fromItem || Object.keys(ITEMS).find((k) => ITEMS[k].installs === f.type);
    if (!item) return false;
    if ((f.inv && f.inv.slots.length) || (f.sub && f.sub.slots.length) || (f.water && f.water.l > 0.5) || (f.farm && f.farm.plots.some(Boolean))) { Toast.show(STR.arrNotEmpty, 'warn'); return false; }
    const ch = activeChar(), it = Inv.makeItem(item, 1);
    if (Inv.addToAny(ch.containers(), it) > 0) { const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true); Inv.add(pile.inv, it); Scene.syncPiles(); }
    S.home.furniture.splice(S.home.furniture.indexOf(f), 1);
    Scene.removeFurnitureObj(f);
    Nav.build(Scene.W, Scene.furnList()); Zombies.rebuildGrid();
    GameClock.advance(def.install || 5);
    logEvent(STR.arrPicked(f.label), 'info');
    Bus.emit('inv:changed');
    return true;
  },
  /** Dismantle built furniture: get half the planks back. */
  dismantle(f) {
    const recipe = CRAFT_FURN.find((r) => r.type === f.type && f.crafted);
    if (!recipe) return false;
    if ((f.inv && f.inv.slots.length) || (f.farm && f.farm.plots.some(Boolean))) { Toast.show(STR.arrNotEmpty, 'warn'); return false; }
    const ch = activeChar(), pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true);
    for (const [id, n] of recipe.uses) if (id === 'plank' && Math.floor(n / 2) > 0) Inv.add(pile.inv, Inv.makeItem('plank', Math.floor(n / 2)));
    Scene.syncPiles();
    S.home.furniture.splice(S.home.furniture.indexOf(f), 1);
    Scene.removeFurnitureObj(f);
    Nav.build(Scene.W, Scene.furnList()); Zombies.rebuildGrid();
    GameClock.advance(Math.round(recipe.min / 3));
    logEvent(STR.arrDismantled(f.label), 'info');
    return true;
  },

  /* ---------- building furniture from materials ---------- */
  missing(ch, recipe) {
    const out = [];
    for (const t of recipe.tools) if (!Health.findItem(ch, [t])) out.push(itemDef(t).name);
    for (const [id, n] of recipe.uses) { const have = Barricades.countAvail(ch, id); if (have < n) out.push(itemDef(id).name + ' ' + have + '/' + n); }
    return out;
  },
  build(recipe) {
    const ch = activeChar();
    const miss = this.missing(ch, recipe);
    if (miss.length) { Toast.show(STR.arrNeed(miss.join(', ')), 'warn', 4000); return false; }
    return this.startNew(recipe.type, (f) => {
      for (const [id, n] of recipe.uses) Barricades.consume(ch, id, n);
      f.crafted = true;
      const loud = !this.indoor(f.floor, f.x, f.z) && recipe.tools.includes('hammer');
      GameClock.advance(recipe.min);
      if (loud) NoiseBus.emit(f.x, f.z, 14, 0);
      Skills.gain(ch, recipe.skill, recipe.min * 0.15);
      logEvent(STR.arrBuilt(f.label), 'good');
      Toast.show(STR.arrBuilt(f.label), 'good');
      Scene.syncPiles();
    });
  },
  /** Install an item that becomes furniture (pot, drum, freezer, generator…) wherever the player chooses. */
  installItem(c, slot) {
    const d = itemDef(slot.it.id), type = d.installs;
    if (!type) return false;
    const ch = activeChar();
    return this.startNew(type, (f) => {
      if (c.slots.includes(slot)) { if (slot.it.qty > 1) slot.it.qty -= 1; else Inv.remove(c, slot); }
      GameClock.advance(FURNITURE[type].install || 30);
      Skills.gain(ch, type === 'generator' ? 'mechanics' : 'carpentry', 4);
      logEvent(STR.installed(FURNITURE[type].name), 'good');
      Toast.show(STR.installed(FURNITURE[type].name), 'good');
    });
  },
};
