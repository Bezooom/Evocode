#!/usr/bin/env node
/**
 * Prepare ~/.evocode-ide user profile (settings + keybindings + shell extension install).
 * Demo slice: Antigravity-like simple UI + first-class agent bootstrap.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDE_DIR = path.resolve(__dirname, '..');
const ROOT = path.resolve(IDE_DIR, '../..');
const SHELL_DIR = path.join(IDE_DIR, 'shell');
const PROFILE = process.env.EVOCODE_USER_DATA_DIR || path.join(os.homedir(), '.evocode-ide');
const EXT_DIR = process.env.EVOCODE_EXTENSIONS_DIR || path.join(PROFILE, 'extensions');

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function mergeSettings(targetPath, defaultsPath) {
  const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
  let existing = {};
  if (fs.existsSync(targetPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch {
      existing = {};
    }
  }
  // defaults win for known shell keys; keep unknown user keys
  const forceKeys = new Set(Object.keys(defaults));
  const merged = { ...existing };
  for (const k of forceKeys) merged[k] = defaults[k];
  // remove duplicate workbench.startupEditor if any weirdness
  writeJson(targetPath, merged);
}

function installShellExtension() {
  const src = path.join(SHELL_DIR, 'extension');
  const pkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
  const folder = `${pkg.publisher}.${pkg.name}-${pkg.version}`;
  fs.mkdirSync(EXT_DIR, { recursive: true });
  // remove old versions
  for (const ent of fs.readdirSync(EXT_DIR)) {
    if (ent.startsWith(`${pkg.publisher}.${pkg.name}-`)) {
      fs.rmSync(path.join(EXT_DIR, ent), { recursive: true, force: true });
    }
  }
  const dest = path.join(EXT_DIR, folder);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  return dest;
}

function main() {
  console.log('=== Эвокод: prepare shell profile ===');
  console.log('  profile:   ', PROFILE);
  console.log('  extensions:', EXT_DIR);

  const userDir = path.join(PROFILE, 'User');
  fs.mkdirSync(userDir, { recursive: true });

  mergeSettings(path.join(userDir, 'settings.json'), path.join(SHELL_DIR, 'settings.json'));
  cp(path.join(SHELL_DIR, 'keybindings.json'), path.join(userDir, 'keybindings.json'));

  // UI language → Russian (VS Code reads locale.json)
  writeJson(path.join(userDir, 'locale.json'), { locale: 'ru' });
  // argv-level locale for some builds
  writeJson(path.join(PROFILE, 'argv.json'), {
    locale: 'ru',
    'disable-hardware-acceleration': false,
  });

  // product.json marker (informational for some builds)
  writeJson(path.join(PROFILE, 'evocode-profile.json'), {
    name: 'Эвокод',
    kind: 'demo-shell-p0-runtime',
    locale: 'ru',
    preparedAt: new Date().toISOString(),
    root: ROOT,
    note: 'user-data-dir profile for launch-evocode-dev.sh · runtime models UI',
  });

  // Russian language pack (optional — needs network once)
  try {
    const editors = ['code', 'codium', 'cursor'];
    let installed = false;
    for (const ed of editors) {
      try {
        execSync('command -v ' + ed, { stdio: 'ignore' });
        console.log(`  language pack: ${ed} --install-extension MS-CEINTL.vscode-language-pack-ru`);
        execSync(
          `${ed} --user-data-dir "${PROFILE}" --extensions-dir "${EXT_DIR}" --install-extension MS-CEINTL.vscode-language-pack-ru --force`,
          { stdio: 'inherit', timeout: 120000 },
        );
        installed = true;
        break;
      } catch {
        /* try next editor */
      }
    }
    if (!installed) {
      console.warn(
        '  warn: не удалось поставить vscode-language-pack-ru — поставьте вручную в Extensions: Russian Language Pack',
      );
    }
  } catch (e) {
    console.warn('  warn: language pack:', e.message);
  }

  const shellExt = installShellExtension();
  console.log('  shell ext: ', shellExt);

  // ensure agent preinstalled into same extensions dir
  try {
    execSync('node packages/ide/scripts/preinstall-agent.mjs --target "' + EXT_DIR + '"', {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (e) {
    console.warn('  warn: agent preinstall failed — run npm run agent:rebrand && npm run ide:preinstall-agent');
  }

  // VS Code extensions.json index (both shell + agent)
  try {
    const entries = [];
    for (const ent of fs.readdirSync(EXT_DIR)) {
      const full = path.join(EXT_DIR, ent);
      const pkgPath = path.join(full, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;
      const meta = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const eid = `${meta.publisher}.${meta.name}`;
      entries.push({
        identifier: { id: eid },
        version: meta.version,
        location: { $mid: 1, path: fs.realpathSync(full), scheme: 'file' },
        relativeLocation: ent,
      });
    }
    writeJson(path.join(EXT_DIR, 'extensions.json'), entries);
    console.log(
      '  extensions.json:',
      entries.map((e) => e.identifier.id).join(', '),
    );
  } catch (e) {
    console.warn('  warn: extensions.json:', e.message);
  }

  console.log('OK. Launch with:');
  console.log(`  npm run evocode`);
  console.log(`  # or: code --user-data-dir "${PROFILE}" --extensions-dir "${EXT_DIR}"`);
}

main();
