// Build: concatenates src/*.js (sorted) + embedded Three.js vendor bundle into one HTML file.
// Usage: node tools/build.mjs   →  hoard-and-hold.html
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorPath = join(root, 'tools', 'vendor.three.js');
if (!existsSync(vendorPath)) {
  execSync('npx esbuild tools/vendor-entry.js --bundle --minify --format=iife --global-name=THREE --legal-comments=inline --outfile=tools/vendor.three.js', { cwd: root, stdio: 'inherit' });
}
const files = readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort();
const game = files.map((f) => `/* ===== ${f} ===== */\n` + readFileSync(join(root, 'src', f), 'utf8')).join('\n');
// Syntax check of the concatenated game code (strict mode, like in the page).
writeFileSync(join(root, 'tools', '.check.js'), "'use strict';\n" + game);
execSync('node --check tools/.check.js', { cwd: root, stdio: 'inherit' });
const vendor = readFileSync(vendorPath, 'utf8').replace(/<\/script/gi, '<\\/script');
const tpl = readFileSync(join(root, 'src', 'template.html'), 'utf8');
const html = tpl.replace('/*VENDOR*/', () => vendor).replace('/*GAME*/', () => game.replace(/<\/script/gi, '<\\/script'));
const out = join(root, 'hoard-and-hold.html');
writeFileSync(out, html);
console.log(`built ${out} — ${(html.length / 1024).toFixed(0)} KB, ${files.length} modules`);
