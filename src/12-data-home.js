/* ==========================================================================
   12 · HOME LAYOUT & FURNITURE DATA
   Units: metres. House footprint x[-6,6] z[-6,3]; front faces +z (street side).
   Floors: 0 = ground (y 0), 1 = upper (y 3). Furniture rot: 0 = front faces +z,
   1 = faces -x, 2 = faces -z, 3 = faces +x (quarter turns, counter-clockwise from above).
   ========================================================================== */

/** Furniture types. grid → has a storage container. temp: 'fridge' | 'freezer'. */
const FURNITURE = {
  sofa:        { name: 'โซฟา', size: [2.2, 0.9, 0.85], slot: 'large', asset: 'prop.sofa', act: 'sit' },
  armchair:    { name: 'เก้าอี้นวม', size: [0.9, 0.85, 0.85], slot: 'medium', asset: 'prop.armchair' },
  tv_cabinet:  { name: 'ตู้วางทีวี', size: [1.8, 0.45, 0.55], slot: 'medium', asset: 'prop.tv_cabinet', grid: [4, 3], limit: 25 },
  bookshelf:   { name: 'ชั้นหนังสือ', size: [1.2, 0.35, 1.9], slot: 'medium', asset: 'prop.bookshelf', grid: [6, 4], limit: 40 },
  coffee_table:{ name: 'โต๊ะกลาง', size: [1.1, 0.6, 0.42], slot: 'medium', asset: 'prop.coffee_table' },
  rug:         { name: 'พรม', size: [2.6, 1.8, 0.01], slot: 'decor', asset: 'prop.rug', walk: true },
  floor_lamp:  { name: 'โคมไฟตั้งพื้น', size: [0.4, 0.4, 1.6], slot: 'small', asset: 'prop.floor_lamp', light: { color: 0xffb46b, intensity: 6, dist: 5, y: 1.45 }, power: 15 },
  plant:       { name: 'ต้นไม้กระถาง', size: [0.5, 0.5, 1.1], slot: 'small', asset: 'prop.plant' },
  fan:         { name: 'พัดลมตั้งพื้น', size: [0.45, 0.45, 1.2], slot: 'small', asset: 'prop.fan', power: 45 },
  counter:     { name: 'ตู้ครัว', size: [1.6, 0.6, 0.9], slot: 'medium', asset: 'prop.counter', grid: [4, 3], limit: 30 },
  sink_counter:{ name: 'ซิงก์ล้างจาน', size: [1.2, 0.6, 0.9], slot: 'medium', asset: 'prop.sink_counter', grid: [3, 2], limit: 15, act: 'water' },
  stove:       { name: 'เตาแก๊ส 2 หัว', size: [0.8, 0.6, 0.9], slot: 'medium', asset: 'prop.stove', act: 'cook' },
  fridge:      { name: 'ตู้เย็น 2 ประตู', size: [0.75, 0.7, 1.8], slot: 'large', asset: 'prop.fridge', grid: [5, 5], limit: 60, temp: 'fridge', power: 120,
                 sub: { name: 'ช่องแช่แข็งในตู้เย็น', grid: [4, 3], limit: 25, temp: 'freezer' } },
  pantry:      { name: 'ตู้เก็บของแห้ง', size: [1.0, 0.5, 2.0], slot: 'large', asset: 'prop.pantry', grid: [6, 5], limit: 60 },
  dining_table:{ name: 'โต๊ะอาหาร', size: [1.4, 0.85, 0.75], slot: 'large', asset: 'prop.dining_table', act: 'eat' },
  microwave:   { name: 'ไมโครเวฟ', size: [0.5, 0.38, 0.3], slot: 'tabletop', asset: 'prop.microwave', power: 800 },
  metal_shelf: { name: 'ชั้นเหล็ก 2 ชั้น', size: [1.5, 0.5, 1.8], slot: 'medium', asset: 'prop.metal_shelf', grid: [8, 4], limit: 80 },
  big_rack:    { name: 'ชั้นวางของขนาดใหญ่', size: [2.2, 0.6, 2.1], slot: 'large', asset: 'prop.big_rack', grid: [10, 6], limit: 150 },
  crate:       { name: 'ลังไม้', size: [0.6, 0.6, 0.55], slot: 'small', asset: 'prop.crate', grid: [4, 4], limit: 30 },
  cabinet_small:{ name: 'ตู้เล็ก', size: [0.8, 0.45, 0.85], slot: 'small', asset: 'prop.cabinet_small', grid: [4, 3], limit: 20 },
  wardrobe:    { name: 'ตู้เสื้อผ้า', size: [1.4, 0.6, 2.0], slot: 'large', asset: 'prop.wardrobe', grid: [6, 5], limit: 50 },
  dresser:     { name: 'โต๊ะเครื่องแป้ง', size: [1.0, 0.45, 0.8], slot: 'medium', asset: 'prop.dresser', grid: [4, 3], limit: 20 },
  bed_double:  { name: 'เตียงคู่', size: [1.7, 2.1, 0.55], slot: 'bed', asset: 'prop.bed_double', act: 'sleep', bedQuality: 1.0 },
  bed_single:  { name: 'เตียงเดี่ยว', size: [1.0, 2.0, 0.5], slot: 'bed', asset: 'prop.bed_single', act: 'sleep', bedQuality: 0.9 },
  desk:        { name: 'โต๊ะทำงาน', size: [1.2, 0.6, 0.75], slot: 'medium', asset: 'prop.desk', grid: [4, 2], limit: 10 },
  chair:       { name: 'เก้าอี้', size: [0.45, 0.45, 0.9], slot: 'small', asset: 'prop.chair' },
  toilet:      { name: 'ชักโครก', size: [0.45, 0.7, 0.75], slot: 'medium', asset: 'prop.toilet' },
  basin:       { name: 'อ่างล้างหน้า', size: [0.55, 0.45, 0.85], slot: 'small', asset: 'prop.basin', act: 'water' },
  water_jar:   { name: 'โอ่งเก็บน้ำ', size: [0.7, 0.7, 0.8], slot: 'medium', asset: 'prop.water_jar', act: 'water' },
  shower:      { name: 'ฝักบัว', size: [0.9, 0.9, 2.0], slot: 'medium', asset: 'prop.shower', walk: true },
  washer:      { name: 'เครื่องซักผ้า', size: [0.6, 0.6, 0.85], slot: 'medium', asset: 'prop.washer', power: 500 },
  shoe_cabinet:{ name: 'ตู้รองเท้า', size: [0.9, 0.35, 0.9], slot: 'small', asset: 'prop.shoe_cabinet', grid: [4, 2], limit: 12 },
  boxes:       { name: 'กองกล่องลัง', size: [0.9, 0.7, 0.9], slot: 'small', asset: 'prop.boxes', grid: [4, 4], limit: 30 },
  workbench:   { name: 'โต๊ะช่าง', size: [1.6, 0.7, 0.9], slot: 'large', asset: 'prop.workbench', grid: [6, 3], limit: 50, act: 'craft' },
  // Yard
  water_tank:  { name: 'แท็งก์น้ำสแตนเลส', size: [1.1, 1.1, 1.9], slot: 'large', asset: 'prop.water_tank', act: 'water', outdoor: true },
  car:         { name: 'รถเก๋งเก่า', size: [1.75, 4.3, 1.45], slot: 'decor', asset: 'prop.car', outdoor: true },
  potted_tree: { name: 'กระถางต้นไม้', size: [0.6, 0.6, 1.4], slot: 'small', asset: 'prop.potted_tree', outdoor: true },
  drying_rack: { name: 'ราวตากผ้า', size: [1.6, 0.6, 1.6], slot: 'decor', asset: 'prop.drying_rack', outdoor: true },
  outdoor_table:{ name: 'โต๊ะหินอ่อนในสวน', size: [0.9, 0.9, 0.75], slot: 'decor', asset: 'prop.outdoor_table', outdoor: true },
  mango_tree:  { name: 'ต้นมะม่วง', size: [1.2, 1.2, 5.0], slot: 'decor', asset: 'prop.mango_tree', outdoor: true },
};

/**
 * Room list. floorMat: 'tile' | 'wood' | 'concrete' | 'bathtile'. wall: interior paint.
 * light: ceiling light colour; lamp:false to skip the ceiling bulb.
 */
const HOME = {
  bounds: { x0: -6, x1: 6, z0: -6, z1: 3 },
  lot: { x0: -11, x1: 11, z0: -10, z1: 11 },
  gate: { x0: 1.5, x1: 6.5 },       // opening in the front fence (z = lot.z1)
  rooms: [
    { id: 'living',   floor: 0, name: 'ห้องนั่งเล่น', x0: -6, x1: 1, z0: -1, z1: 3, floorMat: 'wood', wall: '#d9cdb5' },
    { id: 'kitchen',  floor: 0, name: 'ครัวและห้องทานข้าว', x0: 1, x1: 6, z0: -2.5, z1: 3, floorMat: 'tile', wall: '#cfd6c4' },
    { id: 'storage',  floor: 0, name: 'ห้องเก็บของ/โรงรถ', x0: -6, x1: -2.5, z0: -6, z1: -1, floorMat: 'concrete', wall: '#b9b6ad' },
    { id: 'hall',     floor: 0, name: 'โถงบันได', x0: -2.5, x1: 1, z0: -6, z1: -1, floorMat: 'tile', wall: '#d6cbb6' },
    { id: 'utility',  floor: 0, name: 'ห้องซักล้าง', x0: 1, x1: 3.5, z0: -6, z1: -2.5, floorMat: 'concrete', wall: '#c4c7c0' },
    { id: 'bath',     floor: 0, name: 'ห้องน้ำ', x0: 3.5, x1: 6, z0: -6, z1: -2.5, floorMat: 'bathtile', wall: '#b9d3d6' },
    { id: 'bed1',     floor: 1, name: 'ห้องนอนใหญ่', x0: -6, x1: 1, z0: -1, z1: 3, floorMat: 'wood', wall: '#d8c6b4' },
    { id: 'bed2',     floor: 1, name: 'ห้องนอนเล็ก', x0: 1, x1: 6, z0: -2.5, z1: 3, floorMat: 'wood', wall: '#c6cfd9' },
    { id: 'study',    floor: 1, name: 'ห้องทำงาน', x0: -6, x1: -2.5, z0: -6, z1: -1, floorMat: 'wood', wall: '#d3d0bf' },
    { id: 'hall2',    floor: 1, name: 'โถงชั้นบน', x0: -2.5, x1: 1, z0: -6, z1: -1, floorMat: 'wood', wall: '#d6cbb6' },
    { id: 'upstore',  floor: 1, name: 'ห้องเก็บของชั้นบน', x0: 1, x1: 6, z0: -6, z1: -2.5, floorMat: 'concrete', wall: '#c9c4b8' },
  ],
  /**
   * Openings: doors / windows on wall lines. axis 'z' = wall runs along x at fixed z;
   * axis 'x' = wall runs along z at fixed x. a..b = span along the wall.
   */
  openings: [
    // Ground floor doors
    { floor: 0, kind: 'door', axis: 'z', at: 3, a: -1.6, b: -0.6, main: true, name: 'ประตูหน้าบ้าน' },
    { floor: 0, kind: 'arch', axis: 'x', at: 1, a: 0.6, b: 2.0 },
    { floor: 0, kind: 'door', axis: 'z', at: -1, a: -2.2, b: -1.3 },
    { floor: 0, kind: 'door', axis: 'x', at: -2.5, a: -4.2, b: -3.3 },
    { floor: 0, kind: 'door', axis: 'z', at: -2.5, a: 1.15, b: 1.95 },
    { floor: 0, kind: 'door', axis: 'x', at: 3.5, a: -4.8, b: -3.9 },
    { floor: 0, kind: 'door', axis: 'z', at: -6, a: 1.8, b: 2.7, name: 'ประตูหลังบ้าน' },
    { floor: 0, kind: 'rollup', axis: 'x', at: -6, a: -5.0, b: -2.4, name: 'ประตูม้วนโรงรถ' },
    // Ground floor windows
    { floor: 0, kind: 'window', axis: 'z', at: 3, a: -5.2, b: -3.2 },
    { floor: 0, kind: 'window', axis: 'z', at: 3, a: 2.4, b: 4.6 },
    { floor: 0, kind: 'window', axis: 'x', at: -6, a: 0.0, b: 1.8 },
    { floor: 0, kind: 'window', axis: 'x', at: 6, a: 0.9, b: 2.3 },
    { floor: 0, kind: 'window', axis: 'x', at: 6, a: -5.0, b: -4.0, sill: 1.5 },
    { floor: 0, kind: 'window', axis: 'z', at: -6, a: -1.8, b: -0.8, sill: 1.4 },
    // Upper floor doors
    { floor: 1, kind: 'door', axis: 'z', at: -1, a: -2.2, b: -1.3 },
    { floor: 1, kind: 'door', axis: 'x', at: -2.5, a: -4.2, b: -3.3 },
    { floor: 1, kind: 'door', axis: 'x', at: 1, a: -1.92, b: -1.04 },
    { floor: 1, kind: 'door', axis: 'z', at: -2.5, a: 3.0, b: 3.9 },   // bed2 → upstairs storage (hall side is taken by the stairwell)
    // Upper floor windows
    { floor: 1, kind: 'window', axis: 'z', at: 3, a: -5.0, b: -3.0 },
    { floor: 1, kind: 'window', axis: 'z', at: 3, a: -1.6, b: -0.2 },
    { floor: 1, kind: 'window', axis: 'z', at: 3, a: 2.6, b: 4.6 },
    { floor: 1, kind: 'window', axis: 'x', at: -6, a: -4.6, b: -2.8 },
    { floor: 1, kind: 'window', axis: 'x', at: 6, a: 0.2, b: 1.8 },
    { floor: 1, kind: 'window', axis: 'x', at: 6, a: -5.0, b: -3.6 },
    { floor: 1, kind: 'window', axis: 'z', at: -6, a: -5.0, b: -3.6 },
  ],
  /** Straight stair: footprint x[x0,x1], climbs from z=zBottom (floor 0) to z=zTop (floor 1). */
  stairs: { x0: -0.1, x1: 0.9, zBottom: -5.1, zTop: -1.9 },
  /** Furniture placements: [type, floor, x, z, rot, opts] */
  furniture: [
    // Living room
    ['rug', 0, -3.0, 1.0, 0],
    ['sofa', 0, -3.0, 2.35, 2],
    ['coffee_table', 0, -3.0, 1.0, 0],
    ['tv_cabinet', 0, -3.0, -0.75, 0],
    ['armchair', 0, -5.3, 0.6, 3],
    ['bookshelf', 0, -5.78, -0.2, 3],
    ['floor_lamp', 0, -5.5, 2.5, 0],
    ['plant', 0, 0.55, 2.55, 0],
    ['fan', 0, -0.4, 0.2, 0],
    ['shoe_cabinet', 0, 0.6, -0.4, 1],
    // Kitchen / dining
    ['counter', 0, 2.75, -2.2, 0],
    ['sink_counter', 0, 4.15, -2.2, 0],
    ['stove', 0, 5.15, -2.2, 0],
    ['fridge', 0, 5.6, -1.4, 1],
    ['pantry', 0, 5.72, -0.3, 1],
    ['counter', 0, 5.65, 1.5, 1],
    ['microwave', 0, 5.7, 1.9, 1, { onTop: 0.9 }],
    ['dining_table', 0, 3.0, 1.0, 0],
    ['chair', 0, 2.55, 0.35, 0],
    ['chair', 0, 3.45, 0.35, 0],
    ['chair', 0, 2.55, 1.65, 2],
    ['chair', 0, 3.45, 1.65, 2],
    // Storage / carport room
    ['metal_shelf', 0, -4.25, -5.7, 0],
    ['workbench', 0, -2.9, -2.0, 1],
    ['crate', 0, -5.5, -1.45, 0],
    ['crate', 0, -4.85, -1.45, 0],
    ['boxes', 0, -4.0, -1.5, 0],
    // Hall
    ['plant', 0, -2.15, -5.6, 0],
    // Utility
    ['washer', 0, 1.4, -5.6, 0],
    ['cabinet_small', 0, 3.08, -5.72, 0],
    ['water_jar', 0, 3.0, -3.0, 0],
    // Bathroom
    ['toilet', 0, 5.6, -5.4, 1],
    ['basin', 0, 4.0, -5.75, 0],
    ['shower', 0, 5.45, -3.25, 0],
    // Bedroom 1
    ['rug', 1, -3.2, 0.4, 0],
    ['bed_double', 1, -3.2, 1.85, 2],
    ['wardrobe', 1, -5.65, -0.1, 3],
    ['dresser', 1, -0.3, 2.72, 2],
    ['floor_lamp', 1, -5.5, 2.6, 0],
    ['cabinet_small', 1, -1.6, 2.75, 2],
    // Bedroom 2
    ['bed_single', 1, 5.4, 1.8, 1],
    ['desk', 1, 2.0, 2.65, 2],
    ['chair', 1, 2.0, 2.1, 0],
    ['cabinet_small', 1, 5.65, -1.5, 1],
    ['plant', 1, 1.4, -0.2, 0],
    // Study
    ['desk', 1, -4.25, -5.65, 0],
    ['chair', 1, -4.25, -5.1, 2],
    ['bookshelf', 1, -5.78, -2.4, 3],
    ['boxes', 1, -3.0, -1.5, 0],
    // Upper storage
    ['big_rack', 1, 3.5, -5.65, 0],
    ['crate', 1, 1.5, -3.0, 0],
    ['crate', 1, 2.2, -3.0, 0],
    // Yard (outdoor)
    ['water_tank', 0, -8.6, -4.5, 0],
    ['car', 0, 4.3, 6.6, 0],
    ['potted_tree', 0, -2.4, 3.8, 0],
    ['potted_tree', 0, 0.3, 3.8, 0],
    ['drying_rack', 0, -8.6, 5.5, 1],
    ['outdoor_table', 0, -8.4, -1.2, 0],
    ['mango_tree', 0, -8.6, -8.0, 0],
  ],
};

/**
 * Starting stash inside the home (Day 0). Rolled deterministically from the world seed.
 * [furnitureType ('#sub' = its sub-container, e.g. fridge freezer), itemId, qty] — first match wins.
 */
const HOME_START_STOCK = [
  ['pantry', 'rice_5kg', 1], ['pantry', 'noodle_pack', 8], ['pantry', 'canned_sardine', 4], ['pantry', 'canned_tuna', 3],
  ['pantry', 'fish_sauce', 1], ['pantry', 'cooking_oil', 1], ['pantry', 'sugar_1kg', 1], ['pantry', 'salt', 1],
  ['fridge', 'egg', 6], ['fridge', 'uht_milk', 1], ['fridge', 'morning_glory', 1], ['fridge', 'tomato', 1], ['fridge', 'water_1500', 2],
  ['fridge#sub', 'frozen_chicken', 1], ['fridge#sub', 'ice_cream', 1],
  ['counter', 'kitchen_knife', 1], ['counter', 'frying_pan', 1], ['counter', 'can_opener', 1], ['counter', 'lighter', 2], ['counter', 'gas_canister', 2],
  ['metal_shelf', 'hammer', 1], ['metal_shelf', 'screwdriver', 1], ['metal_shelf', 'duct_tape', 1], ['metal_shelf', 'nails_1kg', 1],
  ['metal_shelf', 'plank', 2], ['metal_shelf', 'flashlight', 1], ['metal_shelf', 'batteries', 2],
  ['crate', 'water_6l', 2], ['boxes', 'shopping_bag', 3], ['boxes', 'tote_bag', 1],
  ['wardrobe', 'backpack_small', 1], ['cabinet_small', 'paracetamol', 1], ['cabinet_small', 'plasters', 1],
  ['dresser', 'candle', 4], ['tv_cabinet', 'biscuits', 2], ['tv_cabinet', 'chips', 1], ['tv_cabinet', 'cola', 1],
  ['bookshelf', 'pouch', 1], ['big_rack', 'toilet_paper', 2], ['big_rack', 'soap', 3],
];
