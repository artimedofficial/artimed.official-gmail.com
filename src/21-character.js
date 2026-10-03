/* ==========================================================================
   21 · CHARACTER — generic survivor model (v1 has one playable, built for many)
   Character wraps a plain JSON record stored in S.chars[] so saves stay simple.
   ========================================================================== */

function createCharacterData({ name, bg, profileSkills }) {
  const b = BACKGROUNDS[bg] || BACKGROUNDS.warehouse;
  const skills = {};
  for (const k in SKILLS) {
    const fromBg = b.skills[k] || 0;
    const fromProfile = (profileSkills && profileSkills[k]) || { lv: 0, xp: 0 };
    const lv = Math.max(fromBg, fromProfile.lv || 0);
    skills[k] = { lv, xp: lv === fromProfile.lv ? (fromProfile.xp || 0) : 0 };
  }
  const body = {};
  for (const k in BODY_PARTS) body[k] = { hp: BODY_PARTS[k].hp, cond: [] };
  return {
    id: U.uid(),
    name: name || 'ผู้รอดชีวิต',
    bg,
    look: Object.assign({}, b.look),
    pos: { x: -1.1, z: 6.0, floor: 0, rot: Math.PI },
    needs: { satiety: 80, hydration: 85, energy: 90, stamina: 100 },
    body,
    skills,
    equip: { back: null, hand: null, weapon: null },
    pockets: Inv.makeContainer(4, 2, 4, 'กระเป๋ากางเกง/เสื้อ'),
    sleeping: false,
    alive: true,
    nut: null,
    ill: [],
  };
}
/** Create a character record with its nutrition state initialised. */
function newCharacter(opts) { const d = createCharacterData(opts); Body.init(d); return d; }

class Character {
  constructor(data) { this.d = data; }
  get name() { return this.d.name; }
  get bg() { return BACKGROUNDS[this.d.bg] || BACKGROUNDS.warehouse; }
  hasTrait(key) { return this.bg.trait.key === key; }
  skill(k) { return (this.d.skills[k] && this.d.skills[k].lv) || 0; }

  /** Ordered list of containers the character carries (pockets → backpack → hand bag). */
  containers() {
    const out = [this.d.pockets];
    const e = this.d.equip;
    if (e.back && e.back.inv) out.push(e.back.inv);
    if (e.hand && e.hand.inv) out.push(e.hand.inv);
    return out;
  }
  carried() {
    let w = 0;
    for (const c of [this.d.pockets]) w += Inv.weight(c);
    for (const k of ['back', 'hand', 'weapon']) {
      const it = this.d.equip[k]; if (!it) continue;
      // Wheeled carts roll their load: only a quarter of the contents counts against carry capacity.
      if (k === 'hand' && this.isCart(it)) w += itemDef(it.id).weight * 0.4 + Inv.weight(it.inv) * 0.25;
      else w += Inv.itemWeight(it);
    }
    return w;
  }
  isCart(it) { const d = it && itemDef(it.id); return !!(d && d.tags && d.tags.includes('cart')); }
  /** Pushing a cart is slower than walking free-handed. */
  cartFactor() { return this.isCart(this.d.equip.hand) ? 0.82 : 1;
  }
  /** Carry capacity (kg) = base + strength + fitness, scaled by arm/leg health and trait. */
  capacity() {
    let cap = CARRY.base + this.skill('strength') * CARRY.perStrength + this.skill('fitness') * CARRY.perFitness;
    if (this.hasTrait('organizer')) cap *= 1.15;
    const b = this.d.body;
    const armF = (b.armL.hp / BODY_PARTS.armL.hp + b.armR.hp / BODY_PARTS.armR.hp) / 2;
    const legF = (b.legL.hp / BODY_PARTS.legL.hp + b.legR.hp / BODY_PARTS.legR.hp) / 2;
    cap *= 0.55 + 0.25 * armF + 0.2 * legF;
    if (this.d.nut) cap *= Body.effects(this.d).carry;
    return cap;
  }
  /** Load ratio: ≤1 normal; 1..1.5 overloaded (slow, loud); ≥1.5 immobile. */
  load() { return this.carried() / Math.max(1, this.capacity()); }
  speedFactor() {
    const l = this.load();
    let f = l <= 1 ? 1 : l >= 1.5 ? 0 : 1 - (l - 1) * 1.4;
    const b = this.d.body;
    const legF = Math.min(b.legL.hp / BODY_PARTS.legL.hp, b.legR.hp / BODY_PARTS.legR.hp);
    f *= 0.45 + 0.55 * legF;
    if (this.d.needs.energy < 15) f *= 0.8;
    if (this.d.nut) f *= Body.effects(this.d).speed;
    return Math.max(0, f * this.cartFactor());
  }
  health() {
    let sum = 0, max = 0;
    for (const k in BODY_PARTS) { sum += this.d.body[k].hp; max += BODY_PARTS[k].hp; }
    return (sum / max) * 100;
  }
}

/** Skill XP and level-ups. Levels are mirrored into the lifetime profile (100% retained). */
const Skills = {
  gain(ch, key, xp) {
    const s = ch.d.skills[key];
    if (!s || s.lv >= 10) return;
    // Exhaustion slows learning (§5.3)
    const mult = (ch.d.needs.energy < 20 ? 0.5 : 1) * (ch.d.nut ? Body.effects(ch.d).skill : 1);
    s.xp += xp * mult;
    while (s.lv < 10 && s.xp >= xpForLevel(s.lv + 1)) {
      s.xp -= xpForLevel(s.lv + 1);
      s.lv++;
      Bus.emit('skill:levelup', { ch, key, lv: s.lv });
    }
    Profile.recordSkill(key, s.lv, s.xp);
  },
};
