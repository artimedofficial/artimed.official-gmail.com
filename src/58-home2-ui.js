/* ==========================================================================
   58 · PHASE 2B UI — arrange/build furniture (K), garden · water · weather (G)
   ========================================================================== */

const ArrangeUI = {
  open() {
    if (!Scene.isHome()) { Toast.show(STR.buildHomeOnly, 'warn'); return; }
    const ch = activeChar();
    const body = U.el('div.arrange');
    body.appendChild(U.el('p.dim', null, STR.arrIntro));
    // Build from materials
    body.appendChild(U.el('h4', null, STR.arrBuildTitle));
    for (const r of CRAFT_FURN) {
      const def = FURNITURE[r.type], miss = Arrange.missing(ch, r);
      body.appendChild(U.el('div.arow', null,
        U.el('b', null, def.name),
        U.el('span.small', null, r.uses.map(([id, n]) => itemDef(id).name + ' ×' + n).join(' + ') + ' · ' + STR.arrTools(r.tools.map((t) => itemDef(t).name).join(', ')) + ' · ' + U.dur(r.min)),
        U.el('span.small.dim', null, def.farm ? STR.arrFarmInfo(def.farm.beds) : def.grid ? STR.arrStoreInfo(def.grid[0] * def.grid[1], def.limit) : ''),
        miss.length ? U.el('em.warn.small', null, STR.arrMissing(miss.join(', '))) : null,
        U.el('button.btn.sm' + (miss.length ? '' : '.primary'), { disabled: !!miss.length, on: { click: () => { Modal.close(); Arrange.build(r); } } }, STR.arrPlaceBtn)));
    }
    // Installable items the character carries or keeps at home
    const inst = [];
    const seen = new Set();
    const scan = (c) => Inv.walk(c, (it, cc, slot) => { const d = itemDef(it.id); if (d.installs && !seen.has(it.id)) { seen.add(it.id); inst.push({ c: cc, slot, d }); } });
    for (const c of ch.containers()) scan(c);
    for (const f of S.home.furniture) if (f.inv) scan(f.inv);
    for (const p of S.home.piles) scan(p.inv);
    body.appendChild(U.el('h4', null, STR.arrInstallTitle));
    if (!inst.length) body.appendChild(U.el('p.dim', null, STR.arrNoInstall));
    for (const x of inst) {
      body.appendChild(U.el('div.arow', null, U.el('img', { src: Icons.get(x.d.id), width: 32, height: 32 }), U.el('b', null, x.d.name),
        U.el('button.btn.sm.primary', { on: { click: () => { Modal.close(); Arrange.installItem(x.c, x.slot); } } }, STR.arrPlaceBtn)));
    }
    body.appendChild(U.el('p.dim', null, STR.arrMoveHelp));
    Modal.open({ title: STR.arrTitle, body, wide: true });
  },
};

const FarmUI = {
  tab: 'plots',
  open(tab, focus) {
    if (tab) this.tab = tab;
    const body = U.el('div.farm');
    const tabs = U.el('div.tabs', null, ...[['plots', STR.tabPlots], ['water', STR.tabWater], ['weather', STR.tabWeather]].map(([k, l]) =>
      U.el('button.tab' + (k === this.tab ? '.on' : ''), { on: { click: () => { this.tab = k; render(); } } }, l)));
    const pane = U.el('div.fpane');
    const render = () => {
      for (const b of tabs.children) b.classList.toggle('on', b.textContent === { plots: STR.tabPlots, water: STR.tabWater, weather: STR.tabWeather }[this.tab]);
      pane.innerHTML = '';
      if (this.tab === 'plots') this.plots(pane, focus, render);
      else if (this.tab === 'water') this.water(pane, render);
      else this.weather(pane);
    };
    body.append(tabs, pane);
    render();
    Modal.open({ title: STR.farmTitle, body, wide: true });
  },
  bar(v, cls) { return U.el('div.mbar' + (cls ? '.' + cls : ''), null, U.el('i', { style: { width: Math.round(U.clamp(v, 0, 1) * 100) + '%' } })); },
  plots(pane, focus, render) {
    const ch = activeChar(), list = Farm.plots();
    if (!Scene.isHome()) pane.appendChild(U.el('p.warn', null, STR.farmAwayNote));
    if (!list.length) { pane.appendChild(U.el('p.dim', null, STR.noPlots)); return; }
    const wx = Weather.now();
    pane.appendChild(U.el('p.dim', null, STR.farmSkill(Farm.lv(ch), Math.round(Farm.lv(ch) * FARM.skillGrow * 100), Math.round(Farm.lv(ch) * FARM.skillYield * 100))));
    const sorted = focus ? [focus, ...list.filter((f) => f !== focus)] : list;
    for (const f of sorted) {
      const fm = f.farm, light = Farm.light(f, wx), out = !Arrange.indoor(f.floor, f.x, f.z);
      const card = U.el('div.fcard' + (f === focus ? '.focus' : ''));
      card.appendChild(U.el('div.fhead', null, U.el('b', null, f.label), U.el('span.dim', null, ' · ' + (out ? STR.plotOutdoor : STR.plotIndoor) + ' · ' + STR.lightLabel(Math.round(light * 100))),
        Scene.isHome() ? U.el('button.btn.xs', { on: { click: () => { Modal.close(); Scene.doAction(f, 'waterPlot'); } } }, '💧 ' + STR.waterPlotAct + ' (' + Farm.waterNeed(f).toFixed(1) + ' ล.)') : null));
      card.appendChild(U.el('div.frow', null, U.el('span', null, STR.moisture), this.bar(fm.moist, fm.moist < FARM.wetLow ? 'bad' : fm.moist < FARM.wetOk ? 'warn' : 'ok'), U.el('span.small', null, Math.round(fm.moist * 100) + '%')));
      if (light < 0.3) card.appendChild(U.el('p.warn.small', null, STR.tooDark));
      fm.plots.forEach((p, i) => {
        const row = U.el('div.plot');
        if (!p) {
          row.append(U.el('span.dim', null, STR.plotEmpty(i + 1)));
          if (Scene.isHome()) row.appendChild(U.el('button.btn.xs', { on: { click: () => this.plantMenu(f, i, render) } }, '🌱 ' + STR.plantAct));
        } else {
          const C = CROPS[p.crop], st = Farm.stage(p);
          const left = st === 4 ? STR.readyNow : st === 5 ? STR.cropDead : STR.daysLeft(Farm.daysLeft(f, p));
          row.append(U.el('b', null, C.name), U.el('span.small', null, ' ' + STR.stageName[st] + ' · ' + left + (p.n ? ' · ' + STR.harvestN(p.n, C.harvests) : '')),
            U.el('span.small.dim', null, STR.plantHealth), this.bar(p.hp, p.hp < 0.4 ? 'bad' : p.hp < 0.75 ? 'warn' : 'ok'),
            U.el('span.small.dim', null, STR.growth), this.bar(p.g, 'grow'));
          if (Scene.isHome() && st === 4) row.appendChild(U.el('button.btn.xs.primary', { on: { click: () => { Modal.close(); Scene.doAction(f, 'harvest'); } } }, '🧺 ' + STR.harvestAct));
          if (Scene.isHome() && st === 5) row.appendChild(U.el('button.btn.xs', { on: { click: () => { Farm.clear(f, i); render(); } } }, STR.clearPlot));
        }
        card.appendChild(row);
      });
      pane.appendChild(card);
    }
  },
  /** Choose a seed for a plot (walks there and plants). */
  plantMenu(f, idx, rerender) {
    const ch = activeChar(), have = Farm.seedsHave(ch), kind = Farm.kind(f);
    const i = idx == null ? Farm.free(f) : idx;
    if (i < 0) { Toast.show(STR.plotTaken, 'warn'); return; }
    const body = U.el('div.sleepopts');
    body.appendChild(U.el('p.dim', null, STR.plantHint));
    for (const [id, C] of Object.entries(CROPS)) {
      const ok = have[id] > 0 && C.beds.includes(kind);
      body.appendChild(U.el('button.mbtn' + (ok ? '' : '.dis'), { disabled: !ok, title: C.beds.includes(kind) ? '' : STR.cropWrongBed(C.name), on: { click: () => {
        Modal.closeAll();
        const ap = Scene.accessPoint(f);
        const go = () => { Farm.plant(ch, f, i, id); if (rerender) FarmUI.open('plots', f); };
        if (!ap || !Scene.avatar.goTo({ x: ap.x, z: ap.z, floor: f.floor }, 'walk', go)) go();
      } } }, C.name + ' — ' + STR.cropTime(C.days, C.regrow, C.harvests) + ' · ' + STR.seedsLeft(have[id] || 0)));
    }
    Modal.open({ title: STR.plantTitle + ' — ' + f.label, body });
  },
  water(pane, render) {
    const t = Water.totals(), ch = activeChar();
    const pts = (t.safe + t.raw) * WATER.ptsPerL / 80;
    pane.appendChild(U.el('div.sgrid', null,
      U.el('div.sday', null, U.el('span', null, STR.waterSafe), U.el('b', null, t.safe.toFixed(0) + ' ล.')),
      U.el('div.sday' + (t.raw > 0 ? '.warn' : ''), null, U.el('span', null, STR.waterRaw), U.el('b', null, t.raw.toFixed(0) + ' ล.')),
      U.el('div.sday' + (pts < 5 ? '.low' : ''), null, U.el('span', null, STR.waterDays), U.el('b', null, Power.waterOn() ? STR.tapRunning : pts.toFixed(1) + ' ' + STR.daysUnit)),
      U.el('div.sday', null, U.el('span', null, STR.tapState), U.el('b', null, Power.waterOn() ? STR.tapOn : STR.tapOff))));
    pane.appendChild(U.el('p.dim', null, STR.waterExplain(Water.hasFilter(ch) ? STR.haveFilter : STR.noFilter)));
    for (const f of Water.stores()) {
      const st = FURNITURE[f.type].store, area = Water.catchArea(f);
      pane.appendChild(U.el('div.arow', null, U.el('b', null, f.label),
        this.bar(f.water.l / st.cap, 'water'), U.el('span.small', null, Math.round(f.water.l) + ' / ' + st.cap + ' ล.' + (f.water.raw > 0.5 ? ' · ' + STR.rawShare(Math.round(f.water.raw)) : '')),
        U.el('span.small.dim', null, st.mains ? STR.mainsFed : area > 1 ? STR.catchGutter(area.toFixed(1)) : area > 0 ? STR.catchOpen(area.toFixed(2)) : STR.catchNone)));
    }
    if ((S.home.boiled || 0) > 0) pane.appendChild(U.el('div.arow', null, U.el('b', null, STR.boiledPot), U.el('span.small', null, S.home.boiled.toFixed(1) + ' / ' + WATER.boiledCap + ' ล.')));
    pane.appendChild(U.el('p.dim', null, STR.gutterTip));
    if (Scene.isHome() && Power.waterOn()) pane.appendChild(U.el('button.btn.primary', { on: { click: () => { Water.fillAll(); render(); } } }, STR.fillStoresAct));
  },
  weather(pane) {
    const wx = Weather.now(), day = Math.floor(S.time.min / 1440);
    pane.appendChild(U.el('div.wxnow', null, U.el('span.wxbig', null, STR.wxIcon[wx.kind]), U.el('div', null, U.el('b', null, STR.wxName[wx.kind] + ' · ' + Math.round(wx.temp) + '°C'),
      U.el('div.dim', null, wx.mmh >= 0.2 ? STR.rainNow(wx.mmh.toFixed(1)) : STR.cloudNow(Math.round(wx.cloud * 100))),
      U.el('div.dim', null, STR.rainEffects))));
    const forecast = S.flags.outbreak && !Power.gridOn() ? 1 : 4;   // TV forecast only while the grid is up
    pane.appendChild(U.el('h4', null, forecast > 1 ? STR.forecastTitle : STR.forecastNone));
    const tbl = U.el('table.fc');
    for (let i = 0; i < forecast; i++) {
      const n = day + i, D = Weather.day(n), mm = Weather.dayRain(n);
      tbl.appendChild(U.el('tr', null, U.el('td', null, i === 0 ? STR.today : Calendar.label(n)), U.el('td', null, mm > 0.5 ? (mm > 25 ? '⛈' : '🌧') : D.cloud > 0.5 ? '☁' : '☀'),
        U.el('td', null, Math.round(D.tmin) + '–' + Math.round(D.tmax) + '°C'), U.el('td', null, mm > 0.5 ? STR.rainMm(Math.round(mm)) : STR.noRain)));
    }
    pane.appendChild(tbl);
    pane.appendChild(U.el('p.dim', null, STR.seasonNote(MONTHS_TH[Calendar.month(day)], CLIMATE[Calendar.month(day)].mm, CLIMATE[Calendar.month(day)].days)));
  },
};
