#!/usr/bin/env node
/**
 * Rebrand extracted VSCodium portable tree → Эвокод (no full compile).
 * Usage: node packages/ide/scripts/rebrand-portable-codium.mjs [path-to-evocode-ide]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const DEST = path.resolve(
  process.argv[2] || path.join(ROOT, 'packages/ide/dist/evocode-ide'),
);
const BRAND = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'packages/ide/product.evocode.json'), 'utf8'),
);
const ICON_PNG = path.join(
  ROOT,
  'packages/agent-extension/brand/icons/evocode-icon-512.png',
);
const ICON_256 = path.join(
  ROOT,
  'packages/agent-extension/brand/icons/evocode-icon-256.png',
);

function deepMerge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      base[k] &&
      typeof base[k] === 'object' &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k], v);
    } else if (Array.isArray(v) && v.length === 0 && Array.isArray(base[k]) && base[k].length) {
      // keep non-empty base collections when brand sends empty
      out[k] = base[k];
    } else if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.keys(v).length === 0 &&
      base[k] &&
      typeof base[k] === 'object'
    ) {
      out[k] = base[k];
    } else {
      out[k] = v;
    }
  }
  return out;
}

if (!fs.existsSync(DEST)) {
  console.error('Missing portable tree:', DEST);
  process.exit(1);
}

const productPath = path.join(DEST, 'resources/app/product.json');
const product = JSON.parse(fs.readFileSync(productPath, 'utf8'));
const merged = deepMerge(product, BRAND);
// force identity
merged.nameShort = 'Эвокод';
merged.nameLong = 'Эвокод — AI IDE';
merged.applicationName = 'evocode';
merged.dataFolderName = '.evocode-ide';
merged.urlProtocol = 'evocode';
merged.linuxIconName = 'evocode';
merged.win32MutexName = 'evocode';
merged.darwinBundleIdentifier = 'ru.evocode.app';
merged.reportIssueUrl = BRAND.reportIssueUrl || merged.reportIssueUrl;
// Open VSX already typically present
if (!merged.extensionsGallery) {
  merged.extensionsGallery = BRAND.extensionsGallery;
}
fs.writeFileSync(productPath, JSON.stringify(merged, null, 2) + '\n');
console.log('product.json branded:', merged.nameShort, merged.applicationName);

// Replace common icon locations
const iconTargets = [
  'resources/app/resources/linux/code.png',
  'resources/app/resources/linux/codium.png',
  'resources/linux/code.png',
];
const srcIcon = fs.existsSync(ICON_PNG) ? ICON_PNG : ICON_256;
if (fs.existsSync(srcIcon)) {
  for (const rel of iconTargets) {
    const t = path.join(DEST, rel);
    fs.mkdirSync(path.dirname(t), { recursive: true });
    try {
      fs.copyFileSync(srcIcon, t);
      console.log('icon →', rel);
    } catch (e) {
      console.warn('icon skip', rel, e.message);
    }
  }
  // also code.png next to binary sometimes
  for (const name of ['code.png', 'codium.png', 'evocode.png']) {
    try {
      fs.copyFileSync(srcIcon, path.join(DEST, name));
    } catch {
      /* */
    }
  }
}

// Wrapper bin/evocode
const binDir = path.join(DEST, 'bin');
const codiumSh = path.join(binDir, 'codium');
const evocodeSh = path.join(binDir, 'evocode');
if (fs.existsSync(codiumSh)) {
  let script = fs.readFileSync(codiumSh, 'utf8');
  // VSCodium script references itself; keep name but add sibling wrapper
  const wrapper = `#!/usr/bin/env bash
# Эвокод — branded VSCodium portable
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export VSCODE_DEV=
export ELECTRON_RUN_AS_NODE=
# Prefer our product identity for WM
exec "\${ROOT}/bin/codium" --class Evocode --name Evocode "\$@"
`;
  fs.writeFileSync(evocodeSh, wrapper);
  fs.chmodSync(evocodeSh, 0o755);
  console.log('wrote bin/evocode wrapper');
}

// Top-level symlink-like launcher
const top = path.join(DEST, 'evocode');
const topWrap = `#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "\${ROOT}/bin/evocode" "\$@"
`;
fs.writeFileSync(top, topWrap);
fs.chmodSync(top, 0o755);

// Version stamp
fs.writeFileSync(
  path.join(DEST, 'EVOCODE-BRAND.txt'),
  [
    'Evocode portable brand over VSCodium',
    `brandedAt=${new Date().toISOString()}`,
    `nameShort=${merged.nameShort}`,
    `applicationName=${merged.applicationName}`,
    `dataFolderName=${merged.dataFolderName}`,
    '',
  ].join('\n'),
);

console.log('OK:', DEST);
console.log('Run:', path.join(DEST, 'bin/evocode'));
