/* ==========================================================================
   22 · STATE, PROFILE, SAVE / LOAD / EXPORT / IMPORT, SANITIZER
   Two data sets (§12): Run save (current life) and Profile (lifetime).
   ========================================================================== */

let S = null;   // current run state (null on the main menu)
let P = null;   // lifetime profile (always loaded)

function createProfile() {
  return {
    schema: CFG.SCHEMA_PROFILE,
    worldSeed: (Math.random() * 2 ** 32) >>> 0,   // fixed for every life → same loot layout
    skills: {},                                     // best {lv, xp} per skill
    lives: [],                                      // [{n, bg, days, cause, endedAt}]
    stats: { totalDays: 0, deaths: 0 },
    settings: {
      quality: null, master: 0.8, music: 0.5, sfx: 0.8, mute: false,
      fps: false, autoDraw: true, edgeScroll: true,
      smartLoot: ['food', 'drink', 'medical', 'tool', 'material', 'fuel', 'electric', 'bag'],
    },
  };
}

function createRun({ bg, difficulty, name }) {
  const lifeNo = (P.lives.length || 0) + 1;
  const lifeSeed = U.hashSeed('life' + lifeNo + '|' + Date.now());
  const st = {
    schema: CFG.SCHEMA_RUN,
    build: BUILD,
    life: lifeNo,
    createdAt: Date.now(),
    worldSeed: P.worldSeed,
    lifeSeed,
    rng: {},
    difficulty: DIFFICULTY[difficulty] ? difficulty : 'standard',
    time: { min: CFG.START_MINUTE, speedIdx: 2 },
    cash: CFG.START_CASH,
    chars: [newCharacter({ name, bg, profileSkills: P.skills })],
    active: 0,
    home: { furniture: [], lightsOn: true, piles: [] },
    locs: {},
    food: { reserve: [], exclude: [] },
    deliveries: [],
    flags: { outbreak: false },
    log: [],
    scene: 'home',
  };
  st.home.gas = 70;
  st.home.loads = {};
  st.home.furniture = buildHomeFurniture(st.worldSeed);
  return st;
}

/** Furniture instances with their storage containers and the starting stash. */
function buildHomeFurniture(worldSeed) {
  const list = HOME.furniture.map(([type, floor, x, z, rot, opts]) => {
    const def = FURNITURE[type];
    const f = { uid: U.uid(), type, floor, x, z, rot, label: (opts && opts.label) || def.name };
    if (opts && opts.onTop != null) f.onTop = opts.onTop;
    if (def.grid) f.inv = Inv.makeContainer(def.grid[0], def.grid[1], def.limit, f.label, def.temp || 'ambient');
    if (def.sub) f.sub = Inv.makeContainer(def.sub.grid[0], def.sub.grid[1], def.sub.limit, def.sub.name, def.sub.temp);
    return f;
  });
  const rng = RNG.local('homestock|' + worldSeed);
  for (const [key, id, qty] of HOME_START_STOCK) {
    const [type, sub] = key.split('#');
    const f = list.find((x) => x.type === type && (sub ? x.sub : x.inv));
    if (!f) continue;
    const c = sub ? f.sub : f.inv;
    // Small deterministic variation so the home feels lived-in but identical each life.
    const n = Math.max(1, Math.round(qty * (0.8 + rng() * 0.4)));
    let left = n;
    while (left > 0) {
      const it = Inv.makeItem(id, left);
      const q = it.qty;
      if (Inv.add(c, it) > 0) break;
      left -= q;
    }
  }
  for (const f of list) { if (f.sub && f.sub.temp === 'freezer') Spoil.freezeContents(f.sub); if (f.inv && f.inv.temp === 'freezer') Spoil.freezeContents(f.inv); }
  return list;
}

/* ---------- Lifetime profile helpers ---------- */
const Profile = {
  recordSkill(key, lv, xp) {
    const cur = P.skills[key] || { lv: 0, xp: 0 };
    if (lv > cur.lv || (lv === cur.lv && xp > cur.xp)) P.skills[key] = { lv, xp };
  },
  setting(k) { return P.settings[k]; },
};

/* ---------- Sanitizer ---------- */
const Sanitize = {
  container(c, label) {
    if (!c || typeof c !== 'object') return Inv.makeContainer(4, 4, 20, label || '');
    c.uid = typeof c.uid === 'string' ? c.uid : U.uid();
    c.w = U.num(c.w, 4, 1, 20) | 0; c.h = U.num(c.h, 4, 1, 20) | 0;
    c.limit = U.num(c.limit, 20, 0.1, 9999);
    c.label = typeof c.label === 'string' ? c.label : (label || '');
    if (!['ambient', 'fridge', 'freezer'].includes(c.temp)) c.temp = 'ambient';
    if (c.shop != null && !LOCATIONS[c.shop]) delete c.shop;
    if (c.cold != null) c.cold = U.num(c.cold, 1, 0, 1);
    const old = Array.isArray(c.slots) ? c.slots : [];
    c.slots = [];
    const overflow = [];
    for (const s of old) {
      if (!s || !s.it || typeof s.it !== 'object') continue;
      const it = Sanitize.item(s.it);
      if (!it) continue;
      const r = s.r ? 1 : 0;
      const [w, h] = Inv.dims(it, r);
      const x = U.num(s.x, -1, -1, 99) | 0, y = U.num(s.y, -1, -1, 99) | 0;
      if (Inv.fits(c, x, y, w, h)) c.slots.push({ it, x, y, r });
      else overflow.push(it);
    }
    for (const it of overflow) {
      const spot = Inv.findSpot(c, it);
      if (spot) c.slots.push({ it, x: spot.x, y: spot.y, r: spot.r });
      else console.warn('[Sanitize] dropped item that no longer fits', it.id);
    }
    return c;
  },
  item(it) {
    if (!ITEMS[it.id]) return null;
    const d = ITEMS[it.id];
    it.uid = typeof it.uid === 'string' ? it.uid : U.uid();
    it.qty = U.num(it.qty, 1, 1, d.stack || 1) | 0;
    if (it.cond != null) it.cond = U.num(it.cond, 1, 0, 1);
    if (it.uses != null) it.uses = U.num(it.uses, d.uses || 1, 0, 1e6);
    if (d.grid) it.inv = Sanitize.container(it.inv, d.name);
    else delete it.inv;
    if (it.st != null && typeof it.st !== 'object') delete it.st;
    if (it.unpaid != null && !LOCATIONS[it.unpaid]) delete it.unpaid;
    if (it.age != null) it.age = U.num(it.age, 0, 0, 3);
    if (it.cap != null) it.cap = U.num(it.cap, 1, 0.2, 1);
    if (it.frz != null) it.frz = U.num(it.frz, 0, 0, 1);
    if (it.st && it.st.nut && typeof it.st.nut !== 'object') delete it.st.nut;
    return it;
  },
  character(c) {
    const tmpl = createCharacterData({ name: c && c.name, bg: (c && c.bg) || 'warehouse', profileSkills: {} });
    if (!c || typeof c !== 'object') return tmpl;
    U.deepFill(c, tmpl);
    if (!BACKGROUNDS[c.bg]) c.bg = 'warehouse';
    c.pos.x = U.num(c.pos.x, tmpl.pos.x, -60, 60);
    c.pos.z = U.num(c.pos.z, tmpl.pos.z, -60, 60);
    c.pos.floor = U.num(c.pos.floor, 0, 0, 1) | 0;
    c.pos.rot = U.num(c.pos.rot, 0, -100, 100);
    for (const k of ['satiety', 'hydration', 'energy', 'stamina']) c.needs[k] = U.num(c.needs[k], 80, 0, 100);
    for (const k in BODY_PARTS) {
      if (!c.body[k] || typeof c.body[k] !== 'object') c.body[k] = { hp: BODY_PARTS[k].hp, cond: [] };
      c.body[k].hp = U.num(c.body[k].hp, BODY_PARTS[k].hp, 0, BODY_PARTS[k].hp);
      if (!Array.isArray(c.body[k].cond)) c.body[k].cond = [];
    }
    for (const k in SKILLS) {
      const s = c.skills[k];
      c.skills[k] = { lv: U.num(s && s.lv, 0, 0, 10) | 0, xp: U.num(s && s.xp, 0, 0, 1e7) };
    }
    for (const k in c.skills) if (!SKILLS[k]) delete c.skills[k];
    c.pockets = Sanitize.container(c.pockets, 'กระเป๋ากางเกง/เสื้อ');
    for (const slot of ['back', 'hand', 'weapon']) {
      const it = c.equip[slot];
      c.equip[slot] = it && typeof it === 'object' ? Sanitize.item(it) : null;
      const d = c.equip[slot] && itemDef(c.equip[slot].id);
      if (d && slot !== 'weapon' && d.equip !== slot) c.equip[slot] = null;
    }
    c.sleeping = false;
    c.alive = c.alive !== false;
    Body.init(c);
    Health.init(c);
    c.ill = c.ill.filter((x) => x && typeof x.type === 'string').map((x) => ({ type: x.type, sev: U.num(x.sev, 0.3, 0, 1), h: U.num(x.h, 6, 0, 500) }));
    return c;
  },
  run(st) {
    if (!st || typeof st !== 'object') throw new Error(STR.saveErrNotObject);
    const fromSchema = U.num(st.schema, 0, 0, 999);
    const tmpl = {
      schema: CFG.SCHEMA_RUN, build: BUILD, life: 1, createdAt: Date.now(), worldSeed: P.worldSeed,
      lifeSeed: 1, rng: {}, difficulty: 'standard', time: { min: CFG.START_MINUTE, speedIdx: 2 },
      cash: CFG.START_CASH, chars: [], active: 0, home: { furniture: [], lightsOn: true, piles: [], gas: 70, loads: {} }, locs: {}, food: { reserve: [], exclude: [] }, deliveries: [],
      flags: { outbreak: false }, log: [], scene: 'home',
    };
    U.deepFill(st, tmpl);
    st.life = U.num(st.life, 1, 1, 1e6) | 0;
    st.worldSeed = U.num(st.worldSeed, P.worldSeed, 0, 2 ** 32) >>> 0;
    st.lifeSeed = U.num(st.lifeSeed, 1, 0, 2 ** 32) >>> 0;
    if (!DIFFICULTY[st.difficulty]) st.difficulty = 'standard';
    st.time.min = U.num(st.time.min, CFG.START_MINUTE, 0, 1440 * 100000);
    st.time.speedIdx = U.num(st.time.speedIdx, 2, 0, CFG.SPEEDS.length - 1) | 0;
    st.cash = U.num(st.cash, 0, 0, 1e9);
    if (!Array.isArray(st.chars) || !st.chars.length) st.chars = [null];
    st.chars = st.chars.map(Sanitize.character);
    st.active = U.num(st.active, 0, 0, st.chars.length - 1) | 0;
    if (!Array.isArray(st.log)) st.log = [];
    st.log = st.log.filter((e) => e && typeof e.t === 'number' && typeof e.msg === 'string').slice(-200);
    if (typeof st.flags !== 'object' || !st.flags) st.flags = { outbreak: false };
    st.flags.outbreak = !!st.flags.outbreak;
    if (st.scene !== 'home' && st.scene !== 'street' && !LOC_IDS.includes(st.scene)) st.scene = 'home';
    const pileList = (arr) => (Array.isArray(arr) ? arr : []).filter((p) => p && typeof p === 'object').map((p) => ({
      uid: typeof p.uid === 'string' ? p.uid : U.uid(), floor: U.num(p.floor, 0, 0, 1) | 0, x: U.num(p.x, 0, -60, 60), z: U.num(p.z, 0, -60, 60),
      inv: Object.assign(Sanitize.container(p.inv, STR.ground), { w: 8, h: 6, limit: 200 }),
    })).filter((p) => p.inv.slots.length);
    st.home.piles = pileList(st.home.piles);
    const locs = {};
    for (const id of LOC_IDS) {
      const L = st.locs[id];
      if (!L || typeof L !== 'object' || !Array.isArray(L.furniture)) continue;
      const fixtures = locDef(id).fixtures;
      const furn = L.furniture.filter((f) => f && FURNITURE[f.type]).map((f, i) => {
        const def = FURNITURE[f.type], fx = fixtures.find((q, k) => id + ':' + k === f.uid);
        const out = { uid: String(f.uid), type: f.type, floor: 0, x: fx ? fx[1] : U.num(f.x, 0, -30, 30), z: fx ? fx[2] : U.num(f.z, 0, -30, 30), rot: fx ? fx[3] : (U.num(f.rot, 0, 0, 3) | 0), label: def.name, pool: fx ? fx[4] : null };
        if (def.grid) { const c = f.inv && typeof f.inv === 'object' ? f.inv : Inv.makeContainer(1, 1, 1); c.w = def.grid[0]; c.h = def.grid[1]; c.limit = def.limit; c.temp = def.temp || 'ambient'; out.inv = Sanitize.container(c, def.name); out.inv.shop = id; }
        return out;
      });
      if (furn.length !== fixtures.length) continue;   // garbled → regenerate on next visit
      locs[id] = { genAt: U.num(L.genAt, 0, 0, 1e9), furniture: furn, piles: pileList(L.piles), initial: U.num(L.initial, 1, 1, 1e6), depletedTo: U.num(L.depletedTo, 1, 0, 1), visits: U.num(L.visits, 0, 0, 1e6) | 0, lastVisit: L.lastVisit == null ? null : U.num(L.lastVisit, 0, 0, 1e9) };
    }
    st.locs = locs;
    if (st.scene !== 'home' && st.scene !== 'street' && !st.locs[st.scene]) st.scene = 'home';
    if (st.scene === 'street' && !st.travel) st.scene = 'home';
    // Furniture: rebuild from layout if missing/garbled; keep containers by matching type+position.
    const fresh = buildHomeFurniture(st.worldSeed);
    const old = Array.isArray(st.home.furniture) ? st.home.furniture.filter((f) => f && FURNITURE[f.type]) : [];
    if (!old.length) st.home.furniture = fresh;
    else {
      st.home.furniture = old.map((f) => {
        const def = FURNITURE[f.type];
        f.uid = typeof f.uid === 'string' ? f.uid : U.uid();
        f.floor = U.num(f.floor, 0, 0, 1) | 0;
        f.x = U.num(f.x, 0, -40, 40); f.z = U.num(f.z, 0, -40, 40);
        f.rot = U.num(f.rot, 0, 0, 3) | 0;
        f.label = typeof f.label === 'string' ? f.label : def.name;
        if (f.slot != null && !HOME_SLOTS.some((s) => s.id === f.slot)) delete f.slot;
        if (f.type === 'generator') f.gen = { on: !!(f.gen && f.gen.on), fuel: U.num(f.gen && f.gen.fuel, 0, 0, 50), hours: U.num(f.gen && f.gen.hours, 0, 0, 1e6) };
        // Grid size and temperature always come from the current furniture definition.
        const fixC = (c, spec, temp, label) => {
          const out = c && typeof c === 'object' ? c : Inv.makeContainer(1, 1, 1, label);
          out.w = spec.grid[0]; out.h = spec.grid[1]; out.limit = spec.limit; out.temp = temp;
          return Sanitize.container(out, label);
        };
        if (def.grid) f.inv = fixC(f.inv, def, def.temp || 'ambient', f.label); else delete f.inv;
        if (def.sub) f.sub = fixC(f.sub, def.sub, def.sub.temp, def.sub.name); else delete f.sub;
        return f;
      });
    }
    st.home.lightsOn = st.home.lightsOn !== false;
    st.home.gas = U.num(st.home.gas, 70, 0, 100);
    st.home.carFuel = U.num(st.home.carFuel, 24, 0, 60);
    if (!st.home.barr || typeof st.home.barr !== 'object' || Array.isArray(st.home.barr)) st.home.barr = {};
    for (const k of Object.keys(st.home.barr)) {
      const b = st.home.barr[k];
      if (!b || typeof b !== 'object') { delete st.home.barr[k]; continue; }
      for (const f of ['layers', 'layersMax']) b[f] = U.num(b[f], 0, 0, 3) | 0;
      for (const f of ['hp', 'max', 'glass', 'door']) b[f] = U.num(b[f], 0, 0, 2000);
    }
    if (st.scene === 'street') st.scene = st.travel && LOCATIONS[st.travel.to] ? 'street' : 'home';
    if (st.travel && (typeof st.travel !== 'object' || !LOCATIONS[st.travel.to])) st.travel = null;
    if (st.travel) st.travel.left = U.num(st.travel.left, 10, 0, 1000);
    st.flags.invulnerable = !!st.flags.invulnerable;
    if (!st.home.loads || typeof st.home.loads !== 'object' || Array.isArray(st.home.loads)) st.home.loads = {};
    st.food.reserve = Array.isArray(st.food.reserve) ? st.food.reserve.filter((x) => ITEMS[x]) : [];
    st.food.exclude = Array.isArray(st.food.exclude) ? st.food.exclude.filter((x) => ITEMS[x]) : [];
    st.deliveries = (Array.isArray(st.deliveries) ? st.deliveries : []).filter((x) => x && ITEMS[x.item] && isFinite(x.at)).map((x) => ({ id: String(x.id), item: x.item, slot: String(x.slot), at: +x.at, paid: U.num(x.paid, 0, 0, 1e7) }));
    if (typeof st.rng !== 'object' || !st.rng) st.rng = {};
    // Schema migrations go here, oldest first: if (fromSchema < 2) {...}
    void fromSchema;
    st.schema = CFG.SCHEMA_RUN;
    st.build = BUILD;
    return st;
  },
  profile(p) {
    if (!p || typeof p !== 'object') return createProfile();
    U.deepFill(p, createProfile());
    p.worldSeed = U.num(p.worldSeed, 12345, 0, 2 ** 32) >>> 0;
    if (typeof p.skills !== 'object' || !p.skills) p.skills = {};
    for (const k in p.skills) {
      if (!SKILLS[k]) { delete p.skills[k]; continue; }
      const s = p.skills[k];
      p.skills[k] = { lv: U.num(s && s.lv, 0, 0, 10) | 0, xp: U.num(s && s.xp, 0, 0, 1e7) };
    }
    if (!Array.isArray(p.lives)) p.lives = [];
    p.lives = p.lives.filter((l) => l && typeof l === 'object').slice(-200);
    if (!QUALITY[p.settings.quality]) p.settings.quality = null;
    for (const k of ['master', 'music', 'sfx']) p.settings[k] = U.num(p.settings[k], 0.7, 0, 1);
    if (!Array.isArray(p.settings.smartLoot)) p.settings.smartLoot = createProfile().settings.smartLoot;
    p.settings.smartLoot = p.settings.smartLoot.filter((c) => CATEGORIES[c]);
    p.schema = CFG.SCHEMA_PROFILE;
    return p;
  },
};

/* ---------- Persistence ---------- */
const Save = {
  lastSaveReal: 0,
  /** Keys starting with '_' are transient runtime fields and never persisted. */
  replacer(k, v) { return k && k[0] === '_' ? undefined : v; },
  write(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj, Save.replacer)); return true; }
    catch (e) {
      console.warn('[Save] localStorage write failed', e);
      Bus.emit('toast', { kind: 'bad', msg: STR.saveQuota });
      return false;
    }
  },
  read(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { console.warn('[Save] read failed', key, e); return null; }
  },
  saveProfile() { return Save.write(CFG.LS_PROFILE, P); },
  saveRun(reason) {
    if (!S) return false;
    S.rng = RNG.snapshot();
    const ok = Save.write(CFG.LS_RUN, S) && Save.saveProfile();
    if (ok) { Save.lastSaveReal = performance.now(); Bus.emit('saved', { reason }); }
    return ok;
  },
  hasRun() { const r = Save.read(CFG.LS_RUN); return !!(r && r.chars && r.chars.length && r.chars[0] && r.chars[0].alive !== false); },
  loadProfile() { P = Sanitize.profile(Save.read(CFG.LS_PROFILE)); return P; },
  loadRun() {
    const raw = Save.read(CFG.LS_RUN);
    if (!raw) return null;
    try { return Sanitize.run(raw); }
    catch (e) { console.warn('[Save] run unreadable', e); return null; }
  },
  deleteRun() { try { localStorage.removeItem(CFG.LS_RUN); } catch (e) { /* storage blocked */ } },
  deleteAll() { try { localStorage.removeItem(CFG.LS_RUN); localStorage.removeItem(CFG.LS_PROFILE); } catch (e) { /* storage blocked */ } },
  /** Export both data sets as one JSON download. */
  exportFile() {
    if (S) S.rng = RNG.snapshot();
    const blob = new Blob([JSON.stringify({ kind: 'hoardhold-save', build: BUILD, exportedAt: new Date().toISOString(), run: S || Save.read(CFG.LS_RUN), profile: P }, Save.replacer, 1)], { type: 'application/json' });
    const a = U.el('a', { href: URL.createObjectURL(blob), download: 'hoard-hold-save-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  /** Validate and parse an imported file. Returns {run, profile} or throws a Thai message. */
  parseImport(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error(STR.saveErrJson); }
    if (!obj || typeof obj !== 'object') throw new Error(STR.saveErrNotObject);
    if (obj.kind !== 'hoardhold-save') throw new Error(STR.saveErrKind);
    if (!obj.profile || typeof obj.profile !== 'object') throw new Error(STR.saveErrProfile);
    if (U.num(obj.profile.schema, 0) > CFG.SCHEMA_PROFILE || (obj.run && U.num(obj.run.schema, 0) > CFG.SCHEMA_RUN)) throw new Error(STR.saveErrFuture);
    const profile = Sanitize.profile(obj.profile);
    const prevP = P; P = profile;
    let run = null;
    try { run = obj.run ? Sanitize.run(obj.run) : null; } finally { P = prevP; }
    return { run, profile };
  },
};
