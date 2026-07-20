#!/usr/bin/env node
/**
 * F2.3 — Preinstall path for evocode-agent into branded IDE / local editors.
 *
 * Stages rebranded extension and installs it so the IDE opens with sidebar «Эвокод»
 * without `--extensionDevelopmentPath`.
 *
 * Usage:
 *   node packages/ide/scripts/preinstall-agent.mjs            # stage + install
 *   node packages/ide/scripts/preinstall-agent.mjs --stage     # stage only
 *   node packages/ide/scripts/preinstall-agent.mjs --check    # verify
 *   node packages/ide/scripts/preinstall-agent.mjs --copy     # materialize files (no symlinks)
 *   node packages/ide/scripts/preinstall-agent.mjs --target ~/.vscode/extensions
 *
 * Layout:
 *   packages/ide/preinstall/evocode-agent/     ← staged package
 *   ~/.evocode-ide/extensions/<id>/            ← default install (dataFolderName)
 *   packages/ide/vscodium/vscode/extensions/   ← build hook if tree exists
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDE_DIR = path.resolve(__dirname, '..');
const ROOT = path.resolve(IDE_DIR, '../..');
const AGENT_PKG = path.join(ROOT, 'packages/agent-extension');
const EXT_SRC = path.join(AGENT_PKG, 'extension');
const STAGE_DIR = path.join(IDE_DIR, 'preinstall', 'evocode-agent');
const MANIFEST_PATH = path.join(IDE_DIR, 'preinstall', 'manifest.json');
const DEFAULTS_PATH = path.join(IDE_DIR, 'preinstall', 'settings.default.json');

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const STAGE_ONLY = args.has('--stage');
const USE_COPY = args.has('--copy');
const targetArgIdx = process.argv.indexOf('--target');
const TARGET_OVERRIDE =
  targetArgIdx >= 0 ? path.resolve(process.argv[targetArgIdx + 1] || '') : null;

function log(...m) {
  console.log(...m);
}
function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureRebrand() {
  // Always re-run brand so icons/UI strings stay current (cheap vs stale Kilo face)
  log('Running apply-rebrand (icons + UI strings)…');
  execSync('node packages/agent-extension/scripts/apply-rebrand.mjs', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function resolveReal(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

function linkOrCopy(src, dest, { copy = USE_COPY } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  rmrf(dest);
  if (copy) {
    // dereference symlinks so stage is self-contained
    execSync(`cp -aL "${src}" "${dest}"`, { stdio: 'pipe' });
  } else {
    fs.symlinkSync(resolveReal(src), dest, 'junction');
  }
}

function stageExtension() {
  ensureRebrand();
  const pkgPath = path.join(EXT_SRC, 'package.json');
  if (!fs.existsSync(pkgPath)) fail(`missing ${pkgPath}`);

  const pkg = readJson(pkgPath);
  if (pkg.name !== 'evocode-agent' || pkg.publisher !== 'evocode') {
    fail('extension package.json is not rebranded — run npm run agent:rebrand');
  }

  const distJs = path.join(EXT_SRC, 'dist', 'extension.js');
  if (!fs.existsSync(distJs)) {
    fail(
      'dist/extension.js missing. Build kilo-vscode:\n' +
        '  cd /home/bezoom/kilocode && bun run --cwd packages/kilo-vscode compile',
    );
  }

  log('=== F2.3 stage evocode-agent ===');
  log('  source:', EXT_SRC);
  log('  stage: ', STAGE_DIR);
  log('  mode:  ', USE_COPY ? 'copy (materialize)' : 'symlink');

  rmrf(STAGE_DIR);
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  // Real package.json (branded, not a symlink)
  fs.copyFileSync(pkgPath, path.join(STAGE_DIR, 'package.json'));

  // Optional marker
  const markerSrc = path.join(EXT_SRC, 'EVOCODE.md');
  if (fs.existsSync(markerSrc)) {
    fs.copyFileSync(markerSrc, path.join(STAGE_DIR, 'EVOCODE.md'));
  }

  // Runtime pieces — prefer real dirs from rebrand (dist/assets are materialized)
  for (const name of ['dist', 'assets', 'bin']) {
    const src = path.join(EXT_SRC, name);
    if (!fs.existsSync(src)) {
      if (name === 'dist') fail(`required ${src} missing`);
      log(`  skip missing: ${name}`);
      continue;
    }
    // Always materialize assets (brand icons) so stage never points at Kilo icons
    const forceCopy = name === 'assets' || name === 'dist' || USE_COPY;
    linkOrCopy(src, path.join(STAGE_DIR, name), { copy: forceCopy });
  }

  // LICENSE if present
  for (const name of ['LICENSE', 'LICENSE.txt', 'CHANGELOG.md', 'README.md']) {
    const src = path.join(EXT_SRC, name);
    if (fs.existsSync(src)) {
      try {
        linkOrCopy(src, path.join(STAGE_DIR, name));
      } catch {
        /* optional */
      }
    }
  }

  // .vscodeignore-style note for packagers
  fs.writeFileSync(
    path.join(STAGE_DIR, '.evocode-preinstall'),
    [
      'Evocode F2.3 preinstalled agent',
      `publisher=${pkg.publisher}`,
      `name=${pkg.name}`,
      `version=${pkg.version}`,
      `stagedAt=${new Date().toISOString()}`,
      `mode=${USE_COPY ? 'copy' : 'symlink'}`,
      '',
    ].join('\n'),
  );

  const extensionId = `${pkg.publisher}.${pkg.name}`;
  const folderName = `${extensionId}-${pkg.version}`;

  const manifest = {
    phase: 'F2.3',
    extensionId,
    folderName,
    version: pkg.version,
    publisher: pkg.publisher,
    name: pkg.name,
    displayName: pkg.displayName,
    stageDir: STAGE_DIR,
    main: pkg.main,
    stagedAt: new Date().toISOString(),
    mode: USE_COPY ? 'copy' : 'symlink',
    viewsContainerTitle: 'Эвокод',
  };
  writeJson(MANIFEST_PATH, manifest);

  writeJson(DEFAULTS_PATH, {
    'evocode-agent.new.model.providerID': 'evocode',
    'evocode-agent.new.model.modelID': 'evocode-auto',
    'extensions.autoUpdate': false,
  });

  // product.json fragment for future IDE packaging (recommendations)
  writeJson(path.join(IDE_DIR, 'preinstall', 'product-extensions.fragment.json'), {
    extensionRecommendations: [extensionId],
    extensionPinned: [extensionId],
    // consumed by docs / future prepare_vscode hook
    _evocode: {
      note: 'Copy packages/ide/preinstall/evocode-agent into vscode/extensions/evocode-agent before build',
      systemExtensionPath: 'extensions/evocode-agent',
    },
  });

  log(`  staged ${extensionId}@${pkg.version}`);
  return manifest;
}

function defaultInstallRoots() {
  const home = os.homedir();
  // NEVER install into ~/.vscode — that pollutes normal VS Code + Kilo.
  // Only Evocode profile (and optional EVOCODE_INSTALL_EXTRA=1 for oss).
  const roots = [path.join(home, '.evocode-ide', 'extensions')];
  if (process.env.EVOCODE_INSTALL_EXTRA === '1') {
    roots.push(path.join(home, '.vscode-oss', 'extensions'));
  }
  return roots;
}

function installTo(extensionsDir, manifest) {
  fs.mkdirSync(extensionsDir, { recursive: true });
  const dest = path.join(extensionsDir, manifest.folderName);

  // Remove previous versions of same id
  if (fs.existsSync(extensionsDir)) {
    for (const ent of fs.readdirSync(extensionsDir)) {
      if (ent.startsWith(`${manifest.extensionId}-`) && ent !== manifest.folderName) {
        log(`  remove old: ${path.join(extensionsDir, ent)}`);
        rmrf(path.join(extensionsDir, ent));
      }
    }
  }

  rmrf(dest);
  if (USE_COPY) {
    execSync(`cp -aL "${STAGE_DIR}" "${dest}"`, { stdio: 'pipe' });
  } else {
    fs.symlinkSync(STAGE_DIR, dest, 'junction');
  }

  // obsolete marker file some VS Code versions use
  const obsolete = path.join(extensionsDir, '.obsolete');
  if (fs.existsSync(obsolete)) {
    try {
      const o = readJson(obsolete);
      let changed = false;
      for (const k of Object.keys(o)) {
        if (k.startsWith(`${manifest.extensionId}-`)) {
          delete o[k];
          changed = true;
        }
      }
      if (changed) writeJson(obsolete, o);
    } catch {
      /* ignore */
    }
  }

  log(`  installed → ${dest}`);
  return dest;
}

function hookVscodiumSource(manifest) {
  const vscodeExt = path.join(IDE_DIR, 'vscodium', 'vscode', 'extensions');
  if (!fs.existsSync(path.dirname(vscodeExt)) || !fs.existsSync(path.join(IDE_DIR, 'vscodium', 'vscode'))) {
    log('  VSCodium vscode/ tree not prepared yet — skip system-extension hook');
    log('  (after prepare_vscode.sh: re-run npm run ide:preinstall-agent)');
    return null;
  }
  fs.mkdirSync(vscodeExt, { recursive: true });
  const dest = path.join(vscodeExt, 'evocode-agent');
  rmrf(dest);
  if (USE_COPY) {
    execSync(`cp -aL "${STAGE_DIR}" "${dest}"`, { stdio: 'pipe' });
  } else {
    fs.symlinkSync(STAGE_DIR, dest, 'junction');
  }
  log(`  VSCodium system extension → ${dest}`);
  return dest;
}

function writeInstallRecord(manifest, installs) {
  const record = {
    ...manifest,
    installs,
    verifiedAt: new Date().toISOString(),
  };
  writeJson(path.join(IDE_DIR, 'preinstall', 'install-record.json'), record);
  return record;
}

function check() {
  let failed = 0;
  const ok = (m) => log('  ✓', m);
  const bad = (m) => {
    console.error('  ✗', m);
    failed++;
  };

  log('=== F2.3 verify preinstall ===');

  if (!fs.existsSync(MANIFEST_PATH)) {
    bad('preinstall/manifest.json missing — run npm run ide:preinstall-agent');
  } else {
    ok('manifest.json');
    const m = readJson(MANIFEST_PATH);
    m.extensionId === 'evocode.evocode-agent'
      ? ok(`extensionId=${m.extensionId}`)
      : bad(`extensionId=${m.extensionId}`);
    m.displayName?.includes('Эвокод')
      ? ok(`displayName has Эвокод`)
      : bad(`displayName=${m.displayName}`);
  }

  const stagePkg = path.join(STAGE_DIR, 'package.json');
  if (!fs.existsSync(stagePkg)) {
    bad('stage package.json missing');
  } else {
    const pkg = readJson(stagePkg);
    pkg.name === 'evocode-agent' ? ok('stage name') : bad(`stage name=${pkg.name}`);
    pkg.publisher === 'evocode' ? ok('stage publisher') : bad(`stage publisher=${pkg.publisher}`);
    const title =
      pkg.contributes?.viewsContainers?.activitybar?.[0]?.title ||
      pkg.contributes?.viewsContainers?.auxiliarybar?.[0]?.title ||
      pkg.contributes?.viewsContainers?.secondarySidebar?.[0]?.title ||
      pkg.contributes?.views?.['kilo-code-ActivityBar']?.[0]?.name;
    title === 'Эвокод' || String(title).includes('Эвокод')
      ? ok(`sidebar title=${title}`)
      : bad(`sidebar title=${title}`);
  }

  const distJs = path.join(STAGE_DIR, 'dist', 'extension.js');
  fs.existsSync(distJs) ? ok('stage dist/extension.js') : bad('stage dist/extension.js missing');

  const homeInstall = path.join(
    os.homedir(),
    '.evocode-ide',
    'extensions',
  );
  if (fs.existsSync(homeInstall)) {
    const entries = fs.readdirSync(homeInstall).filter((e) => e.startsWith('evocode.evocode-agent-'));
    entries.length
      ? ok(`~/.evocode-ide/extensions: ${entries.join(', ')}`)
      : bad('~/.evocode-ide/extensions has no evocode.evocode-agent-*');
  } else {
    bad('~/.evocode-ide/extensions missing — run ide:preinstall-agent');
  }

  // package.json defaults
  if (fs.existsSync(stagePkg)) {
    const pkg = readJson(stagePkg);
    const conf = pkg.contributes?.configuration;
    const props = {};
    for (const c of Array.isArray(conf) ? conf : conf ? [conf] : []) {
      Object.assign(props, c.properties || {});
    }
    const pKey = props['evocode-agent.new.model.providerID'] || props['kilo-code.new.model.providerID'];
    const mKey = props['evocode-agent.new.model.modelID'] || props['kilo-code.new.model.modelID'];
    pKey?.default === 'evocode'
      ? ok('default providerID=evocode')
      : bad('default providerID not evocode');
    mKey?.default === 'evocode-auto'
      ? ok('default modelID=evocode-auto')
      : bad('default modelID not evocode-auto');
  }

  console.log(failed ? `\nFAILED: ${failed}` : '\n✅ F2.3 preinstall verify passed');
  process.exit(failed ? 1 : 0);
}

function main() {
  if (CHECK_ONLY) {
    check();
    return;
  }

  const manifest = stageExtension();

  if (STAGE_ONLY) {
    log('Stage-only done.');
    return;
  }

  log('=== F2.3 install ===');
  const installs = [];

  const roots = TARGET_OVERRIDE
    ? [TARGET_OVERRIDE]
    : defaultInstallRoots();

  // Always install to branded path; others only if parent already exists or is default brand
  for (const root of roots) {
    const isBrand = root.includes('.evocode-ide');
    const parentExists = fs.existsSync(path.dirname(root)) || isBrand;
    if (!isBrand && !TARGET_OVERRIDE && !fs.existsSync(root) && !fs.existsSync(path.dirname(root))) {
      // create only brand folder automatically; skip random editor folders that don't exist
      if (!root.includes('.evocode-ide')) {
        // still create vscode-oss/vscode if user has those products' config dirs
        const productDir = path.dirname(root);
        if (!fs.existsSync(productDir)) {
          log(`  skip (no editor data dir): ${root}`);
          continue;
        }
      }
    }
    try {
      const dest = installTo(root, manifest);
      installs.push({ path: dest, root });
    } catch (e) {
      console.warn(`  warn: install failed for ${root}: ${e.message}`);
    }
  }

  // Always ensure brand path
  if (!installs.some((i) => i.root.includes('.evocode-ide'))) {
    const brandRoot = path.join(os.homedir(), '.evocode-ide', 'extensions');
    installs.push({ path: installTo(brandRoot, manifest), root: brandRoot });
  }

  const vscHook = hookVscodiumSource(manifest);
  if (vscHook) installs.push({ path: vscHook, root: 'vscodium-system' });

  // Always copy both evocode-agent and evocode-shell into the portable IDE resources/app/extensions directory if it exists!
  const portableExtDir = path.join(IDE_DIR, 'dist', 'evocode-ide', 'resources', 'app', 'extensions');
  if (fs.existsSync(portableExtDir)) {
    log('=== F2.3 install to portable IDE built-in extensions ===');
    
    // Copy evocode-agent
    const agentDest = path.join(portableExtDir, 'evocode-agent');
    rmrf(agentDest);
    execSync(`cp -aL "${STAGE_DIR}" "${agentDest}"`, { stdio: 'pipe' });
    log(`  installed agent → ${agentDest}`);
    
    // Copy evocode-shell
    const shellSrc = path.join(IDE_DIR, 'shell', 'extension');
    if (fs.existsSync(shellSrc)) {
      const shellDest = path.join(portableExtDir, 'evocode-shell');
      rmrf(shellDest);
      execSync(`cp -aL "${shellSrc}" "${shellDest}"`, { stdio: 'pipe' });
      log(`  installed shell → ${shellDest}`);
    }
  }

  // Always copy both evocode-agent and evocode-shell into the global system IDE resources/app/extensions directory if it exists and is writable!
  const systemExtDirs = [
    '/usr/share/evocode/resources/app/extensions',
  ];
  for (const systemExtDir of systemExtDirs) {
    if (fs.existsSync(systemExtDir)) {
      try {
        log(`=== F2.3 install to system IDE built-in extensions: ${systemExtDir} ===`);
        
        // Copy evocode-agent
        const agentDest = path.join(systemExtDir, 'evocode-agent');
        rmrf(agentDest);
        execSync(`cp -aL "${STAGE_DIR}" "${agentDest}"`, { stdio: 'pipe' });
        log(`  installed system agent → ${agentDest}`);
        
        // Copy evocode-shell
        const shellSrc = path.join(IDE_DIR, 'shell', 'extension');
        if (fs.existsSync(shellSrc)) {
          const shellDest = path.join(systemExtDir, 'evocode-shell');
          rmrf(shellDest);
          execSync(`cp -aL "${shellSrc}" "${shellDest}"`, { stdio: 'pipe' });
          log(`  installed system shell → ${shellDest}`);
        }
      } catch (err) {
        log(`  warn: system install failed for ${systemExtDir}: ${err.message}`);
      }
    }
  }

  // Import useful preview/utility extensions from the default VS Code extensions folder if they exist
  const defaultVsCodeExtDir = path.join(os.homedir(), '.vscode', 'extensions');
  const importList = [
    'hediet.vscode-drawio',
    'tomoki1207.pdf',
    'mechatroner.rainbow-csv',
    'yzhang.markdown-all-in-one',
    'redhat.vscode-yaml',
    'dotjoshjohnson.xml',
    'usernamehw.errorlens',
    'mhutchie.git-graph',
    'ms-vscode.hexeditor',
    'pomdtr.excalidraw-editor',
    'ms-vscode.live-preview'
  ];

  if (fs.existsSync(defaultVsCodeExtDir)) {
    try {
      const dirs = fs.readdirSync(defaultVsCodeExtDir);
      for (const imp of importList) {
        const matchingDir = dirs.find(d => d.toLowerCase().startsWith(imp.toLowerCase()));
        if (matchingDir) {
          const srcPath = path.join(defaultVsCodeExtDir, matchingDir);
          
          const targets = [
            path.join(os.homedir(), '.evocode-ide', 'extensions', matchingDir),
            fs.existsSync(portableExtDir) ? path.join(portableExtDir, matchingDir) : null,
            fs.existsSync('/usr/share/evocode/resources/app/extensions') ? path.join('/usr/share/evocode/resources/app/extensions', matchingDir) : null
          ].filter(Boolean);

          for (const target of targets) {
            if (target && !fs.existsSync(target)) {
              try {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                execSync(`cp -aL "${srcPath}" "${target}"`, { stdio: 'pipe' });
                log(`  imported preview extension ${matchingDir} to ${target}`);
              } catch {
                // Ignore write failures for system directory if not root
              }
            }
          }
        }
      }
    } catch (e) {
      log(`  warn: failed to import default VS Code extensions: ${e.message}`);
    }
  }

  // Rebrand built-in media icons (vscode-icon.svg, code-icon.svg, sessions-logo-*)
  const evocodeLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="96" height="96">
  <path d="M8 6L3 12L8 18"/>
  <path d="M18 6c-3.5 0-6 2.5-6 6s2.5 6 6 6"/>
  <path d="M3 12h15"/>
</svg>\n`;

  const mediaDirs = [
    path.join(IDE_DIR, 'dist/evocode-ide/resources/app/out/media'),
    '/usr/share/evocode/resources/app/out/media'
  ];
  // Base64 SVGs for Activity Bar premium outline icons
  const SVGS = {
    explorer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    git: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 15V9a4 4 0 0 0-4-4H9"/><line x1="6" y1="9" x2="6" y2="15"/></svg>`,
    play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
    extensions: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
  };

  const toB64 = (s) => Buffer.from(s).toString('base64');

  const customIconCss = `
/* Evocode Premium Custom Icon Overrides */
.activitybar .codicon-files::before,
.activitybar .codicon-explorer-view-icon::before {
  content: "" !important;
  -webkit-mask: url('data:image/svg+xml;base64,${toB64(SVGS.explorer)}') no-repeat center / 20px 20px !important;
  mask: url('data:image/svg+xml;base64,${toB64(SVGS.explorer)}') no-repeat center / 20px 20px !important;
  background-color: currentColor !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-block !important;
}
.activitybar .codicon-search::before,
.activitybar .codicon-search-view-icon::before {
  content: "" !important;
  -webkit-mask: url('data:image/svg+xml;base64,${toB64(SVGS.search)}') no-repeat center / 20px 20px !important;
  mask: url('data:image/svg+xml;base64,${toB64(SVGS.search)}') no-repeat center / 20px 20px !important;
  background-color: currentColor !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-block !important;
}
.activitybar .codicon-source-control::before,
.activitybar .codicon-source-control-view-icon::before {
  content: "" !important;
  -webkit-mask: url('data:image/svg+xml;base64,${toB64(SVGS.git)}') no-repeat center / 20px 20px !important;
  mask: url('data:image/svg+xml;base64,${toB64(SVGS.git)}') no-repeat center / 20px 20px !important;
  background-color: currentColor !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-block !important;
}
.activitybar .codicon-debug-alt::before,
.activitybar .codicon-run-view-icon::before {
  content: "" !important;
  -webkit-mask: url('data:image/svg+xml;base64,${toB64(SVGS.play)}') no-repeat center / 20px 20px !important;
  mask: url('data:image/svg+xml;base64,${toB64(SVGS.play)}') no-repeat center / 20px 20px !important;
  background-color: currentColor !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-block !important;
}
.activitybar .codicon-extensions::before,
.activitybar .codicon-extensions-view-icon::before {
  content: "" !important;
  -webkit-mask: url('data:image/svg+xml;base64,${toB64(SVGS.extensions)}') no-repeat center / 20px 20px !important;
  mask: url('data:image/svg+xml;base64,${toB64(SVGS.extensions)}') no-repeat center / 20px 20px !important;
  background-color: currentColor !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-block !important;
}
.activitybar .codicon-settings-gear::before {
  content: "" !important;
  -webkit-mask: url('data:image/svg+xml;base64,${toB64(SVGS.settings)}') no-repeat center / 20px 20px !important;
  mask: url('data:image/svg+xml;base64,${toB64(SVGS.settings)}') no-repeat center / 20px 20px !important;
  background-color: currentColor !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-block !important;
}
`;

  const cssPaths = [
    path.join(IDE_DIR, 'dist/evocode-ide/resources/app/out/vs/workbench/workbench.desktop.main.css'),
    '/usr/share/evocode/resources/app/out/vs/workbench/workbench.desktop.main.css'
  ];

  for (const cPath of cssPaths) {
    if (fs.existsSync(cPath)) {
      try {
        let content = fs.readFileSync(cPath, 'utf8');
        const idx = content.indexOf('/* Evocode Premium Custom Icon Overrides */');
        if (idx !== -1) {
          content = content.substring(0, idx).trim();
        }
        const newContent = content + '\n' + customIconCss;
        fs.writeFileSync(cPath, newContent, 'utf8');
        log(`  appended custom icon CSS to ${cPath}`);

        // Update product.json checksum
        const cleanBuf = Buffer.from(newContent.replace(/\r\n/g, '\n'), 'utf8');
        const hash = crypto.createHash('sha256').update(cleanBuf).digest('base64').replace(/=+$/, '');
        
        const productJsonPath = path.join(path.dirname(cPath), '../../../product.json');
        if (fs.existsSync(productJsonPath)) {
          const product = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
          if (product.checksums && product.checksums['vs/workbench/workbench.desktop.main.css']) {
            product.checksums['vs/workbench/workbench.desktop.main.css'] = hash;
            fs.writeFileSync(productJsonPath, JSON.stringify(product, null, 2), 'utf8');
            log(`  patched product.json checksum for CSS to: ${hash} at ${productJsonPath}`);
          }
        }
      } catch (err) {
        log(`  warn: failed to patch CSS or product.json: ${err.message}`);
      }
    }
  }

  // Write premium minimalist file icon theme SVGs
  const fileIconSVGs = {
    'document-dark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e0e2ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    'folder-dark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b5cf6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    'folder-open-dark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b5cf6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14h14l4-8H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/></svg>`,
    'root-folder-dark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7f71f8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="2" fill="#7f71f8"/></svg>`,
    'root-folder-open-dark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7f71f8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14h14l4-8H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><circle cx="13" cy="15" r="2" fill="#7f71f8"/></svg>`,
    'document-light.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1f2328" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    'folder-light.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b5cf6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    'folder-open-light.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b5cf6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14h14l4-8H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/></svg>`,
    'root-folder-light.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7f71f8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="2" fill="#7f71f8"/></svg>`,
    'root-folder-open-light.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7f71f8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14h14l4-8H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><circle cx="13" cy="15" r="2" fill="#7f71f8"/></svg>`
  };

  const fileIconsDirs = [
    path.join(IDE_DIR, 'dist/evocode-ide/resources/app/extensions/theme-defaults/fileicons/images'),
    '/usr/share/evocode/resources/app/extensions/theme-defaults/fileicons/images'
  ];

  for (const dir of fileIconsDirs) {
    if (fs.existsSync(dir)) {
      try {
        for (const [filename, svg] of Object.entries(fileIconSVGs)) {
          fs.writeFileSync(path.join(dir, filename), svg, 'utf8');
        }
        log(`  applied premium minimalist file icons to ${dir}`);
      } catch (err) {
        log(`  warn: failed to write file icons to ${dir}: ${err.message}`);
      }
    }
  }

  // Overwrite default VSCodium letterpress watermark background SVGs with Evocode branding
  const letterpressSVGs = {
    'letterpress-dark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" fill="none" stroke="#B2B2B2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.16"><path d="M8 6L3 12L8 18"/><path d="M18 6c-3.5 0-6 2.5-6 6s2.5 6 6 6"/><path d="M3 12h15"/></svg>`,
    'letterpress-hcDark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" fill="none" stroke="#B2B2B2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.16"><path d="M8 6L3 12L8 18"/><path d="M18 6c-3.5 0-6 2.5-6 6s2.5 6 6 6"/><path d="M3 12h15"/></svg>`,
    'letterpress-light.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" fill="none" stroke="#333333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.16"><path d="M8 6L3 12L8 18"/><path d="M18 6c-3.5 0-6 2.5-6 6s2.5 6 6 6"/><path d="M3 12h15"/></svg>`,
    'letterpress-hcLight.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" fill="none" stroke="#333333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.16"><path d="M8 6L3 12L8 18"/><path d="M18 6c-3.5 0-6 2.5-6 6s2.5 6 6 6"/><path d="M3 12h15"/></svg>`
  };

  const letterpressDirs = [
    path.join(IDE_DIR, 'dist/evocode-ide/resources/app/out/media'),
    '/usr/share/evocode/resources/app/out/media'
  ];

  for (const dir of letterpressDirs) {
    if (fs.existsSync(dir)) {
      try {
        for (const [filename, svg] of Object.entries(letterpressSVGs)) {
          fs.writeFileSync(path.join(dir, filename), svg, 'utf8');
        }
        log(`  applied premium Evocode letterpress watermark SVGs to ${dir}`);
      } catch (err) {
        log(`  warn: failed to write letterpress SVGs to ${dir}: ${err.message}`);
      }
    }
  }

  writeInstallRecord(manifest, installs);

  log('');
  log('Done. Extension preinstalled:');
  log(`  id: ${manifest.extensionId}`);
  log(`  sidebar: «Эвокод»`);
  log(`  defaults: provider=evocode model=evocode-auto`);
  log('');
  log('Next:');
  log('  npm run ide:verify-preinstall');
  log('  # smoke without full IDE build:');
  log('  code --extensions-dir ~/.evocode-ide/extensions <workspace>');
  log('  # or: npm run agent:launch  (dev host still works)');
  log('');
  log('After VSCodium prepare_vscode: re-run this script to hook system extensions.');
}

main();
