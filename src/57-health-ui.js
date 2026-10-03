/* ==========================================================================
   57 · HEALTH (H), DEATH SCREEN, BUILD / BARRICADE MODE (B)
   ========================================================================== */

const HealthUI = {
  open() {
    const ch = activeChar(); if (!ch) return;
    const body = U.el('div.health');
    const render = () => {
      body.innerHTML = '';
      const d = ch.d;
      const col = (k) => { const f = d.body[k].hp / BODY_PARTS[k].hp; return f > 0.75 ? '#7fbf5f' : f > 0.45 ? '#e0b23c' : f > 0.15 ? '#e07a3a' : '#d65a5a'; };
      const mark = (k) => d.body[k].cond.length ? 'stroke="#fff" stroke-width="2"' : 'stroke="#2a2116" stroke-width="1"';
      const svg = `<svg viewBox="0 0 120 220" width="150"><circle cx="60" cy="22" r="16" fill="${col('head')}" ${mark('head')}/>
        <rect x="38" y="42" width="44" height="70" rx="12" fill="${col('torso')}" ${mark('torso')}/>
        <rect x="16" y="46" width="18" height="70" rx="8" fill="${col('armR')}" ${mark('armR')}/><rect x="86" y="46" width="18" height="70" rx="8" fill="${col('armL')}" ${mark('armL')}/>
        <rect x="40" y="116" width="18" height="92" rx="8" fill="${col('legR')}" ${mark('legR')}/><rect x="62" y="116" width="18" height="92" rx="8" fill="${col('legL')}" ${mark('legL')}/></svg>`;
      const left = U.el('div.hleft', { html: svg });
      left.append(U.el('div.tt-r', null, U.el('span', null, STR.blood), U.el('b', null, Math.round(d.blood) + '%')),
        U.el('div.tt-r', null, U.el('span', null, STR.needHealth), U.el('b', null, Math.round(ch.health()) + '%')),
        U.el('div.tt-r', null, U.el('span', null, STR.painkillerOn), U.el('b', null, d.meds.painUntil > S.time.min ? U.dur(d.meds.painUntil - S.time.min) : '—')),
        U.el('div.tt-r', null, U.el('span', null, STR.antibioticOn), U.el('b', null, d.meds.abxUntil > S.time.min ? U.dur(d.meds.abxUntil - S.time.min) : '—')),
        U.el('div.row', null,
          U.el('button.btn.sm', { on: { click: () => { Health.takeMed(ch, 'pain'); render(); } } }, '💊 ' + STR.takePain),
          U.el('button.btn.sm', { on: { click: () => { Health.takeMed(ch, 'antibiotic'); render(); } } }, '💉 ' + STR.takeAbx)));
      const right = U.el('div.hright');
      const parts = Object.keys(BODY_PARTS);
      for (const k of parts) {
        const p = d.body[k];
        right.appendChild(U.el('div.hpart', null, U.el('b', null, BODY_PARTS[k].name), U.el('span.dim', null, ' ' + Math.round(p.hp) + '/' + BODY_PARTS[k].hp)));
        for (const w of p.cond) {
          const st = Health.infectStage(w);
          const flags = [w.bleed > 0.05 ? STR.bleeding(Math.round(w.bleed * 100)) : '', w.cleaned ? STR.flagCleaned : '', w.dressedAt != null ? (S.time.min - w.dressedAt > INJURY.dressingLifeH * 60 ? STR.flagStale : STR.flagDressed) : '', w.sutured ? STR.flagSutured : '', w.splinted ? STR.flagSplinted : '', w.tq ? STR.flagTq : ''].filter(Boolean).join(' · ');
          const acts = Health.actions(ch, k, w);
          right.appendChild(U.el('div.wound' + (st ? '.inf-' + st : ''), null,
            U.el('div', null, U.el('b', null, STR.woundName[w.t]), ' ' + STR.severity(Math.round(w.sev * 100)), w.infect > 0.02 ? U.el('span.inf', null, ' · ' + STR.infection(Math.round(w.infect * 100)) + (st ? ' (' + STR.infStage[st] + ')' : '')) : null),
            flags ? U.el('div.dim', null, flags) : null,
            U.el('div.row', null, ...acts.map((a) => U.el('button.btn.xs' + (a.ok ? '' : '.dis'), { title: a.need, disabled: !a.ok, on: { click: () => { Health.treat(ch, k, w.id, a.key); render(); } } }, a.label)))));
        }
      }
      if (!Health.wounds(d).length) right.appendChild(U.el('p.dim', null, STR.noWounds));
      right.appendChild(U.el('p.dim', null, STR.biteHint));
      body.append(left, right);
    };
    render();
    Modal.open({ title: STR.healthTitle, body, wide: true });
  },
};

const DeathUI = {
  show(cause, day) {
    Modal.closeAll();
    if (InvUI.isOpen) InvUI.close();
    const root = U.$('#menu');
    root.hidden = false; root.innerHTML = '';
    const skills = Object.entries(P.skills).filter(([, s]) => s.lv > 0).map(([k, s]) => U.el('div.dskill', null, SKILLS[k].icon + ' ' + SKILLS[k].name + ' ', U.el('b', null, 'Lv ' + s.lv)));
    const lives = P.lives.slice(-8).reverse().map((l) => U.el('tr', null, U.el('td', null, '#' + l.n), U.el('td', null, (BACKGROUNDS[l.bg] || {}).name || l.bg), U.el('td', null, STR.daysSurvived(l.days)), U.el('td', null, l.cause)));
    root.append(U.el('div.death', null,
      U.el('h1', null, STR.youDied),
      U.el('p.cause', null, cause),
      U.el('p', null, STR.daysSurvived(day)),
      U.el('h4', null, STR.skillsKept), U.el('div.dskills', null, ...(skills.length ? skills : [U.el('span.dim', null, '—')])),
      U.el('h4', null, STR.livesLog), U.el('table.lives', null, ...lives),
      U.el('div.row2', null, U.el('button.mbtn', { on: { click: () => Game.toMenu(true) } }, STR.toMenu), U.el('button.mbtn.primary', { on: { click: () => CharSelect.show() } }, STR.newLife))));
  },
};

const BuildUI = {
  open() {
    if (!Scene.isHome()) { Toast.show(STR.buildHomeOnly, 'warn'); return; }
    const ch = activeChar();
    const body = U.el('div.build');
    body.appendChild(U.el('p.dim', null, STR.buildHint));
    for (const b of Barricades.list()) {
      const st = Barricades.get(b.key), B = BARRICADE[b.kind];
      const status = st.hp > 0 ? STR.barStatus(st.layers, B.layers, Math.round(st.hp), Math.round(st.max)) : (b.kind === 'window' ? (st.glass > 0 ? STR.barGlassOnly : STR.barBroken) : b.kind === 'door' ? (st.door > 0 ? STR.barDoorOnly : STR.barBroken) : STR.barOpen);
      const uses = Barricades.pickUses(ch, b.kind);
      const canAdd = st.layers < B.layers || (st.layers && st.hp < st.max * 0.98);
      body.appendChild(U.el('div.brow', null,
        U.el('b', null, b.name), U.el('span.dim', null, status),
        U.el('span.small', null, STR.barCost(B.uses.map(([id, n]) => itemDef(id).name + ' ×' + n).join(' + '), B.alt.map(([id, n]) => itemDef(id).name + ' ×' + n).join(' + '))),
        U.el('button.btn.sm' + (uses && canAdd ? '.primary' : ''), { disabled: !canAdd, on: { click: () => {
          Modal.close();
          const target = b.in;
          const go = () => { if (Barricades.build(ch, b.key)) Toast.show(STR.barBuilt(b.name, Barricades.get(b.key).layers), 'good'); };
          if (!Scene.avatar.goTo({ x: target.x, z: target.z, floor: 0 }, 'walk', go)) go();
        } } }, st.layers && st.hp < st.max * 0.98 ? STR.barRepairBtn : STR.barBuildBtn)));
    }
    Modal.open({ title: STR.buildTitle, body, wide: true });
  },
};
