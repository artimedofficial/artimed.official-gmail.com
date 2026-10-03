/* ==========================================================================
   45 · PROCEDURAL AUDIO (§11.3) — Web Audio synthesis, no sound files.
   Ambient beds (wind, night insects, interior hum, generator), footsteps by
   surface, combat/zombie/building SFX, generative ambient music with a
   tension layer when zombies are aware of you. Starts after a user gesture.
   ASSET_OVERRIDES['sfx.<name>'] = URL/data URI replaces any synthesized SFX.
   ========================================================================== */

const Snd = {
  ctx: null, master: null, musicBus: null, sfxBus: null, ambBus: null, ok: false, noiseBuf: null,
  buffers: new Map(), tens: 0, stepT: 0, musicT: 0, noteT: 0, chord: 0,
  init() {
    const unlock = () => {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { console.warn('[Audio] unavailable', e); return; }
      const c = this.ctx;
      this.master = c.createGain(); this.master.connect(c.destination);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      this.ambBus = c.createGain(); this.ambBus.connect(this.sfxBus);
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this.buildAmbient();
      this.buildMusic();
      this.applyVolumes();
      this.ok = true;
      for (const k in ASSET_OVERRIDES) if (k.startsWith('sfx.')) this.loadOverride(k.slice(4), ASSET_OVERRIDES[k]);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  },
  applyVolumes() {
    if (!this.ctx) return;
    const s = P.settings, m = s.mute ? 0 : s.master;
    this.master.gain.value = m;
    this.musicBus.gain.value = s.music * 0.6;
    this.sfxBus.gain.value = s.sfx;
  },
  loadOverride(name, url) {
    fetch(url).then((r) => r.arrayBuffer()).then((ab) => this.ctx.decodeAudioData(ab)).then((b) => this.buffers.set(name, b)).catch((e) => console.warn('[Audio] override failed', name, e));
  },
  /* ---------- building blocks ---------- */
  noise(dur, filterType, freq, q, gain, when = 0, freqEnd) {
    const c = this.ctx, t = c.currentTime + when;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(this._out);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },
  tone(type, f0, f1, dur, gain, when = 0) {
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this._out); o.start(t); o.stop(t + dur + 0.05);
  },
  /** Distance attenuation + stereo pan relative to the player. */
  spatial(x, z) {
    const c = this.ctx;
    const g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
    let vol = 1, p = 0;
    if (x != null && S && S.chars[S.active]) {
      const d = S.chars[S.active].pos, dist = Math.hypot(x - d.x, z - d.z);
      vol = U.clamp(1 - dist / 30, 0.05, 1);
      const yaw = Render.cam.curYaw, rx = (x - d.x) * Math.cos(yaw) - (z - d.z) * Math.sin(yaw);
      p = U.clamp(rx / 10, -0.9, 0.9);
    }
    g.gain.value = vol;
    if (pan) { pan.pan.value = p; g.connect(pan); pan.connect(this.sfxBus); } else g.connect(this.sfxBus);
    return g;
  },
  play(name, x, z) {
    if (!this.ok) return;
    this._out = this.spatial(x, z);
    const b = this.buffers.get(name);
    if (b) { const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this._out); s.start(); return; }
    const r = Math.random;
    switch (name) {
      case 'groan': {
        const c = this.ctx, t = c.currentTime, dur = 1.1 + r() * 0.8, base = 70 + r() * 50;
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * (0.7 + r() * 0.2), t + dur);
        const lfo = c.createOscillator(); lfo.frequency.value = 5 + r() * 3; const lg = c.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.2); g.gain.linearRampToValueAtTime(0.0, t + dur);
        for (const [f, q] of [[480 + r() * 120, 6], [1100 + r() * 200, 8]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; o.connect(bp); bp.connect(g); }
        g.connect(this._out); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
        break;
      }
      case 'zdie': this.noise(0.5, 'lowpass', 600, 1, 0.3); this.tone('sine', 120, 50, 0.4, 0.3); break;
      case 'thud': this.tone('sine', 140, 55, 0.18, 0.5); this.noise(0.12, 'lowpass', 900, 1, 0.35); break;
      case 'slash': this.noise(0.22, 'highpass', 2200, 1, 0.3, 0, 6000); this.tone('sine', 220, 120, 0.12, 0.2); break;
      case 'swish': this.noise(0.18, 'bandpass', 1500, 2, 0.15, 0, 400); break;
      case 'hurt': this.noise(0.2, 'bandpass', 700, 3, 0.35); this.tone('triangle', 260, 180, 0.25, 0.2); break;
      case 'hammer': for (let i = 0; i < 4; i++) { this.tone('square', 900, 400, 0.05, 0.15, i * 0.28); this.noise(0.06, 'bandpass', 2500, 2, 0.3, i * 0.28); } break;
      case 'bang': this.tone('sine', 90, 40, 0.3, 0.6); this.noise(0.25, 'lowpass', 500, 1, 0.4); break;
      case 'glass': for (let i = 0; i < 6; i++) this.tone('sine', 2500 + r() * 3000, 1500, 0.15, 0.08, i * 0.03); this.noise(0.35, 'highpass', 4000, 1, 0.3); break;
      case 'step': this.noise(0.07, 'lowpass', x === 'soft' ? 600 : 1800, 1, 0.12); break;
      case 'ui': this.tone('sine', 880, 660, 0.06, 0.08); break;
      case 'eat': this.noise(0.08, 'bandpass', 1200, 4, 0.1); this.noise(0.08, 'bandpass', 900, 4, 0.1, 0.15); break;
      case 'alarm': for (let i = 0; i < 4; i++) this.tone('square', 880, 660, 0.2, 0.12, i * 0.3); break;
      default: break;
    }
  },
  footstep(surface) { if (!this.ok) return; this._out = this.spatial(); this.noise(0.07, 'lowpass', surface === 'soft' ? 500 : surface === 'wood' ? 1100 : 2000, 1, surface === 'soft' ? 0.08 : 0.13); },
  /* ---------- ambient beds ---------- */
  buildAmbient() {
    const c = this.ctx;
    const mk = (type, freq, q) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.ambBus); s.start(); return { g, f }; };
    this.wind = mk('lowpass', 380, 0.6);
    this.city = mk('bandpass', 180, 0.8);
    const hum = c.createOscillator(); hum.frequency.value = 100; const hg = c.createGain(); hg.gain.value = 0; const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 220; hum.connect(hf); hf.connect(hg); hg.connect(this.ambBus); hum.start(); this.hum = hg;
    const gen = c.createOscillator(); gen.type = 'sawtooth'; gen.frequency.value = 52; const gg = c.createGain(); gg.gain.value = 0; const gf = c.createBiquadFilter(); gf.type = 'lowpass'; gf.frequency.value = 300; gen.connect(gf); gf.connect(gg); gg.connect(this.ambBus); gen.start(); this.gen = gg;
    this.insectT = 0;
  },
  /* ---------- generative music ---------- */
  buildMusic() {
    const c = this.ctx;
    this.pad = [0, 1, 2].map(() => { const o = c.createOscillator(); o.type = 'triangle'; const g = c.createGain(); g.gain.value = 0.0; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; o.connect(f); f.connect(g); g.connect(this.musicBus); o.start(); return { o, g }; });
    const drone = c.createOscillator(); drone.type = 'sine'; drone.frequency.value = 55;
    const trem = c.createOscillator(); trem.frequency.value = 1.6; const tg = c.createGain(); tg.gain.value = 0.5;
    const dg = c.createGain(); dg.gain.value = 0; trem.connect(tg); tg.connect(dg.gain);
    drone.connect(dg); dg.connect(this.musicBus); drone.start(); trem.start();
    this.drone = dg;
  },
  chords: [[220, 261.6, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [164.8, 207.7, 246.9]],
  scale: [440, 523.3, 587.3, 659.3, 784, 880],
  tension(n) { this.tens = U.lerp(this.tens, Math.min(1, n / 4), 0.05); },
  update(dt) {
    if (!this.ok || !S) return;
    const c = this.ctx, t = c.currentTime;
    const d = S.chars[S.active];
    const indoor = Scene.W && Scene.W.isIndoor(d.pos.x, d.pos.z, d.pos.floor);
    const night = Render.night;
    this.wind.g.gain.setTargetAtTime((indoor ? 0.02 : 0.06) + night * 0.02, t, 0.5);
    this.city.g.gain.setTargetAtTime(S.flags.outbreak ? 0.0 : (indoor ? 0.01 : 0.035), t, 1);
    this.hum.gain.setTargetAtTime(indoor && Scene.isHome() && Appliances.lightsPowered() ? 0.02 : 0, t, 0.5);
    const genOn = Scene.isHome() && Appliances.generator() && Appliances.genState(Appliances.generator()).on && !Power.gridOn();
    this.gen.gain.setTargetAtTime(genOn ? (indoor ? 0.03 : 0.06) : 0, t, 0.5);
    // Night insects
    this.insectT -= dt;
    if (night > 0.5 && !indoor && this.insectT <= 0) { this.insectT = 0.4 + Math.random() * 1.5; this._out = this.ambBus; for (let i = 0; i < 3; i++) this.tone('sine', 4200 + Math.random() * 900, 0, 0.04, 0.015, i * 0.06); }
    // Music: slow pad changes + sparse notes; tension drone when zombies are aware
    this.musicT -= dt;
    if (this.musicT <= 0) {
      this.musicT = 9 + Math.random() * 5; this.chord = (this.chord + 1 + Math.floor(Math.random() * 2)) % this.chords.length;
      this.chords[this.chord].forEach((f, i) => { const p = this.pad[i]; p.o.frequency.setTargetAtTime(f / 2, t, 1.5); p.g.gain.setTargetAtTime(0.035, t, 2); });
    }
    this.noteT -= dt;
    if (this.noteT <= 0) { this.noteT = 2.5 + Math.random() * 5; this._out = this.musicBus; this.tone('triangle', U.pick(Math.random, this.scale) / (Math.random() < 0.5 ? 2 : 1), 0, 1.6, 0.035); }
    this.drone.gain.setTargetAtTime(this.tens * 0.12, t, 0.8);
    // Footsteps
    if (d._moving && !d.sleeping) {
      this.stepT -= dt * (d._moving === 'run' ? 1.8 : d._moving === 'sneak' ? 0.6 : 1);
      if (this.stepT <= 0) { this.stepT = 0.42; const g = Scene.W && Scene.W.kind === 'home' && !indoor ? 'soft' : (Scene.isHome() && d.pos.floor === 1 ? 'wood' : 'hard'); this.footstep(g); }
    }
  },
};
