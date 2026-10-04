/* ==========================================================================
   23 · GAME CLOCK (fixed timestep) + NEEDS SYSTEM
   One simulation tick = 1 game minute. Systems subscribe via onMinute/onHour/onDay.
   ========================================================================== */

const GameClock = {
  acc: 0,
  pauseLocks: 0,          // modals increment this (Modal owns time)
  sleepUntil: null,       // absolute game minute, or null
  debugMul: 1,            // F9 time acceleration multiplier
  hooks: { minute: [], hour: [], day: [] },
  onMinute(fn) { this.hooks.minute.push(fn); },
  onHour(fn) { this.hooks.hour.push(fn); },
  onDay(fn) { this.hooks.day.push(fn); },
  speed() {
    if (!S) return 0;
    if (this.sleepUntil != null) return CFG.SLEEP_SPEED;
    return (CFG.SPEEDS[S.time.speedIdx] || 0) * this.debugMul;
  },
  paused() { return !S || this.pauseLocks > 0 || this.speed() === 0; },
  /** Real seconds → simulation seconds (for movement/animation). 0 while paused. */
  simDt(realDt) { return this.paused() ? 0 : realDt * Math.min(this.speed(), 4); },
  update(realDt) {
    if (this.paused()) return;
    this.acc += realDt * CFG.GAME_MIN_PER_REAL_SEC * this.speed();
    let guard = 0;
    while (this.acc >= 1 && guard++ < 240) {
      this.acc -= 1;
      this.tick();
      if (this.sleepUntil != null && S.time.min >= this.sleepUntil) { this.endSleep(); break; }
    }
  },
  /** Advance exactly one game minute through every subscribed system. */
  tick() {
    const prev = U.timeOf(S.time.min);
    S.time.min += 1;
    const t = U.timeOf(S.time.min);
    for (const fn of this.hooks.minute) { try { fn(S.time.min); } catch (e) { console.error('[tick:minute]', e); } }
    if (t.hour !== prev.hour) for (const fn of this.hooks.hour) { try { fn(t); } catch (e) { console.error('[tick:hour]', e); } }
    if (t.day !== prev.day) for (const fn of this.hooks.day) { try { fn(t); } catch (e) { console.error('[tick:day]', e); } }
  },
  /** Used by the debug menu and test harnesses — same code path as live play. */
  advance(minutes) { for (let i = 0; i < minutes; i++) this.tick(); },
  setSpeed(idx) { if (S) { S.time.speedIdx = U.clamp(idx, 0, CFG.SPEEDS.length - 1); Bus.emit('speed', S.time.speedIdx); } },
  startSleep(untilMin) {
    this.sleepUntil = untilMin;
    const ch = activeChar(); if (ch) ch.d.sleeping = true;
    Bus.emit('sleep:start', untilMin);
  },
  endSleep(reason) {
    if (this.sleepUntil == null) return;
    this.sleepUntil = null;
    const ch = activeChar(); if (ch) ch.d.sleeping = false;
    Bus.emit('sleep:end', reason);
    Save.saveRun('sleep');
  },
};

function activeChar() { return S && S.chars[S.active] ? new Character(S.chars[S.active]) : null; }

/** Append to the run log and notify the UI. */
function logEvent(msg, kind = 'info') {
  if (!S) return;
  S.log.push({ t: S.time.min, msg, kind });
  if (S.log.length > 200) S.log.shift();
  Bus.emit('log', { msg, kind });
}

/* ---------- Needs (Phase 1A simple model; 1C adds the two-layer nutrition model) ---------- */
const Needs = {
  bedQuality: 1,
  init() {
    GameClock.onMinute(() => {
      for (const d of S.chars) {
        if (!d.alive) continue;
        const ch = new Character(d);
        const n = d.needs;
        const moving = Needs.activity(d);
        const actMul = moving === 'run' ? NEEDS.runMultiplier : moving === 'walk' ? 1.2 : 1;
        if (d.sleeping) {
          n.satiety -= NEEDS.satietyDecay * 0.5;
          n.hydration -= NEEDS.hydrationDecay * 0.6;
          n.energy += NEEDS.energySleepGain * Needs.bedQuality;
        } else {
          n.satiety -= NEEDS.satietyDecay * actMul;
          n.hydration -= NEEDS.hydrationDecay * actMul * (Needs.isHotHour() ? 1.25 : 1);
          n.energy -= NEEDS.energyDecay * (ch.hasTrait('hardy') ? 0.9 : 1) * (moving === 'run' ? 1.6 : 1);
        }
        const fx = Body.effects(d);
        if (moving === 'run') n.stamina -= 0.9; else n.stamina += (moving === 'walk' ? 0.4 : 1.2) * fx.staminaRegen * (n.satiety < 15 ? 0.5 : 1);
        for (const k of ['satiety', 'hydration', 'energy', 'stamina']) n[k] = U.clamp(n[k], 0, 100);
        n.stamina = Math.min(n.stamina, fx.staminaMax);
        Body.minute(d, d.sleeping ? 'sleep' : moving || 'idle');
        if (S.flags.debugSustain) { n.satiety = Math.max(n.satiety, 50); n.hydration = Math.max(n.hydration, 50); n.energy = Math.max(n.energy, 40); d.nut.reserve = Math.max(d.nut.reserve, -1000); }
        Illness.minute(d);
        // Walking with a load trains fitness/strength (§5.6).
        if (moving) {
          Skills.gain(ch, 'fitness', moving === 'run' ? 0.12 : 0.04);
          if (ch.load() > 0.6) Skills.gain(ch, 'strength', 0.05 * ch.load());
          if (moving === 'sneak') Skills.gain(ch, 'stealth', 0.06);
        }
        Needs.warn(d);
      }
    });
  },
  /** Movement state set by the avatar controller each frame: null | 'walk' | 'run' | 'sneak'. */
  activity(d) { return d._moving || null; },
  isHotHour() { const h = U.timeOf(S.time.min).hour; return h >= 11 && h <= 16; },
  warn(d) {
    d._warned = d._warned || {};
    const check = (key, val, thr, msg) => {
      if (val < thr && !d._warned[key]) { d._warned[key] = true; logEvent(msg, 'warn'); }
      if (val > thr + 15) d._warned[key] = false;
    };
    check('sat', d.needs.satiety, 25, STR.hungry);
    check('hyd', d.needs.hydration, 25, STR.thirsty);
    check('en', d.needs.energy, 20, STR.tired);
  },
  drinkTap(ch) { return Water.drink(ch, 'tap'); },
};

/* ---------- Outbreak milestone ---------- */
const Outbreak = {
  init() {
    GameClock.onMinute((m) => {
      if (!S.flags.outbreak && m >= CFG.OUTBREAK_MINUTE) {
        S.flags.outbreak = true;
        World.clearUnpaid();
        logEvent(STR.outbreakToast, 'bad');
        Bus.emit('toast', { kind: 'bad', msg: STR.outbreakToast, dur: 9000 });
        Bus.emit('outbreak');
      }
      if (!S.flags.outbreakNews && m >= CFG.OUTBREAK_MINUTE - 6 * 60) {
        S.flags.outbreakNews = true;
        logEvent(STR.outbreakSoon, 'warn');
        Bus.emit('toast', { kind: 'warn', msg: STR.outbreakSoon, dur: 7000 });
      }
    });
  },
};
