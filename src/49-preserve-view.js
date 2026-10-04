/* ==========================================================================
   49 · PRESERVATION VISUALS — drying tray, ferment jar, smoker props and
   the batch shown on each station (strips on the rack, contents in the jar,
   a smoke plume while the smoker burns).
   ========================================================================== */

Object.assign(PROPS, {
  'prop.drying_tray': (o) => {
    const pb = new PB(o.seed), w = Mat.tex('wood_floor', '#a8784a', 0.85);
    for (const x of [-0.47, 0.47]) for (const z of [-0.32, 0.32]) pb.box(0.05, 0.8, 0.05, w, x, 0, z);
    pb.box(1.0, 0.04, 0.05, w, 0, 0.78, -0.33); pb.box(1.0, 0.04, 0.05, w, 0, 0.78, 0.33);
    pb.box(0.05, 0.04, 0.7, w, -0.48, 0.78, 0); pb.box(0.05, 0.04, 0.7, w, 0.48, 0.78, 0);
    pb.box(0.94, 0.01, 0.62, Mat.get('traynet', () => new THREE.MeshStandardMaterial({ color: 0xd8d4c4, roughness: 0.9, transparent: true, opacity: 0.75, side: THREE.DoubleSide })), 0, 0.79, 0);
    return pb.build();
  },
  'prop.ferment_jar': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.15, 0.15, 0.34, Mat.get('jarglass', () => new THREE.MeshStandardMaterial({ color: 0xdff0f7, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false })), 0, 0, 0, 20);
    pb.cyl(0.1, 0.15, 0.05, Mat.get('jarglass', null), 0, 0.34, 0, 20);
    pb.cyl(0.105, 0.105, 0.04, Mat.color('#c9a46a', 0.6), 0, 0.39, 0, 20);
    return pb.build({ cast: false });
  },
  'prop.smoker': (o) => {
    const pb = new PB(o.seed), m = Mat.color('#3a3f44', 0.55, 0.6), w = Mat.tex('wood_floor', '#7a5a36', 0.85);
    for (const x of [-0.36, 0.36]) for (const z of [-0.31, 0.31]) pb.box(0.06, 0.35, 0.06, w, x, 0, z);
    pb.box(0.8, 0.8, 0.7, m, 0, 0.35, 0, 0.02);
    pb.box(0.6, 0.5, 0.02, Mat.color('#2a2e32', 0.5, 0.6), 0, 0.5, 0.36);
    pb.box(0.06, 0.06, 0.04, Mat.color('#c9a46a', 0.5), 0.22, 0.72, 0.38);
    pb.cyl(0.06, 0.06, 0.25, m, 0.25, 1.15, -0.2, 10);
    pb.box(0.7, 0.12, 0.6, Mat.color('#2b2018', 0.95), 0, 0.02, 0);   // fire box
    return pb.build();
  },
});
for (const id of ['prop.drying_tray', 'prop.ferment_jar', 'prop.smoker']) AssetRegistry.register(id, PROPS[id]);

const PreserveView = {
  sig: new Map(),
  colour(id) {
    const t = itemDef(id).tags || [];
    if (t.includes('fruit')) return '#d89a3a';
    if (t.includes('veg')) return '#7fa04a';
    if (t.includes('seafood') || t.includes('fish')) return '#b8b0a0';
    if (t.includes('egg')) return '#f2ead8';
    if (id.startsWith('chili') || id === 'dried_chili') return '#c4202a';
    return '#a4503a';
  },
  forget(uid) { this.sig.delete(uid); },
  attach(f) {
    const obj = Scene.W && Scene.W.furn.get(f.uid);
    if (!obj) return;
    const b = f.batch;
    const sig = b ? b.m + b.items.map((x) => x.id + x.n).join() + (b.done ? 'd' : '') + (Math.round(b.prog / b.need * 4)) : '-';
    const old = obj.getObjectByName('batch');
    if (old && this.sig.get(f.uid) === sig) return;
    if (old) { obj.remove(old); old.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
    this.sig.set(f.uid, sig);
    if (!b) return;
    const pb = new PB('batch' + f.uid), t = b.prog / b.need;
    const units = [];
    for (const x of b.items) for (let i = 0; i < x.n; i++) units.push(x.id);
    const darken = (hex) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#3a2414'), Math.min(0.55, t * 0.55)).getHexString();
    if (f.type === 'ferment_jar') {
      pb.cyl(0.13, 0.13, 0.26, Mat.color(darken(this.colour(units[0] || 'cabbage')), 0.8), 0, 0.02, 0, 16);
    } else if (f.type === 'smoker') {
      if (!b.done && Preserve.condition(f) === 'ok') for (let i = 0; i < 4; i++) pb.sphere(0.09 + i * 0.05, Mat.get('smokepuff', () => new THREE.MeshStandardMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0.35, depthWrite: false })), 0.25 + i * 0.05, 1.5 + i * 0.25, -0.2 - i * 0.03, 1, 0.8, 1, 8);
    } else {
      const y = f.type === 'drying_rack' ? 1.2 : 0.8, span = f.type === 'drying_rack' ? 1.3 : 0.8;
      units.slice(0, 8).forEach((id, i) => {
        const x = -span / 2 + (i + 0.5) * span / Math.min(8, units.length);
        pb.box(0.09, f.type === 'drying_rack' ? 0.22 : 0.015, f.type === 'drying_rack' ? 0.03 : 0.16, Mat.color(darken(this.colour(id)), 0.8), x, f.type === 'drying_rack' ? y - 0.22 : y, 0);
      });
    }
    if (!pb.parts.length) return;
    const g = pb.build({ cast: false }); g.name = 'batch'; obj.add(g);
  },
  init() {
    Bus.on('preserve:changed', (f) => { if (Scene.isHome()) this.attach(f); });
    GameClock.onHour(() => { if (Scene.W && Scene.isHome()) for (const f of Preserve.stations()) this.attach(f); });
  },
};
