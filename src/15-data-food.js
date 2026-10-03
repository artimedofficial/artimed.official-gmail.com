/* ==========================================================================
   15 · FOOD SYSTEM DATA (§6.5, §6.6) — cooked dishes, recipes, nutrition
   targets, ration levels, thaw/freeze tuning, cold-hold, appliances.
   Every number here is a tunable.
   ========================================================================== */

/** Daily nutrient targets for the 7-day buffers (§6.5.3). */
const NUTRITION = {
  baseKcal: 2100,                    // resting-day need before activity
  target: { protein: 60, carb: 275, fat: 65, micro: 20 },
  bufferDays: 7,
  lowDays: 2,                        // buffer below this → deficiency effects
  refeedEfficiency: 1.6,             // surplus counts extra while recovering a deficit
  // Body-reserve thresholds (kcal, negative = deficit) → state
  stages: [
    { key: 'normal',    min: -2500,  name: 'ปกติ',            carry: 1.0,  speed: 1.0,  skill: 1.0,  heal: 1.0 },
    { key: 'thin',      min: -6500,  name: 'น้ำหนักลด',        carry: 0.93, speed: 1.0,  skill: 0.95, heal: 0.9 },
    { key: 'weak',      min: -15000, name: 'อ่อนแรง',          carry: 0.8,  speed: 0.92, skill: 0.8,  heal: 0.7 },
    { key: 'veryweak',  min: -30000, name: 'อ่อนแรงมาก',       carry: 0.65, speed: 0.85, skill: 0.6,  heal: 0.5 },
    { key: 'starving',  min: -1e9,   name: 'ขาดอาหารรุนแรง',   carry: 0.5,  speed: 0.75, skill: 0.4,  heal: 0.3 },
  ],
  activity: { sleep: 0.85, idle: 1.0, walk: 1.6, sneak: 1.3, run: 3.0 },
};
/** Ration levels (§6.5.4): fraction of estimated daily need. */
const RATIONS = {
  normal:    { name: 'ปกติ', f: 1.0 },
  reduced:   { name: 'ลดปริมาณ', f: 0.7 },
  emergency: { name: 'ฉุกเฉิน', f: 0.45 },
  recovery:  { name: 'ฟื้นฟู', f: 1.2 },
};
/** Spoilage stages by age (0 = fresh, 1 = spoiled). */
const FRESH = { aging: 0.7, spoiled: 1.0, rotten: 1.4 };
/** Freeze / thaw tuning (hours for a ~250 g piece; scaled by (kg/0.25)^exp). */
const THAW = {
  freezeH: 3, freezeExp: 0.5,
  fridgeH: 10, fridgeExp: 0.55,      // steak ≈ 10 h, whole chicken ≈ 25 h
  ambientH: 3, ambientExp: 0.5,      // steak ≈ 3 h in Thai room heat
  microwaveMin: 8,
  cookFromFrozenMul: 1.5,
};
/** Cold-hold hours after power loss for a closed unit (§6.6.3). Opening the lid costs holdLidH. */
const COLD_HOLD = { fridge: 4, compartment: 6, chest: 24, large: 36, shop_chiller: 3, shop_cooler: 4, shop_freezer: 12, holdLidH: 0.6 };

/* ---------- Cooked dishes (outputs of recipes) ---------- */
// id, name, icon colours, kcal per portion (sizing reference), satiety per portion, life preset
const DISHES = [
  ['dish_rice', 'ข้าวสวย', '#f6f3ea', '#e9e2cc', 100, 7],
  ['dish_sticky_rice', 'ข้าวเหนียวนึ่ง', '#f2eedc', '#d8cfb0', 120, 8],
  ['dish_noodle_soup', 'บะหมี่น้ำ', '#e2a72e', '#c0392b', 120, 10],
  ['dish_jok', 'โจ๊ก/ข้าวต้ม', '#f2ead8', '#c9a46a', 110, 11],
  ['dish_fried_rice', 'ข้าวผัด', '#e9c87a', '#c9733a', 200, 11],
  ['dish_omelet', 'ไข่เจียว', '#f2c230', '#c9933a', 160, 8],
  ['dish_kaprao', 'ผัดกะเพรา', '#7a5a3a', '#3a7a3a', 220, 11],
  ['dish_curry', 'แกงกะทิ', '#5f8a3a', '#e9d8b0', 230, 12],
  ['dish_tomyum', 'ต้มยำ', '#e57a2e', '#c4202a', 110, 11],
  ['dish_clear_soup', 'แกงจืด', '#e9e6d0', '#5f8a3a', 90, 10],
  ['dish_stir_veg', 'ผัดผัก', '#3f8a2f', '#9ccf6a', 90, 8],
  ['dish_grilled_meat', 'เนื้อย่าง/หมูย่าง', '#8a4a2a', '#c9733a', 260, 11],
  ['dish_steak', 'สเต๊ก', '#6b3a22', '#a8582a', 340, 13],
  ['dish_fried_fish', 'ปลาทอด', '#c9933a', '#8a9aa8', 180, 10],
  ['dish_boiled_egg', 'ไข่ต้ม', '#f6f3ea', '#f2c230', 75, 6],
  ['dish_pasta', 'พาสต้าซอสมะเขือเทศ', '#c4202a', '#f2e6c8', 250, 12],
  ['dish_rice_canned', 'ข้าวราดปลากระป๋อง', '#c4342b', '#f6f3ea', 230, 12],
  ['dish_yum', 'ยำ/สลัด', '#e8a088', '#5f8a3a', 110, 7],
  ['dish_somtam', 'ส้มตำ', '#9ccf6a', '#c4202a', 90, 8],
  ['dish_oatmeal', 'ข้าวโอ๊ตต้ม', '#d8b97a', '#f2efe6', 160, 11],
  ['dish_potato', 'มันฝรั่งต้ม', '#e9d8b0', '#c9a46a', 130, 11],
  ['dish_fries', 'เฟรนช์ฟรายส์', '#f2c230', '#c4202a', 190, 7],
  ['dish_dimsum', 'ติ่มซำนึ่ง', '#f2e6c8', '#e0b23c', 170, 9],
  ['dish_ready', 'อาหารสำเร็จรูปอุ่นร้อน', '#e9eef5', '#c4202a', 210, 11],
  ['dish_fried_sausage', 'ไส้กรอกทอด', '#c9643a', '#f2c230', 190, 8],
  ['dish_veg_soup', 'ซุปผัก', '#c9733a', '#5f8a3a', 70, 10],
  ['dish_bean_stew', 'ถั่วต้ม/สตูว์ถั่ว', '#8a2f2a', '#c9a46a', 170, 12],
  ['dish_seafood_stirfry', 'ผัดทะเล', '#e8a088', '#3a7a3a', 150, 9],
  ['dish_roti', 'โรตีนมข้น', '#e0c08a', '#f2f2ec', 260, 8],
  ['dish_dessert', 'ขนมหวานกะทิ', '#f2e6c8', '#f2c230', 170, 7],
  ['dish_pancake', 'แพนเค้ก', '#e0b07a', '#f2c230', 200, 9],
  ['dish_sandwich', 'แซนด์วิช', '#d9a35a', '#7a4a2a', 230, 9],
  ['dish_boiled_veg', 'ผักลวก', '#3f8a2f', '#e9e6d0', 40, 6],
];
for (const [id, name, c, c2, kcal, sat] of DISHES) {
  defFood(id, name, 1, 1, 0.25, 1, 0, 4, [kcal, kcal * 0.05, kcal * 0.12, kcal * 0.035, 1.5, sat, 10], L.cooked, { tags: ['cooked', 'dish'], cooked: true, refKcal: kcal, icon: { k: 'plate', c, c2, b: '#ffffff' } });
}

/**
 * Recipes (§6.5.5). Slots accept items by 'tag:x' or 'id:x'. amt = portions of the matched
 * item per batch (×1). Optional slots add flavour/nutrition. Methods need stations:
 * stove (home gas stove or portable stove), microwave (power), none (no-cook).
 */
const RECIPES = [
  { id: 'r_rice', name: 'หุงข้าวสวย', out: 'dish_rice', method: 'boil', station: ['stove', 'microwave'], time: 25, water: 2, slots: [{ label: 'ข้าวสาร', any: ['id:rice_5kg', 'id:rice_brown_1kg'], amt: 2 }] },
  { id: 'r_sticky', name: 'นึ่งข้าวเหนียว', out: 'dish_sticky_rice', method: 'steam', station: ['stove'], time: 40, water: 2, slots: [{ label: 'ข้าวเหนียว', any: ['id:rice_sticky_2kg'], amt: 2 }] },
  { id: 'r_noodle', name: 'บะหมี่น้ำ', out: 'dish_noodle_soup', method: 'boil', station: ['stove', 'microwave'], time: 6, water: 1, slots: [{ label: 'บะหมี่/เส้น', any: ['tag:instant', 'tag:noodle'], amt: 4 }, { label: 'ไข่', any: ['tag:egg'], amt: 1, optional: true }, { label: 'ผัก', any: ['tag:leafy', 'tag:veg'], amt: 1, optional: true }, { label: 'เนื้อสัตว์', any: ['tag:meat', 'tag:seafood', 'tag:processed'], amt: 1, optional: true }] },
  { id: 'r_jok', name: 'ข้าวต้ม/โจ๊ก', out: 'dish_jok', method: 'boil', station: ['stove'], time: 30, water: 3, slots: [{ label: 'ข้าวสาร', any: ['id:rice_5kg', 'id:rice_brown_1kg', 'id:dish_rice'], amt: 2 }, { label: 'เนื้อสัตว์', any: ['tag:minced', 'tag:meat', 'tag:seafood'], amt: 1, optional: true }, { label: 'ไข่', any: ['tag:egg'], amt: 1, optional: true }, { label: 'กระเทียม/หอม', any: ['id:garlic', 'id:shallot'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_fried_rice', name: 'ข้าวผัด', out: 'dish_fried_rice', method: 'fry', station: ['stove'], time: 12, slots: [{ label: 'ข้าวสวย', any: ['id:dish_rice'], amt: 3 }, { label: 'ไข่', any: ['tag:egg'], amt: 1, optional: true }, { label: 'เนื้อสัตว์', any: ['tag:meat', 'tag:seafood', 'tag:processed', 'id:canned_pork', 'id:canned_sausage'], amt: 1, optional: true }, { label: 'น้ำมัน', any: ['id:cooking_oil'], amt: 1, optional: true }, { label: 'เครื่องปรุง', any: ['tag:sauce', 'id:fish_sauce'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_omelet', name: 'ไข่เจียว', out: 'dish_omelet', method: 'fry', station: ['stove'], time: 6, slots: [{ label: 'ไข่', any: ['tag:egg'], amt: 2 }, { label: 'น้ำมัน', any: ['id:cooking_oil'], amt: 1, optional: true }, { label: 'น้ำปลา', any: ['id:fish_sauce', 'id:soy_sauce'], amt: 1, optional: true, seasoning: true }, { label: 'หมูสับ', any: ['tag:minced'], amt: 1, optional: true }] },
  { id: 'r_kaprao', name: 'ผัดกะเพรา', out: 'dish_kaprao', method: 'fry', station: ['stove'], time: 10, slots: [{ label: 'เนื้อสัตว์', any: ['tag:minced', 'tag:poultry', 'tag:pork', 'tag:seafood'], amt: 2 }, { label: 'ใบกะเพรา', any: ['id:thai_basil'], amt: 1, optional: true, seasoning: true }, { label: 'พริก/กระเทียม', any: ['id:chili_fresh', 'id:garlic'], amt: 1, optional: true, seasoning: true }, { label: 'น้ำมัน', any: ['id:cooking_oil'], amt: 1, optional: true }, { label: 'ข้าวสวย', any: ['id:dish_rice'], amt: 2, optional: true }] },
  { id: 'r_green_curry', name: 'แกงเขียวหวาน', out: 'dish_curry', method: 'boil', station: ['stove'], time: 30, water: 1, slots: [{ label: 'พริกแกง', any: ['id:curry_paste_green'], amt: 2, seasoning: true }, { label: 'กะทิ', any: ['id:coconut_milk'], amt: 4 }, { label: 'เนื้อสัตว์', any: ['tag:poultry', 'tag:pork', 'tag:fish', 'tag:meat'], amt: 3 }, { label: 'ผัก', any: ['id:eggplant', 'id:canned_bamboo', 'tag:veg'], amt: 1, optional: true }] },
  { id: 'r_red_curry', name: 'แกงเผ็ด', out: 'dish_curry', method: 'boil', station: ['stove'], time: 30, water: 1, slots: [{ label: 'พริกแกง', any: ['id:curry_paste_red'], amt: 2, seasoning: true }, { label: 'กะทิ', any: ['id:coconut_milk'], amt: 4 }, { label: 'เนื้อสัตว์', any: ['tag:meat', 'tag:poultry', 'tag:pork'], amt: 3 }, { label: 'ผัก', any: ['id:pumpkin', 'id:canned_bamboo', 'tag:veg'], amt: 1, optional: true }] },
  { id: 'r_tomyum', name: 'ต้มยำ', out: 'dish_tomyum', method: 'boil', station: ['stove'], time: 20, water: 3, slots: [{ label: 'เนื้อ/ทะเล', any: ['tag:seafood', 'tag:fish', 'tag:poultry'], amt: 3 }, { label: 'เครื่องต้มยำ', any: ['id:tomyum_paste', 'id:lemongrass', 'id:galangal', 'id:kaffir_lime_leaf'], amt: 1, seasoning: true }, { label: 'มะนาว', any: ['id:lime'], amt: 2, optional: true, seasoning: true }, { label: 'เห็ด', any: ['tag:mushroom'], amt: 1, optional: true }] },
  { id: 'r_clear_soup', name: 'แกงจืด', out: 'dish_clear_soup', method: 'boil', station: ['stove'], time: 20, water: 4, slots: [{ label: 'หมูสับ/เนื้อ', any: ['tag:minced', 'tag:meat', 'id:meatballs'], amt: 1 }, { label: 'ผัก', any: ['tag:veg'], amt: 2 }, { label: 'วุ้นเส้น', any: ['id:glass_noodle'], amt: 1, optional: true }, { label: 'ซีอิ๊ว', any: ['id:soy_sauce', 'id:seasoning_powder'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_stir_veg', name: 'ผัดผักรวม', out: 'dish_stir_veg', method: 'fry', station: ['stove'], time: 8, slots: [{ label: 'ผัก', any: ['tag:leafy', 'tag:veg'], amt: 2 }, { label: 'ซอสหอยนางรม', any: ['id:oyster_sauce', 'id:soy_sauce', 'id:fish_sauce'], amt: 1, optional: true, seasoning: true }, { label: 'กระเทียม', any: ['id:garlic'], amt: 1, optional: true, seasoning: true }, { label: 'น้ำมัน', any: ['id:cooking_oil'], amt: 1, optional: true }] },
  { id: 'r_morning_glory', name: 'ผัดผักบุ้งไฟแดง', out: 'dish_stir_veg', method: 'fry', station: ['stove'], time: 6, slots: [{ label: 'ผักบุ้ง', any: ['id:morning_glory'], amt: 2 }, { label: 'พริก/กระเทียม', any: ['id:chili_fresh', 'id:garlic'], amt: 1, optional: true, seasoning: true }, { label: 'เต้าเจี้ยว/ซอส', any: ['id:oyster_sauce', 'id:soy_sauce'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_grill_pork', name: 'หมูย่าง', out: 'dish_grilled_meat', method: 'grill', station: ['stove'], time: 20, slots: [{ label: 'หมู', any: ['tag:pork'], amt: 3 }, { label: 'เครื่องหมัก', any: ['id:soy_sauce', 'id:oyster_sauce', 'id:seasoning_powder'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_grill_chicken', name: 'ไก่ย่าง', out: 'dish_grilled_meat', method: 'grill', station: ['stove'], time: 30, slots: [{ label: 'ไก่', any: ['tag:poultry'], amt: 3 }, { label: 'กระเทียม/ซอส', any: ['id:garlic', 'id:soy_sauce'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_steak', name: 'สเต๊ก', out: 'dish_steak', method: 'fry', station: ['stove'], time: 12, slots: [{ label: 'สเต๊ก', any: ['tag:steak', 'tag:beef'], amt: 2 }, { label: 'เนย/น้ำมัน', any: ['id:butter', 'id:cooking_oil'], amt: 1, optional: true }, { label: 'พริกไทย/เกลือ', any: ['id:pepper_ground', 'id:salt'], amt: 1, optional: true, seasoning: true }, { label: 'มันฝรั่ง', any: ['id:potato'], amt: 1, optional: true }] },
  { id: 'r_fried_fish', name: 'ปลาทอด', out: 'dish_fried_fish', method: 'fry', station: ['stove'], time: 15, slots: [{ label: 'ปลา', any: ['tag:fish'], amt: 2 }, { label: 'น้ำมัน', any: ['id:cooking_oil'], amt: 2, optional: true }] },
  { id: 'r_boiled_egg', name: 'ไข่ต้ม', out: 'dish_boiled_egg', method: 'boil', station: ['stove', 'microwave'], time: 10, water: 1, slots: [{ label: 'ไข่', any: ['tag:egg'], amt: 2 }] },
  { id: 'r_pasta', name: 'พาสต้าซอสมะเขือเทศ', out: 'dish_pasta', method: 'boil', station: ['stove'], time: 18, water: 2, slots: [{ label: 'พาสต้า/เส้น', any: ['id:pasta_500', 'id:rice_noodle_dry'], amt: 2 }, { label: 'ซอสมะเขือเทศ', any: ['id:canned_tomato', 'id:tomato'], amt: 2, optional: true }, { label: 'เนื้อสัตว์', any: ['tag:minced', 'tag:processed', 'id:canned_tuna'], amt: 1, optional: true }] },
  { id: 'r_rice_canned', name: 'ข้าวราดปลากระป๋อง', out: 'dish_rice_canned', method: 'none', station: ['none', 'stove', 'microwave'], time: 4, slots: [{ label: 'ข้าวสวย', any: ['id:dish_rice'], amt: 2 }, { label: 'ปลา/หมูกระป๋อง', any: ['tag:canned'], amt: 2 }] },
  { id: 'r_yum_tuna', name: 'ยำทูน่า', out: 'dish_yum', method: 'none', station: ['none'], time: 8, slots: [{ label: 'ทูน่า/ปลากระป๋อง', any: ['id:canned_tuna', 'id:canned_mackerel', 'id:canned_sardine'], amt: 2 }, { label: 'หอม', any: ['id:shallot', 'id:onion'], amt: 1, optional: true }, { label: 'มะนาว/พริก', any: ['id:lime', 'id:chili_fresh'], amt: 1, optional: true, seasoning: true }, { label: 'ผักสด', any: ['id:cucumber', 'id:tomato', 'tag:leafy'], amt: 1, optional: true }] },
  { id: 'r_somtam', name: 'ส้มตำ', out: 'dish_somtam', method: 'none', station: ['none'], time: 10, slots: [{ label: 'มะละกอดิบ', any: ['id:green_papaya', 'id:cucumber', 'id:carrot'], amt: 2 }, { label: 'มะนาว', any: ['id:lime'], amt: 2, optional: true, seasoning: true }, { label: 'พริก', any: ['id:chili_fresh'], amt: 1, optional: true, seasoning: true }, { label: 'น้ำปลา', any: ['id:fish_sauce'], amt: 1, optional: true, seasoning: true }, { label: 'ถั่ว/กุ้งแห้ง', any: ['id:peanuts', 'id:dried_shrimp'], amt: 1, optional: true }] },
  { id: 'r_oatmeal', name: 'ข้าวโอ๊ตต้ม', out: 'dish_oatmeal', method: 'boil', station: ['stove', 'microwave'], time: 6, water: 1, slots: [{ label: 'ข้าวโอ๊ต', any: ['id:oats_800', 'id:cereal'], amt: 2 }, { label: 'นม', any: ['tag:milk', 'id:evaporated_milk', 'id:condensed_milk'], amt: 1, optional: true }, { label: 'ผลไม้/น้ำผึ้ง', any: ['id:banana', 'id:honey', 'id:dried_mango'], amt: 1, optional: true }] },
  { id: 'r_potato', name: 'มันฝรั่งต้ม', out: 'dish_potato', method: 'boil', station: ['stove', 'microwave'], time: 20, water: 2, slots: [{ label: 'มันฝรั่ง/ฟักทอง', any: ['id:potato', 'id:pumpkin', 'id:corn_cob'], amt: 3 }, { label: 'เนย/เกลือ', any: ['id:butter', 'id:salt'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_fries', name: 'ทอดเฟรนช์ฟรายส์', out: 'dish_fries', method: 'fry', station: ['stove'], time: 12, slots: [{ label: 'มันฝรั่งแช่แข็ง/สด', any: ['id:frozen_fries', 'id:potato'], amt: 2 }, { label: 'น้ำมัน', any: ['id:cooking_oil'], amt: 2 }] },
  { id: 'r_dimsum', name: 'นึ่งติ่มซำ/ซาลาเปา', out: 'dish_dimsum', method: 'steam', station: ['stove', 'microwave'], time: 12, water: 1, slots: [{ label: 'ติ่มซำแช่แข็ง', any: ['id:frozen_dumplings', 'id:frozen_dimsum', 'id:frozen_pork_bun'], amt: 2 }] },
  { id: 'r_ready', name: 'อุ่นอาหารสำเร็จรูป', out: 'dish_ready', method: 'microwave', station: ['microwave', 'stove'], time: 5, slots: [{ label: 'อาหารพร้อมทาน', any: ['tag:ready'], amt: 1 }] },
  { id: 'r_sausage', name: 'ไส้กรอกทอด', out: 'dish_fried_sausage', method: 'fry', station: ['stove'], time: 8, slots: [{ label: 'ไส้กรอก/แฮม', any: ['tag:processed', 'id:canned_sausage'], amt: 2 }, { label: 'ไข่', any: ['tag:egg'], amt: 1, optional: true }] },
  { id: 'r_veg_soup', name: 'ซุปผัก', out: 'dish_veg_soup', method: 'boil', station: ['stove'], time: 25, water: 4, slots: [{ label: 'ผัก', any: ['tag:veg'], amt: 3 }, { label: 'เนื้อสัตว์', any: ['tag:meat', 'tag:poultry'], amt: 1, optional: true }, { label: 'ซุปก้อน/เกลือ', any: ['id:instant_soup', 'id:salt', 'id:seasoning_powder'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_bean_stew', name: 'ถั่วต้มน้ำตาล/สตูว์ถั่ว', out: 'dish_bean_stew', method: 'boil', station: ['stove'], time: 60, water: 3, slots: [{ label: 'ถั่วแห้ง', any: ['tag:beans'], amt: 3 }, { label: 'น้ำตาล/มะเขือเทศ', any: ['id:sugar_1kg', 'id:palm_sugar', 'id:canned_tomato'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_seafood', name: 'ผัดทะเล', out: 'dish_seafood_stirfry', method: 'fry', station: ['stove'], time: 10, slots: [{ label: 'กุ้ง/หมึก', any: ['tag:seafood'], amt: 2 }, { label: 'ผัก', any: ['tag:veg'], amt: 1, optional: true }, { label: 'ซอส', any: ['id:oyster_sauce', 'id:chili_sauce'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_heat_curry', name: 'อุ่นแกงกระป๋อง', out: 'dish_curry', method: 'boil', station: ['stove', 'microwave'], time: 6, slots: [{ label: 'แกงกระป๋อง', any: ['tag:curry', 'id:canned_soup'], amt: 2 }] },
  { id: 'r_roti', name: 'โรตีนมข้น', out: 'dish_roti', method: 'fry', station: ['stove'], time: 8, slots: [{ label: 'โรตี', any: ['id:roti_frozen'], amt: 2 }, { label: 'นมข้นหวาน', any: ['id:condensed_milk'], amt: 1, optional: true }, { label: 'เนย/น้ำมัน', any: ['id:butter', 'id:cooking_oil'], amt: 1, optional: true }] },
  { id: 'r_kluay_buat_chi', name: 'กล้วยบวชชี', out: 'dish_dessert', method: 'boil', station: ['stove'], time: 15, slots: [{ label: 'กล้วย/ฟักทอง', any: ['id:banana', 'id:pumpkin'], amt: 2 }, { label: 'กะทิ', any: ['id:coconut_milk'], amt: 2 }, { label: 'น้ำตาล', any: ['id:sugar_1kg', 'id:palm_sugar'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_mango_sticky', name: 'ข้าวเหนียวมะม่วงทำเอง', out: 'dish_dessert', method: 'steam', station: ['stove'], time: 35, water: 1, slots: [{ label: 'ข้าวเหนียว', any: ['id:rice_sticky_2kg', 'id:dish_sticky_rice'], amt: 2 }, { label: 'มะม่วง', any: ['id:mango'], amt: 1 }, { label: 'กะทิ', any: ['id:coconut_milk'], amt: 2, optional: true }] },
  { id: 'r_khao_tom', name: 'ข้าวต้มกุ้ง/หมู', out: 'dish_jok', method: 'boil', station: ['stove'], time: 20, water: 3, slots: [{ label: 'ข้าวสวย', any: ['id:dish_rice'], amt: 2 }, { label: 'กุ้ง/หมู/ไก่', any: ['tag:seafood', 'tag:pork', 'tag:poultry'], amt: 1 }, { label: 'กระเทียมเจียว', any: ['id:garlic'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_pancake', name: 'แพนเค้ก', out: 'dish_pancake', method: 'fry', station: ['stove'], time: 15, slots: [{ label: 'แป้ง', any: ['id:flour_1kg'], amt: 2 }, { label: 'ไข่', any: ['tag:egg'], amt: 1 }, { label: 'นม', any: ['tag:milk', 'id:uht_milk'], amt: 1, optional: true }, { label: 'น้ำผึ้ง/น้ำตาล', any: ['id:honey', 'id:sugar_1kg', 'id:jam'], amt: 1, optional: true, seasoning: true }] },
  { id: 'r_sandwich', name: 'แซนด์วิช', out: 'dish_sandwich', method: 'none', station: ['none'], time: 3, slots: [{ label: 'ขนมปัง', any: ['id:bread_loaf', 'id:buns'], amt: 2 }, { label: 'ไส้', any: ['id:peanut_butter', 'id:jam', 'id:ham', 'id:cheese_slices', 'id:canned_tuna', 'id:butter'], amt: 1 }] },
  { id: 'r_boiled_veg', name: 'ลวกผัก', out: 'dish_boiled_veg', method: 'boil', station: ['stove', 'microwave'], time: 5, water: 1, slots: [{ label: 'ผัก', any: ['tag:veg'], amt: 2 }] },
];

/* ---------- Appliances, generator & fuel (installable items) ---------- */
defItem('appliance_chest_freezer', 'ตู้แช่แข็งแบบนอน 200 ลิตร (กล่อง)', 'electric', 4, 3, 42, 1, 9500, { installs: 'chest_freezer', rarity: 'uncommon', icon: { k: 'crate', c: '#e9eef2', c2: '#2f63a8' } });
defItem('appliance_large_freezer', 'ตู้แช่แข็งเชิงพาณิชย์ 600 ลิตร (กล่อง)', 'electric', 4, 4, 95, 1, 45000, { installs: 'large_freezer', rarity: 'rare', icon: { k: 'crate', c: '#c9cdd1', c2: '#1f3f6a' } });
defItem('generator_small', 'เครื่องปั่นไฟเบนซิน 2.5 kW', 'electric', 3, 3, 38, 1, 6500, { installs: 'generator', rarity: 'uncommon', icon: { k: 'case', c: '#e07a2a', c2: '#2b2b2b' } });
defItem('gasoline_5l', 'น้ำมันเบนซิน 5 ลิตร (แกลลอน)', 'fuel', 2, 2, 4.2, 2, 200, { fuelL: 5, tags: ['gasoline', 'fuel'], icon: { k: 'jug', c: '#c4202a', c2: '#2b2b2b', b: '#e0b23c' } });
POOLS.hw_misc.push(['gasoline_5l', 3, 2], ['generator_small', 1, 1]);
POOLS.sm_cookware.push(['appliance_chest_freezer', 1, 1]);

Object.assign(FURNITURE, {
  chest_freezer: { name: 'ตู้แช่แข็งแบบนอน 200 ลิตร (−20 °C)', size: [1.3, 0.75, 0.85], slot: 'large', asset: 'prop.chest_freezer', grid: [8, 5], limit: 90, temp: 'freezer', power: 110, hold: 'chest', install: 60, item: 'appliance_chest_freezer' },
  large_freezer: { name: 'ตู้แช่แข็งเชิงพาณิชย์ 600 ลิตร (−20 °C)', size: [2.0, 0.85, 0.9], slot: 'large', asset: 'prop.large_freezer', grid: [12, 7], limit: 250, temp: 'freezer', power: 300, hold: 'large', install: 90, item: 'appliance_large_freezer' },
  generator:     { name: 'เครื่องปั่นไฟ 2.5 kW', size: [0.7, 0.55, 0.6], slot: 'large', asset: 'prop.generator', act: 'generator', capacityW: 2500, tankL: 12, install: 20, item: 'generator_small' },
});
FURNITURE.fridge.hold = 'fridge'; FURNITURE.fridge.sub.hold = 'compartment';
FURNITURE.chiller.hold = 'shop_chiller'; FURNITURE.drink_cooler.hold = 'shop_cooler'; FURNITURE.shop_freezer.hold = 'shop_freezer';
FURNITURE.stove.act = 'cook'; FURNITURE.microwave.act = 'microwave';

/** Home slots for large appliances and the generator (§9.1 furniture slots). */
const HOME_SLOTS = [
  { id: 'L1', kind: 'large', floor: 0, x: -4.45, z: -4.55, rot: 0, name: 'ห้องเก็บของ (มุมใน)' },
  { id: 'L2', kind: 'large', floor: 0, x: -4.45, z: -2.75, rot: 0, name: 'ห้องเก็บของ (กลางห้อง)' },
  { id: 'L3', kind: 'large', floor: 1, x: 4.4, z: -3.4, rot: 2, name: 'ห้องเก็บของชั้นบน' },
  { id: 'G1', kind: 'generator', floor: 0, x: -8.6, z: -2.4, rot: 1, outdoor: true, name: 'ลานข้างบ้าน (ภายนอก — มีเสียง)' },
  { id: 'G2', kind: 'generator', floor: 0, x: -3.2, z: -4.85, rot: 0, name: 'ห้องเก็บของ (ภายใน)' },
];
/** Appliances that can be ordered with delivery before the outbreak (§6.6.1). */
const DELIVERY = {
  supermarket: [['appliance_chest_freezer', 9500], ['appliance_large_freezer', 45000]],
  hardware: [['generator_small', 6500], ['appliance_chest_freezer', 9900]],
  fee: 600, delayMin: 180,
};
/** Appliance loads in watts for the load-management panel. */
const LOADS = { lights: 160, fan: 45 };
