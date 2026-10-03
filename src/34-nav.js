/* ==========================================================================
   34 · NAVIGATION — per-floor walkability grid, A* with a stair link,
   line-of-sight smoothing. Blockers come from HomeWorld + furniture.
   ========================================================================== */

const Nav = {
  cell: CFG.NAV_CELL,
  radius: 0.22,
  grids: [],     // [{x0, z0, nx, nz, block: Uint8Array}]
  stair: null,   // {bottom:{x,z}, top:{x,z}}

  build(W, furniture) {
    const b = HOME.bounds, lot = HOME.lot;
    const areas = [
      { x0: lot.x0 - 0.5, x1: lot.x1 + 0.5, z0: lot.z0 - 0.5, z1: lot.z1 + 2.2 },
      { x0: b.x0 - 0.25, x1: b.x1 + 0.25, z0: b.z0 - 0.25, z1: b.z1 + 0.25 },
    ];
    this.grids = areas.map((a, floor) => {
      const nx = Math.ceil((a.x1 - a.x0) / this.cell), nz = Math.ceil((a.z1 - a.z0) / this.cell);
      const g = { floor, x0: a.x0, z0: a.z0, nx, nz, block: new Uint8Array(nx * nz) };
      const rects = W.blockers[floor].slice();
      for (const f of furniture) {
        if (f.floor !== floor) continue;
        const def = FURNITURE[f.type];
        if (def.walk || f.onTop != null) continue;
        let [w, d] = def.size;
        if (f.type === 'mango_tree') { w = 0.6; d = 0.6; }
        if (f.rot % 2) [w, d] = [d, w];
        rects.push({ x0: f.x - w / 2, x1: f.x + w / 2, z0: f.z - d / 2, z1: f.z + d / 2 });
      }
      if (floor === 0) {
        const s = HOME.stairs;
        rects.push({ x0: s.x0, x1: s.x1, z0: s.zBottom, z1: s.zTop + 0.05 });
      }
      const r = this.radius;
      for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
        const x = g.x0 + (ix + 0.5) * this.cell, z = g.z0 + (iz + 0.5) * this.cell;
        let bl = false;
        for (const q of rects) if (x > q.x0 - r && x < q.x1 + r && z > q.z0 - r && z < q.z1 + r) { bl = true; break; }
        g.block[iz * nx + ix] = bl ? 1 : 0;
      }
      return g;
    });
    const s = HOME.stairs, mx = (s.x0 + s.x1) / 2;
    this.stair = { bottom: { x: mx, z: s.zBottom - 0.3 }, top: { x: mx, z: s.zTop + 0.3 } };
    // Make sure the stair landings are walkable.
    for (const [floor, p] of [[0, this.stair.bottom], [1, this.stair.top]]) {
      const c = this.cellOf(floor, p.x, p.z); if (c) this.grids[floor].block[c.i] = 0;
    }
  },
  cellOf(floor, x, z) {
    const g = this.grids[floor]; if (!g) return null;
    const ix = Math.floor((x - g.x0) / this.cell), iz = Math.floor((z - g.z0) / this.cell);
    if (ix < 0 || iz < 0 || ix >= g.nx || iz >= g.nz) return null;
    return { ix, iz, i: iz * g.nx + ix };
  },
  center(floor, ix, iz) { const g = this.grids[floor]; return { x: g.x0 + (ix + 0.5) * this.cell, z: g.z0 + (iz + 0.5) * this.cell }; },
  walkable(floor, x, z) { const c = this.cellOf(floor, x, z); return !!c && !this.grids[floor].block[c.i]; },
  /** Nearest walkable cell centre to (x,z) within maxR metres. */
  nearestWalkable(floor, x, z, maxR = 2.5) {
    const c = this.cellOf(floor, x, z); const g = this.grids[floor];
    if (!c) return null;
    if (!g.block[c.i]) return this.center(floor, c.ix, c.iz);
    const rMax = Math.ceil(maxR / this.cell);
    let best = null, bd = Infinity;
    for (let r = 1; r <= rMax; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const ix = c.ix + dx, iz = c.iz + dz;
        if (ix < 0 || iz < 0 || ix >= g.nx || iz >= g.nz || g.block[iz * g.nx + ix]) continue;
        const p = this.center(floor, ix, iz), d = Math.hypot(p.x - x, p.z - z);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) return best;
    }
    return null;
  },
  /** Grid A* on one floor. Returns array of {x,z} or null. */
  astar(floor, sx, sz, tx, tz) {
    const g = this.grids[floor];
    const s = this.cellOf(floor, sx, sz), t = this.cellOf(floor, tx, tz);
    if (!s || !t) return null;
    if (g.block[t.i]) return null;
    const N = g.nx * g.nz;
    const gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open = new MinHeap();
    const h = (i) => { const ix = i % g.nx, iz = (i / g.nx) | 0; return Math.hypot(ix - t.ix, iz - t.iz); };
    gs[s.i] = 0; open.push(s.i, h(s.i));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false, iter = 0;
    while (open.size && iter++ < 40000) {
      const cur = open.pop();
      if (cur === t.i) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % g.nx, cz = (cur / g.nx) | 0;
      for (const [dx, dz, c] of dirs) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= g.nx || nz >= g.nz) continue;
        const ni = nz * g.nx + nx;
        if (g.block[ni] || closed[ni]) continue;
        if (dx && dz && (g.block[cz * g.nx + nx] || g.block[nz * g.nx + cx])) continue; // no corner cutting
        const ng = gs[cur] + c;
        if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; open.push(ni, ng + h(ni)); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let i = t.i; i !== -1; i = from[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map((i) => this.center(floor, i % g.nx, (i / g.nx) | 0));
    pts[pts.length - 1] = { x: tx, z: tz };
    pts[0] = { x: sx, z: sz };
    return this.smooth(floor, pts);
  },
  /** Line-of-sight check sampling every quarter cell. */
  los(floor, a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / (this.cell * 0.4));
    for (let i = 1; i < n; i++) { const t = i / n; if (!this.walkable(floor, U.lerp(a.x, b.x, t), U.lerp(a.z, b.z, t))) return false; }
    return true;
  },
  smooth(floor, pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.los(floor, pts[i], pts[j])) j--;
      out.push(pts[j]); i = j;
    }
    return out;
  },
  /**
   * Full path possibly crossing floors via the stair link.
   * Returns [{x,z,floor,stair?}] or null.
   */
  path(from, to) {
    const tgt = this.walkable(to.floor, to.x, to.z) ? { x: to.x, z: to.z } : this.nearestWalkable(to.floor, to.x, to.z);
    if (!tgt) return null;
    const startOk = this.walkable(from.floor, from.x, from.z) ? from : Object.assign({ floor: from.floor }, this.nearestWalkable(from.floor, from.x, from.z) || from);
    if (from.floor === to.floor) {
      const p = this.astar(from.floor, startOk.x, startOk.z, tgt.x, tgt.z);
      return p && p.map((q) => ({ x: q.x, z: q.z, floor: from.floor }));
    }
    const up = to.floor > from.floor;
    const a = up ? this.stair.bottom : this.stair.top, b = up ? this.stair.top : this.stair.bottom;
    const p1 = this.astar(from.floor, startOk.x, startOk.z, a.x, a.z);
    const p2 = this.astar(to.floor, b.x, b.z, tgt.x, tgt.z);
    if (!p1 || !p2) return null;
    return [...p1.map((q) => ({ x: q.x, z: q.z, floor: from.floor })), { x: b.x, z: b.z, floor: to.floor, stair: true }, ...p2.slice(1).map((q) => ({ x: q.x, z: q.z, floor: to.floor }))];
  },
};

/** Binary min-heap keyed by priority. */
class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    const k = this.k, p = this.p; k.push(key); p.push(pri);
    let i = k.length - 1;
    while (i > 0) { const j = (i - 1) >> 1; if (p[j] <= p[i]) break; [k[i], k[j]] = [k[j], k[i]]; [p[i], p[j]] = [p[j], p[i]]; i = j; }
  }
  pop() {
    const k = this.k, p = this.p, top = k[0];
    const lk = k.pop(), lp = p.pop();
    if (k.length) {
      k[0] = lk; p[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[i], k[m]] = [k[m], k[i]]; [p[i], p[m]] = [p[m], p[i]]; i = m;
      }
    }
    return top;
  }
}
