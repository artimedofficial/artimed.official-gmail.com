/* ==========================================================================
   38 · SCENE — the current playable place (home or a location). Builds its
   world, furniture, avatar and ground piles; turns clicks into actions
   (walk / open / sleep / drink / checkout / leave) and drives per-frame updates.
   ========================================================================== */

const Scene = {
  W: null, avatar: null, hover: null, pileObjs: new Map(), stockObjs: new Map(),

  /** The furniture list of the current place. */
  furnList() { return S.scene === 'home' ? S.home.furniture : (World.loc(S.scene) || { furniture: [] }).furniture; },
  piles() {
    if (S.scene === 'home') { if (!Array.isArray(S.home.piles)) S.home.piles = []; return S.home.piles; }
    return World.loc(S.scene).piles;
  },
  setPiles(list) { if (S.scene === 'home') S.home.piles = list; else World.loc(S.scene).piles = list; },
  isHome() { return S.scene === 'home'; },

  build() {
    if (S.scene !== 'home') World.ensureLoc(S.scene);
    this.W = S.scene === 'home' ? HomeWorld.build(Render.scene) : LocationWorld.build(Render.scene, S.scene);
    for (const f of this.furnList()) this.addFurniture(f);
    Nav.build(this.W, this.furnList());
    Render.setWorld(this.W);
    this.avatar = new Avatar(S.chars[S.active]);
    Render.scene.add(this.avatar.obj);
    for (const p of this.piles()) this.addPileObj(p);
    Render.setViewFloor(S.chars[S.active].pos.floor);
    Render.cam.tx = S.chars[S.active].pos.x; Render.cam.tz = S.chars[S.active].pos.z;
    Render.cam.ctx = Render.cam.tx; Render.cam.ctz = Render.cam.tz;
  },
  dispose() {
    const W = this.W; if (!W) return;
    Render.scene.remove(W.root);
    Render.scene.remove(this.avatar.obj);
    W.root.traverse((o) => { if (o.isMesh || o.isLineSegments) o.geometry.dispose(); });
    this.avatar.h.dispose();
    this.W = null; this.pileObjs.clear(); this.stockObjs.clear(); this.hover = null;
    Render.showHover(null);
    if (Render.dust) { Render.scene.remove(Render.dust); Render.dust = null; }
  },
  /** Move the active character to another place (after travel). */
  enter(id) {
    if (InvUI.isOpen) InvUI.close();
    this.dispose();
    S.scene = id;
    if (id !== 'home') { const st = World.ensureLoc(id); World.deplete(id); st.visits++; st.lastVisit = S.time.min; }
    const d = S.chars[S.active];
    const tmpW = id === 'home' ? { x: 2.8, z: HOME.lot.z1 - 1.2, rot: Math.PI } : { x: locDef(id).doorX, z: locDef(id).room.z1 - 0.9, rot: Math.PI };
    d.pos.x = tmpW.x; d.pos.z = tmpW.z; d.pos.floor = 0; d.pos.rot = tmpW.rot;
    this.build();
    Render.cam.follow = true;
    logEvent(STR.arrived(locDef(id).name), 'info');
    Bus.emit('scene:changed', id);
    Save.saveRun('travel');
  },

  addFurniture(f) {
    const def = FURNITURE[f.type];
    const obj = AssetRegistry.create(def.asset, { seed: f.uid });
    obj.position.set(f.x, f.floor * CFG.FLOOR_H + (f.onTop || 0) + (def.outdoor ? HomeWorld.YARD_Y : 0), f.z);
    obj.rotation.y = -f.rot * Math.PI / 2;
    obj.userData.furnUid = f.uid; obj.userData.floor = f.floor;
    (def.outdoor ? this.W.outdoor : this.W.floors[f.floor].group).add(obj);
    this.W.furn.set(f.uid, obj);
    if (def.stock) this.refreshStock(f);
    if (def.light) {
      const p = new THREE.Vector3(0, def.light.y, 0).applyMatrix4(obj.matrixWorld.compose(obj.position, obj.quaternion, obj.scale));
      let lampMat = null;
      obj.traverse((o) => { if (o.isMesh && o.material.emissive && o.material.side === THREE.DoubleSide) lampMat = o.material; });
      this.W.lights.push({ kind: 'lamp', floor: f.floor, room: (HomeWorld.roomAt(f.floor, f.x, f.z) || {}).id, pos: p, color: def.light.color, intensity: def.light.intensity, dist: def.light.dist, lampMat });
    }
  },
  /** Rebuild product meshes for a stocked fixture when its contents changed. */
  refreshStock(f) {
    const def = FURNITURE[f.type], obj = this.W && this.W.furn.get(f.uid);
    if (!def.stock || !obj || !f.inv) return;
    const sig = f.inv.slots.map((s) => s.it.id + s.it.qty + ':' + s.x + s.y).join('|');
    const prev = this.stockObjs.get(f.uid);
    if (prev && prev.sig === sig) return;
    if (prev && prev.obj) { obj.remove(prev.obj); prev.obj.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
    const st = ShelfDresser.build(f, def, f.inv);
    if (st) obj.add(st);
    this.stockObjs.set(f.uid, { sig, obj: st });
  },
  refreshAllStock() { for (const f of this.furnList()) if (FURNITURE[f.type].stock) this.refreshStock(f); },
  furn(uid) { return this.furnList().find((f) => f.uid === uid) || null; },

  /* ---------- Ground piles (dropped items) ---------- */
  pileNear(floor, x, z, create) {
    let best = null, bd = 1.4;
    for (const p of this.piles()) {
      if (p.floor !== floor) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best && create) {
      best = { uid: U.uid(), floor, x, z, inv: Inv.makeContainer(8, 6, 200, STR.ground) };
      this.piles().push(best);
    }
    return best;
  },
  /** Called after inventory changes: build/remove pile meshes and refresh shelf stock. */
  syncPiles() {
    this.setPiles(this.piles().filter((p) => {
      if (p.inv.slots.length) { if (!this.pileObjs.has(p.uid)) this.addPileObj(p); return true; }
      const o = this.pileObjs.get(p.uid); if (o) { o.parent.remove(o); this.pileObjs.delete(p.uid); }
      return false;
    }));
    this.refreshAllStock();
  },
  addPileObj(p) {
    const pb = new PB('pile' + p.uid);
    pb.box(0.42, 0.22, 0.34, Mat.color('#b88a5a', 0.95), 0, 0, 0, 0.01, [0, 0.4, 0]);
    pb.box(0.3, 0.12, 0.24, Mat.color('#e9e4d6', 0.9), 0.15, 0, 0.18, 0.02, [0, -0.3, 0]);
    pb.cyl(0.05, 0.05, 0.2, Mat.color('#2b7fc4', 0.3), -0.2, 0, 0.12, 10);
    const obj = pb.build();
    obj.position.set(p.x, this.W.groundY(p.x, p.z, p.floor), p.z);
    obj.userData.pileUid = p.uid;
    this.W.floors[Math.min(p.floor, this.W.floors.length - 1)].group.add(obj);
    this.pileObjs.set(p.uid, obj);
  },

  /* ---------- Interaction ---------- */
  accessPoint(f) {
    const def = FURNITURE[f.type];
    const ang = -f.rot * Math.PI / 2;
    const reach = def.size[1] / 2 + 0.45;
    const fx = f.x + Math.sin(ang) * reach, fz = f.z + Math.cos(ang) * reach;
    return Nav.nearestWalkable(f.floor, fx, fz, 2.0) || Nav.nearestWalkable(f.floor, f.x, f.z, 2.5);
  },
  /** Actions available on a furniture piece (only implemented ones are offered). */
  actions(f) {
    const def = FURNITURE[f.type], out = [];
    if (def.act === 'checkout') out.push({ key: 'checkout', label: STR.checkoutAct });
    if (f.inv) out.push({ key: 'open', label: STR.open + ' ' + f.label });
    if (def.act === 'sleep') out.push({ key: 'sleep', label: STR.sleepHere });
    if (def.act === 'water') out.push({ key: 'drink', label: STR.drinkTap });
    out.push({ key: 'walk', label: STR.walkHere });
    return out;
  },
  doAction(f, key, mode = 'walk') {
    const ap = this.accessPoint(f);
    if (!ap) { Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach }); return; }
    const after = {
      open: () => InvUI.open(f),
      sleep: () => SleepUI.open(f),
      drink: () => { Needs.drinkTap(activeChar()); },
      checkout: () => CheckoutUI.open(),
      walk: null,
    }[key];
    const ok = this.avatar.goTo({ x: ap.x, z: ap.z, floor: f.floor }, mode, () => {
      if (after) { this.face(f); after(); }
    });
    if (!ok) Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
    else { Render.cam.follow = true; Render.flashClick(ap.x, this.W.groundY(ap.x, ap.z, f.floor), ap.z); }
  },
  face(f) { const d = S.chars[S.active]; d.pos.rot = Math.atan2(f.x - d.pos.x, f.z - d.pos.z); },
  /** Is a ground point beyond the exit (gate / shop door)? */
  isExitPoint(g) {
    if (g.floor !== 0) return false;
    if (this.isHome()) return g.z > HOME.lot.z1 + 0.6 && g.x > HOME.gate.x0 - 1 && g.x < HOME.gate.x1 + 1;
    const r = locDef(S.scene).room;
    return g.z > r.z1 + 0.6;
  },
  /** Walk to the exit, then open the city map. */
  leave(mode = 'walk') {
    const e = this.W.exit;
    const ok = this.avatar.goTo({ x: e.x, z: e.z, floor: 0 }, mode, () => MapUI.open(true));
    if (!ok) Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
    else Render.cam.follow = true;
    return ok;
  },
  atExit() { const d = S.chars[S.active], e = this.W.exit; return d.pos.floor === 0 && Math.hypot(d.pos.x - e.x, d.pos.z - e.z) < 1.2; },

  click(ev, isDouble) {
    const hit = Render.pick(ev.clientX, ev.clientY);
    if (!hit) return;
    const mode = ev.shiftKey ? 'sneak' : (ev.ctrlKey || isDouble) ? 'run' : 'walk';
    if (hit.kind === 'furn') {
      const f = this.furn(hit.uid); if (!f) return;
      const acts = this.actions(f);
      this.doAction(f, acts[0].key, mode);
      return;
    }
    if (hit.kind === 'stairs') { this.useStairs(mode); return; }
    const g = hit.ground;
    if (this.isExitPoint(g)) { this.leave(mode); return; }
    const pile = this.pileNear(g.floor, g.x, g.z, false);
    if (pile && Math.hypot(pile.x - g.x, pile.z - g.z) < 0.5) {
      const ok = this.avatar.goTo({ x: pile.x, z: pile.z, floor: pile.floor }, mode, () => InvUI.open(null));
      if (!ok) Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
      return;
    }
    const ok = this.avatar.goTo({ x: g.x, z: g.z, floor: g.floor }, mode, null);
    if (ok) { Render.cam.follow = true; Render.flashClick(g.x, this.W.groundY(g.x, g.z, g.floor), g.z); }
    else Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
  },
  /** Walk to the other floor via the stairs (target just past the far landing). */
  useStairs(mode = 'walk') {
    if (!this.W.stairs) return;
    const d = S.chars[S.active];
    const up = d.pos.floor === 0;
    const t = up ? { x: Nav.stair.top.x - 0.6, z: Nav.stair.top.z + 0.1, floor: 1 } : { x: Nav.stair.bottom.x - 0.7, z: Nav.stair.bottom.z, floor: 0 };
    const ok = this.avatar.goTo(t, mode, null);
    if (!ok) Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
    else { Render.cam.follow = true; Toast.show(up ? STR.goUp : STR.goDown, 'info', 1500); }
  },
  contextMenu(ev) {
    const hit = Render.pick(ev.clientX, ev.clientY);
    if (!hit) return;
    let items = [];
    if (hit.kind === 'stairs') {
      items = [{ label: S.chars[S.active].pos.floor === 0 ? STR.goUp : STR.goDown, fn: () => this.useStairs() }];
    } else if (hit.kind === 'furn') {
      const f = this.furn(hit.uid);
      if (f) items = this.actions(f).map((a) => ({ label: a.label, fn: () => this.doAction(f, a.key) }));
    } else {
      const g = hit.ground;
      const fail = () => Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
      items = [
        { label: STR.walkHere, fn: () => this.avatar.goTo(g, 'walk') || fail() },
        { label: STR.runHere, fn: () => this.avatar.goTo(g, 'run') || fail() },
        { label: STR.sneakHere, fn: () => this.avatar.goTo(g, 'sneak') || fail() },
        { label: STR.leaveAct, fn: () => this.leave() },
      ];
    }
    ContextMenu.show(ev.clientX, ev.clientY, items);
  },
  hoverAt(x, y) {
    const hit = Render.pick(x, y);
    const uid = hit && hit.kind === 'furn' ? hit.uid : null;
    if (uid !== this.hover) {
      this.hover = uid;
      Render.showHover(uid ? this.W.furn.get(uid) : null);
    }
    const f = uid && this.furn(uid);
    if (hit && hit.kind === 'stairs') return S.chars[S.active].pos.floor === 0 ? STR.goUp : STR.goDown;
    if (hit && hit.kind === 'ground' && this.isExitPoint(hit.ground)) return STR.leaveAct;
    if (f && FURNITURE[f.type].act === 'checkout') return f.label + ' — ' + STR.checkoutAct;
    return f ? f.label + (f.inv ? ' — ' + STR.clickToOpen : '') : null;
  },

  update(realDt, simDt) {
    this.avatar.update(simDt);
    const p = this.avatar.obj.position;
    Render.playerRing.position.set(p.x, p.y + 0.02, p.z);
    Render.playerRing.visible = !S.chars[S.active].sleeping;
    if (this.W.awning) this.W.awning.visible = Render.viewFloor === 1 || Math.hypot(p.x - this.W.awning.userData.center.x, p.z - this.W.awning.userData.center.z) > 5;
    if (this.W.exitMarker) this.W.exitMarker.material.opacity = 0.45 + Math.sin(performance.now() * 0.004) * 0.25;
    Render.updateCamera(realDt, { x: p.x, z: p.z });
    Render.updateDayNight(S.time.min);
    Render.updateLights({ x: p.x, z: p.z }, this.isHome() ? S.home.lightsOn : true, Power.gridOn());
  },
};
const HomeScene = Scene; // legacy alias used by older harnesses
