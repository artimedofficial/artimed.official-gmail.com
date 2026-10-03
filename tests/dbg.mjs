import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1000, h: 700 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'soldier', difficulty: 'standard', name: 'ทดสอบ' }));
console.log('meds after newRun:', await page.evaluate(() => JSON.stringify(HH.S.chars[0].meds)));
await page.evaluate(() => { HH.S.flags.debugSustain = true; HH.GameClock.advance(5 * 1440 + 10 * 60 - HH.S.time.min); HH.S.flags.debugSustain = false; const d = HH.S.chars[0]; d.equip.weapon = HH.Inv.makeItem('baseball_bat'); HH.Scene.avatar.refreshGear(); HH.Scene.enter('supermarket'); HH.GameClock.setSpeed(4); });
await page.waitForTimeout(500);
console.log(await page.evaluate(async () => {
  const d = HH.S.chars[0];
  HH.S.flags.invulnerable = true;
  const z = HH.Zombies.alive()[0];
  HH.Combat.engage(z);
  const trace = [];
  for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 200)); trace.push({ dist: +Math.hypot(z.x - d.pos.x, z.z - d.pos.z).toFixed(2), tgt: !!HH.Combat.target, cd: +HH.Combat.cd.toFixed(2), moving: HH.Scene.avatar.isMoving(), zs: z.state, zhp: Math.round(z.hp), mode: HH.Game.mode, err: window.HH_LAST_ERROR && window.HH_LAST_ERROR.msg }); }
  return JSON.stringify(trace.filter((_, i) => i % 3 === 0));
}));
report(errs);
await browser.close();
