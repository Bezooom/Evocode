#!/usr/bin/env node
/**
 * Install Evocode Core as default Kilo/OpenCode provider into ~/.config/kilo
 * Merges with existing kilo.json without wiping user skills/MCP.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(PKG_ROOT, 'config/kilo.evocode.json');

const CORE_URL = process.env.EVOCODE_CORE_URL || 'http://127.0.0.1:8083/v1';
const CONFIG_DIR =
  process.env.KILO_CONFIG_DIR || path.join(os.homedir(), '.config', 'kilo');
const CONFIG_FILE = path.join(CONFIG_DIR, 'kilo.json');
const AUTH_DIR =
  process.env.KILO_DATA_DIR || path.join(os.homedir(), '.local', 'share', 'kilo');
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
  console.log('=== Эвокод F1: install-provider ===');
  console.log('Config dir:', CONFIG_DIR);
  console.log('Core URL:  ', CORE_URL);

  const template = loadJson(TEMPLATE);
  if (template.provider?.evocode?.options) {
    template.provider.evocode.options.baseURL = CORE_URL;
  }

  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const existing = loadJson(CONFIG_FILE, {});
  // Backup once per day
  if (fs.existsSync(CONFIG_FILE)) {
    const bak = CONFIG_FILE + `.bak-${new Date().toISOString().slice(0, 10)}`;
    if (!fs.existsSync(bak)) {
      fs.copyFileSync(CONFIG_FILE, bak);
      console.log('Backup:', bak);
    }
  }

  // Merge: template provider/model on top, keep skills/mcp from user if present
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

  // Skills paths: union
  const skillPaths = new Set([
    ...((existing.skills && existing.skills.paths) || []),
    ...((template.skills && template.skills.paths) || []),
  ]);
  if (skillPaths.size) {
    merged.skills = { ...(existing.skills || {}), ...(template.skills || {}), paths: [...skillPaths] };
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n');
  console.log('Wrote', CONFIG_FILE);

  // Auth entry for custom provider (CLI often expects auth.json key)
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const auth = loadJson(AUTH_FILE, {});
  auth.evocode = {
    type: 'api',
    key: process.env.EVOCODE_API_KEY || 'evocode-local',
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2) + '\n');
  console.log('Auth entry: evocode →', AUTH_FILE);

  // Also write a dedicated overlay for documentation / restore
  const overlayPath = path.join(CONFIG_DIR, 'evocode-provider.json');
  fs.writeFileSync(overlayPath, JSON.stringify(template, null, 2) + '\n');
  console.log('Overlay:  ', overlayPath);

  const ping = await pingCore(CORE_URL);
  if (ping.ok) {
    console.log('✅ Core health OK:', JSON.stringify(ping.body));
  } else {
    console.warn(
      '⚠️  Core не отвечает на',
      CORE_URL,
      '— запустите: cd Evocode && npm start'
    );
    if (ping.error) console.warn('   ', ping.error);
  }

  console.log('');
  console.log('Default model: evocode/evocode-auto');
  console.log('VS Code settings (optional):');
  console.log('  kilo-code.new.model.providerID = evocode');
  console.log('  kilo-code.new.model.modelID = evocode-auto');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
