/* ==========================================================================
   54 · DEBUG / TEST MENU (F9, §3)
   Phase 1A: time jump (simulated through every system), time acceleration,
   add items, fill needs, cash, asset id list. Utility failure, zombies and
   invulnerability controls arrive with their systems in 1C–1D.
   ========================================================================== */

const DebugUI = {
  open() {
    if (!S) return;
    const body = U.el('div.debug');
    const t = U.timeOf(S.time.min);
    const dayIn = U.el('input.txt.sm', { type: 'number', min: 0, value: t.day });
    const hourIn = U.el('input.txt.sm', { type: 'number', min: 0, max: 23, value: t.hour });
    const jump = () => {
      const target = Math.max(0, (+dayIn.value | 0)) * 1440 + U.clamp(+hourIn.value | 0, 0, 23) * 60;
      if (target > S.time.min) GameClock.advance(target - S.time.min);   // runs every system minute-by-minute
      else S.time.min = target;
      Toast.show(STR.dbgJump + ' → ' + STR.day + ' ' + U.timeOf(S.time.min).day + ' ' + U.timeOf(S.time.min).hhmm, 'info', 2000);
    };
    const itemSel = U.el('select.sel', null, ...Object.values(ITEMS).filter((d) => d.id !== 'unknown').sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name, 'th')).map((d) => U.el('option', { value: d.id }, `[${CATEGORIES[d.cat].name}] ${d.name}`)));
    const qty = U.el('input.txt.sm', { type: 'number', min: 1, value: 1 });
    const addItem = () => {
      const ch = activeChar(); let n = Math.max(1, +qty.value | 0);
      const pile = Scene.pileNear(ch.d.pos.floor, ch.d.pos.x, ch.d.pos.z, true);
      while (n > 0) {
        const it = Inv.makeItem(itemSel.value, n); const q = it.qty;
        const left = Inv.addToAny([...ch.containers(), pile.inv], it);
        if (left >= q) break;
        n -= q - left;
      }
      Scene.syncPiles(); Bus.emit('inv:changed'); Toast.show(STR.dbgAdd + ': ' + itemDef(itemSel.value).name, 'info', 1500);
    };
    const speedBtns = U.el('div.row', null, ...[1, 16, 60].map((m) => U.el('button.btn.sm' + (GameClock.debugMul === m ? '.on' : ''), { on: { click: () => { GameClock.debugMul = m; Modal.close(); this.open(); } } }, '×' + m)));
    body.append(
      U.el('h4', null, STR.dbgJump), U.el('div.row', null, STR.day, dayIn, 'ชม.', hourIn, U.el('button.btn.sm', { on: { click: jump } }, STR.dbgGo)),
      U.el('h4', null, STR.dbgSpeed + ' (คูณกับความเร็วปัจจุบัน)'), speedBtns,
      U.el('h4', null, STR.dbgAdd), U.el('div.row', null, itemSel, qty, U.el('button.btn.sm', { on: { click: addItem } }, '+')),
      U.el('div.row', null,
        U.el('button.btn.sm', { on: { click: () => { const n = activeChar().d.needs; n.satiety = n.hydration = n.energy = n.stamina = 100; } } }, STR.dbgFill),
        U.el('button.btn.sm', { on: { click: () => { S.cash += 10000; } } }, STR.dbgCash)),
      U.el('p.dim', null, STR.dbgNotYet),
      U.el('details', null, U.el('summary', null, STR.dbgAssets + ' (' + AssetRegistry.list().length + ')'), U.el('pre.assets', null, AssetRegistry.list().join('\n'))),
    );
    Modal.open({ title: STR.dbgTitle, body, wide: true, pauseTime: false });
  },
};
