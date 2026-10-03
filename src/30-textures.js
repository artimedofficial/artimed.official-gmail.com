/* ==========================================================================
   30 · PROCEDURAL TEXTURES & MATERIAL LIBRARY
   All surface detail is generated on canvas at load time (no image files).
   Each texture key is generated once and cached. Normal maps are derived
   from a height canvas with a Sobel filter.
   ========================================================================== */

const Tex = {
  cache: new Map(),
  maxSize: 1024,
  anisotropy: 4,

  canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; },

  /** Tileable value noise generator (period = grid cells). */
  noise(rng, period) {
    const g = new Float32Array(period * period);
    for (let i = 0; i < g.length; i++) g[i] = rng();
    const at = (x, y) => g[((y % period + period) % period) * period + ((x % period + period) % period)];
    return (u, v) => { // u,v in [0,1)
      const x = u * period, y = v * period;
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const fx = U.smooth(x - x0), fy = U.smooth(y - y0);
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      return U.lerp(U.lerp(a, b, fx), U.lerp(c, d, fx), fy);
    };
  },
  fbm(rng, base = 4, oct = 4) {
    const layers = [];
    for (let i = 0; i < oct; i++) layers.push(Tex.noise(rng, base << i));
    return (u, v) => { let s = 0, amp = 0.5, tot = 0; for (const n of layers) { s += n(u, v) * amp; tot += amp; amp *= 0.5; } return s / tot; };
  },

  /** Paint per-pixel with fn(u,v) → [r,g,b] (0..255) and optional height out. */
  pixels(size, fn, heightOut) {
    const c = Tex.canvas(size), ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size), d = img.data;
    const h = heightOut ? new Float32Array(size * size) : null;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const o = fn(x / size, y / size, x, y);
      const i = (y * size + x) * 4;
      d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = 255;
      if (h) h[y * size + x] = o[3] != null ? o[3] : 0.5;
    }
    ctx.putImageData(img, 0, 0);
    if (heightOut) heightOut.h = h;
    return c;
  },
  normalFrom(h, size, strength = 2) {
    const c = Tex.canvas(size), ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size), d = img.data;
    const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      d[i] = (-dx / len * 0.5 + 0.5) * 255; d[i + 1] = (dy / len * 0.5 + 0.5) * 255; d[i + 2] = (1 / len * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },
  toTexture(canvas, srgb = true, repeat = 1) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = Tex.anisotropy;
    t.needsUpdate = true;
    return t;
  },
  /** Get {map, normalMap, roughnessMap?} for a key (cached). */
  get(key) {
    if (Tex.cache.has(key)) return Tex.cache.get(key);
    const gen = TEX_GEN[key];
    if (!gen) throw new Error('Unknown texture ' + key);
    const size = Math.min(gen.size || 512, Tex.maxSize);
    const rng = U.makeRng(U.hashSeed('tex:' + key));
    const hOut = {};
    const color = Tex.pixels(size, gen.fn(rng, size), hOut);
    const out = { map: Tex.toTexture(color, true) };
    if (gen.normal) out.normalMap = Tex.toTexture(Tex.normalFrom(hOut.h, size, gen.normal), false);
    Tex.cache.set(key, out);
    return out;
  },
};

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/** Texture generators. fn(rng,size) returns per-pixel (u,v) → [r,g,b,height]. */
const TEX_GEN = {
  // Laminate planks: 6 planks across, staggered joints, grain streaks. 1 tile = 1.2 m.
  wood_floor: { size: 512, normal: 3, fn(rng) {
    const grain = Tex.fbm(rng, 4, 4), fine = Tex.noise(rng, 64);
    const plankTint = []; for (let i = 0; i < 6; i++) plankTint.push([0.8 + rng() * 0.35, rng() * 4]);
    const base = rgb('#9a6a42'), dark = rgb('#5e3b22');
    return (u, v) => {
      const pi = Math.floor(u * 6), pu = u * 6 - pi;
      const off = plankTint[pi][1];
      const pv = (v * 2 + off) % 1;
      const seam = pu < 0.025 || pu > 0.975 || pv < 0.012 ? 1 : 0;
      const g = grain(u * 0.25 + pi * 0.13, v * 3 + off) * 0.6 + fine(u * 0.2, v * 6) * 0.4;
      const ring = 0.5 + 0.5 * Math.sin((g * 18 + pu * 2) * Math.PI);
      let c = mix3(base, dark, ring * 0.45 + g * 0.2);
      c = mul3(c, plankTint[pi][0]);
      if (seam) c = mul3(c, 0.45);
      return [c[0], c[1], c[2], seam ? 0.2 : 0.55 + ring * 0.05];
    };
  } },
  // Ceramic floor tile 4×4 per texture (each ≈ 0.3 m when repeat = 1 per 1.2 m)
  tile: { size: 512, normal: 4, fn(rng) {
    const n = Tex.fbm(rng, 8, 3);
    const tint = []; for (let i = 0; i < 16; i++) tint.push(0.92 + rng() * 0.1);
    const base = rgb('#d9d2c3'), grout = rgb('#8e877a');
    return (u, v) => {
      const tx = Math.floor(u * 4), ty = Math.floor(v * 4);
      const fu = u * 4 - tx, fv = v * 4 - ty;
      const edge = Math.min(fu, fv, 1 - fu, 1 - fv);
      if (edge < 0.02) return [...grout, 0.1];
      const k = tint[ty * 4 + tx] * (0.95 + n(u, v) * 0.1);
      const c = mul3(base, k);
      return [c[0], c[1], c[2], edge < 0.035 ? 0.4 : 0.6];
    };
  } },
  bathtile: { size: 512, normal: 4, fn(rng) {
    const n = Tex.noise(rng, 32);
    const base = rgb('#cfe1e3'), alt = rgb('#9cc3c9'), grout = rgb('#e8ece9');
    return (u, v) => {
      const tx = Math.floor(u * 8), ty = Math.floor(v * 8);
      const fu = u * 8 - tx, fv = v * 8 - ty;
      if (Math.min(fu, fv, 1 - fu, 1 - fv) < 0.04) return [...grout, 0.2];
      const c = mul3((tx + ty) % 5 === 0 ? alt : base, 0.95 + n(u, v) * 0.08);
      return [c[0], c[1], c[2], 0.6];
    };
  } },
  concrete: { size: 512, normal: 1.5, fn(rng) {
    const n = Tex.fbm(rng, 4, 5), spots = Tex.noise(rng, 48);
    const base = rgb('#8d8b86'), stain = rgb('#5f5a52');
    return (u, v) => {
      const k = n(u, v), s = spots(u, v);
      let c = mix3(base, stain, Math.max(0, k - 0.55) * 1.6);
      c = mul3(c, 0.9 + s * 0.2);
      return [c[0], c[1], c[2], k * 0.6 + s * 0.2];
    };
  } },
  // Neutral plaster (tinted by material colour) with subtle trowel noise.
  plaster: { size: 256, normal: 0.8, fn(rng) {
    const n = Tex.fbm(rng, 4, 4);
    return (u, v) => { const k = 225 + (n(u, v) - 0.5) * 30; return [k, k, k, n(u, v)]; };
  } },
  // Exterior render: grime streaks running down, darker near the ground (v=1 bottom).
  ext_wall: { size: 512, normal: 1.2, fn(rng) {
    const n = Tex.fbm(rng, 4, 4), streak = Tex.noise(rng, 48);
    return (u, v) => {
      const s = streak(u * 1, v * 0.05);
      let k = 228 + (n(u, v) - 0.5) * 26 - Math.max(0, s - 0.55) * 90 * v - Math.pow(v, 6) * 60;
      return [k, k * 0.985, k * 0.96, n(u, v)];
    };
  } },
  grass: { size: 512, normal: 2, fn(rng) {
    const n = Tex.fbm(rng, 8, 4), blade = Tex.noise(rng, 128), dirt = Tex.noise(rng, 6);
    const g1 = rgb('#3f6b2a'), g2 = rgb('#6d8f3a'), soil = rgb('#6b5a3e');
    return (u, v) => {
      const k = n(u, v), b = blade(u, v), d = dirt(u, v);
      let c = mix3(g1, g2, k);
      c = mix3(c, soil, Math.max(0, d - 0.62) * 2.2);
      c = mul3(c, 0.8 + b * 0.35);
      return [c[0], c[1], c[2], b * 0.7 + k * 0.3];
    };
  } },
  pavers: { size: 512, normal: 3, fn(rng) {
    const n = Tex.fbm(rng, 6, 3);
    const tint = []; for (let i = 0; i < 64; i++) tint.push(0.85 + rng() * 0.25);
    const base = rgb('#a29c90');
    return (u, v) => {
      const row = Math.floor(v * 8), off = row % 2 ? 0.5 : 0;
      const col = Math.floor(u * 4 + off);
      const fu = (u * 4 + off) % 1, fv = (v * 8) % 1;
      if (fu < 0.03 || fv < 0.06) return [70, 66, 58, 0.1];
      const c = mul3(base, tint[(row * 4 + col) % 64] * (0.9 + n(u, v) * 0.2));
      return [c[0], c[1], c[2], 0.6];
    };
  } },
  asphalt: { size: 512, normal: 1.5, fn(rng) {
    const n = Tex.fbm(rng, 8, 4), grit = Tex.noise(rng, 256), patch = Tex.noise(rng, 4);
    return (u, v) => {
      const k = 52 + n(u, v) * 22 + (grit(u, v) - 0.5) * 30 - Math.max(0, patch(u, v) - 0.6) * 40;
      return [k, k, k * 1.03, grit(u, v)];
    };
  } },
  fabric: { size: 256, normal: 2, fn(rng) {
    const n = Tex.noise(rng, 16);
    return (u, v) => {
      const weave = (Math.sin(u * 256 * Math.PI) * Math.sin(v * 256 * Math.PI)) * 0.5 + 0.5;
      const k = 200 + weave * 30 + (n(u, v) - 0.5) * 30;
      return [k, k, k, weave];
    };
  } },
  metal: { size: 256, normal: 0.6, fn(rng) {
    const n = Tex.fbm(rng, 4, 4), brush = Tex.noise(rng, 256);
    const rust = rgb('#7a4a2a');
    return (u, v) => {
      const k = 190 + (brush(u * 0.02, v) - 0.5) * 30;
      let c = [k, k, k * 1.02];
      c = mix3(c, rust, Math.max(0, n(u, v) - 0.68) * 2.5);
      return [c[0], c[1], c[2], brush(u * 0.02, v)];
    };
  } },
  block_wall: { size: 512, normal: 2.5, fn(rng) {
    const n = Tex.fbm(rng, 6, 4), moss = Tex.noise(rng, 8);
    const base = rgb('#cfc8b8'), green = rgb('#5d6b3e');
    return (u, v) => {
      const row = Math.floor(v * 6), off = row % 2 ? 0.5 : 0;
      const fu = (u * 3 + off) % 1, fv = (v * 6) % 1;
      if (fu < 0.015 || fv < 0.03) return [130, 124, 112, 0.2];
      let c = mul3(base, 0.88 + n(u, v) * 0.2);
      c = mix3(c, green, Math.max(0, moss(u, v) - 0.55) * 1.4 * v);
      return [c[0], c[1], c[2], 0.6];
    };
  } },
  roof_tile: { size: 512, normal: 3, fn(rng) {
    const n = Tex.fbm(rng, 6, 3);
    const base = rgb('#7d3b2a');
    return (u, v) => {
      const fv = (v * 10) % 1;
      const fu = (u * 8 + (Math.floor(v * 10) % 2) * 0.5) % 1;
      const shade = 0.75 + 0.25 * Math.sin(fu * Math.PI);
      const c = mul3(base, shade * (0.8 + n(u, v) * 0.35) * (fv < 0.12 ? 0.6 : 1));
      return [c[0], c[1], c[2], shade * (fv < 0.12 ? 0.3 : 1)];
    };
  } },
  bark: { size: 256, normal: 4, fn(rng) {
    const n = Tex.fbm(rng, 4, 5);
    return (u, v) => { const k = n(u * 4, v * 0.5); const c = mul3(rgb('#5a4430'), 0.6 + k * 0.8); return [c[0], c[1], c[2], k]; };
  } },
  rug: { size: 512, normal: 1.5, fn(rng) {
    const n = Tex.noise(rng, 64);
    const red = rgb('#8a2f2a'), cream = rgb('#e2d2b0'), navy = rgb('#2c3a55');
    return (u, v) => {
      const bu = Math.min(u, 1 - u), bv = Math.min(v, 1 - v), b = Math.min(bu, bv);
      let c = red;
      if (b < 0.04) c = navy; else if (b < 0.07) c = cream; else if (b < 0.1) c = red;
      else {
        const dx = u - 0.5, dy = v - 0.5;
        const diamond = Math.abs(dx) + Math.abs(dy);
        if ((diamond * 14) % 2 < 0.35) c = cream;
        else if (diamond < 0.12) c = navy;
      }
      c = mul3(c, 0.85 + n(u, v) * 0.25);
      return [c[0], c[1], c[2], n(u, v)];
    };
  } },
  leaves: { size: 256, normal: 3, fn(rng) {
    const n = Tex.noise(rng, 24), m = Tex.noise(rng, 6);
    return (u, v) => {
      const k = n(u, v), l = m(u, v);
      const c = mix3(rgb('#24461f'), rgb('#5f8d33'), k * 0.8 + l * 0.3);
      return [c[0], c[1], c[2], k];
    };
  } },
};

/** Shared material library. Keys are stable so geometry merging can group by material. */
const Mat = {
  cache: new Map(),
  get(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key);
  },
  /** Plain coloured PBR material. */
  color(hex, rough = 0.7, metal = 0, extra) {
    return Mat.get('c:' + hex + ':' + rough + ':' + metal + (extra ? JSON.stringify(extra) : ''), () =>
      new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(hex), roughness: rough, metalness: metal }, extra || {})));
  },
  /** Textured material; repeat in metres handled by geometry UVs (world-scaled). */
  tex(texKey, hex = '#ffffff', rough = 0.8, metal = 0, normalScale = 0.6) {
    return Mat.get('t:' + texKey + ':' + hex + ':' + rough + ':' + metal, () => {
      const t = Tex.get(texKey);
      const m = new THREE.MeshStandardMaterial({ map: t.map, color: new THREE.Color(hex), roughness: rough, metalness: metal });
      if (t.normalMap) { m.normalMap = t.normalMap; m.normalScale = new THREE.Vector2(normalScale, normalScale); }
      return m;
    });
  },
  glass() {
    return Mat.get('glass', () => new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false }));
  },
  emissive(hex, intensity = 1) {
    return Mat.get('e:' + hex + ':' + intensity, () => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(hex), emissiveIntensity: intensity, roughness: 0.6 }));
  },
};

/**
 * Box-projected world UVs so tiling textures keep a constant scale (metres per tile)
 * regardless of mesh size. Applies to any non-indexed or indexed BufferGeometry.
 */
function worldUV(geo, tile = 1.2, matrix) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const nm = matrix ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    if (matrix) { v.applyMatrix4(matrix); n.applyMatrix3(nm).normalize(); }
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    let a, b;
    if (ay >= ax && ay >= az) { a = v.x; b = v.z; } else if (ax >= az) { a = v.z; b = -v.y; } else { a = v.x; b = -v.y; }
    uv[i * 2] = a / tile; uv[i * 2 + 1] = b / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
