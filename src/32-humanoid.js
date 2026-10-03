/* ==========================================================================
   32 · PROCEDURAL ARTICULATED HUMANOID (§2.3)
   Joint hierarchy: root → hips → spine → chest → neck → head
                                     chest → shoulder → upperArm → elbow → forearm → hand
                              hips  → thigh → knee → shin → foot
   Animation is procedural (sine gait with weight shift). Faces +Z.
   Characters and (later) zombies share this rig with different params.
   ========================================================================== */

class Humanoid {
  /**
   * @param {object} look {skin, hair, shirt, pants, shoes?, hairStyle?, build?(0.9..1.1)}
   */
  constructor(look = {}) {
    this.look = Object.assign({ skin: '#c08a62', hair: '#1c1612', shirt: '#3d6b9a', pants: '#2c3440', shoes: '#2a2522', hairStyle: 0, build: 1, height: 1 }, look);
    this.root = new THREE.Group();
    this.root.name = 'humanoid';
    this.phase = 0;
    this.blend = { walk: 0, run: 0, sneak: 0 };
    this.t = Math.random() * 10;
    this.mats = {
      skin: new THREE.MeshStandardMaterial({ color: this.look.skin, roughness: 0.62 }),
      hair: new THREE.MeshStandardMaterial({ color: this.look.hair, roughness: 0.55 }),
      shirt: new THREE.MeshStandardMaterial({ color: this.look.shirt, roughness: 0.85, map: Tex.get('fabric').map }),
      pants: new THREE.MeshStandardMaterial({ color: this.look.pants, roughness: 0.85, map: Tex.get('fabric').map }),
      shoes: new THREE.MeshStandardMaterial({ color: this.look.shoes, roughness: 0.5 }),
      eye: Mat.color('#121212', 0.3),
    };
    this.build();
  }

  _mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  _joint(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  /** Tapered limb: capsule scaled along its length. */
  _limb(r1, r2, len, mat, parent) {
    const pts = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const r = U.lerp(r1, r2, t);
      const cap = t < 0.12 ? Math.sin((t / 0.12) * Math.PI / 2) : t > 0.88 ? Math.sin(((1 - t) / 0.12) * Math.PI / 2) : 1;
      pts.push(new THREE.Vector2(Math.max(0.001, r * (0.35 + 0.65 * cap)), -t * len));
    }
    const geo = new THREE.LatheGeometry(pts, 12);
    return this._mesh(geo, mat, parent);
  }

  build() {
    const L = this.look, b = L.build, H = L.height;
    const R = this.root;
    const hipY = 0.93 * H;
    this.hips = this._joint(R, 0, hipY, 0);
    // Pelvis
    const pelvis = new THREE.SphereGeometry(0.16, 14, 10); pelvis.scale(1.05 * b, 0.62, 0.72);
    this._mesh(pelvis, this.mats.pants, this.hips, 0, 0.02, 0);
    // Spine & chest (lathe torso, flattened front-back)
    this.spine = this._joint(this.hips, 0, 0.06, 0);
    this.chest = this._joint(this.spine, 0, 0.22 * H, 0);
    const tp = [];
    const prof = [[0.135, -0.24], [0.14, -0.18], [0.15, -0.08], [0.168, 0.02], [0.175, 0.1], [0.16, 0.16], [0.11, 0.2], [0.05, 0.215]];
    for (const [r, y] of prof) tp.push(new THREE.Vector2(r * b, y));
    const torso = new THREE.LatheGeometry(tp, 16); torso.scale(1, 1, 0.66);
    this.torsoMesh = this._mesh(torso, this.mats.shirt, this.chest, 0, 0, 0);
    // Neck & head
    this.neck = this._joint(this.chest, 0, 0.2, 0.005);
    this._mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.1, 10), this.mats.skin, this.neck, 0, 0.04, 0);
    this.head = this._joint(this.neck, 0, 0.1, 0.01);
    const skull = new THREE.SphereGeometry(0.105, 18, 14); skull.scale(0.92, 1.12, 1.0);
    this._mesh(skull, this.mats.skin, this.head, 0, 0.1, 0);
    const jaw = new THREE.SphereGeometry(0.075, 12, 8); jaw.scale(1, 0.8, 1);
    this._mesh(jaw, this.mats.skin, this.head, 0, 0.03, 0.025);
    this._mesh(new THREE.SphereGeometry(0.013, 6, 5), this.mats.eye, this.head, -0.036, 0.115, 0.093);
    this._mesh(new THREE.SphereGeometry(0.013, 6, 5), this.mats.eye, this.head, 0.036, 0.115, 0.093);
    const nose = new THREE.ConeGeometry(0.016, 0.04, 6); nose.rotateX(Math.PI / 2);
    this._mesh(nose, this.mats.skin, this.head, 0, 0.085, 0.105);
    this._mesh(new THREE.SphereGeometry(0.02, 6, 5), this.mats.skin, this.head, -0.098, 0.1, 0);
    this._mesh(new THREE.SphereGeometry(0.02, 6, 5), this.mats.skin, this.head, 0.098, 0.1, 0);
    // Hair
    const hairGeo = new THREE.SphereGeometry(0.115, 18, 12, 0, Math.PI * 2, 0, Math.PI * (L.hairStyle === 1 ? 0.62 : 0.52));
    hairGeo.scale(0.95, 1.1, 1.04);
    this._mesh(hairGeo, this.mats.hair, this.head, 0, 0.115, -0.008);
    if (L.hairStyle === 1) { // longer hair at the back
      const back = new THREE.SphereGeometry(0.1, 12, 10); back.scale(1, 1.3, 0.6);
      this._mesh(back, this.mats.hair, this.head, 0, 0.04, -0.06);
    }
    // Arms
    this.arms = [-1, 1].map((s) => {
      const sh = this._joint(this.chest, s * 0.185 * b, 0.13, 0);
      this._mesh(new THREE.SphereGeometry(0.058 * b, 10, 8), this.mats.shirt, sh);
      const upper = this._joint(sh, 0, 0, 0);
      this._limb(0.055 * b, 0.045, 0.29, this.mats.shirt, upper);
      const elbow = this._joint(upper, 0, -0.29, 0);
      this._limb(0.041, 0.032, 0.25, this.mats.skin, elbow);
      const hand = this._joint(elbow, 0, -0.26, 0);
      const handGeo = new THREE.SphereGeometry(0.04, 8, 6); handGeo.scale(0.7, 1.15, 0.45);
      this._mesh(handGeo, this.mats.skin, hand, 0, -0.04, 0);
      return { sh, upper, elbow, hand, s };
    });
    // Legs
    this.legs = [-1, 1].map((s) => {
      const thigh = this._joint(this.hips, s * 0.09 * b, -0.02, 0);
      this._limb(0.078 * b, 0.058, 0.45, this.mats.pants, thigh);
      const knee = this._joint(thigh, 0, -0.44, 0);
      this._limb(0.056, 0.042, 0.43, this.mats.pants, knee);
      const foot = this._joint(knee, 0, -0.43, 0);
      this._mesh(new THREE.BoxGeometry(0.085, 0.07, 0.22).translate(0, -0.035, 0.045), this.mats.shoes, foot);
      return { thigh, knee, foot, s };
    });
    this.root.traverse((o) => { if (o.isMesh) o.userData.charPart = true; });
  }

  setLook(look) {
    Object.assign(this.look, look);
    for (const k of ['skin', 'hair', 'shirt', 'pants', 'shoes']) this.mats[k].color.set(this.look[k]);
  }

  /** Attach / detach visible gear (backpack, hand bag). */
  setGear({ back, hand }) {
    if (this.backpackMesh) { this.chest.remove(this.backpackMesh); this.backpackMesh = null; }
    if (this.handMesh) { this.arms[1].hand.remove(this.handMesh); this.handMesh = null; }
    if (back) {
      const d = itemDef(back.id), ic = d.icon || {};
      const big = d.grid ? d.grid[0] * d.grid[1] / 30 : 0.5;
      const pb = new PB('bp' + back.id);
      const w = 0.28 + big * 0.06, h = 0.36 + big * 0.18, dep = 0.14 + big * 0.06;
      pb.box(w, h, dep, Mat.tex('fabric', ic.c || '#3a5a3a', 0.9), 0, -0.18, -0.13 - dep / 2, 0.05);
      pb.box(w * 0.8, h * 0.35, 0.06, Mat.tex('fabric', ic.c2 || '#2a3f2a', 0.9), 0, -0.14, -0.13 - dep - 0.02, 0.03);
      pb.box(0.04, 0.32, 0.02, Mat.color('#222', 0.7), -0.09, -0.12, 0.09); pb.box(0.04, 0.32, 0.02, Mat.color('#222', 0.7), 0.09, -0.12, 0.09);
      this.backpackMesh = pb.build();
      this.chest.add(this.backpackMesh);
    }
    if (hand) {
      const d = itemDef(hand.id), ic = d.icon || {};
      const pb = new PB('hb' + hand.id);
      pb.box(0.26, 0.3, 0.12, Mat.tex('fabric', ic.c || '#f2f2ee', 0.95), 0, -0.4, 0, 0.04);
      pb.box(0.02, 0.14, 0.02, Mat.color(ic.c2 || '#3a8a2a', 0.8), 0, -0.12, 0);
      this.handMesh = pb.build();
      this.arms[1].hand.add(this.handMesh);
    }
  }

  /**
   * Advance the procedural animation.
   * @param {number} dt seconds (simulation time)
   * @param {object} st {mode: 'idle'|'walk'|'run'|'sneak'|'sleep', speed: m/s}
   */
  update(dt, st) {
    this.t += dt;
    const mode = st.mode || 'idle';
    const k = Math.min(1, dt * 8);
    for (const key of ['walk', 'run', 'sneak']) this.blend[key] = U.lerp(this.blend[key], mode === key ? 1 : 0, k);
    if (mode === 'sleep') { this.poseSleep(); return; }
    const stride = mode === 'run' ? 1.25 : mode === 'sneak' ? 0.55 : 0.75;
    this.phase += (st.speed || 0) * dt / stride * Math.PI;
    const p = this.phase;
    const w = this.blend.walk, r = this.blend.run, s = this.blend.sneak, mv = Math.min(1, w + r + s);
    const breath = Math.sin(this.t * 1.8) * 0.012;
    const swing = 0.45 * w + 0.75 * r + 0.3 * s;
    const crouch = 0.22 * s;
    // Hips: bob and sway (weight shift)
    this.hips.position.y = 0.93 * this.look.height - crouch + Math.abs(Math.cos(p)) * (0.025 * w + 0.05 * r) * mv;
    this.hips.position.x = Math.sin(p) * 0.02 * mv;
    this.hips.rotation.y = Math.sin(p) * 0.1 * mv;
    this.spine.rotation.x = 0.04 + 0.22 * r + 0.35 * s;
    this.spine.rotation.y = -Math.sin(p) * 0.12 * mv;
    this.chest.scale.set(1, 1 + breath, 1 + breath);
    this.neck.rotation.x = -0.05 - 0.12 * r - 0.25 * s;
    this.head.rotation.y = Math.sin(this.t * 0.4) * 0.12 * (1 - mv);
    for (const leg of this.legs) {
      const ph = p + (leg.s > 0 ? Math.PI : 0);
      leg.thigh.rotation.x = -Math.sin(ph) * swing - crouch * 2.2;
      leg.knee.rotation.x = Math.max(0, Math.sin(ph - 1.4)) * (0.7 * w + 1.3 * r + 0.6 * s) + crouch * 3.2 + 0.03;
      leg.foot.rotation.x = -leg.thigh.rotation.x * 0.25 - leg.knee.rotation.x * 0.55;
      leg.thigh.rotation.z = leg.s * 0.03;
    }
    for (const arm of this.arms) {
      const ph = p + (arm.s > 0 ? 0 : Math.PI);
      const carrying = arm.s > 0 && this.handMesh;
      arm.upper.rotation.x = carrying ? -0.05 : -Math.sin(ph) * swing * 0.85 - 0.1 * r + Math.sin(this.t * 1.8) * 0.02;
      arm.upper.rotation.z = arm.s * (0.08 + (carrying ? 0.12 : 0) + 0.04 * r);
      arm.elbow.rotation.x = carrying ? -0.1 : -(0.15 + 0.25 * w + 1.2 * r + 0.6 * s + Math.max(0, Math.sin(ph)) * 0.3 * mv);
    }
  }
  poseSleep() {
    this.hips.position.set(0, 0.93 * this.look.height, 0);
    this.spine.rotation.set(0, 0, 0); this.hips.rotation.set(0, 0, 0);
    this.chest.scale.set(1, 1 + Math.sin(this.t * 1.1) * 0.02, 1);
    for (const leg of this.legs) { leg.thigh.rotation.set(0, 0, leg.s * 0.05); leg.knee.rotation.x = 0.08; leg.foot.rotation.x = 0.4; }
    for (const arm of this.arms) { arm.upper.rotation.set(0.1, 0, arm.s * 0.12); arm.elbow.rotation.x = -0.4; }
    this.neck.rotation.x = 0.1; this.head.rotation.y = 0.3;
  }
  dispose() {
    this.root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    for (const k of ['skin', 'hair', 'shirt', 'pants', 'shoes']) this.mats[k].dispose();
  }
}
AssetRegistry.register('char.humanoid', (o) => new Humanoid(o.look).root);
