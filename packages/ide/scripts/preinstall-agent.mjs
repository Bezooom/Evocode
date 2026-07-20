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

  for (const mDir of mediaDirs) {
    if (fs.existsSync(mDir)) {
      try {
        const targets = [
          'vscode-icon.svg',
          'code-icon.svg',
          'sessions-logo-dark.svg',
          'sessions-logo-light.svg'
        ];
        for (const t of targets) {
          fs.writeFileSync(path.join(mDir, t), evocodeLogoSvg);
        }
        log(`  rebranded media icons in ${mDir}`);
      } catch (err) {
        log(`  warn: failed to rebrand media icons in ${mDir}: ${err.message}`);
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
