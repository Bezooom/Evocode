/**
 * Isolated Эвокод agent config paths (never stock ~/.config/kilo).
 *
 * Canonical (user-facing):
 *   dir:  ~/.config/evocode/agent
 *   file: evocode.json
 *
 * Compat (agent runtime until fully de-Kilo'd):
 *   also accepts KILO_CONFIG_DIR / kilo.json
 *   dual-writes kilo.json next to evocode.json
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_BASENAMES = ['evocode.json', 'evocode.jsonc', 'kilo.json', 'kilo.jsonc'];

function home() {
  return os.homedir();
}

/** @returns {string} */
function agentConfigDir() {
  if (process.env.EVOCODE_CONFIG_DIR) return path.resolve(process.env.EVOCODE_CONFIG_DIR);
  if (process.env.KILO_CONFIG_DIR) return path.resolve(process.env.KILO_CONFIG_DIR);
  return path.join(home(), '.config', 'evocode', 'agent');
}

/** Legacy isolated path used before rebrand (~/.config/evocode/kilo). */
function legacyIsolatedConfigDir() {
  return path.join(home(), '.config', 'evocode', 'kilo');
}

/**
 * Resolve existing config file, or canonical write path.
 * Preference: EVOCODE_* env dir → new basenames → legacy basenames → legacy dir.
 * @returns {string}
 */
function resolveAgentConfigPath() {
  const dirs = [agentConfigDir(), legacyIsolatedConfigDir()];
  const seen = new Set();
  for (const dir of dirs) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    for (const name of CONFIG_BASENAMES) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return path.join(agentConfigDir(), 'evocode.json');
}

/** Canonical path we write to. */
function canonicalAgentConfigPath() {
  return path.join(agentConfigDir(), 'evocode.json');
}

/** Compat shadow for unpatched agent host that still opens kilo.json. */
function compatKiloConfigPath() {
  return path.join(agentConfigDir(), 'kilo.json');
}

function agentDataDir() {
  if (process.env.EVOCODE_DATA_DIR) return path.resolve(process.env.EVOCODE_DATA_DIR);
  if (process.env.KILO_DATA_DIR) return path.resolve(process.env.KILO_DATA_DIR);
  return path.join(home(), '.local', 'share', 'evocode');
}

/**
 * @param {string} [filePath]
 * @param {object} [fallback]
 */
function readAgentConfig(filePath, fallback = {}) {
  const p = filePath || resolveAgentConfigPath();
  try {
    if (!fs.existsSync(p)) return { ...fallback };
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { ...fallback };
  }
}

/**
 * Write canonical evocode.json + shadow kilo.json (same content).
 * Migrates from legacy path when needed.
 * @param {object} data
 * @returns {{ primary: string, shadow: string }}
 */
function writeAgentConfig(data) {
  const dir = agentConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  const primary = canonicalAgentConfigPath();
  const shadow = compatKiloConfigPath();
  const body = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(primary, body);
  // Shadow for agent builds that still list "kilo.json" only
  try {
    fs.writeFileSync(shadow, body);
  } catch {
    /* */
  }
  // If old isolated file exists and differs path — leave bak marker once
  const legacy = path.join(legacyIsolatedConfigDir(), 'kilo.json');
  if (legacy !== primary && fs.existsSync(legacy) && !fs.existsSync(legacy + '.migrated')) {
    try {
      fs.writeFileSync(legacy + '.migrated', `migrated → ${primary}\n`);
    } catch {
      /* */
    }
  }
  return { primary, shadow };
}

/**
 * Deep-merge patch into current config and write.
 * @param {object} patch
 */
function patchAgentConfig(patch) {
  const cur = readAgentConfig();
  const next = { ...cur, ...patch };
  if (patch.provider) {
    next.provider = { ...(cur.provider || {}), ...patch.provider };
  }
  if (patch.mcp) {
    next.mcp = patch.mcp;
  }
  writeAgentConfig(next);
  return next;
}

/**
 * One-shot migrate ~/.config/evocode/kilo/kilo.json → agent/evocode.json if needed.
 * @returns {string|null} path written or null
 */
function migrateLegacyIsolatedConfig() {
  const dest = canonicalAgentConfigPath();
  if (fs.existsSync(dest)) return null;
  const candidates = [
    path.join(legacyIsolatedConfigDir(), 'kilo.json'),
    path.join(legacyIsolatedConfigDir(), 'evocode.json'),
  ];
  for (const src of candidates) {
    if (!fs.existsSync(src)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(src, 'utf8'));
      writeAgentConfig(data);
      return dest;
    } catch {
      /* */
    }
  }
  return null;
}

module.exports = {
  CONFIG_BASENAMES,
  agentConfigDir,
  legacyIsolatedConfigDir,
  resolveAgentConfigPath,
  canonicalAgentConfigPath,
  compatKiloConfigPath,
  agentDataDir,
  readAgentConfig,
  writeAgentConfig,
  patchAgentConfig,
  migrateLegacyIsolatedConfig,
};
