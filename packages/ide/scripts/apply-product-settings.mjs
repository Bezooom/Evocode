#!/usr/bin/env node
/** Apply product-level settings (anti VS Code chrome + Эвокод defaults) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

// Check if editor is currently running (to warn about SQLite overrides)
try {
  const psOutput = execSync('ps aux', { encoding: 'utf8' });
  const isRunning = psOutput.split('\n').some(line => {
    const l = line.toLowerCase();
    return (l.includes('codium') || l.includes('evocode') || l.includes('vscode')) && 
           !l.includes('apply-product-settings') && 
           !l.includes('npm') &&
           !l.includes('node') &&
           !l.includes('git') &&
           !l.includes('grep');
  });
  if (isRunning) {
    console.warn('\n\x1b[33m%s\x1b[0m', '⚠️  ВНИМАНИЕ: Среда «Эвокод» / VSCodium сейчас запущена!');
    console.warn('\x1b[33m%s\x1b[0m\n', '   Закройте все окна редактора полностью, чтобы применить Cursor Layout. Иначе запущенный редактор перезапишет базу данных настроек при выходе.');
  }
} catch (e) {
  // ignore
}

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

    // 4. Set default sizes for Sidebar (260px) and Auxiliary Bar (500px)
    db.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.sideBar.size', '260')").run();
    db.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.auxiliaryBar.size', '500')").run();
    db.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.auxiliaryBar.lastNonMaximizedSize', '500')").run();

    db.close();
    console.log('VSCodium state.vscdb layout patched: evocode-agent moved to left auxiliary bar.');
  } catch (e) {
    console.error('Error patching VSCodium layout state:', e);
  }
}

// Also patch all workspace-specific state databases
const workspaceStorage = path.join(PROFILE, 'User', 'workspaceStorage');
if (fs.existsSync(workspaceStorage)) {
  const folders = fs.readdirSync(workspaceStorage);
  for (const folder of folders) {
    const wsDbPath = path.join(workspaceStorage, folder, 'state.vscdb');
    if (fs.existsSync(wsDbPath)) {
      try {
        const wsDb = new Database(wsDbPath);
        
        // A. Remove Agent view from activity bar workspace state
        const rowWsViewlets = wsDb.prepare("SELECT value FROM ItemTable WHERE key = 'workbench.activity.viewletsWorkspaceState'").get();
        if (rowWsViewlets) {
          let viewlets = JSON.parse(rowWsViewlets.value);
          viewlets = viewlets.filter(x => x.id !== 'workbench.view.extension.evocode-agent-ActivityBar');
          wsDb.prepare("UPDATE ItemTable SET value = ? WHERE key = 'workbench.activity.viewletsWorkspaceState'").run(JSON.stringify(viewlets));
        }
        
        // B. Add Agent view to auxiliary bar workspace state and make it visible
        const rowWsAux = wsDb.prepare("SELECT value FROM ItemTable WHERE key = 'workbench.auxiliarybar.viewContainersWorkspaceState'").get();
        let auxPanels = [];
        if (rowWsAux) {
          auxPanels = JSON.parse(rowWsAux.value);
        }
        auxPanels = auxPanels.filter(x => x.id !== 'workbench.view.extension.evocode-agent-ActivityBar');
        auxPanels.push({
          id: 'workbench.view.extension.evocode-agent-ActivityBar',
          visible: true
        });
        if (rowWsAux) {
          wsDb.prepare("UPDATE ItemTable SET value = ? WHERE key = 'workbench.auxiliarybar.viewContainersWorkspaceState'").run(JSON.stringify(auxPanels));
        } else {
          wsDb.prepare("INSERT INTO ItemTable (key, value) VALUES ('workbench.auxiliarybar.viewContainersWorkspaceState', ?)").run(JSON.stringify(auxPanels));
        }

        // C. Force auxiliaryBar.hidden to false, and sideBar.hidden to false
        wsDb.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.auxiliaryBar.hidden', 'false')").run();
        wsDb.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.sideBar.hidden', 'false')").run();

        // D. Set active viewlet to Explorer (so main sidebar on the right shows files!)
        wsDb.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.sidebar.activeviewletid', 'workbench.view.explorer')").run();

        // E. Set sizes for Sidebar (260px) and Auxiliary Bar (500px)
        wsDb.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.sideBar.size', '260')").run();
        wsDb.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.auxiliaryBar.size', '500')").run();
        wsDb.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('workbench.auxiliaryBar.lastNonMaximizedSize', '500')").run();

        wsDb.close();
        console.log(`Patched workspace database: ${wsDbPath}`);
      } catch (wsErr) {
        console.error(`Error patching workspace database ${wsDbPath}:`, wsErr);
      }
    }
  }
}

console.log('product settings →', settingsPath);
