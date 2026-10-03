/* ==========================================================================
   29 · HEALTH — regional injuries, bleeding, infection stages, step-by-step
   treatment with real supplies, death conditions (§5.4, §5.5).
   Wound: { id, t: 'bruise'|'laceration'|'bite'|'fracture'|'burn', sev 0..1, bleed 0..1,
            infect 0..1, cleaned, dressedAt, sutured, splinted, at }
   Character extras: d.blood (0..100), d.meds { painUntil, abxUntil }
   ========================================================================== */

const Health = {
  init(d) {
    d.blood = U.num(d.blood, 100, 0, 100);
    if (!d.meds || typeof d.meds !== 'object') d.meds = {};
    d.meds.painUntil = U.num(d.meds.painUntil, 0, 0, 1e9);
    d.meds.abxUntil = U.num(d.meds.abxUntil, 0, 0, 1e9);
    for (const k in BODY_PARTS) {
      const p = d.body[k];
      p.cond = (Array.isArray(p.cond) ? p.cond : []).filter((w) => w && typeof w === 'object' && ['bruise', 'laceration', 'bite', 'fracture', 'burn'].includes(w.t)).map((w) => ({
        id: typeof w.id === 'string' ? w.id : U.uid(), t: w.t, sev: U.num(w.sev, 0.3, 0, 1), bleed: U.num(w.bleed, 0, 0, 1), infect: U.num(w.infect, 0, 0, 1),
        cleaned: !!w.cleaned, dressedAt: w.dressedAt == null ? null : U.num(w.dressedAt, 0, 0, 1e9), sutured: !!w.sutured, splinted: !!w.splinted, tq: !!w.tq, at: U.num(w.at, 0, 0, 1e9),
      }));
    }
    return d;
  },
  wounds(d) { const out = []; for (const k in BODY_PARTS) for (const w of d.body[k].cond) out.push({ part: k, w }); return out; },
  /** Apply damage to a body part and create the matching wound (§5.4). kind: blunt | scratch | bite | blade | fall */
  damage(d, part, amount, kind) {
    if (S.flags.invulnerable) return;
    const p = d.body[part];
    p.hp = Math.max(0, p.hp - amount);
    const sev = U.clamp(amount / 30, 0.1, 1);
    const w = { id: U.uid(), t: 'bruise', sev, bleed: 0, infect: 0, cleaned: false, dressedAt: null, sutured: false, splinted: false, tq: false, at: S.time.min };
    if (kind === 'bite') { w.t = 'bite'; w.bleed = 0.45 + sev * 0.35; w.infect = 0.03; }
    else if (kind === 'scratch' || kind === 'blade') { w.t = 'laceration'; w.bleed = 0.2 + sev * (kind === 'blade' ? 0.6 : 0.35); }
    else if (kind === 'blunt' && ['armL', 'armR', 'legL', 'legR'].includes(part) && amount > 12 && RNG.next('combat') < 0.12 + sev * 0.2) w.t = 'fracture';
    // Merge minor bruises on the same part
    const ex = p.cond.find((x) => x.t === w.t && w.t === 'bruise');
    if (ex) ex.sev = Math.min(1, ex.sev + sev * 0.5); else p.cond.push(w);
    Bus.emit('hurt', { part, amount, kind });
    if (w.t === 'bite') { logEvent(STR.bitten(BODY_PARTS[part].name), 'bad'); Bus.emit('toast', { kind: 'bad', msg: STR.bitten(BODY_PARTS[part].name), dur: 6000 }); }
    else if (w.t === 'fracture') { logEvent(STR.fractured(BODY_PARTS[part].name), 'bad'); Bus.emit('toast', { kind: 'bad', msg: STR.fractured(BODY_PARTS[part].name) }); }
    this.checkDeath(d);
  },
  infectStage(w) { return w.infect >= INJURY.critStage ? 'crit' : w.infect >= INJURY.weakStage ? 'weak' : w.infect >= INJURY.feverStage ? 'fever' : null; },
  worstInfection(d) { return this.wounds(d).reduce((m, x) => Math.max(m, x.w.infect), 0); },
  /** Movement / attack multipliers from injuries (§5.4 regional effects). */
  effects(d) {
    let speed = 1, attack = 1, pain = 0;
    for (const { part, w } of this.wounds(d)) {
      if (w.t === 'fracture') {
        if (part.startsWith('leg')) speed *= w.splinted ? 0.75 : 0.5;
        if (part.startsWith('arm')) attack *= w.splinted ? 0.7 : 0.5;
      }
      pain += w.sev * (w.t === 'fracture' ? 1.5 : w.t === 'bite' ? 1 : 0.5);
    }
    const inf = this.worstInfection(d);
    if (inf >= INJURY.weakStage) { speed *= 0.7; attack *= 0.7; }
    const relieved = S && d.meds.painUntil > S.time.min;
    pain *= relieved ? 0.4 : 1;
    if (pain > 1) { speed *= Math.max(0.7, 1 - (pain - 1) * 0.1); attack *= Math.max(0.7, 1 - (pain - 1) * 0.1); }
    return { speed, attack, pain };
  },
  /** Per-minute update (bleeding, infection, fever, healing, vital checks). */
  minute(d) {
    if (!d.alive) return;
    const h = 1 / 60;
    const ch = new Character(d);
    const heal = Body.effects(d).heal;
    const infMul = Body.effects(d).infection * difficultyOf(S.difficulty).infection * (ch.hasTrait('clinical') ? 0.8 : 1);
    const med = 1 + ch.skill('medicine') * 0.05;
    const onAbx = d.meds.abxUntil > S.time.min, onPain = d.meds.painUntil > S.time.min;
    let bleeding = 0;
    for (const k in BODY_PARTS) {
      const p = d.body[k];
      for (const w of p.cond) {
        // Bleeding (minor wounds clot on their own; dressings & sutures stop it)
        if (w.bleed > 0) {
          bleeding += w.bleed;
          const clot = w.sutured || w.tq ? 1 : w.dressedAt != null ? 0.5 : w.bleed < 0.35 ? 0.15 : w.bleed < 0.7 ? 0.1 : 0.03;
          w.bleed = Math.max(0, w.bleed - clot * h * med);
        }
        // Infection for open wounds
        const base = INJURY.infectRate[w.t];
        if (base) {
          const stale = w.dressedAt != null && S.time.min - w.dressedAt > INJURY.dressingLifeH * 60;
          let r = base * infMul * (w.cleaned ? INJURY.infectCleanMul : 1) * (w.dressedAt == null ? 1 : stale ? INJURY.infectStaleMul : INJURY.infectDressMul);
          if (w.infect < 0.02 && w.cleaned && w.dressedAt != null && !stale) r *= 0.3;
          w.infect = Math.min(1, w.infect + r * h * (w.sev + 0.3));
          const fight = (w.cleaned && w.dressedAt != null && !stale ? INJURY.immunity * heal * med : 0) + (onAbx ? INJURY.antibiotic * med : 0);
          if (w.infect < INJURY.weakStage || onAbx) w.infect = Math.max(0, w.infect - fight * h);
        }
        // Healing of the wound itself
        const treated = (w.t !== 'fracture' || w.splinted) && (w.dressedAt != null || w.t === 'bruise' || w.t === 'fracture') && w.infect < INJURY.feverStage;
        const ratePerH = w.t === 'fracture' ? (w.splinted ? 1 : 0.15) / INJURY.fractureHealH : treated ? 0.025 : 0.004;
        w.sev = Math.max(0, w.sev - ratePerH * h * heal);
      }
      p.cond = p.cond.filter((w) => w.sev > 0.01 || w.bleed > 0.01 || w.infect > 0.05);
      // Part HP regenerates slowly when not actively bleeding/infected
      const busy = p.cond.some((w) => w.bleed > 0.05 || w.infect > INJURY.feverStage);
      if (!busy) p.hp = Math.min(BODY_PARTS[k].hp, p.hp + INJURY.hpRegen * heal * h * (d.sleeping ? 2 : 1));
    }
    // Blood
    if (bleeding > 0) d.blood = Math.max(0, d.blood - bleeding * INJURY.bloodLossPerSev * h);
    else d.blood = Math.min(100, d.blood + INJURY.bloodRegen * h * heal);
    // Fever & infection stages
    const inf = this.worstInfection(d);
    if (inf >= INJURY.feverStage) {
      const f = onPain ? 0.4 : 1;
      d.needs.energy = Math.max(0, d.needs.energy - 0.03 * f);
      d.needs.hydration = Math.max(0, d.needs.hydration - 0.025 * f);
    }
    if (inf >= INJURY.critStage) d.body.torso.hp = Math.max(0, d.body.torso.hp - 2.2 * h);
    // Dehydration / starvation
    if (d.needs.hydration <= 0) d.body.torso.hp = Math.max(0, d.body.torso.hp - INJURY.dehydrateDamage * h);
    this.checkDeath(d);
  },
  checkDeath(d) {
    if (!d.alive || S.flags.invulnerable) return;
    let cause = null;
    if (d.body.head.hp <= 0) cause = STR.causeHead;
    else if (d.body.torso.hp <= 0) cause = this.worstInfection(d) >= INJURY.critStage ? STR.causeInfection : d.needs.hydration <= 0 ? STR.causeThirst : STR.causeTorso;
    else if (d.blood <= INJURY.deathBlood) cause = STR.causeBlood;
    else if (d.nut && d.nut.reserve <= INJURY.starveDeath) cause = STR.causeStarve;
    if (cause) Death.trigger(d, cause);
  },
  /** Find a carried/home item from a list of ids. */
  findItem(ch, ids) {
    const sources = [...ch.containers()];
    if (S.scene === 'home') for (const f of S.home.furniture) { if (f.inv) sources.push(f.inv); }
    for (const c of sources) {
      let hit = null;
      Inv.walk(c, (it, cc, slot) => { if (!hit && ids.includes(it.id) && (it.uses == null || it.uses > 0)) hit = { it, c: cc, slot }; });
      if (hit) return hit;
    }
    return null;
  },
  /** Use one 'use' (or one unit) of an item. */
  spend(found) {
    const it = found.it, d = itemDef(it.id);
    if (it.uses != null) { it.uses -= 1; if (it.uses > 0) return; }
    if (it.qty > 1) { it.qty -= 1; if (d.uses) it.uses = d.uses; } else Inv.remove(found.c, found.slot);
  },
  /** Available treatment actions for a wound → [{key, label, ids, ok}] */
  actions(ch, part, w) {
    const out = [];
    const add = (key, label, ids, cond = true) => { if (!cond) return; const f = ids ? this.findItem(ch, ids) : true; out.push({ key, label, ok: !!f, need: ids ? ids.map((i) => itemDef(i).name).slice(0, 3).join(' / ') : '' }); };
    const open = w.t === 'bite' || w.t === 'laceration' || w.t === 'burn';
    add('pressure', STR.trPressure, null, w.bleed > 0.05 && !w.sutured);
    add('clean', STR.trClean, MED.clean, open && !w.cleaned);
    add('dress', w.dressedAt != null ? STR.trRedress : STR.trDress, w.sev < 0.3 && w.t !== 'bite' ? [...MED.smallDress, ...MED.dress] : MED.dress, open);
    add('suture', STR.trSuture, MED.suture, (w.t === 'laceration' || w.t === 'bite') && w.bleed > 0.3 && !w.sutured);
    add('tourniquet', STR.trTourniquet, MED.tourniquet, w.bleed > 0.6 && part !== 'head' && part !== 'torso' && !w.tq);
    add('splint', STR.trSplint, MED.splint, w.t === 'fracture' && !w.splinted);
    add('splint_impro', STR.trSplintImpro, ['plank', 'scrap_wood'], w.t === 'fracture' && !w.splinted);
    return out;
  },
  /** Perform a treatment step (§5.5). Returns true if done. */
  treat(ch, part, woundId, key) {
    const d = ch.d, p = d.body[part], w = p.cond.find((x) => x.id === woundId);
    if (!w) return false;
    const med = 1 + ch.skill('medicine') * 0.05;
    const use = (ids) => { const f = this.findItem(ch, ids); if (!f) { Bus.emit('toast', { kind: 'warn', msg: STR.trMissing }); return false; } this.spend(f); return true; };
    let minutes = 3;
    switch (key) {
      case 'pressure': w.bleed *= 0.55; minutes = 4; break;
      case 'clean': if (!use(MED.clean)) return false; w.cleaned = true; if (S.time.min - w.at < 90) w.infect *= 0.4; w.infect *= 0.8; minutes = 5; break;
      case 'dress': if (!use(w.sev < 0.3 && w.t !== 'bite' ? [...MED.smallDress, ...MED.dress] : MED.dress)) return false; w.dressedAt = S.time.min; w.bleed *= 0.3 / med; minutes = 6; break;
      case 'suture': if (!use(MED.suture)) return false; w.sutured = true; w.bleed = 0; if (!w.cleaned) w.infect += 0.08; minutes = 20; break;
      case 'tourniquet': if (!use(MED.tourniquet)) return false; w.tq = true; w.bleed = 0; minutes = 2; break;
      case 'splint': if (!use(MED.splint)) return false; w.splinted = true; minutes = 10; break;
      case 'splint_impro': {
        const wood = this.findItem(ch, ['plank', 'scrap_wood']), wrap = this.findItem(ch, ['duct_tape', 'elastic_bandage', 'cloth_rag', 'rope']);
        if (!wood || !wrap) { Bus.emit('toast', { kind: 'warn', msg: STR.trMissing }); return false; }
        this.spend(wood); this.spend(wrap); w.splinted = true; minutes = 15; break;
      }
      default: return false;
    }
    GameClock.advance(minutes);
    Skills.gain(ch, 'medicine', 3 + w.sev * 4);
    logEvent(STR.treated(BODY_PARTS[part].name, STR.woundName[w.t]), 'info');
    return true;
  },
  /** Medication taken orally (painkiller / fever reducer, antibiotic). */
  takeMed(ch, kind) {
    const ids = kind === 'antibiotic' ? MED.antibiotic : MED.painkiller;
    const f = this.findItem(ch, ids);
    if (!f) { Bus.emit('toast', { kind: 'warn', msg: STR.trMissing }); return false; }
    this.spend(f);
    if (kind === 'antibiotic') ch.d.meds.abxUntil = Math.max(ch.d.meds.abxUntil, S.time.min) + 24 * 60;
    else ch.d.meds.painUntil = S.time.min + 6 * 60;
    logEvent(STR.tookMed(itemDef(f.it.id).name), 'info');
    GameClock.advance(1);
    return true;
  },
  initHooks() { GameClock.onMinute(() => { for (const d of S.chars) this.minute(d); }); },
};

/** Death → rebirth with 100% skill retention (§1 pillar 5, §11.1). */
const Death = {
  trigger(d, cause) {
    if (!d.alive) return;
    d.alive = false;
    const day = Math.floor(S.time.min / 1440);
    for (const k in d.skills) Profile.recordSkill(k, d.skills[k].lv, d.skills[k].xp);
    P.lives.push({ n: S.life, bg: d.bg, name: d.name, days: day, cause, endedAt: Date.now() });
    P.stats.deaths = (P.stats.deaths || 0) + 1;
    P.stats.totalDays = (P.stats.totalDays || 0) + day;
    Save.saveProfile();
    Save.deleteRun();
    logEvent(STR.died(cause), 'bad');
    Bus.emit('death', { d, cause, day });
  },
};
