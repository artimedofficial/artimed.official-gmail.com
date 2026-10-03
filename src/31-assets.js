/* ==========================================================================
   31 · ASSET REGISTRY + PROCEDURAL PROP LIBRARY (§2.4, §2.5)
   AssetRegistry.create(assetId, opts) → THREE.Object3D. Any id can be overridden
   with a glTF/GLB via ASSET_OVERRIDES without touching game logic.
   Prop convention: origin at floor centre, front faces +Z, size in metres.
   ========================================================================== */

const AssetRegistry = {
  factories: new Map(),
  gltfCache: new Map(),
  register(id, factory) { this.factories.set(id, factory); },
  has(id) { return this.factories.has(id); },
  list() { return [...this.factories.keys()].sort(); },
  create(id, opts = {}) {
    const ov = ASSET_OVERRIDES[id];
    if (ov && /\.(glb|gltf)(\?|$)|^data:model\//i.test(ov)) return this.fromGLTF(id, ov, opts);
    const f = this.factories.get(id);
    if (!f) { console.warn('[Assets] missing', id); return PB.missing(); }
    return f(opts);
  },
  /** Loads a glTF into a holder; shows the procedural version until it arrives. */
  fromGLTF(id, url, opts) {
    const holder = new THREE.Group();
    const fallback = this.factories.get(id);
    if (fallback) holder.add(fallback(opts));
    const apply = (scene) => {
      const clone = scene.clone(true);
      clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      holder.clear(); holder.add(clone);
    };
    if (this.gltfCache.has(url)) { const c = this.gltfCache.get(url); if (c.scene) apply(c.scene); else c.wait.push(apply); return holder; }
    const entry = { scene: null, wait: [apply] };
    this.gltfCache.set(url, entry);
    new THREE.GLTFLoader().load(url, (g) => { entry.scene = g.scene; entry.wait.forEach((fn) => fn(g.scene)); entry.wait = []; },
      undefined, (e) => console.warn('[Assets] glTF override failed for', id, e));
    return holder;
  },
};

/** Prop builder: collects primitives, then merges per material to keep draw calls low. */
class PB {
  constructor(seed) { this.parts = []; this.rng = U.makeRng(U.hashSeed(String(seed || 'pb'))); this.extras = []; }
  _add(geo, mat, x, y, z, rot) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    if (rot) q.setFromEuler(new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0));
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
    this.parts.push({ geo, mat, m });
    return this;
  }
  /** Box sitting with its bottom at y. r = corner radius (0 for sharp). */
  box(w, h, d, mat, x = 0, y = 0, z = 0, r = 0, rot) {
    const geo = r > 0 ? new THREE.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
    return this._add(geo, mat, x, y + h / 2, z, rot);
  }
  cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 16, rot) {
    return this._add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z, rot);
  }
  sphere(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 12) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.75 | 0));
    g.scale(sx, sy, sz);
    return this._add(g, mat, x, y, z);
  }
  /** Arbitrary geometry (already centred as desired). */
  geo(g, mat, x = 0, y = 0, z = 0, rot) { return this._add(g, mat, x, y, z, rot); }
  /** Non-merged child (lights, animated parts). */
  extra(obj) { this.extras.push(obj); return this; }
  /** uvTile: metres per texture tile for world-projected UVs on textured parts (0 = keep native UVs). */
  build({ cast = true, receive = true, uvTile = 1.2 } = {}) {
    const byMat = new Map();
    for (const p of this.parts) {
      let g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
      if (g === p.geo) g = g.clone();
      g.applyMatrix4(p.m);
      if (uvTile && p.mat.map) worldUV(g, uvTile);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!byMat.has(p.mat)) byMat.set(p.mat, []);
      byMat.get(p.mat).push(g);
    }
    const grp = new THREE.Group();
    for (const [mat, list] of byMat) {
      const merged = list.length === 1 ? list[0] : THREE.BufferGeometryUtils.mergeGeometries(list, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = cast && !mat.transparent; mesh.receiveShadow = receive;
      grp.add(mesh);
    }
    for (const e of this.extras) grp.add(e);
    return grp;
  }
  static missing() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), Mat.color('#ff00ff')));
    return g;
  }
}

/* ---------- Common materials ---------- */
const M = {
  wood: () => Mat.tex('wood_floor', '#c8a07a', 0.65),
  darkWood: () => Mat.tex('wood_floor', '#6b4a32', 0.6),
  lightWood: () => Mat.tex('wood_floor', '#e9d2b0', 0.7),
  white: () => Mat.color('#e9e6df', 0.55),
  offWhite: () => Mat.color('#d8d2c4', 0.6),
  steel: () => Mat.tex('metal', '#c9cdd1', 0.38, 0.85),
  darkMetal: () => Mat.color('#2e3236', 0.5, 0.6),
  black: () => Mat.color('#1b1c1e', 0.5),
  plastic: (c) => Mat.color(c, 0.45),
  fabric: (c) => Mat.tex('fabric', c, 0.95, 0, 0.4),
  ceramic: () => Mat.color('#f2f1ec', 0.2),
  chrome: () => Mat.color('#d9dde1', 0.18, 1),
  leaf: () => Mat.tex('leaves', '#ffffff', 0.85),
  bark: () => Mat.tex('bark', '#ffffff', 0.95),
  soil: () => Mat.color('#3b2c1f', 1),
  terracotta: () => Mat.color('#b0603e', 0.85),
};

/** Random colourful stack of books / boxes / jars for shelf dressing. */
function dressShelf(pb, x0, x1, y, z, depth, kind = 'books') {
  const rng = pb.rng;
  let x = x0 + 0.02;
  const bookCols = ['#7a2e2a', '#2e4a6b', '#c49a3a', '#3f6b3a', '#d8cfc0', '#5b3b6b', '#2b2b2b', '#a8582a'];
  const boxCols = ['#b88a5a', '#c9a77a', '#8a6a4a', '#e0d4bf'];
  while (x < x1 - 0.05) {
    if (rng() < 0.12) { x += 0.08 + rng() * 0.15; continue; }
    if (kind === 'books') {
      const w = 0.025 + rng() * 0.035, h = 0.18 + rng() * 0.12;
      pb.box(w, h, depth * (0.7 + rng() * 0.2), Mat.color(U.pick(rng, bookCols), 0.8), x + w / 2, y, z);
      x += w + 0.003;
    } else if (kind === 'boxes') {
      const w = 0.2 + rng() * 0.25, h = 0.12 + rng() * 0.22;
      pb.box(w, h, depth * 0.85, Mat.color(U.pick(rng, boxCols), 0.9), x + w / 2, y, z, 0.01);
      x += w + 0.02;
    } else { // jars & bottles
      const r = 0.035 + rng() * 0.03, h = 0.12 + rng() * 0.16;
      pb.cyl(r, r, h, Mat.color(U.pick(rng, ['#d8c9a0', '#9a3a2a', '#e2b84a', '#3a6a3a', '#f0eee8']), 0.4), x + r, y, z - depth * 0.1, 10);
      x += r * 2 + 0.02;
    }
  }
}

/* ---------- Furniture factories ---------- */
const PROPS = {
  'prop.sofa': (o) => {
    const pb = new PB(o.seed); const f = M.fabric('#6e7b8a');
    pb.box(2.2, 0.42, 0.9, f, 0, 0.08, 0, 0.06);
    pb.box(2.2, 0.5, 0.22, f, 0, 0.4, -0.34, 0.08);
    pb.box(0.2, 0.28, 0.9, f, -1.0, 0.45, 0, 0.07); pb.box(0.2, 0.28, 0.9, f, 1.0, 0.45, 0, 0.07);
    pb.box(0.88, 0.14, 0.62, M.fabric('#7a8898'), -0.46, 0.5, 0.08, 0.06); pb.box(0.88, 0.14, 0.62, M.fabric('#7a8898'), 0.46, 0.5, 0.08, 0.06);
    pb.box(0.4, 0.36, 0.12, M.fabric('#c9a24a'), -0.7, 0.62, -0.18, 0.06, [0.3, 0, 0.1]);
    for (const x of [-1.0, 1.0]) for (const z of [-0.36, 0.36]) pb.cyl(0.025, 0.02, 0.08, M.darkWood(), x, 0, z, 6);
    return pb.build();
  },
  'prop.armchair': (o) => {
    const pb = new PB(o.seed); const f = M.fabric('#8a5a3a');
    pb.box(0.9, 0.4, 0.85, f, 0, 0.08, 0, 0.06); pb.box(0.9, 0.5, 0.2, f, 0, 0.4, -0.32, 0.07);
    pb.box(0.16, 0.25, 0.85, f, -0.37, 0.45, 0, 0.06); pb.box(0.16, 0.25, 0.85, f, 0.37, 0.45, 0, 0.06);
    return pb.build();
  },
  'prop.tv_cabinet': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.8, 0.5, 0.45, M.darkWood(), 0, 0.05, 0, 0.01);
    pb.box(0.86, 0.36, 0.01, M.wood(), -0.44, 0.12, 0.226); pb.box(0.86, 0.36, 0.01, M.wood(), 0.44, 0.12, 0.226);
    pb.box(0.04, 0.02, 0.02, M.chrome(), -0.1, 0.3, 0.235); pb.box(0.04, 0.02, 0.02, M.chrome(), 0.1, 0.3, 0.235);
    pb.box(1.25, 0.72, 0.05, M.black(), 0, 0.58, -0.05, 0.01); // TV
    pb.box(1.18, 0.65, 0.01, Mat.color('#0d1218', 0.15, 0.2), 0, 0.615, -0.022);
    pb.box(0.3, 0.02, 0.18, M.black(), 0, 0.55, -0.05);
    pb.box(0.18, 0.06, 0.12, Mat.color('#3a3a3a', 0.6), 0.65, 0.55, 0.05); // router
    pb.cyl(0.07, 0.06, 0.14, M.terracotta(), -0.75, 0.55, 0.05, 10);
    pb.sphere(0.11, M.leaf(), -0.75, 0.76, 0.05, 1, 0.8, 1, 8);
    return pb.build();
  },
  'prop.bookshelf': (o) => {
    const pb = new PB(o.seed); const w = M.wood();
    pb.box(1.2, 1.9, 0.03, w, 0, 0, -0.16); pb.box(0.03, 1.9, 0.35, w, -0.585, 0, 0); pb.box(0.03, 1.9, 0.35, w, 0.585, 0, 0);
    for (let i = 0; i < 5; i++) pb.box(1.14, 0.025, 0.33, w, 0, 0.05 + i * 0.45, 0);
    pb.box(1.2, 0.025, 0.35, w, 0, 1.875, 0);
    for (let i = 0; i < 4; i++) dressShelf(pb, -0.56, 0.56, 0.075 + i * 0.45, 0, 0.3, i === 2 ? 'boxes' : 'books');
    return pb.build();
  },
  'prop.coffee_table': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.1, 0.04, 0.6, M.darkWood(), 0, 0.38, 0, 0.01);
    pb.box(1.0, 0.02, 0.5, M.darkWood(), 0, 0.1, 0);
    for (const x of [-0.5, 0.5]) for (const z of [-0.25, 0.25]) pb.box(0.04, 0.38, 0.04, M.darkWood(), x, 0, z);
    pb.box(0.3, 0.015, 0.22, Mat.color('#e8e2d0', 0.9), -0.2, 0.42, 0.05, 0, [0, 0.3, 0]); // magazine
    pb.cyl(0.04, 0.035, 0.09, M.ceramic(), 0.3, 0.42, -0.1, 10); // mug
    pb.box(0.16, 0.02, 0.05, M.black(), 0.1, 0.42, 0.15, 0, [0, -0.4, 0]); // remote
    return pb.build();
  },
  'prop.rug': (o) => {
    const pb = new PB(o.seed);
    const g = new THREE.PlaneGeometry(2.6, 1.8); g.rotateX(-Math.PI / 2);
    pb.geo(g, Mat.tex('rug', '#ffffff', 1, 0, 0.5), 0, 0.006, 0);
    return pb.build({ cast: false, uvTile: 0 });
  },
  'prop.floor_lamp': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.16, 0.18, 0.03, M.darkMetal(), 0, 0, 0, 16);
    pb.cyl(0.015, 0.015, 1.35, M.darkMetal(), 0, 0.03, 0, 8);
    pb.cyl(0.14, 0.22, 0.28, Mat.color('#f0dcb0', 0.9, 0, { emissive: new THREE.Color('#ffb46b'), emissiveIntensity: 0.0, side: THREE.DoubleSide }), 0, 1.3, 0, 18);
    return pb.build();
  },
  'prop.plant': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.2, 0.15, 0.32, M.terracotta(), 0, 0, 0, 14);
    pb.cyl(0.19, 0.19, 0.02, M.soil(), 0, 0.3, 0, 14);
    const rng = pb.rng;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rng(), r = 0.08 + rng() * 0.1, h = 0.55 + rng() * 0.4;
      const leaf = new THREE.SphereGeometry(0.16, 8, 6); leaf.scale(0.5, 1.4, 0.25);
      pb.geo(leaf, M.leaf(), Math.cos(a) * r, 0.3 + h * 0.6, Math.sin(a) * r, [Math.sin(a) * 0.5, a, Math.cos(a) * 0.5]);
    }
    return pb.build();
  },
  'prop.fan': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.18, 0.2, 0.05, Mat.color('#e9e6df', 0.5), 0, 0, 0, 16);
    pb.cyl(0.02, 0.025, 0.85, Mat.color('#d7d3ca', 0.5), 0, 0.05, 0, 8);
    pb.cyl(0.07, 0.07, 0.14, Mat.color('#d7d3ca', 0.5), 0, 0.92, -0.04, 12, [Math.PI / 2, 0, 0]);
    const cage = new THREE.TorusGeometry(0.21, 0.008, 6, 24);
    pb.geo(cage, Mat.color('#cfd3d6', 0.4, 0.6), 0, 0.99, 0.05);
    pb.cyl(0.21, 0.21, 0.01, Mat.color('#5fa2c9', 0.4, 0, { transparent: true, opacity: 0.55 }), 0, 0.99, 0.05, 20, [Math.PI / 2, 0, 0]);
    return pb.build();
  },
  'prop.counter': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.6, 0.82, 0.58, M.offWhite(), 0, 0.06, -0.01, 0.01);
    pb.box(1.62, 0.04, 0.62, Mat.color('#3a3836', 0.35), 0, 0.86, 0, 0.005); // stone top
    pb.box(1.6, 0.06, 0.5, M.black(), 0, 0, -0.04);
    for (const x of [-0.4, 0.4]) { pb.box(0.78, 0.74, 0.01, Mat.color('#cfc6b4', 0.5), x, 0.1, 0.29); pb.box(0.12, 0.015, 0.02, M.chrome(), x, 0.75, 0.3); }
    const rng = pb.rng;
    if (rng() < 0.7) pb.box(0.36, 0.02, 0.26, Mat.color('#8a5a32', 0.7), -0.4, 0.9, 0); // cutting board
    if (rng() < 0.8) { pb.cyl(0.05, 0.05, 0.24, Mat.color('#7a4a1a', 0.3), 0.55, 0.9, -0.15, 10); pb.cyl(0.04, 0.04, 0.2, Mat.color('#e8c34a', 0.3), 0.65, 0.9, -0.2, 10); }
    return pb.build();
  },
  'prop.sink_counter': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.2, 0.82, 0.58, M.offWhite(), 0, 0.06, -0.01, 0.01);
    pb.box(1.22, 0.04, 0.62, Mat.color('#3a3836', 0.35), 0, 0.86, 0);
    pb.box(0.6, 0.02, 0.42, M.steel(), 0, 0.885, 0.02);
    pb.box(0.54, 0.01, 0.36, Mat.color('#5b6064', 0.3, 0.8), 0, 0.89, 0.02);
    pb.cyl(0.015, 0.015, 0.28, M.chrome(), 0, 0.9, -0.22, 8);
    pb.cyl(0.012, 0.012, 0.18, M.chrome(), 0, 1.16, -0.14, 8, [Math.PI / 2, 0, 0]);
    pb.box(0.56, 0.74, 0.01, Mat.color('#cfc6b4', 0.5), 0, 0.1, 0.29);
    pb.box(0.2, 0.06, 0.12, Mat.color('#e8dcc8', 0.6), 0.45, 0.9, 0.05); // dish rack
    return pb.build();
  },
  'prop.stove': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.8, 0.82, 0.58, M.offWhite(), 0, 0.06, -0.01, 0.01);
    pb.box(0.82, 0.04, 0.62, Mat.color('#3a3836', 0.35), 0, 0.86, 0);
    pb.box(0.7, 0.08, 0.45, Mat.color('#1e1f21', 0.35, 0.4), 0, 0.9, 0);
    for (const x of [-0.18, 0.18]) {
      pb.geo(new THREE.TorusGeometry(0.08, 0.012, 6, 16).rotateX(Math.PI / 2), Mat.color('#333', 0.4, 0.8), x, 0.99, 0);
      pb.cyl(0.035, 0.035, 0.02, Mat.color('#555', 0.4, 0.8), x, 0.98, 0, 10);
      pb.cyl(0.02, 0.02, 0.03, Mat.color('#ddd', 0.4), x, 0.93, 0.235, 8, [Math.PI / 2, 0, 0]);
    }
    pb.cyl(0.15, 0.13, 0.06, M.black(), 0.18, 1.0, 0, 18); // pan
    pb.cyl(0.12, 0.11, 0.17, M.steel(), -0.18, 1.0, 0, 16); // pot
    return pb.build();
  },
  'prop.fridge': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.75, 1.8, 0.7, Mat.color('#c9ced2', 0.32, 0.5), 0, 0, 0, 0.04);
    pb.box(0.73, 0.005, 0.02, Mat.color('#555a5e', 0.4), 0, 1.25, 0.351);
    pb.box(0.025, 0.25, 0.03, Mat.color('#e5e8ea', 0.25, 0.9), -0.3, 1.32, 0.37);
    pb.box(0.025, 0.4, 0.03, Mat.color('#e5e8ea', 0.25, 0.9), -0.3, 0.75, 0.37);
    const rng = pb.rng;
    for (let i = 0; i < 4; i++) pb.box(0.06 + rng() * 0.05, 0.05 + rng() * 0.06, 0.01, Mat.color(U.pick(rng, ['#d63c2b', '#f2c230', '#3a8a3a', '#2f63a8']), 0.6), -0.1 + rng() * 0.3, 1.35 + rng() * 0.3, 0.352);
    pb.box(0.12, 0.16, 0.005, Mat.color('#f6f2e6', 0.9), 0.15, 0.9, 0.353); // note
    return pb.build();
  },
  'prop.pantry': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.0, 2.0, 0.5, M.lightWood(), 0, 0, 0, 0.01);
    pb.box(0.48, 1.9, 0.01, Mat.color('#e3d6be', 0.55), -0.25, 0.05, 0.252); pb.box(0.48, 1.9, 0.01, Mat.color('#e3d6be', 0.55), 0.25, 0.05, 0.252);
    pb.box(0.02, 0.18, 0.02, M.chrome(), -0.03, 0.95, 0.27); pb.box(0.02, 0.18, 0.02, M.chrome(), 0.03, 0.95, 0.27);
    return pb.build();
  },
  'prop.dining_table': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.4, 0.05, 0.85, M.wood(), 0, 0.7, 0, 0.01);
    for (const x of [-0.62, 0.62]) for (const z of [-0.36, 0.36]) pb.box(0.05, 0.7, 0.05, M.wood(), x, 0, z);
    pb.box(1.2, 0.005, 0.32, Mat.color('#c9b48a', 0.95), 0, 0.752, 0); // runner
    pb.cyl(0.11, 0.08, 0.07, M.ceramic(), 0.1, 0.75, 0, 16); // bowl
    pb.cyl(0.04, 0.04, 0.12, Mat.color('#bfe3f5', 0.1, 0, { transparent: true, opacity: 0.6 }), -0.3, 0.75, 0.1, 10);
    return pb.build();
  },
  'prop.microwave': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.5, 0.3, 0.38, Mat.color('#2b2d2f', 0.4, 0.3), 0, 0, 0, 0.015);
    pb.box(0.33, 0.22, 0.01, Mat.color('#0e1012', 0.1, 0.3), -0.06, 0.04, 0.191);
    pb.box(0.08, 0.04, 0.01, Mat.emissive('#3aff8a', 0.6), 0.17, 0.2, 0.192);
    return pb.build();
  },
  'prop.metal_shelf': (o) => {
    const pb = new PB(o.seed); const m = Mat.color('#6f7a80', 0.45, 0.7);
    for (const x of [-0.72, 0.72]) for (const z of [-0.22, 0.22]) pb.box(0.035, 1.8, 0.035, m, x, 0, z);
    for (const y of [0.1, 0.9, 1.7]) pb.box(1.5, 0.025, 0.5, m, 0, y, 0);
    dressShelf(pb, -0.7, 0.7, 0.125, 0, 0.4, 'boxes');
    dressShelf(pb, -0.7, 0.7, 0.925, 0, 0.4, 'jars');
    pb.box(0.3, 0.2, 0.3, Mat.color('#c43c2c', 0.5), -0.4, 1.725, 0, 0.02); // toolbox
    return pb.build();
  },
  'prop.big_rack': (o) => {
    const pb = new PB(o.seed); const m = Mat.color('#2f5f8a', 0.5, 0.5), deck = Mat.color('#b88a5a', 0.9);
    for (const x of [-1.07, 1.07]) for (const z of [-0.27, 0.27]) pb.box(0.06, 2.1, 0.06, m, x, 0, z);
    for (const y of [0.12, 0.8, 1.45, 2.05]) { pb.box(2.2, 0.06, 0.06, Mat.color('#e07a2a', 0.5, 0.4), 0, y, 0.27); pb.box(2.14, 0.03, 0.56, deck, 0, y + 0.03, 0); }
    dressShelf(pb, -1.0, 1.0, 0.18, 0, 0.5, 'boxes');
    dressShelf(pb, -1.0, 1.0, 0.86, 0, 0.5, 'boxes');
    return pb.build();
  },
  'prop.crate': (o) => {
    const pb = new PB(o.seed); const w = Mat.tex('wood_floor', '#b98d5a', 0.85);
    for (let i = 0; i < 4; i++) pb.box(0.6, 0.12, 0.6, w, 0, 0.02 + i * 0.13, 0, 0.005);
    for (const x of [-0.28, 0.28]) for (const z of [-0.28, 0.28]) pb.box(0.05, 0.55, 0.05, Mat.tex('wood_floor', '#8a6a42', 0.85), x, 0, z);
    return pb.build();
  },
  'prop.cabinet_small': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.8, 0.85, 0.45, M.wood(), 0, 0, 0, 0.01);
    for (const y of [0.1, 0.38, 0.62]) { pb.box(0.74, 0.22, 0.01, M.lightWood(), 0, y, 0.226); pb.box(0.1, 0.015, 0.02, M.chrome(), 0, y + 0.15, 0.24); }
    pb.cyl(0.05, 0.09, 0.03, Mat.color('#c9a24a', 0.4, 0.6), 0.25, 0.85, 0, 12); // lamp base
    pb.cyl(0.1, 0.13, 0.15, Mat.color('#efe0c0', 0.9), 0.25, 1.0, 0, 14);
    return pb.build();
  },
  'prop.wardrobe': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.4, 2.0, 0.6, M.darkWood(), 0, 0, 0, 0.015);
    pb.box(0.68, 1.85, 0.01, M.wood(), -0.35, 0.08, 0.302); pb.box(0.68, 1.85, 0.01, M.wood(), 0.35, 0.08, 0.302);
    pb.box(0.02, 0.3, 0.02, M.chrome(), -0.04, 0.95, 0.32); pb.box(0.02, 0.3, 0.02, M.chrome(), 0.04, 0.95, 0.32);
    pb.box(0.5, 0.25, 0.4, Mat.color('#b88a5a', 0.9), 0.3, 2.0, 0, 0.02);
    return pb.build();
  },
  'prop.dresser': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.0, 0.8, 0.45, M.lightWood(), 0, 0, 0, 0.01);
    pb.box(0.6, 0.75, 0.02, Mat.color('#b9c8d2', 0.05, 0.9), 0, 0.8, -0.18); // mirror
    pb.box(0.66, 0.81, 0.03, M.lightWood(), 0, 0.77, -0.2);
    for (let i = 0; i < 5; i++) pb.cyl(0.02, 0.02, 0.06 + pb.rng() * 0.08, Mat.color(U.pick(pb.rng, ['#d68ab0', '#f2f2f2', '#c9a24a', '#6a9ac4']), 0.3), -0.35 + i * 0.12, 0.8, 0.05, 8);
    return pb.build();
  },
  'prop.bed_double': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.7, 0.28, 2.1, M.darkWood(), 0, 0.05, 0, 0.02);
    pb.box(1.75, 0.95, 0.08, M.darkWood(), 0, 0, -1.04, 0.03);
    pb.box(1.62, 0.2, 2.0, Mat.color('#f1ece2', 0.9), 0, 0.33, 0.02, 0.06);
    pb.box(1.66, 0.08, 1.4, M.fabric('#5a7a9a'), 0, 0.5, 0.33, 0.04);
    pb.box(0.6, 0.12, 0.38, M.fabric('#f4f0e6'), -0.4, 0.55, -0.75, 0.06); pb.box(0.6, 0.12, 0.38, M.fabric('#f4f0e6'), 0.4, 0.55, -0.75, 0.06);
    return pb.build();
  },
  'prop.bed_single': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.0, 0.26, 2.0, Mat.color('#d9d4ca', 0.6, 0.3), 0, 0.05, 0, 0.01);
    pb.box(1.0, 0.7, 0.05, Mat.color('#d9d4ca', 0.6, 0.3), 0, 0, -0.98);
    pb.box(0.94, 0.18, 1.92, Mat.color('#f1ece2', 0.9), 0, 0.31, 0, 0.05);
    pb.box(0.98, 0.07, 1.2, M.fabric('#c9734a'), 0, 0.46, 0.35, 0.03);
    pb.box(0.55, 0.11, 0.35, M.fabric('#f4f0e6'), 0, 0.5, -0.72, 0.05);
    return pb.build();
  },
  'prop.desk': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.2, 0.04, 0.6, M.lightWood(), 0, 0.72, 0);
    pb.box(0.4, 0.7, 0.56, M.lightWood(), 0.38, 0.02, 0); pb.box(0.04, 0.72, 0.56, M.lightWood(), -0.58, 0, 0);
    pb.box(0.45, 0.3, 0.02, M.black(), -0.1, 0.76, -0.18); pb.box(0.15, 0.02, 0.15, M.black(), -0.1, 0.76, -0.12);
    pb.box(0.42, 0.27, 0.005, Mat.color('#1a2a3a', 0.2), -0.1, 0.775, -0.168);
    pb.box(0.3, 0.01, 0.22, Mat.color('#f3efe6', 0.9), 0.3, 0.765, 0.1, 0, [0, 0.2, 0]);
    pb.box(0.28, 0.01, 0.2, Mat.color('#ece6d8', 0.9), 0.32, 0.775, 0.08, 0, [0, -0.15, 0]);
    pb.cyl(0.035, 0.035, 0.1, Mat.color('#2f63a8', 0.4), 0.48, 0.76, -0.2, 8);
    return pb.build();
  },
  'prop.chair': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.44, 0.04, 0.42, M.wood(), 0, 0.44, 0);
    for (const x of [-0.19, 0.19]) for (const z of [-0.18, 0.18]) pb.box(0.035, 0.44, 0.035, M.wood(), x, 0, z);
    pb.box(0.44, 0.42, 0.03, M.wood(), 0, 0.48, -0.2);
    return pb.build();
  },
  'prop.toilet': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.13, 0.16, 0.38, M.ceramic(), 0, 0, 0.08, 16);
    pb.sphere(0.2, M.ceramic(), 0, 0.4, 0.12, 0.95, 0.25, 1.2, 16);
    pb.box(0.4, 0.38, 0.17, M.ceramic(), 0, 0.37, -0.25, 0.04);
    pb.box(0.06, 0.02, 0.02, M.chrome(), 0.12, 0.7, -0.16);
    pb.cyl(0.015, 0.015, 0.3, M.chrome(), 0.27, 0.45, -0.05, 6, [0, 0, 0.3]); // bidet spray (Thai)
    return pb.build();
  },
  'prop.basin': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.07, 0.09, 0.7, M.ceramic(), 0, 0, -0.05, 12);
    pb.box(0.55, 0.15, 0.45, M.ceramic(), 0, 0.7, 0, 0.05);
    pb.box(0.4, 0.55, 0.02, Mat.color('#c4d3dc', 0.04, 0.95), 0, 1.1, -0.2);
    pb.cyl(0.012, 0.012, 0.15, M.chrome(), 0, 0.85, -0.15, 8);
    return pb.build();
  },
  'prop.water_jar': (o) => {
    const pb = new PB(o.seed);
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.22 + Math.sin(t * Math.PI) * 0.15 - t * 0.05, t * 0.78)); }
    pb.geo(new THREE.LatheGeometry(pts, 20), Mat.color('#5a3a22', 0.35), 0, 0, 0);
    pb.cyl(0.25, 0.25, 0.02, Mat.color('#1e3a4a', 0.05, 0.2), 0, 0.73, 0, 18);
    pb.cyl(0.08, 0.06, 0.08, Mat.color('#2f8ac4', 0.4), 0.15, 0.78, 0.05, 10); // dipper
    return pb.build();
  },
  'prop.shower': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.9, 0.06, 0.9, Mat.tex('bathtile', '#ffffff', 0.3), 0, 0, 0);
    pb.cyl(0.012, 0.012, 1.9, M.chrome(), 0.35, 0, -0.42, 8);
    pb.cyl(0.07, 0.05, 0.03, M.chrome(), 0.25, 1.9, -0.35, 12);
    pb.box(0.02, 1.8, 0.9, Mat.color('#cfe4ec', 0.05, 0, { transparent: true, opacity: 0.22, depthWrite: false }), -0.44, 0.05, 0);
    return pb.build();
  },
  'prop.washer': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.6, 0.85, 0.6, Mat.color('#eef0f0', 0.35), 0, 0, 0, 0.03);
    pb.geo(new THREE.TorusGeometry(0.17, 0.03, 8, 24), Mat.color('#b9bec2', 0.3, 0.7), 0, 0.42, 0.3);
    pb.cyl(0.15, 0.15, 0.01, Mat.color('#3a4a5a', 0.05, 0.2, { transparent: true, opacity: 0.7 }), 0, 0.42, 0.3, 20, [Math.PI / 2, 0, 0]);
    pb.box(0.56, 0.1, 0.02, Mat.color('#d6dadb', 0.4), 0, 0.72, 0.3);
    return pb.build();
  },
  'prop.shoe_cabinet': (o) => {
    const pb = new PB(o.seed);
    pb.box(0.9, 0.9, 0.35, M.wood(), 0, 0, 0, 0.01);
    pb.box(0.42, 0.8, 0.01, M.lightWood(), -0.22, 0.05, 0.176); pb.box(0.42, 0.8, 0.01, M.lightWood(), 0.22, 0.05, 0.176);
    pb.box(0.28, 0.1, 0.12, Mat.color('#3a3a3a', 0.6), -0.2, 0, 0.32); pb.box(0.28, 0.1, 0.12, Mat.color('#3a3a3a', 0.6), 0.15, 0, 0.32, 0, [0, 0.3, 0]); // slippers
    pb.box(0.14, 0.04, 0.08, Mat.color('#c9a24a', 0.4, 0.6), 0.2, 0.9, 0.05); // keys tray
    return pb.build();
  },
  'prop.boxes': (o) => {
    const pb = new PB(o.seed); const c = Mat.color('#b88a5a', 0.95), c2 = Mat.color('#c9a77a', 0.95), tape = Mat.color('#d6c08a', 0.6);
    pb.box(0.55, 0.42, 0.45, c, -0.15, 0, 0.05, 0.01); pb.box(0.56, 0.01, 0.06, tape, -0.15, 0.42, 0.05);
    pb.box(0.4, 0.35, 0.36, c2, 0.22, 0, -0.08, 0.01, [0, 0.2, 0]);
    pb.box(0.42, 0.3, 0.38, c2, -0.1, 0.42, 0.0, 0.01, [0, -0.25, 0]); pb.box(0.43, 0.01, 0.06, tape, -0.1, 0.72, 0.0, 0, [0, -0.25, 0]);
    return pb.build();
  },
  'prop.workbench': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.6, 0.06, 0.7, Mat.tex('wood_floor', '#a87a4a', 0.8), 0, 0.84, 0);
    for (const x of [-0.75, 0.75]) for (const z of [-0.3, 0.3]) pb.box(0.07, 0.84, 0.07, Mat.color('#6f7a80', 0.5, 0.6), x, 0, z);
    pb.box(1.5, 0.03, 0.6, Mat.tex('wood_floor', '#8a6a42', 0.85), 0, 0.2, 0);
    pb.box(1.6, 0.9, 0.03, Mat.color('#c9b48a', 0.9), 0, 0.9, -0.34); // pegboard
    const rng = pb.rng;
    for (let i = 0; i < 7; i++) pb.box(0.03 + rng() * 0.05, 0.15 + rng() * 0.2, 0.02, Mat.color(U.pick(rng, ['#c43c2c', '#2b2b2b', '#e0b23c', '#9aa4ad']), 0.4, 0.4), -0.65 + i * 0.2, 1.2 + rng() * 0.3, -0.31);
    pb.box(0.25, 0.12, 0.15, Mat.color('#2f63a8', 0.5), 0.4, 0.9, 0.1); // vise
    pb.box(0.35, 0.18, 0.25, Mat.color('#c43c2c', 0.45), -0.45, 0.23, 0.05, 0.02);
    return pb.build();
  },
  // ---------- Yard ----------
  'prop.water_tank': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.1, 0.5, 1.1, Mat.tex('concrete', '#bbbbbb', 0.9), 0, 0, 0);
    pb.cyl(0.52, 0.52, 1.3, M.steel(), 0, 0.5, 0, 24);
    pb.sphere(0.52, M.steel(), 0, 1.8, 0, 1, 0.2, 1, 20);
    for (const y of [0.8, 1.2, 1.6]) pb.geo(new THREE.TorusGeometry(0.525, 0.012, 6, 32).rotateX(Math.PI / 2), M.steel(), 0, y, 0);
    pb.cyl(0.03, 0.03, 0.8, Mat.color('#4a90c4', 0.5), 0.6, 0, 0, 8);
    return pb.build();
  },
  'prop.car': (o) => {
    const pb = new PB(o.seed);
    const paint = Mat.color('#8a1f1f', 0.28, 0.6), glass = Mat.color('#1a2630', 0.08, 0.3), tyre = Mat.color('#151515', 0.85);
    pb.box(1.75, 0.55, 4.3, paint, 0, 0.3, 0, 0.18);
    pb.box(1.55, 0.5, 2.2, paint, 0, 0.8, -0.2, 0.2);
    pb.box(1.5, 0.42, 2.1, glass, 0, 0.84, -0.2, 0.15);
    pb.box(1.4, 0.06, 1.8, paint, 0, 1.28, -0.2, 0.05);
    for (const x of [-0.8, 0.8]) for (const z of [-1.35, 1.35]) {
      pb.cyl(0.33, 0.33, 0.22, tyre, x, 0.33, z, 18, [0, 0, Math.PI / 2]);
      pb.cyl(0.2, 0.2, 0.23, Mat.color('#9aa4ad', 0.3, 0.9), x, 0.33, z, 12, [0, 0, Math.PI / 2]);
    }
    pb.box(0.35, 0.12, 0.03, Mat.emissive('#ffe9b0', 0.2), -0.6, 0.6, 2.15); pb.box(0.35, 0.12, 0.03, Mat.emissive('#ffe9b0', 0.2), 0.6, 0.6, 2.15);
    pb.box(0.35, 0.1, 0.03, Mat.emissive('#c81e1e', 0.4), -0.6, 0.62, -2.15); pb.box(0.35, 0.1, 0.03, Mat.emissive('#c81e1e', 0.4), 0.6, 0.62, -2.15);
    pb.box(0.5, 0.12, 0.02, Mat.color('#f2f2f2', 0.6), 0, 0.4, 2.16); // plate
    return pb.build();
  },
  'prop.potted_tree': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.28, 0.22, 0.4, Mat.color('#6b6b66', 0.9), 0, 0, 0, 16);
    pb.cyl(0.035, 0.05, 0.7, M.bark(), 0, 0.4, 0, 6);
    const rng = pb.rng;
    for (let i = 0; i < 5; i++) pb.sphere(0.25 + rng() * 0.12, M.leaf(), (rng() - 0.5) * 0.35, 1.05 + rng() * 0.3, (rng() - 0.5) * 0.35, 1, 0.85, 1, 8);
    return pb.build();
  },
  'prop.drying_rack': (o) => {
    const pb = new PB(o.seed); const m = M.chrome();
    for (const x of [-0.75, 0.75]) { pb.cyl(0.015, 0.015, 1.6, m, x, 0, -0.25, 6); pb.cyl(0.015, 0.015, 1.6, m, x, 0, 0.25, 6); }
    for (const z of [-0.2, 0, 0.2]) pb.cyl(0.01, 0.01, 1.5, m, 0, 1.5, z, 6, [0, 0, Math.PI / 2]);
    const cols = ['#d8d2c4', '#2f63a8', '#c43c2c', '#3a6a3a', '#f2c230'];
    for (let i = 0; i < 5; i++) pb.box(0.32, 0.5 + pb.rng() * 0.2, 0.01, M.fabric(cols[i]), -0.6 + i * 0.3, 0.95, (i % 3 - 1) * 0.2);
    return pb.build();
  },
  'prop.outdoor_table': (o) => {
    const pb = new PB(o.seed); const stone = Mat.color('#d6d1c8', 0.25);
    pb.cyl(0.45, 0.45, 0.05, stone, 0, 0.7, 0, 24); pb.cyl(0.1, 0.18, 0.7, stone, 0, 0, 0, 12);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; pb.cyl(0.18, 0.18, 0.04, stone, Math.cos(a) * 0.75, 0.42, Math.sin(a) * 0.75, 16); pb.cyl(0.07, 0.12, 0.42, stone, Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75, 10); }
    return pb.build();
  },
  'prop.mango_tree': (o) => {
    const pb = new PB(o.seed);
    pb.cyl(0.14, 0.22, 2.4, M.bark(), 0, 0, 0, 10);
    pb.cyl(0.07, 0.11, 1.4, M.bark(), 0.35, 1.9, 0.1, 8, [0, 0, -0.6]);
    pb.cyl(0.07, 0.1, 1.3, M.bark(), -0.3, 2.0, -0.1, 8, [0.2, 0, 0.6]);
    const rng = pb.rng;
    for (let i = 0; i < 14; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 1.6;
      pb.sphere(0.7 + rng() * 0.5, M.leaf(), Math.cos(a) * r, 3.0 + rng() * 1.6, Math.sin(a) * r, 1, 0.75, 1, 9);
    }
    for (let i = 0; i < 6; i++) pb.sphere(0.06, Mat.color('#c9b23a', 0.5), (rng() - 0.5) * 2, 2.7 + rng() * 0.6, (rng() - 0.5) * 2, 0.8, 1.2, 0.8, 6);
    return pb.build();
  },
};
for (const id in PROPS) AssetRegistry.register(id, PROPS[id]);
