import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch();
await bootPreset(page, process.argv[2] || 'high');
await page.evaluate(() => HH.Game.newRun({ bg: 'nurse', difficulty: 'standard', name: 'ทดสอบ' }));
await page.waitForTimeout(800);
// Icon sheet
await page.evaluate(() => {
  const box = document.createElement('div'); box.id = 'iconsheet';
  Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: 99, background: '#14100c', display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', alignContent: 'flex-start', overflow: 'hidden' });
  for (const d of Object.values(HH.ITEMS)) {
    const c = document.createElement('div');
    Object.assign(c.style, { width: d.size[0] * 40 + 'px', height: d.size[1] * 40 + 'px', border: '1px solid #3a2f22', background: '#1d1812', position: 'relative' });
    const img = new Image(); img.src = HH.Icons.get(d.id); Object.assign(img.style, { width: '100%', height: '100%' });
    c.title = d.name; c.appendChild(img); box.appendChild(c);
  }
  document.body.appendChild(box);
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/icons.png' });
await page.evaluate(() => document.getElementById('iconsheet').remove());
// Close-up of character by day
await page.evaluate(() => { HH.Render.cam.dist = 7; HH.Render.cam.pitch = 0.75; });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/char-close.png' });
// Night ground floor, character in living room
await page.evaluate(() => { HH.S.time.min = 21 * 60; const d = HH.S.chars[0]; d.pos.x = -2; d.pos.z = 0.3; d.pos.floor = 0; HH.HomeScene.avatar.syncFromData(); HH.Render.cam.dist = 15; HH.Render.cam.pitch = 0.95; });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shots/ground-night.png' });
// Sleeping pose
await page.evaluate(() => { const bed = HH.S.home.furniture.find((f) => f.type === 'bed_double'); HH.HomeScene.avatar.bed = bed; HH.S.chars[0].sleeping = true; HH.Render.setViewFloor(1); HH.Render.cam.follow = false; HH.Render.cam.tx = bed.x; HH.Render.cam.tz = bed.z; HH.Render.cam.dist = 8; });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/sleep-pose.png' });
report(errs);
await browser.close();
