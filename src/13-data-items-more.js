/* ==========================================================================
   13 · ITEM DATABASE (continued) — Phase 1B catalogue expansion.
   Prices follow Appendix A anchors (THB, ~2026). All values are tunable.
   per = [kcal, protein g, carb g, fat g, micro (vitamin/mineral units), satiety, water]
   ========================================================================== */

/* Compact row helpers: F = food, D = drink */
const F = (id, name, w, h, kg, stack, price, portions, per, life, tags, icon, extra) => defFood(id, name, w, h, kg, stack, price, portions, per, life, Object.assign({ tags, icon }, extra || {}));
const D = (id, name, w, h, kg, stack, price, portions, per, life, tags, icon, extra) => defDrink(id, name, w, h, kg, stack, price, portions, per, life, Object.assign({ tags, icon }, extra || {}));
const ic = (k, c, c2, b) => ({ k, c, c2, b });

/* ---------- Dry staples ---------- */
F('rice_brown_1kg', 'ข้าวกล้อง 1 กก.', 1, 2, 1.0, 4, 75, 10, [350, 8, 72, 3, 3, 24], L.dry, ['staple', 'rice'], ic('sack', '#c9a46a', '#6b4a2a', '#3a7a3a'));
F('flour_1kg', 'แป้งสาลีอเนกประสงค์ 1 กก.', 1, 2, 1.0, 4, 42, 10, [364, 10, 76, 1, 1, 14], L.dry, ['staple', 'flour'], ic('sack', '#f6f3ea', '#c43c2c', '#2f63a8'));
F('pasta_500', 'พาสต้าเส้นสปาเกตตี 500 ก.', 2, 1, 0.5, 6, 59, 5, [355, 12, 72, 1.5, 1, 18], L.dry, ['staple', 'noodle', 'pasta'], ic('box', '#2f63a8', '#f2c230', '#ffffff'));
F('rice_noodle_dry', 'เส้นเล็กอบแห้ง 400 ก.', 2, 1, 0.4, 6, 32, 4, [360, 6, 82, 0.5, 0.5, 18], L.dry, ['staple', 'noodle', 'rice_noodle'], ic('pack', '#f2efe6', '#c43c2c', '#ffffff'));
F('glass_noodle', 'วุ้นเส้น 250 ก.', 1, 1, 0.25, 8, 28, 5, [175, 0.1, 43, 0, 0.5, 8], L.dry, ['staple', 'noodle'], ic('pack', '#e9eef2', '#2f63a8', '#ffffff'));
F('oats_800', 'ข้าวโอ๊ตบด 800 ก.', 1, 2, 0.8, 4, 129, 16, [190, 7, 32, 3.5, 3, 16], L.dry, ['staple', 'breakfast'], ic('box', '#d8b97a', '#3a7a3a', '#ffffff'));
F('mung_beans', 'ถั่วเขียว 500 ก.', 1, 1, 0.5, 6, 35, 10, [170, 12, 30, 0.6, 3, 12], L.dry, ['staple', 'beans', 'protein'], ic('pack', '#5f8a3a', '#f2efe6', '#3a7a3a'));
F('red_beans', 'ถั่วแดง 500 ก.', 1, 1, 0.5, 6, 45, 10, [165, 11, 30, 0.5, 3, 12], L.dry, ['staple', 'beans', 'protein'], ic('pack', '#8a2f2a', '#f2efe6', '#c43c2c'));
F('lentils', 'ถั่วเลนทิล 500 ก.', 1, 1, 0.5, 6, 79, 10, [175, 13, 30, 0.5, 3, 13], L.dry, ['staple', 'beans', 'protein'], ic('pack', '#c9733a', '#f2efe6', '#2f63a8'));
F('dried_chili', 'พริกแห้ง 100 ก.', 1, 1, 0.1, 10, 35, 20, [15, 0.6, 2.5, 0.3, 1, 0], L.dry, ['spice', 'chili'], ic('pack', '#c4202a', '#7a1a12', '#ffffff'));
F('dried_shiitake', 'เห็ดหอมแห้ง 100 ก.', 1, 1, 0.1, 10, 89, 10, [30, 1, 7, 0.1, 2, 2], L.dry, ['veg', 'mushroom'], ic('pack', '#7a5a3a', '#3a2a1a', '#ffffff'));
F('dried_fish', 'ปลาเค็มตากแห้ง 250 ก.', 2, 1, 0.25, 6, 85, 5, [95, 18, 0, 2, 2, 7], { shelf: 120, opened: { ambientH: 24 * 14, fridgeD: 60 } }, ['protein', 'fish', 'salty'], ic('tray', '#c9a46a', '#8a6a3a', '#3a7a3a'));
F('dried_shrimp', 'กุ้งแห้ง 100 ก.', 1, 1, 0.1, 10, 79, 10, [30, 6, 0, 0.3, 1.5, 2], { shelf: 120, opened: { ambientH: 24 * 30, fridgeD: 90 } }, ['protein', 'seafood', 'salty'], ic('pack', '#e88a5a', '#c43c2c', '#ffffff'));
F('sesame', 'งาขาว 100 ก.', 1, 1, 0.1, 10, 25, 10, [57, 1.8, 2.3, 5, 2, 2], L.dry, ['spice'], ic('pack', '#f2e6c8', '#3a7a3a', '#ffffff'));
F('peanuts', 'ถั่วลิสงคั่ว 200 ก.', 1, 1, 0.2, 10, 39, 8, [145, 6.5, 4, 12, 2, 6], L.snack, ['snack', 'protein', 'nuts'], ic('pack', '#c9a46a', '#c43c2c', '#ffffff'));
F('cashews', 'เม็ดมะม่วงหิมพานต์ 200 ก.', 1, 1, 0.2, 10, 159, 8, [140, 4.5, 8, 11, 2, 6], L.snack, ['snack', 'protein', 'nuts'], ic('jar', '#e9d8b0', '#7a4a2a', '#f2c230'));

/* ---------- Canned & jarred ---------- */
F('canned_bamboo', 'หน่อไม้กระป๋อง', 1, 1, 0.54, 12, 35, 3, [25, 2, 4, 0.3, 1.5, 6, 25], L.canned, ['canned', 'veg'], ic('can', '#c9b23a', '#c8ccd0', '#3a7a3a'));
F('canned_mushroom', 'เห็ดฟางกระป๋อง', 1, 1, 0.42, 12, 39, 3, [25, 2.5, 3, 0.3, 1.5, 5, 20], L.canned, ['canned', 'veg', 'mushroom'], ic('can', '#5f4a3a', '#c8ccd0', '#f2efe6'));
F('canned_soup', 'ซุปข้นกระป๋อง', 1, 1, 0.42, 12, 55, 2, [110, 3, 14, 4.5, 1.5, 12, 35], L.canned, ['canned', 'soup'], ic('can', '#c43c2c', '#c8ccd0', '#f2efe6'));
F('canned_chicken_curry', 'แกงเขียวหวานไก่กระป๋อง', 1, 1, 0.4, 12, 49, 2, [190, 10, 6, 14, 1.5, 12, 20], L.canned, ['canned', 'ready', 'protein', 'curry'], ic('can', '#3a7a3a', '#c8ccd0', '#f2efe6'));
F('canned_massaman', 'แกงมัสมั่นกระป๋อง', 1, 1, 0.4, 12, 55, 2, [210, 9, 12, 14, 1.5, 12, 18], L.canned, ['canned', 'ready', 'protein', 'curry'], ic('can', '#a8582a', '#c8ccd0', '#f2c230'));
F('canned_pineapple', 'สับปะรดกระป๋อง', 1, 1, 0.56, 12, 45, 4, [60, 0.4, 15, 0.1, 2, 4, 30], L.canned, ['canned', 'fruit', 'sweet'], ic('can', '#f2c230', '#c8ccd0', '#3a7a3a'));
F('canned_longan', 'ลำไยในน้ำเชื่อมกระป๋อง', 1, 1, 0.56, 12, 49, 4, [75, 0.5, 19, 0.1, 1.5, 4, 30], L.canned, ['canned', 'fruit', 'sweet'], ic('can', '#e8d6a8', '#c8ccd0', '#8a5a2a'));
F('canned_fruit_cocktail', 'ผลไม้รวมกระป๋อง', 1, 1, 0.56, 12, 59, 4, [70, 0.4, 18, 0.1, 2, 4, 30], L.canned, ['canned', 'fruit', 'sweet'], ic('can', '#e05a8a', '#c8ccd0', '#f2c230'));
F('evaporated_milk', 'นมข้นจืด', 1, 1, 0.39, 12, 25, 6, [55, 3, 4, 3, 1, 2, 15], L.canned, ['canned', 'dairy'], ic('can', '#f2f2ec', '#c8ccd0', '#3a7a3a'));
F('jam', 'แยมสตรอว์เบอร์รี', 1, 1, 0.34, 6, 69, 15, [50, 0, 13, 0, 0.2, 1], L.condiment, ['spread', 'sweet'], ic('jar', '#c4202a', '#f2efe6', '#f2efe6'));
F('canned_sausage', 'ไส้กรอกเวียนนากระป๋อง', 1, 1, 0.2, 12, 45, 3, [120, 5, 1.5, 10, 0.5, 6], L.canned, ['canned', 'protein', 'meat'], ic('can', '#e05a3a', '#c8ccd0', '#f2c230'));
F('canned_tomato', 'มะเขือเทศบดกระป๋อง', 1, 1, 0.4, 12, 49, 4, [20, 1, 4, 0.1, 2, 2, 25], L.canned, ['canned', 'veg'], ic('can', '#c4202a', '#c8ccd0', '#3a7a3a'));
F('pickled_mustard', 'ผักกาดดองกระป๋อง', 1, 1, 0.14, 12, 16, 3, [15, 0.5, 3, 0.1, 1, 2, 10], L.canned, ['canned', 'veg', 'salty'], ic('can', '#3a8a3a', '#c8ccd0', '#f2c230'));

/* ---------- Instant & ready ---------- */
F('noodle_tomyum', 'บะหมี่กึ่งฯ รสต้มยำ (ซอง)', 1, 1, 0.06, 10, 7, 4, [85, 2, 11, 3.5, 0.5, 6], L.instant, ['instant', 'noodle'], ic('pack', '#c4202a', '#f2c230', '#ffffff'), { parts: ['noodle_block', 'seasoning_sachet'] });
F('noodle_pork', 'บะหมี่กึ่งฯ รสหมูสับ (ซอง)', 1, 1, 0.06, 10, 7, 4, [85, 2, 11, 3.5, 0.5, 6], L.instant, ['instant', 'noodle'], ic('pack', '#f2c230', '#c4202a', '#ffffff'), { parts: ['noodle_block', 'seasoning_sachet'] });
F('rice_vermicelli_cup', 'เส้นหมี่กึ่งสำเร็จรูป (ถ้วย)', 1, 1, 0.06, 6, 20, 3, [80, 1.5, 15, 1.5, 0.5, 6], L.instant, ['instant', 'noodle'], ic('cup', '#f0efe8', '#3a7a3a', '#f2c230'));
F('instant_soup', 'ซุปกึ่งสำเร็จรูป (ซอง)', 1, 1, 0.02, 20, 15, 1, [60, 1, 10, 1.5, 0.5, 5], L.instant, ['instant', 'soup'], ic('pack', '#e0b23c', '#7a4a2a', '#ffffff'));
F('instant_rice_cup', 'ข้าวกึ่งสำเร็จรูป (ถ้วย)', 1, 1, 0.1, 6, 45, 2, [180, 3.5, 36, 2.5, 0.5, 12], L.instant, ['instant', 'rice', 'ready'], ic('cup', '#f6f1e2', '#c4202a', '#3a7a3a'));
F('ready_meal_basil', 'ข้าวกะเพราไก่แช่แข็ง (กล่อง)', 1, 1, 0.25, 6, 49, 2, [210, 10, 28, 6, 1, 12, 8], L.frozen, ['frozen', 'ready', 'rice', 'protein'], ic('frozen', '#e9eef5', '#3a7a3a', '#c4202a'));
F('ready_meal_green_curry', 'ข้าวแกงเขียวหวานแช่แข็ง', 1, 1, 0.25, 6, 49, 2, [230, 9, 28, 9, 1, 12, 8], L.frozen, ['frozen', 'ready', 'rice', 'curry'], ic('frozen', '#e9eef5', '#5f8a3a', '#f2efe6'));
F('protein_bar', 'โปรตีนบาร์', 1, 1, 0.06, 20, 69, 1, [210, 20, 22, 7, 3, 9], L.snack, ['snack', 'protein'], ic('bar', '#2b2b2b', '#c43c2c', '#f2c230'));
F('cereal', 'ซีเรียลอาหารเช้า 300 ก.', 1, 2, 0.3, 4, 99, 10, [115, 2, 25, 1, 3, 6], L.snack, ['breakfast', 'carb'], ic('box', '#e0b23c', '#c4202a', '#ffffff'));
F('crackers_rice', 'ข้าวเกรียบกุ้ง', 1, 2, 0.08, 8, 20, 3, [120, 1, 16, 6, 0.5, 4], L.snack, ['snack'], ic('pillow', '#f2c230', '#e05a3a', '#ffffff'));

/* ---------- Fresh meat & seafood ---------- */
F('pork_belly', 'หมูสามชั้น 500 ก.', 2, 1, 0.5, 4, 110, 4, [260, 11, 0, 24, 0.5, 9, 4], L.freshMeat, ['meat', 'pork', 'protein', 'raw'], ic('tray', '#e8a0a0', '#ffffff', '#c94b4b'));
F('pork_minced', 'หมูสับ 500 ก.', 1, 1, 0.5, 4, 90, 4, [160, 15, 0, 11, 0.5, 9, 4], L.freshMeat, ['meat', 'pork', 'minced', 'protein', 'raw'], ic('tray', '#e88a8a', '#ffffff', '#c94b4b'));
F('chicken_thigh', 'สะโพกไก่ 1 กก.', 2, 1, 1.0, 4, 95, 8, [180, 18, 0, 12, 0.5, 9, 6], L.freshMeat, ['meat', 'poultry', 'protein', 'raw'], ic('tray', '#f2c2b0', '#ffffff', '#e0b23c'));
F('chicken_whole', 'ไก่ทั้งตัว (~1.5 กก.)', 2, 2, 1.5, 2, 150, 10, [210, 20, 0, 14, 0.5, 10, 6], L.freshMeat, ['meat', 'poultry', 'protein', 'raw', 'large'], ic('round', '#f2d0b8', '#e8b08a', '#e0b23c'));
F('chicken_wings', 'ปีกไก่ 500 ก.', 1, 1, 0.5, 4, 75, 4, [200, 17, 0, 14, 0.5, 8, 4], L.freshMeat, ['meat', 'poultry', 'protein', 'raw'], ic('tray', '#f2c2b0', '#ffffff', '#c43c2c'));
F('beef_minced', 'เนื้อวัวบด 500 ก.', 1, 1, 0.5, 4, 180, 4, [250, 22, 0, 18, 1, 10, 4], L.freshMeat, ['meat', 'beef', 'minced', 'protein', 'raw'], ic('tray', '#a8343a', '#ffffff', '#2b2b2b'));
F('beef_ribeye', 'สเต๊กริบอาย (~300 ก.)', 1, 1, 0.3, 4, 390, 2, [380, 30, 0, 29, 1, 13, 5], L.freshMeat, ['meat', 'beef', 'protein', 'raw', 'steak'], ic('tray', '#9a2a32', '#ffffff', '#f2c230'), { rarity: 'uncommon' });
F('pork_chop', 'หมูสันนอกหั่นชิ้น 500 ก.', 2, 1, 0.5, 4, 100, 4, [170, 22, 0, 9, 0.5, 10, 4], L.freshMeat, ['meat', 'pork', 'protein', 'raw', 'steak'], ic('tray', '#efa8a0', '#ffffff', '#c94b4b'));
F('sausage_fresh', 'ไส้กรอกหมูรมควัน (แพ็ก)', 1, 1, 0.5, 4, 89, 5, [170, 7, 2, 15, 0.5, 8], { shelf: 21, store: 'fridge', opened: { ambientH: 8, fridgeD: 5 }, freeze: 'good' }, ['meat', 'pork', 'protein', 'processed'], ic('tray', '#c9643a', '#ffffff', '#f2c230'));
F('ham', 'แฮมสไลซ์ 200 ก.', 1, 1, 0.2, 6, 75, 4, [60, 8, 1, 2.5, 0.5, 4], { shelf: 20, store: 'fridge', opened: { ambientH: 6, fridgeD: 4 }, freeze: 'good' }, ['meat', 'pork', 'protein', 'processed'], ic('tray', '#f2a8b0', '#ffffff', '#2f63a8'));
F('bacon', 'เบคอน 200 ก.', 1, 1, 0.2, 6, 99, 4, [200, 7, 0.5, 19, 0.5, 5], { shelf: 21, store: 'fridge', opened: { ambientH: 6, fridgeD: 5 }, freeze: 'good' }, ['meat', 'pork', 'protein', 'processed'], ic('tray', '#c9643a', '#ffffff', '#c43c2c'));
F('meatballs', 'ลูกชิ้นหมู 500 ก.', 1, 1, 0.5, 4, 69, 5, [110, 9, 6, 6, 0.5, 6], { shelf: 7, store: 'fridge', opened: { ambientH: 6, fridgeD: 3 }, freeze: 'good' }, ['meat', 'pork', 'protein', 'processed'], ic('tray', '#d8c0a8', '#ffffff', '#3a7a3a'));
F('fish_tilapia', 'ปลานิลสด (ตัว ~700 ก.)', 2, 1, 0.7, 4, 75, 4, [110, 20, 0, 3, 1, 9, 5], L.freshMeat, ['fish', 'protein', 'raw', 'seafood'], ic('tray', '#8a9aa8', '#ffffff', '#2f63a8'));
F('fish_mackerel_fresh', 'ปลาทูสด (เข่ง)', 1, 1, 0.4, 6, 60, 4, [110, 12, 0, 7, 1.5, 7, 4], { shelf: 2, store: 'fridge', opened: { ambientH: 5, fridgeD: 2 }, freeze: 'good' }, ['fish', 'protein', 'raw', 'seafood'], ic('tray', '#7a8a98', '#c9a46a', '#3a7a3a'));
F('shrimp_500', 'กุ้งขาว 500 ก.', 1, 1, 0.5, 4, 260, 4, [60, 12, 0, 1, 1.5, 6, 6], { shelf: 2, store: 'fridge', opened: { ambientH: 4, fridgeD: 2 }, freeze: 'good' }, ['seafood', 'protein', 'raw'], ic('tray', '#e8a088', '#ffffff', '#2f63a8'));
F('squid', 'ปลาหมึกกล้วย 500 ก.', 1, 1, 0.5, 4, 180, 4, [70, 13, 2, 1, 1, 6, 6], { shelf: 2, store: 'fridge', opened: { ambientH: 4, fridgeD: 2 }, freeze: 'good' }, ['seafood', 'protein', 'raw'], ic('tray', '#f2e6dc', '#ffffff', '#c43c2c'));
F('eggs_tray30', 'ไข่ไก่ (แผง 30 ฟอง)', 2, 2, 1.9, 2, 135, 30, [72, 6, 0.4, 5, 1, 5], L.egg, ['protein', 'egg', 'fresh', 'tray'], ic('crate', '#e9d8b8', '#f2dcb8'));
F('duck_egg', 'ไข่เป็ด (ฟอง)', 1, 1, 0.07, 20, 6, 1, [130, 9, 1, 10, 1, 6], L.egg, ['protein', 'egg', 'fresh'], ic('egg', '#e9e6dc', '#d8d2c4'));
F('salted_egg', 'ไข่เค็ม (ฟอง)', 1, 1, 0.07, 20, 10, 1, [140, 10, 1, 10, 1, 6], { shelf: 30, opened: { ambientH: 12, fridgeD: 3 }, freeze: 'no' }, ['protein', 'egg', 'salty'], ic('egg', '#e8e2d8', '#c9733a'));

/* ---------- Frozen ---------- */
F('frozen_fish_fillet', 'ปลาแพนกาเซียสแล่แช่แข็ง (~250 ก.)', 1, 1, 0.25, 6, 99, 2, [90, 15, 0, 3, 1, 8, 4], L.frozen, ['frozen', 'fish', 'protein', 'raw'], ic('frozen', '#e9eef5', '#f2efe6', '#2f63a8'));
F('frozen_shrimp', 'กุ้งแช่แข็ง 500 ก.', 1, 1, 0.5, 6, 229, 4, [60, 12, 0, 1, 1.5, 6, 5], L.frozen, ['frozen', 'seafood', 'protein', 'raw'], ic('frozen', '#e9eef5', '#e8a088', '#c43c2c'));
F('frozen_fries', 'เฟรนช์ฟรายส์แช่แข็ง 1 กก.', 2, 1, 1.0, 4, 129, 8, [150, 2, 22, 6, 1, 7], L.frozen, ['frozen', 'carb'], ic('frozen', '#e9eef5', '#f2c230', '#c43c2c'));
F('frozen_veg_mix', 'ผักรวมแช่แข็ง 500 ก.', 1, 1, 0.5, 6, 59, 5, [40, 2, 7, 0.3, 4, 5, 15], L.frozen, ['frozen', 'veg'], ic('frozen', '#e9eef5', '#5f8a3a', '#f2c230'));
F('frozen_dimsum', 'ขนมจีบแช่แข็ง (กล่อง)', 1, 1, 0.3, 6, 79, 3, [140, 7, 12, 7, 0.5, 8], L.frozen, ['frozen', 'ready', 'protein'], ic('frozen', '#e9eef5', '#f2c230', '#c43c2c'));
F('frozen_pork_bun', 'ซาลาเปาไส้หมูแช่แข็ง (6 ลูก)', 1, 1, 0.5, 6, 89, 6, [180, 6, 28, 5, 0.5, 10], L.frozen, ['frozen', 'bakery', 'ready'], ic('frozen', '#e9eef5', '#f6f1e2', '#c43c2c'));
F('frozen_chicken_nuggets', 'นักเก็ตไก่แช่แข็ง 500 ก.', 1, 1, 0.5, 6, 119, 5, [200, 11, 12, 12, 0.5, 8], L.frozen, ['frozen', 'protein', 'processed'], ic('frozen', '#e9eef5', '#e0b23c', '#c43c2c'));
F('ice_pop', 'ไอติมแท่ง', 1, 1, 0.07, 10, 15, 1, [80, 0.5, 18, 1, 0.2, 2, 10], L.frozen, ['frozen', 'sweet'], ic('bar', '#e05a8a', '#f2efe6', '#f2efe6'));

/* ---------- Fresh vegetables, herbs & fruit ---------- */
F('chinese_kale', 'ผักคะน้า (กำ)', 1, 2, 0.3, 6, 20, 2, [25, 2.5, 4, 0.3, 5, 5, 30], L.veg, ['veg', 'leafy', 'fresh'], ic('greens', '#2f6a2a', '#7fb35a', '#c43c2c'));
F('cucumber', 'แตงกวา (ถุง)', 1, 1, 0.5, 6, 20, 4, [8, 0.3, 2, 0, 1, 3, 45], L.veg, ['veg', 'fresh'], ic('round', '#3a7a3a', '#9ccf6a', '#3a7a3a'));
F('chili_fresh', 'พริกขี้หนูสด 100 ก.', 1, 1, 0.1, 10, 15, 10, [4, 0.2, 0.9, 0, 1, 0, 3], L.veg, ['veg', 'herb', 'chili', 'fresh'], ic('pack', '#c4202a', '#3a7a3a', '#ffffff'));
F('thai_basil', 'ใบกะเพรา (กำ)', 1, 1, 0.08, 10, 10, 4, [3, 0.3, 0.3, 0, 1.5, 0, 3], L.veg, ['veg', 'herb', 'fresh'], ic('greens', '#2f5a2a', '#5f8a3a', '#c43c2c'));
F('lemongrass', 'ตะไคร้ (มัด)', 1, 2, 0.2, 10, 10, 6, [10, 0.2, 2, 0, 0.5, 1, 2], L.hardVeg, ['veg', 'herb', 'fresh'], ic('greens', '#9ccf6a', '#e9e6c8', '#c43c2c'));
F('galangal', 'ข่า 200 ก.', 1, 1, 0.2, 10, 15, 8, [8, 0.2, 1.5, 0, 0.5, 1, 2], L.hardVeg, ['veg', 'herb', 'fresh'], ic('round', '#e9d8b8', '#c9a46a', '#e05a8a'));
F('garlic', 'กระเทียมไทย 500 ก.', 1, 1, 0.5, 6, 60, 25, [15, 0.6, 3.3, 0, 1, 0, 1], { shelf: 60, opened: { ambientH: 24 * 30, fridgeD: 60 }, freeze: 'texture' }, ['veg', 'herb', 'spice'], ic('round', '#f2efe6', '#c9a46a', '#e05a8a'));
F('shallot', 'หอมแดง 500 ก.', 1, 1, 0.5, 6, 45, 20, [18, 0.6, 4, 0, 1, 1, 3], { shelf: 45, opened: { ambientH: 24 * 20, fridgeD: 40 }, freeze: 'texture' }, ['veg', 'herb'], ic('round', '#a84a5a', '#e8a0a8', '#3a7a3a'));
F('onion', 'หัวหอมใหญ่ 1 กก.', 1, 1, 1.0, 4, 45, 8, [40, 1, 9, 0.1, 1, 3, 10], { shelf: 30, opened: { ambientH: 48, fridgeD: 7 }, freeze: 'texture' }, ['veg', 'fresh'], ic('round', '#e0b07a', '#f2e6c8', '#c9a46a'));
F('potato', 'มันฝรั่ง 1 กก.', 2, 1, 1.0, 4, 55, 6, [130, 3.5, 30, 0.2, 3, 10, 15], L.hardVeg, ['veg', 'carb', 'fresh'], ic('round', '#c9a46a', '#e9d8b0', '#7a5a3a'));
F('carrot', 'แครอท 500 ก.', 1, 1, 0.5, 6, 30, 5, [40, 1, 9, 0.2, 5, 4, 20], L.hardVeg, ['veg', 'fresh'], ic('greens', '#e57a2e', '#5f8a3a', '#c43c2c'));
F('pumpkin', 'ฟักทอง (ลูก ~2 กก.)', 2, 2, 2.0, 2, 50, 10, [50, 1.5, 12, 0.2, 5, 5, 25], { shelf: 45, opened: { ambientH: 48, fridgeD: 6 }, freeze: 'texture' }, ['veg', 'carb', 'fresh'], ic('round', '#5f7a3a', '#e5a03a', '#3a5a2a'));
F('long_beans', 'ถั่วฝักยาว (กำ)', 1, 2, 0.25, 6, 20, 3, [25, 2, 4, 0.1, 3, 4, 20], L.veg, ['veg', 'fresh'], ic('greens', '#4f8a3a', '#7fb35a', '#c43c2c'));
F('eggplant', 'มะเขือเปราะ (ถุง)', 1, 1, 0.4, 6, 25, 4, [15, 0.8, 3, 0.1, 2, 3, 25], L.veg, ['veg', 'fresh'], ic('round', '#7fb35a', '#f2f2e6', '#3a7a3a'));
F('mushroom_oyster', 'เห็ดนางฟ้า 250 ก.', 1, 1, 0.25, 6, 30, 3, [20, 2.5, 3, 0.3, 2, 3, 20], L.veg, ['veg', 'mushroom', 'fresh'], ic('round', '#d8cfc0', '#a8988a', '#5f4a3a'));
F('corn_cob', 'ข้าวโพดหวาน (ฝัก)', 1, 2, 0.35, 6, 15, 2, [90, 3, 19, 1.2, 2, 6, 20], L.veg, ['veg', 'carb', 'fresh'], ic('greens', '#f2cf3a', '#7fb35a', '#3a7a3a'));
F('lime', 'มะนาว (ถุง 10 ลูก)', 1, 1, 0.4, 6, 40, 10, [6, 0.1, 2, 0, 1.5, 0, 5], L.hardVeg, ['fruit', 'herb', 'sour'], ic('round', '#5f9a3a', '#9ccf6a', '#3a7a3a'));
F('kaffir_lime_leaf', 'ใบมะกรูด (ถุง)', 1, 1, 0.03, 10, 10, 10, [1, 0, 0.2, 0, 0.5, 0, 0], L.veg, ['herb', 'fresh'], ic('greens', '#2f5a2a', '#5f8a3a', '#3a7a3a'));
F('papaya', 'มะละกอสุก (ลูก)', 2, 1, 1.2, 4, 40, 6, [55, 0.6, 14, 0.2, 5, 5, 40], L.fruit, ['fruit', 'fresh'], ic('round', '#e5913a', '#7fb35a', '#3a7a3a'));
F('green_papaya', 'มะละกอดิบ (ส้มตำ)', 2, 1, 1.0, 4, 25, 6, [35, 0.5, 9, 0.1, 4, 4, 40], L.hardVeg, ['veg', 'fresh'], ic('round', '#5f9a3a', '#9ccf6a', '#3a7a3a'));
F('watermelon', 'แตงโม (ลูก ~3 กก.)', 2, 2, 3.0, 2, 60, 12, [45, 0.9, 11, 0.2, 2, 4, 60], { shelf: 10, opened: { ambientH: 12, fridgeD: 3 }, freeze: 'texture' }, ['fruit', 'fresh'], ic('round', '#3a7a3a', '#5f9a3a', '#c4202a'));
F('pineapple', 'สับปะรด (ลูก)', 1, 2, 1.3, 4, 35, 6, [50, 0.5, 13, 0.1, 4, 4, 40], { shelf: 7, opened: { ambientH: 12, fridgeD: 4 }, freeze: 'good' }, ['fruit', 'fresh'], ic('greens', '#d8a23a', '#3a7a3a', '#3a7a3a'));
F('rambutan', 'เงาะ (กิโล)', 1, 1, 1.0, 4, 50, 6, [75, 0.6, 19, 0.2, 3, 4, 30], L.fruit, ['fruit', 'fresh'], ic('round', '#c4202a', '#3a7a3a', '#c4202a'));
F('apple', 'แอปเปิล (ถุง 4 ลูก)', 1, 1, 0.8, 6, 79, 4, [95, 0.5, 25, 0.3, 3, 6, 40], { shelf: 21, opened: { ambientH: 8, fridgeD: 2 }, freeze: 'texture' }, ['fruit', 'fresh'], ic('round', '#c4202a', '#e05a3a', '#5f4a3a'));
F('orange', 'ส้มสายน้ำผึ้ง (กิโล)', 1, 1, 1.0, 4, 70, 6, [60, 1, 15, 0.2, 5, 5, 40], { shelf: 14, opened: { ambientH: 8, fridgeD: 2 }, freeze: 'texture' }, ['fruit', 'fresh'], ic('round', '#f2a52a', '#f2c23a', '#3a7a3a'));
F('guava', 'ฝรั่ง (กิโล)', 1, 1, 1.0, 4, 45, 5, [70, 2.5, 14, 1, 6, 6, 35], L.fruit, ['fruit', 'fresh'], ic('round', '#7fb35a', '#c9e5a0', '#3a7a3a'));

/* ---------- Dairy & bakery ---------- */
F('fresh_milk', 'นมสดพาสเจอร์ไรส์ 2 ลิตร', 1, 2, 2.05, 4, 89, 8, [125, 6.5, 10, 7, 2, 5, 20], L.dairy, ['dairy', 'milk'], ic('jug', '#f6f6f2', '#2b7fc4', '#2b7fc4'));
F('yogurt', 'โยเกิร์ต (ถ้วย)', 1, 1, 0.14, 12, 18, 1, [100, 5, 15, 2.5, 1.5, 5, 8], L.dairy, ['dairy'], ic('cup', '#f6f6f2', '#e05a8a', '#f2c230'));
F('cheese_slices', 'ชีสแผ่น 200 ก.', 1, 1, 0.2, 6, 89, 10, [60, 3.5, 1, 4.5, 1, 3], { shelf: 120, store: 'fridge', opened: { ambientH: 8, fridgeD: 21 }, freeze: 'good' }, ['dairy', 'protein'], ic('box', '#f2c230', '#e0b23c', '#c43c2c'));
F('butter', 'เนยจืด 227 ก.', 1, 1, 0.23, 6, 119, 20, [80, 0.1, 0, 9, 0.2, 1], { shelf: 90, store: 'fridge', opened: { ambientH: 24 * 3, fridgeD: 30 }, freeze: 'good' }, ['dairy', 'fat'], ic('box', '#f6efc8', '#2f63a8', '#e0b23c'));
F('buns', 'ขนมปังบัน (แพ็ก 6)', 2, 1, 0.3, 4, 35, 6, [120, 4, 22, 2, 0.5, 6], L.bread, ['bakery', 'carb'], ic('loaf', '#d9a35a', '#f2e1bd', '#ffffff'));
F('cake_slice', 'เค้กช็อกโกแลต (ชิ้น)', 1, 1, 0.12, 4, 65, 1, [380, 5, 48, 19, 1, 6], { shelf: 3, store: 'fridge', opened: { ambientH: 10, fridgeD: 3 }, freeze: 'good' }, ['bakery', 'sweet', 'dessert'], ic('box', '#5a3220', '#f2e1bd', '#e05a8a'));
F('croissant', 'ครัวซองต์ (แพ็ก 2)', 1, 1, 0.12, 6, 49, 2, [230, 4.5, 26, 12, 0.5, 6], L.bread, ['bakery', 'carb'], ic('loaf', '#e0a050', '#f2d08a', '#ffffff'));
F('roti_frozen', 'โรตีแช่แข็ง (แพ็ก 5)', 1, 1, 0.4, 6, 79, 5, [200, 4, 28, 8, 0.5, 8], L.frozen, ['frozen', 'bakery', 'carb'], ic('frozen', '#e9eef5', '#e0c08a', '#c43c2c'));

/* ---------- Snacks, sweets & Thai desserts ---------- */
F('cookies', 'คุกกี้ช็อกโกแลตชิพ', 1, 1, 0.15, 10, 45, 5, [140, 1.5, 19, 7, 0.5, 4], L.snack, ['snack', 'sweet'], ic('box', '#7a4a2a', '#e0b23c', '#ffffff'));
F('wafer', 'เวเฟอร์', 1, 1, 0.1, 10, 20, 4, [130, 1.5, 17, 6, 0.3, 3], L.snack, ['snack', 'sweet'], ic('bar', '#e0b23c', '#c43c2c', '#ffffff'));
F('candy', 'ลูกอม (ถุง)', 1, 1, 0.1, 10, 25, 10, [40, 0, 10, 0, 0, 1], L.sweets, ['snack', 'sweet'], ic('pack', '#e05a8a', '#f2c230', '#ffffff'));
F('dried_mango', 'มะม่วงอบแห้ง 200 ก.', 1, 1, 0.2, 10, 89, 5, [130, 1, 31, 0.5, 3, 5], { shelf: 240, opened: { ambientH: 24 * 30, fridgeD: 90 }, freeze: 'good' }, ['snack', 'fruit', 'sweet'], ic('pack', '#f2b33a', '#e57a2e', '#ffffff'));
F('seaweed_snack', 'สาหร่ายทอดกรอบ', 1, 1, 0.04, 10, 35, 2, [80, 2, 6, 5, 2, 2], L.snack, ['snack'], ic('pack', '#2b4a2a', '#f2c230', '#ffffff'));
F('khanom_chan', 'ขนมชั้น (กล่อง)', 1, 1, 0.25, 4, 40, 4, [110, 0.5, 22, 2.5, 0.2, 5], { shelf: 1.5, opened: { ambientH: 18, fridgeD: 3 }, freeze: 'no' }, ['dessert', 'sweet', 'thai'], ic('box', '#5fa06a', '#f2efe6', '#e05a8a'));
F('mango_sticky_rice', 'ข้าวเหนียวมะม่วง (กล่อง)', 1, 1, 0.3, 4, 80, 2, [270, 3, 50, 7, 2, 10, 5], { shelf: 0.6, opened: { ambientH: 8, fridgeD: 2 }, freeze: 'texture' }, ['dessert', 'sweet', 'thai', 'rice'], ic('box', '#f2b33a', '#f6f1e2', '#3a7a3a'));
F('thong_yod', 'ทองหยอด (กล่อง)', 1, 1, 0.2, 4, 60, 4, [90, 2, 16, 2.5, 0.5, 3], { shelf: 3, opened: { ambientH: 24, fridgeD: 5 }, freeze: 'good' }, ['dessert', 'sweet', 'thai'], ic('box', '#f2c230', '#e0a020', '#c43c2c'));
F('khanom_krok', 'ขนมครก (กล่อง)', 1, 1, 0.2, 4, 30, 3, [120, 1.5, 15, 6, 0.3, 4], { shelf: 0.5, opened: { ambientH: 8, fridgeD: 2 }, freeze: 'no' }, ['dessert', 'sweet', 'thai'], ic('box', '#f2efe6', '#c9a46a', '#3a7a3a'));
F('bua_loy_cup', 'บัวลอยน้ำกะทิ (ถ้วย)', 1, 1, 0.25, 4, 25, 2, [140, 1.5, 18, 7, 0.3, 6, 10], { shelf: 0.5, opened: { ambientH: 6, fridgeD: 2 }, freeze: 'no' }, ['dessert', 'sweet', 'thai'], ic('cup', '#f6f1e2', '#e05a8a', '#3a7a3a'));

/* ---------- Condiments & cooking basics ---------- */
F('soy_sauce', 'ซีอิ๊วขาว', 1, 2, 0.7, 4, 32, 50, [5, 0.6, 0.6, 0, 0.2, 0], L.condiment, ['condiment', 'sauce'], ic('bottle', '#3a2014', '#3a7a3a', '#f2efe6'));
F('oyster_sauce', 'ซอสหอยนางรม', 1, 2, 0.8, 4, 45, 40, [9, 0.2, 2, 0, 0.2, 0], L.condiment, ['condiment', 'sauce'], ic('bottle', '#2b1a12', '#c43c2c', '#f2c230'));
F('chili_sauce', 'ซอสพริก', 1, 2, 0.7, 4, 35, 40, [12, 0.1, 3, 0, 0.2, 0], L.condiment, ['condiment', 'sauce'], ic('bottle', '#c4202a', '#3a7a3a', '#f2efe6'));
F('vinegar', 'น้ำส้มสายชู', 1, 2, 0.75, 4, 18, 50, [1, 0, 0, 0, 0, 0], L.condiment, ['condiment'], ic('bottle', '#f2f2e6', '#3a7a3a', '#c43c2c'));
F('seasoning_powder', 'ผงปรุงรส 400 ก.', 1, 1, 0.4, 6, 49, 80, [5, 0.3, 0.5, 0.1, 0.1, 0], L.condiment, ['condiment', 'spice'], ic('pack', '#c4202a', '#f2c230', '#ffffff'));
F('curry_paste_green', 'พริกแกงเขียวหวาน 100 ก.', 1, 1, 0.1, 10, 25, 4, [25, 0.8, 3, 1, 1, 0], { shelf: 120, opened: { ambientH: 24 * 3, fridgeD: 30 }, freeze: 'good' }, ['condiment', 'curry_paste'], ic('pack', '#3a7a3a', '#f2efe6', '#c43c2c'));
F('curry_paste_red', 'พริกแกงเผ็ด 100 ก.', 1, 1, 0.1, 10, 25, 4, [25, 0.8, 3, 1, 1, 0], { shelf: 120, opened: { ambientH: 24 * 3, fridgeD: 30 }, freeze: 'good' }, ['condiment', 'curry_paste'], ic('pack', '#c4202a', '#f2efe6', '#3a7a3a'));
F('tomyum_paste', 'น้ำพริกเผาต้มยำ', 1, 1, 0.23, 6, 45, 10, [45, 0.5, 4, 3, 0.5, 0], L.condiment, ['condiment', 'curry_paste'], ic('jar', '#a8342a', '#f2c230', '#f2efe6'));
F('palm_sugar', 'น้ำตาลปี๊บ 500 ก.', 1, 1, 0.5, 6, 45, 25, [75, 0, 19, 0, 0.2, 1], L.dry, ['condiment', 'sweet'], ic('jar', '#c9a46a', '#7a4a2a', '#f2efe6'));
F('pepper_ground', 'พริกไทยป่น 50 ก.', 1, 1, 0.05, 10, 39, 25, [5, 0.2, 1, 0, 0.3, 0], L.dry, ['spice'], ic('smallbottle', '#3a3a3a', '#c43c2c', '#f2efe6'));
F('honey', 'น้ำผึ้ง 500 ก.', 1, 1, 0.5, 6, 159, 25, [64, 0, 17, 0, 0.2, 1], { shelf: 1500, opened: { ambientH: 24 * 365, fridgeD: 999 }, freeze: 'no' }, ['condiment', 'sweet'], ic('jar', '#e5a02a', '#7a4a2a', '#f2efe6'));
F('instant_coffee', 'กาแฟสำเร็จรูป 3in1 (แพ็ก 27)', 1, 1, 0.5, 6, 119, 27, [70, 0.5, 13, 2, 0.2, 1], L.instant, ['drink_mix', 'coffee'], ic('pack', '#5a3220', '#c43c2c', '#f2efe6'));
F('tea_bags', 'ชาซอง (กล่อง 50)', 1, 1, 0.1, 10, 69, 50, [2, 0, 0.3, 0, 0.3, 0], L.dry, ['drink_mix', 'tea'], ic('box', '#3a7a3a', '#c9a46a', '#ffffff'));
F('cocoa_powder', 'โกโก้ผง 400 ก.', 1, 1, 0.4, 6, 129, 20, [80, 2, 13, 2.5, 1, 2], L.dry, ['drink_mix', 'sweet'], ic('jar', '#5a3220', '#e0b23c', '#f2efe6'));

/* ---------- Drinks ---------- */
D('water_350_pack', 'น้ำดื่ม 350 มล. (แพ็ก 12)', 2, 2, 4.4, 2, 55, 12, [0, 0, 0, 0, 0, 1, 18], L.water, ['water', 'clean'], ic('crate', '#bfe3f5', '#2b8ac4'));
D('mineral_water', 'น้ำแร่ 1.5 ลิตร', 1, 2, 1.55, 6, 22, 5, [0, 0, 0, 0, 0.5, 1, 30], L.water, ['water', 'clean'], ic('bottle', '#d0eef8', '#3a8a5a', '#ffffff'));
D('soda_can', 'น้ำอัดลม (กระป๋อง)', 1, 1, 0.34, 12, 15, 1, [140, 0, 35, 0, 0, 2, 30], L.soda, ['soda', 'sweet'], ic('can', '#c4202a', '#c8ccd0', '#ffffff'));
D('lemon_soda', 'น้ำอัดลมรสมะนาว 1.25 ลิตร', 1, 2, 1.3, 6, 32, 5, [100, 0, 25, 0, 0, 2, 22], L.soda, ['soda', 'sweet'], ic('bottle', '#9ccf6a', '#2f7a3a', '#ffffff'));
D('energy_drink', 'เครื่องดื่มชูกำลัง (ขวด)', 1, 1, 0.17, 12, 12, 1, [70, 0, 17, 0, 1, 1, 12], L.soda, ['energy', 'sweet'], ic('smallbottle', '#c9a24a', '#c4202a', '#2b2b2b'));
D('sports_drink', 'เครื่องดื่มเกลือแร่', 1, 2, 0.5, 6, 20, 2, [60, 0, 15, 0, 2, 1, 30], L.soda, ['electrolyte'], ic('bottle', '#4fa3d1', '#2f63a8', '#ffffff'));
D('green_tea_bottle', 'ชาเขียวพร้อมดื่ม', 1, 2, 0.5, 6, 20, 2, [70, 0, 17, 0, 0.5, 1, 30], L.soda, ['tea', 'sweet'], ic('bottle', '#9ccf6a', '#3a7a3a', '#f2efe6'));
D('canned_coffee', 'กาแฟกระป๋อง', 1, 1, 0.19, 12, 18, 1, [90, 1.5, 15, 2.5, 0.2, 2, 15], L.soda, ['coffee'], ic('can', '#5a3220', '#c8ccd0', '#e0b23c'));
D('soy_milk', 'นมถั่วเหลือง UHT (แพ็ก 4)', 1, 1, 1.0, 6, 48, 4, [110, 7, 12, 4, 2, 5, 20], L.uht, ['dairy_alt', 'protein'], ic('carton', '#f2e6c8', '#c9a46a', '#3a7a3a'));
D('chocolate_milk', 'นมรสช็อกโกแลต UHT (แพ็ก 4)', 1, 1, 0.9, 6, 52, 4, [130, 5, 20, 3.5, 1.5, 5, 18], L.uht, ['dairy', 'milk', 'sweet'], ic('carton', '#5a3220', '#f2efe6', '#2b7fc4'));
D('coconut_water', 'น้ำมะพร้าว 1 ลิตร', 1, 2, 1.05, 6, 65, 4, [45, 0.5, 11, 0, 2, 3, 35], L.uht, ['electrolyte', 'juice'], ic('carton', '#f6f6f2', '#5f9a3a', '#c9a46a'));
D('guava_juice', 'น้ำฝรั่ง 1 ลิตร', 1, 2, 1.05, 6, 49, 4, [100, 0.5, 25, 0, 4, 4, 24], L.uht, ['juice', 'sweet'], ic('carton', '#e8a0a8', '#5f9a3a', '#ffffff'));
D('beer_can', 'เบียร์ (กระป๋อง)', 1, 1, 0.35, 12, 45, 1, [145, 1, 11, 0, 0.2, 2, 5], L.soda, ['alcohol'], ic('can', '#e0b23c', '#c8ccd0', '#2f63a8'));
D('rice_whisky', 'เหล้าขาว (ขวด)', 1, 2, 0.7, 4, 120, 10, [100, 0, 0, 0, 0, 0, -10], { shelf: 3650, opened: { ambientH: 24 * 365, fridgeD: 999 }, freeze: 'no' }, ['alcohol', 'disinfect_weak'], ic('bottle', '#e9eef2', '#c4202a', '#f2efe6'));

/* ---------- Medical ---------- */
defItem('ibuprofen', 'ไอบูโพรเฟน (10 เม็ด)', 'medical', 1, 1, 0.02, 10, 35, { uses: 10, tags: ['painkiller', 'fever', 'antiinflam'], icon: ic('blister', '#f2f2f2', '#e57a2e') });
defItem('antibiotic', 'ยาปฏิชีวนะอะม็อกซีซิลลิน (แผง)', 'medical', 1, 1, 0.03, 6, 250, { uses: 10, rarity: 'rare', rx: true, tags: ['antibiotic'], icon: ic('blister', '#f2f2f2', '#c4202a') });
defItem('alcohol_70', 'แอลกอฮอล์ 70% 450 มล.', 'medical', 1, 2, 0.45, 4, 59, { uses: 30, tags: ['antiseptic', 'clean'], icon: ic('bottle', '#e9eef2', '#2f63a8', '#ffffff') });
defItem('saline', 'น้ำเกลือล้างแผล 1 ลิตร', 'medical', 1, 2, 1.05, 4, 45, { uses: 10, tags: ['clean', 'wash'], icon: ic('bottle', '#e9f4f8', '#2b8ac4', '#ffffff') });
defItem('sterile_gauze', 'ผ้าก๊อซปลอดเชื้อ (กล่อง)', 'medical', 1, 1, 0.08, 10, 45, { uses: 6, tags: ['dressing', 'sterile'], icon: ic('box', '#f6f6f6', '#2b8ac4', '#2b8ac4') });
defItem('elastic_bandage', 'ผ้ายืดพันแผล', 'medical', 1, 1, 0.1, 10, 40, { uses: 2, tags: ['bandage', 'splint_wrap'], icon: ic('roll', '#e9d8b8', '#c9a46a') });
defItem('medical_tape', 'เทปปิดแผล', 'medical', 1, 1, 0.03, 10, 25, { uses: 15, tags: ['tape_med'], icon: ic('roll', '#f2f2f2', '#c8ccd0') });
defItem('suture_kit', 'ชุดเย็บแผล', 'medical', 1, 1, 0.1, 4, 350, { uses: 3, rarity: 'uncommon', tags: ['suture'], icon: ic('case', '#2f63a8', '#f2f2f2') });
defItem('tourniquet', 'สายรัดห้ามเลือด', 'medical', 1, 1, 0.08, 4, 290, { rarity: 'uncommon', tags: ['tourniquet'], icon: ic('pouch', '#2b2b2b', '#c4202a') });
defItem('splint', 'เฝือกอ่อนชั่วคราว', 'medical', 1, 2, 0.2, 4, 180, { tags: ['splint'], icon: ic('plank', '#e57a2e', '#c4202a') });
defItem('ors', 'ผงเกลือแร่ ORS (ซอง)', 'medical', 1, 1, 0.02, 20, 8, { uses: 1, tags: ['electrolyte', 'diarrhea'], icon: ic('pack', '#f2f2f2', '#2b8ac4', '#2b8ac4') });
defItem('antidiarrheal', 'ยาแก้ท้องเสีย (ผงถ่าน)', 'medical', 1, 1, 0.02, 10, 30, { uses: 10, tags: ['diarrhea'], icon: ic('blister', '#2b2b2b', '#f2f2f2') });
defItem('thermometer', 'ปรอทวัดไข้ดิจิทัล', 'medical', 1, 1, 0.03, 1, 159, { tags: ['diagnose'], icon: ic('screwdriver', '#f2f2f2', '#2b8ac4') });
defItem('vitamin_c', 'วิตามินซี 1000 มก. (ขวด)', 'medical', 1, 1, 0.1, 6, 290, { uses: 30, tags: ['vitamin'], icon: ic('smallbottle', '#f2a52a', '#f2efe6', '#ffffff') });
defItem('multivitamin', 'วิตามินรวม (ขวด)', 'medical', 1, 1, 0.12, 6, 390, { uses: 30, tags: ['vitamin'], icon: ic('smallbottle', '#c4202a', '#f2efe6', '#ffffff') });
defItem('burn_gel', 'เจลทาแผลไฟไหม้', 'medical', 1, 1, 0.05, 6, 89, { uses: 8, tags: ['burn'], icon: ic('smallbottle', '#9ccf6a', '#f2efe6', '#2b8ac4') });

/* ---------- Tools & hardware ---------- */
defItem('crowbar', 'ชะแลง', 'weapon', 1, 3, 1.6, 1, 290, { tags: ['blunt', 'pry', 'tool'], dura: 300, icon: ic('bat', '#c4202a', '#2b2b2b') });
defItem('machete', 'มีดพร้า', 'weapon', 1, 3, 0.6, 1, 350, { tags: ['blade', 'tool'], dura: 150, icon: ic('knife', '#c9cdd1', '#3a2a1a') });
defItem('axe', 'ขวาน', 'weapon', 2, 3, 1.4, 1, 450, { tags: ['blade', 'chop', 'tool'], dura: 220, icon: ic('hammer', '#9aa4ad', '#a87a42') });
defItem('pipe_wrench', 'ประแจคอม้า', 'weapon', 1, 3, 1.2, 1, 380, { tags: ['blunt', 'tool'], dura: 350, icon: ic('hammer', '#c4202a', '#c9cdd1') });
defItem('shovel', 'พลั่ว', 'weapon', 1, 4, 1.8, 1, 320, { tags: ['blunt', 'dig', 'tool'], dura: 200, icon: ic('bat', '#3a3a3a', '#c9cdd1') });
defItem('steel_pipe', 'ท่อเหล็ก 1 ม.', 'weapon', 1, 4, 2.0, 1, 150, { tags: ['blunt', 'material'], dura: 400, icon: ic('bat', '#8a9096', '#5f656b') });
defItem('golf_club', 'ไม้กอล์ฟ', 'weapon', 1, 4, 0.4, 1, 900, { tags: ['blunt'], dura: 90, icon: ic('bat', '#c9cdd1', '#2b2b2b') });
defItem('cordless_drill', 'สว่านไร้สาย', 'tool', 2, 2, 1.5, 1, 1490, { tags: ['drill', 'build', 'electric'], dura: 100, icon: ic('flashlight', '#e0b23c', '#2b2b2b') });
defItem('pliers', 'คีมปากจิ้งจก', 'tool', 1, 1, 0.25, 1, 120, { tags: ['repair'], dura: 200, icon: ic('opener', '#c9cdd1', '#c4202a') });
defItem('sharpening_stone', 'หินลับมีด', 'tool', 1, 1, 0.4, 4, 150, { uses: 20, tags: ['sharpen', 'repair_blade'], icon: ic('bar', '#5f656b', '#8a9096', '#8a9096') });
defItem('wood_glue', 'กาวลาเท็กซ์ (ขวด)', 'material', 1, 1, 0.3, 6, 65, { uses: 8, tags: ['glue', 'repair_wood'], icon: ic('smallbottle', '#f2f2f2', '#2f63a8', '#e0b23c') });
defItem('sewing_kit', 'ชุดเข็มด้าย', 'tool', 1, 1, 0.1, 4, 59, { uses: 20, tags: ['sew', 'repair_cloth'], icon: ic('case', '#e05a8a', '#f2f2f2') });
defItem('rope', 'เชือกไนลอน 10 ม.', 'material', 1, 1, 0.6, 4, 89, { tags: ['rope'], icon: ic('roll', '#e0b23c', '#c43c2c') });
defItem('zip_ties', 'เคเบิลไทร์ (ถุง 100)', 'material', 1, 1, 0.15, 6, 49, { uses: 100, tags: ['fasten'], icon: ic('pack', '#f2f2f2', '#2b2b2b', '#ffffff') });
defItem('screws_box', 'สกรูไม้ (กล่อง 200)', 'material', 1, 1, 0.8, 5, 95, { uses: 200, tags: ['screws', 'build'], icon: ic('box', '#8a8f94', '#2f63a8', '#e0b23c') });
defItem('padlock', 'กุญแจคล้อง', 'material', 1, 1, 0.3, 4, 159, { tags: ['lock'], icon: ic('case', '#c9a24a', '#5f656b') });
defItem('chain', 'โซ่เหล็ก 2 ม.', 'material', 2, 1, 2.2, 2, 250, { tags: ['chain', 'barricade'], icon: ic('roll', '#8a9096', '#5f656b') });
defItem('steel_sheet', 'แผ่นเหล็กเรียบ 60×120 ซม.', 'material', 3, 4, 12.0, 1, 650, { tags: ['metal', 'build', 'barricade'], icon: ic('board', '#c9cdd1', '#8a9096') });
defItem('cement_bag', 'ปูนซีเมนต์ 50 กก.', 'material', 3, 3, 50.0, 1, 165, { tags: ['cement', 'build'], icon: ic('sack', '#9aa4ad', '#c4202a', '#2f63a8') });
defItem('tarp', 'ผ้าใบกันน้ำ 3×4 ม.', 'material', 2, 2, 1.5, 2, 220, { tags: ['tarp', 'rain'], icon: ic('pouch', '#2f63a8', '#1f3f6a') });
defItem('paint_can', 'สีน้ำอะคริลิก 3.5 ลิตร', 'material', 2, 2, 4.0, 2, 590, { tags: ['paint'], icon: ic('tub', '#f2f2f2', '#c8ccd0', '#c4202a') });
defItem('bucket', 'ถังน้ำพลาสติก 20 ลิตร', 'bag', 2, 2, 0.8, 1, 89, { grid: [3, 3], limit: 20, equip: 'hand', tags: ['water_container'], icon: ic('tub', '#2f63a8', '#1f3f6a', '#2f63a8') });
defItem('jerry_can', 'แกลลอนน้ำมัน 20 ลิตร (เปล่า)', 'fuel', 2, 3, 1.2, 1, 450, { tags: ['fuel_container'], icon: ic('jug', '#c4202a', '#2b2b2b', '#c4202a') });

/* ---------- Electrical & light ---------- */
defItem('batteries_d', 'ถ่าน D (2 ก้อน)', 'electric', 1, 1, 0.28, 10, 89, { tags: ['battery'], icon: ic('battery', '#c4202a', '#e0b23c') });
defItem('powerbank', 'พาวเวอร์แบงก์ 20000 mAh', 'electric', 1, 1, 0.4, 1, 690, { tags: ['charge'], icon: ic('box', '#2b2b2b', '#4fa3d1', '#4fa3d1') });
defItem('led_lantern', 'ตะเกียง LED', 'electric', 1, 2, 0.6, 1, 390, { tags: ['light'], dura: 100, icon: ic('jug', '#e0b23c', '#2b2b2b', '#f2efe6') });
defItem('headlamp', 'ไฟฉายคาดหัว', 'electric', 1, 1, 0.15, 1, 290, { tags: ['light'], dura: 100, icon: ic('flashlight', '#c4202a', '#f2efe6') });
defItem('extension_cord', 'ปลั๊กพ่วง 5 ม.', 'electric', 2, 1, 0.8, 2, 350, { tags: ['wire'], icon: ic('roll', '#f2f2f2', '#2b2b2b') });
defItem('radio_portable', 'วิทยุพกพา', 'electric', 1, 1, 0.5, 1, 450, { tags: ['radio'], icon: ic('box', '#3a3a3a', '#c9cdd1', '#e0b23c') });
defItem('solar_charger', 'แผงชาร์จพลังงานแสงอาทิตย์ (พับได้)', 'electric', 2, 2, 0.9, 1, 1590, { rarity: 'uncommon', tags: ['charge', 'solar'], icon: ic('board', '#1f3f6a', '#c9cdd1') });

/* ---------- Fuel & cooking gear ---------- */
defItem('portable_stove', 'เตาแก๊สปิกนิก', 'fuel', 2, 2, 2.0, 1, 590, { tags: ['stove', 'cook'], icon: ic('case', '#3a3a3a', '#c9cdd1') });
defItem('charcoal', 'ถ่านไม้ 5 กก.', 'fuel', 2, 2, 5.0, 2, 80, { uses: 20, tags: ['charcoal', 'fuel'], icon: ic('sack', '#2b2b2b', '#c43c2c', '#f2efe6') });
defItem('lpg_tank_small', 'ถังแก๊สหุงต้ม 4 กก.', 'fuel', 2, 3, 9.0, 1, 1200, { uses: 400, tags: ['gas', 'fuel'], icon: ic('jug', '#2f63a8', '#c9cdd1', '#2f63a8') });
defItem('matches', 'ไม้ขีดไฟ (แพ็ก 10)', 'misc', 1, 1, 0.1, 10, 12, { uses: 400, tags: ['fire'], icon: ic('box', '#c4202a', '#f2c230', '#2b2b2b') });
defItem('pot_large', 'หม้อสแตนเลสใหญ่', 'tool', 2, 2, 1.4, 1, 450, { tags: ['pot', 'cook', 'boil'], dura: 500, icon: ic('tub', '#c9cdd1', '#8a9096', '#8a9096') });
defItem('water_filter', 'เครื่องกรองน้ำพกพา', 'tool', 1, 2, 0.4, 1, 1290, { uses: 1000, rarity: 'uncommon', tags: ['filter'], icon: ic('bottle', '#2f63a8', '#c9cdd1', '#ffffff') });

/* ---------- Bags & carriers ---------- */
defBag('hand_cart', 'รถเข็นของพับได้', 4, 4, 6.0, 1490, [8, 6], 60, 'hand', { tags: ['cart'], icon: ic('crate', '#2f63a8', '#3a3a3a') });
defBag('shopping_trolley', 'รถเข็นซูเปอร์มาร์เก็ต', 4, 4, 14.0, 2500, [10, 8], 90, 'hand', { tags: ['cart', 'noisy'], icon: ic('crate', '#c9cdd1', '#c4202a') });
defBag('duffel_bag', 'กระเป๋าดัฟเฟิล', 3, 2, 0.9, 790, [6, 4], 22, 'hand', { icon: ic('pouch', '#3a3a3a', '#c4202a') });
defBag('cooler_box', 'กระติกน้ำแข็ง 25 ลิตร', 3, 3, 2.5, 690, [4, 4], 25, 'hand', { tags: ['insulated'], icon: ic('crate', '#2f63a8', '#f2f2f2') });
defBag('zip_bag_pack', 'ถุงซิปล็อก (แพ็ก)', 1, 1, 0.1, 49, [2, 2], 3, null, { tags: ['sealed'], icon: ic('pack', '#e9f4f8', '#2b8ac4', '#ffffff') });
defBag('tactical_pack', 'เป้ยุทธวิธี', 3, 4, 2.0, 3500, [6, 7], 30, 'back', { rarity: 'rare', icon: ic('backpack', '#4b5a3a', '#2a3a2a') });

/* ---------- Clothing (worn layers arrive with injuries in 1D) ---------- */
defItem('work_gloves', 'ถุงมือช่าง', 'clothing', 1, 1, 0.15, 2, 89, { tags: ['gloves', 'protect'], icon: ic('pouch', '#c9a46a', '#7a5a3a') });
defItem('raincoat', 'เสื้อกันฝน', 'clothing', 2, 2, 0.4, 1, 159, { tags: ['rain'], icon: ic('pouch', '#f2c230', '#2b2b2b') });
defItem('boots_rubber', 'รองเท้าบูทยาง', 'clothing', 2, 2, 1.4, 1, 290, { tags: ['boots', 'protect'], icon: ic('pouch', '#2b2b2b', '#5f656b') });
defItem('jacket_denim', 'เสื้อแจ็กเก็ตยีนส์', 'clothing', 2, 2, 0.9, 1, 690, { tags: ['protect'], icon: ic('pouch', '#2f4a7a', '#c9a46a') });
defItem('motorcycle_helmet', 'หมวกกันน็อก', 'clothing', 2, 2, 1.2, 1, 790, { tags: ['helmet', 'protect'], icon: ic('round', '#2b2b2b', '#c9cdd1', '#c4202a') });
defItem('face_mask_box', 'หน้ากากอนามัย (กล่อง 50)', 'hygiene', 1, 1, 0.15, 6, 79, { uses: 50, tags: ['mask'], icon: ic('box', '#e9f4f8', '#2b8ac4', '#2b8ac4') });

/* ---------- Hygiene ---------- */
defItem('hand_sanitizer', 'เจลล้างมือ 500 มล.', 'hygiene', 1, 2, 0.5, 4, 89, { uses: 100, tags: ['sanitize'], icon: ic('bottle', '#9ccfe6', '#2b8ac4', '#ffffff') });
defItem('detergent', 'ผงซักฟอก 1 กก.', 'hygiene', 2, 2, 1.0, 4, 79, { uses: 20, tags: ['wash'], icon: ic('box', '#2b8ac4', '#f2c230', '#ffffff') });
defItem('toothpaste', 'ยาสีฟัน', 'hygiene', 1, 1, 0.15, 10, 49, { uses: 60, tags: ['dental'], icon: ic('bar', '#f2f2f2', '#c4202a', '#2b8ac4') });
defItem('bleach', 'น้ำยาฟอกขาว 1 ลิตร', 'hygiene', 1, 2, 1.05, 4, 45, { uses: 40, tags: ['disinfect', 'water_treat'], icon: ic('bottle', '#f2f2f2', '#2f63a8', '#c4202a') });
defItem('trash_bags', 'ถุงขยะ (ม้วน)', 'hygiene', 1, 1, 0.3, 6, 39, { uses: 30, tags: ['bag_waste'], icon: ic('roll', '#2b2b2b', '#5f656b') });
defItem('insect_spray', 'สเปรย์กำจัดแมลง', 'hygiene', 1, 2, 0.4, 4, 99, { uses: 30, tags: ['pest'], icon: ic('bottle', '#3a7a3a', '#f2c230', '#c4202a') });

/* ---------- Misc ---------- */
defItem('notebook', 'สมุดบันทึกและปากกา', 'misc', 1, 1, 0.2, 4, 35, { icon: ic('box', '#2f63a8', '#f2efe6', '#ffffff') });
defItem('city_map_paper', 'แผนที่เขตเมือง (กระดาษ)', 'misc', 1, 1, 0.05, 2, 60, { icon: ic('board', '#e9e2c8', '#c4202a') });
defItem('whistle', 'นกหวีด', 'misc', 1, 1, 0.02, 4, 25, { tags: ['noise_maker'], icon: ic('lighter', '#e0b23c', '#2b2b2b') });
defItem('scrap_metal', 'เศษเหล็ก', 'material', 1, 1, 0.6, 10, 0, { tags: ['scrap'], icon: ic('box', '#8a9096', '#5f656b', '#5f656b') });
defItem('scrap_wood', 'เศษไม้', 'material', 1, 2, 0.8, 10, 0, { tags: ['wood', 'scrap'], icon: ic('plank', '#c9a46a', '#8a6a42') });
defItem('cloth_rag', 'ผ้าขี้ริ้ว', 'material', 1, 1, 0.08, 20, 10, { tags: ['cloth', 'rag'], icon: ic('pouch', '#c9b48a', '#8a7a5a') });
