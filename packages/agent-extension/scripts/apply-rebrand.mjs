#!/usr/bin/env node
/**
 * F1 brand: Эвокод face
 * - package.json rebrand + Core defaults
 * - own icons (not Kilo)
 * - patch dist JS welcome strings (copy, never mutate upstream)
 * - workspace settings: no VS Code welcome, hide secondary chat chrome
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const EVOCODE_ROOT = path.resolve(PKG_ROOT, '../..');
const OUT = path.join(PKG_ROOT, 'extension');
const BRAND_ICONS = path.join(PKG_ROOT, 'brand/icons');
const UI_STRINGS = JSON.parse(
  fs.readFileSync(path.join(PKG_ROOT, 'brand/ui-strings.json'), 'utf-8')
);
const I18N_RU_PATH = path.join(PKG_ROOT, 'brand/webview-i18n-ru.json');
const I18N_RU = fs.existsSync(I18N_RU_PATH)
  ? JSON.parse(fs.readFileSync(I18N_RU_PATH, 'utf-8'))
  : { keyPatches: {}, phrases: [] };
const DEKILO_PATH = path.join(PKG_ROOT, 'brand/webview-dekilo.json');
const DEKILO = fs.existsSync(DEKILO_PATH)
  ? JSON.parse(fs.readFileSync(DEKILO_PATH, 'utf-8'))
  : { replacements: [] };
const OVERRIDES = JSON.parse(
  fs.readFileSync(path.join(PKG_ROOT, 'rebrand/overrides.json'), 'utf-8')
);

function resolveUpstream() {
  const candidates = [
    process.env.KILO_SRC,
    path.join(PKG_ROOT, 'upstream'),
    '/home/bezoom/kilocode/packages/kilo-vscode',
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json'))) return path.resolve(c);
  }
  throw new Error('kilo-vscode upstream not found. npm run bootstrap:agent');
}

function deepSetDefault(pkg, keyPath, value) {
  const props = pkg?.contributes?.configuration;
  if (!props) return false;
  const configs = Array.isArray(props) ? props : [props];
  let found = false;
  for (const cfg of configs) {
    if (cfg.properties?.[keyPath]) {
      cfg.properties[keyPath].default = value;
      found = true;
    }
  }
  return found;
}

function rebrandPackage(upstreamPkg) {
  const pkg = structuredClone(upstreamPkg);
  Object.assign(pkg, {
    name: OVERRIDES.name,
    displayName: OVERRIDES.displayName,
    description: OVERRIDES.description,
    version: OVERRIDES.version,
    publisher: OVERRIDES.publisher,
    author: OVERRIDES.author,
    repository: OVERRIDES.repository,
    homepage: OVERRIDES.homepage,
    bugs: OVERRIDES.bugs,
    keywords: OVERRIDES.keywords,
    galleryBanner: OVERRIDES.galleryBanner,
  });

  // Marketplace / extension list icon (color PNG ok)
  pkg.icon = 'assets/icons/evocode-icon-256.png';

  for (const [key, value] of Object.entries(OVERRIDES.defaults || {})) {
    if (!deepSetDefault(pkg, key, value)) {
      console.warn(`  warn: default not found: ${key}`);
    } else {
      console.log(`  default ${key} = ${value}`);
    }
  }

  deepSetDefault(pkg, 'kilo-code.new.language', 'Русский');

  if (pkg.contributes?.configuration?.properties) {
    pkg.contributes.configuration.properties['kilo-code.new.sandbox.enabled'] = {
      type: 'boolean',
      default: false,
      description: 'Запускать CLI-сервер агента в изолированной песочнице (bubblewrap / bwrap)'
    };
  }

  let raw = JSON.stringify(pkg, null, 2);
  for (const { from, to } of OVERRIDES.stringReplacements || []) {
    raw = raw.split(from).join(to);
  }
  // Broad package.json face (command IDs kilo-code.* stay — API compat)
  raw = raw
    .split('Kilo Code')
    .join('Эвокод')
    .split('Kilo Gateway')
    .join('Эвокод Core')
    .split('KiloClaw')
    .join('Эвокод Claw')
    .split('via Kilo')
    .join('via Эвокод')
    .split('Kilo ')
    .join('Эвокод ')
    .split(' Kilo')
    .join(' Эвокод');

  const out = JSON.parse(raw);

  // Secondary sidebar: monochrome SVG (PNG often invisible on top/side bar)
  try {
    const ab = out.contributes?.viewsContainers?.activitybar;
    if (Array.isArray(ab) && ab[0]) {
      ab[0].title = 'Эвокод';
      ab[0].icon = 'assets/icons/evocode-chat.svg';
      ab[0].darkIcon = 'assets/icons/evocode-chat.svg';
      out.contributes.viewsContainers.secondarySidebar = ab;
      delete out.contributes.viewsContainers.activitybar;
    }
    const views = out.contributes?.views?.['kilo-code-ActivityBar'];
    if (Array.isArray(views) && views[0]) {
      views[0].name = 'Эвокод';
    }
    // Drop Kilo logo font icon (broken without font / brand)
    if (out.contributes?.icons?.['kilo-logo']) {
      delete out.contributes.icons['kilo-logo'];
    }
    if (out.contributes?.icons && Object.keys(out.contributes.icons).length === 0) {
      delete out.contributes.icons;
    }
  } catch {
    /* ignore */
  }

  // Native app chrome: no marketplace, strip kilo toolbar clutter from agent view
  nativeChrome(out);

  out.evocode = {
    brand: 'Эвокод',
    coreBaseUrl: process.env.EVOCODE_CORE_URL || 'http://127.0.0.1:8083/v1',
    defaultProvider: 'evocode',
    defaultModel: 'evocode-auto',
    phase: 'native-app',
    noMarketplace: true,
    agentSidebarButtons: ['new-task', 'history'],
  };

  // F2.6: Rename command IDs & view container IDs kilo-code.* / kilo-code-* to evocode-agent.* / evocode-agent-*
  const renamed = JSON.stringify(out)
    .split('kilo-code.').join('evocode-agent.')
    .split('kilo-code-').join('evocode-agent-');
  return JSON.parse(renamed);
}

/**
 * Make agent feel native:
 * - sidebar title bar: ONLY New Task + History
 * - remove Marketplace everywhere
 * - strip settings/profile/agentManager/claw from agent chrome (moved to IDE toolbar via shell)
 * - kill kilo icon assets on openInTab / commit
 * - RU titles for remaining commands
 */
function nativeChrome(pkg) {
  const c = pkg.contributes;
  if (!c) return;

  const DROP_CMDS = new Set([
    'kilo-code.new.marketplaceButtonClicked',
    'kilo-code.new.sidebarTitle.marketplaceButtonClicked',
  ]);

  // Hide marketplace + hide from agent sidebar (will live on IDE toolbar via shell)
  const SIDEBAR_KEEP = new Set([
    'kilo-code.new.sidebarTitle.plusButtonClicked',
    'kilo-code.new.sidebarTitle.historyButtonClicked',
  ]);

  const TITLE_RU = {
    'kilo-code.new.plusButtonClicked': 'Новая задача',
    'kilo-code.new.sidebarTitle.plusButtonClicked': 'Новая задача',
    'kilo-code.new.historyButtonClicked': 'История',
    'kilo-code.new.sidebarTitle.historyButtonClicked': 'История',
    'kilo-code.new.agentManagerOpen': 'Менеджер агентов',
    'kilo-code.new.sidebarTitle.agentManagerOpen': 'Менеджер агентов',
    'kilo-code.new.profileButtonClicked': 'Профиль',
    'kilo-code.new.sidebarTitle.profileButtonClicked': 'Профиль',
    'kilo-code.new.settingsButtonClicked': 'Настройки агента',
    'kilo-code.new.sidebarTitle.settingsButtonClicked': 'Настройки агента',
    'kilo-code.new.kiloClawOpen': 'Ассистент',
    'kilo-code.new.sidebarTitle.kiloClawOpen': 'Ассистент',
    'kilo-code.new.openInTab': 'Открыть во вкладке',
    'kilo-code.new.generateCommitMessage': 'Сообщение коммита',
  };

  // Commands: retitle + hide marketplace from palette + replace kilo icons
  if (Array.isArray(c.commands)) {
    c.commands = c.commands
      .filter((cmd) => {
        const id = cmd.command || '';
        if (id.includes('marketplace') || id.includes('Marketplace')) return false;
        return true;
      })
      .map((cmd) => {
        const id = cmd.command || '';
        if (TITLE_RU[id]) cmd.title = TITLE_RU[id];
        // replace kilo brand icons
        if (cmd.icon && typeof cmd.icon === 'object') {
          if (JSON.stringify(cmd.icon).includes('kilo-')) {
            cmd.icon = '$(rocket)';
          }
        }
        if (typeof cmd.icon === 'string' && cmd.icon.includes('kilo')) {
          cmd.icon = '$(rocket)';
        }
        // marketplace leftovers
        if (DROP_CMDS.has(id) || /marketplace/i.test(cmd.title || '')) {
          return null;
        }
        return cmd;
      })
      .filter(Boolean);
  }

  // view/title — agent sidebar: only new task + history
  if (c.menus?.['view/title']) {
    c.menus['view/title'] = c.menus['view/title']
      .filter((item) => {
        const cmd = item.command || '';
        if (cmd.includes('marketplace')) return false;
        // only keep plus + history for agent sidebar
        if (item.when && item.when.includes('kilo-code.SidebarProvider')) {
          return SIDEBAR_KEEP.has(cmd);
        }
        return !cmd.includes('marketplace');
      })
      .map((item, i) => {
        // renumber navigation groups
        if (SIDEBAR_KEEP.has(item.command)) {
          item.group =
            item.command.includes('plus') ? 'navigation@0' : 'navigation@1';
        }
        return item;
      });
  }

  // editor/title — only new task + history when agent tab; drop settings/profile
  if (c.menus?.['editor/title']) {
    c.menus['editor/title'] = c.menus['editor/title'].filter((item) => {
      const cmd = item.command || '';
      if (cmd.includes('marketplace')) return false;
      if (cmd.includes('settingsButton') || cmd.includes('profileButton')) return false;
      if (cmd.includes('agentManager')) return false;
      return true;
    });
  }

  // Hide Kilo settings/profile from command palette (use shell product panel instead)
  const HIDE_PALETTE = new Set([
    'kilo-code.new.settingsButtonClicked',
    'kilo-code.new.profileButtonClicked',
    'kilo-code.new.sidebarTitle.settingsButtonClicked',
    'kilo-code.new.sidebarTitle.profileButtonClicked',
    'kilo-code.new.marketplaceButtonClicked',
    'kilo-code.new.sidebarTitle.marketplaceButtonClicked',
  ]);
  if (!c.menus.commandPalette) c.menus.commandPalette = [];
  for (const id of HIDE_PALETTE) {
    const existing = c.menus.commandPalette.find((x) => x.command === id);
    if (existing) existing.when = 'false';
    else c.menus.commandPalette.push({ command: id, when: 'false' });
  }

  // commandPalette: kill marketplace entries; hide sidebar duplicates already when:false
  if (c.menus?.commandPalette) {
    c.menus.commandPalette = c.menus.commandPalette.filter(
      (item) => !String(item.command || '').includes('marketplace'),
    );
  }

  // Sweep all other menus for marketplace
  for (const [menuName, items] of Object.entries(c.menus || {})) {
    if (!Array.isArray(items)) continue;
    c.menus[menuName] = items.filter(
      (item) => !String(item.command || '').toLowerCase().includes('marketplace'),
    );
  }

  // keybindings: drop marketplace
  if (Array.isArray(c.keybindings)) {
    c.keybindings = c.keybindings.filter(
      (kb) => !String(kb.command || '').includes('marketplace'),
    );
  }

  console.log('  nativeChrome: sidebar=new+history, marketplace removed, kilo icons cleared');
}

function ensureLink(target, linkPath) {
  try {
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {
    /* */
  }
  fs.symlinkSync(target, linkPath, 'junction');
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Copy dist/*.js and apply UI string brand (do not touch upstream) */
function materializeAndPatchDist(upstream) {
  const srcDist = path.join(upstream, 'dist');
  const destDist = path.join(OUT, 'dist');
  if (!fs.existsSync(srcDist)) {
    console.warn('  warn: no upstream dist — build kilo-vscode first');
    return;
  }

  // Remove old link/dir
  try {
    fs.rmSync(destDist, { recursive: true, force: true });
  } catch {
    /* */
  }
  fs.mkdirSync(destDist, { recursive: true });

  // Copy tree shallow: files + one level (assets in dist often flat + css)
  const copyRecursive = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
      const s = path.join(from, ent.name);
      const d = path.join(to, ent.name);
      if (ent.isDirectory()) copyRecursive(s, d);
      else fs.copyFileSync(s, d);
    }
  };
  copyRecursive(srcDist, destDist);
  console.log('  copy dist/ (local, patchable)');

  // Append evocode-overrides.css to all copied .css files in dist
  const overridesPath = path.join(PKG_ROOT, 'brand/evocode-overrides.css');
  if (fs.existsSync(overridesPath)) {
    const cssOverrides = fs.readFileSync(overridesPath, 'utf-8');
    const files = fs.readdirSync(destDist);
    let cssPatchedCount = 0;
    for (const file of files) {
      if (file.endsWith('.css')) {
        const filePath = path.join(destDist, file);
        fs.appendFileSync(filePath, '\n' + cssOverrides);
        cssPatchedCount++;
      }
    }
    console.log(`  append evocode-overrides.css to ${cssPatchedCount} CSS files in dist`);
  } else {
    console.warn('  warn: brand/evocode-overrides.css not found — skipping CSS overrides append');
  }

  const patchFiles = [
    'webview.js',
    'agent-manager.js',
    'extension.js',
    'diff-viewer.js',
    'diff-virtual.js',
    'marketplace.js',
    'kiloclaw.js',
  ];

  // Webview-only aggressive de-Kilo (substring, longest first)
  const dekiloList = (DEKILO.replacements || [])
    .filter((r) => r.from && r.to && r.from !== r.to)
    .sort((a, b) => b.from.length - a.from.length);

  // Safer phrase list: quoted only
  const phraseList = [
    ...(UI_STRINGS.replacements || []),
    ...(I18N_RU.phrases || []),
  ]
    .filter((r) => r.from && r.to && r.from !== r.to)
    .sort((a, b) => b.from.length - a.from.length);

  // i18n key-safe patches (optimized O(1) Map)
  const keyPatchMap = new Map();
  for (const [key, val] of Object.entries(I18N_RU.keyPatches || {})) {
    if (!val?.en || !val?.ru || val.en === val.ru) continue;
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    keyPatchMap.set(key, { en: esc(val.en), ru: esc(val.ru) });
  }

  const webviewLike = new Set([
    'webview.js',
    'agent-manager.js',
    'diff-viewer.js',
    'diff-virtual.js',
    'marketplace.js',
    'kiloclaw.js',
  ]);

  let total = 0;
  for (const name of patchFiles) {
    const p = path.join(destDist, name);
    if (!fs.existsSync(p)) continue;
    let text = fs.readFileSync(p, 'utf-8');
    let n = 0;

    // Single-pass replacement for key patches
    text = text.replace(/"([a-zA-Z0-9\._\-]+)":\s*"([^"]*)"/g, (match, key, val) => {
      const patch = keyPatchMap.get(key);
      if (patch && patch.en === val) {
        n++;
        return `"${key}": "${patch.ru}"`;
      }
      return match;
    });

    for (const { from, to } of phraseList) {
      if (from.length < 4) continue;
      if (from.includes('"') || to.includes('"')) continue;
      const variants = [
        [`"${from}"`, `"${to}"`],
        [`'${from}'`, `'${to}'`],
      ];
      for (const [a, b] of variants) {
        if (!text.includes(a)) continue;
        const parts = text.split(a);
        if (parts.length > 1) {
          n += parts.length - 1;
          text = parts.join(b);
        }
      }
    }

    // Aggressive de-Kilo on UI bundles (and mild on extension host for icons/URLs)
    const list =
      name === 'extension.js'
        ? dekiloList.filter(
            (r) =>
              r.from.includes('.svg') ||
              r.from.includes('.png') ||
              r.from.includes('kilo.ai') ||
              r.from.includes('Kilo Code') ||
              r.from.includes('kilo-logo') ||
              r.from.includes('Rebuild or reinstall'),
          )
        : webviewLike.has(name)
          ? dekiloList
          : [];

    for (const { from, to } of list) {
      if (!text.includes(from)) continue;
      const parts = text.split(from);
      if (parts.length > 1) {
        n += parts.length - 1;
        text = parts.join(to);
      }
    }

    if (name === 'extension.js') {
      const oldSpawn = 'const serverProcess = spawn(cliPath, ["serve", "--port", "0"], {';
      const newSpawn = `let finalCliPath = cliPath;
      let finalCliArgs = ["serve", "--port", "0"];
      if (cfg.get("sandbox.enabled", false) && require("fs").existsSync("/usr/bin/bwrap")) {
        console.log("[Evocode] Sandbox active via bubblewrap");
        finalCliPath = "/usr/bin/bwrap";
        const bwrapArgs = [
          "--ro-bind", "/", "/",
          "--dev", "/dev",
          "--proc", "/proc",
          "--tmpfs", "/tmp",
          "--share-net"
        ];
        if (folders) {
          for (const f of folders) {
            bwrapArgs.push("--bind", f.uri.fsPath, f.uri.fsPath);
          }
        }
        const home = require("os").homedir();
        const dirs = [
          require("path").join(home, ".config", "evocode"),
          require("path").join(home, ".local", "share", "evocode"),
          require("path").join(home, ".evocode-ide")
        ];
        for (const dir of dirs) {
          try { require("fs").mkdirSync(dir, { recursive: true }); } catch(e){}
          bwrapArgs.push("--bind", dir, dir);
        }
        finalCliArgs = [...bwrapArgs, cliPath, "serve", "--port", "0"];
      }
      const serverProcess = spawn(finalCliPath, finalCliArgs, {`;
      if (text.includes(oldSpawn)) {
        text = text.replace(oldSpawn, newSpawn);
        n += 1;
      }

      // Prefer Эвокод config names (evocode.json) while keeping kilo.json as fallback
      const configPathPatches = [
        [
          'var MODERN = ["kilo.jsonc", "kilo.json"]',
          'var MODERN = ["evocode.jsonc", "evocode.json", "kilo.jsonc", "kilo.json"]',
        ],
        [
          'var GLOBAL = ["kilo.jsonc", "kilo.json", "opencode.jsonc", "opencode.json", "config.json"]',
          'var GLOBAL = ["evocode.jsonc", "evocode.json", "kilo.jsonc", "kilo.json", "opencode.jsonc", "opencode.json", "config.json"]',
        ],
        [
          'return path18.join(xdg, "kilo");',
          'return path18.join(xdg, "evocode", "agent");',
        ],
        // globalFiles() hardcodes ~/.config/kilo
        [
          'path23.join(os6.homedir(), ".config"), "kilo")',
          'path23.join(os6.homedir(), ".config"), "evocode", "agent")',
        ],
        [
          'const env17 = process.env.KILO_CONFIG ? [row(process.env.KILO_CONFIG, "sourceEnvFile")] : [];',
          'const env17 = (process.env.EVOCODE_CONFIG || process.env.KILO_CONFIG) ? [row(process.env.EVOCODE_CONFIG || process.env.KILO_CONFIG, "sourceEnvFile")] : [];',
        ],
        [
          'const extra = process.env.KILO_CONFIG_DIR;',
          'const extra = process.env.EVOCODE_CONFIG_DIR || process.env.KILO_CONFIG_DIR;',
        ],
        [
          'var HOME = [".kilo", ".kilocode", ".opencode"];',
          'var HOME = [".evocode", ".kilo", ".kilocode", ".opencode"];',
        ],
        [
          'var SOURCES = {\n  ".kilo": "sourceHomeKilo",\n  ".kilocode": "sourceHomeKilocode",\n  ".opencode": "sourceHomeOpencode"\n};',
          'var SOURCES = {\n  ".evocode": "sourceHomeEvocode",\n  ".kilo": "sourceHomeKilo",\n  ".kilocode": "sourceHomeKilocode",\n  ".opencode": "sourceHomeOpencode"\n};',
        ],
      ];
      for (const [from, to] of configPathPatches) {
        if (text.includes(from)) {
          text = text.split(from).join(to);
          n += 1;
        } else if (text.includes(to)) {
          // already patched (re-run)
        } else {
          console.warn(`  warn: config path patch miss: ${from.slice(0, 60)}…`);
        }
      }

      // Never show Kilo legacy migration wizard / team onboarding in Эвокод
      const migFrom = 'async function checkAndShowMigrationWizard(ctx) {';
      const migTo = `async function checkAndShowMigrationWizard(ctx) {
  /* Эвокод: migration/team promo wizard disabled */
  return;
  `;
      if (text.includes(migFrom) && !text.includes('Эвокод: migration/team promo wizard disabled')) {
        text = text.replace(migFrom, migTo);
        n += 1;
      }

      // Kill Kilo Gateway in-app notifications (Team trial carousel, promos)
      const notifFrom = 'async fetchAndSendNotifications() {';
      const notifTo = `async fetchAndSendNotifications() {
    /* Эвокод: Kilo Gateway notifications disabled (no Team trial / marketing carousel) */
    const empty = { type: "notificationsLoaded", notifications: [], dismissedIds: [] };
    this.cachedNotificationsMessage = empty;
    this.postMessage(empty);
    return;
    `;
      if (
        text.includes(notifFrom) &&
        !text.includes('Эвокод: Kilo Gateway notifications disabled')
      ) {
        text = text.replace(notifFrom, notifTo);
        n += 1;
      }
    }



    // F2.6: Rename command IDs kilo-code.* / kilo-code-* to evocode-agent.* / evocode-agent-* in JS bundles
    if (text.includes('kilo-code.') || text.includes('kilo-code-')) {
      text = text
        .split('kilo-code.').join('evocode-agent.')
        .split('kilo-code-').join('evocode-agent-');
      n += 1;
    }

    if (n > 0) {
      fs.writeFileSync(p, text);
      console.log(`  patch ${name}: ${n} replacements`);
      total += n;
    }
  }
  console.log(
    `  total UI string replacements: ${total} (i18n keys: ${keyPatchMap.size}, phrases: ${phraseList.length}, dekilo: ${dekiloList.length})`,
  );
}

function materializeIcons() {
  const dest = path.join(OUT, 'assets', 'icons');
  // Start from upstream icons link/copy structure
  const upstreamAssets = path.join(resolveUpstream(), 'assets');
  if (fs.existsSync(path.join(OUT, 'assets'))) {
    try {
      fs.rmSync(path.join(OUT, 'assets'), { recursive: true, force: true });
    } catch {
      /* */
    }
  }
  // copy upstream assets then overwrite brand icons
  if (fs.existsSync(upstreamAssets)) {
    const copyRecursive = (from, to) => {
      fs.mkdirSync(to, { recursive: true });
      for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
        const s = path.join(from, ent.name);
        const d = path.join(to, ent.name);
        if (ent.isDirectory()) copyRecursive(s, d);
        else fs.copyFileSync(s, d);
      }
    };
    copyRecursive(upstreamAssets, path.join(OUT, 'assets'));
  } else {
    fs.mkdirSync(dest, { recursive: true });
  }

  const brandFiles = [
    'logo-outline-black.png',
    'kilo-light.png',
    'kilo-dark.png',
    'evocode-icon-256.png',
    'evocode-activity.svg',
    'evocode-activity-light.svg',
    'evocode-activity-dark.svg',
    'evocode-activity-light.png',
    'evocode-activity-dark.png',
    'evocode-app.svg',
    'evocode-chat.svg',
  ];
  for (const name of brandFiles) {
    const src = path.join(BRAND_ICONS, name);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(dest, name));
      console.log(`  icon ${name}`);
    }
  }

  const activitySvgContent = fs.existsSync(path.join(BRAND_ICONS, 'evocode-activity.svg'))
    ? fs.readFileSync(path.join(BRAND_ICONS, 'evocode-activity.svg'), 'utf8')
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6L3 12L8 18"/><path d="M18 6c-3.5 0-6 2.5-6 6s2.5 6 6 6"/><path d="M3 12h15"/></svg>\n`;

  const activitySvg = path.join(dest, 'evocode-activity.svg');
  fs.writeFileSync(activitySvg, activitySvgContent);

  // Kill leftover Kilo brand filenames still referenced by upstream package/webview
  const killKiloNames = [
    'kilo-light.svg',
    'kilo-dark.svg',
    'kilo-light.png',
    'kilo-dark.png',
    'logo-outline-black.png',
  ];
  const pngBrand = path.join(BRAND_ICONS, 'evocode-icon-256.png');
  for (const name of killKiloNames) {
    const target = path.join(dest, name);
    if (name.endsWith('.svg')) {
      fs.writeFileSync(target, activitySvgContent);
      console.log(`  overwrite kilo brand → ${name}`);
    } else if (fs.existsSync(pngBrand)) {
      fs.copyFileSync(pngBrand, target);
      console.log(`  overwrite kilo brand → ${name}`);
    }
  }

  // Remove kilo icon font if present (was Kilo logo glyphs)
  const font = path.join(dest, 'kilo-icon-font.woff2');
  if (fs.existsSync(font)) {
    fs.unlinkSync(font);
    console.log('  removed kilo-icon-font.woff2');
  }
}

function writeWorkspaceFiles() {
  // IMPORTANT: never write product branding (window.title=Эвокод) into repo .vscode/
  // — that renames stock VS Code when opening this folder.
  // Branding only: packages/ide/shell/settings.json → ~/.evocode-ide
  const vscodeDir = path.join(EVOCODE_ROOT, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });

  const safeSettings = {
    _comment:
      'No product branding here (see packages/ide/shell/settings.json for Эвокод profile)',
    'files.exclude': {
      '**/node_modules': true,
      'packages/ide/dist': true,
      'packages/ide/vscodium': true,
    },
  };
  fs.writeFileSync(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(safeSettings, null, 2) + '\n',
  );

  const workspaceFile = path.join(PKG_ROOT, 'config/evocode.code-workspace');
  const launch = {
    version: '0.2.0',
    configurations: [
      {
        name: 'Evocode Extension Dev',
        type: 'extensionHost',
        request: 'launch',
        args: [
          `--extensionDevelopmentPath=${OUT}`,
          path.join(PKG_ROOT, 'config/evocode.code-workspace'),
        ],
        outFiles: [`${OUT}/dist/**/*.js`],
      },
    ],
  };
  fs.writeFileSync(path.join(vscodeDir, 'launch.json'), JSON.stringify(launch, null, 2) + '\n');
  console.log('  wrote .vscode (no window.title branding)');
  if (fs.existsSync(workspaceFile)) {
    console.log('  workspace:', workspaceFile);
  }
}

function main() {
  const upstream = resolveUpstream();
  console.log('=== Эвокод: apply-rebrand (face + icons + UI) ===');
  console.log('Upstream:', upstream);
  console.log('Out:     ', OUT);

  fs.mkdirSync(OUT, { recursive: true });
  const branded = rebrandPackage(
    JSON.parse(fs.readFileSync(path.join(upstream, 'package.json'), 'utf-8'))
  );
  fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify(branded, null, 2) + '\n');

  // Symlink heavy/runtime (not dist/assets — we materialize those)
  for (const name of ['src', 'bin', 'webview-ui', 'node_modules', 'LICENSE']) {
    const src = path.join(upstream, name);
    if (fs.existsSync(src)) {
      ensureLink(src, path.join(OUT, name));
      console.log(`  link ${name}`);
    }
  }

  materializeAndPatchDist(upstream);
  materializeIcons();
  writeWorkspaceFiles();

  fs.writeFileSync(
    path.join(OUT, 'EVOCODE.md'),
    `# Эвокод Agent\n\nGenerated. Re-run: \`npm run agent:rebrand\`\n\n- Icons: brand/icons\n- UI strings: brand/ui-strings.json patched into dist/\n- Core: ${branded.evocode.coreBaseUrl}\n`
  );

  console.log('');
  console.log('✅ Brand applied');
  console.log('   displayName:', branded.displayName);
  console.log('   icon:       ', branded.icon);
  console.log('');
  console.log('Launch: npm run agent:launch');
  console.log('  → no VS Code welcome (startupEditor=none)');
  console.log('  → secondary sidebar hidden (меньше «стандартного чата»)');
  console.log('  → webview welcome → «Эвокод»');
}

main();
