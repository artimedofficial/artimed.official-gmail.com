import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 800, h: 600 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'cook', difficulty: 'standard', name: 'ทดสอบ' }));
console.log(await page.evaluate(() => {
  const ch = HH.activeChar(); const p = ch.d.pockets;
  HH.Inv.add(p, HH.Inv.makeItem('noodle_pack', 3)); HH.Inv.add(p, HH.Inv.makeItem('canned_tuna', 2));
  const before = p.slots.map((s) => s.it.id + 'x' + s.it.qty);
  const sT = p.slots.find((s) => s.it.id === 'canned_tuna');
  const r = Food.eat(ch, p, sT, 1);
  return { before, r, after: p.slots.map((s) => s.it.id + 'x' + s.it.qty + JSON.stringify(s.it.st || {})), toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent) };
}));
report(errs);
await browser.close();
