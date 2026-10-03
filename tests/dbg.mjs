import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'warehouse', difficulty: 'standard', name: 'ทดสอบ' }));
await page.evaluate(() => { HH.GameClock.setSpeed(4); const d = HH.S.chars[0]; d.pos.x = -1.5; d.pos.z = -3; HH.HomeScene.avatar.syncFromData(); HH.Render.cam.dist = 12; });
await page.waitForTimeout(2500);
const p = await page.evaluate(() => { const c = new THREE.Vector3(0.4, 1.55, -3.5); c.project(HH.Render.camera); return { x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight }; });
await page.mouse.click(p.x, p.y);
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2500);
  console.log(await page.evaluate(() => { const a = HH.HomeScene.avatar; return JSON.stringify({ pos: HH.S.chars[0].pos, path: a.path.length, stair: !!a.stairFrom, y: a.obj.position.y.toFixed(2), fps: HH.Render.fps.value.toFixed(1) }); }));
}
report(errs);
await browser.close();
