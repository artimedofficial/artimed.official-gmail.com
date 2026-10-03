/* ==========================================================================
   25 · UTILITIES TIMELINE (§9.2) — grid power & municipal water.
   Normal service until (failDay − 10); telegraphed scheduled load-shedding that
   grows each day for the final 10 days; permanent failure from failDay 00:00.
   The outage schedule is deterministic per life (event seed) and announced each
   morning. Generators / cold-hold are layered on top in the cooling system.
   ========================================================================== */

const Power = {
  failDay() { return S ? (S.flags.failDayOverride || difficultyOf(S.difficulty).utilityFailDay) : 60; },
  brownoutStart() { return this.failDay() - 10; },
  /** Outage windows [startMin, endMin) (minutes into the day) for a given day number. */
  outages(day) {
    const F = this.failDay(), B = F - 10;
    if (day < B || day >= F) return [];
    const k = day - B + 1;                          // 1..10
    const totalH = 1 + k * 1.1;                     // 2.1 h … 12 h per day
    const rng = RNG.local('brownout|' + (S ? S.lifeSeed : 1) + '|' + day);
    const blocks = k < 4 ? 1 : k < 8 ? 2 : 3;
    const out = [];
    for (let i = 0; i < blocks; i++) {
      const len = (totalH / blocks) * 60;
      const slot = (1440 / blocks) * i;
      const start = Math.floor(slot + rng() * Math.max(0, 1440 / blocks - len));
      out.push([start, Math.min(1440, start + Math.round(len))]);
    }
    return out;
  },
  gridOn(min = S ? S.time.min : 0) {
    if (!S) return true;
    if (S.flags.gridForcedOff) return false;
    const day = Math.floor(min / 1440), m = min - day * 1440;
    if (day >= this.failDay()) return false;
    for (const [a, b] of this.outages(day)) if (m >= a && m < b) return false;
    return true;
  },
  waterOn(min = S ? S.time.min : 0) {
    if (!S) return true;
    const day = Math.floor(min / 1440);
    if (S.flags.gridForcedOff) return false;
    return day < this.failDay();            // water pressure holds until the failure day
  },
  /** Light flicker factor shortly before a scheduled outage (visual warning). */
  flicker(min) {
    if (!S) return 1;
    const day = Math.floor(min / 1440), m = min - day * 1440;
    for (const [a] of this.outages(day)) if (m >= a - 12 && m < a) return 0.55 + 0.45 * Math.abs(Math.sin(performance.now() * 0.03 + m));
    return 1;
  },
  stage(min = S ? S.time.min : 0) {
    const day = Math.floor(min / 1440);
    if (day >= this.failDay()) return 'failed';
    if (day >= this.brownoutStart()) return 'brownout';
    return 'normal';
  },
  init() {
    // Morning announcement of today's schedule; milestone messages.
    GameClock.onHour((t) => {
      if (t.hour !== 7) return;
      const st = this.stage();
      if (st === 'brownout') {
        const list = this.outages(t.day).map(([a, b]) => U.pad2(Math.floor(a / 60)) + ':' + U.pad2(a % 60) + '–' + U.pad2(Math.floor(b / 60)) + ':' + U.pad2(b % 60)).join(', ');
        const msg = STR.brownoutNews(this.failDay() - t.day, list);
        logEvent(msg, 'warn'); Bus.emit('toast', { kind: 'warn', msg, dur: 9000 });
      } else if (st === 'normal' && t.day === this.brownoutStart() - 3) {
        logEvent(STR.gridWarning, 'warn'); Bus.emit('toast', { kind: 'warn', msg: STR.gridWarning, dur: 8000 });
      }
    });
    GameClock.onDay((t) => {
      if (t.day === this.failDay()) { logEvent(STR.gridFailed, 'bad'); Bus.emit('toast', { kind: 'bad', msg: STR.gridFailed, dur: 10000 }); }
    });
    let was = true;
    GameClock.onMinute((m) => {
      const on = this.gridOn(m);
      if (on !== was) { Bus.emit('power:changed', on); was = on; }
    });
  },
};
