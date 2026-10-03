import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'cook', difficulty: 'standard', name: 'ทดสอบ' }));
await page.waitForTimeout(400);
await page.evaluate(() => {
  const ch = HH.activeChar(); const p = ch.d.pockets;
  HH.Inv.add(p, HH.Inv.makeItem('noodle_pack', 3)); HH.Inv.add(p, HH.Inv.makeItem('canned_tuna', 2));
  Food.eat(ch, p, p.slots.find((s) => s.it.id === 'canned_tuna'), 1);
  const fridge = HH.S.home.furniture.find((f) => f.type === 'fridge');
  const st = HH.Inv.makeItem('beef_steak', 2); st.frz = 1; HH.Inv.add(fridge.sub, st);
  const st2 = HH.Inv.makeItem('chicken_whole', 1); st2.frz = 0.55; HH.Inv.add(fridge.inv, st2);
  const old = HH.Inv.makeItem('morning_glory', 1); old.age = 0.85; HH.Inv.add(fridge.inv, old);
});
// Eat panel via double-click on the noodle stack
await page.keyboard.press('KeyI'); await page.waitForTimeout(300);
const pt = await page.evaluate(() => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === 'noodle_pack' && !e._slot.it.st); const r = el.getBoundingClientRect(); return { x: r.x + 8, y: r.y + 8 }; });
await page.mouse.dblclick(pt.x, pt.y); await page.waitForSelector('.eatbox'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/eat-panel.png' });
await page.click('.eatbtns button >> nth=2');   // ½ pack
await page.waitForTimeout(300);
console.log('after ½ pack:', await page.evaluate(() => HH.S.chars[0].pockets.slots.map((s) => s.it.id + (s.it.st && s.it.st.opened ? '[' + s.it.st.portionsLeft + '/' + Food.total(s.it) + ']' : 'x' + s.it.qty))));
await page.keyboard.press('Escape');
// Freezer interface with thaw progress: open the fridge
await page.evaluate(() => { const f = HH.S.home.furniture.find((f) => f.type === 'fridge'); HH.InvUI.open(f); HH.InvUI.tab = 1; HH.InvUI.render(); });
await page.waitForTimeout(400);
const st = await page.evaluate(() => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === 'beef_steak'); const r = el.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; });
await page.mouse.move(st.x, st.y); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/freezer-ui.png' });
await page.evaluate(() => { HH.InvUI.tab = 0; HH.InvUI.render(); });
await page.waitForTimeout(200);
const ck = await page.evaluate(() => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === 'chicken_whole'); const r = el.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; });
await page.mouse.move(ck.x, ck.y); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/fridge-thaw.png' });
await page.keyboard.press('Escape');
// Eat Meal preview, nutrition, stock, cooking
await page.click('.bottombar button:has-text("กินมื้อ")'); await page.waitForSelector('.meal'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/meal.png' }); await page.keyboard.press('Escape');
await page.keyboard.press('KeyN'); await page.waitForSelector('.nutri'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/nutrition.png' }); await page.keyboard.press('Escape');
await page.click('.bottombar button:has-text("เสบียง")'); await page.waitForSelector('.stock'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/stock.png' }); await page.keyboard.press('Escape');
await page.keyboard.press('KeyC'); await page.waitForSelector('.cook'); await page.waitForTimeout(300);
await page.click('.rbtn:has-text("ผัดกะเพรา")'); await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/cook.png' });
// Cook noodle soup for real via UI
await page.click('.rbtn:has-text("บะหมี่น้ำ")'); await page.waitForTimeout(200);
const before = await page.evaluate(() => HH.S.time.min);
await page.click('.rdetail button.primary'); await page.waitForTimeout(300);
console.log('cooked:', await page.evaluate((b) => ({ minutes: HH.S.time.min - b, dish: (() => { let r = null; for (const c of HH.activeChar().containers()) for (const s of c.slots) if (s.it.id === 'dish_noodle_soup') r = { portions: s.it.st.portionsLeft, kcal: Math.round(s.it.st.nut.kcal), q: s.it.st.quality }; return r; })(), gas: HH.S.home.gas.toFixed(2), cookingXP: HH.S.chars[0].skills.cooking }), before));
report(errs);
await browser.close();
