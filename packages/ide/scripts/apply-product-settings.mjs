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

// Patch VSCodium state database to pin the Agent View container in the Auxiliary Bar
import Database from 'better-sqlite3';
const dbPath = path.join(PROFILE, 'User', 'globalStorage', 'state.vscdb');
if (fs.existsSync(dbPath)) {
  try {
    const db = new Database(dbPath);
    
    // 1. Remove Agent view container from the primary activitybar
    const rowViewlets = db.prepare("SELECT value FROM ItemTable WHERE key = 'workbench.activity.pinnedViewlets2'").get();
    if (rowViewlets) {
      let viewlets = JSON.parse(rowViewlets.value);
      viewlets = viewlets.filter(x => x.id !== 'workbench.view.extension.evocode-agent-ActivityBar');
      db.prepare("UPDATE ItemTable SET value = ? WHERE key = 'workbench.activity.pinnedViewlets2'").run(JSON.stringify(viewlets));
    }
    
    // 2. Add Agent view container to the auxiliarybar
    const rowAux = db.prepare("SELECT value FROM ItemTable WHERE key = 'workbench.auxiliarybar.pinnedPanels'").get();
    let auxPanels = [];
    if (rowAux) {
      auxPanels = JSON.parse(rowAux.value);
    }
    if (!auxPanels.some(x => x.id === 'workbench.view.extension.evocode-agent-ActivityBar')) {
      auxPanels.push({
        id: 'workbench.view.extension.evocode-agent-ActivityBar',
        pinned: true,
        visible: true,
        order: 0
      });
      if (rowAux) {
        db.prepare("UPDATE ItemTable SET value = ? WHERE key = 'workbench.auxiliarybar.pinnedPanels'").run(JSON.stringify(auxPanels));
      } else {
        db.prepare("INSERT INTO ItemTable (key, value) VALUES ('workbench.auxiliarybar.pinnedPanels', ?)").run(JSON.stringify(auxPanels));
      }
    }

    // 3. Ensure Auxiliary Bar is visible and not marked empty
    db.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.auxiliaryBar.empty', 'false')").run();

    db.close();
    console.log('VSCodium state.vscdb layout patched: evocode-agent moved to left auxiliary bar.');
  } catch (e) {
    console.error('Error patching VSCodium layout state:', e);
  }
}

console.log('product settings →', settingsPath);
