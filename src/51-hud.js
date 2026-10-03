/* ==========================================================================
   51 · HUD — clock dial, speed, needs, weight, noise, floors, lights, buttons
   Built once, refreshed ~8×/s.
   ========================================================================== */

const Noise = {
  /** Current noise radius (m). Inside the house sound has no gameplay effect (§8.3). */
  level(d) {
    if (!d) return 0;
    if (Noise.indoors(d)) return 0;
    const m = d._moving;
    let r = m === 'run' ? 12 : m === 'walk' ? 4 : m === 'sneak' ? 1.2 : 0;
    const ch = new Character(d);
    if (ch.load() > 1) r *= 1.3;
    if (m === 'sneak') r *= 1 - ch.skill('stealth') * 0.05;
    return r;
  },
  indoors(d) { return !!(Scene.W && Scene.W.isIndoor(d.pos.x, d.pos.z, d.pos.floor)); },
};

const HUD = {
  els: {},
  build() {
    const root = U.$('#hud');
    root.innerHTML = '';
    const e = this.els;
    // Clock
    e.dial = U.el('div.dial', { html: this.dialSVG() });
    e.day = U.el('div.day');
    e.time = U.el('div.time');
    e.phase = U.el('div.phase');
    e.speed = U.el('div.speed');
    CFG.SPEEDS.forEach((_, i) => e.speed.appendChild(U.el('button.spd', { 'data-i': i, title: STR.speedNames[i], on: { click: () => GameClock.setSpeed(i) } }, STR.speedNames[i])));
    const clock = U.el('div.panel.clock', null, e.dial, U.el('div.clockinfo', null, e.day, e.time, e.phase), e.speed);
    // Needs
    e.needs = {};
    const needBox = U.el('div.panel.needs');
    for (const [k, label, col] of [['satiety', STR.needSatiety, '#d9a441'], ['hydration', STR.needHydration, '#4fa3d1'], ['energy', STR.needEnergy, '#9a7fd1'], ['health', STR.needHealth, '#d65a5a'], ['stamina', STR.needStamina, '#7fbf5f']]) {
      const fill = U.el('i', { style: { background: col } });
      const val = U.el('em');
      needBox.appendChild(U.el('div.need', { title: label }, U.el('span', null, label), U.el('div.bar', null, fill), val));
      e.needs[k] = { fill, val };
    }
    e.weight = U.el('div.wline');
    e.ration = U.el('div.rationsel');
    e.ill = U.el('div.ill');
    e.noise = U.el('div.noise', null, U.el('span', null, STR.noise), U.el('div.nbar', null, U.el('i')), U.el('em'));
    needBox.append(e.weight, e.noise, e.ration, e.ill);
    // Right column: cash, floors, lights, power
    e.place = U.el('div.place');
    e.cash = U.el('div.cash');
    e.floors = U.el('div.floors');
    [[1, STR.floors[1]], [0, STR.floors[0]]].forEach(([f, label]) => e.floors.appendChild(U.el('button.fl', { 'data-f': f, on: { click: () => { Render.cam.follow = false; Render.setViewFloor(f); } } }, label)));
    e.floors.appendChild(U.el('button.fl.locked', { disabled: true, title: STR.basementLocked }, STR.basementLocked));
    e.lights = U.el('button.btn.sm', { on: { click: () => { S.home.lightsOn = !S.home.lightsOn; } } });
    e.power = U.el('div.power');
    const side = U.el('div.panel.side', null, e.place, e.cash, e.floors, U.el('div.row', null, e.lights), e.power);
    // Bottom bar
    const bar = U.el('div.panel.bottombar', null,
      U.el('button.btn', { on: { click: () => InvUI.toggle() } }, '🎒 ' + STR.btnInventory),
      U.el('button.btn', { on: { click: () => MapUI.open(false) } }, '🗺 ' + STR.btnMap),
      U.el('button.btn', { on: { click: () => MealUI.open() } }, '🍚 ' + STR.btnEatMeal),
      U.el('button.btn', { on: { click: () => CookUI.open() } }, '🍳 ' + STR.btnCook),
      U.el('button.btn', { on: { click: () => StockUI.open() } }, '📦 ' + STR.btnStock),
      U.el('button.btn', { on: { click: () => NutritionUI.open() } }, '🥗 ' + STR.btnNutrition),
      U.el('button.btn', { on: { click: () => SkillsUI.open() } }, '📈 ' + STR.btnSkills),
      U.el('button.btn', { on: { click: () => LogUI.open() } }, '📜 ' + STR.btnLog),
      U.el('button.btn', { on: { click: () => HelpUI.open() } }, '⌨ ' + STR.btnHelp),
      U.el('button.btn', { on: { click: () => { if (Save.saveRun('manual')) Toast.show(STR.saved, 'info', 1800); } } }, '💾 ' + STR.btnSave),
      U.el('button.btn', { on: { click: () => PauseMenu.open() } }, '☰ ' + STR.btnMenu),
    );
    e.hint = U.el('div.hint');
    e.sleep = U.el('div.sleepover', { hidden: true, on: { click: () => GameClock.endSleep('manual') } }, STR.sleeping);
    e.fps = U.el('div.fps', { hidden: !P.settings.fps });
    root.append(clock, needBox, side, bar, e.hint, e.sleep, e.fps);
  },
  dialSVG() {
    // 24h dial: night arc (18:30–06:00) shaded, hour ticks, a hand.
    const ticks = [];
    for (let h = 0; h < 24; h++) {
      const a = (h / 24) * Math.PI * 2 - Math.PI / 2, r1 = h % 6 === 0 ? 30 : 33, r2 = 36;
      ticks.push(`<line x1="${40 + Math.cos(a) * r1}" y1="${40 + Math.sin(a) * r1}" x2="${40 + Math.cos(a) * r2}" y2="${40 + Math.sin(a) * r2}" stroke="#c9b38a" stroke-width="${h % 6 === 0 ? 2 : 1}"/>`);
    }
    const arc = (h0, h1, col) => {
      const a0 = (h0 / 24) * Math.PI * 2 - Math.PI / 2, a1 = (h1 / 24) * Math.PI * 2 - Math.PI / 2;
      const large = ((h1 - h0 + 24) % 24) > 12 ? 1 : 0;
      return `<path d="M40 40 L${40 + Math.cos(a0) * 28} ${40 + Math.sin(a0) * 28} A28 28 0 ${large} 1 ${40 + Math.cos(a1) * 28} ${40 + Math.sin(a1) * 28} Z" fill="${col}"/>`;
    };
    return `<svg viewBox="0 0 80 80" width="78" height="78"><circle cx="40" cy="40" r="38" fill="#14110d" stroke="#5a4a32" stroke-width="2"/>${arc(6, 18.5, '#3a3020')}${arc(18.5, 6, '#121a2a')}${ticks.join('')}<text x="40" y="15" fill="#e8d6b0" font-size="7" text-anchor="middle">0</text><text x="40" y="70" fill="#e8d6b0" font-size="7" text-anchor="middle">12</text><line id="dialHand" x1="40" y1="40" x2="40" y2="9" stroke="#ffb347" stroke-width="2.5" stroke-linecap="round"/><circle cx="40" cy="40" r="3" fill="#ffb347"/></svg>`;
  },
  update() {
    if (!S) return;
    const e = this.els, d = S.chars[S.active], ch = new Character(d);
    const t = U.timeOf(S.time.min);
    const hand = U.$('#dialHand');
    if (hand) hand.setAttribute('transform', `rotate(${(t.dayMin / 1440) * 360} 40 40)`);
    e.day.textContent = STR.day + ' ' + t.day;
    e.time.textContent = t.hhmm;
    e.phase.textContent = S.flags.outbreak ? STR.outbreakStarted : STR.outbreakIn(U.dur(CFG.OUTBREAK_MINUTE - S.time.min));
    e.phase.className = 'phase ' + (S.flags.outbreak ? 'bad' : 'calm');
    for (const b of e.speed.children) b.classList.toggle('on', +b.dataset.i === S.time.speedIdx && GameClock.sleepUntil == null);
    const vals = { satiety: d.needs.satiety, hydration: d.needs.hydration, energy: d.needs.energy, health: ch.health(), stamina: d.needs.stamina };
    for (const k in vals) {
      const v = vals[k];
      e.needs[k].fill.style.width = v + '%';
      e.needs[k].val.textContent = Math.round(v);
      e.needs[k].fill.parentElement.classList.toggle('low', v < 25);
    }
    const rk = d.nut.ration;
    if (e.ration.dataset.k !== rk) {
      e.ration.dataset.k = rk; e.ration.innerHTML = '';
      e.ration.append(U.el('span', null, STR.rationShort), ...Object.entries(RATIONS).map(([k, r]) => U.el('button.rb' + (k === rk ? '.on' : ''), { title: Math.round(r.f * 100) + '%', on: { click: () => { d.nut.ration = k; } } }, r.name)));
    }
    const stg = Body.stage(d);
    e.ill.textContent = [stg.key !== 'normal' ? '⚠ ' + stg.name : '', ...d.ill.map((x) => '🤢 ' + STR.illName[x.type]), ...Body.deficient(d).map((g) => '↓' + STR[g])].filter(Boolean).join(' · ');
    const load = ch.load();
    e.weight.textContent = STR.weight + ' ' + U.kg(ch.carried()) + ' / ' + ch.capacity().toFixed(1) + ' กก.' + (load > 1.5 ? ' · ' + STR.immobile : load > 1 ? ' · ' + STR.overloaded : '');
    e.weight.className = 'wline ' + (load > 1.5 ? 'bad' : load > 1 ? 'warn' : '');
    const nz = Noise.level(d), indoors = Noise.indoors(d);
    e.noise.querySelector('i').style.width = Math.min(100, (nz / 15) * 100) + '%';
    e.noise.querySelector('em').textContent = indoors ? STR.noiseIndoor : Math.round(nz) + ' ม.';
    e.cash.textContent = STR.cash + ' ' + U.money(S.cash);
    for (const b of e.floors.querySelectorAll('.fl[data-f]')) b.classList.toggle('on', +b.dataset.f === Render.viewFloor);
    e.floors.hidden = !Scene.isHome();
    e.lights.hidden = !Scene.isHome();
    e.place.textContent = locDef(S.scene).icon + ' ' + locDef(S.scene).name + (!Scene.isHome() && !S.flags.outbreak && !shopOpen(S.scene, S.time.min) ? ' · ' + STR.shopClosedNow : '');
    const pst = Power.stage(), pon = Power.gridOn();
    e.power.textContent = '⚡ ' + (pst === 'failed' ? STR.powerFailed : !pon ? STR.powerOff : pst === 'brownout' ? STR.powerBrownout : STR.powerOk);
    e.power.className = 'power ' + (pst === 'failed' || !pon ? 'bad' : pst === 'brownout' ? 'warn' : '');
    e.lights.textContent = '💡 ' + STR.lights + ': ' + (S.home.lightsOn ? STR.lightsOn : STR.lightsOff);
    e.sleep.hidden = GameClock.sleepUntil == null;
    if (!e.fps.hidden) e.fps.textContent = `${Math.round(Render.fps.value)} FPS · ${Render.fps.ms.toFixed(1)} ms · ${Render.q.key} · calls ${Render.renderer.info.render.calls} · tris ${(Render.renderer.info.render.triangles / 1000).toFixed(0)}k`;
  },
  setHint(text) { this.els.hint.textContent = text || ''; this.els.hint.style.opacity = text ? 1 : 0; },
  toggleFps() { P.settings.fps = !P.settings.fps; this.els.fps.hidden = !P.settings.fps; Save.saveProfile(); },
};
