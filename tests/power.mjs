import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'handyman', difficulty: 'standard', name: 'ทดสอบ' }));
await page.waitForTimeout(400);
const R = (label, v) => console.log(label, JSON.stringify(v));
// Delivery: order a chest freezer + large freezer + generator from the supermarket/hardware before outbreak
R('delivery', await page.evaluate(() => {
  HH.S.scene = 'supermarket';
  const ok1 = HomeInstall.order('appliance_chest_freezer', 9500, 'L1');
  const ok2 = HomeInstall.order('appliance_large_freezer', 45000, 'L2');
  HH.S.scene = 'hardware';
  const ok3 = HomeInstall.order('generator_small', 6500, 'G2');
  HH.S.scene = 'home';
  HH.GameClock.advance(200);
  const types = HH.S.home.furniture.filter((f) => f.slot).map((f) => f.type + '@' + f.slot);
  return { ok1, ok2, ok3, cash: HH.S.cash, installed: types };
}));
// Late order arriving after the outbreak is cancelled & refunded
R('late order', await page.evaluate(() => {
  HH.GameClock.advance((24 + 4) * 60 - HH.S.time.min % 1440);   // to day 1 04:00
  HH.S.scene = 'hardware'; const cash0 = HH.S.cash; HomeInstall.order('appliance_chest_freezer', 9900, 'L3'); HH.S.scene = 'home';
  HH.GameClock.advance(200);
  return { refunded: HH.S.cash === cash0, outbreak: HH.S.flags.outbreak };
}));
// Stock all 3 freezers with steaks, wait to day 59, then power fails day 60
R('day60', await page.evaluate(() => {
  const units = [HH.S.home.furniture.find((f) => f.type === 'fridge'), HH.S.home.furniture.find((f) => f.type === 'chest_freezer'), HH.S.home.furniture.find((f) => f.type === 'large_freezer')];
  const steaks = units.map((f) => { const c = f.sub || f.inv; const s = HH.Inv.makeItem('beef_steak', 1); HH.Inv.add(c, s); return s; });
  const fridgeMilk = HH.Inv.makeItem('fresh_milk', 1); HH.Inv.add(units[0].inv, fridgeMilk);
  HH.GameClock.advance((60 * 1440) - HH.S.time.min);    // to day 60 00:00 (through brown-outs)
  const at60 = steaks.map((s) => ({ frz: +s.frz.toFixed(2), age: +(s.age || 0).toFixed(3) }));
  const timeline = [];
  for (const h of [4, 8, 16, 26, 40]) { HH.GameClock.advance(h * 60 - (timeline.length ? [4, 8, 16, 26, 40][timeline.length - 1] * 60 : 0)); timeline.push({ h, compartment: +steaks[0].frz.toFixed(2), chest: +steaks[1].frz.toFixed(2), large: +steaks[2].frz.toFixed(2), coldChest: +units[1].inv.cold.toFixed(2) }); }
  return { at60, timeline, milkStage: Food.stage(fridgeMilk), stagesAfter40h: steaks.map((s) => Food.stage(s)) };
}));
// Generator restores power before the chest freezer thaws
R('generator', await page.evaluate(() => {
  const ch = HH.activeChar();
  const chest = HH.S.home.furniture.find((f) => f.type === 'chest_freezer');
  const s = HH.Inv.makeItem('frozen_chicken', 1); s.frz = 1; chest.inv.cold = 1; HH.Inv.add(chest.inv, s);
  HH.GameClock.advance(20 * 60);                        // 20 h without power (hold 24 h)
  const before = { frz: s.frz, cold: +chest.inv.cold.toFixed(2) };
  const shelf = HH.S.home.furniture.find((f) => f.type === 'big_rack');
  HH.Inv.add(shelf.inv, HH.Inv.makeItem('gasoline_5l', 2));
  const added = Appliances.refuel(ch); Appliances.setGen(true);
  HH.S.home.loads[HH.S.home.furniture.find((f) => f.type === 'large_freezer').uid] = false;
  HH.GameClock.advance(10 * 60);
  const g = Appliances.genState(Appliances.generator());
  return { before, added, after: { frz: s.frz, cold: +chest.inv.cold.toFixed(2), stage: Food.stage(s) }, fuelLeft: +g.fuel.toFixed(2), alloc: [...Appliances.allocation().set].length, watts: Appliances.allocation().watts };
}));
// Shops: refrigerated goods fresh until failure+hold, open-air produce spoils from outbreak
R('shops', await page.evaluate(() => {
  const st = World.ensureLoc('market');   // generated after the outbreak → caught up
  let produce = { fresh: 0, spoiled: 0 }; for (const f of st.furniture) if (f.inv && f.pool === 'mk_veg') HH.Inv.walk(f.inv, (it) => { const s = Food.stage(it); produce[s === 'fresh' || s === 'aging' ? 'fresh' : 'spoiled']++; });
  const sm = World.ensureLoc('supermarket');
  let chill = {}; for (const f of sm.furniture) if (f.inv && f.inv.temp !== 'ambient') HH.Inv.walk(f.inv, (it) => { const s = Food.stage(it) + (it.frz >= 0.99 ? '/frozen' : ''); chill[s] = (chill[s] || 0) + 1; });
  return { day: Math.floor(HH.S.time.min / 1440), marketVeg: produce, supermarketColdItems: chill };
}));
report(errs);
await browser.close();
