/* ==========================================================================
   14 · LOCATIONS, SHOP FIXTURES & LOOT POOLS (§4.3)
   Layouts are fixed (same every life). Container contents are generated from
   the world seed the first time a location is visited in a life, so the same
   items sit in the same places every life.
   ========================================================================== */

/* ---------- Shop fixture furniture (merged into FURNITURE) ---------- */
Object.assign(FURNITURE, {
  shop_shelf:    { name: 'ชั้นวางสินค้า', size: [2.0, 0.6, 1.75], slot: 'large', asset: 'prop.shop_shelf', grid: [10, 4], limit: 250, stock: 'shelf' },
  wall_shelf:    { name: 'ชั้นวางติดผนัง', size: [2.4, 0.45, 2.0], slot: 'large', asset: 'prop.wall_shelf', grid: [12, 4], limit: 250, stock: 'shelf' },
  chiller:       { name: 'ตู้แช่เย็นแบบเปิด', size: [2.0, 0.8, 1.9], slot: 'large', asset: 'prop.chiller', grid: [10, 4], limit: 200, temp: 'fridge', power: 700, stock: 'shelf' },
  drink_cooler:  { name: 'ตู้แช่เครื่องดื่ม', size: [1.4, 0.7, 2.0], slot: 'large', asset: 'prop.drink_cooler', grid: [7, 5], limit: 200, temp: 'fridge', power: 450, stock: 'shelf' },
  shop_freezer:  { name: 'ตู้แช่แข็งแบบนอน', size: [2.0, 0.9, 0.9], slot: 'large', asset: 'prop.shop_freezer', grid: [10, 4], limit: 200, temp: 'freezer', power: 500, stock: 'bin' },
  checkout:      { name: 'เคาน์เตอร์คิดเงิน', size: [1.6, 0.7, 1.0], slot: 'large', asset: 'prop.checkout', act: 'checkout' },
  market_stall:  { name: 'แผงผักผลไม้', size: [2.0, 1.1, 0.85], slot: 'large', asset: 'prop.market_stall', grid: [10, 5], limit: 250, stock: 'table' },
  meat_stall:    { name: 'แผงเนื้อสัตว์', size: [2.0, 1.1, 0.85], slot: 'large', asset: 'prop.meat_stall', grid: [10, 5], limit: 250, stock: 'table' },
  dry_stall:     { name: 'แผงของแห้ง', size: [2.0, 1.1, 0.85], slot: 'large', asset: 'prop.market_stall', grid: [10, 5], limit: 250, stock: 'table' },
  sweets_stall:  { name: 'แผงขนมไทย', size: [1.6, 0.9, 0.85], slot: 'large', asset: 'prop.market_stall', grid: [8, 4], limit: 120, stock: 'table' },
  pharmacy_shelf:{ name: 'ชั้นยาและเวชภัณฑ์', size: [1.8, 0.4, 2.0], slot: 'large', asset: 'prop.wall_shelf', grid: [9, 5], limit: 120, stock: 'shelf' },
  glass_counter: { name: 'ตู้กระจกหลังเคาน์เตอร์', size: [2.0, 0.6, 1.0], slot: 'large', asset: 'prop.glass_counter', grid: [8, 3], limit: 60, stock: 'shelf' },
  tool_rack:     { name: 'แผงเครื่องมือ', size: [2.0, 0.5, 2.0], slot: 'large', asset: 'prop.tool_rack', grid: [10, 5], limit: 300, stock: 'shelf' },
  pallet_stack:  { name: 'กองวัสดุบนพาเลท', size: [1.3, 1.1, 1.0], slot: 'large', asset: 'prop.pallet_stack', grid: [8, 8], limit: 900, stock: 'pile' },
  cart_bay:      { name: 'ที่เก็บรถเข็น', size: [1.6, 1.0, 1.0], slot: 'large', asset: 'prop.cart_bay', grid: [8, 8], limit: 400 },
  produce_bins:  { name: 'กระบะผักผลไม้', size: [2.0, 1.0, 0.9], slot: 'large', asset: 'prop.produce_bins', grid: [10, 5], limit: 250, stock: 'table' },
  bakery_case:   { name: 'ตู้ขนมปังและเบเกอรี', size: [1.6, 0.7, 1.4], slot: 'large', asset: 'prop.bakery_case', grid: [8, 4], limit: 80, stock: 'shelf' },
});

/**
 * Loot pools: weighted item ids. Weight = relative frequency; [id, weight, maxQty].
 */
const POOLS = {
  conv_snacks: [['chips', 4, 3], ['crackers_rice', 3, 3], ['biscuits', 4, 3], ['wafer', 3, 3], ['cookies', 2, 2], ['chocolate', 4, 4], ['candy', 3, 3], ['seaweed_snack', 2, 3], ['peanuts', 2, 2], ['energy_bar', 2, 3], ['protein_bar', 1, 2]],
  conv_instant: [['noodle_pack', 6, 10], ['noodle_tomyum', 5, 10], ['noodle_pork', 5, 10], ['noodle_cup', 5, 6], ['jok_cup', 4, 6], ['rice_vermicelli_cup', 3, 4], ['instant_rice_cup', 2, 4], ['instant_soup', 2, 6], ['canned_tuna', 3, 4], ['canned_sardine', 4, 4], ['canned_sausage', 2, 3], ['canned_chicken_curry', 1, 2]],
  conv_drinks: [['water_600', 8, 12], ['water_1500', 5, 6], ['soda_can', 4, 6], ['cola', 3, 3], ['lemon_soda', 2, 2], ['energy_drink', 4, 6], ['sports_drink', 3, 4], ['green_tea_bottle', 3, 4], ['canned_coffee', 3, 4], ['uht_milk', 3, 3], ['chocolate_milk', 2, 2], ['orange_juice', 2, 2], ['beer_can', 2, 6]],
  conv_chill: [['yogurt', 4, 6], ['ham', 2, 2], ['sausage_fresh', 2, 2], ['cheese_slices', 1, 2], ['fresh_milk', 2, 2], ['cake_slice', 1, 2], ['buns', 2, 2], ['bread_loaf', 3, 2], ['croissant', 2, 2], ['salted_egg', 2, 4], ['khanom_chan', 1, 2]],
  conv_frozen: [['ready_meal_basil', 5, 4], ['ready_meal_green_curry', 4, 4], ['frozen_dimsum', 3, 3], ['frozen_pork_bun', 3, 3], ['ice_pop', 4, 8], ['ice_cream', 2, 2], ['frozen_dumplings', 2, 2]],
  conv_misc: [['batteries', 3, 4], ['lighter', 3, 5], ['candle', 2, 4], ['toilet_paper', 2, 2], ['soap', 3, 3], ['toothpaste', 2, 2], ['hand_sanitizer', 2, 2], ['face_mask_box', 2, 2], ['plasters', 2, 2], ['paracetamol', 2, 2], ['matches', 2, 3], ['trash_bags', 1, 2], ['shopping_bag', 2, 2], ['zip_bag_pack', 1, 2]],

  sm_dry: [['rice_5kg', 4, 2], ['rice_sticky_2kg', 2, 2], ['rice_brown_1kg', 2, 2], ['flour_1kg', 2, 2], ['pasta_500', 3, 3], ['rice_noodle_dry', 3, 3], ['glass_noodle', 2, 3], ['oats_800', 2, 2], ['mung_beans', 2, 2], ['red_beans', 2, 2], ['lentils', 1, 2], ['sugar_1kg', 3, 3], ['salt', 2, 3], ['palm_sugar', 1, 2], ['cereal', 2, 2]],
  sm_canned: [['canned_tuna', 5, 6], ['canned_sardine', 5, 6], ['canned_mackerel', 4, 6], ['canned_pork', 3, 4], ['canned_corn', 3, 4], ['baked_beans', 3, 4], ['canned_bamboo', 2, 3], ['canned_mushroom', 2, 3], ['canned_soup', 3, 4], ['canned_chicken_curry', 2, 3], ['canned_massaman', 2, 3], ['canned_pineapple', 2, 3], ['canned_longan', 2, 3], ['canned_fruit_cocktail', 2, 3], ['evaporated_milk', 2, 4], ['condensed_milk', 2, 4], ['coconut_milk', 3, 6], ['canned_tomato', 2, 3], ['canned_sausage', 2, 3], ['pickled_mustard', 2, 4], ['peanut_butter', 2, 2], ['jam', 2, 2], ['honey', 1, 2]],
  sm_condiment: [['fish_sauce', 4, 3], ['soy_sauce', 3, 3], ['oyster_sauce', 3, 3], ['chili_sauce', 2, 3], ['vinegar', 2, 3], ['cooking_oil', 4, 3], ['seasoning_powder', 2, 3], ['curry_paste_green', 2, 4], ['curry_paste_red', 2, 4], ['tomyum_paste', 2, 2], ['pepper_ground', 1, 3], ['sesame', 1, 3], ['instant_coffee', 2, 2], ['tea_bags', 2, 2], ['cocoa_powder', 1, 2], ['dried_chili', 1, 3]],
  sm_snacks: [['chips', 4, 3], ['biscuits', 3, 3], ['crackers', 3, 3], ['cookies', 3, 3], ['wafer', 2, 3], ['chocolate', 3, 4], ['candy', 2, 3], ['dried_mango', 2, 2], ['cashews', 1, 2], ['peanuts', 2, 3], ['seaweed_snack', 2, 3], ['energy_bar', 2, 4], ['protein_bar', 2, 3]],
  sm_drinks: [['water_1500', 6, 6], ['water_6l', 4, 2], ['water_350_pack', 4, 2], ['mineral_water', 2, 4], ['cola', 3, 3], ['lemon_soda', 2, 3], ['orange_juice', 3, 3], ['guava_juice', 2, 3], ['coconut_water', 2, 3], ['uht_milk', 4, 4], ['soy_milk', 3, 3], ['chocolate_milk', 3, 3], ['sports_drink', 2, 4], ['green_tea_bottle', 2, 4], ['beer_can', 2, 6], ['rice_whisky', 1, 2]],
  sm_meat: [['pork_1kg', 3, 2], ['pork_belly', 3, 2], ['pork_minced', 3, 3], ['pork_chop', 2, 2], ['chicken_breast', 3, 2], ['chicken_thigh', 3, 2], ['chicken_wings', 2, 3], ['chicken_whole', 1, 1], ['beef_steak', 2, 3], ['beef_ribeye', 1, 2], ['beef_minced', 2, 2], ['sausage_fresh', 2, 2], ['ham', 2, 2], ['bacon', 2, 2], ['meatballs', 2, 2]],
  sm_seafood: [['fish_tilapia', 3, 2], ['fish_mackerel_fresh', 3, 3], ['shrimp_500', 2, 2], ['squid', 2, 2]],
  sm_dairy: [['fresh_milk', 4, 3], ['yogurt', 4, 6], ['cheese_slices', 2, 3], ['butter', 2, 2], ['egg', 3, 12], ['eggs_tray30', 2, 1], ['duck_egg', 1, 6]],
  sm_frozen: [['frozen_chicken', 4, 2], ['frozen_fish_fillet', 3, 3], ['frozen_shrimp', 2, 2], ['frozen_fries', 2, 2], ['frozen_veg_mix', 3, 3], ['frozen_dumplings', 2, 3], ['frozen_dimsum', 2, 3], ['frozen_pork_bun', 2, 2], ['frozen_chicken_nuggets', 2, 2], ['roti_frozen', 1, 2], ['ice_cream', 3, 2], ['ice_pop', 2, 6], ['ready_meal_basil', 2, 3], ['ready_meal_green_curry', 2, 3]],
  sm_produce: [['cabbage', 2, 2], ['chinese_kale', 2, 3], ['morning_glory', 2, 3], ['cucumber', 2, 3], ['tomato', 2, 3], ['carrot', 2, 3], ['potato', 2, 2], ['onion', 2, 2], ['garlic', 2, 2], ['shallot', 2, 2], ['banana', 2, 2], ['apple', 2, 3], ['orange', 2, 2], ['mango', 2, 3], ['watermelon', 1, 1], ['pineapple', 1, 2], ['mushroom_oyster', 2, 3], ['corn_cob', 1, 3]],
  sm_bakery: [['bread_loaf', 4, 3], ['buns', 3, 3], ['croissant', 3, 3], ['cake_slice', 2, 3]],
  sm_household: [['toilet_paper', 4, 2], ['soap', 3, 4], ['detergent', 2, 2], ['bleach', 2, 2], ['toothpaste', 2, 3], ['hand_sanitizer', 2, 2], ['trash_bags', 2, 3], ['insect_spray', 2, 2], ['face_mask_box', 2, 2], ['zip_bag_pack', 2, 3], ['food_box', 2, 2], ['candle', 2, 4], ['matches', 2, 3], ['lighter', 2, 4], ['batteries', 3, 4], ['batteries_d', 2, 3], ['flashlight', 1, 1], ['led_lantern', 1, 1], ['radio_portable', 1, 1], ['powerbank', 1, 1], ['notebook', 1, 2]],
  sm_cookware: [['pot_large', 2, 1], ['frying_pan', 2, 1], ['kitchen_knife', 2, 2], ['can_opener', 2, 2], ['portable_stove', 2, 1], ['gas_canister', 4, 6], ['charcoal', 2, 2], ['cooler_box', 1, 1], ['bucket', 1, 1], ['tote_bag', 2, 2], ['backpack_small', 1, 1], ['backpack_medium', 1, 1], ['duffel_bag', 1, 1]],

  mk_veg: [['morning_glory', 5, 4], ['chinese_kale', 4, 4], ['cabbage', 3, 2], ['cucumber', 3, 3], ['tomato', 3, 3], ['long_beans', 3, 3], ['eggplant', 3, 3], ['chili_fresh', 4, 4], ['thai_basil', 4, 4], ['lemongrass', 3, 3], ['galangal', 2, 3], ['kaffir_lime_leaf', 2, 3], ['lime', 3, 3], ['carrot', 2, 3], ['pumpkin', 2, 1], ['mushroom_oyster', 2, 3], ['corn_cob', 2, 3], ['green_papaya', 2, 2], ['garlic', 2, 2], ['shallot', 2, 2]],
  mk_fruit: [['banana', 4, 2], ['mango', 4, 4], ['papaya', 3, 2], ['watermelon', 2, 1], ['pineapple', 3, 2], ['rambutan', 3, 2], ['guava', 3, 2], ['orange', 2, 2]],
  mk_meat: [['pork_1kg', 4, 2], ['pork_belly', 4, 2], ['pork_minced', 4, 3], ['chicken_whole', 2, 1], ['chicken_thigh', 3, 2], ['chicken_wings', 3, 2], ['meatballs', 2, 2], ['beef_minced', 1, 2], ['egg', 3, 12], ['duck_egg', 2, 6], ['eggs_tray30', 2, 1]],
  mk_fish: [['fish_tilapia', 4, 2], ['fish_mackerel_fresh', 5, 4], ['shrimp_500', 3, 2], ['squid', 3, 2], ['dried_fish', 2, 2], ['dried_shrimp', 2, 2]],
  mk_dry: [['rice_5kg', 3, 2], ['rice_sticky_2kg', 3, 2], ['dried_chili', 3, 3], ['dried_shiitake', 2, 2], ['garlic', 3, 3], ['shallot', 3, 3], ['palm_sugar', 2, 2], ['fish_sauce', 3, 2], ['salted_egg', 3, 6], ['peanuts', 2, 3], ['sesame', 2, 2], ['curry_paste_green', 2, 3], ['curry_paste_red', 2, 3], ['coconut_milk', 2, 4]],
  mk_sweets: [['khanom_chan', 3, 3], ['mango_sticky_rice', 3, 3], ['thong_yod', 2, 3], ['khanom_krok', 3, 3], ['bua_loy_cup', 2, 3], ['dried_mango', 2, 2]],

  hw_tools: [['hammer', 3, 2], ['saw', 3, 2], ['screwdriver', 3, 2], ['pliers', 2, 2], ['cordless_drill', 1, 1], ['crowbar', 2, 1], ['axe', 1, 1], ['machete', 2, 1], ['shovel', 2, 1], ['pipe_wrench', 1, 1], ['sharpening_stone', 2, 2], ['sewing_kit', 1, 2], ['work_gloves', 3, 2], ['flashlight', 2, 2], ['headlamp', 1, 2]],
  hw_fasteners: [['nails_1kg', 6, 5], ['screws_box', 4, 4], ['duct_tape', 5, 4], ['wood_glue', 3, 4], ['zip_ties', 3, 4], ['rope', 3, 3], ['padlock', 2, 3], ['chain', 2, 2], ['extension_cord', 2, 2], ['batteries', 2, 4], ['batteries_d', 2, 3], ['tarp', 2, 2], ['paint_can', 1, 2]],
  hw_lumber: [['plank', 8, 4], ['plywood', 4, 1], ['steel_sheet', 2, 1], ['steel_pipe', 2, 1], ['cement_bag', 1, 1], ['scrap_wood', 1, 4]],
  hw_misc: [['jerry_can', 2, 1], ['lpg_tank_small', 1, 1], ['charcoal', 2, 2], ['bucket', 2, 2], ['hand_cart', 1, 1], ['raincoat', 2, 2], ['boots_rubber', 1, 1], ['tool_roll', 1, 2], ['backpack_medium', 1, 1], ['hiking_pack', 1, 1], ['water_filter', 1, 1], ['solar_charger', 1, 1], ['cooler_box', 1, 1]],

  ph_meds: [['paracetamol', 6, 6], ['ibuprofen', 4, 4], ['antidiarrheal', 3, 4], ['ors', 4, 10], ['vitamin_c', 2, 2], ['multivitamin', 2, 2], ['thermometer', 1, 1]],
  ph_wound: [['povidone', 4, 3], ['alcohol_70', 4, 3], ['saline', 3, 2], ['gauze_set', 4, 3], ['sterile_gauze', 4, 4], ['plasters', 4, 4], ['elastic_bandage', 3, 3], ['medical_tape', 3, 3], ['burn_gel', 2, 2], ['splint', 1, 1], ['first_aid_kit', 1, 1]],
  ph_rx: [['antibiotic', 4, 3], ['suture_kit', 2, 1], ['tourniquet', 1, 1]],
  ph_misc: [['face_mask_box', 3, 3], ['hand_sanitizer', 3, 3], ['soap', 2, 3], ['toothpaste', 2, 2], ['sports_drink', 2, 4], ['water_600', 2, 6], ['energy_bar', 1, 3]],
};

/**
 * Locations. dist = km from home. hours = [open, close) pre-outbreak (24 = open all day).
 * room: interior rectangle (x0,x1,z0,z1); door on the +z wall at doorX.
 * fixtures: [type, x, z, rot, pool(s)].
 */
const LOCATIONS = {
  home: { name: 'บ้าน', short: 'บ้าน', icon: '🏠', map: [300, 330], dist: 0 },
  conv: {
    name: 'ร้านสะดวกซื้อ 24 ชม. ปากซอย', short: 'ร้านสะดวกซื้อ', icon: '🏪', map: [365, 305], dist: 0.35, hours: [0, 24], density: 1.0,
    room: { x0: -5, x1: 5, z0: -4, z1: 4, floorMat: 'tile', wall: '#e8ecef' }, doorX: 2.8, light: 0xf4f8ff, sign: ['ร้านสะดวกซื้อ', '#2f8a4a'],
    fixtures: [
      ['wall_shelf', -2.6, -3.7, 0, 'conv_snacks'], ['drink_cooler', 0.2, -3.6, 0, 'conv_drinks'], ['drink_cooler', 1.7, -3.6, 0, 'conv_drinks'], ['chiller', 3.8, -3.5, 0, 'conv_chill'],
      ['shop_shelf', -2.0, -1.1, 0, 'conv_instant'], ['shop_shelf', -2.0, 0.8, 0, 'conv_misc'], ['shop_freezer', 1.6, -0.6, 0, 'conv_frozen'],
      ['wall_shelf', -4.75, 0.6, 3, 'conv_snacks'], ['checkout', 2.6, 2.4, 1, null],
    ],
  },
  pharmacy: {
    name: 'ร้านขายยาสุขภาพดี', short: 'ร้านขายยา', icon: '💊', map: [420, 390], dist: 0.7, hours: [8, 22], density: 1.0,
    room: { x0: -4, x1: 4, z0: -3.5, z1: 3.5, floorMat: 'tile', wall: '#e9f2ee' }, doorX: 2.2, light: 0xf4f8ff, sign: ['ร้านขายยา', '#2f7a6a'],
    fixtures: [
      ['pharmacy_shelf', -2.2, -3.25, 0, 'ph_meds'], ['pharmacy_shelf', 0.2, -3.25, 0, 'ph_wound'], ['glass_counter', 2.4, -2.4, 0, 'ph_rx'],
      ['shop_shelf', -1.6, 0.2, 0, 'ph_misc'], ['pharmacy_shelf', -3.75, 0.6, 3, 'ph_wound'], ['checkout', 2.6, 0.6, 1, null],
    ],
  },
  market: {
    name: 'ตลาดสดเทศบาล', short: 'ตลาดสด', icon: '🥬', map: [80, 200], dist: 1.3, hours: [4, 13], density: 1.4, open: true,
    room: { x0: -8, x1: 8, z0: -7, z1: 7, floorMat: 'concrete', wall: '#c9c4b8' }, doorX: 0, light: 0xfff2d8, sign: ['ตลาดสด', '#b8242a'],
    fixtures: [
      ['market_stall', -5.5, -5.2, 0, 'mk_veg'], ['market_stall', -2.8, -5.2, 0, 'mk_veg'], ['meat_stall', 0.6, -5.2, 0, 'mk_meat'], ['meat_stall', 3.3, -5.2, 0, 'mk_fish'], ['dry_stall', 6.0, -5.2, 0, 'mk_dry'],
      ['market_stall', -5.5, -1.2, 2, 'mk_fruit'], ['market_stall', -5.5, 0.4, 0, 'mk_veg'], ['dry_stall', -1.8, -1.2, 2, 'mk_dry'], ['meat_stall', -1.8, 0.4, 0, 'mk_meat'],
      ['sweets_stall', 2.2, -1.2, 2, 'mk_sweets'], ['market_stall', 2.2, 0.4, 0, 'mk_fruit'], ['meat_stall', 5.8, -1.2, 2, 'mk_fish'], ['market_stall', 5.8, 0.4, 0, 'mk_veg'],
      ['market_stall', -5.5, 4.2, 2, 'mk_veg'], ['dry_stall', 5.8, 4.2, 2, 'mk_dry'], ['checkout', 1.6, 4.6, 0, null],
    ],
  },
  hardware: {
    name: 'ร้านวัสดุก่อสร้าง ช.รุ่งเรือง', short: 'ร้านวัสดุก่อสร้าง', icon: '🔨', map: [520, 120], dist: 1.6, hours: [8, 18], density: 1.0,
    room: { x0: -6, x1: 6, z0: -5, z1: 5, floorMat: 'concrete', wall: '#d6d0c2' }, doorX: 3.4, light: 0xfff4e0, sign: ['วัสดุก่อสร้าง', '#c9733a'],
    fixtures: [
      ['tool_rack', -3.6, -4.7, 0, 'hw_tools'], ['tool_rack', -1.3, -4.7, 0, 'hw_fasteners'], ['tool_rack', 1.0, -4.7, 0, 'hw_misc'],
      ['pallet_stack', 4.4, -3.8, 0, 'hw_lumber'], ['pallet_stack', 4.4, -1.8, 0, 'hw_lumber'], ['pallet_stack', -5.0, -1.0, 0, 'hw_lumber'],
      ['shop_shelf', -1.8, -1.2, 0, 'hw_fasteners'], ['shop_shelf', -1.8, 1.0, 0, 'hw_tools'], ['shop_shelf', 1.5, -1.2, 0, 'hw_misc'],
      ['cart_bay', -4.6, 3.6, 0, null], ['checkout', 3.4, 2.6, 1, null],
    ],
  },
  supermarket: {
    name: 'ซูเปอร์มาร์เก็ตในห้างสรรพสินค้า', short: 'ซูเปอร์มาร์เก็ต', icon: '🛒', map: [780, 380], dist: 2.5, hours: [10, 22], density: 1.0,
    room: { x0: -10, x1: 10, z0: -8, z1: 8, floorMat: 'tile', wall: '#e6e3dc' }, doorX: 6.5, light: 0xf8faff, sign: ['ซูเปอร์มาร์เก็ต', '#1f4f8a'],
    fixtures: [
      ['chiller', -8.6, -7.5, 0, 'sm_meat'], ['chiller', -6.4, -7.5, 0, 'sm_meat'], ['chiller', -4.2, -7.5, 0, 'sm_seafood'], ['chiller', -2.0, -7.5, 0, 'sm_dairy'], ['chiller', 0.2, -7.5, 0, 'sm_dairy'],
      ['drink_cooler', 2.0, -7.45, 0, 'sm_drinks'], ['drink_cooler', 3.5, -7.45, 0, 'sm_drinks'], ['bakery_case', 5.4, -7.4, 0, 'sm_bakery'], ['wall_shelf', 8.0, -7.6, 0, 'sm_cookware'],
      ['shop_shelf', -7.0, -4.2, 0, 'sm_dry'], ['shop_shelf', -4.8, -4.2, 0, 'sm_dry'], ['shop_shelf', -7.0, -2.4, 2, 'sm_canned'], ['shop_shelf', -4.8, -2.4, 2, 'sm_canned'],
      ['shop_shelf', -1.6, -4.2, 0, 'sm_canned'], ['shop_shelf', 0.6, -4.2, 0, 'sm_condiment'], ['shop_shelf', -1.6, -2.4, 2, 'sm_snacks'], ['shop_shelf', 0.6, -2.4, 2, 'sm_snacks'],
      ['shop_shelf', 3.8, -4.2, 0, 'sm_household'], ['shop_shelf', 6.0, -4.2, 0, 'sm_household'], ['shop_shelf', 3.8, -2.4, 2, 'sm_drinks'], ['shop_shelf', 6.0, -2.4, 2, 'sm_condiment'],
      ['shop_freezer', -6.0, 0.6, 0, 'sm_frozen'], ['shop_freezer', -3.6, 0.6, 0, 'sm_frozen'], ['produce_bins', -0.6, 0.6, 0, 'sm_produce'], ['produce_bins', 1.8, 0.6, 0, 'sm_produce'],
      ['shop_shelf', 5.0, 0.6, 0, 'sm_cookware'], ['wall_shelf', -9.75, 2.6, 3, 'sm_drinks'], ['wall_shelf', 9.75, 0.0, 1, 'sm_household'],
      ['cart_bay', -8.2, 6.6, 0, null], ['checkout', 2.6, 5.6, 1, null], ['checkout', 4.8, 5.6, 1, null],
    ],
  },
};
/** Fixed items in specific fixtures, independent of pools (e.g. trolleys in the cart bay). */
const FIXED_STOCK = {
  'supermarket:cart_bay': [['shopping_trolley', 1], ['shopping_bag', 3]],
  'hardware:cart_bay': [['hand_cart', 1], ['shopping_bag', 2]],
};
const LOC_IDS = Object.keys(LOCATIONS).filter((k) => k !== 'home');
const WALK_KMH = 4.5, RUN_KMH = 8.5;
function locDef(id) { return LOCATIONS[id] || LOCATIONS.home; }
/** Is a shop open at this absolute minute (pre-outbreak only; afterwards it's a free-for-all). */
function shopOpen(id, min) {
  const L = LOCATIONS[id];
  if (!L || !L.hours) return true;
  const h = U.timeOf(min).dayMin / 60;
  return h >= L.hours[0] && h < L.hours[1];
}
