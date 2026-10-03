/* ==========================================================================
   16 · COMBAT, ZOMBIES, INJURY, MEDICINE & BARRICADE DATA (§5.4–5.5, §7, §8, §9.1)
   ========================================================================== */

/**
 * Melee stats. dmg: base damage; reach (m); speed: seconds per swing; stam: stamina per swing;
 * wear: durability lost per hit; noise: radius (m) per hit outdoors; mat: repair family;
 * broken: item produced when it snaps (or 'scrap').
 */
const WEAPONS = {
  _fists:        { dmg: 4,  reach: 0.9, speed: 0.8, stam: 4,  wear: 0,   noise: 3,  mat: null },
  baseball_bat:  { dmg: 22, reach: 1.35, speed: 1.05, stam: 9, wear: 1.4, noise: 6, mat: 'wood', broken: 'broken_bat' },
  broken_bat:    { dmg: 12, reach: 1.0, speed: 0.9, stam: 6,  wear: 2.5, noise: 5,  mat: 'wood', broken: 'scrap_wood' },
  frying_pan:    { dmg: 16, reach: 1.0, speed: 1.0, stam: 8,  wear: 0.5, noise: 9,  mat: 'metal' },
  kitchen_knife: { dmg: 14, reach: 0.85, speed: 0.6, stam: 5, wear: 2.2, noise: 2,  mat: 'blade', broken: 'scrap_metal' },
  hammer:        { dmg: 18, reach: 0.95, speed: 0.85, stam: 7, wear: 0.8, noise: 6, mat: 'metal' },
  crowbar:       { dmg: 24, reach: 1.2, speed: 1.1, stam: 10, wear: 0.4, noise: 7,  mat: 'metal' },
  machete:       { dmg: 28, reach: 1.15, speed: 0.95, stam: 9, wear: 1.6, noise: 4, mat: 'blade', broken: 'scrap_metal' },
  axe:           { dmg: 34, reach: 1.25, speed: 1.35, stam: 13, wear: 1.2, noise: 6, mat: 'blade', broken: 'scrap_wood' },
  pipe_wrench:   { dmg: 21, reach: 1.1, speed: 1.05, stam: 9, wear: 0.3, noise: 7,  mat: 'metal' },
  shovel:        { dmg: 20, reach: 1.5, speed: 1.25, stam: 11, wear: 1.0, noise: 7, mat: 'metal', broken: 'scrap_wood' },
  steel_pipe:    { dmg: 19, reach: 1.45, speed: 1.15, stam: 10, wear: 0.4, noise: 8, mat: 'metal' },
  golf_club:     { dmg: 15, reach: 1.4, speed: 0.9, stam: 7,  wear: 2.6, noise: 5,  mat: 'metal', broken: 'scrap_metal' },
  screwdriver:   { dmg: 9,  reach: 0.8, speed: 0.55, stam: 4, wear: 2.0, noise: 2,  mat: 'metal' },
};
defItem('broken_bat', 'ไม้เบสบอลหัก (อาวุธชั่วคราว)', 'weapon', 1, 2, 0.5, 1, 0, { tags: ['blunt', 'makeshift'], dura: 40, icon: { k: 'bat', c: '#b8894e', c2: '#3a2a1a' } });
/** Repair recipes by material family (§7.2): items consumed, durability restored to the (reduced) cap. */
const REPAIRS = {
  wood:  { tools: [], uses: [['duct_tape', 1], ['wood_glue', 1]], any: true, capLoss: 0.14, name: 'พันเทป/ทากาว' },
  metal: { tools: [], uses: [['duct_tape', 1]], any: true, capLoss: 0.08, name: 'พันด้ามด้วยเทป' },
  blade: { tools: [], uses: [['sharpening_stone', 1]], any: true, capLoss: 0.06, name: 'ลับคม' },
};

/** Zombie types (§8.2). Unlock day; Phase 1 spawns walkers and (optionally) night runners. */
const ZOMBIES = {
  walker: { name: 'วอล์กเกอร์', hp: 70, headHp: 28, speed: [0.55, 0.9], dmg: [6, 11], bite: 0.16, sight: 9, hear: 1.0, unlock: 1, attackCd: 1.7 },
  runner: { name: 'รันเนอร์', hp: 55, headHp: 24, speed: [2.0, 2.6], dmg: [5, 9], bite: 0.14, sight: 12, hear: 1.2, unlock: 14, attackCd: 1.3, nightOnly: true, share: 0.18 },
};
const ZOMBIE_LOOKS = {
  skin: ['#8a9a88', '#7a8a7a', '#9a9c8c', '#86907e', '#a09a88'],
  shirt: ['#5a4a3a', '#3a4a5a', '#6a3a3a', '#4a5a4a', '#7a6a5a', '#2a2a2a', '#8a8a7a'],
  pants: ['#2a2a30', '#3a3328', '#40403a', '#2c3440', '#4a3a30'],
  hair: ['#1a1410', '#2a2018', '#3a3a3a', '#5a4a3a'],
};

/** Injury tuning (§5.4). Rates are per hour unless noted. */
const INJURY = {
  bloodLossPerSev: 12,         // blood points per hour at bleed severity 1
  bloodRegen: 1.2,             // per hour when not bleeding
  deathBlood: 12,
  hpRegen: 0.6,                // body-part HP per hour (× nutrition heal × treatment)
  infectRate: { bite: 0.012, laceration: 0.003, burn: 0.005 },
  infectCleanMul: 0.3, infectDressMul: 0.55, infectStaleMul: 1.6, dressingLifeH: 24,
  immunity: 0.012,             // natural infection fight-off per hour when treated & fed
  antibiotic: 0.05,            // infection reduction per hour while on antibiotics
  feverStage: 0.3, weakStage: 0.6, critStage: 0.9,
  fractureHealH: 24 * 18,
  dehydrateDamage: 3,          // torso HP per hour at hydration 0
  starveDeath: -60000,
};
/** Medical items → treatment capabilities (§5.5). */
const MED = {
  clean: ['povidone', 'alcohol_70', 'saline'],
  dress: ['sterile_gauze', 'gauze_set', 'first_aid_kit'],
  smallDress: ['plasters', 'medical_tape'],
  bandage: ['elastic_bandage', 'gauze_set', 'sterile_gauze', 'cloth_rag', 'first_aid_kit'],
  suture: ['suture_kit'],
  tourniquet: ['tourniquet'],
  splint: ['splint'],
  painkiller: ['paracetamol', 'ibuprofen'],
  antibiotic: ['antibiotic'],
};

/** Barricades (§9.1). Per layer: materials + time; HP scales with carpentry. */
const BARRICADE = {
  window: { layers: 3, uses: [['plank', 2], ['nails_1kg', 8]], alt: [['plywood', 1], ['nails_1kg', 10]], hp: 120, minutes: 20 },
  door:   { layers: 2, uses: [['plank', 2], ['nails_1kg', 10]], alt: [['plywood', 1], ['nails_1kg', 12]], hp: 160, minutes: 25 },
  gate:   { layers: 2, uses: [['chain', 1], ['padlock', 1]], alt: [['plank', 3], ['nails_1kg', 12]], hp: 200, minutes: 15, outdoor: true },
  perCarpentry: 0.08,
};

/** Hostile survivor ambush (§8.5). */
const AMBUSH = { baseChance: 0.06, nightMul: 2.2, haulMul: 0.000015, demandFrac: [0.2, 0.4] };
