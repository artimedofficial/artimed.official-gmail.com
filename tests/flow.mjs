import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch();
await bootPreset(page, 'medium');
await page.evaluate(() => HH.Game.newRun({ bg: 'handyman', difficulty: 'standard', name: 'ทดสอบ' }));
await page.waitForTimeout(1500);
const fpsHome = await page.evaluate(() => HH.Render.fps.value);
// Project a furniture item to the screen and click it (real picking path).
const proj = (type) => page.evaluate((type) => {
  const f = HH.S.home.furniture.find((x) => x.type === type);
  const o = HH.HomeScene.W.furn.get(f.uid);
  const box = new THREE.Box3().setFromObject(o); const c = box.getCenter(new THREE.Vector3());
  c.project(HH.Render.camera);
  const r = HH.Render.renderer.domElement.getBoundingClientRect();
  return { x: (c.x + 1) / 2 * r.width, y: (1 - c.y) / 2 * r.height, uid: f.uid };
}, type);
// Speed up sim time so walking finishes quickly in software rendering.
await page.evaluate(() => { HH.GameClock.setSpeed(4); });
const p = await proj('pantry');
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(400);
await page.mouse.click(p.x, p.y);
await page.waitForFunction(() => HH.InvUI.isOpen, null, { timeout: 90000 });
console.log('pantry opened via click; char pos', await page.evaluate(() => HH.S.chars[0].pos));
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/inv-pantry.png' });
// Take all
await page.click('text=เอาทั้งหมด');
await page.waitForTimeout(300);
console.log('after take all', await page.evaluate(() => ({ pockets: HH.S.chars[0].pockets.slots.length, pantryLeft: HH.S.home.furniture.find((f) => f.type === 'pantry').inv.slots.length })));
// Store all back
await page.click('text=เก็บทั้งหมด');
await page.waitForTimeout(300);
console.log('after store all', await page.evaluate(() => ({ pockets: HH.S.chars[0].pockets.slots.length, pantry: HH.S.home.furniture.find((f) => f.type === 'pantry').inv.slots.length })));
// Auto-sort the pantry
await page.click('text=จัดเรียงอัตโนมัติ');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/inv-sorted.png' });
await page.keyboard.press('Escape');
// Debug: give a medium backpack + pouch into the ground pile, then equip via drag
await page.evaluate(() => {
  const ch = HH.activeChar(); const pile = HH.HomeScene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true);
  HH.Inv.add(pile.inv, HH.Inv.makeItem('backpack_medium')); HH.Inv.add(pile.inv, HH.Inv.makeItem('pouch')); HH.Inv.add(pile.inv, HH.Inv.makeItem('plank', 2));
  HH.Inv.add(pile.inv, HH.Inv.makeItem('canned_tuna', 6));
});
await page.keyboard.press('KeyI');
await page.waitForFunction(() => HH.InvUI.isOpen);
await page.waitForTimeout(400);
// Drag backpack from ground grid onto the back slot
const bp = await page.evaluate(() => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === 'backpack_medium'); const r = el.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; });
const slot = await page.evaluate(() => { const r = document.querySelector('.eslot[data-slot=back]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(bp.x, bp.y); await page.mouse.down(); await page.mouse.move(bp.x + 20, bp.y + 20, { steps: 4 }); await page.mouse.move(slot.x, slot.y, { steps: 8 }); await page.mouse.up();
await page.waitForTimeout(300);
console.log('backpack equipped:', await page.evaluate(() => HH.S.chars[0].equip.back && HH.S.chars[0].equip.back.id));
// Drag plank into backpack grid, rotating with R (1x4 → 4x1)
const grids = await page.evaluate(() => [...document.querySelectorAll('#inv .grid')].map((g) => ({ label: g._c.label, r: g.getBoundingClientRect().toJSON() })));
const bpGrid = grids.find((g) => g.label === 'เป้กลาง');
const pl = await page.evaluate(() => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === 'plank'); const r = el.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; });
await page.mouse.move(pl.x, pl.y); await page.mouse.down(); await page.mouse.move(pl.x + 30, pl.y + 10, { steps: 4 });
await page.keyboard.press('KeyR');
await page.mouse.move(bpGrid.r.x + 12, bpGrid.r.y + 12, { steps: 8 });
await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/inv-drag.png' });
await page.mouse.up();
await page.waitForTimeout(300);
console.log('plank in backpack (rotated?):', await page.evaluate(() => { const s = HH.S.chars[0].equip.back.inv.slots.find((s) => s.it.id === 'plank'); return s ? { x: s.x, y: s.y, r: s.r, qty: s.it.qty } : null; }));
// Nest pouch into backpack by dropping onto the backpack item? (backpack is equipped) → drop onto pocket grid then onto bag item
const pouchRes = await page.evaluate(() => {
  const ch = HH.activeChar(); const pile = HH.InvUI.ground.inv;
  const s = pile.slots.find((x) => x.it.id === 'pouch');
  return HH.Inv.transfer(pile, s, [ch.d.equip.back.inv]);
});
console.log('pouch nested into backpack:', pouchRes, ' nest-self guard:', await page.evaluate(() => { const b = HH.S.chars[0].equip.back; return HH.Inv.wouldNestIntoSelf(b, b.inv); }));
// Shift-click tuna to quick transfer to player
const tn = await page.evaluate(() => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === 'canned_tuna'); const r = el.getBoundingClientRect(); return { x: r.x + 8, y: r.y + 8 }; });
await page.keyboard.down('Shift'); await page.mouse.click(tn.x, tn.y); await page.keyboard.up('Shift');
await page.waitForTimeout(200);
console.log('tuna in player containers:', await page.evaluate(() => HH.activeChar().containers().reduce((n, c) => n + HH.Inv.count(c, 'canned_tuna'), 0)));
await page.screenshot({ path: 'shots/inv-player.png' });
// Weight limits: overfill a shopping bag
console.log('weight-limit check:', await page.evaluate(() => { const c = HH.Inv.makeContainer(3, 3, 8, 'bag'); const left = HH.Inv.add(c, HH.Inv.makeItem('water_6l', 2)); return { left, weight: HH.Inv.weight(c) }; }));
await page.keyboard.press('Escape');
// Night + stairs + sleep: jump to 21:00, walk to master bed on floor 1
await page.evaluate(() => { const m = HH.S.time.min; HH.GameClock.advance(21 * 60 - (m % 1440)); });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/home-night.png' });
await page.evaluate(() => { const bed = HH.S.home.furniture.find((f) => f.type === 'bed_double'); HH.HomeScene.doAction(bed, 'sleep'); });
await page.waitForFunction(() => document.querySelector('.sleepopts'), null, { timeout: 180000 });
console.log('reached bed via stairs; floor', await page.evaluate(() => HH.S.chars[0].pos.floor));
await page.screenshot({ path: 'shots/upper-night.png' });
await page.click('.sleepopts .mbtn >> nth=0');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/sleeping.png' });
await page.waitForFunction(() => HH.GameClock.sleepUntil == null, null, { timeout: 240000 });
console.log('woke at', await page.evaluate(() => { const m = HH.S.time.min; return [Math.floor(m / 1440), Math.floor(m % 1440 / 60)]; }), 'energy', await page.evaluate(() => Math.round(HH.S.chars[0].needs.energy)));
// Save, reload, continue
await page.evaluate(() => HH.Save.saveRun('test'));
const before = await page.evaluate(() => ({ min: HH.S.time.min, back: HH.S.chars[0].equip.back.id, pos: HH.S.chars[0].pos }));
await page.reload();
await page.waitForFunction(() => window.HH && HH.Game.mode === 'menu', null, { timeout: 120000 });
await page.click('text=เล่นต่อ');
await page.waitForFunction(() => HH.Game.mode === 'play');
const after = await page.evaluate(() => ({ min: HH.S.time.min, back: HH.S.chars[0].equip.back && HH.S.chars[0].equip.back.id, pos: HH.S.chars[0].pos }));
console.log('save/reload ok:', before.min === after.min && before.back === after.back, before, after);
console.log('fps home(medium, swiftshader):', fpsHome.toFixed(1));
report(errs);
await browser.close();
