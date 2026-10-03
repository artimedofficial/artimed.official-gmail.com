import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
import { writeFileSync } from 'node:fs';
const { browser, page, errs } = await launch({ w: 1280, h: 720 });
await bootPreset(page, 'medium');
await page.evaluate(() => HH.Game.newRun({ bg: 'cook', difficulty: 'hardcore', name: 'ทดสอบ' }));
await page.evaluate(() => { const d = HH.S.chars[0]; d.pos.x = 2.5; d.pos.z = 0; HH.HomeScene.avatar.syncFromData(); HH.S.time.min = 10 * 60; });
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `shots/rot${i}.png` });
  await page.keyboard.press('KeyE');
}
// Export via the real button (download)
await page.keyboard.press('Escape');
await page.waitForSelector('.pmenu');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=ส่งออกไฟล์เซฟ (.json)')]);
const path = 'shots/export.json'; await dl.saveAs(path);
const exported = JSON.parse((await import('node:fs')).readFileSync(path, 'utf8'));
console.log('export kind', exported.kind, 'diff', exported.run.difficulty, 'items in pantry', exported.run.home.furniture.find((f) => f.type === 'pantry').inv.slots.length);
// Corrupt a copy and import → sanitizer must survive
exported.run.chars[0].needs.satiety = 'NaN'; exported.run.time.min = -50; exported.run.difficulty = 'hacked';
exported.run.home.furniture[13].inv.slots.push({ it: { id: 'no_such_item', qty: 3 }, x: 0, y: 0 }, null, { it: { id: 'egg', qty: 999 }, x: 99, y: 99 });
writeFileSync('shots/bad.json', JSON.stringify(exported));
await page.keyboard.press('Escape');
await page.evaluate(() => HH.Game.toMenu(false));
await page.setInputFiles('#menu input[type=file]', 'shots/bad.json');
await page.waitForTimeout(1500);
const imp = await page.evaluate(() => ({ diff: HH.S.difficulty, min: HH.S.time.min, sat: HH.S.chars[0].needs.satiety, eggs: HH.S.home.furniture[13].inv.slots.filter((s) => s.it.id === 'egg').map((s) => s.it.qty) }));
console.log('imported+sanitized', imp);
// Rejections
for (const bad of ['not json', '{"kind":"other"}', '{"kind":"hoardhold-save"}', JSON.stringify({ kind: 'hoardhold-save', profile: { schema: 99 } })]) {
  console.log('reject:', await page.evaluate((t) => { try { HH.Save.parseImport(t); return 'ACCEPTED?!'; } catch (e) { return e.message; } }, bad));
}
// Fuzz the run sanitizer directly
console.log('fuzz:', await page.evaluate(() => {
  const st = HH.createRun({ bg: 'farmer', difficulty: 'relaxed', name: 'x' });
  st.chars[0].skills = 'nope'; st.chars[0].equip.back = { id: 'egg', qty: 1 }; st.log = 'x'; st.home.furniture = [null, { type: 'x' }]; st.cash = Infinity;
  const r = HH.Sanitize.run(JSON.parse(JSON.stringify(st)));
  return { cash: r.cash, furn: r.home.furniture.length, back: r.chars[0].equip.back, skills: Object.keys(r.chars[0].skills).length, log: Array.isArray(r.log) };
}));
report(errs);
await browser.close();
