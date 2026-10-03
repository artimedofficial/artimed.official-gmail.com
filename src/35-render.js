/* ==========================================================================
   35 · RENDERER — scene, camera rig, day/night lighting, light budgeting,
   cutaway walls, floor visibility, picking, dust, quality detection.
   ========================================================================== */

const Render = {
  renderer: null, scene: null, camera: null, W: null,
  q: QUALITY.medium,
  cam: { tx: -1, tz: 2, yaw: 0, yawIdx: 0, curYaw: 0, pitch: 0.95, dist: 17, curDist: 17, follow: true, ctx: -1, ctz: 2 },
  YAW_OFFSET: -0.6,
  viewFloor: 0,
  lightPool: [],
  ray: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  fps: { frames: 0, acc: 0, value: 0, ms: 0 },
  night: 0,

  /** Create the WebGL renderer. Returns false if WebGL is unavailable. */
  init(container, qualityKey) {
    this.q = qualityOf(qualityKey);
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: this.q.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    } catch (e) { console.error('[Render] WebGL init failed', e); return false; }
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pixelRatio));
    r.setSize(container.clientWidth, container.clientHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);
    r.domElement.id = 'gl';
    Tex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    Tex.maxSize = this.q.key === 'low' ? 256 : 1024;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0b1018, 0.012);
    this.camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.3, 260);

    if (this.q.envMap) {
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.35;
      pm.dispose();
    }
    this.hemi = new THREE.HemisphereLight(0xbfd6ff, 0x4a3b2a, 0.6);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.q.shadowMap, this.q.shadowMap);
    const sc = this.sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    // Point-light pool (light budgeting): only the nearest active sources get a pooled light.
    for (let i = 0; i < this.q.maxLights; i++) {
      const L = new THREE.PointLight(0xffc98a, 0, 8, 2);
      if (i < this.q.shadowLights) { L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.002; L.shadow.radius = 3; }
      this.scene.add(L); this.lightPool.push(L);
    }
    this.buildSky();
    this.buildMarkers();
    window.addEventListener('resize', () => this.resize(container));
    return true;
  },
  resize(container) {
    if (!this.renderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  },
  applyQuality(key) {
    this.q = qualityOf(key);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pixelRatio));
    this.sun.shadow.mapSize.set(this.q.shadowMap, this.q.shadowMap);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    if (this.dust) this.dust.visible = this.q.dust > 0;
  },

  /* ---------- Sky dome, stars, moon ---------- */
  buildSky() {
    const geo = new THREE.SphereGeometry(200, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x0a1220) }, horizon: { value: new THREE.Color(0x1c2534) }, glow: { value: new THREE.Color(0x000000) }, sunDir: { value: new THREE.Vector3(0, 1, 0) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; uniform vec3 glow; uniform vec3 sunDir; varying vec3 vP; void main(){ float h = clamp(vP.y*1.4,0.0,1.0); vec3 c = mix(horizon, top, pow(h,0.6)); float s = max(dot(normalize(vP), normalize(sunDir)),0.0); c += glow * pow(s, 6.0) * (1.0-h*0.6); gl_FragColor = vec4(c,1.0); }',
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.scene.add(this.sky);
    const n = 900, pos = new Float32Array(n * 3), rng = U.makeRng(77);
    for (let i = 0; i < n; i++) {
      const th = rng() * Math.PI * 2, ph = Math.acos(0.15 + rng() * 0.85);
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * 190; pos[i * 3 + 1] = Math.cos(ph) * 190; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 190;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.scene.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe6ecff, fog: false, transparent: true, opacity: 0 }));
    this.scene.add(this.moon);
  },
  buildMarkers() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 5;
    this.clickMarker = ring; this.scene.add(ring);
    this.hoverBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }));
    this.hoverBox.visible = false; this.scene.add(this.hoverBox);
    const sel = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.55, depthWrite: false }));
    sel.rotation.x = -Math.PI / 2; this.playerRing = sel; this.scene.add(sel);
  },
  setWorld(W) {
    this.W = W;
    if (this.q.dust > 0) this.buildDust();
    this.updateCutaway(true);
  },
  /** Floating dust motes inside the house — catch the warm light. */
  buildDust() {
    const n = this.q.dust, pos = new Float32Array(n * 3), rng = U.makeRng(5), b = this.W.dustRect;
    for (let i = 0; i < n; i++) { pos[i * 3] = U.lerp(b.x0, b.x1, rng()); pos[i * 3 + 1] = rng() * 2.6; pos[i * 3 + 2] = U.lerp(b.z0, b.z1, rng()); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustMat = new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.022, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
    this.dust = new THREE.Points(g, this.dustMat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  },

  /* ---------- Camera ---------- */
  rotate(dir) { this.cam.yawIdx = (this.cam.yawIdx + dir + 4) % 4; this.cam.yaw += dir * Math.PI / 2; },
  zoom(delta) { this.cam.dist = U.clamp(this.cam.dist * (1 + delta), 7, 34); },
  pan(dx, dz) {
    const y = this.cam.curYaw;
    const s = this.cam.curDist * 0.0016;
    this.cam.tx += (dx * Math.cos(y) + dz * Math.sin(y)) * s * 60;
    this.cam.tz += (-dx * Math.sin(y) + dz * Math.cos(y)) * s * 60;
    const B = this.W ? this.W.camBounds : { x0: -30, x1: 30, z0: -30, z1: 30 };
    this.cam.tx = U.clamp(this.cam.tx, B.x0, B.x1); this.cam.tz = U.clamp(this.cam.tz, B.z0, B.z1);
    this.cam.follow = false;
  },
  updateCamera(dt, focus) {
    const c = this.cam;
    if (c.follow && focus) { c.tx = U.lerp(c.tx, focus.x, Math.min(1, dt * 3)); c.tz = U.lerp(c.tz, focus.z, Math.min(1, dt * 3)); }
    const k = Math.min(1, dt * 7);
    c.curYaw = U.lerp(c.curYaw, c.yaw + this.YAW_OFFSET, k);
    c.curDist = U.lerp(c.curDist, c.dist, k);
    c.ctx = U.lerp(c.ctx, c.tx, k); c.ctz = U.lerp(c.ctz, c.tz, k);
    const fy = this.viewFloor * CFG.FLOOR_H;
    const horiz = Math.cos(c.pitch) * c.curDist, h = Math.sin(c.pitch) * c.curDist;
    this.camera.position.set(c.ctx + Math.sin(c.curYaw) * horiz, fy + h, c.ctz + Math.cos(c.curYaw) * horiz);
    this.camera.lookAt(c.ctx, fy + 0.6, c.ctz);
    const prevIdx = this._cutYaw;
    const cy = Math.round((c.curYaw - this.YAW_OFFSET) / (Math.PI / 2));
    if (prevIdx !== cy) { this._cutYaw = cy; this.updateCutaway(); }
  },
  /** Camera forward on the ground plane (from camera into the scene). */
  camForward() { const y = this.cam.curYaw; return { x: -Math.sin(y), z: -Math.cos(y) }; },
  /**
   * Cutaway rule: walls facing the camera are lowered; the far exterior walls stay full
   * so rooms keep their backdrop. Near exterior walls on either axis are always lowered.
   */
  updateCutaway() {
    if (!this.W) return;
    const f = this.camForward();
    for (const fl of this.W.floors) for (const w of fl.walls) {
      const n = w.line.axis === 'z' ? { x: 0, z: 1 } : { x: 1, z: 0 };
      const facing = Math.abs(n.x * f.x + n.z * f.z);
      let cut;
      if (w.line.exterior) {
        const outDot = (w.line.axis === 'z' ? f.z : f.x) * w.line.outward;
        cut = outDot < -0.25;            // near side exterior wall
      } else cut = facing > 0.6;
      w.full.visible = !cut; w.cut.visible = cut;
    }
  },
  setViewFloor(f) {
    this.viewFloor = U.clamp(f, 0, this.W ? this.W.floors.length - 1 : 1);
    if (this.W && this.W.floors[1]) this.W.floors[1].group.visible = this.viewFloor >= 1;
    Bus.emit('viewfloor', this.viewFloor);
  },

  /* ---------- Day / night ---------- */
  sunState(min) {
    const t = U.timeOf(min).dayMin / 60; // hours
    const rise = 6.0, set = 18.5;
    const dayT = (t - rise) / (set - rise);
    const elev = dayT >= 0 && dayT <= 1 ? Math.sin(dayT * Math.PI) : -Math.sin(((t < rise ? t + 24 : t) - set) / (24 - (set - rise)) * Math.PI) * 0.6;
    const az = U.lerp(-1.2, 1.2, U.clamp(dayT, 0, 1));
    return { elev, az, dayT };
  },
  updateDayNight(min) {
    const { elev, az } = this.sunState(min);
    const day = U.clamp(elev * 3, 0, 1), dusk = U.clamp(1 - Math.abs(elev) * 4, 0, 1) * (elev > -0.25 ? 1 : 0);
    this.night = 1 - U.clamp(elev * 4 + 0.35, 0, 1);
    const sunDir = new THREE.Vector3(Math.sin(az) * 0.8, Math.max(0.05, Math.abs(elev)) * 1.2, 0.45).normalize();
    const moonDir = new THREE.Vector3(-0.4, 0.8, -0.35).normalize();
    const dir = elev > 0 ? sunDir : moonDir;
    const c = this.cam;
    this.sun.position.set(c.ctx + dir.x * 40, dir.y * 40, c.ctz + dir.z * 40);
    this.sun.target.position.set(c.ctx, 0, c.ctz);
    const sunCol = new THREE.Color(0xffe6c4).lerp(new THREE.Color(0xff8a4a), dusk * 0.8);
    const moonCol = new THREE.Color(0x7d96c8);
    this.sun.color.copy(elev > 0 ? sunCol : moonCol);
    this.sun.intensity = elev > 0 ? 0.6 + day * 2.6 : 0.35;
    this.hemi.color.set(0xbfd6ff).lerp(new THREE.Color(0x2a3a5a), this.night);
    this.hemi.groundColor.set(0x5a4a36).lerp(new THREE.Color(0x0f1218), this.night);
    this.hemi.intensity = U.lerp(0.75, 0.12, this.night);
    if (this.scene.environment) this.scene.environmentIntensity = U.lerp(0.35, 0.03, this.night);
    // Sky colours
    const topDay = new THREE.Color(0x3d78c2), horDay = new THREE.Color(0xb9d3e8);
    const topNight = new THREE.Color(0x050a14), horNight = new THREE.Color(0x111a2a);
    const top = topDay.clone().lerp(topNight, this.night), hor = horDay.clone().lerp(horNight, this.night);
    hor.lerp(new THREE.Color(0xe08a5a), dusk * 0.6);
    this.skyMat.uniforms.top.value.copy(top); this.skyMat.uniforms.horizon.value.copy(hor);
    this.skyMat.uniforms.glow.value.set(0xffa060).multiplyScalar(dusk * 0.6 + day * 0.15);
    this.skyMat.uniforms.sunDir.value.copy(sunDir);
    this.scene.fog.color.copy(hor).multiplyScalar(0.85);
    this.scene.fog.density = U.lerp(0.009, 0.016, this.night);
    this.starMat.opacity = U.clamp(this.night * 1.2 - 0.2, 0, 0.9);
    this.moon.material.opacity = U.clamp(this.night * 1.3 - 0.3, 0, 1);
    this.moon.position.set(c.ctx + moonDir.x * 170, moonDir.y * 170, c.ctz + moonDir.z * 170);
    this.renderer.toneMappingExposure = U.lerp(1.0, 1.25, this.night);
    if (this.dustMat) this.dustMat.opacity = U.lerp(0.25, 0.6, this.night);
  },
  /**
   * Interior lighting state per room + light budget. Sources: room ceiling lights and
   * lamps (when house lights are on and it is dim), street lamps at night.
   */
  updateLights(focus, lightsOn, powerOn = true) {
    const W = this.W; if (!W) return;
    const shop = W.kind === 'location';
    const want = lightsOn && powerOn && (shop || this.night > 0.25);
    const flick = S ? Power.flicker(S.time.min) : 1;
    if (W.shopPanelMat) W.shopPanelMat.emissiveIntensity = want ? 1.4 * flick : 0;
    const sources = [];
    for (const L of W.lights) {
      const on = want && (L.kind !== 'street');
      if (L.fixture) L.fixture.traverse((o) => { if (o.isMesh && o.material.emissive) o.material.emissiveIntensity = on ? 1.6 : 0; });
      if (L.lampMat) L.lampMat.emissiveIntensity = on ? 0.45 : 0;
      if (on && L.floor <= this.viewFloor) sources.push(L);
    }
    for (const [room, m] of W.windowMats) {
      m.emissiveIntensity = want && room !== 'none' ? 0.9 : 0;
      m.opacity = want ? 0.75 : 0.32;
    }
    const streetOn = powerOn && this.night > 0.35;
    if (W.streetLamps && streetOn) for (const p of W.streetLamps) sources.push({ pos: p, color: 0xffa860, intensity: 30, dist: 16, kind: 'street' });
    const lampGlow = Mat.cache.get('streetlampGlow'); if (lampGlow) lampGlow.emissiveIntensity = streetOn ? 3 : 0;
    // Rank by distance to the camera focus; interior lights on the viewed floor win.
    const fx = focus ? focus.x : this.cam.tx, fz = focus ? focus.z : this.cam.tz;
    sources.sort((a, b) => {
      const pa = a.kind === 'street' ? 30 : 0, pb = b.kind === 'street' ? 30 : 0;
      return (Math.hypot(a.pos.x - fx, a.pos.z - fz) + pa) - (Math.hypot(b.pos.x - fx, b.pos.z - fz) + pb);
    });
    for (let i = 0; i < this.lightPool.length; i++) {
      const L = this.lightPool[i], src = sources[i];
      if (src) { L.position.copy(src.pos); L.color.set(src.color); L.intensity = src.intensity * (src.kind === 'street' ? 1 : flick); L.distance = src.dist; L.visible = true; }
      else { L.intensity = 0; L.visible = false; }
    }
  },

  /* ---------- Picking ---------- */
  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
    const W = this.W;
    // Furniture on visible floors first
    const objs = [];
    for (const [, obj] of W.furn) if (obj.visible && obj.parent && obj.parent.visible !== false && obj.userData.floor <= this.viewFloor) objs.push(obj);
    const hits = this.ray.intersectObjects(objs, true);
    let furnHit = null;
    for (const h of hits) {
      let o = h.object; while (o && !o.userData.furnUid) o = o.parent;
      if (o) { furnHit = { uid: o.userData.furnUid, point: h.point, dist: h.distance }; break; }
    }
    // Ground plane of the viewed floor
    const fy = this.viewFloor * CFG.FLOOR_H;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(this.viewFloor === 0 ? W.pickY0 : fy));
    const gp = new THREE.Vector3();
    let ground = null;
    if (this.ray.ray.intersectPlane(plane, gp)) {
      // Re-intersect with the house slab height if inside the footprint on floor 0
      if (this.viewFloor === 0 && W.slab) {
        const p0 = new THREE.Vector3();
        if (this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p0) && W.groundY(p0.x, p0.z, 0) === 0) gp.copy(p0);
      }
      ground = { x: gp.x, z: gp.z, floor: this.viewFloor, dist: this.ray.ray.origin.distanceTo(gp) };
    }
    // Stairs: clicking the steps means "go to the other floor".
    const sh = W.stairsObj ? this.ray.intersectObject(W.stairsObj, true)[0] : null;
    if (sh && (!furnHit || sh.distance < furnHit.dist) && (!ground || sh.distance <= ground.dist + 0.5)) return { kind: 'stairs', ground };
    // Upper floor: a click inside the stairwell opening also means "use the stairs".
    const st = W.stairs;
    if (st && ground && this.viewFloor === 1 && ground.x > st.x0 - 0.1 && ground.x < st.x1 + 0.1 && ground.z > st.zBottom && ground.z < st.zTop) return { kind: 'stairs', ground };
    if (furnHit && (!ground || furnHit.dist <= ground.dist + 0.5)) return { kind: 'furn', uid: furnHit.uid, ground };
    return ground ? { kind: 'ground', ground } : null;
  },
  showHover(obj) {
    if (!obj) { this.hoverBox.visible = false; return; }
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    this.hoverBox.scale.set(size.x + 0.04, size.y + 0.04, size.z + 0.04);
    this.hoverBox.position.copy(c);
    this.hoverBox.visible = true;
  },
  flashClick(x, y, z) { this.clickMarker.position.set(x, y + 0.02, z); this.clickMarker.material.opacity = 0.95; this.clickMarker.scale.setScalar(0.6); },

  frame(realDt, simDt, focus) {
    if (this.clickMarker.material.opacity > 0) {
      this.clickMarker.material.opacity = Math.max(0, this.clickMarker.material.opacity - realDt * 1.4);
      this.clickMarker.scale.setScalar(this.clickMarker.scale.x + realDt * 1.2);
    }
    if (this.dust && this.dust.visible) {
      const p = this.dust.geometry.attributes.position, t = performance.now() * 0.0002;
      for (let i = 0; i < p.count; i += 3) { p.array[i * 3 + 1] += Math.sin(t + i) * 0.0006; p.array[i * 3] += Math.cos(t * 0.7 + i) * 0.0004; }
      p.needsUpdate = true;
      this.dust.position.y = this.viewFloor * CFG.FLOOR_H;
    }
    this.renderer.render(this.scene, this.camera);
    // FPS meter
    this.fps.frames++; this.fps.acc += realDt;
    if (this.fps.acc >= 0.5) { this.fps.value = this.fps.frames / this.fps.acc; this.fps.ms = (this.fps.acc / this.fps.frames) * 1000; this.fps.frames = 0; this.fps.acc = 0; }
  },
};

/**
 * Quality auto-detection (§2.6): render the real home scene at High settings for a
 * short burst and pick the tier from average frame time.
 */
const QualityBench = {
  async run(frames = 40) {
    const t0 = performance.now();
    let n = 0;
    await new Promise((res) => {
      const step = () => {
        Render.cam.yaw += 0.02;
        Render.updateCamera(0.016, null);
        Render.renderer.render(Render.scene, Render.camera);
        if (++n >= frames) res(); else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const ms = (performance.now() - t0) / frames;
    Render.cam.yaw = 0;
    const key = ms < 12 ? 'high' : ms < 24 ? 'medium' : 'low';
    return { key, ms: Math.round(ms * 10) / 10 };
  },
};
