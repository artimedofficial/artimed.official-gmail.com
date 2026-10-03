/* ==========================================================================
   33 · HOME WORLD BUILDER
   Builds the two-storey house (cutaway walls, windows, doors, stairs, lights),
   the yard, fence, street and neighbouring buildings from HOME data.
   Also produces the blocker rectangles used by the nav grid.
   ========================================================================== */

const HomeWorld = {
  WALL_T_EXT: 0.2,
  WALL_T_INT: 0.12,
  CUT_H: 0.95,
  YARD_Y: -0.15,

  /** Ground height at (x,z) on floor 0 (house slab is raised above the yard). */
  groundY(x, z, floor = 0) {
    if (floor === 1) return CFG.FLOOR_H;
    const b = HOME.bounds;
    if (x >= b.x0 - 0.1 && x <= b.x1 + 0.1 && z >= b.z0 - 0.1 && z <= b.z1 + 0.1) return 0;
    if (x >= -2.6 && x <= 0.4 && z > b.z1 && z <= b.z1 + 1.3) return -0.07;
    return HomeWorld.YARD_Y;
  },
  roomAt(floor, x, z) {
    return HOME.rooms.find((r) => r.floor === floor && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) || null;
  },

  build(scene) {
    const W = { root: new THREE.Group(), floors: [], blockers: [[], []], lights: [], furn: new Map(), pickables: [], windowMats: new Map(), outdoor: new THREE.Group(), animated: [] };
    W.root.name = 'homeWorld';
    for (let f = 0; f < 2; f++) {
      const g = new THREE.Group(); g.name = 'floor' + f;
      W.floors.push({ group: g, walls: [], cutGroup: new THREE.Group(), ceilingGroup: new THREE.Group() });
      g.add(W.floors[f].cutGroup);
      W.root.add(g);
    }
    W.root.add(W.outdoor);
    this.buildFloors(W);
    this.buildWalls(W);
    this.buildStairs(W);
    this.buildRoomLights(W);
    this.buildYard(W);
    this.buildStreet(W);
    scene.add(W.root);
    return W;
  },

  /* ---------- Slabs & floor finishes ---------- */
  buildFloors(W) {
    const b = HOME.bounds, st = HOME.stairs;
    const floorMat = (m) => ({
      wood: Mat.tex('wood_floor', '#e6c9a6', 0.55, 0, 0.5),
      tile: Mat.tex('tile', '#ffffff', 0.32, 0, 0.5),
      bathtile: Mat.tex('bathtile', '#ffffff', 0.25, 0, 0.5),
      concrete: Mat.tex('concrete', '#c9c6c0', 0.85, 0, 0.6),
    }[m]);
    // Plinth under the ground floor
    const plinth = new PB('plinth');
    plinth.box(b.x1 - b.x0 + 0.3, 0.17, b.z1 - b.z0 + 0.3, Mat.tex('concrete', '#a9a59c', 0.9), (b.x0 + b.x1) / 2, -0.17, (b.z0 + b.z1) / 2);
    // Porch with steps
    plinth.box(3.0, 0.1, 1.3, Mat.tex('tile', '#d8cfc0', 0.5), -1.1, -0.17, b.z1 + 0.65);
    W.floors[0].group.add(plinth.build());
    const hole = { x0: st.x0, x1: st.x1, z0: st.zBottom, z1: st.zTop };
    for (const r of HOME.rooms) {
      const y = r.floor * CFG.FLOOR_H;
      const rects = r.floor === 1 ? HomeWorld.rectMinus(r, hole) : [r];
      const pb = new PB('floor' + r.id);
      for (const q of rects) {
        const geo = new THREE.PlaneGeometry(q.x1 - q.x0, q.z1 - q.z0); geo.rotateX(-Math.PI / 2);
        pb.geo(geo, floorMat(r.floorMat), (q.x0 + q.x1) / 2, y + 0.003, (q.z0 + q.z1) / 2);
      }
      const mesh = pb.build({ cast: false });
      mesh.userData.floorRoom = r.id;
      mesh.traverse((o) => { if (o.isMesh) { o.userData.ground = r.floor; } });
      W.floors[r.floor].group.add(mesh);
      W.pickables.push(mesh);
    }
    // Upper slab (seen as the ground-floor ceiling) with stairwell hole
    const slab = new PB('slab');
    for (const q of HomeWorld.rectMinus({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 }, hole)) {
      slab.box(q.x1 - q.x0, 0.2, q.z1 - q.z0, Mat.tex('plaster', '#d9d4c8', 0.9), (q.x0 + q.x1) / 2, CFG.FLOOR_H - 0.2, (q.z0 + q.z1) / 2);
    }
    // Edge trim / parapet cap on top of the upper floor walls
    W.floors[1].group.add(slab.build());
  },
  /** Axis-aligned rect minus a hole → up to 4 rects. */
  rectMinus(r, h) {
    if (h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) return [r];
    const out = [];
    if (h.x0 > r.x0) out.push({ x0: r.x0, x1: h.x0, z0: r.z0, z1: r.z1 });
    if (h.x1 < r.x1) out.push({ x0: h.x1, x1: r.x1, z0: r.z0, z1: r.z1 });
    const cx0 = Math.max(r.x0, h.x0), cx1 = Math.min(r.x1, h.x1);
    if (h.z0 > r.z0) out.push({ x0: cx0, x1: cx1, z0: r.z0, z1: h.z0 });
    if (h.z1 < r.z1) out.push({ x0: cx0, x1: cx1, z0: h.z1, z1: r.z1 });
    return out;
  },

  /* ---------- Walls with openings; full + cut variants ---------- */
  wallLines(floor) {
    const map = new Map();
    const addSeg = (axis, at, a, b) => {
      const key = axis + ':' + at.toFixed(3);
      if (!map.has(key)) map.set(key, { axis, at, segs: [] });
      map.get(key).segs.push([Math.min(a, b), Math.max(a, b)]);
    };
    for (const r of HOME.rooms.filter((q) => q.floor === floor)) {
      addSeg('z', r.z0, r.x0, r.x1); addSeg('z', r.z1, r.x0, r.x1);
      addSeg('x', r.x0, r.z0, r.z1); addSeg('x', r.x1, r.z0, r.z1);
    }
    const b = HOME.bounds, lines = [];
    for (const { axis, at, segs } of map.values()) {
      segs.sort((p, q) => p[0] - q[0]);
      const merged = [];
      for (const s of segs) {
        const last = merged[merged.length - 1];
        if (last && s[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], s[1]); else merged.push([...s]);
      }
      const exterior = axis === 'z' ? (Math.abs(at - b.z0) < 1e-6 || Math.abs(at - b.z1) < 1e-6) : (Math.abs(at - b.x0) < 1e-6 || Math.abs(at - b.x1) < 1e-6);
      const outward = !exterior ? 0 : (axis === 'z' ? (Math.abs(at - b.z0) < 1e-6 ? -1 : 1) : (Math.abs(at - b.x0) < 1e-6 ? -1 : 1));
      for (const [a, c] of merged) lines.push({ floor, axis, at, a, b: c, exterior, outward });
    }
    return lines;
  },
  buildWalls(W) {
    const H = CFG.FLOOR_H;
    for (let floor = 0; floor < 2; floor++) {
      const y0 = floor * H;
      for (const line of this.wallLines(floor)) {
        const ops = HOME.openings.filter((o) => o.floor === floor && o.axis === line.axis && Math.abs(o.at - line.at) < 1e-6 && o.a >= line.a - 1e-6 && o.b <= line.b + 1e-6).sort((p, q) => p.a - q.a);
        const thick = line.exterior ? this.WALL_T_EXT : this.WALL_T_INT;
        // Spans of solid wall + openings (with sill/lintel parts)
        const parts = []; // {a, b, y0, y1}
        let cur = line.a;
        for (const o of ops) {
          if (o.a > cur) parts.push({ a: cur, b: o.a, lo: 0, hi: H });
          const top = o.kind === 'window' ? 2.2 : o.kind === 'rollup' ? 2.5 : o.kind === 'arch' ? 2.3 : 2.1;
          const sill = o.kind === 'window' ? (o.sill || 0.9) : 0;
          if (sill > 0) parts.push({ a: o.a, b: o.b, lo: 0, hi: sill });
          parts.push({ a: o.a, b: o.b, lo: top, hi: H });
          cur = o.b;
          // Door/blocker bookkeeping for nav: doors are walkable gaps, windows are not.
          if (o.kind === 'window') W.blockers[floor].push(this.lineRect(line, o.a, o.b, thick));
        }
        if (cur < line.b) parts.push({ a: cur, b: line.b, lo: 0, hi: H });
        for (const p of parts) if (p.lo === 0 && p.hi >= 2) W.blockers[floor].push(this.lineRect(line, p.a, p.b, thick));
        // Wall faces: two half-thickness slabs coloured by the room on each side.
        const sides = [-1, 1];
        const build = (cutH) => {
          const pb = new PB('wall' + floor + line.axis + line.at + line.a);
          for (const p of parts) {
            const lo = p.lo, hi = cutH ? Math.min(p.hi, cutH) : p.hi;
            if (hi - lo < 0.01) continue;
            for (const side of sides) {
              // Room colour per sub-span: sample the room at the span midpoint on this side.
              const mid = (p.a + p.b) / 2;
              const px = line.axis === 'x' ? line.at + side * 0.3 : mid;
              const pz = line.axis === 'z' ? line.at + side * 0.3 : mid;
              const room = this.roomAt(floor, px, pz);
              const mat = room ? Mat.tex('plaster', room.wall, 0.92, 0, 0.3) : Mat.tex('ext_wall', '#efe3c8', 0.9, 0, 0.5);
              const t = thick / 2;
              const off = side * t / 2;
              const len = p.b - p.a, cx = (p.a + p.b) / 2;
              if (line.axis === 'z') pb.box(len, hi - lo, t, mat, cx, y0 + lo, line.at + off);
              else pb.box(t, hi - lo, len, mat, line.at + off, y0 + lo, cx);
            }
            // Skirting / cut-edge cap for readability
            if (cutH && p.hi > cutH) {
              const capMat = Mat.color('#3b3530', 0.8);
              if (line.axis === 'z') pb.box(p.b - p.a, 0.03, thick + 0.01, capMat, (p.a + p.b) / 2, y0 + hi, line.at);
              else pb.box(thick + 0.01, 0.03, p.b - p.a, capMat, line.at, y0 + hi, (p.a + p.b) / 2);
            }
          }
          // Exterior base band (darker plinth paint)
          if (line.exterior && floor === 0) {
            const band = Mat.tex('ext_wall', '#8f8577', 0.9);
            const o = line.outward * (thick / 2 + 0.005);
            for (const p of parts) if (p.lo === 0) {
              if (line.axis === 'z') pb.box(p.b - p.a, 0.35, 0.02, band, (p.a + p.b) / 2, -0.15, line.at + o);
              else pb.box(0.02, 0.35, p.b - p.a, band, line.at + o, -0.15, (p.a + p.b) / 2);
            }
          }
          return pb.build();
        };
        const full = build(0), cut = build(this.CUT_H);
        cut.visible = false;
        const wrap = new THREE.Group(); wrap.add(full); wrap.add(cut);
        W.floors[floor].group.add(wrap);
        const rec = { line, full, cut, floor };
        W.floors[floor].walls.push(rec);
        for (const o of ops) this.buildOpening(W, o, line, thick, rec);
      }
    }
  },
  lineRect(line, a, b, thick) {
    const t = thick / 2 + 0.02;
    return line.axis === 'z' ? { x0: a, x1: b, z0: line.at - t, z1: line.at + t } : { x0: line.at - t, x1: line.at + t, z0: a, z1: b };
  },
  /** Window frames/glass/grilles and door frames/leaves. Added to both wall variants as needed. */
  buildOpening(W, o, line, thick, rec) {
    const y0 = o.floor * CFG.FLOOR_H;
    const along = (a, len, h, d, mat, lo, offN = 0) => {
      // helper producing a box on the wall plane
      return line.axis === 'z' ? [len, h, d, mat, a, y0 + lo, line.at + offN] : [d, h, len, mat, line.at + offN, y0 + lo, a];
    };
    const frame = Mat.color('#3c3f42', 0.45, 0.6);
    const mid = (o.a + o.b) / 2, len = o.b - o.a;
    if (o.kind === 'window') {
      const sill = o.sill || 0.9, top = 2.2, h = top - sill;
      const room = this.roomAt(o.floor, line.axis === 'x' ? line.at - (line.outward || 1) * 0.3 : mid, line.axis === 'z' ? line.at - (line.outward || 1) * 0.3 : mid);
      const glow = this.windowGlowMat(W, room ? room.id : 'none');
      const make = (cutH) => {
        const pb = new PB('win' + o.a + o.at);
        const hh = cutH ? Math.max(0, Math.min(top, cutH) - sill) : h;
        if (hh <= 0.02) return pb.build();
        pb.box(...along(mid, len, 0.04, thick + 0.04, frame, sill));
        if (!cutH) pb.box(...along(mid, len, 0.04, thick + 0.04, frame, top - 0.04));
        pb.box(...along(o.a + 0.02, 0.04, hh, thick + 0.04, frame, sill));
        pb.box(...along(o.b - 0.02, 0.04, hh, thick + 0.04, frame, sill));
        pb.box(...along(mid, 0.03, hh, thick * 0.6, frame, sill));
        pb.box(...along(mid, len - 0.06, hh - 0.06, 0.012, glow, sill + 0.03));
        // Iron grille on the outside (common in Thai homes)
        if (line.exterior && o.floor === 0) {
          const g = Mat.color('#1f2326', 0.5, 0.7), off = (line.outward || 1) * (thick / 2 + 0.06);
          const n = Math.max(3, Math.round(len / 0.14));
          for (let i = 1; i < n; i++) pb.box(...along(o.a + (len * i) / n, 0.014, hh, 0.014, g, sill, off));
          for (const yy of [0.25, 0.65]) if (sill + h * yy < (cutH || 99)) pb.box(...along(mid, len, 0.014, 0.014, g, sill + h * yy, off));
        }
        return pb.build({ cast: true });
      };
      rec.full.add(make(0)); rec.cut.add(make(this.CUT_H));
      W.windows = W.windows || [];
      W.windows.push({ o, line, room: room && room.id });
    } else if (o.kind === 'door' || o.kind === 'arch' || o.kind === 'rollup') {
      const top = o.kind === 'rollup' ? 2.5 : o.kind === 'arch' ? 2.3 : 2.1;
      const pb = new PB('door' + o.a + o.at);
      const fm = o.kind === 'rollup' ? Mat.color('#5a6066', 0.5, 0.6) : Mat.color('#6b4a32', 0.6);
      pb.box(...along(o.a + 0.03, 0.06, top, thick + 0.04, fm, 0));
      pb.box(...along(o.b - 0.03, 0.06, top, thick + 0.04, fm, 0));
      pb.box(...along(mid, len, 0.06, thick + 0.04, fm, top - 0.06));
      if (o.kind === 'door') {
        // Door leaf swung open ~100° against the wall (into the room side −outward or +1).
        const leaf = new PB('leaf' + o.a);
        const lm = o.main ? Mat.tex('wood_floor', '#7a4a2a', 0.55) : Mat.color('#d9cdb5', 0.5);
        leaf.box(0.04, 2.02, len - 0.08, lm, 0, 0, -(len - 0.08) / 2);
        leaf.box(0.05, 0.03, 0.12, M.chrome(), 0.03, 1.0, -(len - 0.2));
        const leafObj = leaf.build();
        const hinge = new THREE.Group();
        const side = line.exterior ? -(line.outward || 1) : 1;
        if (line.axis === 'z') { hinge.position.set(o.a + 0.06, y0, line.at + side * thick / 2); hinge.rotation.y = side > 0 ? Math.PI : 0; }
        else { hinge.position.set(line.at + side * thick / 2, y0, o.a + 0.06); hinge.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; }
        hinge.add(leafObj);
        leafObj.rotation.y = side > 0 ? -0.15 : 0.15;
        rec.full.add(hinge);
        if (o.main) { W.mainDoor = hinge; }
      }
      if (o.kind === 'rollup') {
        pb.box(...along(mid, len, 0.32, 0.36, Mat.color('#7a8086', 0.5, 0.6), top - 0.05, (line.outward || 1) * 0.2));
      }
      const fr = pb.build();
      rec.full.add(fr);
      const cutFr = new PB('doorcut' + o.a);
      cutFr.box(...along(o.a + 0.03, 0.06, this.CUT_H, thick + 0.04, fm, 0));
      cutFr.box(...along(o.b - 0.03, 0.06, this.CUT_H, thick + 0.04, fm, 0));
      rec.cut.add(cutFr.build());
    }
  },
  windowGlowMat(W, roomId) {
    if (!W.windowMats.has(roomId)) {
      const m = new THREE.MeshStandardMaterial({ color: 0x8fb4c8, roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.35, emissive: new THREE.Color('#ffb46b'), emissiveIntensity: 0, depthWrite: false });
      W.windowMats.set(roomId, m);
    }
    return W.windowMats.get(roomId);
  },

  /* ---------- Stairs ---------- */
  buildStairs(W) {
    const s = HOME.stairs, n = 17, H = CFG.FLOOR_H;
    const run = (s.zTop - s.zBottom) / n, rise = H / n;
    const pb = new PB('stairs');
    const tread = Mat.tex('wood_floor', '#b98a5a', 0.55), riser = Mat.color('#e2dccf', 0.7);
    for (let i = 0; i < n; i++) {
      const z = s.zBottom + run * (i + 0.5);
      pb.box(s.x1 - s.x0, 0.035, run + 0.03, tread, (s.x0 + s.x1) / 2, rise * (i + 1) - 0.035, z);
      pb.box(s.x1 - s.x0, rise, 0.02, riser, (s.x0 + s.x1) / 2, rise * i, s.zBottom + run * i + 0.01);
    }
    // Stringer under the steps (sloped slab)
    const len = Math.hypot(s.zTop - s.zBottom, H);
    const ang = Math.atan2(H, s.zTop - s.zBottom);
    const stringer = new THREE.BoxGeometry(s.x1 - s.x0, 0.12, len);
    pb.geo(stringer, Mat.tex('plaster', '#d6cbb6', 0.9), (s.x0 + s.x1) / 2, H / 2 - 0.12, (s.zBottom + s.zTop) / 2, [-ang, 0, 0]);
    // Handrail on the open (west) side
    const rail = Mat.color('#4a3426', 0.5);
    for (let i = 0; i <= n; i += 3) pb.box(0.03, 0.9, 0.03, Mat.color('#2a2a2a', 0.5, 0.6), s.x0 + 0.03, rise * i, s.zBottom + run * i);
    pb.geo(new THREE.BoxGeometry(0.05, 0.05, len), rail, s.x0 + 0.03, H / 2 + 0.92, (s.zBottom + s.zTop) / 2, [-ang, 0, 0]);
    W.stairsObj = pb.build();
    W.stairsObj.userData.stairs = true;
    W.floors[0].group.add(W.stairsObj);
    // Upper floor railing around the stairwell
    const up = new PB('rail2');
    up.box(0.05, 0.05, s.zTop - s.zBottom, rail, s.x0 - 0.03, H + 0.95, (s.zBottom + s.zTop) / 2);
    up.box(s.x1 - s.x0 + 0.06, 0.05, 0.05, rail, (s.x0 + s.x1) / 2, H + 0.95, s.zBottom - 0.03);
    for (let z = s.zBottom; z <= s.zTop + 0.01; z += 0.45) up.box(0.025, 0.95, 0.025, Mat.color('#2a2a2a', 0.5, 0.6), s.x0 - 0.03, H, z);
    W.floors[1].group.add(up.build());
    // Nav blockers: the stairwell is not walkable on floor 1; the stair body blocks floor 0 except its run.
    W.blockers[1].push({ x0: s.x0 - 0.05, x1: s.x1, z0: s.zBottom - 0.05, z1: s.zTop - 0.05 });
  },

  /* ---------- Ceiling lights & lamps ---------- */
  buildRoomLights(W) {
    for (const r of HOME.rooms) {
      const y = r.floor * CFG.FLOOR_H + 2.72;
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const fixture = new PB('lamp' + r.id);
      fixture.cyl(0.11, 0.13, 0.05, Mat.color('#f6f0e0', 0.3, 0, { emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0 }), cx, y, cz, 18);
      const fobj = fixture.build({ cast: false });
      W.floors[r.floor].group.add(fobj);
      W.lights.push({ kind: 'ceiling', floor: r.floor, room: r.id, pos: new THREE.Vector3(cx, y - 0.15, cz), color: r.floorMat === 'concrete' ? 0xfff1d6 : 0xffc98a, intensity: r.floorMat === 'concrete' ? 26 : 30, dist: 10, fixture: fobj });
    }
  },

  /* ---------- Yard, fence, gate ---------- */
  buildYard(W) {
    const lot = HOME.lot, g = W.outdoor;
    // Grass ground (big plane extends under neighbours)
    const pb = new PB('yard');
    const grass = new THREE.PlaneGeometry(lot.x1 - lot.x0, lot.z1 - lot.z0); grass.rotateX(-Math.PI / 2);
    pb.geo(grass, Mat.tex('grass', '#ffffff', 0.95, 0, 0.8), 0, this.YARD_Y, (lot.z0 + lot.z1) / 2);
    // Driveway pavers from gate to the carport, and a path to the porch
    const dw = new THREE.PlaneGeometry(HOME.gate.x1 - HOME.gate.x0, lot.z1 - HOME.bounds.z1); dw.rotateX(-Math.PI / 2);
    pb.geo(dw, Mat.tex('pavers', '#ffffff', 0.85, 0, 0.7), (HOME.gate.x0 + HOME.gate.x1) / 2, this.YARD_Y + 0.01, (HOME.bounds.z1 + lot.z1) / 2);
    const path = new THREE.PlaneGeometry(1.4, 2.0); path.rotateX(-Math.PI / 2);
    pb.geo(path, Mat.tex('pavers', '#d0c8b8', 0.85, 0, 0.7), -1.1, this.YARD_Y + 0.012, HOME.bounds.z1 + 2.2);
    const side = new THREE.PlaneGeometry(1.2, 13); side.rotateX(-Math.PI / 2);
    pb.geo(side, Mat.tex('pavers', '#bdb5a5', 0.85, 0, 0.7), -7.0, this.YARD_Y + 0.011, -2.0);
    // Porch posts; the awning is a separate object hidden when the player is near (cutaway).
    pb.box(0.1, 2.65, 0.1, Mat.color('#e9e2d2', 0.6), -2.6, -0.07, HOME.bounds.z1 + 1.45);
    pb.box(0.1, 2.65, 0.1, Mat.color('#e9e2d2', 0.6), 0.4, -0.07, HOME.bounds.z1 + 1.45);
    g.add(pb.build({ uvTile: 1.2 }));
    const aw = new PB('awning');
    aw.box(3.4, 0.08, 1.6, Mat.tex('metal', '#8a6a52', 0.6, 0.3), -1.1, 2.65, HOME.bounds.z1 + 0.75);
    W.awning = aw.build(); W.awning.userData.center = new THREE.Vector3(-1.1, 0, HOME.bounds.z1 + 0.75);
    g.add(W.awning);
    // Fence: block wall + steel top rail, gate opening at the front.
    const fence = new PB('fence');
    const block = Mat.tex('block_wall', '#ffffff', 0.9, 0, 0.6), steel = Mat.color('#2b2f33', 0.5, 0.6), cap = Mat.color('#d9d2c2', 0.7);
    const runFence = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const alongX = Math.abs(z1 - z0) < 1e-6;
      const geoBox = (w, h, d, mat, y, off = 0) => alongX ? fence.box(len, h, d, mat, cx, y, cz + off) : fence.box(d, h, len, mat, cx + off, y, cz);
      geoBox(0, 1.25, 0.2, block, this.YARD_Y);
      geoBox(0, 0.06, 0.26, cap, this.YARD_Y + 1.25);
      geoBox(0, 0.04, 0.04, steel, this.YARD_Y + 1.85);
      const n = Math.round(len / 0.18);
      for (let i = 0; i <= n; i++) {
        const t = i / n, px = U.lerp(x0, x1, t), pz = U.lerp(z0, z1, t);
        fence.box(0.02, 0.58, 0.02, steel, px, this.YARD_Y + 1.3, pz);
      }
      for (let i = 0; i <= Math.round(len / 2.5); i++) {
        const t = i / Math.round(len / 2.5), px = U.lerp(x0, x1, t), pz = U.lerp(z0, z1, t);
        fence.box(0.3, 1.45, 0.3, cap, px, this.YARD_Y, pz);
      }
      W.blockers[0].push({ x0: Math.min(x0, x1) - 0.2, x1: Math.max(x0, x1) + 0.2, z0: Math.min(z0, z1) - 0.2, z1: Math.max(z0, z1) + 0.2 });
    };
    runFence(lot.x0, lot.z0, lot.x1, lot.z0);
    runFence(lot.x0, lot.z0, lot.x0, lot.z1);
    runFence(lot.x1, lot.z0, lot.x1, lot.z1);
    runFence(lot.x0, lot.z1, HOME.gate.x0, lot.z1);
    runFence(HOME.gate.x1, lot.z1, lot.x1, lot.z1);
    // Sliding steel gate, half open
    const gx0 = HOME.gate.x0 + 2.6, gx1 = HOME.gate.x1 + 2.4;
    fence.box(gx1 - gx0, 1.7, 0.06, Mat.color('#3a3f44', 0.45, 0.7), (gx0 + gx1) / 2, this.YARD_Y + 0.05, lot.z1 + 0.25);
    for (let x = gx0; x < gx1; x += 0.12) fence.box(0.015, 1.6, 0.08, Mat.color('#262a2e', 0.5, 0.7), x, this.YARD_Y + 0.1, lot.z1 + 0.25);
    g.add(fence.build({ uvTile: 1.6 }));
    W.blockers[0].push({ x0: HOME.gate.x0 + 2.6, x1: HOME.gate.x1 + 0.2, z0: lot.z1 - 0.3, z1: lot.z1 + 0.4 });
  },

  /* ---------- Street, poles & neighbouring buildings ---------- */
  buildStreet(W) {
    const g = W.outdoor, lot = HOME.lot;
    const pb = new PB('street');
    const zS0 = lot.z1 + 0.3, zRoad0 = zS0 + 1.8, zRoad1 = zRoad0 + 8, zS1 = zRoad1 + 1.8;
    const plane = (w, d, mat, x, y, z) => { const p = new THREE.PlaneGeometry(w, d); p.rotateX(-Math.PI / 2); pb.geo(p, mat, x, y, z); };
    plane(120, zRoad1 - zRoad0, Mat.tex('asphalt', '#ffffff', 0.92, 0, 0.6), 0, this.YARD_Y - 0.08, (zRoad0 + zRoad1) / 2);
    pb.box(120, 0.14, zRoad0 - zS0, Mat.tex('pavers', '#9a958a', 0.9), 0, this.YARD_Y - 0.08, (zS0 + zRoad0) / 2);
    pb.box(120, 0.14, zS1 - zRoad1, Mat.tex('pavers', '#9a958a', 0.9), 0, this.YARD_Y - 0.08, (zRoad1 + zS1) / 2);
    // Curb paint (red-white, a Thai street staple) and lane dashes
    for (let x = -60; x < 60; x += 1) {
      const c = Math.floor(x) % 2 === 0 ? Mat.color('#c43c2c', 0.7) : Mat.color('#e9e6df', 0.7);
      pb.box(1, 0.15, 0.08, c, x + 0.5, this.YARD_Y - 0.08, zRoad0 - 0.04);
      pb.box(1, 0.15, 0.08, c, x + 0.5, this.YARD_Y - 0.08, zRoad1 + 0.04);
    }
    for (let x = -58; x < 60; x += 4) plane(2, 0.12, Mat.color('#e8e0c8', 0.8), x, this.YARD_Y - 0.075, (zRoad0 + zRoad1) / 2);
    // Ground around neighbours
    plane(120, 80, Mat.tex('concrete', '#7d7a73', 0.95, 0, 0.5), 0, this.YARD_Y - 0.1, -30);
    g.add(pb.build({ uvTile: 2.4, cast: false }));
    // Neighbouring buildings
    const rng = U.makeRng(U.hashSeed('street' + (S ? S.worldSeed : 1)));
    const sign = ['โชคชัยพาณิชย์', 'ข้าวมันไก่', 'ช.การช่าง', 'ร้านน้ำชา', 'ร้านตัดผม', 'ก๋วยเตี๋ยวเรือ', 'วัสดุภัณฑ์', 'ร้านยา', 'ซ่อมมือถือ', 'ร้านกาแฟ', 'ข้าวแกง', 'ร้านเสริมสวย'];
    let si = 0;
    // Across the street: a row of shophouses facing −z
    for (let x = -36; x < 36; x += 4.2) {
      const b = this.shophouse(rng, sign[si++ % sign.length]);
      b.position.set(x + 2.1, this.YARD_Y - 0.08, zS1 + 0.2); b.rotation.y = Math.PI;
      g.add(b);
    }
    // Same side: townhouses left & right of our lot, facing +z
    for (const x of [-30, -25.8, -21.6, -17.4, -13.2, 13.2, 17.4, 21.6, 25.8, 30]) {
      const b = rng() < 0.5 ? this.shophouse(rng, sign[si++ % sign.length]) : this.townhouse(rng);
      b.position.set(x + (x < 0 ? -0.1 : 0.1), this.YARD_Y, lot.z1 - 1.0); g.add(b);
    }
    // Back neighbours (behind the rear fence)
    for (let x = -24; x <= 24; x += 8) { const b = this.townhouse(rng, 2); b.position.set(x, this.YARD_Y, lot.z0 - 12.5); b.rotation.y = Math.PI; g.add(b); }
    // Power poles with sagging cables + street lamps
    const poles = [];
    for (let x = -34; x <= 34; x += 12) {
      const p = this.powerPole(rng, x === -10 || x === 26);
      p.position.set(x, this.YARD_Y - 0.08, zS0 + 0.7); g.add(p); poles.push(new THREE.Vector3(x, 0, zS0 + 0.7));
      W.streetLamps = W.streetLamps || [];
      W.streetLamps.push(new THREE.Vector3(x + 1.6, this.YARD_Y + 6.2, zS0 + 1.6));
    }
    g.add(this.cables(poles));
    // Street trees
    for (const x of [-20, -2, 14, 32]) { const t = AssetRegistry.create('prop.potted_tree', { seed: 'st' + x }); t.scale.setScalar(2.6); t.position.set(x, this.YARD_Y - 0.08, zS1 - 0.6); g.add(t); }
  },
  signTexture(text, bg, fg) {
    const key = 'sign:' + text + bg;
    if (Tex.cache.has(key)) return Tex.cache.get(key);
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 84, 512, 12);
    ctx.fillStyle = fg; ctx.font = 'bold 54px "Noto Sans Thai", Tahoma, "Leelawadee UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 46);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Tex.anisotropy;
    Tex.cache.set(key, t);
    return t;
  },
  shophouse(rng, signText) {
    const pb = new PB('sh' + signText + rng());
    const w = 4.0, d = 12, floors = 3 + (rng() < 0.35 ? 1 : 0), fh = 3.2;
    const paint = U.pick(rng, ['#d9cba8', '#cfd6c4', '#e2c9a6', '#c9cfd6', '#e6dccb', '#d6b9a0']);
    const wall = Mat.tex('ext_wall', paint, 0.9, 0, 0.6);
    pb.box(w, floors * fh, d, wall, 0, 0, -d / 2);
    // Ground floor: rolling shutter + front slab
    pb.box(w - 0.4, 2.8, 0.1, Mat.tex('metal', '#8a9096', 0.5, 0.6), 0, 0, 0.02);
    for (let y = 0.1; y < 2.8; y += 0.12) pb.box(w - 0.4, 0.015, 0.03, Mat.color('#5f656b', 0.5, 0.6), 0, y, 0.08);
    // Upper floors: windows with frames and AC units
    for (let f = 1; f < floors; f++) {
      const y = f * fh + 0.9;
      pb.box(w - 1.2, 1.4, 0.05, Mat.color('#2c3a44', 0.1, 0.4), 0, y, 0.01);
      pb.box(w - 1.1, 0.08, 0.15, Mat.color('#e6e2d8', 0.6), 0, y - 0.08, 0.05);
      for (let i = -1; i <= 1; i++) pb.box(0.04, 1.4, 0.06, Mat.color('#6b6f72', 0.5, 0.5), i * (w - 1.2) / 2.2, y, 0.03);
      if (rng() < 0.7) pb.box(0.8, 0.5, 0.3, Mat.color('#e9e9e4', 0.5), (rng() - 0.5) * 2, y - 0.6, 0.18, 0.02);
      if (rng() < 0.4) for (let k = 0; k < 4; k++) pb.box(0.3, 0.4, 0.01, M.fabric(U.pick(rng, ['#c43c2c', '#2f63a8', '#f2c230', '#e9e6df'])), -1.2 + k * 0.4, y + 1.6, 0.4); // laundry
    }
    // Floor ledges
    for (let f = 1; f <= floors; f++) pb.box(w, 0.15, 0.25, Mat.color('#c4bba8', 0.8), 0, f * fh - 0.15, 0.1);
    // Sign board
    const signMat = new THREE.MeshStandardMaterial({ map: this.signTexture(signText, U.pick(rng, ['#b8242a', '#1f4f8a', '#e0b23c', '#2f7a3a', '#f2efe6']), '#ffffff'), roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, emissiveMap: null });
    const sg = new THREE.PlaneGeometry(w - 0.3, 0.6);
    pb.geo(sg, signMat, 0, 3.0, 0.16);
    // Awning
    pb.box(w, 0.06, 1.2, Mat.color(U.pick(rng, ['#2f63a8', '#c43c2c', '#3a6a3a', '#7a7a7a']), 0.6), 0, 2.85, 0.6, 0, [0.18, 0, 0]);
    return pb.build({ uvTile: 2.0 });
  },
  townhouse(rng, floorsOverride) {
    const pb = new PB('th' + rng());
    const w = 4.0, d = 10, floors = floorsOverride || 2, fh = 3.0;
    const wall = Mat.tex('ext_wall', U.pick(rng, ['#e8dcc4', '#d9e0d0', '#efe4d6', '#d7dbe0']), 0.9, 0, 0.6);
    pb.box(w, floors * fh, d, wall, 0, 0, -d / 2 - 1);
    pb.box(w + 0.4, 0.2, d + 0.6, Mat.tex('roof_tile', '#ffffff', 0.8), 0, floors * fh, -d / 2 - 1);
    for (let f = 0; f < floors; f++) {
      pb.box(1.4, 1.2, 0.05, Mat.color('#273540', 0.1, 0.4), -0.8, f * fh + 1.0, -1 + 0.01);
      pb.box(0.9, 2.1, 0.05, f === 0 ? Mat.color('#6b4a32', 0.6) : Mat.color('#273540', 0.1, 0.4), 1.1, f * fh, -1 + 0.01);
    }
    pb.box(w, 1.6, 0.15, Mat.tex('block_wall', '#ffffff', 0.9), 0, 0, 0.6); // front wall
    return pb.build({ uvTile: 2.0 });
  },
  powerPole(rng, transformer) {
    const pb = new PB('pole' + rng());
    const conc = Mat.color('#a9a59c', 0.85), dark = Mat.color('#2a2a2a', 0.6, 0.4);
    pb.cyl(0.11, 0.17, 9, conc, 0, 0, 0, 10);
    for (const y of [7.6, 8.4]) pb.box(1.8, 0.1, 0.1, conc, 0, y, 0);
    for (const x of [-0.8, -0.3, 0.3, 0.8]) pb.cyl(0.04, 0.05, 0.14, Mat.color('#e9e2d2', 0.3), x, 8.5, 0, 8);
    if (transformer) { pb.cyl(0.35, 0.35, 1.0, Mat.color('#7a8086', 0.5, 0.6), 0, 6.0, 0.4, 14); pb.cyl(0.35, 0.35, 1.0, Mat.color('#7a8086', 0.5, 0.6), 0, 6.0, -0.4, 14); }
    // Lamp arm towards the road
    pb.box(0.06, 0.06, 1.8, dark, 0, 6.3, 0.9);
    pb.box(0.3, 0.1, 0.5, dark, 0, 6.2, 1.75);
    pb.box(0.24, 0.02, 0.4, Mat.get('streetlampGlow', () => new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color('#ffb066'), emissiveIntensity: 0 })), 0, 6.18, 1.75);
    // Messy service cable coils (very Thai)
    for (let i = 0; i < 3; i++) pb.geo(new THREE.TorusGeometry(0.35 + i * 0.05, 0.02, 4, 16).rotateY(rng() * 2), dark, 0, 5.2 + i * 0.25, 0);
    return pb.build();
  },
  cables(poles) {
    const pts = [];
    const heights = [8.55, 8.55, 8.55, 8.55, 7.65, 7.45, 7.3, 6.9];
    const offs = [-0.8, -0.3, 0.3, 0.8, -0.6, 0.0, 0.5, 0.2];
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], b = poles[i + 1];
      for (let k = 0; k < heights.length; k++) {
        const sag = 0.35 + (k % 3) * 0.25 + (k > 3 ? 0.35 : 0);
        let prev = null;
        for (let t = 0; t <= 1.0001; t += 0.1) {
          const p = new THREE.Vector3(U.lerp(a.x, b.x, t), heights[k] + HomeWorld.YARD_Y - 0.08 - Math.sin(t * Math.PI) * sag, a.z + offs[k] * 0.4);
          if (prev) pts.push(prev, p);
          prev = p;
        }
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x141414 }));
  },
};
