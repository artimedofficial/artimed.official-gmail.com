import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
const R = (label, v) => console.log(label, JSON.stringify(v));
// #2 new life via UI → shop in 3 stores → carry home in bags → board windows
await page.click('text=เริ่มชีวิตใหม่'); await page.waitForSelector('.charsel');
await page.click('.bgcard >> nth=1'); await page.click('.charsel button.mbtn.primary');
await page.waitForFunction(() => HH.Game.mode === 'play');
R('#2 shopping', await page.evaluate(async () => {
  const ch = HH.activeChar(); const out = { stores: [] };
  ch.d.equip.back = HH.Inv.makeItem('backpack_medium');           // starting from the wardrobe's small pack is also possible
  const go = async (id) => { await HH.Travel.go(id, 'walk'); };
  const buy = (pool, n) => { const st = HH.S.locs[HH.S.scene]; const f = st.furniture.find((x) => x.pool === pool); let k = 0; for (const s of [...f.inv.slots]) { if (k >= n) break; if (HH.Inv.transfer(f.inv, s, ch.containers())) k++; } return k; };
  HH.S.time.min = 10 * 60;
  await go('hardware'); const bay = HH.S.locs.hardware.furniture.find((f) => f.type === 'cart_bay'); const cart = bay.inv.slots.find((s) => s.it.id === 'hand_cart'); HH.Inv.remove(bay.inv, cart); ch.d.equip.hand = cart.it;
  const hw = buy('hw_lumber', 3) + buy('hw_fasteners', 4); const tot1 = HH.Shop.total(HH.Shop.unpaid(ch)); HH.Shop.pay(ch); out.stores.push({ id: 'hardware', items: hw, paid: tot1 });
  await go('supermarket'); const sm = buy('sm_canned', 10) + buy('sm_dry', 3); const tot2 = HH.Shop.total(HH.Shop.unpaid(ch)); HH.Shop.pay(ch); out.stores.push({ id: 'supermarket', items: sm, paid: tot2 });
  await go('pharmacy'); const ph = buy('ph_wound', 5) + buy('ph_meds', 3); const tot3 = HH.Shop.total(HH.Shop.unpaid(ch)); HH.Shop.pay(ch); out.stores.push({ id: 'pharmacy', items: ph, paid: tot3 });
  await go('home');
  out.cashLeft = HH.S.cash; out.spent = 200000 - HH.S.cash; out.load = +ch.load().toFixed(2); out.capacity = +ch.capacity().toFixed(1);
  out.time = HH.S.time.min;
  out.carried = ch.containers().reduce((a, c) => a + c.slots.length, 0);
  // Board two windows (planks + nails + hammer)
  HH.Inv.addToAny(ch.containers(), HH.Inv.makeItem('hammer'));
  const keys = HH.Barricades.list().filter((b) => b.kind === 'window').slice(0, 2).map((b) => b.key);
  out.boarded = keys.map((k) => HH.Barricades.build(ch, k) && HH.Barricades.get(k));
  return out;
}));
await page.waitForTimeout(800);
await page.evaluate(() => { const b = HH.Barricades.list().find((x) => x.kind === 'window'); HH.Render.cam.follow = false; HH.Render.cam.tx = b.out.x; HH.Render.cam.tz = b.out.z; HH.Render.cam.dist = 9; });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/boarded.png' });
// #3 outbreak, dusk trip to 2 locations and back; ambush fight/give/flee
R('#3 danger', await page.evaluate(async () => {
  HH.S.flags.debugSustain = true; HH.GameClock.advance(3 * 1440 + 12 * 60 - HH.S.time.min); HH.S.flags.debugSustain = false;
  const noon = { conv: Danger.level('conv').toFixed(2), market: Danger.level('market').toFixed(2) };
  HH.S.time.min = 3 * 1440 + 18 * 60 + 30;
  const dusk = { conv: Danger.level('conv').toFixed(2), market: Danger.level('market').toFixed(2) };
  return { outbreak: HH.S.flags.outbreak, noon, dusk };
}));
const trip = await page.evaluate(async () => {
  const r = []; const ch = HH.activeChar();
  HH.S.flags.invulnerable = true;
  for (const id of ['conv', 'market', 'home']) {
    await HH.Travel.go(id, 'walk');
    // If an encounter put us in a street scene, walk out of it
    let guard = 0;
    while (HH.S.scene === 'street' && guard++ < 200) { if (!HH.Scene.avatar.isMoving()) HH.Scene.leave('run'); await new Promise((res) => setTimeout(res, 100)); }
    while (document.querySelector('.ambush') && guard++ < 50) { document.querySelector('.mfoot button').click(); await new Promise((res) => setTimeout(res, 120)); }
    await new Promise((res) => setTimeout(res, 300));
    r.push({ at: HH.S.scene, zombies: HH.Zombies.alive().length, enc: HH.S.travelLog && HH.S.travelLog.enc, time: U.timeOf(HH.S.time.min).hhmm });
  }
  HH.S.flags.invulnerable = false;
  return r;
});
R('#3 trip', trip);
// Ambush: each option
for (const opt of [0, 1, 2]) {
  const res = await page.evaluate(async (opt) => {
    const ch = HH.activeChar(); HH.Inv.addToAny(ch.containers(), HH.Inv.makeItem('canned_tuna', 6)); HH.Inv.addToAny(ch.containers(), HH.Inv.makeItem('first_aid_kit'));
    const before = ch.containers().reduce((a, c) => a + c.slots.length, 0), hp0 = Math.round(ch.health());
    let resolved = false;
    HH.AmbushUI.open({ from: 'home', to: 'conv' }, () => { resolved = true; });
    await new Promise((r) => setTimeout(r, 100));
    document.querySelectorAll('.mfoot button')[opt].click();
    await new Promise((r) => setTimeout(r, 150));
    if (opt === 1) { const cells = [...document.querySelectorAll('.givecell')]; for (const c of cells) { c.click(); if (!document.querySelector('.givepick .btn.primary').disabled) break; } document.querySelector('.givepick .btn.primary').click(); }
    for (let i = 0; i < 10 && document.querySelector('.mback'); i++) { const b = document.querySelector('.mfoot button'); if (b) b.click(); await new Promise((r) => setTimeout(r, 100)); }
    await new Promise((r) => setTimeout(r, 150));
    return { opt: ['fight', 'give', 'flee'][opt], resolved, itemsBefore: before, itemsAfter: ch.containers().reduce((a, c) => a + c.slots.length, 0), hpBefore: hp0, hpAfter: Math.round(ch.health()), last: HH.S.log.slice(-1)[0].msg };
  }, opt);
  R('#3 ambush', res);
}
// Zombies break a barricade at night at home
R('siege', await page.evaluate(async () => {
  if (HH.S.scene !== 'home') HH.Scene.enter('home');
  HH.S.time.min = 4 * 1440 + 22 * 60;
  const b = HH.Barricades.list().find((x) => x.kind === 'window' && HH.Barricades.get(x.key).hp > 0);
  const st0 = Object.assign({}, HH.Barricades.get(b.key));
  const z = HH.Zombies.spawn('walker', b.out.x, b.out.z + 0.1); z.state = 'bash'; z.bashKey = b.key; z.atkT = 0;
  HH.GameClock.setSpeed(4);
  for (let i = 0; i < 60; i++) await new Promise((r) => setTimeout(r, 100));
  const st1 = HH.Barricades.get(b.key);
  return { window: b.name, hpBefore: Math.round(st0.hp), hpAfter: Math.round(st1.hp), glass: st1.glass };
}));
await page.screenshot({ path: 'shots/siege.png' });
await page.evaluate(() => HH.Zombies.clear());
// #8 death → death screen → new life Day 0, skills intact, same world
const before = await page.evaluate(() => ({ skills: JSON.stringify(Object.fromEntries(Object.entries(HH.S.chars[0].skills).map(([k, v]) => [k, v.lv]))), seed: HH.S.worldSeed, pantry: JSON.stringify(HH.createRun({ bg: 'cook', difficulty: 'standard', name: 'x' }).home.furniture.find((f) => f.type === 'pantry').inv.slots.map((s) => [s.it.id, s.x, s.y])), convShelf: HH.S.locs.conv ? JSON.stringify(HH.S.locs.conv.furniture[0].inv.slots.slice(0, 5).map((s) => s.it.id)) : null }));
await page.evaluate(() => { const d = HH.S.chars[0]; HH.Health.damage(d, 'head', 999, 'blunt'); });
await page.waitForSelector('.death', { timeout: 10000 });
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/death.png' });
await page.click('.death button.mbtn.primary'); await page.waitForSelector('.charsel');
await page.click('.charsel button.mbtn.primary');
await page.waitForFunction(() => HH.Game.mode === 'play');
const after = await page.evaluate(async () => {
  const skills = JSON.stringify(Object.fromEntries(Object.entries(HH.S.chars[0].skills).map(([k, v]) => [k, v.lv])));
  const pantry = JSON.stringify(HH.S.home.furniture.find((f) => f.type === 'pantry').inv.slots.map((s) => [s.it.id, s.x, s.y]));
  HH.S.time.min = 10 * 60; await HH.Travel.go('conv', 'walk');
  return { day: Math.floor(HH.S.time.min / 1440), life: HH.S.life, skills, seed: HH.S.worldSeed, pantry, convShelf: JSON.stringify(HH.S.locs.conv.furniture[0].inv.slots.slice(0, 5).map((s) => s.it.id)), lives: HH.P.lives.length };
});
R('#8 rebirth', { skillsKept: before.skills === after.skills || { before: before.skills, after: after.skills }, sameWorldSeed: before.seed === after.seed, samePantry: before.pantry === after.pantry, sameConvShelf: before.convShelf === after.convShelf || [before.convShelf, after.convShelf], day: after.day, life: after.life, lives: after.lives });
report(errs);
await browser.close();
