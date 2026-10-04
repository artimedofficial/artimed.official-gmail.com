// Phase 2C: drying (sun/rain/night), salting, pickling, smoking (fuel, smoke lure), bottles (empty → refill, raw flag).
import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'cook', difficulty: 'standard', name: 'ถนอม' }));
await page.waitForFunction(() => HH.Game.mode === 'play');
await page.waitForTimeout(600);
const out = (k, v) => console.log(k, JSON.stringify(v));

// Stock the pantry with raw materials + build stations in the yard
out('setup', await page.evaluate(() => {
  const F = HH.S.home.furniture, pantry = F.find((f) => f.type === 'pantry'), fridge = F.find((f) => f.type === 'fridge');
  const add = (c, id, n) => HH.Inv.add(c, HH.Inv.makeItem(id, n));
  add(fridge.inv, 'pork_1kg', 2); add(fridge.inv, 'fish_tilapia', 2); add(fridge.inv, 'cucumber', 2); add(fridge.inv, 'egg', 6);
  add(pantry.inv, 'salt', 4); add(pantry.inv, 'vinegar', 1); add(pantry.inv, 'charcoal', 1);
  const pile = HH.Scene.pileNear(0, 2.8, 9.8, true);
  add(pile.inv, 'ferment_jar_item', 2); add(pile.inv, 'plank', 5); add(pile.inv, 'nails_1kg', 1); add(pile.inv, 'steel_sheet', 1);
  const ch = HH.activeChar(); ch.d.equip.back = ch.d.equip.back || HH.Inv.makeItem('backpack_medium');
  for (const s of [...pile.inv.slots]) if (['plank', 'nails_1kg', 'steel_sheet'].includes(s.it.id)) { HH.Inv.add(ch.d.equip.back.inv, s.it); HH.Inv.remove(pile.inv, s); }
  const R = (t) => CRAFT_FURN.find((r) => r.type === t);
  HH.Arrange.build(R('drying_tray')); HH.Arrange.preview(-4.5, 5.0, 0, 0); const t1 = HH.Arrange.confirm();
  HH.Arrange.build(R('smoker')); HH.Arrange.preview(-8.5, 1.5, 0, 0); const t2 = HH.Arrange.confirm();
  let js = pile.inv.slots.find((s) => s.it.id === 'ferment_jar_item');
  HH.Arrange.installItem(pile.inv, js); HH.Arrange.preview(4.6, -5.6, 0, 0); const t3 = HH.Arrange.confirm();
  js = pile.inv.slots.find((s) => s.it.id === 'ferment_jar_item');
  HH.Arrange.installItem(pile.inv, js); HH.Arrange.preview(2.2, -5.6, 0, 0); const t4 = HH.Arrange.confirm();
  return { tray: t1, smoker: t2, jar1: t3, jar2: t4, stations: HH.Preserve.stations().map((f) => f.type) };
}));

// 1. Drying pork with salt on the tray, start at 10:00 day 0 (clear weather forced)
out('dry', await page.evaluate(() => {
  const ch = HH.activeChar(), tray = HH.S.home.furniture.find((f) => f.type === 'drying_tray');
  HH.S.flags.wxForce = { mmh: 0, until: HH.S.time.min + 1440 * 3 };
  HH.GameClock.advance(Math.max(0, 600 - HH.S.time.min));
  const probsBad = HH.Preserve.check(ch, tray, 'dry', { cucumber: 1 });
  const ok = HH.Preserve.start(ch, tray, 'dry', { pork_1kg: 1 });
  const b0 = JSON.parse(JSON.stringify(tray.batch));
  HH.S.flags.debugSustain = true;
  const log = [];
  for (let h = 0; h < 30; h++) { HH.GameClock.advance(60); log.push((tray.batch ? tray.batch.prog.toFixed(1) : 'x') + (HH.Preserve.condition(tray) === 'night' ? 'n' : '')); if (tray.batch && tray.batch.done) break; }
  HH.S.flags.debugSustain = false;
  const got = HH.Preserve.collect(ch, tray);
  return { probsBad, started: ok, need: b0.need, q0: b0.q, saltLeft: HH.Barricades.countAvail(ch, 'salt') + HH.Preserve.available(ch, 'salt'), progByHour: log.join(' '), got };
}));
await page.evaluate(() => { HH.Render.cam.follow = false; HH.Render.cam.tx = -6; HH.Render.cam.tz = 3.5; HH.Render.cam.dist = 9; });

// 2. Rain on a drying batch: quality falls, then the batch is lost
out('rain', await page.evaluate(() => {
  const ch = HH.activeChar(), tray = HH.S.home.furniture.find((f) => f.type === 'drying_tray');
  HH.Inv.add(HH.S.home.furniture.find((f) => f.type === 'fridge').inv, HH.Inv.makeItem('mango', 2));
  HH.Preserve.start(ch, tray, 'dry', { mango: 2 });
  HH.S.flags.wxForce = { mmh: 8, until: HH.S.time.min + 600 };
  const q = [];
  HH.S.flags.debugSustain = true;
  for (let h = 0; h < 10 && tray.batch; h++) { HH.GameClock.advance(60); q.push(tray.batch ? +tray.batch.q.toFixed(2) : 'lost'); }
  HH.S.flags.debugSustain = false;
  HH.S.flags.wxForce = { mmh: 0, until: HH.S.time.min + 1440 * 20 };
  return { qByHour: q, batchAfter: !!tray.batch };
}));

// 3. Pickling cucumbers (vinegar) and salting eggs in jars; naem would need garlic
out('jars', await page.evaluate(() => {
  const ch = HH.activeChar(), jars = HH.S.home.furniture.filter((f) => f.type === 'ferment_jar');
  const a = HH.Preserve.start(ch, jars[0], 'pickle', { cucumber: 2 });
  const b = HH.Preserve.start(ch, jars[1], 'salt', { egg: 6 });
  const needs = [jars[0].batch.need, jars[1].batch.need];
  HH.S.flags.debugSustain = true; HH.GameClock.advance(25 * 60); HH.S.flags.debugSustain = false;
  const pick = HH.Preserve.collect(ch, jars[0]);
  const eggProg = +(jars[1].batch.prog / jars[1].batch.need).toFixed(2);
  return { started: [a, b], needs, pickled: pick, eggProgress: eggProg };
}));

// 4. Smoking fish: uses charcoal, its smoke lures zombies outdoors
out('smoke', await page.evaluate(() => {
  const ch = HH.activeChar(), sm = HH.S.home.furniture.find((f) => f.type === 'smoker');
  const fuel0 = HH.Barricades.countAvail(ch, 'charcoal') || HH.S.home.furniture.reduce((n, f) => n + (f.inv ? HH.Inv.count(f.inv, 'charcoal') : 0), 0);
  const ok = HH.Preserve.start(ch, sm, 'smoke', { fish_tilapia: 2 });
  HH.Zombies.spawn('walker', -8.5, 9.0);
  const z = HH.Zombies.alive()[0]; z.state = 'wander';
  let heardAt = null;
  HH.S.flags.debugSustain = true;
  for (let m = 0; m < 300 && sm.batch && !sm.batch.done; m += 10) { HH.GameClock.advance(10); if (!heardAt && z.state === 'investigate') heardAt = m; }
  HH.S.flags.debugSustain = false;
  const got = HH.Preserve.collect(ch, sm);
  for (const q of HH.Zombies.alive()) q.die();
  return { started: ok, got, zombieInvestigatedAfterMin: heardAt, charcoalUses: HH.S.home.furniture.reduce((n, f) => { let u = null; if (f.inv) HH.Inv.walk(f.inv, (it) => { if (it.id === 'charcoal') u = it.uses; }); return u != null ? u : n; }, null), fuel0 };
}));
await page.evaluate(() => { const sm = HH.S.home.furniture.find((f) => f.type === 'smoker'); const ch = HH.activeChar(); HH.Inv.add(HH.S.home.furniture.find((f) => f.type === 'fridge').inv, HH.Inv.makeItem('pork_1kg', 1)); HH.Preserve.start(ch, sm, 'smoke', { pork_1kg: 1 });
  const tray = HH.S.home.furniture.find((f) => f.type === 'drying_tray'); HH.Inv.add(HH.S.home.furniture.find((f) => f.type === 'fridge').inv, HH.Inv.makeItem('banana', 3)); HH.Preserve.start(ch, tray, 'dry', { banana: 3 });
  HH.Render.cam.tx = -6.5; HH.Render.cam.tz = 3; HH.Render.cam.dist = 8; HH.GameClock.setSpeed(1); });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/preserve-yard.png' });
await page.evaluate(() => HH.GameClock.setSpeed(0));

// 5. Bottles: drink a 600 ml bottle to the end → empty bottle; refill from a rain drum (raw) and from the boiled pot
out('bottles', await page.evaluate(() => {
  const ch = HH.activeChar(), c = ch.d.pockets;
  HH.Inv.add(c, HH.Inv.makeItem('water_600', 1));
  ch.d.needs.hydration = 20;
  let s = c.slots.find((x) => x.it.id === 'water_600');
  HH.Food.eat(ch, c, s, 2);
  const empties = ch.containers().reduce((n, cc) => n + HH.Inv.count(cc, 'bottle_empty_600'), 0);
  // a raw-water drum next to the house
  const pile = HH.Scene.pileNear(0, 2.8, 9.8, true); HH.Inv.add(pile.inv, HH.Inv.makeItem('water_drum_item', 1));
  const ds = pile.inv.slots.find((x) => x.it.id === 'water_drum_item'); HH.Arrange.installItem(pile.inv, ds); HH.Arrange.preview(-6.6, 1.0, 0, 0); HH.Arrange.confirm();
  const drum = HH.S.home.furniture.find((f) => f.type === 'water_drum'); drum.water = { l: 50, raw: 50 };
  const n1 = HH.Bottles.fill(ch, drum);
  let raw = null; for (const cc of ch.containers()) HH.Inv.walk(cc, (it) => { if (it.id === 'water_600') raw = it.st && it.st.raw; });
  const label = (() => { let l = null; for (const cc of ch.containers()) HH.Inv.walk(cc, (it) => { if (it.id === 'water_600') l = HH.Food.label(it); }); return l; })();
  // drink the raw bottle many times statistically: count illness with no filter
  let ill = 0;
  for (let i = 0; i < 40; i++) {
    ch.d.ill = []; const b = HH.Inv.makeItem('water_600', 1); b.st = { raw: true }; HH.Inv.add(c, b);
    const sl = c.slots.find((x) => x.it === b); HH.Food.eat(ch, c, sl, 2, { noTime: true, silent: true });
    if (ch.d.ill.length) ill++;
    for (const cc of ch.containers()) for (const q of [...cc.slots]) if (q.it.id === 'bottle_empty_600') HH.Inv.remove(cc, q);
  }
  ch.d.ill = [];
  HH.Inv.add(c, HH.Inv.makeItem('bottle_empty_1500', 1));
  HH.S.home.boiled = 5;
  const n2 = HH.Bottles.fill(ch, 'boiled');
  let safe = null; for (const cc of ch.containers()) HH.Inv.walk(cc, (it) => { if (it.id === 'water_1500') safe = !(it.st && it.st.raw); });
  return { empties, filledFromDrum: n1, rawFlag: raw, label, drumLeft: drum.water.l, illnessIn40RawDrinks: ill, filledBoiled: n2, boiledLeft: HH.S.home.boiled, boiledBottleSafe: safe };
}));
// UI
await page.evaluate(() => { const jar = HH.S.home.furniture.find((f) => f.type === 'ferment_jar' && !f.batch); PreserveUI.open(jar); });
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/preserve-ui.png' });
await page.keyboard.press('Escape');
await page.evaluate(() => FarmUI.open('preserve')); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/preserve-tab.png' });
await page.keyboard.press('Escape');
// Save/sanitize with batches
out('save', await page.evaluate(() => {
  HH.Save.saveRun('t');
  const raw = JSON.parse(localStorage.getItem('hoardhold.run.v1'));
  const sm = raw.home.furniture.find((f) => f.type === 'smoker'); sm.batch.m = 'dry';
  const tray = raw.home.furniture.find((f) => f.type === 'drying_tray'); tray.batch.items.push({ id: 'nope', n: 3 }); tray.batch.prog = -5;
  const st = HH.Sanitize.run(raw);
  const t2 = st.home.furniture.find((f) => f.type === 'drying_tray');
  return { smokerBatchDropped: !st.home.furniture.find((f) => f.type === 'smoker').batch, trayItems: t2.batch && t2.batch.items, trayProg: t2.batch && t2.batch.prog };
}));
report(errs);
await browser.close();
