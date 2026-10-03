import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'warehouse', difficulty: 'standard', name: 'ทดสอบ' }));
await page.evaluate(() => { HH.GameClock.setSpeed(4); const d = HH.S.chars[0]; d.pos.x = -1.5; d.pos.z = -3; HH.HomeScene.avatar.syncFromData(); HH.Render.cam.dist = 12; });
await page.waitForTimeout(2500);
const stairPt = () => page.evaluate(() => {
  const c = new THREE.Vector3(0.4, 1.55, -3.5); c.project(HH.Render.camera); // a point on the treads
  return { x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight };
});
let p = await stairPt();
await page.mouse.move(p.x, p.y); await page.waitForTimeout(300);
console.log('hover hint:', await page.evaluate(() => document.querySelector('.hint').textContent));
await page.screenshot({ path: 'shots/stairs-hover.png' });
p = await stairPt();
await page.mouse.click(p.x, p.y);
for (let i = 0; i < 2; i++) { await page.waitForTimeout(2000); console.log(await page.evaluate(() => JSON.stringify({ pos: HH.S.chars[0].pos, path: HH.HomeScene.avatar.path.length, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join('|') }))); }
await page.waitForFunction(() => HH.S.chars[0].pos.floor === 1 && !HH.HomeScene.avatar.isMoving(), null, { timeout: 180000 });
console.log('UP ok, floor', await page.evaluate(() => HH.S.chars[0].pos), 'view', await page.evaluate(() => HH.Render.viewFloor));
await page.screenshot({ path: 'shots/stairs-up.png' });
await page.waitForTimeout(2500);
p = await page.evaluate(() => { const c = new THREE.Vector3(0.4, 3.0, -3.0); c.project(HH.Render.camera); return { x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight }; });
await page.mouse.click(p.x, p.y);
await page.waitForFunction(() => HH.S.chars[0].pos.floor === 0 && !HH.HomeScene.avatar.isMoving(), null, { timeout: 180000 });
console.log('DOWN ok');
// Storage: carry items, choose pantry from the dropdown, drag left → right
await page.evaluate(() => { const ch = HH.activeChar(); HH.Inv.add(ch.d.pockets, HH.Inv.makeItem('canned_tuna', 3)); });
await page.keyboard.press('KeyI'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/inv-hint.png' });
const pantryUid = await page.evaluate(() => HH.S.home.furniture.find((f) => f.type === 'pantry').uid);
await page.selectOption('select.goto', pantryUid);
await page.waitForFunction(() => HH.InvUI.isOpen && HH.InvUI.furn && HH.InvUI.furn.type === 'pantry', null, { timeout: 180000 });
await page.waitForTimeout(300);
const src = await page.evaluate(() => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === 'canned_tuna' && e._c === HH.S.chars[0].pockets); const r = el.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; });
const dst = await page.evaluate(() => { const g = [...document.querySelectorAll('#inv .grid')].find((g) => g._side === 'R'); const r = g.getBoundingClientRect(); return { x: r.right - 12, y: r.bottom - 12 }; });
await page.mouse.move(src.x, src.y); await page.mouse.down(); await page.mouse.move(src.x + 30, src.y, { steps: 4 }); await page.mouse.move(dst.x, dst.y, { steps: 10 }); await page.mouse.up();
await page.waitForTimeout(300);
console.log('tuna moved to pantry:', await page.evaluate(() => ({ pockets: HH.Inv.count(HH.S.chars[0].pockets, 'canned_tuna'), pantry: HH.Inv.count(HH.S.home.furniture.find((f) => f.type === 'pantry').inv, 'canned_tuna') })));
await page.screenshot({ path: 'shots/inv-stored.png' });
report(errs);
await browser.close();
