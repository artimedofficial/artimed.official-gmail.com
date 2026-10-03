/* ==========================================================================
   99 · GAME — boot, state machine (MainMenu → CharacterSelect → Home),
   main loop, input, autosave, error guard, dev hook (window.HH).
   ========================================================================== */

(function installErrorGuard() {
  let shown = 0;
  const report = (where, err) => {
    const msg = String((err && (err.message || err.reason)) || err);
    window.HH_LAST_ERROR = { where, msg, stack: String((err && err.stack) || '').slice(0, 900) };
    console.error('[GAME]', where, err);
    if (shown++ > 2) return;
    try { Toast.show(STR.errTitle + ': ' + msg.slice(0, 120) + ' — ' + STR.errHint, 'bad', 9000); } catch (e) { /* toast unavailable */ }
  };
  window.addEventListener('error', (e) => report('window.error', e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => report('promise', e.reason));
})();

const Game = {
  mode: 'boot',      // 'boot' | 'menu' | 'play'
  bench: null,
  last: 0,
  hudAcc: 0,
  sceneState: null,  // the run object the 3D scene was built from
  keys: new Set(),
  mouse: { x: 0, y: 0, inside: false },

  async boot() {
    Save.loadProfile();
    const view = U.$('#view');
    const qKey = P.settings.quality || 'high';
    if (!Render.init(view, qKey)) { this.fatal(STR.noWebGL); return; }
    Icons.init();
    // Systems subscribe once; they read the global S.
    Needs.init();
    Outbreak.init();
    GameClock.onDay(() => { if (Game.mode === 'play') Save.saveRun('day'); });
    const run = Save.loadRun();
    S = run || createRun({ bg: 'warehouse', difficulty: 'standard', name: '' });
    this.prepareRng();
    this.buildScene();
    HUD.build();
    if (!P.settings.quality) {
      U.$('#loading').textContent = STR.benchmarking;
      this.bench = await QualityBench.run(40);
      P.settings.quality = this.bench.key;
      Render.applyQuality(this.bench.key);
      Save.saveProfile();
    }
    U.$('#loading').hidden = true;
    this.bindInput();
    this.toMenu(false);
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    setInterval(() => { if (this.mode === 'play' && performance.now() - Save.lastSaveReal > CFG.AUTOSAVE_REAL_SEC * 1000) Save.saveRun('auto'); }, 10000);
    window.addEventListener('beforeunload', () => { if (this.mode === 'play') Save.saveRun('unload'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'play') Save.saveRun('hidden'); });
  },
  fatal(msg) {
    const f = U.$('#fatal');
    f.hidden = false;
    f.append(U.el('p', null, msg), U.el('button.mbtn.primary', { on: { click: () => location.reload() } }, STR.retry));
    U.$('#loading').hidden = true;
  },
  prepareRng() {
    RNG.restore(S.rng);
    if (!RNG.streams.world) RNG.init('world', S.worldSeed);
    if (!RNG.streams.events) RNG.init('events', S.lifeSeed);
    if (!RNG.streams.combat) RNG.init('combat', S.lifeSeed ^ 0x9e3779b9);
  },
  buildScene() {
    if (HomeScene.W) this.disposeScene();
    HomeScene.build();
    this.sceneState = S;
  },
  disposeScene() {
    const W = HomeScene.W;
    Render.scene.remove(W.root);
    Render.scene.remove(HomeScene.avatar.obj);
    W.root.traverse((o) => { if (o.isMesh || o.isLineSegments) o.geometry.dispose(); });
    HomeScene.avatar.h.dispose();
    HomeScene.W = null; HomeScene.pileObjs.clear();
    if (Render.dust) { Render.scene.remove(Render.dust); Render.dust = null; }
  },
  toMenu(reloadRun) {
    if (InvUI.isOpen) InvUI.close();
    Modal.closeAll();
    GameClock.endSleep('menu');
    this.mode = 'menu';
    U.$('#hud').hidden = true;
    if (reloadRun) {
      const run = Save.loadRun();
      S = run || createRun({ bg: 'warehouse', difficulty: 'standard', name: '' });
      this.prepareRng();
      this.buildScene();
    }
    MainMenu.show();
  },
  enterPlay() {
    MainMenu.hide();
    Modal.closeAll();
    this.mode = 'play';
    GameClock.pauseLocks = 0;
    U.$('#hud').hidden = false;
    HUD.build();
    Render.cam.follow = true;
    Render.cam.dist = 17; Render.cam.yaw = 0; Render.cam.yawIdx = 0;
    Save.saveRun('enter');
  },
  newRun(opts) {
    Save.deleteRun();
    S = createRun(opts);
    this.prepareRng();
    this.buildScene();
    logEvent('เริ่มชีวิตที่ ' + S.life + ' — ' + BACKGROUNDS[opts.bg].name, 'info');
    this.enterPlay();
  },
  continueRun() {
    const run = Save.loadRun();
    if (!run) { MainMenu.show(); return; }
    if (this.sceneState !== S || S.createdAt !== run.createdAt) { S = run; this.prepareRng(); this.buildScene(); }
    this.enterPlay();
  },

  /* ---------- Main loop ---------- */
  loop(t) {
    requestAnimationFrame((tt) => this.loop(tt));
    const realDt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    try {
      if (this.mode === 'play') {
        GameClock.update(realDt);
        const simDt = GameClock.simDt(realDt);
        this.cameraKeys(realDt);
        HomeScene.update(realDt, simDt);
        this.hudAcc += realDt;
        if (this.hudAcc > 0.12) { this.hudAcc = 0; HUD.update(); }
      } else if (this.mode === 'menu' && HomeScene.W) {
        // Slow cinematic orbit behind the menu
        Render.cam.follow = false;
        Render.cam.tx = -1; Render.cam.tz = 1;
        Render.cam.yaw += realDt * 0.04;
        Render.cam.dist = 24;
        Render.setViewFloor(1);
        HomeScene.avatar.update(0);
        Render.updateCamera(realDt, null);
        Render.updateDayNight(S.time.min);
        Render.updateLights(null, true, true);
      }
      Render.frame(realDt);
    } catch (e) {
      if (!this._loopErr) { this._loopErr = true; console.error('[loop]', e); window.HH_LAST_ERROR = { where: 'loop', msg: String(e.message), stack: String(e.stack).slice(0, 900) }; }
    }
  },
  cameraKeys(dt) {
    const k = this.keys, sp = 9 * dt;
    let dx = 0, dz = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) dx -= sp;
    if (k.has('KeyD') || k.has('ArrowRight')) dx += sp;
    if (k.has('KeyW') || k.has('ArrowUp')) dz -= sp;
    if (k.has('KeyS') || k.has('ArrowDown')) dz += sp;
    if (P.settings.edgeScroll && this.mouse.inside && !InvUI.isOpen && !Modal.isOpen()) {
      const m = 14;
      if (this.mouse.x < m) dx -= sp; if (this.mouse.x > innerWidth - m) dx += sp;
      if (this.mouse.y < m) dz -= sp; if (this.mouse.y > innerHeight - m) dz += sp;
    }
    if (dx || dz) Render.pan(dx / (Render.cam.curDist * 0.1), dz / (Render.cam.curDist * 0.1));
  },

  /* ---------- Input ---------- */
  bindInput() {
    const cv = Render.renderer.domElement;
    let lastClick = 0, mDrag = null, hoverT = 0;
    cv.addEventListener('contextmenu', (e) => { e.preventDefault(); if (this.mode === 'play' && !this.blocked()) HomeScene.contextMenu(e); });
    cv.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play') return;
      ContextMenu.hide();
      if (e.button === 1) { e.preventDefault(); mDrag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); return; }
      if (e.button !== 0 || this.blocked()) return;
      if (GameClock.sleepUntil != null) { GameClock.endSleep('manual'); return; }
      const now = performance.now();
      const dbl = now - lastClick < 300; lastClick = now;
      HomeScene.click(e, dbl);
    });
    cv.addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.inside = true;
      if (mDrag) { Render.pan(-(e.clientX - mDrag.x) * 0.06, -(e.clientY - mDrag.y) * 0.06); mDrag = { x: e.clientX, y: e.clientY }; return; }
      if (this.mode !== 'play' || this.blocked()) return;
      const now = performance.now();
      if (now - hoverT > 70) { hoverT = now; HUD.setHint(HomeScene.hoverAt(e.clientX, e.clientY)); }
    });
    cv.addEventListener('pointerup', (e) => { if (e.button === 1) mDrag = null; });
    cv.addEventListener('pointerleave', () => { this.mouse.inside = false; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); if (this.mode === 'play') Render.zoom(Math.sign(e.deltaY) * 0.1); }, { passive: false });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (this.mode !== 'play') return;
      if (e.code === 'F9') { e.preventDefault(); DebugUI.open(); return; }
      if (e.code === 'Escape') {
        if (U.$('#ctxmenu')) ContextMenu.hide();
        else if (Modal.isOpen()) { if (Modal.top().dismissible) Modal.close(); }
        else if (InvUI.isOpen) InvUI.close();
        else PauseMenu.open();
        return;
      }
      if (InvUI.drag) return;  // R handled by the drag controller
      this.keys.add(e.code);
      if (Modal.isOpen()) return;
      switch (e.code) {
        case 'KeyI': InvUI.toggle(); break;
        case 'KeyQ': Render.rotate(-1); break;
        case 'KeyE': Render.rotate(1); break;
        case 'KeyF': HUD.toggleFps(); break;
        case 'Space':
          e.preventDefault();
          if (GameClock.sleepUntil != null) GameClock.endSleep('manual');
          else GameClock.setSpeed(S.time.speedIdx === 0 ? (this._lastSpeed || 2) : (this._lastSpeed = S.time.speedIdx, 0));
          break;
        case 'Digit1': GameClock.setSpeed(1); break;
        case 'Digit2': GameClock.setSpeed(2); break;
        case 'Digit3': GameClock.setSpeed(3); break;
        case 'Digit4': GameClock.setSpeed(4); break;
        case 'PageUp': Render.cam.follow = false; Render.setViewFloor(Render.viewFloor + 1); break;
        case 'PageDown': Render.cam.follow = false; Render.setViewFloor(Render.viewFloor - 1); break;
        case 'KeyH': case 'KeyM': case 'KeyB': case 'KeyC':
          Toast.show({ KeyH: 'หน้าต่างสุขภาพ', KeyM: 'แผนที่เมือง', KeyB: 'โหมดสร้าง', KeyC: 'การคราฟต์' }[e.code] + ' จะเปิดใช้งานใน Phase ' + { KeyH: '1D', KeyM: '1B', KeyB: '1D', KeyC: '1C' }[e.code], 'info', 2200);
          break;
        default: break;
      }
    });
  },
  blocked() { return Modal.isOpen() || InvUI.isOpen; },
};

/* Dev hook for test harnesses and the owner's own inspection. */
window.HH = {
  get S() { return S; }, get P() { return P; },
  Game, GameClock, Render, HomeScene, HomeWorld, Nav, InvUI, Inv, Save, Sanitize, ITEMS, FURNITURE, HOME,
  Icons, AssetRegistry, Character, activeChar, Modal, Toast, Needs, Skills, RNG, createRun, BUILD,
};

Game.boot().catch((e) => { console.error('[boot]', e); Game.fatal(STR.errTitle + ': ' + e.message); });
