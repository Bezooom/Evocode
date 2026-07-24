#!/usr/bin/env node
/**
 * Turn a plain/rebranded VSCodium portable tree into a full Эвокод product:
 *   - brand (product.json, icons, binaries)
 *   - built-in extensions: evocode-agent + evocode-shell
 *   - bundled Core: core/{dist,skills,package.json,node_modules?}
 *   - isolated launchers with EVOCODE_ROOT / user-data-dir
 *
 * Usage:
 *   node packages/ide/scripts/productize-portable-tree.mjs <portable-root> [--skip-rebrand] [--no-node-modules]
 *
 * Platform layouts:
 *   Linux/Windows: <root>/resources/app/...
 *   macOS:         <root>/Evocode.app/Contents/Resources/app/...  (or VSCodium.app before rebrand)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const IDE_DIR = path.resolve(__dirname, '..');
const AGENT_PKG = path.join(ROOT, 'packages/agent-extension');
const EXT_SRC = path.join(AGENT_PKG, 'extension');
const SHELL_SRC = path.join(IDE_DIR, 'shell/extension');
const STAGE_DIR = path.join(IDE_DIR, 'preinstall', 'evocode-agent');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const DEST = path.resolve(args[0] || path.join(IDE_DIR, 'dist/evocode-ide'));
const SKIP_REBRAND = flags.has('--skip-rebrand');
const NO_NODE_MODULES = flags.has('--no-node-modules');

function log(...m) {
  console.log(...m);
}
function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function cpAL(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  rmrf(dest);
  execSync(`cp -aL "${src}" "${dest}"`, { stdio: 'pipe' });
}

function ensureBuilt() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.js'))) {
    log('→ npm run build (Core dist missing)…');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  }
  const distJs = path.join(EXT_SRC, 'dist', 'extension.js');
  if (!fs.existsSync(distJs)) {
    fail(
      `missing ${distJs}\nRun agent rebrand/build first:\n  npm run agent:rebrand`,
    );
  }
  if (!fs.existsSync(path.join(EXT_SRC, 'package.json'))) {
    fail(`missing agent package.json at ${EXT_SRC}`);
  }
  if (!fs.existsSync(path.join(SHELL_SRC, 'package.json'))) {
    fail(`missing shell extension at ${SHELL_SRC}`);
  }
}

function resolveLayout(dest) {
  // After rebrand mac may be Evocode.app; before — VSCodium.app
  const candidates = [
    {
      appDir: path.join(dest, 'resources/app'),
      coreDir: path.join(dest, 'core'),
      platform: 'linux-or-win',
      appBundle: null,
    },
    {
      appDir: path.join(dest, 'Evocode.app/Contents/Resources/app'),
      coreDir: path.join(dest, 'Evocode.app/Contents/Resources/core'),
      platform: 'darwin',
      appBundle: path.join(dest, 'Evocode.app'),
    },
    {
      appDir: path.join(dest, 'VSCodium.app/Contents/Resources/app'),
      coreDir: path.join(dest, 'VSCodium.app/Contents/Resources/core'),
      platform: 'darwin-prerebrand',
      appBundle: path.join(dest, 'VSCodium.app'),
    },
    {
      appDir: path.join(dest, 'Contents/Resources/app'),
      coreDir: path.join(dest, 'Contents/Resources/core'),
      platform: 'darwin-flat',
      appBundle: dest,
    },
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c.appDir, 'product.json'))) {
      return c;
    }
  }
  return null;
}

function stageAgent() {
  log('→ stage evocode-agent (--copy, self-contained)…');
  execSync('node packages/ide/scripts/preinstall-agent.mjs --stage --copy', {
    cwd: ROOT,
    stdio: 'inherit',
  });
  const pkg = JSON.parse(fs.readFileSync(path.join(STAGE_DIR, 'package.json'), 'utf8'));
  if (pkg.name !== 'evocode-agent' || pkg.publisher !== 'evocode') {
    fail('staged agent is not rebranded');
  }
  if (!fs.existsSync(path.join(STAGE_DIR, 'dist', 'extension.js'))) {
    fail('staged agent missing dist/extension.js');
  }
  return pkg;
}

function installBuiltinExtensions(appDir) {
  const extDir = path.join(appDir, 'extensions');
  if (!fs.existsSync(extDir)) {
    fail(`extensions dir missing: ${extDir}`);
  }

  const agentDest = path.join(extDir, 'evocode-agent');
  log('→ install built-in extension: evocode-agent');
  cpAL(STAGE_DIR, agentDest);

  const shellDest = path.join(extDir, 'evocode-shell');
  log('→ install built-in extension: evocode-shell');
  cpAL(SHELL_SRC, shellDest);
  const brandIcon = path.join(
    ROOT,
    'packages/agent-extension/brand/icons/evocode-icon-256.png',
  );
  if (fs.existsSync(brandIcon)) {
    fs.copyFileSync(brandIcon, path.join(shellDest, 'icon.png'));
  }

  // Product recommendations so UI surfaces the agent
  const fragPath = path.join(IDE_DIR, 'preinstall', 'product-extensions.fragment.json');
  const productPath = path.join(appDir, 'product.json');
  if (fs.existsSync(productPath)) {
    const product = JSON.parse(fs.readFileSync(productPath, 'utf8'));
    const ids = ['evocode.evocode-agent', 'evocode.evocode-shell'];
    product.extensionRecommendations = Array.from(
      new Set([...(product.extensionRecommendations || []), ...ids]),
    );
    product.extensionPinned = Array.from(
      new Set([...(product.extensionPinned || []), ...ids]),
    );
    if (fs.existsSync(fragPath)) {
      try {
        const frag = JSON.parse(fs.readFileSync(fragPath, 'utf8'));
        if (Array.isArray(frag.extensionRecommendations)) {
          product.extensionRecommendations = Array.from(
            new Set([
              ...product.extensionRecommendations,
              ...frag.extensionRecommendations,
            ]),
          );
        }
      } catch {
        /* optional */
      }
    }
    fs.writeFileSync(productPath, JSON.stringify(product, null, 2) + '\n');
  }

  return { agentDest, shellDest };
}

function bundleCore(coreDir, { includeNodeModules }) {
  log(`→ bundle Core → ${coreDir}`);
  fs.mkdirSync(coreDir, { recursive: true });

  const distSrc = path.join(ROOT, 'dist');
  const skillsSrc = path.join(ROOT, 'skills');
  const pkgSrc = path.join(ROOT, 'package.json');

  rmrf(path.join(coreDir, 'dist'));
  execSync(`cp -a "${distSrc}" "${path.join(coreDir, 'dist')}"`, { stdio: 'pipe' });

  rmrf(path.join(coreDir, 'skills'));
  execSync(`cp -a "${skillsSrc}" "${path.join(coreDir, 'skills')}"`, { stdio: 'pipe' });

  fs.copyFileSync(pkgSrc, path.join(coreDir, 'package.json'));

  // Optional config templates
  const profiles = path.join(ROOT, 'config/profiles.json');
  if (fs.existsSync(profiles)) {
    fs.mkdirSync(path.join(coreDir, 'config'), { recursive: true });
    fs.copyFileSync(profiles, path.join(coreDir, 'config/profiles.json'));
  }

  if (includeNodeModules) {
    const nm = path.join(ROOT, 'node_modules');
    if (fs.existsSync(nm)) {
      log('→ copy node_modules (native modules match host OS — for same-OS packages)');
      rmrf(path.join(coreDir, 'node_modules'));
      execSync(`cp -a "${nm}" "${path.join(coreDir, 'node_modules')}"`, {
        stdio: 'pipe',
      });
    } else {
      log('  warn: root node_modules missing — Core will need npm ci on target');
    }
  } else {
    log('→ skip node_modules (cross-OS or --no-node-modules); include package.json for npm ci');
    // Lightweight install hint
    fs.writeFileSync(
      path.join(coreDir, 'README-CORE.txt'),
      [
        'Evocode Core (bundled without platform node_modules).',
        'On first use install native deps with system Node.js:',
        '  cd core && npm ci --omit=dev',
        'Or set EVOCODE_ROOT to a monorepo checkout with built dist/.',
        '',
      ].join('\n'),
    );
  }

  // Marker for smoke / packaging checks
  fs.writeFileSync(
    path.join(coreDir, 'EVOCODE-CORE.txt'),
    [
      'Evocode Core bundle',
      `bundledAt=${new Date().toISOString()}`,
      `includeNodeModules=${includeNodeModules}`,
      '',
    ].join('\n'),
  );
}

function writeLinuxLaunchers(dest, coreDir) {
  const binDir = path.join(dest, 'bin');
  if (!fs.existsSync(binDir)) return;

  // Keep real electron binary as codium; wrap evocode
  const wrapper = `#!/usr/bin/env bash
# Эвокод portable — branded VSCodium + agent + Core
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export EVOCODE_ROOT="\${EVOCODE_ROOT:-$ROOT/core}"
export EVOCODE_CONFIG_DIR="\${EVOCODE_CONFIG_DIR:-\${KILO_CONFIG_DIR:-\$HOME/.config/evocode/agent}}"
export EVOCODE_DATA_DIR="\${EVOCODE_DATA_DIR:-\${KILO_DATA_DIR:-\$HOME/.local/share/evocode}}"
export KILO_CONFIG_DIR="\${KILO_CONFIG_DIR:-\$EVOCODE_CONFIG_DIR}"
export KILO_DATA_DIR="\${KILO_DATA_DIR:-\$EVOCODE_DATA_DIR}"
export EVOCODE_USER_DATA_DIR="\${EVOCODE_USER_DATA_DIR:-\$HOME/.evocode-ide}"
export EVOCODE_EXTENSIONS_DIR="\${EVOCODE_EXTENSIONS_DIR:-\$EVOCODE_USER_DATA_DIR/extensions}"
mkdir -p "\$EVOCODE_USER_DATA_DIR" "\$EVOCODE_EXTENSIONS_DIR" "\$EVOCODE_CONFIG_DIR" "\$EVOCODE_DATA_DIR"
# Prefer system Node for Core sidecar (native addons); shell extension also respects this
export EVOCODE_NODE="\${EVOCODE_NODE:-$(command -v node 2>/dev/null || true)}"
exec "\${ROOT}/bin/codium" \\
  --user-data-dir="\$EVOCODE_USER_DATA_DIR" \\
  --extensions-dir="\$EVOCODE_EXTENSIONS_DIR" \\
  --disable-workspace-trust \\
  "\$@"
`;
  const evocodeSh = path.join(binDir, 'evocode');
  fs.writeFileSync(evocodeSh, wrapper);
  fs.chmodSync(evocodeSh, 0o755);

  const top = path.join(dest, 'evocode');
  fs.writeFileSync(
    top,
    `#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "\${ROOT}/bin/evocode" "\$@"
`,
  );
  fs.chmodSync(top, 0o755);
  log('→ wrote Linux launchers bin/evocode + ./evocode');
}

function writeWindowsLaunchers(dest) {
  const binDir = path.join(dest, 'bin');
  const cmdPath = path.join(binDir, 'evocode.cmd');
  if (!fs.existsSync(path.join(dest, 'Evocode.exe')) && !fs.existsSync(path.join(dest, 'Code.exe'))) {
    // may still write if bin exists after rebrand
  }
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  const content = `@echo off
setlocal
set "ROOT=%~dp0.."
if not defined EVOCODE_ROOT set "EVOCODE_ROOT=%ROOT%\\core"
if not defined EVOCODE_USER_DATA_DIR set "EVOCODE_USER_DATA_DIR=%USERPROFILE%\\.evocode-ide"
if not defined EVOCODE_EXTENSIONS_DIR set "EVOCODE_EXTENSIONS_DIR=%EVOCODE_USER_DATA_DIR%\\extensions"
if not defined EVOCODE_CONFIG_DIR set "EVOCODE_CONFIG_DIR=%APPDATA%\\evocode\\agent"
if not defined EVOCODE_DATA_DIR set "EVOCODE_DATA_DIR=%LOCALAPPDATA%\\evocode"
if not exist "%EVOCODE_USER_DATA_DIR%" mkdir "%EVOCODE_USER_DATA_DIR%"
if not exist "%EVOCODE_EXTENSIONS_DIR%" mkdir "%EVOCODE_EXTENSIONS_DIR%"
if exist "%ROOT%\\Evocode.exe" (
  start "" "%ROOT%\\Evocode.exe" --user-data-dir="%EVOCODE_USER_DATA_DIR%" --extensions-dir="%EVOCODE_EXTENSIONS_DIR%" --disable-workspace-trust %*
) else if exist "%ROOT%\\Code.exe" (
  start "" "%ROOT%\\Code.exe" --user-data-dir="%EVOCODE_USER_DATA_DIR%" --extensions-dir="%EVOCODE_EXTENSIONS_DIR%" --disable-workspace-trust %*
) else (
  echo Evocode.exe not found in %ROOT%
  exit /b 1
)
`;
  fs.writeFileSync(cmdPath, content);
  // top-level launcher
  fs.writeFileSync(
    path.join(dest, 'evocode.cmd'),
    `@echo off
call "%~dp0bin\\evocode.cmd" %*
`,
  );
  log('→ wrote Windows launchers bin/evocode.cmd + evocode.cmd');
}

function writeMacHelpers(dest, layout) {
  // product.json dataFolderName already isolates profile; add a CLI helper if Contents/MacOS exists
  if (!layout.appBundle) return;
  const macOSDir = path.join(layout.appBundle, 'Contents/MacOS');
  if (!fs.existsSync(macOSDir)) return;
  const helper = path.join(macOSDir, 'evocode-cli');
  const content = `#!/usr/bin/env bash
# CLI helper for Evocode.app
APP="$(cd "$(dirname "$0")/../.." && pwd)"
ROOT="$(cd "\${APP}/.." && pwd)"
export EVOCODE_ROOT="\${EVOCODE_ROOT:-\${APP}/Contents/Resources/core}"
export EVOCODE_USER_DATA_DIR="\${EVOCODE_USER_DATA_DIR:-\$HOME/.evocode-ide}"
export EVOCODE_EXTENSIONS_DIR="\${EVOCODE_EXTENSIONS_DIR:-\$EVOCODE_USER_DATA_DIR/extensions}"
mkdir -p "\$EVOCODE_USER_DATA_DIR" "\$EVOCODE_EXTENSIONS_DIR"
exec "\${APP}/Contents/MacOS/Evocode" \\
  --user-data-dir="\$EVOCODE_USER_DATA_DIR" \\
  --extensions-dir="\$EVOCODE_EXTENSIONS_DIR" \\
  --disable-workspace-trust \\
  "\$@"
`;
  fs.writeFileSync(helper, content);
  fs.chmodSync(helper, 0o755);
  log('→ wrote macOS CLI helper Contents/MacOS/evocode-cli');
}

function writeProductMarker(dest, meta) {
  fs.writeFileSync(
    path.join(dest, 'EVOCODE-PRODUCT.txt'),
    [
      'Evocode full product portable (not plain VSCodium)',
      `productizedAt=${new Date().toISOString()}`,
      `platform=${meta.platform}`,
      `agent=${meta.agentId}@${meta.agentVersion}`,
      `shell=evocode.evocode-shell`,
      `core=${meta.coreDir}`,
      `includeNodeModules=${meta.includeNodeModules}`,
      '',
      'Contains:',
      '  - branded IDE shell (Эвокод)',
      '  - built-in evocode-agent',
      '  - built-in evocode-shell (Core sidecar)',
      '  - bundled Core (dist + skills)',
      '',
    ].join('\n'),
  );
}

function isProductComplete(dest) {
  const layout = resolveLayout(dest);
  if (!layout) return false;
  const agent = path.join(layout.appDir, 'extensions/evocode-agent/package.json');
  const shell = path.join(layout.appDir, 'extensions/evocode-shell/package.json');
  const core = path.join(layout.coreDir, 'dist/index.js');
  const marker = path.join(dest, 'EVOCODE-PRODUCT.txt');
  return (
    fs.existsSync(agent) &&
    fs.existsSync(shell) &&
    fs.existsSync(core) &&
    fs.existsSync(marker)
  );
}

function main() {
  if (!fs.existsSync(DEST)) {
    fail(`portable tree missing: ${DEST}`);
  }

  if (flags.has('--check')) {
    const ok = isProductComplete(DEST);
    console.log(ok ? 'OK: full Evocode product' : 'INCOMPLETE: plain or partial tree');
    process.exit(ok ? 0 : 1);
  }

  log('=== Productize portable tree → full Эвокод ===');
  log('  dest:', DEST);
  ensureBuilt();

  if (!SKIP_REBRAND) {
    log('→ rebrand VSCodium → Эвокод…');
    execSync(`node packages/ide/scripts/rebrand-portable-codium.mjs "${DEST}"`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }

  let layout = resolveLayout(DEST);
  if (!layout) {
    fail(`could not resolve app layout under ${DEST}`);
  }
  log('  layout:', layout.platform, layout.appDir);

  const agentPkg = stageAgent();
  installBuiltinExtensions(layout.appDir);

  // node_modules only when packaging for the host OS (Linux builder → linux packages)
  const hostIsLinux = process.platform === 'linux';
  const looksLinux =
    layout.platform === 'linux-or-win' &&
    fs.existsSync(path.join(DEST, 'bin/codium')) &&
    !fs.existsSync(path.join(DEST, 'Evocode.exe'));
  const includeNodeModules =
    !NO_NODE_MODULES && hostIsLinux && looksLinux;

  bundleCore(layout.coreDir, { includeNodeModules });

  if (looksLinux) {
    writeLinuxLaunchers(DEST, layout.coreDir);
  } else if (
    fs.existsSync(path.join(DEST, 'Evocode.exe')) ||
    fs.existsSync(path.join(DEST, 'Code.exe')) ||
    fs.existsSync(path.join(DEST, 'VSCodium.exe'))
  ) {
    writeWindowsLaunchers(DEST);
  } else if (layout.platform.startsWith('darwin')) {
    writeMacHelpers(DEST, layout);
  }

  writeProductMarker(DEST, {
    platform: layout.platform,
    agentId: `${agentPkg.publisher}.${agentPkg.name}`,
    agentVersion: agentPkg.version,
    coreDir: layout.coreDir,
    includeNodeModules,
  });

  // Sanity
  if (!isProductComplete(DEST)) {
    fail('productize finished but completeness check failed');
  }

  log('');
  log('OK: full Evocode product at', DEST);
  log('  agent: ', path.join(layout.appDir, 'extensions/evocode-agent'));
  log('  shell: ', path.join(layout.appDir, 'extensions/evocode-shell'));
  log('  core:  ', layout.coreDir);
}

main();
