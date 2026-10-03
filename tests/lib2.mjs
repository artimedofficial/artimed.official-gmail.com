// Boot with a preset profile (skips the 40-frame benchmark in headless runs).
import { FILE } from './lib.mjs';
export async function bootPreset(page, quality = 'medium') {
  await page.goto(FILE);
  await page.evaluate((q) => {
    localStorage.clear();
    localStorage.setItem('hoardhold.profile.v1', JSON.stringify({ schema: 1, worldSeed: 12345, skills: {}, lives: [], stats: {}, settings: { quality: q } }));
  }, quality);
  await page.goto(FILE);
  await page.waitForFunction(() => window.HH && HH.Game.mode === 'menu', null, { timeout: 120000 });
}
