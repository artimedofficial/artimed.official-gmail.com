/* ==========================================================================
   02 · UTILITIES, RNG, EVENT BUS
   ========================================================================== */

const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  smooth: (t) => t * t * (3 - 2 * t),
  /** Safe number: finite or default, clamped. Used by the save sanitizer. */
  num(v, d, lo = -Infinity, hi = Infinity) {
    return typeof v === 'number' && isFinite(v) ? U.clamp(v, lo, hi) : d;
  },
  /** mulberry32 — small, fast, deterministic. */
  makeRng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  _uid: 1,
  uid() { return (U._uid++).toString(36) + '-' + ((Math.random() * 1e6) | 0).toString(36); },
  money(v) { return '฿' + Math.round(v).toLocaleString('en-US'); },
  kg(v) { return (Math.round(v * 10) / 10).toFixed(1) + ' กก.'; },
  pad2: (n) => String(n).padStart(2, '0'),
  /** Absolute game minute → {day, hour, minute, hhmm}. Day 0 starts at minute 0. */
  timeOf(min) {
    const day = Math.floor(min / 1440);
    const m = Math.floor(min - day * 1440);
    const hour = Math.floor(m / 60), minute = m % 60;
    return { day, hour, minute, dayMin: m, hhmm: U.pad2(hour) + ':' + U.pad2(minute) };
  },
  /** Human duration in Thai from game minutes. */
  dur(mins) {
    if (!isFinite(mins)) return '∞';
    if (mins >= 2880) return (mins / 1440).toFixed(mins >= 14400 ? 0 : 1) + ' วัน';
    if (mins >= 90) return (mins / 60).toFixed(1) + ' ชม.';
    return Math.max(0, Math.round(mins)) + ' นาที';
  },
  /** Tiny DOM builder: el('div.cls#id', {attrs}, ...children) */
  el(sel, attrs, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const node = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') node.classList.add(part.slice(1)); else node.id = part.slice(1);
    }
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'on') for (const ev in v) node.addEventListener(ev, v[ev]);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k in node && k !== 'list') node[k] = v;
      else node.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      node.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return node;
  },
  $(sel, root = document) { return root.querySelector(sel); },
  deepClone: (o) => JSON.parse(JSON.stringify(o)),
  /**
   * Copy keys missing in target from template (recurse into plain objects only).
   * A value whose shape contradicts the template (object vs array vs scalar) is replaced.
   */
  deepFill(target, tmpl) {
    const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    for (const k in tmpl) {
      const tv = tmpl[k], cur = target[k];
      if (!(k in target) || cur === undefined) target[k] = U.deepClone(tv === undefined ? null : tv);
      else if (isObj(tv)) { if (isObj(cur)) U.deepFill(cur, tv); else target[k] = U.deepClone(tv); }
      else if (Array.isArray(tv) && !Array.isArray(cur)) target[k] = U.deepClone(tv);
    }
    return target;
  },
  pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; },
  range(rng, a, b) { return a + (b - a) * rng(); },
};

/** Seeded RNG streams (§3): world/loot fixed per world seed, events per life, combat. */
const RNG = {
  streams: {},
  init(name, seed, calls = 0) {
    const fn = U.makeRng(seed);
    for (let i = 0; i < calls; i++) fn();
    this.streams[name] = { seed, calls, fn };
  },
  next(name) {
    const s = this.streams[name];
    if (!s) { this.init(name, U.hashSeed(name)); return this.next(name); }
    s.calls++;
    return s.fn();
  },
  /** Local deterministic generator that never consumes a stream (e.g. per-container loot). */
  local(key) { return U.makeRng(U.hashSeed(key)); },
  snapshot() {
    const o = {};
    for (const k in this.streams) o[k] = { seed: this.streams[k].seed, calls: this.streams[k].calls };
    return o;
  },
  restore(snap) {
    this.streams = {};
    for (const k in snap || {}) {
      const v = snap[k];
      if (v && isFinite(v.seed)) this.init(k, v.seed >>> 0, U.num(v.calls, 0, 0, 1e9) | 0);
    }
  },
};

/** Event bus — decouples systems from UI. */
const Bus = {
  map: new Map(),
  on(ev, fn) { if (!this.map.has(ev)) this.map.set(ev, new Set()); this.map.get(ev).add(fn); return () => this.map.get(ev).delete(fn); },
  emit(ev, data) {
    const set = this.map.get(ev);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(data); } catch (e) { console.error('[Bus:' + ev + ']', e); }
    }
  },
};
