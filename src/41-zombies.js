/* ==========================================================================
   41 · ZOMBIES, NOISE & COMBAT (§8)
   Zombies live only in the active scene. They perceive by sight (vision cone,
   shorter at night), by outdoor noise, and by lit windows at night (home).
   At home they path on a zombie nav layer where unboarded broken windows are
   passable and barricaded doors/gate are not; blocked zombies bash barricades.
   ========================================================================== */

const NoiseBus = {
  /** Emit a sound. Indoor sounds (inside the house/shop) never reach zombies (§8.3). */
  emit(x, z, radius, floor = 0, outdoorOverride = false) {
    if (!Scene.W || radius <= 0) return 0;
    const indoor = Scene.W.isIndoor(x, z, floor);
    if (indoor && !outdoorOverride) return 0;
    let n = 0;
    for (const zb of Zombies.list) {
      if (zb.dead) continue;
      const d = Math.hypot(zb.x - x, zb.z - z);
      if (d <= radius * zb.t.hear) { zb.hearAt(x, z); n++; }
    }
    Bus.emit('noise', { x, z, radius, heard: n });
    return n;
  },
};

class Zombie {
  constructor(type, x, z, seed) {
    const T = ZOMBIES[type] || ZOMBIES.walker;
    const rng = U.makeRng(U.hashSeed('z' + seed));
    this.id = 'z' + seed; this.type = type; this.t = T;
    this.x = x; this.z = z; this.floor = 0; this.rot = rng() * Math.PI * 2;
    this.hp = T.hp; this.headHp = T.headHp;
    this.speed = U.range(rng, T.speed[0], T.speed[1]);
    this.state = 'wander'; this.path = []; this.repath = 0; this.atkT = rng(); this.wanderT = 0; this.stagger = 0;
    this.target = null; this.deadT = 0; this.dead = false; this.flash = 0; this.groanT = 2 + rng() * 6;
    this.rng = rng;
    this.h = new Humanoid({
      skin: U.pick(rng, ZOMBIE_LOOKS.skin), shirt: U.pick(rng, ZOMBIE_LOOKS.shirt), pants: U.pick(rng, ZOMBIE_LOOKS.pants),
      hair: U.pick(rng, ZOMBIE_LOOKS.hair), hairStyle: rng() < 0.4 ? 1 : 0, build: 0.92 + rng() * 0.16, height: 0.95 + rng() * 0.1,
    });
    // Torn clothing: darker stains
    this.h.mats.shirt.color.multiplyScalar(0.8); this.h.mats.skin.roughness = 0.8;
    this.h.root.traverse((o) => { if (o.isMesh) o.userData.zombieId = this.id; });
    this.obj = this.h.root;
    this.limp = rng() * 0.6;
    this.sync();
  }
  sync() { this.obj.position.set(this.x, Scene.W.groundY(this.x, this.z, this.floor), this.z); this.obj.rotation.y = this.rot; }
  hearAt(x, z) { if (this.dead) return; if (this.state === 'wander' || this.state === 'investigate') { this.state = 'investigate'; this.goal = { x, z }; this.repath = 0; } }
  /** Can this zombie see the player? */
  sees(px, pz, pfloor) {
    if (pfloor !== this.floor) return false;
    const dx = px - this.x, dz = pz - this.z, d = Math.hypot(dx, dz);
    const night = Render.night > 0.5;
    const d0 = S.chars[S.active];
    let range = this.t.sight * (night ? 0.55 : 1) * (d0._moving === 'sneak' ? 0.55 - new Character(d0).skill('stealth') * 0.02 : 1);
    if (Scene.W.isIndoor(px, pz, pfloor) !== Scene.W.isIndoor(this.x, this.z, 0) && Scene.isHome()) range *= 0.35; // walls & windows
    if (d > range) return false;
    if (d < 1.6) return true;
    const ang = Math.atan2(dx, dz) - this.rot;
    const a = Math.atan2(Math.sin(ang), Math.cos(ang));
    if (Math.abs(a) > 1.0) return false;
    return Zombies.los(this.x, this.z, px, pz);
  }
  damage(amount, head) {
    if (this.dead) return;
    this.flash = 0.18;
    this.stagger = 0.45;
    if (head) this.headHp -= amount; else this.hp -= amount;
    if (this.hp <= 0 || this.headHp <= 0) this.die();
    else if (this.state !== 'attack') this.state = 'chase';
  }
  die() {
    this.dead = true; this.deadT = 0; this.state = 'dead';
    Bus.emit('zombie:killed', this);
    Snd.play('zdie', this.x, this.z);
  }
  update(dt, player) {
    if (this.dead) {
      this.deadT += dt;
      const t = Math.min(1, this.deadT / 0.7);
      this.obj.rotation.order = 'YXZ';
      this.obj.rotation.x = -Math.PI / 2 * U.smooth(t);
      this.obj.position.y = Scene.W.groundY(this.x, this.z, 0) + 0.15 * t;
      this.h.update(dt * 0.2, { mode: 'idle', speed: 0 });
      return;
    }
    if (this.flash > 0) { this.flash -= dt; const k = Math.max(0, this.flash) * 4; this.h.mats.skin.emissive.setRGB(k * 0.6, 0, 0); this.h.mats.shirt.emissive.setRGB(k * 0.4, 0, 0); }
    this.groanT -= dt;
    if (this.groanT <= 0) { this.groanT = 4 + this.rng() * 8; Snd.play('groan', this.x, this.z); }
    if (this.stagger > 0) { this.stagger -= dt; this.h.update(dt, { mode: 'idle', speed: 0, zombie: true }); return; }
    const p = player.d.pos;
    const dist = Math.hypot(p.x - this.x, p.z - this.z);
    const alive = player.d.alive;
    // Perception
    if (alive && this.state !== 'attack' && this.sees(p.x, p.z, p.floor)) { if (this.state !== 'chase') Bus.emit('zombie:spotted', this); this.state = 'chase'; }
    if (this.state === 'chase' && (!alive || (dist > this.t.sight * 1.6 && !this.sees(p.x, p.z, p.floor)))) { this.state = 'investigate'; this.goal = { x: p.x, z: p.z }; }
    let moveTo = null, speed = this.speed;
    if (this.state === 'chase') {
      if (dist < 0.95 && p.floor === this.floor) this.state = 'attack';
      else moveTo = { x: p.x, z: p.z };
    }
    if (this.state === 'attack') {
      this.rot = Math.atan2(p.x - this.x, p.z - this.z);
      this.atkT -= dt;
      if (dist > 1.25) this.state = 'chase';
      else if (this.atkT <= 0) { this.atkT = this.t.attackCd; Combat.zombieHits(this, player); }
      this.h.update(dt, { mode: 'idle', speed: 0, zombie: true, lunge: this.atkT > this.t.attackCd - 0.35 });
      this.sync();
      return;
    }
    if (this.state === 'bash') {
      const b = Barricades.get(this.bashKey);
      if (!b || Barricades.passable(this.bashKey)) { this.state = 'wander'; Zombies.rebuildGrid(); }
      else {
        this.atkT -= dt;
        if (this.atkT <= 0) { this.atkT = this.t.attackCd * 1.2; Barricades.hit(this.bashKey, U.range(this.rng, 6, 11)); }
        if (alive && this.sees(p.x, p.z, p.floor) && Zombies.reachable(this, p)) this.state = 'chase';
      }
      this.h.update(dt, { mode: 'idle', speed: 0, zombie: true, lunge: this.atkT > this.t.attackCd - 0.35 });
      this.sync();
      return;
    }
    if (this.state === 'investigate') {
      moveTo = this.goal;
      if (!moveTo || Math.hypot(moveTo.x - this.x, moveTo.z - this.z) < 0.6) { this.state = Scene.isHome() && S.flags.outbreak && Render.night > 0.4 ? 'siege' : 'wander'; moveTo = null; }
    }
    if (this.state === 'siege') {
      // Drawn to the house (lit windows / noise): head for the nearest barricade or breach.
      const tgt = Barricades.nearestTarget(this.x, this.z);
      if (tgt) {
        if (Math.hypot(tgt.x - this.x, tgt.z - this.z) < 0.9) { this.state = 'bash'; this.bashKey = tgt.key; this.atkT = 1; }
        else moveTo = tgt;
      } else this.state = 'wander';
    }
    if (this.state === 'wander') {
      this.wanderT -= dt; speed *= 0.5;
      if (this.wanderT <= 0 || !this.goal) { this.wanderT = 4 + this.rng() * 6; this.goal = Zombies.randomPoint(this.rng, this.x, this.z, 5); }
      moveTo = this.goal;
      if (Scene.isHome() && S.flags.outbreak && Render.night > 0.4 && Barricades.attraction() > this.rng() * 3) this.state = 'siege';
    }
    // Movement along a (re)planned path on the zombie nav layer
    if (moveTo) {
      this.repath -= dt;
      if (this.repath <= 0 || !this.path.length) {
        this.repath = 0.9 + this.rng() * 0.4;
        const route = Zombies.route(this.x, this.z, moveTo.x, moveTo.z);
        this.path = route || [];
        if (!route && this.state === 'chase') {
          // Can't reach the player: go to the barricade that blocks the way.
          const tgt = Barricades.nearestTarget(this.x, this.z);
          if (tgt) { this.state = Math.hypot(tgt.x - this.x, tgt.z - this.z) < 0.9 ? 'bash' : 'siege'; this.bashKey = tgt.key; this.atkT = 1; }
        }
      }
      let budget = speed * dt;
      while (budget > 0 && this.path.length) {
        const wp = this.path[0];
        const dx = wp.x - this.x, dz = wp.z - this.z, dd = Math.hypot(dx, dz);
        if (dd < 0.05) { this.path.shift(); continue; }
        const st = Math.min(dd, budget);
        this.x += (dx / dd) * st; this.z += (dz / dd) * st; budget -= st;
        const want = Math.atan2(dx, dz);
        this.rot += Math.atan2(Math.sin(want - this.rot), Math.cos(want - this.rot)) * Math.min(1, dt * 6);
        if (st >= dd - 1e-6) this.path.shift();
      }
      this.h.update(dt, { mode: speed > 1.6 ? 'run' : 'walk', speed: speed * (1 - this.limp * 0.3), zombie: true });
    } else this.h.update(dt, { mode: 'idle', speed: 0, zombie: true });
    this.sync();
  }
}

const Zombies = {
  list: [], grid: null, spawnT: 0,
  clear() {
    for (const z of this.list) { Render.scene.remove(z.obj); z.h.dispose(); }
    this.list = [];
  },
  spawn(type, x, z) {
    const zb = new Zombie(type, x, z, (S.time.min * 31 + this.list.length * 7 + Math.floor(Math.random() * 1e6)) >>> 0);
    this.list.push(zb);
    Render.scene.add(zb.obj);
    return zb;
  },
  alive() { return this.list.filter((z) => !z.dead); },
  /** Zombie nav layer: player grid ± breaches (unboarded broken windows) and barricaded doors/gate. */
  rebuildGrid() {
    const g = Nav.grids[0]; if (!g) return;
    this.grid = { floor: 0, x0: g.x0, z0: g.z0, nx: g.nx, nz: g.nz, block: g.block.slice() };
    if (!Scene.isHome()) return;
    for (const b of Barricades.list()) {
      const rect = b.rect;
      const passable = Barricades.passable(b.key);
      const setV = (v) => {
        for (let iz = 0; iz < g.nz; iz++) for (let ix = 0; ix < g.nx; ix++) {
          const x = g.x0 + (ix + 0.5) * Nav.cell, z = g.z0 + (iz + 0.5) * Nav.cell;
          if (x > rect.x0 && x < rect.x1 && z > rect.z0 && z < rect.z1) this.grid.block[iz * g.nx + ix] = v;
        }
      };
      if (b.kind === 'window') { if (passable) setV(0); }
      else if (!passable) setV(1);
    }
  },
  route(x, z, tx, tz) {
    if (!this.grid) this.rebuildGrid();
    const saved = Nav.grids[0];
    Nav.grids[0] = this.grid;
    let p = null;
    try { p = Nav.astar(0, x, z, tx, tz); } finally { Nav.grids[0] = saved; }
    return p ? p.slice(1) : null;
  },
  reachable(zb, p) { return !!this.route(zb.x, zb.z, p.x, p.z); },
  los(x0, z0, x1, z1) {
    const g = this.grid || Nav.grids[0];
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.2);
    for (let i = 1; i < n; i++) {
      const t = i / n, x = U.lerp(x0, x1, t), z = U.lerp(z0, z1, t);
      const ix = Math.floor((x - g.x0) / Nav.cell), iz = Math.floor((z - g.z0) / Nav.cell);
      if (ix < 0 || iz < 0 || ix >= g.nx || iz >= g.nz) return false;
      if (Nav.grids[0].block[iz * g.nx + ix] && this.isWallCell(x, z)) return false;
    }
    return true;
  },
  /** Blockers that stop sight are walls (not furniture): approximate via the static wall list. */
  isWallCell(x, z) {
    const W = Scene.W;
    for (const r of W.blockers[0]) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true;
    return false;
  },
  randomPoint(rng, x, z, r) {
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2, d = 1 + rng() * r;
      const p = { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d };
      if (Nav.walkable(0, p.x, p.z)) return p;
    }
    return { x, z };
  },
  /** Populate a location on entry (§8.4: density by day, night and area). */
  populate(id) {
    this.clear();
    this.grid = null;
    if (!S.flags.outbreak || id === 'home') return;
    const caps = { conv: 5, pharmacy: 4, market: 11, hardware: 6, supermarket: 13 };
    const n = Math.round((caps[id] || 4) * Danger.level(id) * 1.25 + (Danger.level(id) > 0.15 ? 1 : 0));
    const rng = RNG.local('spawn|' + S.worldSeed + '|' + id + '|' + Math.floor(S.time.min / 60));
    const r = locDef(id).room;
    for (let i = 0; i < n; i++) {
      let p = null;
      for (let k = 0; k < 12 && !p; k++) {
        const x = U.lerp(r.x0 + 0.6, r.x1 - 0.6, rng()), z = U.lerp(r.z0 + 0.6, r.z1 - 2.5, rng());
        if (Nav.walkable(0, x, z)) p = { x, z };
      }
      if (p) this.spawn(this.pickType(rng), p.x, p.z);
    }
    this.rebuildGrid();
  },
  pickType(rng) {
    const day = S.time.min / 1440;
    const R = ZOMBIES.runner;
    if (day >= R.unlock && Render.nightAt(S.time.min) > 0.5 && rng() < R.share) return 'runner';
    return 'walker';
  },
  /** Home pressure at night: walkers arrive from the street, drawn by light and outdoor noise. */
  homeSpawner(dt) {
    if (!S.flags.outbreak || !Scene.isHome()) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 20;  // real seconds between rolls (scaled by game speed below)
    const night = Render.nightAt(S.time.min) > 0.45;
    const alive = this.alive().length;
    const cap = 2 + Math.round(Danger.level('home') * 8);
    if (alive >= cap) return;
    const p = (night ? 0.55 : 0.12) * Danger.level('home') * (1 + Barricades.attraction()) * GameClock.speed();
    if (Math.random() < p) {
      const x = U.lerp(-8, 10, Math.random());
      this.spawn(this.pickType(Math.random), x, HOME.lot.z1 + 2.0);
    }
  },
  update(dt) {
    if (!S || !Scene.W) return;
    const ch = activeChar();
    for (const z of this.list) z.update(dt, ch);
    // Corpses fade after a while
    for (const z of this.list) if (z.dead && z.deadT > 40) { Render.scene.remove(z.obj); z.h.dispose(); z.gone = true; }
    this.list = this.list.filter((z) => !z.gone);
    this.homeSpawner(dt);
    // Player movement noise outdoors
    const nl = Noise.level(ch.d);
    if (nl > 0 && Math.random() < dt * 2) NoiseBus.emit(ch.d.pos.x, ch.d.pos.z, nl, ch.d.pos.floor);
    const gn = Appliances.generatorNoise ? (Scene.isHome() ? Appliances.generatorNoise() : 0) : 0;
    if (gn && Math.random() < dt * 0.2) NoiseBus.emit(HOME_SLOTS[3].x, HOME_SLOTS[3].z, gn, 0, true);
    // Sleep is interrupted by zombies at the barricades or near the player
    if (GameClock.sleepUntil != null && this.list.some((z) => !z.dead && (z.state === 'bash' || z.state === 'attack' || Math.hypot(z.x - ch.d.pos.x, z.z - ch.d.pos.z) < 6))) {
      GameClock.endSleep('zombies'); Toast.show(STR.wokeByZombies, 'bad', 6000);
    }
    Snd.tension(this.list.filter((z) => !z.dead && z.state !== 'wander').length);
  },
};

/** Player combat (§8.1). */
const Combat = {
  target: null, cd: 0, swingT: 0,
  weapon(ch) {
    const it = ch.d.equip.weapon;
    const w = it && WEAPONS[it.id];
    return { it: w ? it : null, w: w || WEAPONS._fists };
  },
  /** Effective damage multiplier from durability cap (taped weapons perform worse, §7.2). */
  condMul(it) { if (!it) return 1; const cap = it.cap == null ? 1 : it.cap; return (0.7 + 0.3 * cap) * (it.cond > 0.2 ? 1 : 0.8); },
  engage(zb) { this.target = zb; },
  stop() { this.target = null; },
  update(dt) {
    if (this.cd > 0) this.cd -= dt;
    if (this.swingT > 0) this.swingT -= dt;
    const zb = this.target;
    if (!zb || zb.dead) { this.target = null; return; }
    const ch = activeChar(), d = ch.d, av = Scene.avatar;
    if (!d.alive || d.sleeping) { this.target = null; return; }
    const { w } = this.weapon(ch);
    const dist = Math.hypot(zb.x - d.pos.x, zb.z - d.pos.z);
    if (dist > w.reach + 0.15) {
      if (!av.isMoving() || av._chaseT <= 0) {
        av._chaseT = 0.35;
        const ang = Math.atan2(d.pos.x - zb.x, d.pos.z - zb.z);
        av.goTo({ x: zb.x + Math.sin(ang) * (w.reach * 0.8), z: zb.z + Math.cos(ang) * (w.reach * 0.8), floor: d.pos.floor }, 'run');
      }
      av._chaseT -= dt;
      return;
    }
    av.stop();
    d.pos.rot = Math.atan2(zb.x - d.pos.x, zb.z - d.pos.z);
    if (this.cd <= 0) this.swing(ch, zb);
  },
  swing(ch, zb) {
    const d = ch.d, { it, w } = this.weapon(ch);
    const fx = Health.effects(d);
    const tired = d.needs.stamina < 10;
    this.cd = w.speed * (tired ? 1.5 : 1) / (1 + ch.skill('melee') * 0.03);
    this.swingT = 0.32;
    Scene.avatar.h.swing = 1;
    d.needs.stamina = Math.max(0, d.needs.stamina - w.stam * (ch.hasTrait('disciplined') ? 0.85 : 1) * (1 - ch.skill('melee') * 0.03));
    const hitChance = U.clamp(0.62 + ch.skill('melee') * 0.03 - (tired ? 0.2 : 0) - (d.needs.energy < 20 ? 0.1 : 0), 0.2, 0.95) * fx.attack;
    const roll = RNG.next('combat');
    const noise = w.noise * (1 - ch.skill('stealth') * 0.02);
    NoiseBus.emit(zb.x, zb.z, noise, d.pos.floor);
    if (roll > hitChance) { Snd.play('swish'); return; }
    const head = RNG.next('combat') < 0.18 + ch.skill('melee') * 0.02;
    const dmg = w.dmg * (1 + ch.skill('melee') * 0.06) * this.condMul(it) * fx.attack * (head ? 2.1 : 1) * U.range(() => RNG.next('combat'), 0.85, 1.15);
    zb.damage(dmg, head);
    Snd.play(w.mat === 'blade' ? 'slash' : 'thud', zb.x, zb.z);
    Skills.gain(ch, 'melee', head ? 3 : 2);
    // Knockback
    const ang = Math.atan2(zb.x - d.pos.x, zb.z - d.pos.z), kb = 0.25 + w.dmg / 100;
    const nx = zb.x + Math.sin(ang) * kb, nz = zb.z + Math.cos(ang) * kb;
    if (Nav.walkable(0, nx, nz)) { zb.x = nx; zb.z = nz; }
    if (it) Durability.wear(ch, it, w.wear * (head ? 1.2 : 1));
  },
  /** Shove (V): push nearby zombies back, no damage, costs stamina. */
  shove() {
    const ch = activeChar(), d = ch.d;
    if (d.needs.stamina < 12) { Toast.show(STR.tooTired, 'warn'); return; }
    d.needs.stamina -= 12;
    Scene.avatar.h.swing = 1;
    for (const z of Zombies.alive()) {
      const dist = Math.hypot(z.x - d.pos.x, z.z - d.pos.z);
      if (dist > 1.4) continue;
      const ang = Math.atan2(z.x - d.pos.x, z.z - d.pos.z);
      const nx = z.x + Math.sin(ang) * 1.3, nz = z.z + Math.cos(ang) * 1.3;
      if (Nav.walkable(0, nx, nz)) { z.x = nx; z.z = nz; }
      z.stagger = 1.1; z.state = z.state === 'attack' ? 'chase' : z.state;
    }
    Snd.play('thud');
  },
  zombieHits(zb, ch) {
    const d = ch.d;
    if (!d.alive) return;
    const evade = U.clamp(0.35 + ch.skill('fitness') * 0.02 - (ch.load() > 1 ? 0.15 : 0) - (d.sleeping ? 0.35 : 0), 0.05, 0.7);
    if (RNG.next('combat') < evade) { Snd.play('swish'); return; }
    const parts = ['armL', 'armR', 'armL', 'armR', 'torso', 'torso', 'legL', 'legR', 'head'];
    const part = parts[Math.floor(RNG.next('combat') * parts.length)];
    const dmg = U.range(() => RNG.next('combat'), zb.t.dmg[0], zb.t.dmg[1]);
    const bite = RNG.next('combat') < zb.t.bite;
    Health.damage(d, part, dmg, bite ? 'bite' : RNG.next('combat') < 0.5 ? 'scratch' : 'blunt');
    Snd.play('hurt');
    Bus.emit('player:hit', { part, dmg, bite });
  },
};

/** Weapon durability & repair (§7.2). it.cond = current/cap fraction of max; it.cap = remaining max fraction. */
const Durability = {
  wear(ch, it, base) {
    const d = itemDef(it.id);
    if (!d.dura) return;
    const loss = (base / d.dura) * difficultyOf(S.difficulty).wear * (1 - ch.skill('melee') * 0.04);
    it.cond = Math.max(0, (it.cond == null ? 1 : it.cond) - loss);
    if (it.cond <= 0) this.snap(ch, it);
  },
  state(it) { const c = it.cond == null ? 1 : it.cond; return c <= 0 ? 'broken' : c < 0.2 ? 'bad' : c < 0.5 ? 'cracked' : 'good'; },
  snap(ch, it) {
    const w = WEAPONS[it.id];
    const to = w && w.broken;
    ch.d.equip.weapon = null;
    logEvent(STR.weaponBroke(itemDef(it.id).name), 'bad');
    Bus.emit('toast', { kind: 'bad', msg: STR.weaponBroke(itemDef(it.id).name) });
    if (to && ITEMS[to]) {
      const n = Inv.makeItem(to, 1);
      if (WEAPONS[to]) ch.d.equip.weapon = n;
      else if (Inv.addToAny(ch.containers(), n) > 0) { const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true); Inv.add(pile.inv, n); Scene.syncPiles(); }
    }
    Scene.avatar.refreshGear();
  },
  /** Repair with the right materials; lowers the max-durability cap (taped bat is weaker). */
  repair(ch, it) {
    const w = WEAPONS[it.id], d = itemDef(it.id);
    const R = w && REPAIRS[w.mat];
    if (!R || !d.dura) return false;
    if ((it.cond == null ? 1 : it.cond) >= (it.cap == null ? 1 : it.cap) - 0.02) { Bus.emit('toast', { kind: 'info', msg: STR.noRepairNeeded }); return false; }
    const need = R.uses.find(([id]) => Health.findItem(ch, [id]));
    if (!need) { Bus.emit('toast', { kind: 'warn', msg: STR.repairNeeds(R.uses.map(([id]) => itemDef(id).name).join(' หรือ ')) }); return false; }
    Health.spend(Health.findItem(ch, [need[0]]));
    const skill = ch.skill('carpentry');
    const capLoss = R.capLoss * (1 - skill * 0.06) * (ch.hasTrait('handy') ? 0.75 : 1);
    it.cap = Math.max(0.2, (it.cap == null ? 1 : it.cap) - capLoss);
    it.cond = it.cap;
    it.repairs = (it.repairs || 0) + 1;
    GameClock.advance(Math.round(15 * (1 - skill * 0.05)));
    Skills.gain(ch, 'carpentry', 5);
    logEvent(STR.repaired(d.name, Math.round(it.cap * 100)), 'info');
    return true;
  },
};
