#!/usr/bin/env node
/**
 * Rebrand extracted VSCodium portable tree → Эвокод (no full compile).
 * Supports Linux, Windows, and macOS folder structures.
 * Usage: node packages/ide/scripts/rebrand-portable-codium.mjs [path-to-evocode-ide]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// 1. Detect platform structure and resolve appDir
let appDir = null;
let plistPath = null;
let macMacOSDir = null;
let isMac = false;
let isWin = false;

// Check if macOS bundle exists inside the folder or is the folder itself
if (fs.existsSync(path.join(DEST, 'resources/app/product.json'))) {
  appDir = path.join(DEST, 'resources/app');
} else if (fs.existsSync(path.join(DEST, 'VSCodium.app/Contents/Resources/app/product.json'))) {
  appDir = path.join(DEST, 'VSCodium.app/Contents/Resources/app');
  plistPath = path.join(DEST, 'VSCodium.app/Contents/Info.plist');
  macMacOSDir = path.join(DEST, 'VSCodium.app/Contents/MacOS');
  isMac = true;
} else if (fs.existsSync(path.join(DEST, 'Contents/Resources/app/product.json'))) {
  appDir = path.join(DEST, 'Contents/Resources/app');
  plistPath = path.join(DEST, 'Contents/Info.plist');
  macMacOSDir = path.join(DEST, 'Contents/MacOS');
  isMac = true;
}

// Rename VSCodium.app to Evocode.app on macOS
if (isMac) {
  const oldAppPath = path.join(DEST, 'VSCodium.app');
  const newAppPath = path.join(DEST, 'Evocode.app');
  if (fs.existsSync(oldAppPath)) {
    fs.renameSync(oldAppPath, newAppPath);
    appDir = path.join(newAppPath, 'Contents/Resources/app');
    plistPath = path.join(newAppPath, 'Contents/Info.plist');
    macMacOSDir = path.join(newAppPath, 'Contents/MacOS');
    console.log('Renamed VSCodium.app to Evocode.app');
  }
}

// Rename VSCodium.exe to Evocode.exe on Windows
for (const exeName of ['VSCodium.exe', 'codium.exe']) {
  const p = path.join(DEST, exeName);
  if (fs.existsSync(p)) {
    const newP = path.join(DEST, 'Evocode.exe');
    fs.renameSync(p, newP);
    isWin = true;
    console.log(`Renamed Windows binary ${exeName} to Evocode.exe`);
    break;
  }
}

// Rename Windows bin/codium.cmd to bin/evocode.cmd
const binDir = path.join(DEST, 'bin');
if (fs.existsSync(binDir)) {
  for (const cmdName of ['codium.cmd', 'codium.bat']) {
    const p = path.join(binDir, cmdName);
    if (fs.existsSync(p)) {
      const newP = path.join(binDir, 'evocode.cmd');
      fs.renameSync(p, newP);
      console.log(`Renamed bin/${cmdName} to bin/evocode.cmd`);
      let content = fs.readFileSync(newP, 'utf8');
      content = content.replace(/VSCodium\.exe/g, 'Evocode.exe').replace(/codium\.exe/g, 'Evocode.exe');
      fs.writeFileSync(newP, content);
    }
  }
}

// Rename macOS binary VSCodium to Evocode
if (isMac && macMacOSDir && fs.existsSync(macMacOSDir)) {
  for (const binaryName of ['VSCodium', 'codium', 'Electron']) {
    const p = path.join(macMacOSDir, binaryName);
    if (fs.existsSync(p)) {
      fs.renameSync(p, path.join(macMacOSDir, 'Evocode'));
      console.log(`Renamed macOS binary ${binaryName} to Evocode`);
      break;
    }
  }
  
  if (plistPath && fs.existsSync(plistPath)) {
    let plist = fs.readFileSync(plistPath, 'utf8');
    plist = plist
      .replace(/<key>CFBundleExecutable<\/key>\s*<string>[^<]+<\/string>/, '<key>CFBundleExecutable</key>\n\t<string>Evocode</string>')
      .replace(/<key>CFBundleName<\/key>\s*<string>[^<]+<\/string>/, '<key>CFBundleName</key>\n\t<string>Evocode</string>')
      .replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]+<\/string>/, '<key>CFBundleDisplayName</key>\n\t<string>Evocode</string>')
      .replace(/<key>CFBundleIdentifier<\/key>\s*<string>[^<]+<\/string>/, '<key>CFBundleIdentifier</key>\n\t<string>ru.evocode.app</string>');
    fs.writeFileSync(plistPath, plist);
    console.log('Updated macOS Info.plist metadata');
  }
}

if (!appDir || !fs.existsSync(appDir)) {
  console.error('Could not locate resources/app directory inside target:', DEST);
  process.exit(1);
}

// 2. Rebrand product.json
const productPath = path.join(appDir, 'product.json');
const product = JSON.parse(fs.readFileSync(productPath, 'utf8'));
const merged = deepMerge(product, BRAND);
// Force identity overrides
merged.nameShort = 'Эвокод';
merged.nameLong = 'Эвокод — AI IDE';
merged.applicationName = 'evocode';
merged.dataFolderName = '.evocode-ide';
merged.urlProtocol = 'evocode';
merged.linuxIconName = 'evocode';
merged.win32MutexName = 'evocode';
merged.darwinBundleIdentifier = 'ru.evocode.app';
merged.reportIssueUrl = BRAND.reportIssueUrl || merged.reportIssueUrl;

if (!merged.extensionsGallery) {
  merged.extensionsGallery = BRAND.extensionsGallery;
}
fs.writeFileSync(productPath, JSON.stringify(merged, null, 2) + '\n');
console.log('product.json branded:', merged.nameShort, merged.applicationName);

// 3. Rebrand resources/app/package.json
const appPkgPath = path.join(appDir, 'package.json');
if (fs.existsSync(appPkgPath)) {
  const appPkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf8'));
  appPkg.name = 'evocode';
  appPkg.author = { name: 'Эвокод' };
  appPkg.desktopName = 'evocode.desktop';
  fs.writeFileSync(appPkgPath, JSON.stringify(appPkg, null, 2) + '\n');
  console.log('app package.json branded: name=evocode');
}

// 4. Replace common icon locations
const iconTargets = [
  'resources/app/resources/linux/code.png',
  'resources/app/resources/linux/codium.png',
  'resources/linux/code.png',
];
const srcIcon = fs.existsSync(ICON_PNG) ? ICON_PNG : ICON_256;
if (fs.existsSync(srcIcon)) {
  for (const rel of iconTargets) {
    const t = path.join(DEST, rel);
    try {
      fs.mkdirSync(path.dirname(t), { recursive: true });
      fs.copyFileSync(srcIcon, t);
      console.log('icon →', rel);
    } catch (e) {
      console.warn('icon skip', rel, e.message);
    }
  }
  for (const name of ['code.png', 'codium.png', 'evocode.png']) {
    try {
      fs.copyFileSync(srcIcon, path.join(DEST, name));
    } catch {
      /* */
    }
  }
}

// 5. Setup Linux wrapper/launcher if we are on Linux build
const codiumSh = path.join(DEST, 'bin/codium');
const evocodeSh = path.join(DEST, 'bin/evocode');
if (fs.existsSync(codiumSh)) {
  const wrapper = `#!/usr/bin/env bash
# Эвокод — branded VSCodium portable
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export VSCODE_DEV=
export ELECTRON_RUN_AS_NODE=
exec "\${ROOT}/bin/codium" "\$@"
`;
  fs.writeFileSync(evocodeSh, wrapper);
  fs.chmodSync(evocodeSh, 0o755);
  console.log('wrote bin/evocode wrapper');

  const top = path.join(DEST, 'evocode');
  const topWrap = `#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "\${ROOT}/bin/evocode" "\$@"
`;
  fs.writeFileSync(top, topWrap);
  fs.chmodSync(top, 0o755);
}

// 6. Version stamp
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
