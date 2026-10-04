/* ==========================================================================
   17 · PHASE 2B DATA — free furniture placement, weather & water, farming.
   ========================================================================== */

/* ---------- Calendar (§4.1): Day 0 = 20 April (late hot season, first rains soon) ---------- */
const CALENDAR = { year: 2026, month: 3, day: 20 };   // JS month index (3 = April)
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/**
 * Bangkok climate normals per month (Jan..Dec): rain days, total rain (mm),
 * daily max / min temperature (°C), base cloudiness 0..1. Source: TMD 1991–2020 normals (rounded).
 */
const CLIMATE = [
  { days: 1, mm: 15, tmax: 32, tmin: 22, cloud: 0.15 },
  { days: 2, mm: 25, tmax: 33, tmin: 24, cloud: 0.2 },
  { days: 3, mm: 40, tmax: 34, tmin: 26, cloud: 0.25 },
  { days: 6, mm: 80, tmax: 35, tmin: 27, cloud: 0.3 },
  { days: 15, mm: 200, tmax: 34, tmin: 27, cloud: 0.5 },
  { days: 16, mm: 160, tmax: 33, tmin: 26, cloud: 0.55 },
  { days: 17, mm: 170, tmax: 33, tmin: 26, cloud: 0.6 },
  { days: 19, mm: 200, tmax: 33, tmin: 26, cloud: 0.6 },
  { days: 21, mm: 330, tmax: 32, tmin: 25, cloud: 0.65 },
  { days: 16, mm: 240, tmax: 32, tmin: 25, cloud: 0.5 },
  { days: 6, mm: 50, tmax: 32, tmin: 24, cloud: 0.3 },
  { days: 1, mm: 10, tmax: 31, tmin: 22, cloud: 0.15 },
];
/** Weather tuning. mm/h thresholds for labels; masking of outdoor noise and zombie sight by rain. */
const WEATHER = { light: 2, heavy: 10, storm: 20, noiseMask: 0.4, sightMask: 0.3 };

/* ---------- Water (§9.2) ---------- */
/**
 * Stores: cap (L); open (m² of open mouth that catches rain when outdoors);
 * mains: refilled from the municipal supply while water is on; start: litres at Day 0.
 * Gutter rule: an open store standing outdoors within WATER.gutterDist of the house wall
 * catches the roof run-off (WATER.roofArea m²).
 */
const WATER = {
  ptsPerL: 32,            // hydration points per litre (100 = full; ≈ 2.5 L/day)
  gutterDist: 0.9, roofArea: 10,
  rawRisk: 0.3,           // chance of gut illness per litre of untreated rain water
  boilBatchL: 5, boilMin: 15, boilGas: 1.2, boiledCap: 10,
  fillMin: 10,            // filling all stores from the tap (water on)
  houseL: 12,             // litres/day for washing, cooking and flushing once mains water stops (raw water first)
};
Object.assign(FURNITURE.water_jar, { store: { cap: 200, open: 0.35, start: 160 }, act: null, yardOK: true });
Object.assign(FURNITURE.water_tank, { store: { cap: 1000, mains: true, start: 1000 }, act: null });
FURNITURE.sink_counter.act = 'tap'; FURNITURE.basin.act = 'tap';

/* ---------- New furniture ---------- */
Object.assign(FURNITURE, {
  water_drum:  { name: 'ถังเก็บน้ำ 200 ลิตร', size: [0.62, 0.62, 0.92], slot: 'medium', asset: 'prop.water_drum', store: { cap: 200, open: 0.28, start: 0 }, fromItem: 'water_drum_item', yardOK: true, install: 10 },
  plant_pot:   { name: 'กระถางปลูกผัก', size: [0.45, 0.45, 0.36], slot: 'small', asset: 'prop.plant_pot', farm: { beds: 1, kind: 'pot' }, fromItem: 'plant_pot_item', yardOK: true, install: 3 },
  planter_box: { name: 'กระบะปลูกผักไม้', size: [1.25, 0.5, 0.45], slot: 'medium', asset: 'prop.planter_box', farm: { beds: 3, kind: 'box' }, yardOK: true },
  garden_bed:  { name: 'แปลงผักดิน', size: [1.2, 2.4, 0.18], slot: 'decor', asset: 'prop.garden_bed', farm: { beds: 6, kind: 'bed' }, outdoorOnly: true },
  wood_shelf:  { name: 'ชั้นวางไม้ทำเอง', size: [1.2, 0.4, 1.6], slot: 'medium', asset: 'prop.wood_shelf', grid: [6, 4], limit: 60 },
});
for (const t of ['crate', 'boxes', 'workbench', 'chair', 'outdoor_table', 'potted_tree', 'drying_rack', 'generator', 'water_tank', 'cabinet_small', 'metal_shelf']) if (FURNITURE[t]) FURNITURE[t].yardOK = true;
/** Never movable (too big / rooted). */
const FIXED_FURNITURE = new Set(['car', 'mango_tree']);
/** Minutes to move a piece by slot class (strength XP scales with it). */
const MOVE_MIN = { small: 3, tabletop: 2, medium: 6, large: 12, bed: 12, decor: 5, generator: 12 };

/** Furniture the player can build at home from materials (B → เฟอร์นิเจอร์). */
const CRAFT_FURN = [
  { type: 'planter_box', uses: [['plank', 3], ['nails_1kg', 10], ['potting_soil', 2]], tools: ['hammer'], min: 40, skill: 'carpentry' },
  { type: 'garden_bed', uses: [['potting_soil', 1]], tools: ['shovel'], min: 90, skill: 'farming' },
  { type: 'crate', uses: [['plank', 2], ['nails_1kg', 8]], tools: ['hammer'], min: 25, skill: 'carpentry' },
  { type: 'wood_shelf', uses: [['plank', 4], ['nails_1kg', 12]], tools: ['hammer'], min: 45, skill: 'carpentry' },
];

/* ---------- Items ---------- */
CATEGORIES.farm = { name: 'เกษตร', color: '#6aa84f' };
defItem('potting_soil', 'ดินปลูกผสม 5 กก.', 'material', 2, 2, 5, 4, 35, { tags: ['soil', 'farm'], icon: ic('sack', '#5a3f2a', '#8a6a42', '#3a8a2a') });
defItem('plant_pot_item', 'กระถางปลูกผัก 12 นิ้ว (พร้อมดิน)', 'material', 2, 2, 5.5, 2, 79, { installs: 'plant_pot', tags: ['farm'], icon: ic('tub', '#b8582e', '#5a3f2a', '#b8582e') });
defItem('water_drum_item', 'ถังพลาสติก 200 ลิตร (มีฝา)', 'material', 3, 3, 9, 1, 690, { installs: 'water_drum', tags: ['water_container'], icon: ic('tub', '#2f63a8', '#1f3f6a', '#2f63a8') });
defItem('watering_can', 'บัวรดน้ำ 5 ลิตร', 'tool', 2, 2, 0.5, 1, 89, { tags: ['farm', 'watering'], icon: ic('jug', '#3a8a2a', '#2b5a1a', '#3a8a2a') });

/**
 * Crops (§5.6 Farming, Phase 2). days = time to first harvest (real Thai growing time × 0.5 by owner decision);
 * regrow = days between later harvests; harvests = number of harvests (0 = until lifespan); life = days alive.
 * beds = which plot kinds suit it. out = produce item; qty = [min, max] per harvest.
 */
const CROPS = {
  morning_glory: { name: 'ผักบุ้ง', seed: 'seed_morning_glory', out: 'morning_glory', qty: [2, 3], days: 12.5, regrow: 5, harvests: 3, beds: ['pot', 'box', 'bed'], leaf: '#3f8a2f', fruit: null, h: 0.35 },
  thai_basil:    { name: 'กะเพรา', seed: 'seed_basil', out: 'thai_basil', qty: [1, 2], days: 20, regrow: 7, harvests: 0, life: 60, beds: ['pot', 'box', 'bed'], leaf: '#2f6a2a', fruit: null, h: 0.45 },
  chili:         { name: 'พริกขี้หนู', seed: 'seed_chili', out: 'chili_fresh', qty: [1, 2], days: 42, regrow: 7, harvests: 0, life: 120, beds: ['pot', 'box', 'bed'], leaf: '#356a2a', fruit: '#d8281a', h: 0.55 },
  long_beans:    { name: 'ถั่วฝักยาว', seed: 'seed_long_bean', out: 'long_beans', qty: [1, 2], days: 27, regrow: 4, harvests: 4, beds: ['box', 'bed'], leaf: '#4a8a32', fruit: '#7fbf4a', h: 0.9 },
  tomato:        { name: 'มะเขือเทศ', seed: 'seed_tomato', out: 'tomato', qty: [1, 2], days: 37, regrow: 5, harvests: 4, beds: ['pot', 'box', 'bed'], leaf: '#3f7a2f', fruit: '#e0402a', h: 0.75 },
  eggplant:      { name: 'มะเขือเปราะ', seed: 'seed_eggplant', out: 'eggplant', qty: [1, 2], days: 32, regrow: 5, harvests: 6, beds: ['pot', 'box', 'bed'], leaf: '#3a6a3a', fruit: '#9ccf6a', h: 0.6 },
  chinese_kale:  { name: 'คะน้า', seed: 'seed_kale', out: 'chinese_kale', qty: [2, 3], days: 22, regrow: 0, harvests: 1, beds: ['pot', 'box', 'bed'], leaf: '#2f5a4a', fruit: null, h: 0.35 },
  cucumber:      { name: 'แตงกวา', seed: 'seed_cucumber', out: 'cucumber', qty: [1, 2], days: 20, regrow: 3, harvests: 4, beds: ['box', 'bed'], leaf: '#4a8a3a', fruit: '#5aa03a', h: 0.7 },
  pumpkin:       { name: 'ฟักทอง', seed: 'seed_pumpkin', out: 'pumpkin', qty: [1, 2], days: 50, regrow: 0, harvests: 1, beds: ['bed'], leaf: '#4a7a2a', fruit: '#e08a2a', h: 0.45 },
};
for (const [id, c] of Object.entries(CROPS)) {
  defItem(c.seed, 'เมล็ดพันธุ์' + c.name + ' (ซอง)', 'farm', 1, 1, 0.02, 10, id === 'pumpkin' ? 25 : 15, { uses: 10, crop: id, tags: ['seed', 'farm'], icon: ic('pack', c.fruit || c.leaf, '#f2e6c8', '#3a8a2a') });
}
/**
 * Farming tuning. Moisture 0..1 per plot: dries per day (outdoor sun / indoor),
 * rain adds mmPerFull⁻¹ per mm. Light: outdoor 1, indoor near a window 0.6, deep indoor 0.15.
 */
const FARM = {
  dryOut: 0.5, dryIn: 0.3, rainPerMm: 0.05,
  wetOk: 0.25, wetLow: 0.1, wiltDays: 2.5, recoverPerDay: 0.6,
  lightOut: 1.0, lightWindow: 0.6, lightDark: 0.15, windowDist: 1.6,
  waterL: { pot: 1, box: 2.5, bed: 6 }, waterMin: 3, waterMinCan: 1,
  plantMin: 2, harvestMin: 2, skillGrow: 0.03, skillYield: 0.06,
};

/* ---------- Shop stock for 2B ---------- */
POOLS.hw_misc.push(['plant_pot_item', 3, 4], ['water_drum_item', 2, 2], ['potting_soil', 3, 4], ['watering_can', 2, 2]);
POOLS.hw_fasteners.push(...Object.values(CROPS).map((c) => [c.seed, 1, 4]));
POOLS.mk_veg.push(['seed_morning_glory', 1, 3], ['seed_basil', 1, 3], ['seed_chili', 1, 3], ['seed_kale', 1, 3]);
/** Farmer background starts with a few seed packs in the storage room. */
const BG_START_STOCK = { farmer: [['metal_shelf', 'seed_morning_glory', 1], ['metal_shelf', 'seed_chili', 1], ['metal_shelf', 'seed_basil', 1], ['metal_shelf', 'potting_soil', 2]] };
