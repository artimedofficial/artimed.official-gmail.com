/* ==========================================================================
   00 · CONFIG
   Global tunables, asset overrides, difficulty and quality tables.
   Everything here is plain data so the owner can tweak without touching logic.
   ========================================================================== */

const BUILD = '2B.0.1';

/**
 * ASSET_OVERRIDES — swap any procedural asset for an external file.
 *   key   = assetId (see AssetRegistry.list() in the F9 debug menu)
 *   value = URL or data URI. '.glb/.gltf' → loaded with GLTFLoader (props/characters),
 *           image (png/jpg/webp/svg/data:image) → used as an item icon.
 * Example:
 *   'prop.fridge': 'models/fridge.glb',
 *   'icon.canned_tuna': 'data:image/png;base64,....'
 * Note: when the game is opened from file:// most browsers block loading
 * neighbouring files, so data URIs or https URLs are the reliable choice.
 */
const ASSET_OVERRIDES = {
};

const CFG = {
  SCHEMA_RUN: 1,
  SCHEMA_PROFILE: 1,
  LS_RUN: 'hoardhold.run.v1',
  LS_PROFILE: 'hoardhold.profile.v1',

  // Time: 1 game day = 30 real minutes at 1x → 0.8 game minutes per real second.
  GAME_MIN_PER_REAL_SEC: 1440 / (30 * 60),
  SPEEDS: [0, 0.5, 1, 2, 4],
  SLEEP_SPEED: 90,               // multiplier while sleeping / skipping
  START_MINUTE: 6 * 60,          // Day 0 06:00
  OUTBREAK_MINUTE: 1440 + 6 * 60,// Day 1 06:00
  START_CASH: 200000,

  AUTOSAVE_REAL_SEC: 300,

  // World geometry
  FLOOR_H: 3.0,
  NAV_CELL: 0.25,

  // Character movement (metres per second at 1x)
  WALK_SPEED: 1.45,
  RUN_SPEED: 3.4,
  SNEAK_SPEED: 0.8,

  // Inventory
  CELL_PX: 36,
};

/** Difficulty table (§10.2). Phase 1 uses utilityFailDay; the rest is wired in later phases. */
const DIFFICULTY = {
  relaxed:  { key: 'relaxed',  utilityFailDay: 90, eventRate: 0.6, zombie: 0.7, loot: 1.3, wear: 0.75, infection: 0.75 },
  standard: { key: 'standard', utilityFailDay: 60, eventRate: 1.0, zombie: 1.0, loot: 1.0, wear: 1.0,  infection: 1.0 },
  hardcore: { key: 'hardcore', utilityFailDay: 30, eventRate: 1.5, zombie: 1.4, loot: 0.7, wear: 1.3,  infection: 1.3 },
};
function difficultyOf(key) { return DIFFICULTY[key] || DIFFICULTY.standard; }

/** Render quality presets (§2.6). Chosen by benchmark on first launch, overridable in Settings. */
const QUALITY = {
  low:    { key: 'low',    pixelRatio: 0.85, shadowMap: 1024, shadowLights: 0, dust: 0,   antialias: false, envMap: false, maxLights: 4 },
  medium: { key: 'medium', pixelRatio: 1.0,  shadowMap: 2048, shadowLights: 1, dust: 220, antialias: true,  envMap: true,  maxLights: 8 },
  high:   { key: 'high',   pixelRatio: 1.5,  shadowMap: 2048, shadowLights: 2, dust: 500, antialias: true,  envMap: true,  maxLights: 14 },
};
function qualityOf(key) { return QUALITY[key] || QUALITY.medium; }
