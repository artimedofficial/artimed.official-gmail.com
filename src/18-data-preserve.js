/* ==========================================================================
   18 · PHASE 2C DATA — food preservation (§6.5.7: drying, salting,
   pickling/fermenting, smoking) and refillable water bottles.
   Times are real Thai home-preservation times × 0.5 (owner decision, same as farming).
   ========================================================================== */

/* ---------- Preserved products ---------- */
const L_PRES = {
  jerky:   { shelf: 60, opened: { ambientH: 24 * 14, fridgeD: 60 }, freeze: 'good' },
  dryfood: { shelf: 120, opened: { ambientH: 24 * 30, fridgeD: 90 }, freeze: 'good' },
  pickle:  { shelf: 60, opened: { ambientH: 24 * 5, fridgeD: 30 }, freeze: 'no' },
  salted:  { shelf: 30, opened: { ambientH: 24 * 3, fridgeD: 14 }, freeze: 'good' },
  smoked:  { shelf: 21, opened: { ambientH: 24 * 2, fridgeD: 10 }, freeze: 'good' },
};
F('jerky_pork', 'หมูแห้งทำเอง (~200 ก.)', 1, 1, 0.2, 6, 0, 4, [160, 22, 3, 6, 2, 12, 0], L_PRES.jerky, ['meat', 'pork', 'protein', 'dried', 'homemade'], ic('pack', '#8a3a22', '#c9733a', '#5a2a1a'));
F('jerky_beef', 'เนื้อแห้งทำเอง (~100 ก.)', 1, 1, 0.1, 6, 0, 2, [150, 25, 2, 4, 2, 12, 0], L_PRES.jerky, ['meat', 'beef', 'protein', 'dried', 'homemade'], ic('pack', '#5a2a1a', '#8a3a22', '#3a1a10'));
F('dried_squid', 'ปลาหมึกแห้งทำเอง (~120 ก.)', 1, 1, 0.12, 6, 0, 3, [130, 25, 2, 2, 2, 10, 0], L_PRES.dryfood, ['seafood', 'protein', 'dried', 'homemade'], ic('pack', '#e9d8b8', '#c9a46a', '#8a6a42'));
F('dried_banana', 'กล้วยตากทำเอง (~250 ก.)', 1, 1, 0.25, 6, 0, 5, [150, 1.5, 38, 0.5, 2, 8, 0], L_PRES.dryfood, ['fruit', 'sweet', 'dried', 'homemade'], ic('pack', '#8a5a22', '#e0b23c', '#5a3a1a'));
F('salted_pork', 'หมูเค็มทำเอง (~800 ก.) ต้องทำให้สุก', 2, 1, 0.8, 4, 0, 6, [170, 17, 0, 10, 0.5, 9, 2], L_PRES.salted, ['meat', 'pork', 'protein', 'raw', 'salty', 'homemade'], ic('tray', '#c96a5a', '#ffffff', '#8a3a22'));
F('pickled_cabbage', 'กะหล่ำปลีดองทำเอง (โหล)', 1, 2, 0.8, 4, 0, 6, [25, 1, 5, 0, 3, 3, 10], L_PRES.pickle, ['veg', 'pickled', 'sour', 'homemade'], ic('jar', '#c9d8a5', '#e9e6dc', '#6a8a3a'));
F('pickled_greens', 'ผักดองทำเอง (โหล)', 1, 2, 0.6, 4, 0, 5, [20, 1.2, 3, 0, 3, 3, 10], L_PRES.pickle, ['veg', 'leafy', 'pickled', 'sour', 'homemade'], ic('jar', '#8aa04a', '#e9e6dc', '#4a6a2a'));
F('pickled_cucumber', 'แตงกวาดองทำเอง (โหล)', 1, 2, 0.6, 4, 0, 5, [18, 0.6, 3.5, 0, 2, 3, 12], L_PRES.pickle, ['veg', 'pickled', 'sour', 'homemade'], ic('jar', '#7fbf4a', '#e9e6dc', '#3a6a2a'));
F('naem', 'แหนมทำเอง (~500 ก.)', 1, 1, 0.5, 6, 0, 5, [150, 15, 4, 8, 1, 10, 3], L_PRES.pickle, ['meat', 'pork', 'protein', 'fermented', 'sour', 'homemade'], ic('pack', '#e88a8a', '#f2dcb8', '#c94b4b'));
F('pla_som', 'ปลาส้มทำเอง (ตัว) ต้องทำให้สุก', 2, 1, 0.65, 4, 0, 4, [120, 20, 3, 3, 1, 9, 4], L_PRES.salted, ['fish', 'protein', 'raw', 'seafood', 'fermented', 'sour', 'homemade'], ic('tray', '#e0a07a', '#ffffff', '#c9733a'));
F('smoked_fish', 'ปลารมควันทำเอง', 2, 1, 0.45, 4, 0, 4, [140, 22, 0, 5, 1, 10, 2], L_PRES.smoked, ['fish', 'seafood', 'protein', 'smoked', 'homemade'], ic('tray', '#8a5a2a', '#e0b23c', '#5a3a1a'));
F('smoked_pork', 'หมูรมควันทำเอง (~400 ก.)', 2, 1, 0.4, 4, 0, 4, [190, 20, 0, 12, 0.5, 11, 2], L_PRES.smoked, ['meat', 'pork', 'protein', 'smoked', 'homemade'], ic('tray', '#8a3a22', '#e0b23c', '#5a2a1a'));
F('smoked_chicken', 'ไก่รมควันทำเอง (~400 ก.)', 2, 1, 0.4, 4, 0, 4, [170, 24, 0, 8, 0.5, 11, 2], L_PRES.smoked, ['poultry', 'protein', 'smoked', 'homemade'], ic('tray', '#c9733a', '#e0b23c', '#8a5a2a'));

/**
 * Methods. station: furniture types; outdoor: needs open sky; sun: progresses only in daylight without rain
 * (rain wets the batch: −wetLoss quality/hour); fuel: consumed per batch (any of); smokeNoise: zombie lure radius (m).
 * recipes: input item → { out, n (outputs per input unit), per (inputs per output), h (hours), extras: [[id, n]] per batch }.
 */
const PRESERVE = {
  dry: {
    name: 'ตากแห้ง', icon: '☀', station: ['drying_rack', 'drying_tray'], outdoor: true, sun: true, wetLoss: 0.08,
    recipes: {
      pork_1kg: { out: 'jerky_pork', n: 2, h: 8, extras: [['salt', 1]] },
      pork_chop: { out: 'jerky_pork', n: 1, h: 8, extras: [['salt', 1]] },
      beef_steak: { out: 'jerky_beef', n: 1, h: 8, extras: [['salt', 1]] },
      beef_ribeye: { out: 'jerky_beef', n: 1, h: 8, extras: [['salt', 1]] },
      fish_tilapia: { out: 'dried_fish', n: 1, h: 8, extras: [['salt', 1]] },
      fish_mackerel_fresh: { out: 'dried_fish', n: 1, h: 8, extras: [['salt', 1]] },
      shrimp_500: { out: 'dried_shrimp', n: 1, h: 8, extras: [['salt', 1]] },
      squid: { out: 'dried_squid', n: 1, h: 8, extras: [] },
      mango: { out: 'dried_mango', n: 1, h: 12, extras: [] },
      banana: { out: 'dried_banana', n: 1, h: 16, extras: [] },
      chili_fresh: { out: 'dried_chili', n: 1, per: 3, h: 20, extras: [] },
    },
  },
  salt: {
    name: 'หมักเกลือ', icon: '🧂', station: ['ferment_jar'], outdoor: false,
    recipes: {
      egg: { out: 'salted_egg', n: 1, h: 252, extras: [['salt', 1]] },
      duck_egg: { out: 'salted_egg', n: 1, h: 252, extras: [['salt', 1]] },
      pork_1kg: { out: 'salted_pork', n: 1, h: 12, extras: [['salt', 1]] },
    },
  },
  pickle: {
    name: 'ดอง/หมัก', icon: '🫙', station: ['ferment_jar'], outdoor: false,
    recipes: {
      cabbage: { out: 'pickled_cabbage', n: 1, h: 36, extras: [['salt', 1]] },
      chinese_kale: { out: 'pickled_greens', n: 1, h: 36, extras: [['salt', 1]] },
      morning_glory: { out: 'pickled_greens', n: 1, per: 2, h: 36, extras: [['salt', 1]] },
      cucumber: { out: 'pickled_cucumber', n: 1, h: 24, extras: [['vinegar', 1]] },
      pork_minced: { out: 'naem', n: 1, h: 36, extras: [['salt', 1], ['garlic', 1]] },
      fish_tilapia: { out: 'pla_som', n: 1, h: 36, extras: [['salt', 1], ['garlic', 1]] },
    },
  },
  smoke: {
    name: 'รมควัน', icon: '💨', station: ['smoker'], outdoor: true, fuel: ['charcoal', 'scrap_wood'], smokeNoise: 16, rainStop: 10,
    recipes: {
      fish_tilapia: { out: 'smoked_fish', n: 1, h: 4, extras: [] },
      fish_mackerel_fresh: { out: 'smoked_fish', n: 1, h: 4, extras: [] },
      pork_1kg: { out: 'smoked_pork', n: 2, h: 5, extras: [] },
      pork_belly: { out: 'smoked_pork', n: 1, h: 5, extras: [] },
      pork_chop: { out: 'smoked_pork', n: 1, h: 5, extras: [] },
      chicken_breast: { out: 'smoked_chicken', n: 2, h: 5, extras: [] },
      chicken_thigh: { out: 'smoked_chicken', n: 2, h: 5, extras: [] },
      chicken_whole: { out: 'smoked_chicken', n: 3, h: 6, extras: [] },
    },
  },
};
/** Batch quality threshold below which the whole batch is lost; outputs × 0.7 under qLow. */
const PRES = { qLost: 0.35, qLow: 0.7, startMin: 10, perUnitMin: 3, collectMin: 3 };

/* ---------- Stations ---------- */
FURNITURE.drying_rack.preserve = { methods: ['dry'], cap: 6 };
Object.assign(FURNITURE, {
  drying_tray: { name: 'ตะแกรงตากอาหาร', size: [1.0, 0.7, 0.85], slot: 'small', asset: 'prop.drying_tray', preserve: { methods: ['dry'], cap: 4 }, yardOK: true },
  ferment_jar: { name: 'โหลหมักดอง 10 ลิตร', size: [0.32, 0.32, 0.42], slot: 'small', asset: 'prop.ferment_jar', preserve: { methods: ['salt', 'pickle'], cap: 8 }, fromItem: 'ferment_jar_item', yardOK: true, install: 2 },
  smoker: { name: 'ตู้รมควันทำเอง', size: [0.8, 0.7, 1.3], slot: 'medium', asset: 'prop.smoker', preserve: { methods: ['smoke'], cap: 4 }, outdoorOnly: true },
});
CRAFT_FURN.push(
  { type: 'drying_tray', uses: [['plank', 2], ['nails_1kg', 6]], tools: ['hammer'], min: 25, skill: 'carpentry' },
  { type: 'smoker', uses: [['plank', 3], ['steel_sheet', 1], ['nails_1kg', 10]], tools: ['hammer'], min: 60, skill: 'carpentry' },
);
defItem('ferment_jar_item', 'โหลแก้วหมักดอง 10 ลิตร (มีฝา)', 'misc', 2, 2, 2.2, 2, 159, { installs: 'ferment_jar', tags: ['container', 'kitchen'], icon: ic('jar', '#d8ecf7', '#e9e6dc', '#c9a46a') });

/* ---------- Refillable water containers ---------- */
defItem('bottle_empty_600', 'ขวดน้ำเปล่า 600 มล. (ว่าง)', 'misc', 1, 1, 0.02, 12, 0, { fills: 'water_600', litres: 0.6, tags: ['empty_bottle'], icon: ic('bottle', '#eef6fb', '#9ac4dc', '#e9eef2') });
defItem('bottle_empty_1500', 'ขวดน้ำเปล่า 1.5 ลิตร (ว่าง)', 'misc', 1, 2, 0.04, 6, 0, { fills: 'water_1500', litres: 1.5, tags: ['empty_bottle'], icon: ic('bottle', '#eef6fb', '#9ac4dc', '#e9eef2') });
defItem('jug_empty_6l', 'แกลลอนน้ำ 6 ลิตร (ว่าง)', 'misc', 2, 2, 0.15, 2, 0, { fills: 'water_6l', litres: 6, tags: ['empty_bottle'], icon: ic('jug', '#eef6fb', '#9ac4dc', '#e9eef2') });
defItem('water_can_20_empty', 'แกลลอนน้ำพลาสติก 20 ลิตร (ว่าง)', 'misc', 2, 3, 1.0, 1, 129, { fills: 'water_20l', litres: 20, tags: ['empty_bottle'], icon: ic('jug', '#2f8ac4', '#1f5a8a', '#2f8ac4') });
defDrink('water_20l', 'น้ำในแกลลอน 20 ลิตร', 2, 3, 21, 1, 0, 66, [0, 0, 0, 0, 0, 1, 30], L.water, { tags: ['water'], icon: ic('jug', '#2f8ac4', '#1f5a8a', '#2f8ac4') });
ITEMS.water_600.empty = 'bottle_empty_600'; ITEMS.water_1500.empty = 'bottle_empty_1500'; ITEMS.water_6l.empty = 'jug_empty_6l'; ITEMS.water_20l.empty = 'water_can_20_empty';

/* ---------- Shop stock for 2C ---------- */
POOLS.hw_misc.push(['water_can_20_empty', 2, 2], ['ferment_jar_item', 2, 3]);
POOLS.mk_veg.push(['ferment_jar_item', 1, 2]);
POOLS.sm_cookware.push(['ferment_jar_item', 1, 2]);
