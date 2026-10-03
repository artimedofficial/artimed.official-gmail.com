import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 1366, h: 768 });
await bootPreset(page, 'low');
await page.evaluate(() => HH.Game.newRun({ bg: 'soldier', difficulty: 'standard', name: 'ทดสอบ' }));
await page.waitForTimeout(400);
const R = (label, v) => console.log(label, JSON.stringify(v));
// Jump to day 5 10:00 (outbreak running), arm with a bat, go to the supermarket
await page.evaluate(() => { HH.S.flags.debugSustain = true; HH.GameClock.advance(5 * 1440 + 10 * 60 - HH.S.time.min); HH.S.flags.debugSustain = false; const d = HH.S.chars[0]; d.needs.satiety = d.needs.hydration = d.needs.energy = 100; d.nut.reserve = 0; d.equip.weapon = HH.Inv.makeItem('baseball_bat'); HH.Scene.avatar.refreshGear(); });
await page.evaluate(() => HH.Scene.enter('supermarket'));
await page.waitForTimeout(800);
const dayCount = await page.evaluate(() => HH.Zombies.alive().length + ' (danger ' + Danger.level('supermarket').toFixed(2) + ')');
await page.screenshot({ path: 'shots/zombies-day.png' });
// Fight: engage nearest zombie until dead (real Combat path, sim speed 4)
const fight = await page.evaluate(async () => {
  HH.GameClock.setSpeed(4);
  const d = HH.S.chars[0];
  const zs = HH.Zombies.alive().sort((a, b) => Math.hypot(a.x - d.pos.x, a.z - d.pos.z) - Math.hypot(b.x - d.pos.x, b.z - d.pos.z));
  const z = zs[0]; if (!z) return null;
  const bat = d.equip.weapon; const c0 = bat.cond;
  Combat.engage(z);
  for (let i = 0; i < 400 && !z.dead && d.alive; i++) await new Promise((r) => setTimeout(r, 50));
  return { killed: z.dead, batCond: +bat.cond.toFixed(3), from: c0, hp: Math.round(HH.activeChar().health()), wounds: Health.wounds(d).map((x) => x.w.t), xpMelee: d.skills.melee };
});
R('fight', fight);
await page.screenshot({ path: 'shots/combat.png' });
// Weapon wear → tape repair: cap drops, damage multiplier drops, tape consumed
R('repair', await page.evaluate(() => {
  const ch = HH.activeChar(), bat = ch.d.equip.weapon; bat.cond = 0.3;
  HH.Inv.add(ch.d.pockets, HH.Inv.makeItem('duct_tape', 1)); const uses0 = ch.d.pockets.slots.find((s) => s.it.id === 'duct_tape').it.uses;
  const mul0 = Combat.condMul(Object.assign({}, bat, { cond: 1, cap: 1 }));
  Durability.repair(ch, bat);
  const tape = ch.d.pockets.slots.find((s) => s.it.id === 'duct_tape');
  return { cap: bat.cap, cond: bat.cond, dmgMulNew: +mul0.toFixed(2), dmgMulTaped: +Combat.condMul(bat).toFixed(2), tapeUsesBefore: uses0, tapeUsesAfter: tape ? tape.it.uses : 0 };
}));
// Snap a weapon → makeshift
R('snap', await page.evaluate(() => { const ch = HH.activeChar(); const bat = ch.d.equip.weapon; bat.cond = 0.001; Durability.wear(ch, bat, 5); return ch.d.equip.weapon && ch.d.equip.weapon.id; }));
// Night density increase at the same place
await page.evaluate(() => { HH.Zombies.clear(); HH.S.time.min = 5 * 1440 + 22 * 60; HH.Zombies.populate('supermarket'); });
const nightCount = await page.evaluate(() => HH.Zombies.alive().length);
R('density', { day: dayCount, night: nightCount, dangerDay: 'see map', dangerNight: await page.evaluate(() => Danger.level('supermarket').toFixed(2)) });
await page.screenshot({ path: 'shots/zombies-night.png' });
await page.evaluate(() => HH.Zombies.clear());
// Noise rule (#15): inside the house vs yard/street
R('#15 noise', await page.evaluate(() => {
  HH.Scene.enter('home');
  HH.Zombies.clear();
  const z1 = HH.Zombies.spawn('walker', 4.0, HH.HOME.lot.z1 + 1.5);   // on the street
  const z2 = HH.Zombies.spawn('walker', -8.5, 4.0);                 // in the yard
  z1.state = 'wander'; z2.state = 'wander';
  const inside = NoiseBus.emit(-3, 0.5, 25, 0);                       // hammering inside the living room
  const st1 = [z1.state, z2.state];
  const yard = NoiseBus.emit(-7, 6, 25, 0);                           // hammering in the yard
  return { insideHeard: inside, statesAfterInside: st1, yardHeard: yard, statesAfterYard: [z1.state, z2.state] };
}));
await page.evaluate(() => HH.Zombies.clear());
// Bite: treated vs untreated (#6)
R('#6 bite', await page.evaluate(() => {
  const ch = HH.activeChar(), d = ch.d;
  const reset = () => { for (const k in BODY_PARTS) { d.body[k].hp = BODY_PARTS[k].hp; d.body[k].cond = []; } d.blood = 100; d.meds = { painUntil: 0, abxUntil: 0 }; d.alive = true; };
  const sim = (treat) => {
    reset();
    Health.damage(d, 'armL', 12, 'bite');
    const w = d.body.armL.cond[0];
    for (const id of ['povidone', 'sterile_gauze', 'paracetamol', 'paracetamol']) HH.Inv.add(d.pockets, HH.Inv.makeItem(id, 1));
    if (treat) { Health.treat(ch, 'armL', w.id, 'clean'); Health.treat(ch, 'armL', w.id, 'dress'); Health.takeMed(ch, 'pain'); }
    const log = [];
    for (let day = 1; day <= 6; day++) {
      for (let h = 0; h < 24; h += 6) { HH.GameClock.advance(360); d.needs.hydration = Math.max(d.needs.hydration, 70); d.needs.satiety = 80; if (treat && day <= 2) Health.takeMed(ch, 'pain'); }
      if (treat && w.dressedAt != null && HH.S.time.min - w.dressedAt > 23 * 60) { HH.Inv.add(d.pockets, HH.Inv.makeItem('sterile_gauze', 1)); Health.treat(ch, 'armL', w.id, 'dress'); }
      const ww = d.body.armL.cond.find((x) => x.id === w.id);
      log.push(ww ? Math.round(ww.infect * 100) + '%/' + (Health.infectStage(ww) || 'ok') : 'healed');
    }
    return { log, alive: d.alive, torso: Math.round(d.body.torso.hp) };
  };
  const inv0 = d.flags; HH.S.flags.invulnerable = false;
  const treated = sim(true);
  const untreated = sim(false);
  reset();
  return { treated, untreated };
}));
report(errs);
await browser.close();
