/* ==========================================================================
   36 · AVATAR CONTROLLER — moves a Character's humanoid along nav paths,
   handles stairs, facing, sleep pose and arrival callbacks.
   ========================================================================== */

class Avatar {
  constructor(charData) {
    this.d = charData;
    this.h = new Humanoid(Object.assign({ hairStyle: charData.bg === 'nurse' || charData.bg === 'cook' ? 1 : 0 }, charData.look));
    this.obj = this.h.root;
    this.path = [];
    this.mode = 'walk';
    this.onArrive = null;
    this.stairFrom = null;
    this.bed = null;
    this.syncFromData();
    this.refreshGear();
  }
  syncFromData() {
    const p = this.d.pos;
    this.obj.position.set(p.x, HomeWorld.groundY(p.x, p.z, p.floor), p.z);
    this.obj.rotation.y = p.rot;
  }
  refreshGear() { this.h.setGear({ back: this.d.equip.back, hand: this.d.equip.hand }); }
  get floor() { return this.d.pos.floor; }
  isMoving() { return this.path.length > 0; }

  /** Request a move. Returns false if no path exists. */
  goTo(target, mode = 'walk', onArrive = null) {
    const ch = new Character(this.d);
    if (ch.speedFactor() <= 0.01) { Bus.emit('toast', { kind: 'warn', msg: STR.tooHeavyToMove }); return false; }
    const p = Nav.path({ x: this.d.pos.x, z: this.d.pos.z, floor: this.d.pos.floor }, target);
    if (!p || !p.length) return false;
    this.path = p.slice(1);
    this.mode = mode;
    this.onArrive = onArrive;
    if (!this.path.length && onArrive) { const cb = onArrive; this.onArrive = null; cb(); }
    return true;
  }
  stop() { this.path = []; this.onArrive = null; this.d._moving = null; }

  update(dt) {
    const d = this.d;
    if (d.sleeping) { this.layInBed(); this.h.update(dt, { mode: 'sleep' }); d._moving = null; return; }
    if (this.bed) { this.bed = null; this.obj.rotation.set(0, 0, 0); this.obj.rotation.order = 'XYZ'; this.syncFromData(); }
    let speed = 0;
    if (this.path.length && dt > 0) {
      const ch = new Character(d);
      const base = this.mode === 'run' && d.needs.stamina > 5 ? CFG.RUN_SPEED : this.mode === 'sneak' ? CFG.SNEAK_SPEED : CFG.WALK_SPEED;
      const runMode = base === CFG.RUN_SPEED ? 'run' : this.mode === 'sneak' ? 'sneak' : 'walk';
      speed = base * ch.speedFactor() * (1 + ch.skill('fitness') * 0.015);
      let budget = speed * dt;
      while (budget > 0 && this.path.length) {
        const wp = this.path[0];
        if (wp.stair && !this.stairFrom) this.stairFrom = { x: d.pos.x, z: d.pos.z, floor: d.pos.floor };
        const dx = wp.x - d.pos.x, dz = wp.z - d.pos.z, dist = Math.hypot(dx, dz);
        if (dist < 1e-4) { this.arriveWaypoint(wp); continue; }
        const step = Math.min(dist, budget);
        d.pos.x += (dx / dist) * step; d.pos.z += (dz / dist) * step;
        budget -= step;
        const want = Math.atan2(dx, dz);
        let diff = want - d.pos.rot; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
        d.pos.rot += diff * Math.min(1, dt * 12);
        if (step >= dist - 1e-6) this.arriveWaypoint(wp);
      }
      d._moving = this.path.length || speed > 0 ? runMode : null;
      this.h.update(dt, { mode: runMode, speed });
    } else {
      d._moving = null;
      this.h.update(dt, { mode: 'idle', speed: 0 });
    }
    // Height: stairs interpolate between landings.
    let y;
    if (this.stairFrom) {
      const s = Nav.stair, up = this.stairFrom.floor === 0;
      const z0 = s.bottom.z, z1 = s.top.z;
      const t = U.clamp((d.pos.z - z0) / (z1 - z0), 0, 1);
      y = t * CFG.FLOOR_H;
      if (!up && t <= 0.001) y = 0;
    } else y = HomeWorld.groundY(d.pos.x, d.pos.z, d.pos.floor);
    this.obj.position.set(d.pos.x, y, d.pos.z);
    this.obj.rotation.y = d.pos.rot;
    // Auto-follow the visible floor while climbing.
    const visFloor = this.stairFrom ? (y > CFG.FLOOR_H * 0.55 ? 1 : 0) : d.pos.floor;
    if (visFloor !== Render.viewFloor && Render.cam.follow) Render.setViewFloor(visFloor);
  }
  arriveWaypoint(wp) {
    this.path.shift();
    if (wp.stair) { this.d.pos.floor = wp.floor; this.stairFrom = null; }
    if (!this.path.length) {
      this.d._moving = null;
      const cb = this.onArrive; this.onArrive = null;
      if (cb) cb();
    }
  }
  /** Lie on the bed the character is sleeping on. */
  layInBed() {
    const f = this.bed;
    if (!f) return;
    const def = FURNITURE[f.type];
    const ang = -f.rot * Math.PI / 2;
    // Lie face-up along the bed's long axis, head at the headboard (bed-local −z).
    // Rx(−90°) maps the body's +y (head) to −z; the yaw then matches the bed.
    this.obj.rotation.order = 'YXZ';
    this.obj.rotation.set(-Math.PI / 2, ang, 0);
    const feet = new THREE.Vector3(0, 0, 0.82).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    this.obj.position.set(f.x + feet.x, f.floor * CFG.FLOOR_H + def.size[2] + 0.13, f.z + feet.z);
  }
}
