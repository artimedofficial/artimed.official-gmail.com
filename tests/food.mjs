import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'cook', difficulty: 'standard', name: 'ทดสอบ' }));
await page.waitForTimeout(400);
const R = (label, v) => console.log(label, JSON.stringify(v));
// #14 catalogue
R('#14 catalogue', await page.evaluate(() => ({ foodDrink: Object.values(HH.ITEMS).filter((d) => d.cat === 'food' || d.cat === 'drink').length, recipes: RECIPES.length })));
// #11 portions + opened variants with their own timers
R('#11 portions', await page.evaluate(() => {
  const ch = HH.activeChar(); const p = ch.d.pockets;
  HH.Inv.add(p, HH.Inv.makeItem('noodle_pack', 3)); HH.Inv.add(p, HH.Inv.makeItem('canned_tuna', 2));
  const sN = p.slots.find((s) => s.it.id === 'noodle_pack'), sT = p.slots.find((s) => s.it.id === 'canned_tuna');
  Food.eat(ch, p, sN, 2); Food.eat(ch, p, sT, 1);
  const openedN = p.slots.find((s) => s.it.id === 'noodle_pack' && Food.isOpened(s.it));
  const openedT = p.slots.find((s) => s.it.id === 'canned_tuna' && Food.isOpened(s.it));
  const unopenedN = p.slots.find((s) => s.it.id === 'noodle_pack' && !Food.isOpened(s.it));
  // Put a second opened tuna in the fridge and compare spoilage after 12 h
  const fridge = HH.S.home.furniture.find((f) => f.type === 'fridge');
  const tuna2 = HH.Inv.makeItem('canned_tuna', 1); Food.open(tuna2, 'fridge'); tuna2.st.portionsLeft = 3; HH.Inv.add(fridge.inv, tuna2);
  HH.GameClock.advance(12 * 60);
  return { noodleOpened: openedN && openedN.it.st.portionsLeft + '/' + Food.total(openedN.it), noodleStackLeft: unopenedN && unopenedN.it.qty, tunaOpened: openedT && openedT.it.st.portionsLeft,
    iconDiffers: HH.Icons.get('canned_tuna', true) !== HH.Icons.get('canned_tuna') || 'composite pending',
    tunaAmbientStage: Food.stage(openedT.it), tunaAmbientAge: +openedT.it.age.toFixed(2), tunaFridgeStage: Food.stage(tuna2), tunaFridgeAge: +tuna2.age.toFixed(2) };
}));
// #12 rations & Eat Meal
R('#12 rations', await page.evaluate(() => {
  const ch = HH.activeChar(); const s = StockUI.gather(ch); const need = Body.need(ch.d);
  const days = Object.fromEntries(Object.entries(RATIONS).map(([k, r]) => [k, +(s.kcal / (need * r.f)).toFixed(1)]));
  HH.S.food.reserve.push('canned_sardine');
  const plan = Meal.plan(ch);
  const ids = plan.rows.map((r) => r.e.it.id + (Food.isOpened(r.e.it) ? '(opened)' : '') + ':' + r.n);
  return { days, plan: ids, usesSardine: ids.some((x) => x.startsWith('canned_sardine')) };
}));
// #13 seven days on Emergency → weakness; Recovery reverses
R('#13 emergency', await page.evaluate(() => {
  const ch = HH.activeChar(); const d = ch.d;
  d.nut.ration = 'emergency';
  const cap0 = ch.capacity().toFixed(1);
  // Simulate 7 days: eat 3 meals/day by the planner from an unlimited debug larder
  const larder = HH.Inv.makeContainer(20, 20, 9999, 'larder');
  HH.S.home.piles.push({ uid: 'lard', floor: 0, x: 0, z: 0, inv: larder });
  const restock = () => { larder.slots = []; for (const id of ['canned_tuna', 'noodle_pack', 'biscuits', 'banana', 'uht_milk', 'canned_corn', 'peanut_butter']) HH.Inv.add(larder, HH.Inv.makeItem(id, 10)); };
  const log = [];
  for (let day = 0; day < 7; day++) {
    for (const h of [7, 12, 18]) { restock(); const p = Meal.plan(ch); Meal.eat(ch, p.rows); HH.GameClock.advance(5 * 60); }
    HH.GameClock.advance(24 * 60 - 15 * 60);
    d.needs.hydration = 90; d.needs.energy = 80;
    log.push(Math.round(d.nut.reserve));
  }
  const st7 = Body.stage(d).name, cap7 = ch.capacity().toFixed(1), heal7 = Body.effects(d).heal.toFixed(2);
  d.nut.ration = 'recovery';
  const log2 = [];
  for (let day = 0; day < 8; day++) {
    for (const h of [7, 12, 18]) { restock(); const p = Meal.plan(ch); Meal.eat(ch, p.rows); HH.GameClock.advance(5 * 60); }
    HH.GameClock.advance(24 * 60 - 15 * 60); d.needs.hydration = 90; d.needs.energy = 80;
    log2.push(Math.round(d.nut.reserve));
  }
  HH.S.home.piles = HH.S.home.piles.filter((p) => p.uid !== 'lard');
  return { cap0, after7: { stage: st7, cap: cap7, heal: heal7, reserveByDay: log }, recovery: { stage: Body.stage(d).name, cap: ch.capacity().toFixed(1), reserveByDay: log2 } };
}));
// #16 freezer & thaw
R('#16 freeze/thaw', await page.evaluate(() => {
  const ch = HH.activeChar();
  const fridge = HH.S.home.furniture.find((f) => f.type === 'fridge');
  const steak = HH.Inv.makeItem('beef_steak', 1); HH.Inv.add(fridge.sub, steak);
  HH.GameClock.advance(6 * 60);
  const frozenAfter6h = +steak.frz.toFixed(2), ageFrozen0 = steak.age || 0;
  HH.GameClock.advance(20 * 24 * 60);       // 20 days in the freezer
  const ageAfter20d = +(steak.age || 0).toFixed(3);
  // Move to the fridge: thaw overnight
  const loc = HH.Inv.locate(fridge.sub, steak.uid); HH.Inv.remove(loc.c, loc.slot); HH.Inv.add(fridge.inv, steak);
  const thawLog = []; for (let h = 2; h <= 12; h += 2) { HH.GameClock.advance(120); thawLog.push(+steak.frz.toFixed(2)); }
  // Partial thaw then refreeze: a second steak 3 h at room temperature then back to freezer
  const s2 = HH.Inv.makeItem('beef_steak', 1); s2.frz = 1; HH.Inv.add(ch.d.pockets, s2);
  HH.GameClock.advance(60); const partial = +s2.frz.toFixed(2);
  let l2 = HH.Inv.locate(ch.d.pockets, s2.uid); HH.Inv.remove(l2.c, l2.slot); HH.Inv.add(fridge.sub, s2);
  HH.GameClock.advance(6 * 60); const refrozen = +s2.frz.toFixed(2);
  // Fully thawed raw cannot be refrozen; cooked leftover can
  const blocked = FreezeRules.check(steak, fridge.sub);
  const leftover = HH.Inv.makeItem('dish_kaprao', 1); leftover.st = { cooked: true, portionsTotal: 3, portionsLeft: 3, nut: itemDef('dish_kaprao').per };
  const cookedOk = FreezeRules.check(leftover, fridge.sub);
  // Microwave thaw
  const s3 = HH.Inv.makeItem('beef_steak', 1); s3.frz = 1; HH.Inv.add(ch.d.pockets, s3); const t0 = HH.S.time.min;
  const l3 = HH.Inv.locate(ch.d.pockets, s3.uid); Cook.microwaveThaw(ch, l3.c, l3.slot); const mwMin = HH.S.time.min - t0;
  // Can in the freezer → warn + ruined
  const can = HH.Inv.makeItem('cola', 1); const warn = FreezeRules.check(can, fridge.sub); HH.Inv.add(fridge.sub, can); HH.GameClock.advance(6 * 60);
  return { frozenAfter6h, ageFrozen0, ageAfter20d, thawFridgeEvery2h: thawLog, partial, refrozen, blockedThawedRaw: blocked, cookedLeftover: cookedOk, microwaveMinutes: mwMin, canWarn: warn, canRuined: can.st && can.st.ruined };
}));
// #17 utilities timeline + difficulty + delivery into Large slots
R('#17 utilities', await page.evaluate(() => {
  const days = {}; for (const d of [49, 50, 55, 59, 60]) { let off = 0; for (let m = 0; m < 1440; m += 10) if (!Power.gridOn(d * 1440 + m)) off += 10; days[d] = off; }
  const failStd = Power.failDay(); HH.S.difficulty = 'hardcore'; const failHard = Power.failDay(); HH.S.difficulty = 'relaxed'; const failRel = Power.failDay(); HH.S.difficulty = 'standard';
  return { offMinutesPerDay: days, failStd, failHard, failRel };
}));
report(errs);
await browser.close();
