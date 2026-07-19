#!/usr/bin/env node
/** Fast install of packages/ide/shell/extension → ~/.evocode-ide/extensions */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'packages/ide/shell/extension');
const PROFILE = process.env.EVOCODE_USER_DATA_DIR || path.join(os.homedir(), '.evocode-ide');
const EXT_DIR = process.env.EVOCODE_EXTENSIONS_DIR || path.join(PROFILE, 'extensions');

const pkg = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8'));
const folder = `${pkg.publisher}.${pkg.name}-${pkg.version}`;
fs.mkdirSync(EXT_DIR, { recursive: true });

// remove old shell versions
for (const ent of fs.readdirSync(EXT_DIR)) {
  if (ent.startsWith(`${pkg.publisher}.${pkg.name}-`)) {
    fs.rmSync(path.join(EXT_DIR, ent), { recursive: true, force: true });
  }
}

const dest = path.join(EXT_DIR, folder);
fs.cpSync(SRC, dest, { recursive: true });

// ensure icon
const brandIcon = path.join(
  ROOT,
  'packages/agent-extension/brand/icons/evocode-icon-256.png',
);
if (fs.existsSync(brandIcon)) {
  fs.copyFileSync(brandIcon, path.join(dest, 'icon.png'));
}

// refresh extensions.json entries for shell + keep others
const entries = [];
for (const ent of fs.readdirSync(EXT_DIR)) {
  const pkgPath = path.join(EXT_DIR, ent, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const meta = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  entries.push({
    identifier: { id: `${meta.publisher}.${meta.name}` },
    version: meta.version,
    location: { $mid: 1, path: path.join(EXT_DIR, ent), scheme: 'file' },
    relativeLocation: ent,
  });
}
fs.writeFileSync(path.join(EXT_DIR, 'extensions.json'), JSON.stringify(entries) + '\n');
console.log('shell installed:', dest);
