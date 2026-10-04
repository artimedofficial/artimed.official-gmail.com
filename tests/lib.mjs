// Shared Playwright harness helpers: launch, error gate, screenshots.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
export const FILE = 'file://' + resolve('hoard-and-hold.html');
export async function launch({ w = 1440, h = 900 } = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);   // software rendering: a screenshot can take ~30 s
  const errs = [];
  page.on('pageerror', (e) => errs.push('ERR ' + e.message + ' | ' + (e.stack || '').split('\n').slice(0, 3).join(' / ')));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_TUNNEL|ERR_INTERNET|fonts\.g|net::ERR|Failed to load resource/.test(t)) errs.push('CON ' + t);
  });
  return { browser, page, errs };
}
export async function boot(page, { clear = true } = {}) {
  await page.goto(FILE);
  if (clear) { await page.evaluate(() => localStorage.clear()); await page.goto(FILE); }
  await page.waitForFunction(() => window.HH && HH.Game.mode === 'menu', null, { timeout: 120000 });
}
export async function newLife(page, bg = 'warehouse') {
  await page.evaluate((bg) => HH.Game.newRun({ bg, difficulty: 'standard', name: 'ทดสอบ' }), bg);
  await page.waitForFunction(() => HH.Game.mode === 'play');
}
export function report(errs) {
  console.log('errors:', errs.length);
  errs.slice(0, 10).forEach((e) => console.log('  ', e));
}
