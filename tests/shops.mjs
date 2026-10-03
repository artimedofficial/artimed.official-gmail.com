import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'warehouse', difficulty: 'standard', name: 'ทดสอบ' }));
await page.waitForTimeout(500);
// Map via M key
await page.keyboard.press('KeyM'); await page.waitForSelector('.mapwrap'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/map.png' });
await page.keyboard.press('Escape');
const ids = await page.evaluate(() => HH.LOCATIONS && Object.keys(HH.LOCATIONS).filter((k) => k !== 'home'));
for (const id of ids) {
  await page.evaluate((id) => { HH.S.time.min = 1440 * 0 + 11 * 60; return HH.Travel.go(id, 'walk'); }, id);
  await page.waitForFunction((id) => HH.S.scene === id && document.getElementById('travel').hidden, id, { timeout: 60000 });
  await page.evaluate(() => { HH.Render.cam.dist = 20; HH.Render.cam.follow = false; const r = HH.LOCATIONS[HH.S.scene].room; HH.Render.cam.tx = (r.x0 + r.x1) / 2; HH.Render.cam.tz = (r.z0 + r.z1) / 2 + 1; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `shots/loc-${id}.png` });
  console.log(id, await page.evaluate((id) => { const st = HH.S.locs[id]; return { fixtures: st.furniture.length, items: HH.World.countItems(st), unpaid: st.furniture.filter((f) => f.inv).every((f) => f.inv.slots.every((s) => s.it.unpaid === id)), calls: HH.Render.renderer.info.render.calls, tris: HH.Render.renderer.info.render.triangles }; }, id));
}
// Shopping loop at the supermarket: take a trolley, fill it, pay, go home
console.log('shop loop:', await page.evaluate(() => {
  const ch = HH.activeChar(); const st = HH.S.locs.supermarket;
  const bay = st.furniture.find((f) => f.type === 'cart_bay');
  const tSlot = bay.inv.slots.find((s) => s.it.id === 'shopping_trolley'); HH.Inv.remove(bay.inv, tSlot); ch.d.equip.hand = tSlot.it;
  const dry = st.furniture.find((f) => f.pool === 'sm_dry'), can = st.furniture.find((f) => f.pool === 'sm_canned');
  HH.Inv.transferAll(dry.inv, ch.containers()); HH.Inv.transferAll(can.inv, ch.containers());
  const list = HH.Shop.unpaid(ch); const tot = HH.Shop.total(list); const cash0 = HH.S.cash;
  const paid = HH.Shop.pay(ch);
  return { carriedKg: ch.carried().toFixed(1), cap: ch.capacity().toFixed(1), items: list.length, total: tot, paid, cashAfter: HH.S.cash, spent: cash0 - HH.S.cash, leftUnpaid: HH.Shop.unpaid(ch).length };
}));
// Unpaid leaving guard: take an item and try to travel via the map UI → checkout prompt
await page.evaluate(() => { const ch = HH.activeChar(); const st = HH.S.locs.supermarket; const f = st.furniture.find((f) => f.pool === 'sm_snacks'); HH.Inv.transfer(f.inv, f.inv.slots[0], ch.containers()); });
await page.keyboard.press('KeyM'); await page.waitForSelector('.mapwrap');
await page.evaluate(() => { HH.MapUI_sel = null; });
await page.click('.mapcard button.primary');
await page.waitForTimeout(400);
console.log('leave guard → checkout shown:', await page.evaluate(() => !!document.querySelector('.checkout')));
await page.screenshot({ path: 'shots/checkout.png' });
await page.click('.mfoot button.primary');
await page.waitForTimeout(300);
// travel home
await page.evaluate(() => HH.Travel.go('home', 'walk'));
await page.waitForFunction(() => HH.S.scene === 'home' && document.getElementById('travel').hidden, null, { timeout: 60000 });
console.log('home again; time', await page.evaluate(() => HH.S.time.min), 'pos', await page.evaluate(() => HH.S.chars[0].pos));
// closed shop check (market closes 13:00): at 15:00 travel button disabled
await page.evaluate(() => { HH.S.time.min = 15 * 60; });
console.log('market open at 15:00?', await page.evaluate(() => shopOpen('market', 15 * 60)));
// Outbreak clears unpaid + depletion
console.log('outbreak:', await page.evaluate(() => {
  const st = HH.S.locs.conv; const before = HH.World.countItems(st);
  HH.GameClock.advance(1440 * 1 + 6 * 60 - HH.S.time.min + 1440 * 10);
  HH.World.deplete('conv');
  let unpaid = 0; for (const f of st.furniture) if (f.inv) HH.Inv.walk(f.inv, (it) => { if (it.unpaid) unpaid++; });
  return { before, after: HH.World.countItems(st), looted: HH.World.lootPct('conv'), unpaid };
}));
// Save round-trip with locations
console.log('save rt:', await page.evaluate(() => { HH.Save.saveRun('t'); const r = HH.Save.loadRun(); return { locs: Object.keys(r.locs), scene: r.scene }; }));
report(errs);
await browser.close();
