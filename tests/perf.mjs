// Frame time / draw calls / triangles per quality preset, home and supermarket (SwiftShader = CPU rendering).
import { launch, report } from './lib.mjs';
import { bootPreset } from './lib2.mjs';
const rows = [];
let allErrs = [];
for (const q of ['low', 'medium', 'high']) {
  const { browser, page, errs } = await launch({ w: 1366, h: 768 });
  await bootPreset(page, q);
  await page.evaluate(() => HH.Game.newRun({ bg: 'warehouse', difficulty: 'standard', name: 'perf' }));
  await page.waitForFunction(() => HH.Game.mode === 'play');
  for (const scene of ['home', 'supermarket']) {
    if (scene !== 'home') await page.evaluate((s) => HH.HomeScene.enter(s), scene);
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const step = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(step); else res({ fps: n / ((performance.now() - t0) / 1000), calls: HH.Render.renderer.info.render.calls, tris: HH.Render.renderer.info.render.triangles }); };
      requestAnimationFrame(step);
    }));
    rows.push({ quality: q, scene, fps: m.fps.toFixed(1), ms: (1000 / m.fps).toFixed(1), calls: m.calls, tris: Math.round(m.tris / 1000) + 'k' });
  }
  allErrs = allErrs.concat(errs);
  await browser.close();
}
console.table(rows);
report(allErrs);
