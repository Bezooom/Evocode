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

  // Activity bar: monochrome SVG (PNG often invisible on top/side bar)
  try {
    const ab = out.contributes?.viewsContainers?.activitybar;
    if (Array.isArray(ab) && ab[0]) {
      ab[0].title = 'Эвокод';
      ab[0].icon = 'assets/icons/evocode-activity.svg';
      ab[0].darkIcon = 'assets/icons/evocode-activity.svg';
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
  return out;
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

  const patchFiles = [
    'webview.js',
    'agent-manager.js',
    'extension.js',
    'diff-viewer.js',
  ];

  // Build replacement list: longer phrases first (avoid partial clobber)
  const phraseList = [
    ...(UI_STRINGS.replacements || []),
    ...(I18N_RU.phrases || []),
  ]
    .filter((r) => r.from && r.to && r.from !== r.to)
    .sort((a, b) => b.from.length - a.from.length);

  // i18n key-safe patches: "key.path": "English" → "key.path": "Русский"
  const keyPatchList = [];
  for (const [key, val] of Object.entries(I18N_RU.keyPatches || {})) {
    if (!val?.en || !val?.ru || val.en === val.ru) continue;
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    keyPatchList.push({
      from: `"${key}": "${esc(val.en)}"`,
      to: `"${key}": "${esc(val.ru)}"`,
    });
  }

  let total = 0;
  for (const name of patchFiles) {
    const p = path.join(destDist, name);
    if (!fs.existsSync(p)) continue;
    let text = fs.readFileSync(p, 'utf-8');
    let n = 0;

    for (const { from, to } of keyPatchList) {
      if (!text.includes(from)) continue;
      const parts = text.split(from);
      if (parts.length > 1) {
        n += parts.length - 1;
        text = parts.join(to);
      }
    }

    for (const { from, to } of phraseList) {
      if (from.length < 4) continue;
      // ONLY quoted string literals — never bare identifiers (getDefaultValue)
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

    if (n > 0) {
      fs.writeFileSync(p, text);
      console.log(`  patch ${name}: ${n} replacements`);
      total += n;
    }
  }
  console.log(
    `  total UI string replacements: ${total} (i18n keys: ${keyPatchList.length}, phrases: ${phraseList.length})`,
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
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M16.2 4.5c-3.9 0-6.9 2.1-6.9 7.5s3 7.5 6.9 7.5h.3a1.2 1.2 0 0 1 0 2.4h-.3C10.5 21.9 6 18.7 6 12S10.5 2.1 16.5 2.1h.3a1.2 1.2 0 0 1 0 2.4h-.6zm-8.4 6.3h8.4a1.2 1.2 0 0 1 0 2.4H7.8a1.2 1.2 0 0 1 0-2.4z"/></svg>\n`;

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
  const vscodeDir = path.join(EVOCODE_ROOT, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });

  const settings = JSON.parse(
    fs.readFileSync(path.join(PKG_ROOT, 'config/settings.vscode.json'), 'utf-8')
  );
  fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify(settings, null, 2) + '\n');

  const workspaceFile = path.join(PKG_ROOT, 'config/evocode.code-workspace');
  const launch = {
    version: '0.2.0',
    configurations: [
      {
        name: 'Эвокод: Extension',
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
  console.log('  wrote .vscode settings (no welcome, hide secondary chat chrome)');
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
