// Phase 2B: free furniture arrangement, weather & water, farming.
import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'farmer', difficulty: 'standard', name: 'สวน' }));
await page.waitForFunction(() => HH.Game.mode === 'play');
await page.waitForTimeout(800);
const out = (k, v) => console.log(k, JSON.stringify(v));

// ---- 1. Arrangement rules on real furniture ----
out('rules', await page.evaluate(() => {
  const F = HH.S.home.furniture, A = HH.Arrange;
  const pantry = F.find((f) => f.type === 'pantry'), sofa = F.find((f) => f.type === 'sofa');
  const fridge = F.find((f) => f.type === 'fridge');
  return {
    overlapFridge: A.check(pantry, fridge.x, fridge.z, 1, 0).why,
    stairs: A.check(pantry, 0.4, -3.5, 0, 0).why,
    frontDoor: A.check(sofa, -1.1, 2.5, 0, 0).why,
    acrossWall: A.check(pantry, 1.0, 0.5, 0, 0).why,
    bedOutside: A.check(F.find((f) => f.type === 'bed_single'), -8.5, 2, 0, 0).why,
    fixedCar: A.movable(F.find((f) => f.type === 'car')),
    startReach: A.reachable(),
  };
}));
// Move the pantry with the mouse: start mode, hover a target, click
const proj = (x, y, z) => page.evaluate(([x, y, z]) => { const v = new THREE.Vector3(x, y, z).project(HH.Render.camera); const r = HH.Render.renderer.domElement.getBoundingClientRect(); return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height }; }, [x, y, z]);
const spot = await page.evaluate(() => {
  const p = HH.S.home.furniture.find((f) => f.type === 'pantry');
  for (let z = 2.5; z > -2.4; z -= 0.25) for (let x = 1.5; x < 5.5; x += 0.25) if (HH.Arrange.check(p, x, z, 2, 0).ok) return { x, z };
  return null;
});
out('free spot for pantry (rot 2)', spot);
await page.evaluate(() => { const p = HH.S.home.furniture.find((f) => f.type === 'pantry'); HH.Render.cam.follow = false; HH.Render.cam.tx = 3; HH.Render.cam.tz = 0.5; HH.Arrange.start(p); HH.Arrange.active.pos.rot = 1; });
await page.waitForTimeout(600);
let t = await proj(spot.x, 0, spot.z);
await page.mouse.move(t.x, t.y); await page.waitForTimeout(300);
await page.keyboard.press('KeyR'); await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/arrange-ghost.png' });
const before = await page.evaluate(() => HH.S.time.min);
await page.mouse.click(t.x, t.y); await page.waitForTimeout(400);
out('moved pantry', await page.evaluate((b) => { const p = HH.S.home.furniture.find((f) => f.type === 'pantry'); return { x: p.x, z: p.z, rot: p.rot, mins: HH.S.time.min - b, active: !!HH.Arrange.active, reach: HH.Arrange.reachable().ok }; }, before));
// A placement that would block a doorway path must be refused (big rack into the storage-room doorway corridor)
out('block test', await page.evaluate(() => {
  const F = HH.S.home.furniture, rack = F.find((f) => f.type === 'big_rack');
  // Put the 2.2 m rack across the upper store room right in front of its door (x=1, z -5.2..-4.3) → must be rejected by rules or reachability
  HH.Arrange.start(rack); HH.Arrange.preview(2.2, -4.0, 1, 1);
  const pre = { valid: HH.Arrange.active.valid, why: HH.Arrange.active.why };
  const ok = HH.Arrange.confirm(); if (HH.Arrange.active) HH.Arrange.cancel();
  return { pre, committed: ok, rackAt: [rack.x, rack.z] };
}));

// ---- 2. Install items + build furniture in the yard ----
out('install', await page.evaluate(() => {
  const ch = HH.activeChar();
  const pile = HH.Scene.pileNear(0, 2.8, 9.8, true), c = pile.inv;
  HH.Inv.add(c, HH.Inv.makeItem('plant_pot_item', 1));
  const slot = c.slots.find((s) => s.it.id === 'plant_pot_item');
  HH.Arrange.installItem(c, slot); HH.Arrange.preview(-3.0, 4.6, 0, 0); const ok1 = HH.Arrange.confirm();
  // Water drum: one by the house wall (gutter), one in the open yard
  HH.Inv.add(pile.inv, HH.Inv.makeItem('water_drum_item', 1)); HH.Inv.add(pile.inv, HH.Inv.makeItem('water_drum_item', 1));
  let s2 = pile.inv.slots.find((s) => s.it.id === 'water_drum_item');
  HH.Arrange.installItem(pile.inv, s2); HH.Arrange.preview(-6.6, 1.0, 0, 0); const ok2 = HH.Arrange.confirm();
  s2 = pile.inv.slots.find((s) => s.it.id === 'water_drum_item');
  HH.Arrange.installItem(pile.inv, s2); HH.Arrange.preview(-9.5, 7.5, 0, 0); const ok3 = HH.Arrange.confirm();
  // Planter box from materials
  const bag = HH.Inv.makeItem('backpack_medium'); ch.d.equip.back = ch.d.equip.back || bag;
  for (const [id, n] of [['plank', 3], ['nails_1kg', 1], ['potting_soil', 2]]) HH.Inv.add(ch.d.equip.back.inv, HH.Inv.makeItem(id, n));
  const recipe = CRAFT_FURN.find((r) => r.type === 'planter_box');
  const miss = HH.Arrange.missing(ch, recipe);
  HH.Arrange.build(recipe); HH.Arrange.preview(-4.6, 4.6, 0, 0); const ok4 = HH.Arrange.confirm();
  const F = HH.S.home.furniture;
  const drums = F.filter((f) => f.type === 'water_drum');
  return { pot: ok1, drumWall: ok2, drumOpen: ok3, planter: ok4, missBefore: miss, catch: drums.map((d) => +HH.Water.catchArea(d).toFixed(2)), planks: HH.Barricades.countAvail(ch, 'plank') };
}));
await page.evaluate(() => { HH.Render.cam.tx = -5; HH.Render.cam.tz = 4; HH.Render.cam.dist = 12; });
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots/yard-garden.png' });

// ---- 3. Weather: determinism, season, rain catching ----
out('weather', await page.evaluate(() => {
  let rainy = 0, mm = 0; const byMonth = {};
  for (let d = 0; d < 120; d++) { const r = HH.Weather.dayRain(d); if (r > 0.5) rainy++; mm += r; const m = HH.Calendar.month(d); byMonth[m] = (byMonth[m] || 0) + r; }
  const a = HH.Weather.at(1440 * 30 + 900).mmh; HH.Weather.memo.clear(); const b = HH.Weather.at(1440 * 30 + 900).mmh;
  return { rainyDays120: rainy, mm120: Math.round(mm), byMonthMM: Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, Math.round(v)])), deterministic: a === b, date0: HH.Calendar.label(0), date60: HH.Calendar.label(60) };
}));
out('rain catch', await page.evaluate(() => {
  const drums = HH.S.home.furniture.filter((f) => f.type === 'water_drum');
  const b = drums.map((d) => d.water.l);
  HH.S.flags.wxForce = { mmh: 12, until: HH.S.time.min + 60 };
  HH.S.flags.debugSustain = true; HH.GameClock.advance(60); HH.S.flags.debugSustain = false;
  return { before: b, after: drums.map((d) => +d.water.l.toFixed(1)), raw: drums.map((d) => +d.water.raw.toFixed(1)) };
}));
// Noise masking under rain
out('noise mask', await page.evaluate(() => {
  HH.Zombies.spawn('walker', -6, 8); HH.Zombies.spawn('walker', -6, 9.5);
  HH.S.flags.wxForce = { mmh: 25, until: HH.S.time.min + 30 };
  const heardRain = HH.NoiseBus.emit(-3, 6.5, 5, 0);
  HH.S.flags.wxForce = { mmh: 0, until: HH.S.time.min + 30 };
  for (const z of HH.Zombies.alive()) { z.state = 'wander'; }
  const heardDry = HH.NoiseBus.emit(-3, 6.5, 5, 0);
  for (const z of HH.Zombies.alive()) z.die();
  return { heardRain, heardDry };
}));
// Storm visual
await page.evaluate(() => { HH.S.flags.wxForce = { mmh: 24, until: HH.S.time.min + 120 }; HH.GameClock.setSpeed(1); });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/storm.png' });
await page.evaluate(() => { HH.S.flags.wxForce = { mmh: 0, until: HH.S.time.min + 1 }; HH.GameClock.setSpeed(0); });

// ---- 4. Farming ----
out('plant', await page.evaluate(() => {
  const ch = HH.activeChar(), F = HH.S.home.furniture;
  const pot = F.find((f) => f.type === 'plant_pot'), box = F.find((f) => f.type === 'planter_box');
  const seeds = HH.Farm.seedsHave(ch);
  const r = [HH.Farm.plant(ch, pot, 0, 'morning_glory'), HH.Farm.plant(ch, box, 0, 'chili'), HH.Farm.plant(ch, box, 1, 'thai_basil'), HH.Farm.plant(ch, pot, 0, 'chili'), HH.Farm.plant(ch, pot, 0, 'pumpkin')];
  // An indoor pot deep in the hall (dark) for comparison
  const ip = HH.initFurn ? null : null;
  return { seeds, results: r, potCrop: pot.farm.plots[0] && pot.farm.plots[0].crop };
}));
// Indoor dark pot via a second install
await page.evaluate(() => {
  const c = HH.Scene.pileNear(0, 2.8, 9.8, true).inv; HH.Inv.add(c, HH.Inv.makeItem('plant_pot_item', 1)); HH.Inv.add(c, HH.Inv.makeItem('seed_morning_glory', 1));
  const slot = c.slots.find((s) => s.it.id === 'plant_pot_item'); HH.Arrange.installItem(c, slot); HH.Arrange.preview(-1.8, -3.0, 0, 0); if (!HH.Arrange.confirm()) throw new Error('indoor pot not placed: ' + (HH.Arrange.active && HH.Arrange.active.why));
  const pots = HH.S.home.furniture.filter((f) => f.type === 'plant_pot'); HH.Farm.plant(HH.activeChar(), pots[1], 0, 'morning_glory');
  for (const p of pots) HH.Farm.water(HH.activeChar(), p);
});
const grow = await page.evaluate(() => {
  const pots = HH.S.home.furniture.filter((f) => f.type === 'plant_pot');
  const log = [];
  HH.S.flags.debugSustain = true;
  for (let d = 1; d <= 14; d++) {
    for (const p of pots) if (p.farm.moist < 0.4) HH.Farm.water(HH.activeChar(), p);
    HH.GameClock.advance(1440);
    log.push(pots.map((p) => { const q = p.farm.plots[0]; return q ? HH.Farm.stage(q) + ':' + q.g.toFixed(2) : '-'; }).join(' / '));
  }
  HH.S.flags.debugSustain = false;
  return { light: pots.map((p) => +HH.Farm.light(p, HH.Weather.now()).toFixed(2)), log };
});
out('growth outdoor / indoor-dark', grow);
await page.evaluate(() => { HH.Render.cam.tx = -4; HH.Render.cam.tz = 4.5; HH.Render.cam.dist = 7; });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'shots/crops.png' });
out('harvest', await page.evaluate(() => {
  const ch = HH.activeChar(), pot = HH.S.home.furniture.find((f) => f.type === 'plant_pot');
  const before = ch.containers().reduce((n, c) => n + HH.Inv.count(c, 'morning_glory'), 0);
  const q = HH.Farm.harvest(ch, pot, 0);
  const after = ch.containers().reduce((n, c) => n + HH.Inv.count(c, 'morning_glory'), 0) + HH.S.home.piles.reduce((n, p) => n + HH.Inv.count(p.inv, 'morning_glory'), 0);
  return { q, before, after, plotAfter: pot.farm.plots[0] && { n: pot.farm.plots[0].n, g: pot.farm.plots[0].g }, farmingLv: ch.d.skills.farming.lv };
}));
// Drought kills: stop watering an indoor box for days
out('drought', await page.evaluate(() => {
  const box = HH.S.home.furniture.find((f) => f.type === 'planter_box');
  box.farm.moist = 0.05; HH.S.flags.wxForce = { mmh: 0, until: HH.S.time.min + 1440 * 5 };
  HH.S.flags.debugSustain = true; HH.GameClock.advance(1440 * 4); HH.S.flags.debugSustain = false;
  return box.farm.plots.map((p) => p && { crop: p.crop, hp: +p.hp.toFixed(2), dead: p.dead });
}));

// ---- 5. Water after the utility failure ----
out('water', await page.evaluate(() => {
  const ch = HH.activeChar(), d = ch.d;
  HH.S.flags.debugSustain = true;
  HH.GameClock.advance(Math.max(0, 1440 * 61 - HH.S.time.min));
  HH.S.flags.debugSustain = false;
  const jar = HH.S.home.furniture.find((f) => f.type === 'water_jar'), tank = HH.S.home.furniture.find((f) => f.type === 'water_tank');
  d.needs.hydration = 30;
  const tap = HH.Water.drink(ch, 'tap');
  const jarBefore = jar.water.l;
  const fromJar = HH.Water.drink(ch, jar);
  const hyd = Math.round(d.needs.hydration);
  // boil: take from nearest store
  HH.S.home.gas = 50;
  const boiled = HH.Water.boil(ch);
  return { day: Math.floor(HH.S.time.min / 1440), waterOn: HH.Power.waterOn(), tapOk: tap, fromJar, jarUsed: +(jarBefore - jar.water.l).toFixed(2), hyd, tank: Math.round(tank.water.l), boiled, boiledPot: HH.S.home.boiled, totals: HH.Water.totals() };
}));
// UI panels
await page.keyboard.press('KeyG'); await page.waitForSelector('.farm'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/farm-ui.png' });
await page.click('.farm .tabs button >> nth=1'); await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/water-ui.png' });
await page.click('.farm .tabs button >> nth=2'); await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/weather-ui.png' });
await page.keyboard.press('Escape');
await page.keyboard.press('KeyK'); await page.waitForSelector('.arrange'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/arrange-ui.png' });
await page.keyboard.press('Escape');
// Save round trip + garbage
out('save', await page.evaluate(() => {
  HH.Save.saveRun('t');
  const raw = JSON.parse(localStorage.getItem('hoardhold.run.v1'));
  const pot = raw.home.furniture.find((f) => f.type === 'plant_pot');
  pot.farm.plots = [{ crop: 'nope', g: 'x' }, 5]; pot.water = { l: -4 };
  const drum = raw.home.furniture.find((f) => f.type === 'water_drum'); drum.water = { l: 99999, raw: 'a' };
  const st = HH.Sanitize.run(raw);
  const p2 = st.home.furniture.find((f) => f.type === 'plant_pot'), d2 = st.home.furniture.find((f) => f.type === 'water_drum');
  return { potPlots: p2.farm.plots, potWater: p2.water, drum: d2.water, moved: st.home.furniture.find((f) => f.type === 'pantry').x };
}));
report(errs);
await browser.close();
