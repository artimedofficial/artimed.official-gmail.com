/* ==========================================================================
   10 · ITEM DATABASE
   Schema (Appendix C, extended):
     id, name (Thai), cat, tags[], size [w,h], weight (kg/unit), stack, price (฿), rarity
     Food/drink: portions, per {kcal, protein, carb, fat, micro, satiety, water},
                 shelf (days, unopened, at its intended storage), store ('ambient'|'fridge'|'frozen'),
                 opened {ambientH, fridgeD}, freeze ('good'|'texture'|'no')
     Containers: grid [w,h], limit (kg), equip ('back'|'hand'|null)
     Icon: icon {k: shape kind, c: main colour, c2: secondary, b: band/label colour}
   Rows are built with small helpers to keep the table readable.
   ========================================================================== */

const CATEGORIES = {
  food:     { name: 'อาหาร',        color: '#d9a441' },
  drink:    { name: 'เครื่องดื่ม',   color: '#4fa3d1' },
  medical:  { name: 'ยา/ปฐมพยาบาล', color: '#d65a5a' },
  tool:     { name: 'เครื่องมือ',     color: '#9aa4ad' },
  material: { name: 'วัสดุก่อสร้าง',  color: '#b38556' },
  weapon:   { name: 'อาวุธ',         color: '#c7653b' },
  bag:      { name: 'กระเป๋า/ภาชนะ', color: '#7f9a5b' },
  clothing: { name: 'เสื้อผ้า',       color: '#8a79b8' },
  fuel:     { name: 'เชื้อเพลิง',     color: '#d0803a' },
  electric: { name: 'ไฟฟ้า',         color: '#e3c94f' },
  hygiene:  { name: 'สุขอนามัย',     color: '#73c2b0' },
  misc:     { name: 'เบ็ดเตล็ด',      color: '#8c8c8c' },
};

const ITEMS = {};

/** Register a generic item. */
function defItem(id, name, cat, w, h, weight, stack, price, extra = {}) {
  ITEMS[id] = Object.assign({ id, name, cat, size: [w, h], weight, stack, price, rarity: 'common', tags: [] }, extra);
}
/** Food helper: per = [kcal, protein, carb, fat, micro, satiety, water] per portion. */
function defFood(id, name, w, h, weight, stack, price, portions, per, life, extra = {}) {
  const [kcal, protein, carb, fat, micro, satiety, water = 0] = per;
  defItem(id, name, 'food', w, h, weight, stack, price, Object.assign({
    portions,
    per: { kcal, protein, carb, fat, micro, satiety, water },
    shelf: life.shelf, store: life.store || 'ambient',
    opened: life.opened || { ambientH: 24 * 30, fridgeD: 60 },
    freeze: life.freeze || 'no',
  }, extra));
}
function defDrink(id, name, w, h, weight, stack, price, portions, per, life, extra = {}) {
  defFood(id, name, w, h, weight, stack, price, portions, per, life, extra);
  ITEMS[id].cat = 'drink';
}
/** Container helper. */
function defBag(id, name, w, h, weight, price, grid, limit, equip, extra = {}) {
  defItem(id, name, 'bag', w, h, weight, 1, price, Object.assign({ grid, limit, equip }, extra));
}

/* ---------- Shelf-life presets (days) ---------- */
const L = {
  canned:   { shelf: 720, opened: { ambientH: 6, fridgeD: 2.5 }, freeze: 'no' },
  dry:      { shelf: 365, opened: { ambientH: 24 * 60, fridgeD: 120 }, freeze: 'no' },
  instant:  { shelf: 240, opened: { ambientH: 24 * 20, fridgeD: 60 }, freeze: 'no' },
  snack:    { shelf: 180, opened: { ambientH: 24 * 5, fridgeD: 14 }, freeze: 'no' },
  sweets:   { shelf: 300, opened: { ambientH: 24 * 30, fridgeD: 90 }, freeze: 'good' },
  bread:    { shelf: 5, opened: { ambientH: 48, fridgeD: 7 }, freeze: 'good' },
  freshMeat:{ shelf: 3, store: 'fridge', opened: { ambientH: 6, fridgeD: 3 }, freeze: 'good' },
  frozen:   { shelf: 365, store: 'frozen', opened: { ambientH: 6, fridgeD: 2 }, freeze: 'good' },
  dairy:    { shelf: 10, store: 'fridge', opened: { ambientH: 8, fridgeD: 4 }, freeze: 'texture' },
  uht:      { shelf: 180, opened: { ambientH: 8, fridgeD: 4 }, freeze: 'texture' },
  veg:      { shelf: 4, opened: { ambientH: 24, fridgeD: 4 }, freeze: 'texture' },
  hardVeg:  { shelf: 14, opened: { ambientH: 48, fridgeD: 7 }, freeze: 'texture' },
  fruit:    { shelf: 5, opened: { ambientH: 12, fridgeD: 3 }, freeze: 'good' },
  egg:      { shelf: 21, opened: { ambientH: 4, fridgeD: 2 }, freeze: 'no' },
  water:    { shelf: 730, opened: { ambientH: 24 * 3, fridgeD: 7 }, freeze: 'no' },
  soda:     { shelf: 270, opened: { ambientH: 12, fridgeD: 3 }, freeze: 'no' },
  condiment:{ shelf: 540, opened: { ambientH: 24 * 90, fridgeD: 365 }, freeze: 'no' },
  cooked:   { shelf: 0.4, opened: { ambientH: 8, fridgeD: 2.5 }, freeze: 'good' },
};

/* ---------- Food (Phase 1A starter set; expanded to 120+ in 1B) ---------- */
// id, name, w,h, kg, stack, price, portions, [kcal,pro,carb,fat,micro,sat,water], life, extra
defFood('rice_5kg', 'ข้าวหอมมะลิ 5 กก.', 2, 3, 5.0, 1, 230, 50, [355, 7, 79, 1, 1, 22], L.dry, { tags: ['staple', 'rice'], icon: { k: 'sack', c: '#efe6d0', c2: '#3b7a3a', b: '#c43c2c' } });
defFood('rice_sticky_2kg', 'ข้าวเหนียว 2 กก.', 2, 2, 2.0, 1, 110, 20, [360, 7, 80, 1, 1, 24], L.dry, { tags: ['staple', 'rice'], icon: { k: 'sack', c: '#f4f1e8', c2: '#2f5f9a', b: '#e0b23c' } });
defFood('noodle_pack', 'บะหมี่กึ่งสำเร็จรูป (ซอง)', 1, 1, 0.06, 10, 7, 4, [85, 2, 11, 3.5, 0.5, 6], L.instant, { tags: ['instant', 'noodle'], parts: ['noodle_block', 'seasoning_sachet'], icon: { k: 'pack', c: '#e2a72e', c2: '#c0392b', b: '#ffffff' } });
defFood('noodle_cup', 'บะหมี่ถ้วย', 1, 1, 0.07, 6, 18, 4, [80, 2, 10, 3.5, 0.5, 6], L.instant, { tags: ['instant', 'noodle'], icon: { k: 'cup', c: '#f0efe8', c2: '#d2412b', b: '#f2c230' } });
defFood('jok_cup', 'โจ๊กกึ่งสำเร็จรูป (ถ้วย)', 1, 1, 0.05, 6, 20, 2, [105, 3, 19, 2, 0.5, 9], L.instant, { tags: ['instant', 'porridge'], icon: { k: 'cup', c: '#f6f1e2', c2: '#2b7fc4', b: '#f2c230' } });
defFood('canned_tuna', 'ทูน่ากระป๋อง', 1, 1, 0.185, 12, 38, 4, [45, 9, 0, 1, 0.5, 5], L.canned, { tags: ['canned', 'protein', 'fish'], icon: { k: 'can', c: '#2a6fa8', c2: '#c8ccd0', b: '#f5f5f5' } });
defFood('canned_sardine', 'ปลากระป๋องซอสมะเขือเทศ', 1, 1, 0.155, 12, 25, 4, [48, 5, 1, 3, 1, 6], L.canned, { tags: ['canned', 'protein', 'fish'], icon: { k: 'can', c: '#c4342b', c2: '#c8ccd0', b: '#f0d24a' } });
defFood('canned_mackerel', 'ปลาแมคเคอเรลกระป๋อง', 1, 1, 0.155, 12, 28, 4, [55, 6, 0.5, 3.5, 1, 6], L.canned, { tags: ['canned', 'protein', 'fish'], icon: { k: 'can', c: '#e0b23c', c2: '#c8ccd0', b: '#1f5c8f' } });
defFood('canned_pork', 'หมูกระป๋อง', 1, 1, 0.34, 12, 59, 4, [140, 7, 2, 12, 0.5, 8], L.canned, { tags: ['canned', 'protein', 'meat'], icon: { k: 'can', c: '#b8452d', c2: '#c8ccd0', b: '#f5e6c8' } });
defFood('canned_corn', 'ข้าวโพดหวานกระป๋อง', 1, 1, 0.425, 12, 35, 3, [80, 2, 16, 1, 2, 7, 20], L.canned, { tags: ['canned', 'veg'], icon: { k: 'can', c: '#3c8a3a', c2: '#c8ccd0', b: '#f2d03a' } });
defFood('baked_beans', 'ถั่วอบซอสกระป๋อง', 1, 1, 0.415, 12, 45, 3, [125, 7, 21, 0.5, 2, 10, 15], L.canned, { tags: ['canned', 'protein', 'veg'], icon: { k: 'can', c: '#2f63a8', c2: '#c8ccd0', b: '#e57a2e' } });
defFood('coconut_milk', 'กะทิกล่อง', 1, 1, 0.25, 12, 22, 4, [90, 1, 2, 9, 0.5, 3, 10], L.uht, { tags: ['condiment', 'fat'], icon: { k: 'carton', c: '#f6f6f2', c2: '#3b8a3a', b: '#6b4a2b' } });
defFood('condensed_milk', 'นมข้นหวาน', 1, 1, 0.39, 12, 30, 8, [130, 3, 22, 3.5, 0.5, 3], L.canned, { tags: ['canned', 'sweet', 'dairy'], icon: { k: 'can', c: '#f2f2ec', c2: '#c8ccd0', b: '#2f63a8' } });
defFood('peanut_butter', 'เนยถั่ว', 1, 1, 0.34, 6, 89, 10, [190, 7, 6, 16, 1, 8], L.condiment, { tags: ['spread', 'protein', 'fat'], icon: { k: 'jar', c: '#b8793a', c2: '#d63c2b', b: '#f2e2b0' } });
defFood('energy_bar', 'ธัญพืชอัดแท่ง', 1, 1, 0.04, 20, 25, 1, [180, 6, 24, 7, 2, 7], L.snack, { tags: ['snack'], icon: { k: 'bar', c: '#3a6e3a', c2: '#e9d29a', b: '#f2c230' } });
defFood('biscuits', 'ขนมปังกรอบ', 1, 1, 0.12, 10, 25, 4, [130, 2, 19, 5, 0.5, 5], L.snack, { tags: ['snack'], icon: { k: 'box', c: '#d8a23a', c2: '#7a3f1e', b: '#f7f0d8' } });
defFood('crackers', 'แครกเกอร์', 1, 1, 0.1, 10, 22, 4, [110, 2, 17, 4, 0.5, 5], L.snack, { tags: ['snack'], icon: { k: 'box', c: '#2f63a8', c2: '#f2d03a', b: '#f7f0d8' } });
defFood('chips', 'มันฝรั่งทอดกรอบ', 1, 2, 0.075, 8, 30, 3, [130, 2, 13, 8, 0.5, 4], L.snack, { tags: ['snack'], icon: { k: 'pillow', c: '#e8c234', c2: '#c0392b', b: '#ffffff' } });
defFood('chocolate', 'ช็อกโกแลตแท่ง', 1, 1, 0.045, 20, 35, 3, [80, 1, 9, 4.5, 0.5, 3], L.sweets, { tags: ['snack', 'sweet'], icon: { k: 'bar', c: '#5a3220', c2: '#c9a26a', b: '#d23c2b' } });
defFood('bread_loaf', 'ขนมปังแผ่น', 2, 1, 0.4, 4, 42, 8, [80, 3, 15, 1, 0.5, 5], L.bread, { tags: ['bakery', 'carb'], icon: { k: 'loaf', c: '#d9a35a', c2: '#f2e1bd', b: '#ffffff' } });
defFood('egg', 'ไข่ไก่ (ฟอง)', 1, 1, 0.06, 30, 5, 1, [72, 6, 0.4, 5, 1, 5], L.egg, { tags: ['protein', 'egg', 'fresh'], icon: { k: 'egg', c: '#f2dcb8', c2: '#e9cfa5', b: '#ffffff' } });
defFood('pork_1kg', 'เนื้อหมูสด 1 กก.', 2, 1, 1.0, 4, 180, 8, [150, 16, 0, 9, 0.5, 9, 8], L.freshMeat, { tags: ['meat', 'protein', 'raw'], icon: { k: 'tray', c: '#e88a8a', c2: '#ffffff', b: '#c94b4b' } });
defFood('chicken_breast', 'อกไก่สด 1 กก.', 2, 1, 1.0, 4, 110, 8, [130, 25, 0, 3, 0.5, 9, 8], L.freshMeat, { tags: ['meat', 'protein', 'raw', 'poultry'], icon: { k: 'tray', c: '#f2c2b0', c2: '#ffffff', b: '#e0b23c' } });
defFood('beef_steak', 'สเต๊กเนื้อ (~250 ก.)', 1, 1, 0.25, 4, 250, 2, [300, 30, 0, 20, 1, 12, 6], L.freshMeat, { tags: ['meat', 'protein', 'raw', 'beef'], icon: { k: 'tray', c: '#a8343a', c2: '#ffffff', b: '#2b2b2b' } });
defFood('frozen_chicken', 'ไก่แช่แข็ง 1 กก.', 2, 1, 1.0, 4, 99, 8, [140, 20, 0, 6, 0.5, 9, 8], L.frozen, { tags: ['meat', 'protein', 'raw', 'poultry', 'frozen'], icon: { k: 'frozen', c: '#e9eef5', c2: '#f2c2b0', b: '#2f63a8' } });
defFood('frozen_dumplings', 'เกี๊ยวซ่าแช่แข็ง', 1, 1, 0.4, 6, 89, 4, [180, 7, 22, 7, 1, 9], L.frozen, { tags: ['frozen', 'ready'], icon: { k: 'frozen', c: '#e9eef5', c2: '#f0d7a6', b: '#c0392b' } });
defFood('ice_cream', 'ไอศกรีมถัง 1 ลิตร', 1, 1, 0.55, 4, 159, 6, [140, 2, 16, 7, 0.5, 4, 8], L.frozen, { tags: ['frozen', 'sweet', 'dairy'], icon: { k: 'tub', c: '#f3e6d0', c2: '#7a4a2a', b: '#e05a8a' } });
defFood('morning_glory', 'ผักบุ้ง (กำ)', 1, 2, 0.25, 6, 15, 2, [20, 2, 3, 0.2, 4, 5, 30], L.veg, { tags: ['veg', 'leafy', 'fresh'], icon: { k: 'greens', c: '#3f8a2f', c2: '#9ccf6a', b: '#c43c2c' } });
defFood('cabbage', 'กะหล่ำปลี (หัว)', 2, 2, 1.0, 2, 30, 6, [25, 1.3, 5, 0.1, 4, 6, 40], L.hardVeg, { tags: ['veg', 'leafy', 'fresh'], icon: { k: 'round', c: '#a6cf7a', c2: '#d8eebc', b: '#5a8a3a' } });
defFood('tomato', 'มะเขือเทศ (ถุง)', 1, 1, 0.5, 6, 25, 4, [22, 1, 4.5, 0.2, 3, 4, 40], L.veg, { tags: ['veg', 'fresh'], icon: { k: 'round', c: '#d83a2a', c2: '#f07a5a', b: '#3a8a2a' } });
defFood('banana', 'กล้วยหอม (หวี)', 2, 1, 1.0, 4, 45, 6, [105, 1.3, 27, 0.4, 3, 7, 30], L.fruit, { tags: ['fruit', 'fresh'], icon: { k: 'banana', c: '#f2cf3a', c2: '#8a6a2a', b: '#3a8a2a' } });
defFood('mango', 'มะม่วงน้ำดอกไม้', 1, 1, 0.35, 8, 35, 2, [100, 1, 25, 0.5, 3, 6, 40], L.fruit, { tags: ['fruit', 'fresh'], icon: { k: 'round', c: '#f2b33a', c2: '#e5d23a', b: '#3a8a2a' } });
defFood('fish_sauce', 'น้ำปลา', 1, 2, 0.75, 4, 35, 50, [6, 1, 0, 0, 0.2, 0], L.condiment, { tags: ['condiment'], icon: { k: 'bottle', c: '#7a4a1a', c2: '#d63c2b', b: '#f2e2b0' } });
defFood('cooking_oil', 'น้ำมันพืช 1 ลิตร', 1, 2, 0.95, 4, 62, 60, [120, 0, 0, 14, 0, 1], L.condiment, { tags: ['condiment', 'fat'], icon: { k: 'bottle', c: '#e8c34a', c2: '#2f7a3a', b: '#ffffff' } });
defFood('sugar_1kg', 'น้ำตาลทราย 1 กก.', 1, 2, 1.0, 4, 25, 50, [80, 0, 20, 0, 0, 1], L.dry, { tags: ['condiment', 'sweet'], icon: { k: 'sack', c: '#f8f8f6', c2: '#2f63a8', b: '#e05a3a' } });
defFood('salt', 'เกลือ 500 ก.', 1, 1, 0.5, 6, 10, 100, [0, 0, 0, 0, 0.3, 0], L.dry, { tags: ['condiment'], icon: { k: 'sack', c: '#f2f6fa', c2: '#2b8ac4', b: '#2b8ac4' } });

/* ---------- Drinks ---------- */
defDrink('water_600', 'น้ำดื่ม 600 มล.', 1, 1, 0.62, 12, 7, 2, [0, 0, 0, 0, 0, 1, 30], L.water, { tags: ['water', 'clean'], icon: { k: 'bottle', c: '#bfe3f5', c2: '#2b8ac4', b: '#ffffff' } });
defDrink('water_1500', 'น้ำดื่ม 1.5 ลิตร', 1, 2, 1.55, 6, 12, 5, [0, 0, 0, 0, 0, 1, 30], L.water, { tags: ['water', 'clean'], icon: { k: 'bottle', c: '#bfe3f5', c2: '#2b8ac4', b: '#ffffff' } });
defDrink('water_6l', 'น้ำดื่มแกลลอน 6 ลิตร', 2, 2, 6.1, 2, 35, 20, [0, 0, 0, 0, 0, 1, 30], L.water, { tags: ['water', 'clean'], icon: { k: 'jug', c: '#cfe9f7', c2: '#2b8ac4', b: '#2b8ac4' } });
defDrink('cola', 'น้ำอัดลม 1.25 ลิตร', 1, 2, 1.3, 6, 35, 5, [105, 0, 26, 0, 0, 2, 22], L.soda, { tags: ['soda', 'sweet'], icon: { k: 'bottle', c: '#3a1a12', c2: '#c4202a', b: '#ffffff' } });
defDrink('uht_milk', 'นม UHT 1 ลิตร', 1, 2, 1.05, 6, 48, 4, [155, 8, 12, 8, 2, 6, 22], L.uht, { tags: ['dairy', 'milk'], icon: { k: 'carton', c: '#f6f6f2', c2: '#2b7fc4', b: '#2b7fc4' } });
defDrink('orange_juice', 'น้ำส้ม 1 ลิตร', 1, 2, 1.05, 6, 55, 4, [110, 1.7, 26, 0.5, 3, 4, 24], L.uht, { tags: ['juice', 'sweet'], icon: { k: 'carton', c: '#f5a52a', c2: '#3a8a2a', b: '#ffffff' } });

/* ---------- Medical ---------- */
defItem('paracetamol', 'พาราเซตามอล (10 เม็ด)', 'medical', 1, 1, 0.02, 10, 15, { uses: 10, tags: ['painkiller', 'fever'], icon: { k: 'blister', c: '#f2f2f2', c2: '#d63c2b' } });
defItem('povidone', 'ยาฆ่าเชื้อโพวิโดน-ไอโอดีน', 'medical', 1, 1, 0.07, 6, 55, { uses: 12, tags: ['antiseptic'], icon: { k: 'smallbottle', c: '#6b2a12', c2: '#f2f2f2', b: '#2f63a8' } });
defItem('gauze_set', 'ชุดผ้าก๊อซและผ้าพันแผล', 'medical', 1, 1, 0.1, 6, 55, { uses: 4, tags: ['bandage', 'dressing'], icon: { k: 'box', c: '#f6f6f6', c2: '#d63c2b', b: '#d63c2b' } });
defItem('plasters', 'พลาสเตอร์ปิดแผล (กล่อง)', 'medical', 1, 1, 0.05, 6, 35, { uses: 10, tags: ['bandage'], icon: { k: 'box', c: '#e9c9a8', c2: '#2f63a8', b: '#ffffff' } });
defItem('first_aid_kit', 'กล่องปฐมพยาบาล', 'medical', 2, 2, 0.8, 1, 450, { tags: ['kit'], icon: { k: 'case', c: '#d6362b', c2: '#ffffff' } });

/* ---------- Tools ---------- */
defItem('hammer', 'ค้อนหงอน', 'tool', 1, 2, 0.6, 1, 250, { tags: ['hammer', 'build'], dura: 100, icon: { k: 'hammer', c: '#3a3a3a', c2: '#a8743a' } });
defItem('saw', 'เลื่อยลันดา', 'tool', 1, 3, 0.5, 1, 280, { tags: ['saw', 'build'], dura: 100, icon: { k: 'saw', c: '#c8ccd0', c2: '#c0392b' } });
defItem('screwdriver', 'ไขควงชุด', 'tool', 1, 1, 0.2, 1, 120, { tags: ['repair'], dura: 100, icon: { k: 'screwdriver', c: '#e0b23c', c2: '#c8ccd0' } });
defItem('flashlight', 'ไฟฉาย', 'electric', 1, 1, 0.25, 1, 250, { tags: ['light'], dura: 100, icon: { k: 'flashlight', c: '#2b2b2b', c2: '#f2d03a' } });
defItem('batteries', 'ถ่าน AA (4 ก้อน)', 'electric', 1, 1, 0.1, 10, 60, { tags: ['battery'], icon: { k: 'battery', c: '#2b2b2b', c2: '#d6a32a' } });
defItem('duct_tape', 'เทปผ้า (ม้วน)', 'material', 1, 1, 0.3, 4, 90, { uses: 10, tags: ['tape', 'repair'], icon: { k: 'roll', c: '#9aa4ad', c2: '#6c757d' } });
defItem('lighter', 'ไฟแช็ก', 'misc', 1, 1, 0.02, 10, 15, { uses: 300, tags: ['fire'], icon: { k: 'lighter', c: '#d6362b', c2: '#c8ccd0' } });
defItem('can_opener', 'ที่เปิดกระป๋อง', 'tool', 1, 1, 0.12, 1, 60, { tags: ['opener'], dura: 100, icon: { k: 'opener', c: '#c8ccd0', c2: '#2b2b2b' } });

/* ---------- Materials ---------- */
defItem('plank', 'ไม้แปรรูป 2×4 นิ้ว', 'material', 1, 4, 3.2, 4, 180, { tags: ['wood', 'build'], icon: { k: 'plank', c: '#f2cf98', c2: '#a87a42' } });
defItem('nails_1kg', 'ตะปู 1 กก.', 'material', 1, 1, 1.0, 5, 70, { uses: 100, tags: ['nails', 'build'], icon: { k: 'box', c: '#8a8f94', c2: '#2b2b2b', b: '#e0b23c' } });
defItem('plywood', 'ไม้อัดบาง 4×8 ฟุต', 'material', 4, 4, 9.0, 1, 480, { tags: ['wood', 'build'], icon: { k: 'board', c: '#f6dcae', c2: '#b8894e' } });

/* ---------- Weapons (melee; full combat in 1D) ---------- */
defItem('kitchen_knife', 'มีดทำครัว', 'weapon', 1, 2, 0.2, 1, 150, { tags: ['blade', 'cook'], dura: 60, icon: { k: 'knife', c: '#d0d4d8', c2: '#2b2b2b' } });
defItem('baseball_bat', 'ไม้เบสบอล (ไม้)', 'weapon', 1, 4, 0.9, 1, 750, { tags: ['blunt'], dura: 120, icon: { k: 'bat', c: '#e0b07a', c2: '#3a2a1a' } });
defItem('frying_pan', 'กระทะเหล็ก', 'weapon', 2, 2, 1.2, 1, 350, { tags: ['blunt', 'cook'], dura: 200, icon: { k: 'pan', c: '#2b2b2b', c2: '#5a3a2a' } });

/* ---------- Bags & containers (Appendix B sizes) ---------- */
defBag('shopping_bag', 'ถุงช้อปปิ้ง', 2, 2, 0.05, 2, [3, 3], 8, 'hand', { icon: { k: 'shopbag', c: '#f2f2ee', c2: '#3a8a2a' } });
defBag('tote_bag', 'ถุงผ้าใบใหญ่', 2, 2, 0.2, 59, [4, 4], 15, 'hand', { icon: { k: 'shopbag', c: '#c9b48a', c2: '#6b5a3a' } });
defBag('backpack_small', 'เป้เล็ก', 2, 2, 0.4, 390, [4, 4], 10, 'back', { icon: { k: 'backpack', c: '#2f5f9a', c2: '#1f3f6a' } });
defBag('backpack_medium', 'เป้กลาง', 3, 3, 0.8, 890, [5, 6], 18, 'back', { icon: { k: 'backpack', c: '#3a5a3a', c2: '#2a3f2a' } });
defBag('hiking_pack', 'เป้เดินป่าใบใหญ่', 3, 4, 1.6, 2900, [6, 8], 28, 'back', { rarity: 'uncommon', icon: { k: 'backpack', c: '#b0482a', c2: '#3a3a3a' } });
defBag('pouch', 'กระเป๋าคาดเอว', 1, 1, 0.15, 190, [2, 2], 3, null, { icon: { k: 'pouch', c: '#5a5f66', c2: '#8c959e' } });
defBag('tool_roll', 'ม้วนเก็บเครื่องมือ', 2, 1, 0.3, 250, [4, 2], 6, null, { icon: { k: 'pouch', c: '#6b4a2a', c2: '#3a2a1a' } });
defBag('food_box', 'กล่องเก็บอาหารมีฝา', 2, 2, 0.4, 120, [3, 3], 10, null, { tags: ['sealed'], icon: { k: 'crate', c: '#e9eef2', c2: '#3a8ac4' } });

/* ---------- Hygiene / misc ---------- */
defItem('soap', 'สบู่ก้อน', 'hygiene', 1, 1, 0.1, 10, 20, { uses: 20, tags: ['soap'], icon: { k: 'bar', c: '#f2e6c8', c2: '#73c2b0', b: '#ffffff' } });
defItem('toilet_paper', 'กระดาษชำระ (แพ็ก 6)', 'hygiene', 2, 2, 0.6, 4, 89, { uses: 6, tags: ['paper'], icon: { k: 'pillow', c: '#f6f6f6', c2: '#73a8d6', b: '#ffffff' } });
defItem('candle', 'เทียนไข', 'misc', 1, 1, 0.08, 12, 10, { tags: ['light', 'fire'], icon: { k: 'candle', c: '#f6efe0', c2: '#e0b23c' } });
defItem('gas_canister', 'แก๊สกระป๋อง', 'fuel', 1, 1, 0.35, 6, 35, { uses: 120, tags: ['gas'], icon: { k: 'can', c: '#d6362b', c2: '#c8ccd0', b: '#ffffff' } });

/** Defensive accessor: unknown ids resolve to a visible "unknown" item instead of throwing. */
defItem('unknown', 'ของไม่ทราบชนิด', 'misc', 1, 1, 0.1, 1, 0, { icon: { k: 'box', c: '#555', c2: '#888' } });
function itemDef(id) { return ITEMS[id] || ITEMS.unknown; }
