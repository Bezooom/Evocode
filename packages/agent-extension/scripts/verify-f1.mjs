#!/usr/bin/env node
/** Smoke checks for F1 rebrand + provider wiring */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');
const EXT = path.join(PKG, 'extension');
let failed = 0;

function ok(msg) {
  console.log('  ✓', msg);
}
function fail(msg) {
  console.error('  ✗', msg);
  failed++;
}

console.log('=== F1 verify ===');

const pkgPath = path.join(EXT, 'package.json');
if (!fs.existsSync(pkgPath)) {
  fail('extension/package.json missing — run apply-rebrand');
} else {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name === 'evocode-agent' ? ok('name=evocode-agent') : fail(`name=${pkg.name}`);
  pkg.publisher === 'evocode' ? ok('publisher=evocode') : fail(`publisher=${pkg.publisher}`);
  pkg.displayName?.includes('Эвокод')
    ? ok('displayName contains Эвокод')
    : fail(`displayName=${pkg.displayName}`);

  const props = [];
  const conf = pkg.contributes?.configuration;
  for (const c of Array.isArray(conf) ? conf : conf ? [conf] : []) {
    if (c.properties) props.push(c.properties);
  }
  const all = Object.assign({}, ...props);
  const pDef = all['kilo-code.new.model.providerID']?.default;
  const mDef = all['kilo-code.new.model.modelID']?.default;
  pDef === 'evocode' ? ok('default providerID=evocode') : fail(`providerID default=${pDef}`);
  mDef === 'evocode-auto' ? ok('default modelID=evocode-auto') : fail(`modelID default=${mDef}`);

  fs.existsSync(path.join(EXT, 'dist/extension.js')) ||
  fs.existsSync(path.join(EXT, 'dist'))
    ? ok('dist linked')
    : fail('dist missing — build kilo-vscode');
}

const template = JSON.parse(
  fs.readFileSync(path.join(PKG, 'config/kilo.evocode.json'), 'utf-8')
);
template.provider?.evocode?.options?.baseURL?.includes('8083')
  ? ok('template Core baseURL :8083')
  : fail('template baseURL wrong');
template.model === 'evocode/evocode-auto'
  ? ok('template model=evocode/evocode-auto')
  : fail(`template model=${template.model}`);

console.log(failed ? `\nFAILED: ${failed}` : '\n✅ F1 verify passed');
process.exit(failed ? 1 : 0);
