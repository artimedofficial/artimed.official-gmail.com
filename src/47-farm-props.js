/* ==========================================================================
   47 · PHASE 2B VISUALS — planters, water drum, wooden shelf, crop growth
   meshes per plot, and rain (streaks, darker sky, lightning, rain audio).
   ========================================================================== */

const SOIL = () => Mat.tex('concrete', '#5a3f2a', 0.97, 0, 0.9);
Object.assign(PROPS, {
  'prop.plant_pot': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.21, 0.15, 0.34, Mat.color('#b8582e', 0.85), 0, 0, 0, 18);
    pb.cyl(0.225, 0.215, 0.04, Mat.color('#a24c28', 0.8), 0, 0.32, 0, 18);
    pb.cyl(0.19, 0.19, 0.02, SOIL(), 0, 0.31, 0, 16);
    return pb.build();
  },
  'prop.planter_box': (o) => {
    const pb = new PB(o.seed), w = Mat.tex('wood_floor', '#a8784a', 0.85);
    for (let i = 0; i < 3; i++) { pb.box(1.25, 0.14, 0.04, w, 0, 0.02 + i * 0.145, -0.23, 0.005); pb.box(1.25, 0.14, 0.04, w, 0, 0.02 + i * 0.145, 0.23, 0.005); }
    pb.box(0.04, 0.44, 0.5, w, -0.6, 0, 0); pb.box(0.04, 0.44, 0.5, w, 0.6, 0, 0);
    for (const x of [-0.58, 0.58]) for (const z of [-0.21, 0.21]) pb.box(0.06, 0.47, 0.06, Mat.tex('wood_floor', '#7a5a36', 0.85), x, 0, z);
    pb.box(1.16, 0.03, 0.42, SOIL(), 0, 0.4, 0);
    return pb.build();
  },
  'prop.garden_bed': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.2, 0.14, 2.4, SOIL(), 0, 0, 0, 0.06);
    for (const x of [-0.3, 0.3]) pb.box(0.32, 0.05, 2.25, Mat.tex('concrete', '#4a3322', 0.98, 0, 0.9), x, 0.13, 0, 0.02);
    for (let z = -1.15; z <= 1.16; z += 0.46) { pb.box(0.12, 0.1, 0.2, Mat.color('#9a4a32', 0.9), -0.64, 0, z, 0.01); pb.box(0.12, 0.1, 0.2, Mat.color('#9a4a32', 0.9), 0.64, 0, z, 0.01); }
    return pb.build();
  },
  'prop.water_drum': (o) => {
    const pb = new PB(o.seed), blue = Mat.color('#2f63a8', 0.55);
    pb.cyl(0.3, 0.29, 0.9, blue, 0, 0, 0, 22);
    for (const y of [0.22, 0.6]) pb.cyl(0.31, 0.31, 0.04, Mat.color('#2a5794', 0.5), 0, y, 0, 22);
    pb.cyl(0.24, 0.24, 0.025, Mat.color('#1f3f6a', 0.5), 0, 0.9, 0, 20);
    pb.cyl(0.16, 0.05, 0.12, Mat.color('#3a3f44', 0.6), 0, 0.915, 0, 14);   // funnel with mesh screen
    return pb.build();
  },
  'prop.wood_shelf': (o) => {
    const pb = new PB(o.seed), w = Mat.tex('wood_floor', '#b08654', 0.85), post = Mat.tex('wood_floor', '#7a5a36', 0.85);
    for (const x of [-0.57, 0.57]) for (const z of [-0.17, 0.17]) pb.box(0.06, 1.6, 0.06, post, x, 0, z);
    for (let i = 0; i < 4; i++) pb.box(1.2, 0.035, 0.4, w, 0, 0.12 + i * 0.47, 0);
    return pb.build();
  },
});
for (const id of ['prop.plant_pot', 'prop.planter_box', 'prop.garden_bed', 'prop.water_drum', 'prop.wood_shelf']) AssetRegistry.register(id, PROPS[id]);

/** Crop meshes on planters; rebuilt when a plot's stage changes. */
const FarmView = {
  sig: new Map(),
  spots(kind) {
    if (kind === 'pot') return [[0, 0.33, 0]];
    if (kind === 'box') return [[-0.4, 0.43, 0], [0, 0.43, 0], [0.4, 0.43, 0]];
    return [[-0.3, 0.18, -0.8], [0.3, 0.18, -0.8], [-0.3, 0.18, 0], [0.3, 0.18, 0], [-0.3, 0.18, 0.8], [0.3, 0.18, 0.8]];
  },
  forget(uid) { this.sig.delete(uid); },
  attach(f) {
    const obj = Scene.W && Scene.W.furn.get(f.uid);
    if (!obj || !f.farm) return;
    const sig = f.farm.plots.map((p) => p ? p.crop + Farm.stage(p) + (p.hp < 0.5 ? 'w' : '') : '-').join('|');
    const old = obj.getObjectByName('crops');
    if (old && this.sig.get(f.uid) === sig) return;
    if (old) { obj.remove(old); old.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
    this.sig.set(f.uid, sig);
    const pb = new PB('crops' + f.uid);
    let any = false;
    this.spots(Farm.kind(f)).forEach(([x, y, z], i) => { const p = f.farm.plots[i]; if (p) { any = true; this.plant(pb, p, x, y, z, i); } });
    if (!any) return;
    const g = pb.build({ cast: false });
    g.name = 'crops';
    obj.add(g);
  },
  plant(pb, p, x, y, z, i) {
    const C = CROPS[p.crop], st = Farm.stage(p), rng = U.makeRng(U.hashSeed(p.crop + i + p.at));
    const leafCol = new THREE.Color(st === 5 ? '#7a5a2a' : C.leaf);
    if (p.hp < 0.5 && st !== 5) leafCol.lerp(new THREE.Color('#b59a3a'), (0.5 - p.hp) * 1.6);
    const leaf = Mat.color('#' + leafCol.getHexString(), 0.75);
    if (st === 0) { pb.sphere(0.05, SOIL(), x, y + 0.01, z, 1, 0.4, 1, 8); return; }
    const scale = st === 1 ? 0.18 : st === 2 ? 0.55 : 1, h = C.h * scale * (st === 5 ? 0.5 : 1);
    const n = st === 1 ? 3 : st === 2 ? 6 : 10;
    pb.cyl(0.012, 0.018, h * 0.7, Mat.color('#4a6a2a', 0.8), x, y, z, 6);
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2, r = (0.03 + rng() * 0.09) * Math.max(scale, 0.4), yy = y + h * (0.25 + rng() * 0.75);
      pb.sphere(0.035 + 0.05 * scale, leaf, x + Math.cos(a) * r, yy, z + Math.sin(a) * r, 1.3, st === 5 ? 0.25 : 0.45, 0.9, 8);
    }
    if (st === 4 && C.fruit) {
      const fr = Mat.color(C.fruit, 0.45);
      const big = p.crop === 'pumpkin';
      for (let k = 0; k < (big ? 1 : 5); k++) {
        const a = rng() * Math.PI * 2, r = big ? 0.12 : 0.04 + rng() * 0.08;
        const elong = ['long_beans', 'cucumber', 'chili'].includes(p.crop);
        pb.sphere(big ? 0.11 : 0.022, fr, x + Math.cos(a) * r, big ? y + 0.09 : y + h * (0.3 + rng() * 0.5), z + Math.sin(a) * r, 1, elong ? 2.6 : 1, 1, 8);
      }
    } else if (st === 4) pb.sphere(0.07 * 1.3, Mat.color('#' + leafCol.clone().offsetHSL(0, 0.1, 0.08).getHexString(), 0.7), x, y + h * 0.9, z, 1.2, 0.5, 1.2, 10);
  },
  refreshAll() { if (Scene.W && Scene.isHome()) for (const f of S.home.furniture) if (f.farm) this.attach(f); },
  init() { Bus.on('farm:changed', (f) => { if (Scene.isHome()) this.attach(f); }); },
};

/** Rain streaks around the camera focus + weather-driven sky dimming, lightning and rain sound. */
const Rain = {
  mesh: null, n: 0, speed: 15, box: 26, top: 16, flashT: 0, nextBolt: 0, snd: null,
  build() {
    this.n = Render.q.key === 'low' ? 900 : Render.q.key === 'high' ? 3000 : 1800;
    const pos = new Float32Array(this.n * 6);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setDrawRange(0, 0);
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xd4e2ee, transparent: true, opacity: 0.55, depthWrite: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    for (let i = 0; i < this.n; i++) this.respawn(i, true);
    Render.scene.add(this.mesh);
  },
  covered(x, z) { return Scene.W && Scene.W.isIndoor(x, z, 0); },
  respawn(i, anyY) {
    const a = this.mesh.geometry.attributes.position.array, c = Render.cam;
    let x = 0, z = 0;
    for (let k = 0; k < 4; k++) { x = c.ctx + (Math.random() - 0.5) * this.box; z = c.ctz + (Math.random() - 0.5) * this.box; if (!this.covered(x, z)) break; }
    const y = anyY ? Math.random() * this.top : this.top + Math.random() * 3;
    const hide = this.covered(x, z) ? -50 : 0;
    a[i * 6] = x; a[i * 6 + 1] = y + hide; a[i * 6 + 2] = z;
    a[i * 6 + 3] = x + 0.04; a[i * 6 + 4] = y + hide + 0.85; a[i * 6 + 5] = z + 0.03;
  },
  update(dt) {
    if (!S || !Scene.W || !Render.scene) return;
    if (!this.mesh) this.build();
    const wx = Weather.now();
    const want = Math.min(this.n, Math.round(this.n * U.clamp(wx.mmh / 15, 0, 1) + (wx.mmh > 0.2 ? this.n * 0.12 : 0)));
    const g = this.mesh.geometry;
    g.setDrawRange(0, want * 2);
    this.mesh.visible = want > 0;
    if (want > 0) {
      const a = g.attributes.position.array, dy = this.speed * Math.min(dt, 0.05), c = Render.cam;
      for (let i = 0; i < want; i++) {
        a[i * 6 + 1] -= dy; a[i * 6 + 4] -= dy;
        if (a[i * 6 + 1] < -0.2 || Math.abs(a[i * 6] - c.ctx) > this.box / 2 + 2 || Math.abs(a[i * 6 + 2] - c.ctz) > this.box / 2 + 2) this.respawn(i, false);
      }
      g.attributes.position.needsUpdate = true;
      this.mesh.material.opacity = 0.35 + 0.35 * U.clamp(wx.mmh / 20, 0, 1);
    }
    // Weather dims the scene (applied after Render.updateDayNight each frame).
    const dim = wx.cloud * 0.55 + U.clamp(wx.mmh / 25, 0, 0.25);
    Render.sun.intensity *= 1 - dim;
    Render.hemi.intensity *= 1 - dim * 0.45;
    Render.scene.fog.density += dim * 0.012;
    const grey = new THREE.Color(0x5d6670);
    Render.skyMat.uniforms.top.value.lerp(grey, dim * 0.8);
    Render.skyMat.uniforms.horizon.value.lerp(grey, dim * 0.7);
    Render.scene.fog.color.lerp(grey, dim * 0.6);
    // Lightning during storms
    const now = performance.now() / 1000;
    if (wx.storm && !GameClock.paused()) {
      if (!this.nextBolt) this.nextBolt = now + 4 + Math.random() * 10;
      if (now > this.nextBolt) { this.flashT = 0.18; this.nextBolt = now + 6 + Math.random() * 14; this.thunder(0.6 + Math.random() * 2); }
    } else this.nextBolt = 0;
    if (this.flashT > 0) { this.flashT -= dt; Render.hemi.intensity += 2.5; Render.sun.intensity += 3; }
    this.sound(wx);
  },
  sound(wx) {
    if (!Snd.ok) return;
    const c = Snd.ctx;
    if (!this.snd) {
      const s = c.createBufferSource(); s.buffer = Snd.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.4;
      const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(Snd.ambBus); s.start();
      this.snd = g;
    }
    const d = S.chars[S.active], indoor = Scene.W.isIndoor(d.pos.x, d.pos.z, d.pos.floor);
    const v = U.clamp(wx.mmh / 15, 0, 1) * (indoor ? 0.07 : 0.16) + (wx.mmh > 0.2 ? 0.02 : 0);
    this.snd.gain.setTargetAtTime(v, c.currentTime, 0.8);
  },
  thunder(delay) {
    if (!Snd.ok) return;
    Snd._out = Snd.sfxBus;
    Snd.noise(2.6, 'lowpass', 160, 0.7, 0.55, delay, 60);
    Snd.noise(0.4, 'lowpass', 900, 0.8, 0.25, delay);
  },
};
