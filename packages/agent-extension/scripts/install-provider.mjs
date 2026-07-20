#!/usr/bin/env node
/**
 * Install Evocode Core provider into **isolated** agent config (default).
 * Does NOT touch ~/.config/kilo unless EVOCODE_TOUCH_KILO=1.
 *
 * Canonical:
 *   EVOCODE_CONFIG_DIR=~/.config/evocode/agent
 *   file: evocode.json  (+ shadow kilo.json for agent runtime)
 *   EVOCODE_DATA_DIR=~/.local/share/evocode
 *
 * Env aliases (compat): KILO_CONFIG_DIR, KILO_DATA_DIR
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  agentConfigDir,
  agentDataDir,
  canonicalAgentConfigPath,
  compatKiloConfigPath,
  readAgentConfig,
  writeAgentConfig,
  migrateLegacyIsolatedConfig,
} = require('../lib/agent-config-paths.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_CANDIDATES = [
  path.join(PKG_ROOT, 'config/evocode.agent.json'),
  path.join(PKG_ROOT, 'config/kilo.evocode.json'), // legacy name
];

const CORE_URL = process.env.EVOCODE_CORE_URL || 'http://127.0.0.1:8083/v1';
const TOUCH_KILO = process.env.EVOCODE_TOUCH_KILO === '1';

function resolveTemplatePath() {
  for (const p of TEMPLATE_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Missing config/evocode.agent.json');
}

function loadJson(p, fallback = {}) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    console.warn(`Cannot parse ${p}:`, e.message);
    return fallback;
  }
}

function deepMerge(base, over) {
  if (Array.isArray(over)) return over.slice();
  if (over && typeof over === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
    const out = { ...base };
    for (const k of Object.keys(over)) {
      if (k.startsWith('_')) continue;
      out[k] = deepMerge(base[k], over[k]);
    }
    return out;
  }
  return over === undefined ? base : over;
}

async function pingCore(baseUrl) {
  const health = baseUrl.replace(/\/v1\/?$/, '') + '/health';
  try {
    const res = await fetch(health, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json();
    return { ok: true, body };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('=== Эвокод: install-provider (isolated config) ===');

  // Optional escape hatch: write into stock Kilo (not recommended)
  if (TOUCH_KILO) {
    process.env.EVOCODE_CONFIG_DIR = path.join(os.homedir(), '.config', 'kilo');
    process.env.EVOCODE_DATA_DIR = path.join(os.homedir(), '.local', 'share', 'kilo');
    console.warn('⚠️  EVOCODE_TOUCH_KILO=1 — пишем в ~/.config/kilo (осторожно!)');
  }

  const migrated = migrateLegacyIsolatedConfig();
  if (migrated) {
    console.log('Migrated legacy config →', migrated);
  }

  const CONFIG_DIR = agentConfigDir();
  const CONFIG_FILE = canonicalAgentConfigPath();
  const AUTH_DIR = agentDataDir();
  const AUTH_FILE = path.join(AUTH_DIR, 'auth.json');

  console.log('Config dir:', CONFIG_DIR);
  console.log('Config file:', CONFIG_FILE);
  console.log('Data dir:  ', AUTH_DIR);
  console.log('Core URL:  ', CORE_URL);
  if (!TOUCH_KILO) {
    console.log('✓ не трогаем ~/.config/kilo (обычный Kilo/VS Code в безопасности)');
  }

  const template = loadJson(resolveTemplatePath());
  if (template.provider?.evocode?.options) {
    template.provider.evocode.options.baseURL = CORE_URL;
  }

  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const existing = readAgentConfig();
  if (fs.existsSync(CONFIG_FILE) || fs.existsSync(compatKiloConfigPath())) {
    const bakBase = CONFIG_FILE + `.bak-${new Date().toISOString().slice(0, 10)}`;
    if (!fs.existsSync(bakBase)) {
      try {
        fs.copyFileSync(resolveExistingOrEmpty(CONFIG_FILE), bakBase);
        console.log('Backup:', bakBase);
      } catch {
        /* */
      }
    }
  }

  const merged = deepMerge(existing, {
    model: template.model,
    small_model: template.small_model,
    enabled_providers: template.enabled_providers,
    disabled_providers: template.disabled_providers,
    provider: {
      ...(existing.provider || {}),
      ...template.provider,
    },
  });

  const skillPaths = new Set([
    ...((existing.skills && existing.skills.paths) || []),
    ...((template.skills && template.skills.paths) || []),
  ]);
  if (skillPaths.size) {
    merged.skills = { ...(existing.skills || {}), ...(template.skills || {}), paths: [...skillPaths] };
  }

  const { primary, shadow } = writeAgentConfig(merged);
  console.log('Wrote', primary);
  console.log('Shadow', shadow, '(agent runtime compat)');

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const auth = loadJson(AUTH_FILE, {});
  auth.evocode = {
    type: 'api',
    key: process.env.EVOCODE_API_KEY || 'evocode-local',
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2) + '\n');
  console.log('Auth entry: evocode →', AUTH_FILE);

  const overlayPath = path.join(CONFIG_DIR, 'evocode-provider.json');
  fs.writeFileSync(overlayPath, JSON.stringify(template, null, 2) + '\n');

  const ping = await pingCore(CORE_URL);
  if (ping.ok) {
    console.log('✅ Core health OK');
  } else {
    console.warn('⚠️  Core не отвечает — npm start в Evocode');
  }

  console.log('Default model: evocode/evocode-auto');
  console.log('Launcher must set:');
  console.log('  EVOCODE_CONFIG_DIR=' + CONFIG_DIR);
  console.log('  EVOCODE_DATA_DIR=' + AUTH_DIR);
  console.log('  (compat) KILO_CONFIG_DIR=' + CONFIG_DIR);
  console.log('  (compat) KILO_DATA_DIR=' + AUTH_DIR);
}

function resolveExistingOrEmpty(preferred) {
  if (fs.existsSync(preferred)) return preferred;
  const shadow = compatKiloConfigPath();
  if (fs.existsSync(shadow)) return shadow;
  return preferred;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
