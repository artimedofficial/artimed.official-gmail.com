import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const { browser, page, errs } = await launch({ w: 800, h: 600 });
page.on('console', (m) => { if (/Assets/.test(m.text())) console.log('console:', m.text()); });
await bootPreset(page, 'low');
console.log(await page.evaluate(async () => {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pos.buffer)));
  const doc = { asset: { version: '2.0' }, scenes: [{ nodes: [0] }], scene: 0, nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36, uri: 'data:application/octet-stream;base64,' + b64 }], bufferViews: [{ buffer: 0, byteLength: 36 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }] };
  ASSET_OVERRIDES['prop.crate'] = 'data:model/gltf+json;base64,' + btoa(JSON.stringify(doc));
  const holder = HH.AssetRegistry.create('prop.crate', {});
  for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 250)); let t = 0; holder.traverse((o) => { if (o.isMesh) t += o.geometry.attributes.position.count / 3; }); if (t === 1) return 'loaded after ' + (i + 1) * 250 + 'ms'; }
  return 'not loaded';
}));
report(errs);
await browser.close();
