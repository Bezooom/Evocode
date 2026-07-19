#!/usr/bin/env node
/**
 * Install Evocode Core provider into **isolated** config (default).
 * Does NOT touch ~/.config/kilo unless EVOCODE_TOUCH_KILO=1.
 *
 * Default:
 *   KILO_CONFIG_DIR=~/.config/evocode/kilo
 *   KILO_DATA_DIR=~/.local/share/evocode
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(PKG_ROOT, 'config/kilo.evocode.json');

const CORE_URL = process.env.EVOCODE_CORE_URL || 'http://127.0.0.1:8083/v1';
const TOUCH_KILO = process.env.EVOCODE_TOUCH_KILO === '1';

const CONFIG_DIR =
  process.env.KILO_CONFIG_DIR ||
  (TOUCH_KILO
    ? path.join(os.homedir(), '.config', 'kilo')
    : path.join(os.homedir(), '.config', 'evocode', 'kilo'));

const CONFIG_FILE = path.join(CONFIG_DIR, 'kilo.json');
const AUTH_DIR =
  process.env.KILO_DATA_DIR ||
  (TOUCH_KILO
    ? path.join(os.homedir(), '.local', 'share', 'kilo')
    : path.join(os.homedir(), '.local', 'share', 'evocode'));
const AUTH_FILE = path.join(AUTH_DIR, 'auth.json');

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
  console.log('Config dir:', CONFIG_DIR);
  console.log('Data dir:  ', AUTH_DIR);
  console.log('Core URL:  ', CORE_URL);
  if (TOUCH_KILO) {
    console.warn('⚠️  EVOCODE_TOUCH_KILO=1 — пишем в ~/.config/kilo (осторожно!)');
  } else {
    console.log('✓ не трогаем ~/.config/kilo (обычный Kilo/VS Code в безопасности)');
  }

  const template = loadJson(TEMPLATE);
  if (template.provider?.evocode?.options) {
    template.provider.evocode.options.baseURL = CORE_URL;
  }

  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const existing = loadJson(CONFIG_FILE, {});
  if (fs.existsSync(CONFIG_FILE)) {
    const bak = CONFIG_FILE + `.bak-${new Date().toISOString().slice(0, 10)}`;
    if (!fs.existsSync(bak)) {
      fs.copyFileSync(CONFIG_FILE, bak);
      console.log('Backup:', bak);
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

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n');
  console.log('Wrote', CONFIG_FILE);

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
  console.log('  KILO_CONFIG_DIR=' + CONFIG_DIR);
  console.log('  KILO_DATA_DIR=' + AUTH_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
