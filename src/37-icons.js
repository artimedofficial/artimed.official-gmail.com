/* ==========================================================================
   37 · ITEM ICONS — each item's stylised 3D model is rendered once to an
   offscreen canvas with consistent studio lighting and cached as a data URL.
   ASSET_OVERRIDES['icon.<itemId>'] (image URL/data URI) replaces any icon.
   ========================================================================== */

const Icons = {
  cache: new Map(),
  px: 72, // pixels per grid cell (rendered), displayed at CFG.CELL_PX
  r: null, scene: null, cam: null,

  init() {
    try {
      const canvas = document.createElement('canvas');
      this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    } catch (e) { console.warn('[Icons] WebGL unavailable, using vector fallbacks'); this.r = null; return; }
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.45;
    this.r.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.0));
    const key = new THREE.DirectionalLight(0xfff2e0, 2.4); key.position.set(2, 4, 3); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc4ff, 1.4); rim.position.set(-3, 2, -2); this.scene.add(rim);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  },
  /** Data URL for an item id (cached). opened → the "Opened" variant (§6.5.2). */
  get(id, opened = false) {
    const ov = ASSET_OVERRIDES['icon.' + id];
    if (ov && !/\.(glb|gltf)/i.test(ov)) return ov;
    if (opened) return this.openedIcon(id);
    if (this.cache.has(id)) return this.cache.get(id);
    let url;
    try { url = this.r ? this.render(id) : this.vector(id); }
    catch (e) { console.warn('[Icons] render failed for', id, e); url = this.vector(id); }
    this.cache.set(id, url);
    return url;
  },
  render(id) {
    const d = itemDef(id);
    const [w, h] = d.size;
    const obj = IconModels.build(d);
    this.scene.add(obj);
    // Frame: fit bounding box seen from a 3/4 angle, preserving the grid aspect.
    const dir = new THREE.Vector3(0.55, 0.62, 1).normalize();
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    this.cam.position.copy(c).addScaledVector(dir, 10);
    this.cam.lookAt(c);
    this.cam.updateMatrixWorld();
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
    const inv = this.cam.matrixWorldInverse;
    let mx = 0, my = 0;
    for (const p of corners) { p.applyMatrix4(inv); mx = Math.max(mx, Math.abs(p.x)); my = Math.max(my, Math.abs(p.y)); }
    const aspect = w / h;
    let halfW = mx * 1.12, halfH = my * 1.12;
    if (halfW / halfH > aspect) halfH = halfW / aspect; else halfW = halfH * aspect;
    Object.assign(this.cam, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    this.cam.updateProjectionMatrix();
    this.r.setSize(w * this.px, h * this.px, false);
    this.r.render(this.scene, this.cam);
    const url = this.r.domElement.toDataURL('image/png');
    this.scene.remove(obj);
    obj.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    return url;
  },
  /** Opened variant: the base icon with a torn corner and an open-lid marker. */
  openedIcon(id) {
    const key = id + '|open';
    if (this.cache.has(key)) return this.cache.get(key);
    const d = itemDef(id), [w, h] = d.size;
    const c = document.createElement('canvas'); c.width = w * 64; c.height = h * 64;
    const ctx = c.getContext('2d');
    const url = this.get(id);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, c.width, c.height);
      // torn top-right corner
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.moveTo(c.width, 0); ctx.lineTo(c.width - 26, 0); ctx.lineTo(c.width - 18, 7); ctx.lineTo(c.width - 12, 4); ctx.lineTo(c.width - 6, 12); ctx.lineTo(c.width, 26); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,210,122,.95)'; ctx.beginPath(); ctx.arc(14, 14, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1208'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('½', 14, 15);
      this.cache.set(key, c.toDataURL());
      if (InvUI.isOpen) InvUI.render();
    };
    img.src = url;
    this.cache.set(key, url);       // base icon until the composite is ready
    return url;
  },
  /** Clean vector fallback (category colour + glyph). */
  vector(id) {
    const d = itemDef(id), [w, h] = d.size, c = document.createElement('canvas');
    c.width = w * 64; c.height = h * 64;
    const ctx = c.getContext('2d');
    const col = (CATEGORIES[d.cat] || CATEGORIES.misc).color;
    ctx.fillStyle = col; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.roundRect(8, 8, c.width - 16, c.height - 16, 10); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#111'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.name.slice(0, 2), c.width / 2, c.height / 2);
    return c.toDataURL();
  },
};

/** Procedural icon models by shape kind. All models sit roughly in a 1×1(×h) box. */
const IconModels = {
  labelTex(main, band, stripes = true) {
    const key = 'lbl:' + main + band + stripes;
    if (Tex.cache.has(key)) return Tex.cache.get(key);
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = main; ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = band; ctx.fillRect(0, 22, 128, 20);
    if (stripes) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 4; i++) ctx.fillRect(8 + i * 30, 29, 18, 4); }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, 128, 3); ctx.fillRect(0, 61, 128, 3);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    Tex.cache.set(key, t);
    return t;
  },
  lm(main, band) { return new THREE.MeshStandardMaterial({ map: this.labelTex(main, band || '#ffffff'), roughness: 0.45, metalness: 0.1 }); },
  build(d) {
    const ic = d.icon || { k: 'box', c: '#888', c2: '#555' };
    const c = ic.c || '#999', c2 = ic.c2 || '#555', b = ic.b || '#fff';
    const pb = new PB('icon' + d.id);
    const k = ic.k;
    const plain = (hex, r = 0.5, m = 0) => Mat.color(hex, r, m);
    switch (k) {
      case 'can': pb.cyl(0.36, 0.36, 0.5, this.lm(c, b), 0, 0, 0, 28); pb.cyl(0.37, 0.37, 0.04, plain(c2, 0.25, 0.9), 0, 0.5, 0, 28); pb.cyl(0.37, 0.37, 0.04, plain(c2, 0.25, 0.9), 0, -0.02, 0, 28); break;
      case 'bottle': pb.cyl(0.22, 0.22, 0.95, this.lm(c, b), 0, 0, 0, 20); pb.cyl(0.08, 0.22, 0.25, plain(c, 0.2), 0, 0.95, 0, 20); pb.cyl(0.085, 0.085, 0.12, plain(c2, 0.4), 0, 1.2, 0, 14); break;
      case 'smallbottle': pb.cyl(0.25, 0.25, 0.55, this.lm(c, b), 0, 0, 0, 20); pb.cyl(0.12, 0.12, 0.2, plain(c2, 0.4), 0, 0.55, 0, 14); break;
      case 'jug': pb.box(0.85, 0.85, 0.55, plain(c, 0.15, 0.05), 0, 0, 0, 0.12); pb.cyl(0.11, 0.11, 0.18, plain(c2, 0.4), -0.2, 0.85, 0, 12); pb.box(0.15, 0.25, 0.1, plain(c, 0.2), 0.32, 0.55, 0, 0.04); break;
      case 'carton': pb.box(0.55, 0.85, 0.45, this.lm(c, c2), 0, 0, 0, 0.02); pb.box(0.55, 0.12, 0.2, plain(c, 0.5), 0, 0.85, 0, 0, [0.6, 0, 0]); pb.cyl(0.05, 0.05, 0.06, plain(b, 0.4), 0.12, 0.9, 0.1, 10); break;
      case 'sack': pb.box(0.9, 1.1, 0.42, this.lm(c, b), 0, 0, 0, 0.18); pb.box(0.6, 0.25, 0.04, plain(c2, 0.6), 0, 0.55, 0.22, 0.02); break;
      case 'pack': pb.box(0.85, 0.32, 0.7, this.lm(c, c2), 0, 0, 0, 0.1); break;
      case 'pillow': pb.box(0.8, 1.15, 0.36, this.lm(c, c2), 0, 0, 0, 0.16); pb.box(0.82, 0.08, 0.2, plain(c2, 0.5), 0, 1.1, 0, 0.03); pb.box(0.82, 0.08, 0.2, plain(c2, 0.5), 0, -0.02, 0, 0.03); break;
      case 'cup': pb.cyl(0.42, 0.32, 0.6, this.lm(c, c2), 0, 0, 0, 24); pb.cyl(0.43, 0.43, 0.03, plain(b, 0.3, 0.3), 0, 0.6, 0, 24); break;
      case 'jar': pb.cyl(0.35, 0.35, 0.65, this.lm(c, b), 0, 0, 0, 24); pb.cyl(0.33, 0.33, 0.15, plain(c2, 0.4), 0, 0.65, 0, 24); break;
      case 'bar': pb.box(0.85, 0.12, 0.4, this.lm(c, c2), 0, 0, 0, 0.04); break;
      case 'box': pb.box(0.75, 0.65, 0.45, this.lm(c, b), 0, 0, 0, 0.02); pb.box(0.3, 0.2, 0.01, plain(c2, 0.5), 0, 0.35, 0.23); break;
      case 'loaf': pb.box(1.3, 0.55, 0.6, plain(c, 0.85), 0, 0, 0, 0.22); pb.box(1.32, 0.15, 0.62, plain(b, 0.2, 0, ), 0, 0.15, 0, 0.05); break;
      case 'egg': pb.sphere(0.3, plain(c, 0.6), 0, 0.38, 0, 1, 1.3, 1, 20); break;
      case 'tray': pb.box(1.4, 0.12, 0.8, plain('#f2f2f2', 0.4), 0, 0, 0, 0.04); pb.box(1.2, 0.18, 0.62, plain(c, 0.55), 0, 0.08, 0, 0.12); pb.box(1.42, 0.02, 0.82, Mat.color('#ffffff', 0.05, 0, { transparent: true, opacity: 0.35 }), 0, 0.27, 0, 0.02); pb.box(0.4, 0.02, 0.25, plain(b, 0.5), 0.35, 0.29, 0.15); break;
      case 'frozen': pb.box(1.4, 0.3, 0.8, plain(c, 0.3), 0, 0, 0, 0.12); pb.box(0.7, 0.05, 0.5, plain(c2, 0.6), -0.2, 0.3, 0, 0.03); pb.box(1.42, 0.08, 0.15, plain(b, 0.5), 0, 0.12, 0.35); for (let i = 0; i < 4; i++) pb.sphere(0.05, Mat.color('#ffffff', 0.2, 0, { transparent: true, opacity: 0.8 }), -0.5 + i * 0.3, 0.33, 0.25, 1, 0.4, 1, 6); break;
      case 'tub': pb.cyl(0.42, 0.36, 0.55, this.lm(c, b), 0, 0, 0, 24); pb.cyl(0.44, 0.44, 0.08, plain(c2, 0.4), 0, 0.55, 0, 24); break;
      case 'greens': for (let i = 0; i < 7; i++) pb.sphere(0.18, plain(i % 2 ? c : c2, 0.7), (i - 3) * 0.07, 1.2 - Math.abs(i - 3) * 0.05, 0, 0.6, 1.8, 0.4, 10); pb.cyl(0.12, 0.1, 0.9, plain(c2, 0.6), 0, 0, 0, 10); pb.cyl(0.13, 0.13, 0.08, plain(b, 0.5), 0, 0.3, 0, 10); break;
      case 'round': pb.sphere(0.42, plain(c, 0.35), 0, 0.42, 0, 1, 0.92, 1, 24); pb.sphere(0.12, plain(b, 0.6), 0, 0.82, 0, 1.2, 0.3, 1.2, 10); break;
      case 'banana': for (let i = 0; i < 5; i++) { const g = new THREE.TorusGeometry(0.6, 0.11, 8, 16, Math.PI * 0.55); pb.geo(g, plain(c, 0.5), 0, 0.1 + i * 0.03, 0.2 - i * 0.08, [0, 0, 2.4 + i * 0.08]); } pb.cyl(0.07, 0.06, 0.25, plain(c2, 0.7), -0.5, 0.45, 0, 8, [0, 0, 0.6]); break;
      case 'blister': pb.box(0.8, 0.05, 0.55, plain(c, 0.3, 0.4), 0, 0, 0, 0.02); for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) pb.sphere(0.08, plain(c2, 0.4), -0.27 + j * 0.18, 0.06, -0.12 + i * 0.24, 1, 0.5, 1, 10); break;
      case 'case': pb.box(1.3, 0.85, 0.45, plain(c, 0.45), 0, 0, 0, 0.08); pb.box(0.15, 0.45, 0.02, plain(c2, 0.4), 0, 0.2, 0.23); pb.box(0.45, 0.15, 0.02, plain(c2, 0.4), 0, 0.35, 0.23); pb.box(0.45, 0.08, 0.12, plain('#333', 0.4), 0, 0.85, 0, 0.03); break;
      case 'hammer': pb.box(0.12, 1.4, 0.1, plain(c2, 0.6), 0, 0, 0, 0.03); pb.box(0.6, 0.2, 0.18, plain(c, 0.3, 0.8), 0.05, 1.35, 0, 0.03); break;
      case 'saw': pb.box(0.45, 1.9, 0.02, Mat.tex('metal', c, 0.3, 0.9), 0, 0.5, 0); pb.box(0.5, 0.55, 0.12, plain(c2, 0.5), 0, 0, 0, 0.05); break;
      case 'screwdriver': pb.cyl(0.12, 0.12, 0.4, plain(c, 0.4), 0, 0, 0, 12); pb.cyl(0.03, 0.03, 0.55, plain(c2, 0.2, 0.9), 0, 0.4, 0, 8); break;
      case 'flashlight': pb.cyl(0.14, 0.14, 0.6, plain(c, 0.4, 0.5), 0, 0, 0, 16, [0, 0, 1.2]); pb.cyl(0.22, 0.15, 0.2, plain(c, 0.3, 0.6), 0.35, 0.18, 0, 16, [0, 0, 1.2]); break;
      case 'battery': for (let i = 0; i < 4; i++) { pb.cyl(0.1, 0.1, 0.5, plain(c, 0.4, 0.3), -0.33 + i * 0.22, 0, 0, 14); pb.cyl(0.1, 0.1, 0.12, plain(c2, 0.3, 0.6), -0.33 + i * 0.22, 0.38, 0, 14); } break;
      case 'roll': { const g = new THREE.TorusGeometry(0.32, 0.14, 12, 28); pb.geo(g, plain(c, 0.6, 0.2), 0, 0.46, 0); break; }
      case 'lighter': pb.box(0.3, 0.7, 0.16, plain(c, 0.3), 0, 0, 0, 0.05); pb.box(0.28, 0.15, 0.17, plain(c2, 0.3, 0.8), 0, 0.7, 0, 0.02); break;
      case 'opener': pb.box(0.12, 0.8, 0.06, plain(c, 0.3, 0.9), 0, 0, 0, 0.02); pb.box(0.35, 0.25, 0.08, plain(c2, 0.5), 0, 0.75, 0, 0.04); break;
      case 'plank': pb.box(0.3, 3.4, 0.18, Mat.tex('wood_floor', c, 0.8), 0, 0, 0); break;
      case 'board': pb.box(3.2, 0.1, 3.2, Mat.tex('wood_floor', c, 0.8), 0, 0, 0); break;
      case 'knife': pb.box(0.14, 0.6, 0.04, plain(c, 0.2, 0.95), 0, 0.6, 0, 0.02); pb.box(0.12, 0.6, 0.08, plain(c2, 0.5), 0, 0, 0, 0.03); break;
      case 'bat': pb.cyl(0.13, 0.05, 2.8, plain(c, 0.55), 0, 0, 0, 14); pb.cyl(0.08, 0.08, 0.15, plain(c2, 0.6), 0, 0.05, 0, 10); break;
      case 'pan': pb.cyl(0.6, 0.5, 0.2, plain(c, 0.4, 0.6), 0, 0, 0, 24); pb.box(0.15, 0.08, 0.9, plain(c2, 0.6), 0, 0.12, 0.95, 0.03); break;
      case 'shopbag': pb.box(0.9, 0.95, 0.45, Mat.tex('fabric', c, 0.9), 0, 0, 0, 0.08); for (const x of [-0.25, 0.25]) pb.geo(new THREE.TorusGeometry(0.15, 0.03, 6, 12, Math.PI), plain(c2, 0.7), x, 0.95, 0); break;
      case 'backpack': pb.box(0.9, 1.1, 0.5, Mat.tex('fabric', c, 0.9), 0, 0, 0, 0.18); pb.box(0.7, 0.45, 0.2, Mat.tex('fabric', c2, 0.9), 0, 0.15, 0.32, 0.08); pb.box(0.12, 0.6, 0.06, plain('#222', 0.7), -0.25, 0.4, -0.3); pb.box(0.12, 0.6, 0.06, plain('#222', 0.7), 0.25, 0.4, -0.3); pb.geo(new THREE.TorusGeometry(0.12, 0.03, 6, 12, Math.PI), plain('#222', 0.7), 0, 1.1, 0); break;
      case 'pouch': pb.box(0.9, 0.6, 0.35, Mat.tex('fabric', c, 0.9), 0, 0, 0, 0.12); pb.box(0.9, 0.08, 0.36, plain(c2, 0.6), 0, 0.45, 0); break;
      case 'crate': pb.box(0.95, 0.65, 0.65, plain(c, 0.35), 0, 0, 0, 0.05); pb.box(0.98, 0.08, 0.68, plain(c2, 0.35), 0, 0.65, 0, 0.03); break;
      case 'plate': pb.cyl(0.62, 0.5, 0.08, plain('#f2f1ec', 0.25), 0, 0, 0, 28); pb.sphere(0.42, plain(c, 0.6), 0, 0.08, 0, 1, 0.42, 1, 18); pb.sphere(0.2, plain(c2, 0.6), 0.18, 0.2, 0.08, 1, 0.5, 1, 12); break;
      case 'candle': pb.cyl(0.15, 0.15, 0.7, plain(c, 0.6), 0, 0, 0, 14); pb.sphere(0.06, Mat.emissive(c2, 1.5), 0, 0.82, 0, 0.8, 1.6, 0.8, 8); break;
      default: pb.box(0.7, 0.6, 0.5, plain(c, 0.5), 0, 0, 0, 0.04);
    }
    const g = pb.build({ cast: false, receive: false, uvTile: 0 });
    return g;
  },
};
