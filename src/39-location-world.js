/* ==========================================================================
   39 · LOCATION WORLDS — shop interiors built from LOCATIONS data, shop
   fixture props, and ShelfDresser (product meshes generated from the real
   container contents so shelves look full and visibly empty as they are looted).
   ========================================================================== */

const LocationWorld = {
  layout(id) {
    const L = locDef(id), r = L.room;
    const rooms = [{ id: 'shop', floor: 0, name: L.name, x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, floorMat: r.floorMat, wall: r.wall }];
    const openings = [{ floor: 0, kind: 'door', axis: 'z', at: r.z1, a: L.doorX - 0.8, b: L.doorX + 0.8, main: true, name: 'ประตูร้าน' }];
    if (L.open) {
      // Open-air market hall: wide arches on every side, pillars in between.
      for (const [axis, at, a0, a1] of [['z', r.z0, r.x0, r.x1], ['x', r.x0, r.z0, r.z1], ['x', r.x1, r.z0, r.z1], ['z', r.z1, r.x0, r.x1]]) {
        for (let a = a0 + 0.6; a + 2.4 <= a1 - 0.4; a += 3.2) {
          if (axis === 'z' && at === r.z1 && Math.abs(a + 1.2 - L.doorX) < 2.4) continue;
          openings.push({ floor: 0, kind: 'arch', axis, at, a, b: a + 2.4 });
        }
      }
    } else {
      // Shop-front glazing either side of the door
      const left = [r.x0 + 0.6, L.doorX - 1.2], right = [L.doorX + 1.2, r.x1 - 0.6];
      for (const [a, b] of [left, right]) if (b - a > 0.8) openings.push({ floor: 0, kind: 'window', axis: 'z', at: r.z1, a, b, sill: 0.35 });
    }
    return { rooms, openings, bounds: { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 }, stairs: null };
  },

  build(scene, id) {
    const L = locDef(id), r = L.room;
    const lay = this.layout(id);
    const W = { root: new THREE.Group(), floors: [{ group: new THREE.Group(), walls: [], cutGroup: new THREE.Group() }], blockers: [[]], lights: [], furn: new Map(), pickables: [], windowMats: new Map(), outdoor: new THREE.Group(), animated: [] };
    W.root.add(W.floors[0].group); W.root.add(W.outdoor);
    // Floor
    const pb = new PB('locfloor' + id);
    const fmat = { tile: Mat.tex('tile', '#ffffff', 0.25, 0, 0.4), concrete: Mat.tex('concrete', '#b9b6ae', 0.85, 0, 0.6) }[r.floorMat] || Mat.tex('tile', '#ffffff', 0.3);
    const fg = new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0); fg.rotateX(-Math.PI / 2);
    pb.geo(fg, fmat, (r.x0 + r.x1) / 2, 0.003, (r.z0 + r.z1) / 2);
    // Sidewalk + road outside the door
    const side = new THREE.PlaneGeometry(r.x1 - r.x0 + 30, 3.2); side.rotateX(-Math.PI / 2);
    pb.geo(side, Mat.tex('pavers', '#a8a296', 0.9, 0, 0.6), 0, -0.02, r.z1 + 1.7);
    const road = new THREE.PlaneGeometry(r.x1 - r.x0 + 60, 10); road.rotateX(-Math.PI / 2);
    pb.geo(road, Mat.tex('asphalt', '#ffffff', 0.92, 0, 0.6), 0, -0.1, r.z1 + 8.3);
    const ground = new THREE.PlaneGeometry(120, 120); ground.rotateX(-Math.PI / 2);
    pb.geo(ground, Mat.tex('concrete', '#6f6c66', 0.95, 0, 0.4), 0, -0.12, 0);
    W.floors[0].group.add(pb.build({ cast: false, uvTile: 1.2 }));
    HomeWorld.buildWalls(W, lay, 1);
    // Ceiling light panels on a grid
    const fix = new PB('panels' + id);
    const panelMat = Mat.get('panel:' + id, () => new THREE.MeshStandardMaterial({ color: 0xeeeeee, emissive: new THREE.Color(L.light || 0xf4f8ff), emissiveIntensity: 0, roughness: 0.4 }));
    for (let x = r.x0 + 2.5; x < r.x1 - 1; x += 4) for (let z = r.z0 + 2.2; z < r.z1 - 0.8; z += 3.6) {
      W.lights.push({ kind: 'ceiling', floor: 0, room: 'shop', pos: new THREE.Vector3(x, 2.6, z), color: L.light || 0xf4f8ff, intensity: 22, dist: 8.5 });
    }
    void fix; void panelMat;
    // Neighbouring facades & a sign by the door
    const out = new PB('locout' + id);
    const facade = Mat.tex('ext_wall', '#d9d2c2', 0.9, 0, 0.6);
    out.box(14, 7, 12, facade, r.x0 - 7.2, -0.1, (r.z0 + r.z1) / 2 - 2);
    out.box(14, 6, 12, Mat.tex('ext_wall', '#cfd6c4', 0.9, 0, 0.6), r.x1 + 7.2, -0.1, (r.z0 + r.z1) / 2 - 2);
    out.box(r.x1 - r.x0 + 30, 9, 6, Mat.tex('ext_wall', '#bdb6a8', 0.9, 0, 0.6), 0, -0.1, r.z0 - 3.2);
    const signMat = new THREE.MeshStandardMaterial({ map: HomeWorld.signTexture(L.sign[0], L.sign[1], '#ffffff'), roughness: 0.5, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.08 });
    const sg = new THREE.PlaneGeometry(2.6, 0.5);
    out.box(0.08, 2.6, 0.08, Mat.color('#3a3f44', 0.5, 0.6), L.doorX + 1.6, -0.02, r.z1 + 1.2);
    out.geo(sg, signMat, L.doorX + 1.6, 2.9, r.z1 + 1.25);
    // Parked motorbikes add life to the street
    for (let i = 0; i < 3; i++) {
      const bx = r.x0 + 1 + i * 1.1;
      out.box(0.25, 0.55, 1.6, Mat.color(['#c43c2c', '#2b2b2b', '#2f63a8'][i], 0.4, 0.4), bx, 0.25, r.z1 + 2.0, 0.08);
      out.cyl(0.28, 0.28, 0.08, Mat.color('#151515', 0.8), bx, 0.28, r.z1 + 1.35, 12, [0, 0, Math.PI / 2]);
      out.cyl(0.28, 0.28, 0.08, Mat.color('#151515', 0.8), bx, 0.28, r.z1 + 2.65, 12, [0, 0, Math.PI / 2]);
    }
    W.outdoor.add(out.build({ uvTile: 2.0 }));
    W.streetLamps = [new THREE.Vector3(r.x0 - 1, 5.5, r.z1 + 3.2), new THREE.Vector3(r.x1 + 1, 5.5, r.z1 + 3.2)];
    // Exit marker (glowing arrow on the sidewalk)
    const arrow = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.7, depthWrite: false }));
    arrow.rotation.x = -Math.PI / 2; arrow.position.set(L.doorX, 0.02, r.z1 + 1.6);
    W.outdoor.add(arrow); W.exitMarker = arrow;
    scene.add(W.root);
    Object.assign(W, {
      kind: 'location', locId: id, layout: lay, floorsCount: 1, stairs: null,
      groundY: () => 0,
      navAreas: [{ x0: r.x0 - 0.4, x1: r.x1 + 0.4, z0: r.z0 - 0.4, z1: r.z1 + 2.6 }],
      camBounds: { x0: r.x0 - 4, x1: r.x1 + 4, z0: r.z0 - 3, z1: r.z1 + 8 },
      pickY0: 0, slab: null, dustRect: lay.bounds,
      isIndoor: (x, z) => !L.open && x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1,
      exit: { x: L.doorX, z: r.z1 + 1.6, floor: 0 },
      spawn: { x: L.doorX, z: r.z1 - 0.9, floor: 0, rot: Math.PI },
    });
    // The sidewalk strip beyond the facade line is walkable only through the door.
    W.blockers[0].push({ x0: r.x0 - 0.5, x1: r.x1 + 0.5, z0: r.z1 + 2.4, z1: r.z1 + 3 });
    return W;
  },
};

/* ---------- Shop fixture props ---------- */
Object.assign(PROPS, {
  'prop.shop_shelf': (o) => {
    const pb = new PB(o.seed); const m = Mat.color('#e9e6df', 0.5, 0.2), dark = Mat.color('#3a4048', 0.5, 0.5);
    pb.box(2.0, 1.75, 0.04, m, 0, 0, -0.02);
    pb.box(0.04, 1.75, 0.6, m, -0.98, 0, 0); pb.box(0.04, 1.75, 0.6, m, 0.98, 0, 0);
    for (const y of [0.08, 0.5, 0.92, 1.34]) { pb.box(1.96, 0.025, 0.56, m, 0, y, 0); pb.box(1.96, 0.05, 0.02, Mat.color('#f2c230', 0.6), 0, y - 0.03, 0.28); }
    pb.box(2.0, 0.08, 0.6, dark, 0, 0, 0);
    pb.box(2.0, 0.22, 0.04, Mat.color('#1f4f8a', 0.6), 0, 1.75, -0.02);
    return pb.build();
  },
  'prop.wall_shelf': (o) => {
    const pb = new PB(o.seed); const m = Mat.color('#dcd8cf', 0.5, 0.2);
    pb.box(2.4, 2.0, 0.04, m, 0, 0, -0.2);
    pb.box(0.04, 2.0, 0.45, m, -1.18, 0, 0); pb.box(0.04, 2.0, 0.45, m, 1.18, 0, 0);
    for (const y of [0.1, 0.55, 1.0, 1.45, 1.9]) pb.box(2.36, 0.025, 0.42, m, 0, y, 0);
    for (const y of [0.1, 0.55, 1.0, 1.45]) pb.box(2.36, 0.045, 0.02, Mat.color('#e0b23c', 0.6), 0, y - 0.03, 0.21);
    return pb.build();
  },
  'prop.chiller': (o) => {
    const pb = new PB(o.seed); const body = Mat.color('#2f3a44', 0.4, 0.5), inner = Mat.color('#e9eef2', 0.3, 0.2);
    pb.box(2.0, 0.35, 0.8, body, 0, 0, 0);
    pb.box(2.0, 1.9, 0.08, body, 0, 0, -0.36);
    pb.box(0.05, 1.9, 0.8, body, -0.98, 0, 0); pb.box(0.05, 1.9, 0.8, body, 0.98, 0, 0);
    for (const y of [0.35, 0.75, 1.15, 1.55]) pb.box(1.9, 0.025, 0.6 - (y - 0.35) * 0.1, inner, 0, y, -0.02 - (y - 0.35) * 0.05);
    pb.box(2.0, 0.25, 0.7, body, 0, 1.9, -0.05);
    pb.box(1.9, 0.08, 0.02, Mat.emissive('#bfe3ff', 0.8), 0, 1.86, 0.28);
    return pb.build();
  },
  'prop.drink_cooler': (o) => {
    const pb = new PB(o.seed); const body = Mat.color('#c4202a', 0.4, 0.3);
    pb.box(1.4, 0.12, 0.7, body, 0, 0, 0); pb.box(1.4, 0.2, 0.7, body, 0, 1.8, 0);
    pb.box(1.4, 2.0, 0.05, body, 0, 0, -0.33); pb.box(0.06, 2.0, 0.7, body, -0.67, 0, 0); pb.box(0.06, 2.0, 0.7, body, 0.67, 0, 0);
    for (const y of [0.12, 0.48, 0.84, 1.2, 1.56]) pb.box(1.28, 0.02, 0.6, Mat.color('#d9dde1', 0.4, 0.3), 0, y, 0);
    pb.box(1.3, 1.7, 0.02, Mat.color('#cfe4ec', 0.05, 0, { transparent: true, opacity: 0.25, depthWrite: false }), 0, 0.15, 0.36);
    pb.box(0.03, 1.7, 0.03, M.chrome(), 0, 0.15, 0.37);
    pb.box(1.3, 0.2, 0.02, Mat.emissive('#ffffff', 0.5), 0, 1.8, 0.36);
    return pb.build();
  },
  'prop.shop_freezer': (o) => {
    const pb = new PB(o.seed);
    const body = Mat.color('#e9eef2', 0.35, 0.2);
    pb.box(2.0, 0.42, 0.9, body, 0, 0, 0, 0.03);
    pb.box(2.0, 0.42, 0.06, body, 0, 0.42, -0.42); pb.box(2.0, 0.42, 0.06, body, 0, 0.42, 0.42);
    pb.box(0.06, 0.42, 0.9, body, -0.97, 0.42, 0); pb.box(0.06, 0.42, 0.9, body, 0.97, 0.42, 0);
    pb.box(1.9, 0.02, 0.8, Mat.color('#bcd6e8', 0.3), 0, 0.42, 0);
    pb.box(2.0, 0.1, 0.9, Mat.color('#2f63a8', 0.5), 0, 0, 0);
    // Rim frame only (open top) so the stock inside stays visible; faint glass sliding lids.
    const rim = Mat.color('#c9cdd1', 0.3, 0.7);
    pb.box(2.04, 0.05, 0.07, rim, 0, 0.82, -0.435); pb.box(2.04, 0.05, 0.07, rim, 0, 0.82, 0.435);
    pb.box(0.07, 0.05, 0.94, rim, -0.985, 0.82, 0); pb.box(0.07, 0.05, 0.94, rim, 0.985, 0.82, 0); pb.box(0.04, 0.05, 0.8, rim, 0, 0.82, 0);
    pb.box(1.9, 0.01, 0.8, Mat.get('frzglass', () => new THREE.MeshStandardMaterial({ color: '#d8ecf7', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false })), 0, 0.85, 0);
    return pb.build();
  },
  'prop.checkout': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.6, 0.9, 0.7, Mat.color('#2f3a44', 0.5, 0.3), 0, 0, 0, 0.02);
    pb.box(1.65, 0.04, 0.75, Mat.color('#c9cdd1', 0.3, 0.6), 0, 0.9, 0);
    pb.box(0.4, 0.3, 0.3, M.black(), 0.4, 0.94, -0.1);
    pb.box(0.35, 0.25, 0.02, Mat.emissive('#4fa3d1', 0.4), 0.4, 1.1, 0.06);
    pb.box(0.6, 0.02, 0.5, Mat.color('#1a1a1a', 0.4), -0.4, 0.94, 0);
    pb.cyl(0.02, 0.02, 1.3, M.chrome(), 0.75, 0, -0.3, 6);
    pb.box(0.3, 0.3, 0.04, Mat.emissive('#3aff8a', 0.8), 0.75, 1.3, -0.3);
    return pb.build();
  },
  'prop.market_stall': (o) => {
    const pb = new PB(o.seed); const wood = Mat.tex('wood_floor', '#b98a5a', 0.85);
    pb.box(2.0, 0.06, 1.1, wood, 0, 0.75, 0, 0, [0.12, 0, 0]);
    for (const x of [-0.95, 0.95]) for (const z of [-0.5, 0.5]) pb.box(0.06, 0.8, 0.06, wood, x, 0, z);
    for (const x of [-0.95, 0.95]) pb.box(0.04, 1.4, 0.04, Mat.color('#5f656b', 0.5, 0.5), x, 0.8, -0.5);
    const tarp = U.pick(pb.rng, ['#c4202a', '#2f63a8', '#3a7a3a', '#e0b23c']);
    pb.box(2.4, 0.04, 1.8, Mat.get('tarp:' + tarp, () => new THREE.MeshStandardMaterial({ color: tarp, roughness: 0.9, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide })), 0, 2.2, 0.1, 0, [0.18, 0, 0]);
    pb.box(0.6, 0.25, 0.4, Mat.color('#2f63a8', 0.6), -0.6, 0, 0.2); // basket below
    pb.box(0.3, 0.04, 0.25, Mat.color('#c9cdd1', 0.3, 0.6), 0.7, 0.86, 0.45); // scale
    return pb.build();
  },
  'prop.meat_stall': (o) => {
    const pb = new PB(o.seed);
    pb.box(2.0, 0.8, 1.1, Mat.color('#c9cdd1', 0.25, 0.8), 0, 0, 0, 0.02);
    pb.box(2.0, 0.04, 1.1, Mat.color('#e9eef2', 0.15, 0.6), 0, 0.8, 0);
    pb.box(2.0, 0.04, 0.04, Mat.color('#5f656b', 0.4, 0.8), 0, 1.9, -0.45);
    for (const x of [-0.95, 0.95]) pb.box(0.04, 1.9, 0.04, Mat.color('#5f656b', 0.4, 0.8), x, 0, -0.45);
    for (let i = 0; i < 4; i++) { pb.cyl(0.004, 0.004, 0.18, M.chrome(), -0.6 + i * 0.4, 1.72, -0.45, 4); pb.sphere(0.1, Mat.color('#c8606a', 0.6), -0.6 + i * 0.4, 1.55, -0.45, 0.8, 1.6, 0.6, 8); }
    pb.box(0.4, 0.06, 0.3, Mat.color('#8a5a32', 0.7), 0.6, 0.84, 0.2); // chopping block
    pb.sphere(0.15, Mat.emissive('#ff4a3a', 0.8), 0, 2.1, 0, 1, 0.6, 1, 10); // red meat lamp
    return pb.build();
  },
  'prop.glass_counter': (o) => {
    const pb = new PB(o.seed);
    pb.box(2.0, 0.3, 0.6, Mat.color('#e9e6df', 0.5), 0, 0, 0);
    pb.box(2.0, 0.7, 0.6, Mat.color('#cfe4ec', 0.05, 0, { transparent: true, opacity: 0.22, depthWrite: false }), 0, 0.3, 0);
    pb.box(1.96, 0.02, 0.56, Mat.color('#e9e6df', 0.3), 0, 0.62, 0);
    pb.box(2.0, 0.03, 0.6, Mat.color('#c9cdd1', 0.2, 0.7), 0, 1.0, 0);
    return pb.build();
  },
  'prop.tool_rack': (o) => {
    const pb = new PB(o.seed);
    pb.box(2.0, 2.0, 0.04, Mat.color('#c9b48a', 0.9), 0, 0, -0.22);
    for (const x of [-0.98, 0.98]) pb.box(0.05, 2.0, 0.5, Mat.color('#2f63a8', 0.5, 0.5), x, 0, 0);
    for (const y of [0.1, 0.5, 0.9, 1.3, 1.7]) pb.box(1.94, 0.03, 0.46, Mat.color('#5f656b', 0.5, 0.5), 0, y, 0);
    return pb.build();
  },
  'prop.pallet_stack': (o) => {
    const pb = new PB(o.seed); const w = Mat.tex('wood_floor', '#c9a46a', 0.85);
    pb.box(1.3, 0.14, 1.1, w, 0, 0, 0);
    return pb.build();
  },
  'prop.cart_bay': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.6, 0.04, 1.0, Mat.color('#5f656b', 0.5, 0.6), 0, 0, 0);
    for (const x of [-0.78, 0.78]) pb.box(0.04, 1.0, 1.0, Mat.color('#c4202a', 0.5, 0.4), x, 0, 0);
    return pb.build();
  },
  'prop.produce_bins': (o) => {
    const pb = new PB(o.seed); const w = Mat.tex('wood_floor', '#a87a4a', 0.85);
    pb.box(2.0, 0.65, 1.0, w, 0, 0, 0, 0.02);
    for (const x of [-0.5, 0.5]) pb.box(0.04, 0.12, 1.0, w, x, 0.65, 0);
    pb.box(2.0, 0.3, 0.04, Mat.color('#3a7a3a', 0.6), 0, 0.65, -0.48);
    return pb.build();
  },
  'prop.bakery_case': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.6, 0.6, 0.7, M.lightWood(), 0, 0, 0, 0.02);
    pb.box(1.6, 0.8, 0.7, Mat.color('#cfe4ec', 0.05, 0, { transparent: true, opacity: 0.2, depthWrite: false }), 0, 0.6, 0);
    pb.box(1.56, 0.02, 0.66, M.lightWood(), 0, 1.0, 0);
    pb.box(1.6, 0.04, 0.7, M.lightWood(), 0, 1.4, 0);
    return pb.build();
  },
});
for (const id of ['prop.shop_shelf', 'prop.wall_shelf', 'prop.chiller', 'prop.drink_cooler', 'prop.shop_freezer', 'prop.checkout', 'prop.market_stall', 'prop.meat_stall', 'prop.glass_counter', 'prop.tool_rack', 'prop.pallet_stack', 'prop.cart_bay', 'prop.produce_bins', 'prop.bakery_case']) AssetRegistry.register(id, PROPS[id]);

/**
 * ShelfDresser: product meshes from container contents.
 * spec: where the grid maps onto the fixture (local space, front = +z).
 */
const SHELF_SPEC = {
  'prop.shop_shelf':   { kind: 'shelf', w: 1.9, levels: [0.1, 0.52, 0.94, 1.36], depth: 0.52, z: 0.0, gap: 0.4 },
  'prop.wall_shelf':   { kind: 'shelf', w: 2.3, levels: [0.12, 0.57, 1.02, 1.47, 1.92], depth: 0.4, z: 0.0, gap: 0.42 },
  'prop.chiller':      { kind: 'shelf', w: 1.9, levels: [0.37, 0.77, 1.17, 1.57], depth: 0.5, z: -0.05, gap: 0.36 },
  'prop.drink_cooler': { kind: 'shelf', w: 1.25, levels: [0.12, 0.48, 0.84, 1.2, 1.56], depth: 0.55, z: 0.0, gap: 0.32 },
  'prop.glass_counter':{ kind: 'shelf', w: 1.9, levels: [0.32, 0.64, 1.03], depth: 0.45, z: 0.0, gap: 0.28 },
  'prop.tool_rack':    { kind: 'shelf', w: 1.9, levels: [0.13, 0.53, 0.93, 1.33, 1.73], depth: 0.4, z: 0.0, gap: 0.36 },
  'prop.bakery_case':  { kind: 'shelf', w: 1.5, levels: [0.62, 1.02, 1.42], depth: 0.55, z: 0.0, gap: 0.35 },
  'prop.shop_freezer': { kind: 'bin', w: 1.82, d: 0.74, y: 0.44, gap: 0.35 },
  'prop.market_stall': { kind: 'table', w: 1.85, d: 1.0, y: 0.82, tilt: 0.12, gap: 0.3 },
  'prop.meat_stall':   { kind: 'table', w: 1.85, d: 1.0, y: 0.83, tilt: 0, gap: 0.2 },
  'prop.produce_bins': { kind: 'table', w: 1.9, d: 0.9, y: 0.6, tilt: 0, gap: 0.25 },
  'prop.pallet_stack': { kind: 'pile', w: 1.2, d: 1.0, y: 0.14, gap: 1.0 },
  'prop.cart_bay':     { kind: 'pile', w: 1.5, d: 0.9, y: 0.04, gap: 1.0 },
};
const ShelfDresser = {
  shapeOf(d) {
    const k = (d.icon && d.icon.k) || 'box';
    if (['can', 'bottle', 'smallbottle', 'jug', 'jar', 'cup', 'tub', 'candle'].includes(k)) return 'cyl';
    if (['round', 'egg'].includes(k)) return 'ball';
    if (['tray', 'frozen', 'bar', 'blister'].includes(k)) return 'flat';
    if (['greens', 'banana'].includes(k)) return 'bunch';
    if (['plank', 'board'].includes(k)) return 'board';
    return 'box';
  },
  heightOf(d, shape) {
    const k = (d.icon && d.icon.k) || 'box';
    if (k === 'bottle' || k === 'jug') return 0.28;
    if (k === 'sack') return 0.3;
    if (shape === 'flat') return 0.06;
    if (shape === 'cyl') return 0.13;
    if (shape === 'ball') return 0.12;
    return 0.18;
  },
  build(f, def, c) {
    const spec = SHELF_SPEC[def.asset];
    if (!spec || !c) return null;
    const pb = new PB('stock' + f.uid);
    const cw = spec.w / c.w;
    for (const s of c.slots) {
      const d = itemDef(s.it.id);
      const [w, h] = Inv.dims(s.it, s.r);
      const shape = this.shapeOf(d), frozenPack = d.icon && d.icon.k === 'frozen';
      const col = (d.icon && (frozenPack ? d.icon.c2 : d.icon.c)) || '#999', col2 = (d.icon && (d.icon.b || d.icon.c2)) || col;
      const mat = Mat.color(col, 0.55), mat2 = Mat.color(col2, 0.55);
      const x0 = -spec.w / 2 + s.x * cw;
      const maxCopies = Render.q.key === 'low' ? 1 : Render.q.key === 'medium' ? 2 : 3;
      const copies = Math.min(maxCopies, Math.max(1, s.it.qty));
      if (spec.kind === 'shelf') {
        const lvl = spec.levels.length - 1 - Math.min(spec.levels.length - 1, s.y + h - 1);
        const y = spec.levels[lvl] + 0.015;
        const ht = Math.min(spec.gap * 0.88 * h, this.heightOf(d, shape) * 1.45 * (h > 1 ? 1.5 : 1));
        for (let i = 0; i < w; i++) for (let k = 0; k < copies; k++) {
          const x = x0 + (i + 0.5) * cw, z = spec.z + spec.depth / 2 - 0.08 - k * (spec.depth / 3);
          this.addShape(pb, shape, mat, mat2, x, y, z, cw * 0.9, ht, Math.min(cw * 0.9, spec.depth / 3.1));
        }
      } else if (spec.kind === 'table' || spec.kind === 'bin') {
        const cd = spec.d / c.h;
        for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
          const x = x0 + (i + 0.5) * cw, z = -spec.d / 2 + (s.y + j + 0.5) * cd;
          const y = spec.y + (spec.tilt ? (z + spec.d / 2) * -spec.tilt * 0.5 + 0.06 : 0);
          const n = Math.min(3, copies + 1);
          for (let k = 0; k < n; k++) this.addShape(pb, shape, mat, mat2, x + (k % 2 - 0.5) * cw * 0.28, y + Math.floor(k / 2) * 0.06, z + (k === 2 ? 0 : (k - 0.5) * cd * 0.25), cw * 0.72, this.heightOf(d, shape) * 0.85, cd * 0.7);
        }
      } else if (spec.kind === 'pile') {
        const cd = spec.d / c.h;
        const x = x0 + (w * cw) / 2, z = -spec.d / 2 + (s.y + h / 2) * cd;
        const layers = Math.min(6, s.it.qty);
        for (let k = 0; k < layers; k++) {
          if (shape === 'board') pb.box(w * cw * 0.95, 0.06, h * cd * 0.95, mat, x, spec.y + k * 0.065, z);
          else pb.box(w * cw * 0.9, 0.16, h * cd * 0.9, mat, x, spec.y + k * 0.17, z);
        }
      }
    }
    return pb.parts.length ? pb.build({ uvTile: 0, cast: false }) : null;
  },
  addShape(pb, shape, mat, mat2, x, y, z, w, h, d) {
    if (shape === 'cyl') { const r = Math.min(w, d) / 2; pb.cyl(r, r, h, mat, x, y, z, 7); pb.cyl(r * 1.01, r * 1.01, h * 0.3, mat2, x, y + h * 0.35, z, 7); }
    else if (shape === 'ball') { const r = Math.min(w, d, h * 1.5) / 2; pb.sphere(r, mat, x, y + r, z, 1, 0.9, 1, 5); }
    else if (shape === 'flat') pb.box(w, h, d, mat, x, y, z);
    else if (shape === 'bunch') { pb.box(w * 0.8, h * 0.5, d * 0.8, mat, x, y, z); pb.box(w * 0.5, h * 0.4, d * 0.5, mat2, x, y + h * 0.5, z); }
    else { pb.box(w, h, d, mat, x, y, z); pb.box(w * 1.01, h * 0.22, d * 1.01, mat2, x, y + h * 0.5, z); }
  },
};
