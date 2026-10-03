/* ==========================================================================
   52 · INVENTORY UI (§6.1, §6.2) — Tetris-style grids, drag & drop with
   placement ghost, rotation (R), stacking, nested bags, equipment slots and
   click-burden reducers: Take All / Store All / by category / Auto-Sort /
   Smart loot / Shift-click / Ctrl-click / search filter.
   Opening the inventory pauses the clock: searching costs no game time.
   ========================================================================== */

const InvUI = {
  isOpen: false,
  furn: null,          // furniture being looted (or null)
  tabs: [],            // [{key, label, c}] containers on the right
  tab: 0,
  qLeft: '', qRight: '',
  gridEls: [],         // [{el, c}] for drop targeting
  drag: null,

  open(furn) {
    if (!S) return;
    const ch = activeChar();
    if (!ch || ch.d.sleeping) return;
    if (!this.isOpen) GameClock.pauseLocks++;
    this.isOpen = true;
    this.furn = furn || null;
    this.ground = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true);
    this.tabs = [];
    if (furn && furn.inv) this.tabs.push({ key: 'main', label: furn.label, c: furn.inv });
    if (furn && furn.sub) this.tabs.push({ key: 'sub', label: furn.sub.label, c: furn.sub });
    // Storage within arm's reach (same floor, ≤ 2.2 m) opens as extra tabs — no extra walking.
    for (const f of Scene.furnList()) {
      if (f === furn || !f.inv || f.floor !== ch.d.pos.floor) continue;
      if (Math.hypot(f.x - ch.d.pos.x, f.z - ch.d.pos.z) > 2.2) continue;
      this.tabs.push({ key: 'near:' + f.uid, label: f.label, c: f.inv });
      if (f.sub) this.tabs.push({ key: 'nears:' + f.uid, label: f.sub.label, c: f.sub });
    }
    this.tabs.push({ key: 'ground', label: STR.ground, c: this.ground.inv });
    this.tab = 0;
    // Opening an unpowered cold unit lets cold air out (shortens cold-hold, §6.6.3).
    if (furn) for (const c of [furn.inv, furn.sub]) {
      if (!c || c.temp === 'ambient' || c.cold == null) continue;
      const def = FURNITURE[furn.type], hold = c === furn.sub ? def.sub.hold : def.hold;
      const powered = Scene.isHome() ? Appliances.powered(furn) : Power.gridOn();
      if (!powered) c.cold = Math.max(0, c.cold - COLD_HOLD.holdLidH / (COLD_HOLD[hold] || 6));
    }
    U.$('#inv').hidden = false;
    this.render();
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    GameClock.pauseLocks = Math.max(0, GameClock.pauseLocks - 1);
    U.$('#inv').hidden = true;
    Tooltip.hide();
    Scene.syncPiles();
    Scene.avatar.refreshGear();
    Bus.emit('inv:closed');
  },
  toggle() { if (this.isOpen) this.close(); else this.open(null); },
  current() { const t = this.tabs[this.tab]; return t ? t.c : null; },
  /** Open a nested bag (from either side) as a new tab on the right. */
  openBag(it) {
    if (!it.inv) return;
    const existing = this.tabs.findIndex((t) => t.c === it.inv);
    if (existing >= 0) { this.tab = existing; this.render(); return; }
    this.tabs.push({ key: 'bag:' + it.uid, label: itemDef(it.id).name, c: it.inv, closable: true });
    this.tab = this.tabs.length - 1;
    this.render();
  },

  /* ---------- Rendering ---------- */
  render() {
    const root = U.$('#inv');
    if (!this.isOpen) return;
    const ch = activeChar();
    root.innerHTML = '';
    this.gridEls = [];
    const left = U.el('section.invcol');
    const cap = ch.capacity(), carried = ch.carried(), load = carried / cap;
    const loadCls = load > 1.5 ? 'bad' : load > 1 ? 'warn' : 'ok';
    left.append(
      U.el('div.invhead', null,
        U.el('h3', null, STR.you + ' — ' + ch.name),
        U.el('div.wbar.' + loadCls, { title: STR.weight }, U.el('div.wfill', { style: { width: Math.min(100, load * 100 / 1.5) + '%' } }), U.el('span', null, U.kg(carried) + ' / ' + cap.toFixed(1) + ' กก.' + (load > 1.5 ? ' · ' + STR.immobile : load > 1 ? ' · ' + STR.overloaded : ''))),
        U.el('input.search', { placeholder: STR.search, value: this.qLeft, on: { input: (e) => { this.qLeft = e.target.value; this.applyFilter(); } } }),
      ),
      this.renderEquip(ch),
    );
    const lists = U.el('div.gridlist');
    lists.appendChild(this.renderGrid(ch.d.pockets, STR.pockets, 'L'));
    if (ch.d.equip.back) lists.appendChild(this.renderGrid(ch.d.equip.back.inv, STR.slotBack + ': ' + itemDef(ch.d.equip.back.id).name, 'L'));
    if (ch.d.equip.hand) lists.appendChild(this.renderGrid(ch.d.equip.hand.inv, STR.slotHand + ': ' + itemDef(ch.d.equip.hand.id).name, 'L'));
    left.appendChild(lists);

    const right = U.el('section.invcol');
    const tabs = U.el('div.tabs');
    this.tabs.forEach((t, i) => {
      const b = U.el('button.tab' + (i === this.tab ? '.on' : ''), { on: { click: () => { this.tab = i; this.render(); } } }, t.label);
      if (t.closable) b.appendChild(U.el('span.tabx', { on: { click: (e) => { e.stopPropagation(); this.tabs.splice(i, 1); this.tab = Math.min(this.tab, this.tabs.length - 1); this.render(); } } }, '✕'));
      tabs.appendChild(b);
    });
    const c = this.current();
    const catOpts = (lbl) => [U.el('option', { value: '' }, lbl), ...Object.entries(CATEGORIES).map(([k, v]) => U.el('option', { value: k }, v.name))];
    const tools = U.el('div.invtools', null,
      U.el('button.btn.sm', { on: { click: () => this.takeAll() } }, STR.takeAll),
      U.el('button.btn.sm', { on: { click: () => this.storeAll() } }, STR.storeAll),
      U.el('select.sel', { title: STR.takeCat, on: { change: (e) => { if (e.target.value) this.takeAll((it) => itemDef(it.id).cat === e.target.value); } } }, ...catOpts(STR.takeCat + '…')),
      U.el('select.sel', { title: STR.storeCat, on: { change: (e) => { if (e.target.value) this.storeAll((it) => itemDef(it.id).cat === e.target.value); } } }, ...catOpts(STR.storeCat + '…')),
      U.el('button.btn.sm', { on: { click: () => this.sort(c) } }, STR.autoSort),
      U.el('button.btn.sm.accent', { title: STR.smartLootCats, on: { click: () => this.takeAll((it) => P.settings.smartLoot.includes(itemDef(it.id).cat)) } }, STR.smartLoot),
      U.el('input.search', { placeholder: STR.search, value: this.qRight, on: { input: (e) => { this.qRight = e.target.value; this.applyFilter(); } } }),
      this.storageSelect(),
    );
    right.append(U.el('div.invhead', null, U.el('h3', null, STR.invTitle), U.el('button.mclose', { title: STR.close, on: { click: () => this.close() } }, '✕')), tabs, tools, U.el('div.storehint', null, STR.storeHint));
    right.appendChild(U.el('div.gridlist', null, c ? this.renderGrid(c, this.tabs[this.tab].label, 'R') : U.el('p.dim', null, STR.noContainer)));
    root.append(left, right, U.el('div.invhint', null, STR.hintsInv));
    this.applyFilter();
  },
  renderEquip(ch) {
    const row = U.el('div.equip');
    for (const [slot, label] of [['back', STR.slotBack], ['hand', STR.slotHand], ['weapon', STR.slotWeapon]]) {
      const it = ch.d.equip[slot];
      const box = U.el('div.eslot', { 'data-slot': slot }, U.el('div.elabel', null, label));
      if (it) {
        const img = U.el('img', { src: Icons.get(it.id), draggable: false });
        const holder = U.el('div.eitem', { on: {
          pointerdown: (e) => this.startDrag(e, { equip: slot, it }),
          dblclick: () => this.openBag(it),
          mouseenter: (e) => Tooltip.show(this.tooltip(it), e.clientX, e.clientY),
          mousemove: (e) => Tooltip.move(e.clientX, e.clientY), mouseleave: () => Tooltip.hide(),
          contextmenu: (e) => { e.preventDefault(); this.itemMenu(e, { equip: slot, it }); },
        } }, img);
        box.appendChild(holder);
      } else box.appendChild(U.el('div.eempty', null, STR.emptySlot));
      row.appendChild(box);
    }
    return row;
  },
  renderGrid(c, title, side) {
    const cell = CFG.CELL_PX;
    const wrap = U.el('div.gridwrap');
    const w = Inv.weight(c);
    wrap.appendChild(U.el('div.gtitle', null, U.el('span', null, title), U.el('span.gw' + (w > c.limit ? '.bad' : ''), null, STR.limitKg(w, c.limit)),
      side === 'L' ? U.el('button.btn.xs', { title: STR.autoSort, on: { click: () => this.sort(c) } }, '⇅') : null,
      c.temp !== 'ambient' ? U.el('span.temp.' + c.temp, null, c.temp === 'freezer' ? '−20 °C' : '4 °C') : null));
    const grid = U.el('div.grid', { style: { width: c.w * cell + 'px', height: c.h * cell + 'px', backgroundSize: cell + 'px ' + cell + 'px' } });
    grid._c = c; grid._side = side;
    for (const s of c.slots) grid.appendChild(this.renderItem(c, s, side));
    wrap.appendChild(grid);
    this.gridEls.push({ el: grid, c, side });
    return wrap;
  },
  renderItem(c, s, side) {
    const cell = CFG.CELL_PX, d = itemDef(s.it.id);
    const [w, h] = Inv.dims(s.it, s.r);
    const [bw, bh] = d.size;
    const cat = CATEGORIES[d.cat] || CATEGORIES.misc;
    const stg = d.per ? Food.stage(s.it) : 'fresh';
    const el = U.el('div.item.r-' + (d.rarity || 'common') + (d.per ? '.st-' + stg : '') + (Food.isOpened(s.it) ? '.opened' : '') + ((s.it.frz || 0) >= 0.99 ? '.frozen' : ''), { style: { left: s.x * cell + 'px', top: s.y * cell + 'px', width: w * cell + 'px', height: h * cell + 'px', '--cat': cat.color } });
    const img = U.el('img', { src: Icons.get(s.it.id, Food.isOpened(s.it)), draggable: false, style: s.r ? { width: bw * cell + 'px', height: bh * cell + 'px', transform: 'translate(-50%,-50%) rotate(90deg)' } : { width: bw * cell + 'px', height: bh * cell + 'px', transform: 'translate(-50%,-50%)' } });
    el.appendChild(img);
    if (s.it.qty > 1) el.appendChild(U.el('span.qty', null, '×' + s.it.qty));
    if (s.it.st && s.it.st.portionsLeft != null) el.appendChild(U.el('span.portions', null, s.it.st.portionsLeft + '/' + Food.total(s.it)));
    if (d.per && (s.it.frz || 0) > 0 && s.it.frz < 0.99) el.appendChild(U.el('span.thaw', null, '❄' + Math.round((1 - s.it.frz) * 100) + '%'));
    else if ((s.it.frz || 0) >= 0.99) el.appendChild(U.el('span.thaw', null, '❄'));
    if (stg === 'aging') el.appendChild(U.el('span.usesoon', null, STR.useSoon));
    if (S.food.reserve.includes(d.id)) el.appendChild(U.el('span.reserve', null, 'R'));
    if (s.it.cond != null) el.appendChild(U.el('span.cond', null, U.el('i', { style: { width: Math.round(s.it.cond * 100) + '%', background: s.it.cond > 0.5 ? '#7fbf5f' : s.it.cond > 0.2 ? '#e0b23c' : '#d65a5a' } })));
    if (s.it.inv) el.appendChild(U.el('span.bagcount', null, s.it.inv.slots.length ? '▣' + s.it.inv.slots.length : '▢'));
    if (s.it.unpaid) { el.classList.add('unpaid'); el.appendChild(U.el('span.pricetag', null, '฿' + d.price * s.it.qty)); }
    el._slot = s; el._c = c;
    el.dataset.name = d.name.toLowerCase();
    el.addEventListener('pointerdown', (e) => { if (e.button === 0) this.startDrag(e, { c, slot: s, side }); });
    el.addEventListener('dblclick', () => { if (s.it.inv) this.openBag(s.it); else if (d.per) EatUI.open(c, s); });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); Tooltip.hide(); this.itemMenu(e, { c, slot: s, side }); });
    el.addEventListener('mouseenter', (e) => { if (!this.drag) Tooltip.show(this.tooltip(s.it, c), e.clientX, e.clientY); });
    el.addEventListener('mousemove', (e) => Tooltip.move(e.clientX, e.clientY));
    el.addEventListener('mouseleave', () => Tooltip.hide());
    return el;
  },
  applyFilter() {
    for (const g of this.gridEls) {
      const q = (g.side === 'L' ? this.qLeft : this.qRight).trim().toLowerCase();
      for (const el of g.el.querySelectorAll('.item')) el.classList.toggle('dimmed', !!q && !el.dataset.name.includes(q));
    }
  },

  /** Dropdown of every storage piece in the home: pick one → walk there and open it. */
  storageSelect() {
    const opts = [U.el('option', { value: '' }, STR.goToStorage)];
    for (const f of Scene.furnList()) {
      if (!f.inv) continue;
      const room = Scene.isHome() ? HomeWorld.roomAt(f.floor, f.x, f.z) : null;
      opts.push(U.el('option', { value: f.uid }, f.label + ' · ' + (room ? room.name : STR.floors[f.floor]) + (f.floor === 1 ? ' (' + STR.floors[1] + ')' : '')));
    }
    return U.el('select.sel.goto', { on: { change: (e) => {
      const f = Scene.furn(e.target.value); if (!f) return;
      this.close();
      Scene.doAction(f, 'open');
    } } }, ...opts);
  },

  /* ---------- Tooltip ---------- */
  tooltip(it, c) {
    const d = itemDef(it.id), cat = CATEGORIES[d.cat] || CATEGORIES.misc;
    const rows = [];
    rows.push(`<div class="tt-h" style="--cat:${cat.color}">${Food.label(it)}</div><div class="tt-cat">${cat.name}</div>`);
    if (d.per) rows.push(FoodFmt.freshLine(it, c));
    rows.push(`<div class="tt-r"><span>${STR.ttWeight}</span><b>${U.kg(Inv.itemWeight(it))}</b></div>`);
    rows.push(`<div class="tt-r"><span>${STR.ttSize}</span><b>${d.size[0]}×${d.size[1]}</b></div>`);
    if (d.price) rows.push(`<div class="tt-r"><span>${STR.ttPrice}</span><b>${U.money(d.price)}</b></div>`);
    if (it.unpaid) rows.push(`<div class="tt-r"><span style="color:#ffb0a8">${STR.unpaidTag}</span><b>${U.money(d.price * it.qty)}</b></div>`);
    if (it.cond != null) rows.push(`<div class="tt-r"><span>${STR.ttCond}</span><b>${Math.round(it.cond * 100)}% · ${STR.durState[Durability.state(it)]}</b></div>`);
    if (it.cap != null && it.cap < 1) rows.push(`<div class="tt-r warn"><span>${STR.ttCap}</span><b>${Math.round(it.cap * 100)}% (${STR.repairsN(it.repairs || 0)})</b></div>`);
    if (WEAPONS[it.id]) { const w = WEAPONS[it.id]; rows.push(`<div class="tt-sub">${STR.wpnLine(Math.round(w.dmg * Combat.condMul(it)), w.reach, w.speed, w.noise)}</div>`); }
    if (it.uses != null) rows.push(`<div class="tt-r"><span>${STR.ttUses}</span><b>${it.uses}</b></div>`);
    if (d.grid) rows.push(`<div class="tt-r"><span>${STR.ttCapacity}</span><b>${d.grid[0]}×${d.grid[1]} · ${d.limit} กก.</b></div>`);
    if (d.per) {
      rows.push(`<div class="tt-r"><span>${STR.ttPortions}</span><b>${Food.left(it)}/${Food.total(it)}</b></div>`);
      const p = Food.per(it);
      rows.push(`<div class="tt-sub">${STR.ttPerPortion}: ${Math.round(p.kcal)} ${STR.kcal} · ${STR.protein} ${p.protein.toFixed(1)} ก. · ${STR.carb} ${p.carb.toFixed(1)} ก. · ${STR.fat} ${p.fat.toFixed(1)} ก. · ${STR.micro} ${p.micro.toFixed(1)} · ${STR.satietyShort} ${Math.round(p.satiety)}${p.water ? ' · ' + STR.water + ' +' + Math.round(p.water) : ''}</div>`);
      if (!d.cooked && !(it.st && it.st.opened)) rows.push(`<div class="tt-r"><span>${STR.ttShelf}</span><b>${d.shelf >= 1 ? d.shelf + ' วัน' : Math.round(d.shelf * 24) + ' ชม.'}</b></div>`);
      if (it.st && it.st.quality) rows.push(`<div class="tt-sub">${STR.qualityLine(Math.round(it.st.quality * 100))}</div>`);
      rows.push(`<div class="tt-sub">${STR.ttStore[d.store] || ''} · ${STR.ttFreeze[d.freeze] || ''}</div>`);
    }
    return rows.join('');
  },

  /* ---------- Item actions ---------- */
  playerSide() { return activeChar().containers(); },
  otherSide(fromSide) { return fromSide === 'L' ? (this.current() ? [this.current()] : []) : this.playerSide(); },
  itemMenu(e, src) {
    const it = src.it || src.slot.it, d = itemDef(it.id), ch = activeChar();
    const items = [];
    if (src.slot && d.per) {
      items.push({ label: (d.cat === 'drink' ? STR.drink : STR.eat) + '…', fn: () => EatUI.open(src.c, src.slot) });
      if ((it.frz || 0) > 0 && S.scene === 'home') items.push({ label: STR.microThaw, fn: () => { if (Cook.microwaveThaw(activeChar(), src.c, src.slot)) this.changed(); } });
      items.push({ label: S.food.reserve.includes(d.id) ? STR.unreserve : STR.reserve, fn: () => { const r = S.food.reserve; const i = r.indexOf(d.id); if (i >= 0) r.splice(i, 1); else r.push(d.id); this.changed(); } });
      items.push({ label: S.food.exclude.includes(d.id) ? STR.unexclude : STR.exclude, fn: () => { const r = S.food.exclude; const i = r.indexOf(d.id); if (i >= 0) r.splice(i, 1); else r.push(d.id); this.changed(); } });
    }
    if (src.slot && (d.tags.includes('electrolyte') || d.tags.includes('diarrhea')) && !d.per) items.push({ label: STR.use, fn: () => { if (Illness.treat(activeChar().d, it)) { if (it.uses != null) it.uses--; if (it.uses == null || it.uses <= 0) { if (it.qty > 1) { it.qty--; if (d.uses) it.uses = d.uses; } else Inv.remove(src.c, src.slot); } logEvent(STR.usedMed(d.name)); } this.changed(); } });
    if (src.slot && d.installs) items.push({ label: STR.installAct, fn: () => InstallUI.open(src.c, src.slot) });
    if (WEAPONS[it.id] && WEAPONS[it.id].mat && d.dura) items.push({ label: STR.repairAct + ' (' + REPAIRS[WEAPONS[it.id].mat].name + ')', fn: () => { if (Durability.repair(activeChar(), it)) Toast.show(STR.repaired(d.name, Math.round(it.cap * 100)), 'good'); this.changed(); } });
    if (it.inv) items.push({ label: STR.openBag, fn: () => this.openBag(it) });
    if (src.slot && d.equip && !ch.d.equip[d.equip]) items.push({ label: STR.equip, fn: () => this.equipFrom(src.c, src.slot, d.equip) });
    if (src.slot && d.cat === 'weapon' && !ch.d.equip.weapon) items.push({ label: STR.equip, fn: () => this.equipFrom(src.c, src.slot, 'weapon') });
    if (src.equip) items.push({ label: STR.unequip, fn: () => this.unequip(src.equip) });
    if (src.slot && it.qty > 1) items.push({ label: STR.split, fn: () => this.split(src.c, src.slot) });
    if (src.slot) items.push({ label: '→ ' + (src.side === 'L' ? (this.tabs[this.tab] || {}).label || STR.ground : STR.you), fn: () => this.quick(src) });
    if (src.slot && src.c !== this.ground.inv) items.push({ label: STR.drop, fn: () => { Inv.transfer(src.c, src.slot, [this.ground.inv]); this.changed(); } });
    ContextMenu.show(e.clientX, e.clientY, items);
  },
  split(c, slot) {
    const half = Math.floor(slot.it.qty / 2);
    const part = Object.assign(U.deepClone(slot.it), { uid: U.uid(), qty: half });
    const spot = Inv.findSpot(c, part);
    if (!spot) { Toast.show(STR.containerFull, 'warn'); return; }
    slot.it.qty -= half;
    c.slots.push({ it: part, x: spot.x, y: spot.y, r: spot.r });
    this.changed();
  },
  equipFrom(c, slot, eq) {
    const ch = activeChar();
    if (ch.d.equip[eq]) return;
    Inv.remove(c, slot);
    ch.d.equip[eq] = slot.it;
    this.changed();
  },
  unequip(eq) {
    const ch = activeChar(), it = ch.d.equip[eq];
    if (!it) return;
    ch.d.equip[eq] = null;
    const targets = [...ch.containers(), this.ground.inv];
    if (Inv.addToAny(targets, it) > 0) { ch.d.equip[eq] = it; Toast.show(STR.containerFull, 'warn'); }
    this.changed();
  },
  /** Shift-click quick transfer of one slot to the other side. */
  quick(src) {
    const dst = this.otherSide(src.side);
    if (!dst.length) return;
    if (dst[0].temp === 'freezer' && FreezeRules.check(src.slot.it, dst[0]) !== 'ok') { FreezeRules.guard(src.slot.it, dst[0], () => { Inv.transfer(src.c, src.slot, dst); this.changed(); }); return; }
    if (!Inv.transfer(src.c, src.slot, dst)) Toast.show(STR.containerFull, 'warn');
    this.changed();
  },
  /** Ctrl-click: move every stack of that item id from the same container. */
  quickAllOfType(src) {
    const id = src.slot.it.id;
    const r = Inv.transferAll(src.c, this.otherSide(src.side), (it) => it.id === id);
    if (r.failed) Toast.show(STR.failedN(r.failed), 'warn');
    this.changed();
  },
  takeAll(pred) {
    const c = this.current(); if (!c) return;
    const r = Inv.transferAll(c, this.playerSide(), pred);
    if (r.moved) Skills.gain(activeChar(), 'scavenging', r.moved * 0.6);
    Toast.show(STR.movedN(r.moved) + (r.failed ? ' · ' + STR.failedN(r.failed) : ''), r.failed ? 'warn' : 'info', 2400);
    this.changed();
  },
  storeAll(pred) {
    const c = this.current(); if (!c) return;
    let moved = 0, failed = 0, skipped = 0;
    const freezeOk = (it) => { if (c.temp !== 'freezer' || FreezeRules.check(it, c) === 'ok') return true; skipped++; return false; };
    for (const src of this.playerSide()) { const r = Inv.transferAll(src, [c], (it) => (!pred || pred(it)) && freezeOk(it)); moved += r.moved; failed += r.failed; }
    if (skipped) Toast.show(STR.freezeSkipped(skipped), 'warn', 4000);
    Toast.show(STR.movedN(moved) + (failed ? ' · ' + STR.failedN(failed) : ''), failed ? 'warn' : 'info', 2400);
    this.changed();
  },
  sort(c) {
    const ch = activeChar();
    const lv = ch.skill('scavenging') + (ch.hasTrait('organizer') ? 3 : 0);
    if (!Inv.autoSort(c, lv)) Toast.show(STR.sortFailed, 'warn');
    else Skills.gain(ch, 'scavenging', 1);
    this.changed();
  },
  changed() {
    Bus.emit('inv:changed');
    Scene.avatar.refreshGear();
    this.render();
  },

  /* ---------- Drag & drop ---------- */
  startDrag(e, src) {
    if (e.button !== 0) return;
    e.preventDefault();
    const it = src.it || src.slot.it;
    const startX = e.clientX, startY = e.clientY;
    const cell = CFG.CELL_PX;
    const srcEl = e.currentTarget;
    const rect = srcEl.getBoundingClientRect();
    let started = false;
    const st = {
      src, it, r: src.slot ? src.slot.r : 0,
      grabCX: Math.floor((e.clientX - rect.left) / cell), grabCY: Math.floor((e.clientY - rect.top) / cell),
      ghost: null, mark: null, target: null,
    };
    if (src.equip) { st.grabCX = 0; st.grabCY = 0; }
    const move = (ev) => {
      st.lx = ev.clientX; st.ly = ev.clientY;
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
        started = true;
        this.drag = st;
        Tooltip.hide();
        srcEl.classList.add('dragging');
        st.ghost = U.el('div.dragghost');
        document.body.appendChild(st.ghost);
        this.updateGhost(st);
      }
      st.ghost.style.left = ev.clientX - (st.grabCX + 0.5) * cell + 'px';
      st.ghost.style.top = ev.clientY - (st.grabCY + 0.5) * cell + 'px';
      this.trackTarget(st, ev.clientX, ev.clientY);
    };
    const up = (ev) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('keydown', key);
      if (!started) {
        // Plain click: Shift → quick transfer, Ctrl → all of type
        if (src.slot && ev.shiftKey) this.quick(src);
        else if (src.slot && (ev.ctrlKey || ev.metaKey)) this.quickAllOfType(src);
        return;
      }
      this.drag = null;
      st.ghost.remove(); if (st.mark) st.mark.remove();
      srcEl.classList.remove('dragging');
      this.drop(st);
    };
    const key = (ev) => {
      if (ev.key === 'r' || ev.key === 'R') {
        st.r = st.r ? 0 : 1;
        [st.grabCX, st.grabCY] = [st.grabCY, st.grabCX];
        if (started) {
          this.updateGhost(st);
          st.ghost.style.left = st.lx - (st.grabCX + 0.5) * cell + 'px';
          st.ghost.style.top = st.ly - (st.grabCY + 0.5) * cell + 'px';
          this.trackTarget(st, st.lx, st.ly);
        }
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('keydown', key);
  },
  updateGhost(st) {
    const cell = CFG.CELL_PX, d = itemDef(st.it.id);
    const [w, h] = Inv.dims(st.it, st.r), [bw, bh] = d.size;
    st.ghost.style.width = w * cell + 'px'; st.ghost.style.height = h * cell + 'px';
    st.ghost.innerHTML = '';
    st.ghost.appendChild(U.el('img', { src: Icons.get(st.it.id), style: { width: bw * cell + 'px', height: bh * cell + 'px', transform: 'translate(-50%,-50%)' + (st.r ? ' rotate(90deg)' : '') } }));
    if (st.it.qty > 1) st.ghost.appendChild(U.el('span.qty', null, '×' + st.it.qty));
  },
  /** Find the grid/slot under the pointer and show a valid/invalid placement mark. */
  trackTarget(st, x, y) {
    if (st.mark) { st.mark.remove(); st.mark = null; }
    st.target = null;
    const under = document.elementFromPoint(x, y);
    if (!under) return;
    const eslot = under.closest('.eslot');
    if (eslot) { st.target = { equip: eslot.dataset.slot }; eslot.classList.add('hot'); setTimeout(() => eslot.classList.remove('hot'), 120); return; }
    const gridEl = under.closest('.grid');
    if (!gridEl) return;
    const c = gridEl._c, cell = CFG.CELL_PX, r = gridEl.getBoundingClientRect();
    const cx = Math.floor((x - r.left) / cell), cy = Math.floor((y - r.top) / cell);
    const gx = cx - st.grabCX, gy = cy - st.grabCY;
    const [w, h] = Inv.dims(st.it, st.r);
    const ownSlot = st.src.slot && st.src.c === c ? st.src.slot : null;
    const hitSlot = Inv.slotAt(c, cx, cy);
    let kind = 'place', ok;
    if (hitSlot && hitSlot !== ownSlot && Inv.canStack(hitSlot.it, st.it) && hitSlot.it.qty < itemDef(hitSlot.it.id).stack) kind = 'stack';
    else if (hitSlot && hitSlot !== ownSlot && hitSlot.it.inv && hitSlot.it !== st.it) kind = 'into';
    if (kind === 'stack') ok = true;
    else if (kind === 'into') ok = !Inv.wouldNestIntoSelf(st.it, hitSlot.it.inv) && !!Inv.findSpot(hitSlot.it.inv, st.it) && (ownSlot ? true : Inv.weightOk(hitSlot.it.inv, st.it));
    else ok = Inv.fits(c, gx, gy, w, h, ownSlot) && !Inv.wouldNestIntoSelf(st.it, c) && (st.src.c === c || Inv.weightOk(c, st.it));
    st.target = { c, x: gx, y: gy, kind, slot: hitSlot, ok };
    const mark = U.el('div.placemark.' + (ok ? 'ok' : 'no'));
    if (kind === 'place') Object.assign(mark.style, { left: gx * cell + 'px', top: gy * cell + 'px', width: w * cell + 'px', height: h * cell + 'px' });
    else { const [sw, sh] = Inv.dims(hitSlot.it, hitSlot.r); Object.assign(mark.style, { left: hitSlot.x * cell + 'px', top: hitSlot.y * cell + 'px', width: sw * cell + 'px', height: sh * cell + 'px' }); }
    gridEl.appendChild(mark);
    st.mark = mark;
  },
  drop(st) {
    const t = st.target;
    if (!t) return;
    const destC = t.kind === 'into' && t.slot ? t.slot.it.inv : t.c;
    if (destC && destC.temp === 'freezer') { FreezeRules.guard(st.it, destC, () => this.doDrop(st)); return; }
    this.doDrop(st);
  },
  doDrop(st) {
    const t = st.target;
    const ch = activeChar();
    const it = st.it;
    // Detach from the source (slot or equipment), remembering how to undo.
    const restore = () => {
      if (st.src.equip) ch.d.equip[st.src.equip] = it;
      else if (!st.src.c.slots.includes(st.src.slot)) st.src.c.slots.push(st.src.slot);
    };
    const detach = () => { if (st.src.equip) ch.d.equip[st.src.equip] = null; else Inv.remove(st.src.c, st.src.slot); };
    if (t.equip) {
      const d = itemDef(it.id);
      const fits = t.equip === 'weapon' ? (d.cat === 'weapon' || d.cat === 'tool') : d.equip === t.equip;
      if (!fits || ch.d.equip[t.equip] || st.src.equip === t.equip) { if (!fits) Toast.show(STR.containerFull, 'warn'); return; }
      detach(); ch.d.equip[t.equip] = it;
      this.changed(); return;
    }
    if (!t.ok) { if (Inv.wouldNestIntoSelf(it, t.c)) Toast.show(STR.cantNestSelf, 'warn'); else if (t.kind === 'place') Toast.show(STR.containerFull, 'warn'); return; }
    if (t.kind === 'stack') {
      const host = t.slot.it, room = itemDef(host.id).stack - host.qty, n = Math.min(room, it.qty);
      if (t.c !== (st.src.c) && !Inv.weightOk(t.c, it, n)) { Toast.show(STR.containerFull, 'warn'); return; }
      host.qty += n; it.qty -= n;
      if (it.qty <= 0) detach();
      this.changed(); return;
    }
    detach();
    if (t.kind === 'into') {
      const left = Inv.add(t.slot.it.inv, it);
      if (left > 0) { it.qty = left; restore(); Toast.show(STR.containerFull, 'warn'); }
      this.changed(); return;
    }
    const placed = Inv.placeAt(t.c, it, t.x, t.y, st.r);
    if (!placed) { restore(); Toast.show(STR.containerFull, 'warn'); }
    else if (st.src.c !== t.c) Skills.gain(ch, 'scavenging', 0.3);
    this.changed();
  },
};
