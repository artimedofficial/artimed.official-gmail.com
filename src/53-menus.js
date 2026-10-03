/* ==========================================================================
   53 · MENUS & PANELS — main menu, character select, pause, settings,
   help, skills, log, sleep.
   ========================================================================== */

const MainMenu = {
  show() {
    const root = U.$('#menu');
    root.hidden = false; root.innerHTML = '';
    const hasRun = Save.hasRun();
    const btn = (label, fn, opts = {}) => U.el('button.mbtn' + (opts.primary ? '.primary' : ''), { disabled: !!opts.disabled, on: { click: fn } }, label);
    const fileIn = U.el('input', { type: 'file', accept: '.json,application/json', hidden: true, on: { change: (e) => SettingsUI.importFile(e.target.files[0]) } });
    root.append(
      U.el('div.menubox', null,
        U.el('div.logo', null, U.el('h1', null, STR.gameTitle), U.el('div.sub', null, STR.gameSub)),
        btn(STR.continue, () => Game.continueRun(), { primary: hasRun, disabled: !hasRun }),
        btn(STR.newLife, () => {
          if (hasRun) Modal.confirm(STR.newLife, STR.confirmNewLife, () => CharSelect.show(), STR.newLife, true);
          else CharSelect.show();
        }, { primary: !hasRun }),
        btn(STR.settings, () => SettingsUI.open()),
        btn(STR.loadFile, () => fileIn.click()),
        btn(STR.quit, () => { if (S && Game.mode === 'play') Save.saveRun('quit'); Modal.open({ title: STR.quit, body: U.el('p', null, STR.quitMsg), actions: [{ label: STR.ok }] }); }),
        fileIn,
        U.el('div.lives', null, STR.livesCount(P.lives.length)),
      ),
      U.el('div.menufoot', null, STR.menuFoot(BUILD)),
    );
  },
  hide() { U.$('#menu').hidden = true; },
};

const CharSelect = {
  bg: 'warehouse', diff: 'standard',
  show() {
    Modal.closeAll();
    const root = U.$('#menu');
    root.hidden = false; root.innerHTML = '';
    const name = U.el('input.txt', { value: 'สมชาย', maxLength: 24 });
    const cards = U.el('div.bgcards');
    const renderCards = () => {
      cards.innerHTML = '';
      for (const [k, b] of Object.entries(BACKGROUNDS)) {
        const skills = Object.entries(b.skills).map(([s, lv]) => `${SKILLS[s].icon} ${SKILLS[s].name} ${lv}`).join('<br>');
        cards.appendChild(U.el('button.bgcard' + (k === this.bg ? '.on' : ''), { on: { click: () => { this.bg = k; renderCards(); } } },
          U.el('div.swatch', { style: { background: `linear-gradient(135deg, ${b.look.shirt}, ${b.look.pants})` } }),
          U.el('h3', null, b.name), U.el('p', null, b.desc),
          U.el('div.sk', { html: '<b>' + STR.startSkills + '</b><br>' + skills }),
          U.el('div.tr', { html: '<b>' + STR.trait + ': ' + b.trait.name + '</b><br>' + b.trait.desc })));
      }
    };
    renderCards();
    const diffs = U.el('div.diffs');
    const renderDiff = () => {
      diffs.innerHTML = '';
      for (const [k, d] of Object.entries(DIFFICULTY)) diffs.appendChild(U.el('button.diff' + (k === this.diff ? '.on' : ''), { on: { click: () => { this.diff = k; renderDiff(); } } }, U.el('b', null, STR.diffNames[k]), U.el('small', null, STR.diffDesc(d))));
    };
    renderDiff();
    const carried = Object.entries(P.skills).filter(([, s]) => s.lv > 0).map(([k, s]) => `${SKILLS[k].icon} ${SKILLS[k].name} ${s.lv}`).join(' · ');
    root.append(U.el('div.charsel', null,
      U.el('h2', null, STR.chooseBg), U.el('p.dim', null, STR.chooseBgSub),
      cards,
      carried ? U.el('div.carried', null, U.el('b', null, STR.carried + ': '), carried) : null,
      U.el('div.row2', null, U.el('label', null, STR.charName, name), U.el('div', null, U.el('label', null, STR.difficulty), diffs)),
      U.el('div.row2', null,
        U.el('button.mbtn', { on: { click: () => MainMenu.show() } }, STR.back),
        U.el('button.mbtn.primary', { on: { click: () => Game.newRun({ bg: this.bg, difficulty: this.diff, name: name.value.trim() || 'ผู้รอดชีวิต' }) } }, STR.startLife)),
    ));
  },
};

const PauseMenu = {
  open() {
    Modal.open({ title: STR.btnMenu, body: U.el('div.pmenu', null,
      U.el('button.mbtn.primary', { on: { click: () => Modal.close() } }, STR.continue),
      U.el('button.mbtn', { on: { click: () => { if (Save.saveRun('manual')) Toast.show(STR.saved); } } }, STR.btnSave),
      U.el('button.mbtn', { on: { click: () => SettingsUI.open() } }, STR.settings),
      U.el('button.mbtn', { on: { click: () => Save.exportFile() } }, STR.exportSave),
      U.el('button.mbtn', { on: { click: () => { Save.saveRun('menu'); Modal.closeAll(); Game.toMenu(); } } }, 'กลับเมนูหลัก'),
    ) });
  },
};

const SettingsUI = {
  open() {
    const s = P.settings;
    const body = U.el('div.settings');
    const qSel = U.el('select.sel', { on: { change: (e) => { s.quality = e.target.value; Render.applyQuality(s.quality); Save.saveProfile(); } } },
      ...Object.keys(QUALITY).map((k) => U.el('option', { value: k, selected: (s.quality || Render.q.key) === k }, STR.qualityNames[k])));
    const check = (key, label, after) => U.el('label.chk', null, U.el('input', { type: 'checkbox', checked: !!s[key], on: { change: (e) => { s[key] = e.target.checked; Save.saveProfile(); if (after) after(); } } }), label);
    const lootBox = U.el('div.lootcats');
    for (const [k, c] of Object.entries(CATEGORIES)) {
      lootBox.appendChild(U.el('label.chk', null, U.el('input', { type: 'checkbox', checked: s.smartLoot.includes(k), on: { change: (e) => {
        s.smartLoot = e.target.checked ? [...new Set([...s.smartLoot, k])] : s.smartLoot.filter((x) => x !== k); Save.saveProfile();
      } } }), c.name));
    }
    const fileIn = U.el('input', { type: 'file', accept: '.json,application/json', hidden: true, on: { change: (e) => this.importFile(e.target.files[0]) } });
    body.append(
      U.el('h4', null, STR.quality), qSel,
      Game.bench ? U.el('p.dim', null, STR.qualityAuto(STR.qualityNames[Game.bench.key], Game.bench.ms)) : null,
      U.el('p.dim', null, STR.qualityReload),
      U.el('button.btn.sm', { on: { click: async () => { if (!S) return; const r = await QualityBench.run(40); Game.bench = r; s.quality = r.key; Render.applyQuality(r.key); Save.saveProfile(); Modal.close(); this.open(); } } }, STR.rebench),
      U.el('h4', null, STR.audioTitle),
      ...['master', 'music', 'sfx'].map((k) => U.el('label.slider', null, STR['vol' + k[0].toUpperCase() + k.slice(1)], U.el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[k], on: { input: (e) => { s[k] = +e.target.value; Snd.applyVolumes(); Save.saveProfile(); } } }))),
      check('mute', STR.mute, () => Snd.applyVolumes()),
      check('fps', STR.fpsOverlay, () => { if (HUD.els.fps) HUD.els.fps.hidden = !s.fps; }),
      check('edgeScroll', STR.edgeScroll),
      U.el('h4', null, STR.smartLootCats), lootBox,
      U.el('h4', null, 'ไฟล์เซฟ'),
      U.el('div.row', null,
        U.el('button.btn', { on: { click: () => Save.exportFile() } }, STR.exportSave),
        U.el('button.btn', { on: { click: () => fileIn.click() } }, STR.importSave),
        U.el('button.btn.danger', { on: { click: () => Modal.confirm(STR.deleteSave, STR.deleteConfirm, () => { Save.deleteAll(); location.reload(); }, STR.deleteSave, true) } }, STR.deleteSave),
      ), fileIn,
    );
    Modal.open({ title: STR.settingsTitle, body, wide: true });
  },
  importFile(file) {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const { run, profile } = Save.parseImport(String(rd.result));
        P = profile; Save.saveProfile();
        if (run) Save.write(CFG.LS_RUN, run); else Save.deleteRun();
        Toast.show(STR.importOk);
        Modal.closeAll();
        Game.toMenu(true);
      } catch (e) {
        Toast.show(STR.importFail(e.message), 'bad', 6000);
      }
    };
    rd.readAsText(file);
  },
};

const HelpUI = {
  open() {
    const t = U.el('table.help');
    for (const [k, v] of STR.helpRows) t.appendChild(U.el('tr', null, U.el('td', null, U.el('kbd', null, k)), U.el('td', null, v)));
    Modal.open({ title: STR.helpTitle, body: t, wide: true });
  },
};

const SkillsUI = {
  recent: [],
  open() {
    const ch = activeChar(); if (!ch) return;
    const list = U.el('div.skills');
    for (const [k, def] of Object.entries(SKILLS)) {
      const s = ch.d.skills[k];
      const need = s.lv >= 10 ? 1 : xpForLevel(s.lv + 1);
      list.appendChild(U.el('div.skill' + (def.phase > 1 ? '.later' : ''), null,
        U.el('span.si', null, def.icon), U.el('span.sn', null, def.name),
        U.el('span.sl', null, 'Lv ' + s.lv),
        U.el('div.bar', null, U.el('i', { style: { width: (s.lv >= 10 ? 100 : (s.xp / need) * 100) + '%' } })),
        def.phase > 1 ? U.el('small.dim', null, STR.skillPhase2) : null));
    }
    const recent = U.el('div.recent', null, ...this.recent.slice(-6).reverse().map((r) => U.el('div', null, r)));
    Modal.open({ title: STR.skillsTitle, body: U.el('div', null, list, recent), wide: true });
  },
};
Bus.on('skill:levelup', ({ key, lv }) => {
  const msg = STR.levelUp(SKILLS[key].name, lv);
  SkillsUI.recent.push(msg);
  logEvent(msg, 'good');
  Toast.show('⬆ ' + msg, 'good');
});

const LogUI = {
  open() {
    const list = U.el('div.log');
    const rows = (S ? S.log : []).slice().reverse();
    if (!rows.length) list.appendChild(U.el('p.dim', null, STR.logEmpty));
    for (const r of rows) { const t = U.timeOf(r.t); list.appendChild(U.el('div.lrow.' + r.kind, null, U.el('span.lt', null, STR.day + ' ' + t.day + ' ' + t.hhmm), U.el('span', null, r.msg))); }
    Modal.open({ title: STR.logTitle, body: list, wide: true });
  },
};

const SleepUI = {
  open(bed) {
    const now = S.time.min;
    const t = U.timeOf(now);
    const nextMorning = (t.hour < 6 ? t.day : t.day + 1) * 1440 + 6 * 60;
    const opts = [[STR.sleepUntil + ' 06:00', nextMorning], [STR.sleepHours(2), now + 120], [STR.sleepHours(4), now + 240], [STR.sleepHours(8), now + 480]];
    const body = U.el('div.sleepopts');
    for (const [label, until] of opts) body.appendChild(U.el('button.mbtn', { on: { click: () => { Modal.close(); this.start(bed, until); } } }, label));
    Modal.open({ title: STR.sleepTitle + ' — ' + bed.label, body });
  },
  start(bed, until) {
    const def = FURNITURE[bed.type];
    Needs.bedQuality = def.bedQuality || 0.7;
    Scene.avatar.bed = bed;
    GameClock.startSleep(until);
  },
};
Bus.on('sleep:end', () => { Toast.show(STR.sleepWoke, 'info', 2000); });
