#!/usr/bin/env node
/** Smoke checks for F1 rebrand + provider wiring */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { canonicalAgentConfigPath, agentConfigDir } = require('../lib/agent-config-paths.cjs');

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
  const pDef =
    all['evocode-agent.new.model.providerID']?.default ??
    all['kilo-code.new.model.providerID']?.default;
  const mDef =
    all['evocode-agent.new.model.modelID']?.default ??
    all['kilo-code.new.model.modelID']?.default;
  pDef === 'evocode' ? ok('default providerID=evocode') : fail(`providerID default=${pDef}`);
  mDef === 'evocode-auto' ? ok('default modelID=evocode-auto') : fail(`modelID default=${mDef}`);

  fs.existsSync(path.join(EXT, 'dist/extension.js')) || fs.existsSync(path.join(EXT, 'dist'))
    ? ok('dist linked')
    : fail('dist missing — build kilo-vscode');

  // Config path rebrand in extension host
  const extJs = fs.readFileSync(path.join(EXT, 'dist/extension.js'), 'utf-8');
  extJs.includes('evocode.json')
    ? ok('extension.js prefers evocode.json')
    : fail('extension.js missing evocode.json in config list (re-run agent:rebrand)');
  extJs.includes('EVOCODE_CONFIG_DIR')
    ? ok('extension.js reads EVOCODE_CONFIG_DIR')
    : fail('extension.js missing EVOCODE_CONFIG_DIR');
}

const templatePath = fs.existsSync(path.join(PKG, 'config/evocode.agent.json'))
  ? path.join(PKG, 'config/evocode.agent.json')
  : path.join(PKG, 'config/kilo.evocode.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
template.provider?.evocode?.options?.baseURL?.includes('8083')
  ? ok('template Core baseURL :8083')
  : fail('template baseURL wrong');
template.model === 'evocode/evocode-auto'
  ? ok('template model=evocode/evocode-auto')
  : fail(`template model=${template.model}`);

ok(`canonical config path: ${canonicalAgentConfigPath()}`);
ok(`config dir: ${agentConfigDir()}`);

console.log(failed ? `\nFAILED: ${failed}` : '\n✅ F1 verify passed');
process.exit(failed ? 1 : 0);
