import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.screenshot({ path: 'shots/menu-1366.png' });
await page.evaluate(() => HH.Game.newRun({ bg: 'soldier', difficulty: 'relaxed', name: 'ทดสอบ' }));
await page.waitForTimeout(600);
// Eat & drink via inventory context menu
await page.evaluate(() => { const ch = HH.activeChar(); HH.Inv.add(ch.d.pockets, HH.Inv.makeItem('noodle_pack', 2)); HH.Inv.add(ch.d.pockets, HH.Inv.makeItem('water_600', 1)); ch.d.needs.satiety = 30; ch.d.needs.hydration = 30; });
await page.keyboard.press('KeyI');
await page.waitForTimeout(300);
const box = async (id) => page.evaluate((id) => { const el = [...document.querySelectorAll('#inv .item')].find((e) => e._slot.it.id === id); const r = el.getBoundingClientRect(); return { x: r.x + 8, y: r.y + 8 }; }, id);
let b = await box('noodle_pack');
await page.mouse.click(b.x, b.y, { button: 'right' });
await page.waitForSelector('#ctxmenu');
await page.screenshot({ path: 'shots/ctxmenu.png' });
await page.click('#ctxmenu button >> nth=0');
await page.waitForSelector('.eatbtns button.primary'); await page.screenshot({ path: 'shots/eat-portion.png' }); await page.click('.eatbtns button.primary');
await page.waitForTimeout(200);
b = await box('water_600'); await page.mouse.dblclick(b.x, b.y);
await page.waitForSelector('.eatbtns button.primary'); await page.click('.eatbtns button.primary');
await page.waitForTimeout(200);
console.log('after eating:', await page.evaluate(() => { const ch = HH.activeChar(); const n = ch.d.pockets.slots.find((s) => s.it.id === 'noodle_pack'); return { sat: Math.round(ch.d.needs.satiety), hyd: Math.round(ch.d.needs.hydration), noodle: n && { qty: n.it.qty, st: n.it.st } }; }));
// Tooltip
b = await box('noodle_pack'); await page.mouse.move(b.x, b.y); await page.waitForTimeout(250);
await page.screenshot({ path: 'shots/tooltip.png' });
await page.keyboard.press('Escape');
await page.waitForFunction(() => !HH.InvUI.isOpen);
// Panels
for (const [label, shot] of [['ทักษะ', 'skills'], ['บันทึก', 'log'], ['ปุ่มลัด', 'help']]) {
  await page.click(`.bottombar button:has-text("${label}"), .bottombar button[title="${label}"] >> nth=0`);
  await page.waitForSelector('.modal');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `shots/${shot}.png` });
  await page.keyboard.press('Escape');
}
console.log('state before pause:', await page.evaluate(() => ({ mode: HH.Game.mode, modal: HH.Modal.isOpen(), inv: HH.InvUI.isOpen, title: document.querySelector('.modal h3, .modal .mtitle') && document.querySelector('.modal h3, .modal .mtitle').textContent })));
await page.keyboard.press('Escape'); await page.waitForSelector('.pmenu');
await page.click('.pmenu >> text=ตั้งค่า'); await page.waitForSelector('.settings'); await page.waitForTimeout(150);
await page.screenshot({ path: 'shots/settings.png' });
await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
await page.keyboard.press('F9'); await page.waitForSelector('.debug');
await page.screenshot({ path: 'shots/debug.png' });
// Debug: jump to day 3 08:00 through all systems
await page.fill('.debug input >> nth=0', '3'); await page.fill('.debug input >> nth=1', '8');
await page.click('.debug button:text-is("ไป")');
console.log('after jump:', await page.evaluate(() => ({ min: HH.S.time.min, outbreak: HH.S.flags.outbreak, log: HH.S.log.slice(-3).map((l) => l.msg) })));
await page.keyboard.press('Escape');
// Asset override: tiny embedded glTF triangle replaces prop.crate; data-URI icon override
const gltf = await page.evaluate(async () => {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pos.buffer)));
  const doc = { asset: { version: '2.0' }, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36, uri: 'data:application/octet-stream;base64,' + b64 }], bufferViews: [{ buffer: 0, byteLength: 36 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }] };
  ASSET_OVERRIDES['prop.crate'] = 'data:model/gltf+json;base64,' + btoa(JSON.stringify(doc));
  ASSET_OVERRIDES['icon.egg'] = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="24" fill="gold"/></svg>');
  const holder = HH.AssetRegistry.create('prop.crate', {});
  await new Promise((r) => setTimeout(r, 800));
  let tris = 0; holder.traverse((o) => { if (o.isMesh) tris += o.geometry.attributes.position.count / 3; });
  return { children: holder.children.length, tris, icon: HH.Icons.get('egg').slice(0, 26) };
});
console.log('override:', gltf);
report(errs);
await browser.close();
