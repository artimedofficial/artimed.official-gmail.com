import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
import { chromium } from 'playwright';
import { FILE } from './lib.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'medium');
await page.evaluate(() => HH.Game.newRun({ bg: 'soldier', difficulty: 'standard', name: 'ทดสอบ' }));
await page.evaluate(() => { HH.S.flags.debugSustain = true; HH.GameClock.advance(2 * 1440 + 16 * 60 - HH.S.time.min); HH.S.flags.debugSustain = false; const d = HH.S.chars[0]; d.equip.weapon = HH.Inv.makeItem('machete'); HH.Scene.avatar.refreshGear(); d.pos.x = -1; d.pos.z = 6; HH.Scene.avatar.syncFromData();
  for (const [x, z] of [[1.5, 8], [-3.5, 8.5], [0.5, 9.5]]) { const zb = HH.Zombies.spawn('walker', x, z); zb.state = 'chase'; }
  HH.Render.cam.dist = 9; HH.Render.cam.pitch = 0.75; HH.GameClock.setSpeed(1); });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shots/zombies-close.png' });
report(errs);
await browser.close();
// No-WebGL fallback message
const b2 = await chromium.launch({ args: ['--disable-gpu', '--disable-webgl', '--disable-webgl2', '--disable-software-rasterizer'] });
const p2 = await b2.newPage({ viewport: { width: 900, height: 600 } });
await p2.goto(FILE); await p2.waitForTimeout(4000);
console.log('fatal shown:', await p2.evaluate(() => !document.getElementById('fatal').hidden && document.getElementById('fatal').innerText.slice(0, 80)));
await p2.screenshot({ path: 'shots/nowebgl.png' });
await b2.close();
