/* ==========================================================================
   38 · HOME SCENE — places furniture, the player avatar, ground piles; turns
   clicks into actions (walk / open / sleep / drink) and drives per-frame updates.
   ========================================================================== */

const HomeScene = {
  W: null, avatar: null, hover: null, pileObjs: new Map(),

  build() {
    this.W = HomeWorld.build(Render.scene);
    for (const f of S.home.furniture) this.addFurniture(f);
    Nav.build(this.W, S.home.furniture);
    Render.setWorld(this.W);
    this.avatar = new Avatar(S.chars[S.active]);
    Render.scene.add(this.avatar.obj);
    S.home.piles = Array.isArray(S.home.piles) ? S.home.piles : [];
    for (const p of S.home.piles) this.addPileObj(p);
    Render.setViewFloor(S.chars[S.active].pos.floor);
    Render.cam.tx = S.chars[S.active].pos.x; Render.cam.tz = S.chars[S.active].pos.z;
    Render.cam.ctx = Render.cam.tx; Render.cam.ctz = Render.cam.tz;
  },
  addFurniture(f) {
    const def = FURNITURE[f.type];
    const obj = AssetRegistry.create(def.asset, { seed: f.uid });
    obj.position.set(f.x, f.floor * CFG.FLOOR_H + (f.onTop || 0) + (def.outdoor ? HomeWorld.YARD_Y : 0), f.z);
    obj.rotation.y = -f.rot * Math.PI / 2;
    obj.userData.furnUid = f.uid; obj.userData.floor = f.floor;
    (def.outdoor ? this.W.outdoor : this.W.floors[f.floor].group).add(obj);
    this.W.furn.set(f.uid, obj);
    if (def.light) {
      const p = new THREE.Vector3(0, def.light.y, 0).applyMatrix4(obj.matrixWorld.compose(obj.position, obj.quaternion, obj.scale));
      let lampMat = null;
      obj.traverse((o) => { if (o.isMesh && o.material.emissive && o.material.side === THREE.DoubleSide) lampMat = o.material; });
      this.W.lights.push({ kind: 'lamp', floor: f.floor, room: (HomeWorld.roomAt(f.floor, f.x, f.z) || {}).id, pos: p, color: def.light.color, intensity: def.light.intensity, dist: def.light.dist, lampMat });
    }
  },
  furn(uid) { return S.home.furniture.find((f) => f.uid === uid) || null; },

  /* ---------- Ground piles (dropped items) ---------- */
  pileNear(floor, x, z, create) {
    let best = null, bd = 1.4;
    for (const p of S.home.piles) {
      if (p.floor !== floor) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best && create) {
      best = { uid: U.uid(), floor, x, z, inv: Inv.makeContainer(8, 6, 200, STR.ground) };
      S.home.piles.push(best);
    }
    return best;
  },
  /** Called after inventory changes: build/remove pile meshes. */
  syncPiles() {
    S.home.piles = S.home.piles.filter((p) => {
      if (p.inv.slots.length) { if (!this.pileObjs.has(p.uid)) this.addPileObj(p); return true; }
      const o = this.pileObjs.get(p.uid); if (o) { o.parent.remove(o); this.pileObjs.delete(p.uid); }
      return false;
    });
  },
  addPileObj(p) {
    const pb = new PB('pile' + p.uid);
    pb.box(0.42, 0.22, 0.34, Mat.color('#b88a5a', 0.95), 0, 0, 0, 0.01, [0, 0.4, 0]);
    pb.box(0.3, 0.12, 0.24, Mat.color('#e9e4d6', 0.9), 0.15, 0, 0.18, 0.02, [0, -0.3, 0]);
    pb.cyl(0.05, 0.05, 0.2, Mat.color('#2b7fc4', 0.3), -0.2, 0, 0.12, 10);
    const obj = pb.build();
    obj.position.set(p.x, HomeWorld.groundY(p.x, p.z, p.floor), p.z);
    obj.userData.pileUid = p.uid;
    (p.floor === 1 ? this.W.floors[1].group : this.W.floors[0].group).add(obj);
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
      walk: null,
    }[key];
    const ok = this.avatar.goTo({ x: ap.x, z: ap.z, floor: f.floor }, mode, () => {
      if (after) { this.face(f); after(); }
    });
    if (!ok) Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
    else { Render.cam.follow = true; Render.flashClick(ap.x, HomeWorld.groundY(ap.x, ap.z, f.floor), ap.z); }
  },
  face(f) { const d = S.chars[S.active]; d.pos.rot = Math.atan2(f.x - d.pos.x, f.z - d.pos.z); },

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
    const pile = this.pileNear(g.floor, g.x, g.z, false);
    if (pile && Math.hypot(pile.x - g.x, pile.z - g.z) < 0.5) {
      const ok = this.avatar.goTo({ x: pile.x, z: pile.z, floor: pile.floor }, mode, () => InvUI.open(null));
      if (!ok) Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
      return;
    }
    const ok = this.avatar.goTo({ x: g.x, z: g.z, floor: g.floor }, mode, null);
    if (ok) { Render.cam.follow = true; Render.flashClick(g.x, HomeWorld.groundY(g.x, g.z, g.floor), g.z); }
    else Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach });
  },
  /** Walk to the other floor via the stairs (target just past the far landing). */
  useStairs(mode = 'walk') {
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
      items = [
        { label: STR.walkHere, fn: () => this.avatar.goTo(g, 'walk') || Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach }) },
        { label: STR.runHere, fn: () => this.avatar.goTo(g, 'run') || Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach }) },
        { label: STR.sneakHere, fn: () => this.avatar.goTo(g, 'sneak') || Bus.emit('toast', { kind: 'warn', msg: STR.cannotReach }) },
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
    return f ? f.label + (f.inv ? ' — ' + STR.clickToOpen : '') : null;
  },

  update(realDt, simDt) {
    this.avatar.update(simDt);
    const p = this.avatar.obj.position;
    Render.playerRing.position.set(p.x, p.y + 0.02, p.z);
    Render.playerRing.visible = !S.chars[S.active].sleeping;
    if (this.W.awning) this.W.awning.visible = Render.viewFloor === 1 || Math.hypot(p.x - this.W.awning.userData.center.x, p.z - this.W.awning.userData.center.z) > 5;
    Render.updateCamera(realDt, { x: p.x, z: p.z });
    Render.updateDayNight(S.time.min);
    Render.updateLights({ x: p.x, z: p.z }, S.home.lightsOn, true);
  },
};
