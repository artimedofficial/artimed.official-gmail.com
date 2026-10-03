/* ==========================================================================
   56 · FOOD UI — eat panel (portion buttons), Eat Meal preview, nutrition
   panel, stock overview, cooking, generator / load management, appliance
   install & delivery ordering, freezer placement warnings.
   ========================================================================== */

const FoodFmt = {
  stageName(it) { return STR.stage[Food.stage(it)] || ''; },
  /** Freshness line for tooltips, in the context of the container's environment. */
  freshLine(it, c) {
    const d = itemDef(it.id);
    if (!d.per) return '';
    if (Food.ruined(it)) return `<div class="tt-r bad"><span>${STR.stage.ruined}</span><b>${it.st.ruined === 'burst' ? STR.ruinedBurst : ''}</b></div>`;
    const env = Spoil.envOf(c);
    const frz = it.frz || 0;
    if (frz >= 0.99) return `<div class="tt-r frozen"><span>❄ ${STR.frozenState}</span><b>${STR.noSpoil}</b></div>`;
    const rows = [];
    if (frz > 0) rows.push(`<div class="tt-r frozen"><span>${STR.thawing}</span><b>${Math.round((1 - frz) * 100)}%</b></div>`);
    const st = Food.stage(it);
    const lifeH = Spoil.lifeH(d, it, env === 'freezer' ? 'fridge' : env);
    const rem = (FRESH.spoiled - (it.age || 0)) * lifeH;
    const cls = st === 'fresh' ? '' : st === 'aging' ? 'warn' : 'bad';
    rows.push(`<div class="tt-r ${cls}"><span>${STR.stage[st]}</span><b>${rem > 0 ? STR.leftTime(U.dur(rem * 60)) : STR.pastDue}</b></div>`);
    rows.push(`<div class="tt-sub">${STR.envName[env]}${it.st && it.st.soft ? ' · ' + STR.softTexture : ''}${it.st && it.st.thawedRaw ? ' · ' + STR.noRefreeze : ''}${Food.isRaw(it) ? ' · ' + STR.rawCook : ''}</div>`);
    return rows.join('');
  },
};

/** Per-item eat dialog with ¼ / ½ / 1 portion / All quick choices (§6.5.2). */
const EatUI = {
  open(c, slot) {
    const ch = activeChar(), it = slot.it, d = itemDef(it.id);
    const why = Food.blockReason(it);
    if (why) { Toast.show(why, 'warn'); return; }
    const total = Food.total(it), left = Food.left(it), per = Food.per(it);
    const opts = [];
    const add = (label, n) => { if (n >= 1 && n <= left && !opts.some((o) => o.n === n)) opts.push({ label, n }); };
    add(STR.eat1, 1);
    add('¼ ' + STR.ofPack, Math.max(1, Math.round(total / 4)));
    add('½ ' + STR.ofPack, Math.max(1, Math.round(total / 2)));
    add(STR.eatAll + ' (' + left + ')', left);
    const risk = Food.risk(it);
    const body = U.el('div.eatbox', null,
      U.el('div.eathead', null, U.el('img', { src: Icons.get(it.id, Food.isOpened(it)) }), U.el('div', null, U.el('b', null, Food.label(it)), U.el('div.dim', null, STR.portionsLeft(left, total)))),
      U.el('div.dim', null, STR.perPortionLine(per)),
      risk > 0.05 ? U.el('p.warn', null, STR.riskWarn(Math.round(risk * 100))) : null,
      U.el('div.eatbtns', null, ...opts.map((o) => U.el('button.btn' + (o.n === 1 ? '.primary' : ''), { on: { click: () => { Modal.close(); Food.eat(ch, c, slot, o.n); InvUI.isOpen && InvUI.changed(); } } }, o.label + ' · ' + Math.round(per.kcal * o.n) + ' kcal'))),
    );
    Modal.open({ title: (d.cat === 'drink' ? STR.drink : STR.eat) + ' — ' + d.name, body });
  },
};

/** Eat Meal preview with swap / adjust before confirming (§6.5.4). */
const MealUI = {
  open() {
    const ch = activeChar();
    if (ch.d.sleeping) return;
    const plan = Meal.plan(ch);
    let rows = plan.rows.map((r) => ({ e: r.e, n: r.n }));
    const body = U.el('div.meal');
    const render = () => {
      body.innerHTML = '';
      const t = Meal.totals(rows);
      body.appendChild(U.el('div.mealhead', null, STR.mealTarget(Math.round(plan.target), RATIONS[ch.d.nut.ration].name)));
      if (!rows.length) body.appendChild(U.el('p.warn', null, STR.mealNothing));
      const list = U.el('div.mealrows');
      rows.forEach((r, i) => {
        const d = itemDef(r.e.it.id), st = Food.stage(r.e.it);
        list.appendChild(U.el('div.mealrow', null,
          U.el('img', { src: Icons.get(r.e.it.id, Food.isOpened(r.e.it)) }),
          U.el('span.mn', null, d.name, Food.isOpened(r.e.it) ? U.el('em.tag', null, STR.suffixOpened) : null, st === 'aging' ? U.el('em.tag.warn', null, STR.useSoon) : null),
          U.el('span.mk', null, Math.round(r.e.per.kcal * r.n) + ' kcal'),
          U.el('button.btn.xs', { on: { click: () => { r.n = Math.max(0, r.n - 1); if (!r.n) rows.splice(i, 1); render(); } } }, '−'),
          U.el('b', null, r.n),
          U.el('button.btn.xs', { disabled: r.n >= r.e.avail, on: { click: () => { r.n++; render(); } } }, '+')));
      });
      body.appendChild(list);
      const unused = plan.cands.filter((e) => !rows.some((r) => r.e === e));
      if (unused.length) {
        body.appendChild(U.el('select.sel', { on: { change: (ev) => { const e = unused[+ev.target.value]; if (e) { rows.push({ e, n: 1 }); render(); } } } },
          U.el('option', { value: '' }, STR.mealAdd), ...unused.map((e, i) => U.el('option', { value: i }, itemDef(e.it.id).name + ' · ' + Math.round(e.per.kcal) + ' kcal/ส่วน'))));
      }
      body.appendChild(U.el('div.mealtot', null,
        `${Math.round(t.kcal)} kcal · ${STR.protein} ${Math.round(t.protein)} ก. · ${STR.carb} ${Math.round(t.carb)} ก. · ${STR.fat} ${Math.round(t.fat)} ก. · ${STR.micro} ${t.micro.toFixed(1)}`));
    };
    render();
    Modal.open({ title: STR.eatMeal, body, wide: true, actions: [
      { label: STR.cancel },
      { label: STR.eatConfirm, primary: true, fn: () => { const n = Meal.eat(ch, rows.filter((r) => r.n > 0)); if (InvUI.isOpen) InvUI.changed(); Toast.show(n ? STR.mealDone(n) : STR.mealNothing, n ? 'good' : 'warn'); } },
    ] });
  },
};

/** Nutrition panel: buffers, energy reserve and trend, ration, auto meals, conditions (§6.5.8). */
const NutritionUI = {
  open() {
    const ch = activeChar(), d = ch.d, n = d.nut;
    const body = U.el('div.nutri');
    const st = Body.stage(d), fx = Body.effects(d);
    body.appendChild(U.el('div.nstage.' + st.key, null, STR.bodyState + ': ', U.el('b', null, st.name), ' · ' + STR.reserveLine(Math.round(n.reserve))));
    const bars = U.el('div.nbufs');
    for (const g of ['protein', 'carb', 'fat', 'micro']) {
      const v = n.buf[g];
      bars.appendChild(U.el('div.nbuf' + (v < NUTRITION.lowDays ? '.low' : ''), null, U.el('span', null, STR[g]), U.el('div.bar', null, U.el('i', { style: { width: (v / NUTRITION.bufferDays) * 100 + '%' } })), U.el('em', null, v.toFixed(1) + ' / 7 วัน')));
    }
    body.appendChild(U.el('h4', null, STR.buffers7d)); body.appendChild(bars);
    const h = n.hist.slice(-7);
    const trend = U.el('div.ntrend');
    const max = Math.max(1, ...h.map((x) => Math.max(x.in, x.out)), n.today.in, n.today.out);
    for (const x of [...h, { day: 'วันนี้', in: n.today.in, out: n.today.out }]) {
      trend.appendChild(U.el('div.ncol', { title: `${Math.round(x.in)} / ${Math.round(x.out)} kcal` }, U.el('i.in', { style: { height: (x.in / max) * 60 + 'px' } }), U.el('i.out', { style: { height: (x.out / max) * 60 + 'px' } }), U.el('small', null, typeof x.day === 'number' ? 'ว.' + x.day : x.day)));
    }
    body.append(U.el('h4', null, STR.energyTrend), trend, U.el('div.dim', null, STR.trendLegend));
    body.append(U.el('h4', null, STR.effectsTitle), U.el('div.fx', null,
      `${STR.fxCarry} ×${fx.carry.toFixed(2)} · ${STR.fxSpeed} ×${fx.speed.toFixed(2)} · ${STR.fxHeal} ×${fx.heal.toFixed(2)} · ${STR.fxSkill} ×${fx.skill.toFixed(2)} · ${STR.fxStamina} ${fx.staminaMax} · ${STR.fxInfect} ×${fx.infection.toFixed(2)}`));
    if (d.ill.length) body.appendChild(U.el('p.warn', null, d.ill.map((x) => STR.illName[x.type] + ' (' + Math.round(x.sev * 100) + '%, ~' + Math.round(x.h) + ' ชม.)').join(', ')));
    body.append(U.el('h4', null, STR.rationTitle), RationUI.selector(() => { Modal.close(); this.open(); }),
      U.el('label.chk', null, U.el('input', { type: 'checkbox', checked: n.auto, on: { change: (e) => { n.auto = e.target.checked; } } }), STR.autoMeals));
    Modal.open({ title: STR.nutritionTitle, body, wide: true, actions: [{ label: STR.eatMeal, primary: true, fn: () => { Modal.close(); MealUI.open(); return false; } }, { label: STR.close }] });
  },
};

const RationUI = {
  selector(after) {
    const d = S.chars[S.active];
    const row = U.el('div.rations');
    for (const [k, r] of Object.entries(RATIONS)) row.appendChild(U.el('button.btn.sm' + (d.nut.ration === k ? '.on' : ''), { title: Math.round(r.f * 100) + '%', on: { click: () => { d.nut.ration = k; if (after) after(); } } }, r.name + ' ' + Math.round(r.f * 100) + '%'));
    return row;
  },
};

/** Stock overview / Loot Spotter (§6.3). */
const StockUI = {
  gather(ch) {
    const cs = [...ch.containers()];
    for (const f of S.home.furniture) { if (f.inv) cs.push(f.inv); if (f.sub) cs.push(f.sub); }
    for (const p of S.home.piles || []) cs.push(p.inv);
    const out = { cats: {}, kcal: 0, water: 0, gasoline: 0, med: { dressing: 0, antiseptic: 0, painkiller: 0, antibiotic: 0 }, items: 0, expiring: 0 };
    const seen = new Set();
    const visit = (c) => Inv.walk(c, (it) => {
      if (seen.has(it.uid)) return; seen.add(it.uid);
      const d = itemDef(it.id); out.items += it.qty;
      out.cats[d.cat] = (out.cats[d.cat] || 0) + it.qty;
      if (d.per && !Food.ruined(it) && !['spoiled', 'rotten'].includes(Food.stage(it)) && !d.tags.includes('condiment') && !d.tags.includes('spice')) {
        const portions = Food.left(it) + (it.qty - 1) * Food.total(it);
        out.kcal += Food.per(it).kcal * portions;
        out.water += (Food.per(it).water || 0) * portions;
        if (Food.stage(it) === 'aging') out.expiring += it.qty;
      }
      if (d.fuelL) out.gasoline += (it.st && it.st.fuelLeft != null ? it.st.fuelLeft : d.fuelL) * it.qty;
      if (d.tags.includes('dressing') || d.tags.includes('bandage')) out.med.dressing += it.qty;
      if (d.tags.includes('antiseptic')) out.med.antiseptic += it.qty;
      if (d.tags.includes('painkiller')) out.med.painkiller += it.qty;
      if (d.tags.includes('antibiotic')) out.med.antibiotic += it.qty;
    });
    cs.forEach(visit);
    const g = Appliances.generator(); if (g) out.gasoline += Appliances.genState(g).fuel;
    return out;
  },
  open() {
    const ch = activeChar(), s = this.gather(ch), need = Body.need(ch.d);
    const body = U.el('div.stock');
    const days = U.el('div.sdays');
    for (const [k, r] of Object.entries(RATIONS)) {
      const v = s.kcal / (need * r.f);
      days.appendChild(U.el('div.sday' + (v < 3 ? '.low' : ''), null, U.el('span', null, STR.foodDaysAt(r.name)), U.el('b', null, v.toFixed(1) + ' ' + STR.daysUnit)));
    }
    const waterDays = s.water / 80 + (Power.waterOn() ? Infinity : 0);
    const fuelH = s.gasoline / 0.55;
    body.append(U.el('h4', null, STR.stockFood + ' (' + Math.round(s.kcal).toLocaleString() + ' kcal · ' + STR.needPerDay(Math.round(need)) + ')'), days,
      U.el('div.sgrid', null,
        U.el('div.sday' + (waterDays < 3 ? '.low' : ''), null, U.el('span', null, STR.waterDays), U.el('b', null, isFinite(waterDays) ? waterDays.toFixed(1) + ' ' + STR.daysUnit : STR.tapRunning)),
        U.el('div.sday' + (fuelH < 24 ? '.low' : ''), null, U.el('span', null, STR.fuelHours), U.el('b', null, fuelH.toFixed(1) + ' ชม. (' + s.gasoline.toFixed(1) + ' ล.)')),
        U.el('div.sday' + (S.home.gas < 15 ? '.low' : ''), null, U.el('span', null, STR.cookGas), U.el('b', null, Math.round(S.home.gas) + '%')),
        U.el('div.sday' + (s.expiring ? '.warn' : ''), null, U.el('span', null, STR.useSoon), U.el('b', null, s.expiring + ' ' + STR.pieces))),
      U.el('h4', null, STR.medStock), U.el('div.sgrid', null, ...Object.entries(s.med).map(([k, v]) => U.el('div.sday' + (v === 0 ? '.low' : ''), null, U.el('span', null, STR.medNames[k]), U.el('b', null, v)))),
      U.el('h4', null, STR.byCategory2), U.el('div.sgrid', null, ...Object.entries(s.cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => U.el('div.sday', null, U.el('span', null, CATEGORIES[k].name), U.el('b', null, v)))));
    Modal.open({ title: STR.stockTitle, body, wide: true });
  },
};

/** Cooking panel (C or stove/microwave). */
const CookUI = {
  open(prefStation) {
    const ch = activeChar();
    if (ch.d.sleeping) return;
    const stations = Cook.stations(ch);
    let station = stations.find((s) => s.id === prefStation && s.ok) || stations.find((s) => s.ok && s.id !== 'none') || stations[stations.length - 1];
    let recipe = RECIPES[0], batch = 1, longer = false, choices = [];
    const body = U.el('div.cook');
    const listEl = U.el('div.rlist'), detail = U.el('div.rdetail');
    body.append(listEl, detail);
    const pickDefaults = () => {
      choices = recipe.slots.map((sl) => { const c = Cook.candidates(ch, sl); return c.length && !sl.optional ? { entry: c[0], amt: sl.amt } : (c.length ? { entry: null, amt: sl.amt, cands: c } : { entry: null, amt: sl.amt }); });
    };
    const renderList = () => {
      listEl.innerHTML = '';
      listEl.appendChild(U.el('select.sel', { on: { change: (e) => { station = stations[+e.target.value]; renderList(); renderDetail(); } } }, ...stations.map((s, i) => U.el('option', { value: i, selected: s === station, disabled: !s.ok }, s.name + (s.ok ? '' : ' — ' + s.why)))));
      for (const r of RECIPES) {
        const can = r.station.includes(Cook.stationKind(station));
        const have = r.slots.every((sl) => sl.optional || Cook.candidates(ch, sl).length);
        listEl.appendChild(U.el('button.rbtn' + (r === recipe ? '.on' : '') + (!can || !have ? '.dim' : ''), { on: { click: () => { recipe = r; pickDefaults(); renderList(); renderDetail(); } } }, U.el('img', { src: Icons.get(r.out) }), r.name, have ? null : U.el('em', null, STR.missing)));
      }
    };
    const renderDetail = () => {
      detail.innerHTML = '';
      detail.appendChild(U.el('h3', null, recipe.name));
      detail.appendChild(U.el('div.dim', null, STR.methodName[recipe.method] + ' · ' + STR.stationsOk(recipe.station.map((s) => STR.stationName[s]).join(' / '))));
      recipe.slots.forEach((sl, i) => {
        const cands = Cook.candidates(ch, sl);
        const ch_ = choices[i] || (choices[i] = { entry: null, amt: sl.amt });
        const sel = U.el('select.sel', { on: { change: (e) => { ch_.entry = e.target.value === '' ? null : cands[+e.target.value]; renderDetail(); } } },
          sl.optional ? U.el('option', { value: '' }, STR.skipOpt) : null,
          ...cands.map((e, k) => U.el('option', { value: k, selected: ch_.entry === e || (ch_.entry && ch_.entry.it.uid === e.it.uid) }, itemDef(e.it.id).name + (Food.isOpened(e.it) ? ' (' + STR.suffixOpened + ')' : '') + ((e.it.frz || 0) > 0.3 ? ' ❄' : '') + ' · ' + e.avail + ' ' + STR.portionUnit)));
        if (ch_.entry) ch_.entry = cands.find((e) => e.it.uid === ch_.entry.it.uid) || null;
        const amtRow = ch_.entry ? U.el('span.amt', null,
          U.el('button.btn.xs', { on: { click: () => { ch_.amt = Math.max(1, ch_.amt - 1); renderDetail(); } } }, '−'),
          U.el('b', null, ch_.amt * batch + ' ' + STR.portionUnit),
          U.el('button.btn.xs', { on: { click: () => { ch_.amt = Math.min(Math.floor(ch_.entry.avail / batch), ch_.amt + 1); renderDetail(); } } }, '+')) : null;
        detail.appendChild(U.el('div.slot' + (!cands.length && !sl.optional ? '.miss' : ''), null, U.el('span.sl', null, sl.label + (sl.optional ? ' (' + STR.optional + ')' : '')), cands.length ? sel : U.el('em', null, STR.noneAvailable), amtRow));
      });
      detail.appendChild(U.el('div.row', null, STR.batch + ':', ...[1, 2, 3, 4].map((b) => U.el('button.btn.xs' + (b === batch ? '.on' : ''), { on: { click: () => { batch = b; renderDetail(); } } }, '×' + b)),
        U.el('label.chk', null, U.el('input', { type: 'checkbox', checked: longer, on: { change: (e) => { longer = e.target.checked; renderDetail(); } } }), STR.cookLonger)));
      const pv = Cook.preview(ch, recipe, choices, batch, station, longer);
      if (!pv.ok) detail.appendChild(U.el('p.warn', null, pv.why));
      else {
        detail.appendChild(U.el('div.pv', null,
          U.el('div', null, STR.cookOut(itemDef(recipe.out).name, pv.outPortions), ' · ', STR.cookTime(pv.minutes)),
          U.el('div.dim', null, STR.perPortionLine(pv.per)),
          U.el('div.dim', null, STR.qualityLine(Math.round(pv.quality * 100)) + (pv.water ? ' · ' + STR.waterUse(pv.water) : '') + (pv.frozen ? ' · ' + STR.fromFrozen : '')),
          pv.risk > 0.05 ? U.el('p.warn', null, STR.riskWarn(Math.round(pv.risk * 100))) : null));
      }
      detail.appendChild(U.el('button.btn.primary', { disabled: !pv.ok, on: { click: () => { if (Cook.make(ch, recipe, choices, batch, station, longer)) { Toast.show(STR.cookedToast(recipe.name), 'good'); pickDefaults(); renderList(); renderDetail(); } } } }, '🍳 ' + STR.cookBtn));
    };
    pickDefaults(); renderList(); renderDetail();
    Modal.open({ title: STR.cookTitle, body, wide: true, cls: 'cookmodal' });
  },
};

/** Generator & load management (§9.2). */
const GenUI = {
  open() {
    const g = Appliances.generator(); if (!g) return;
    const st = Appliances.genState(g), ch = activeChar();
    const body = U.el('div.gen');
    const render = () => {
      body.innerHTML = '';
      const a = Appliances.allocation();
      body.append(
        U.el('div.tt-r', null, U.el('span', null, STR.genStatus), U.el('b', null, st.on ? STR.genOn : STR.genOff)),
        U.el('div.tt-r', null, U.el('span', null, STR.genFuel), U.el('b', null, st.fuel.toFixed(1) + ' / ' + FURNITURE.generator.tankL + ' ล.')),
        U.el('div.tt-r', null, U.el('span', null, STR.gridState), U.el('b', null, Power.gridOn() ? STR.powerOk : STR.powerOff)),
        U.el('div.tt-r', null, U.el('span', null, STR.genLoad), U.el('b', null, a.watts + ' / ' + a.cap + ' W')),
        g.slot === 'G1' ? U.el('p.warn', null, STR.genOutdoorNoise) : U.el('p.dim', null, STR.genIndoor),
        U.el('div.row', null,
          U.el('button.btn' + (st.on ? '' : '.primary'), { on: { click: () => { Appliances.setGen(!st.on); render(); } } }, st.on ? STR.genStop : STR.genStart),
          U.el('button.btn', { on: { click: () => { const l = Appliances.refuel(ch); Toast.show(l ? STR.genRefuel(l.toFixed(1)) : STR.noGasoline, l ? 'good' : 'warn'); render(); } } }, '⛽ ' + STR.genRefuelBtn)),
        U.el('h4', null, STR.loadPanel));
      for (const c of Appliances.consumers()) {
        body.appendChild(U.el('label.chk', null, U.el('input', { type: 'checkbox', checked: Appliances.loadOn(c.key), on: { change: (e) => { S.home.loads[c.key] = e.target.checked; render(); } } }), c.name + ' · ' + c.watts + ' W' + (a.set.has(c.key) ? ' ⚡' : '')));
      }
    };
    render();
    Modal.open({ title: FURNITURE.generator.name, body });
  },
};

/** Install an appliance item into a free home slot. */
const InstallUI = {
  open(c, slot) {
    const d = itemDef(slot.it.id), type = d.installs;
    if (S.scene !== 'home') { Toast.show(STR.installHomeOnly, 'warn'); return; }
    const free = HomeInstall.freeSlots(HomeInstall.slotKind(type));
    if (!free.length) { Toast.show(STR.noFreeSlot, 'warn'); return; }
    const body = U.el('div.sleepopts', null, U.el('p.dim', null, STR.installTime(FURNITURE[type].install || 30)), ...free.map((s) => U.el('button.mbtn', { on: { click: () => { Modal.close(); if (HomeInstall.installItem(activeChar(), c, slot, s.id)) { Toast.show(STR.installed(FURNITURE[type].name), 'good'); if (InvUI.isOpen) InvUI.changed(); } } } }, s.name)));
    Modal.open({ title: STR.installTitle + ' — ' + FURNITURE[type].name, body });
  },
};

/** Appliance ordering with delivery at a shop counter (pre-outbreak). */
const DeliveryUI = {
  open() {
    const list = DELIVERY[S.scene];
    if (!list || S.flags.outbreak) return;
    const body = U.el('div.deliv', null, U.el('p.dim', null, STR.deliveryNote(U.money(DELIVERY.fee), Math.round(DELIVERY.delayMin / 60))));
    for (const [id, price] of list) {
      const type = itemDef(id).installs;
      const free = HomeInstall.freeSlots(HomeInstall.slotKind(type)).filter((s) => !S.deliveries.some((x) => x.slot === s.id));
      const sel = U.el('select.sel', null, ...free.map((s) => U.el('option', { value: s.id }, s.name)));
      body.appendChild(U.el('div.drow', null, U.el('img', { src: Icons.get(id) }), U.el('div', null, U.el('b', null, itemDef(id).name), U.el('div.dim', null, U.money(price) + ' + ' + STR.fee + ' ' + U.money(DELIVERY.fee))),
        free.length ? sel : U.el('em.warn', null, STR.noFreeSlot),
        U.el('button.btn.primary', { disabled: !free.length, on: { click: () => { if (HomeInstall.order(id, price, sel.value)) { Toast.show(STR.orderedToast, 'good'); Modal.close(); } } } }, STR.orderBtn)));
    }
    Modal.open({ title: STR.deliveryTitle, body, wide: true });
  },
};

/** Freezer placement rules (§6.6.5, §6.6.6). Returns 'ok' | 'warn' | 'block'. */
const FreezeRules = {
  check(it, c) {
    if (!c || c.temp !== 'freezer') return 'ok';
    let worst = 'ok';
    const visit = (x) => {
      const d = itemDef(x.id);
      if (x.inv) x.inv.slots.forEach((s) => visit(s.it));
      if (!d.per || Food.ruined(x)) return;
      if (x.st && x.st.thawedRaw && !x.st.cooked) worst = 'block';
      else if (d.freeze === 'no' && worst !== 'block') worst = 'warn';
    };
    visit(it);
    return worst;
  },
  /** Run cb() if placement is acceptable, after a confirmation for risky items. */
  guard(it, c, cb) {
    const r = this.check(it, c);
    if (r === 'block') { Toast.show(STR.noRefreezeMsg, 'bad', 5000); return; }
    if (r === 'warn') { Modal.confirm(STR.freezeWarnTitle, STR.freezeWarn(itemDef(it.id).name), cb, STR.freezeAnyway, true); return; }
    cb();
  },
};
