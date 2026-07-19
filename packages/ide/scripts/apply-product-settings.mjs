#!/usr/bin/env node
/** Apply product-level settings (anti VS Code chrome + Эвокод defaults) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const PROFILE = process.env.EVOCODE_USER_DATA_DIR || path.join(os.homedir(), '.evocode-ide');
const USER = path.join(PROFILE, 'User');
const defaultsPath = path.join(ROOT, 'packages/ide/shell/settings.json');
const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));

fs.mkdirSync(USER, { recursive: true });
const settingsPath = path.join(USER, 'settings.json');
let existing = {};
if (fs.existsSync(settingsPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    existing = {};
  }
}
// product defaults win
const merged = { ...existing, ...defaults };
fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2) + '\n');

// locale
fs.writeFileSync(path.join(USER, 'locale.json'), JSON.stringify({ locale: 'ru' }, null, 2) + '\n');
fs.writeFileSync(
  path.join(PROFILE, 'argv.json'),
  JSON.stringify({ locale: 'ru' }, null, 2) + '\n',
);

// keybindings
const kb = path.join(ROOT, 'packages/ide/shell/keybindings.json');
if (fs.existsSync(kb)) {
  fs.copyFileSync(kb, path.join(USER, 'keybindings.json'));
}

console.log('product settings →', settingsPath);
