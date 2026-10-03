/* ==========================================================================
   11 · CHARACTER DATA — skills, backgrounds, body parts, needs tuning
   ========================================================================== */

/** Skills (§5.6). xpBase × level^1.5 XP to reach next level. phase = when its effects go live. */
const SKILLS = {
  carpentry: { name: 'ซ่อมแซมและงานไม้', icon: '🔨', phase: 1 },
  melee:     { name: 'การต่อสู้ระยะประชิด', icon: '🏏', phase: 1 },
  firearms:  { name: 'อาวุธปืน', icon: '🎯', phase: 2 },
  cooking:   { name: 'ทำอาหาร', icon: '🍳', phase: 1 },
  scavenging:{ name: 'ค้นหาและจัดของ', icon: '📦', phase: 1 },
  medicine:  { name: 'ปฐมพยาบาล', icon: '🩹', phase: 1 },
  farming:   { name: 'เกษตรกรรม', icon: '🌱', phase: 2 },
  tailoring: { name: 'งานเย็บปัก', icon: '🧵', phase: 2 },
  mechanics: { name: 'ช่างกลและไฟฟ้า', icon: '⚙️', phase: 2 },
  fitness:   { name: 'สมรรถภาพร่างกาย', icon: '🏃', phase: 1 },
  stealth:   { name: 'การลอบเร้น', icon: '👣', phase: 1 },
  strength:  { name: 'ความแข็งแรง', icon: '💪', phase: 1 },
};
const SKILL_XP_BASE = 60;
function xpForLevel(lv) { return Math.round(SKILL_XP_BASE * Math.pow(lv, 1.5)); }

/** Backgrounds (§5.2). skills: starting levels; trait: one passive. */
const BACKGROUNDS = {
  warehouse: {
    name: 'พนักงานคลังสินค้า', desc: 'แข็งแรง แบกของได้มากและเร็ว จัดของลงกริดเก่ง',
    skills: { strength: 3, fitness: 2, scavenging: 2 },
    trait: { key: 'organizer', name: 'นักจัดของ', desc: 'น้ำหนักแบกสูงสุด +15%, Auto-Sort จัดแน่นกว่า' },
    look: { shirt: '#3d6b9a', pants: '#2c3440', hair: '#1c1612', skin: '#c08a62' },
  },
  handyman: {
    name: 'ช่างซ่อม', desc: 'เริ่มต้นด้วยทักษะงานไม้และช่างกล ซ่อมของเสียได้คุ้มกว่า',
    skills: { carpentry: 3, mechanics: 2, strength: 1 },
    trait: { key: 'handy', name: 'มือช่าง', desc: 'ซ่อมเสียความทนทานสูงสุดน้อยลง 25%' },
    look: { shirt: '#8a5a2b', pants: '#3a3f46', hair: '#2a2018', skin: '#b5804f' },
  },
  cook: {
    name: 'พ่อครัว/แม่ครัว', desc: 'ทำอาหารได้คุณภาพดี ทิ้งอาหารน้อยกว่าคนอื่น',
    skills: { cooking: 4, scavenging: 1 },
    trait: { key: 'thrifty', name: 'ไม่ทิ้งของกิน', desc: 'อาหารที่ปรุงได้ปริมาณเพิ่มขึ้น 10%' },
    look: { shirt: '#e8e4dc', pants: '#2f2f33', hair: '#120e0c', skin: '#d39c74' },
  },
  nurse: {
    name: 'พยาบาล', desc: 'รู้วิธีทำแผลและควบคุมการติดเชื้อ',
    skills: { medicine: 4, fitness: 1 },
    trait: { key: 'clinical', name: 'ปลอดเชื้อ', desc: 'โอกาสติดเชื้อจากแผลลดลง 20%' },
    look: { shirt: '#6fa7b8', pants: '#5b8c9a', hair: '#231a14', skin: '#d8a37c' },
  },
  soldier: {
    name: 'อดีตทหาร', desc: 'ร่างกายฟิต ต่อสู้ได้ดี และเคลื่อนไหวเงียบ',
    skills: { melee: 3, fitness: 3, firearms: 2, stealth: 1 },
    trait: { key: 'disciplined', name: 'วินัยเหล็ก', desc: 'ใช้ stamina ในการต่อสู้น้อยลง 15%' },
    look: { shirt: '#4b5a3a', pants: '#3b4430', hair: '#0f0d0b', skin: '#a8754c' },
  },
  farmer: {
    name: 'เกษตรกร', desc: 'รู้จักพืชผัก อดทนแดดฝน ทำงานหนักได้นาน',
    skills: { farming: 4, strength: 2, fitness: 1 },
    trait: { key: 'hardy', name: 'อึด', desc: 'Energy ลดช้าลง 10%' },
    look: { shirt: '#5b7a96', pants: '#3a2f26', hair: '#1a1410', skin: '#9c6a42' },
  },
};

/** Body parts (§5.4). hp max per region. critical → death at 0. */
const BODY_PARTS = {
  head:  { name: 'ศีรษะ', hp: 60, critical: true },
  torso: { name: 'ลำตัว', hp: 100, critical: true },
  armL:  { name: 'แขนซ้าย', hp: 60 },
  armR:  { name: 'แขนขวา', hp: 60 },
  legL:  { name: 'ขาซ้าย', hp: 70 },
  legR:  { name: 'ขาขวา', hp: 70 },
};

/** Needs tuning (per game minute). Phase 1A: simple decay; 1C replaces satiety with the two-layer model. */
const NEEDS = {
  satietyDecay: 100 / (16 * 60),     // full → empty in ~16 h awake
  hydrationDecay: 100 / (30 * 60),   // ~30 h to empty at rest (heat/activity speed it up)
  energyDecay: 100 / (18 * 60),      // ~18 h awake
  energySleepGain: 100 / (7.5 * 60), // full in ~7.5 h on a normal bed
  runMultiplier: 2.2,
};

/** Base carry capacity in kg before skills, bag and injuries. */
const CARRY = { base: 14, perStrength: 1.6, perFitness: 0.6 };
