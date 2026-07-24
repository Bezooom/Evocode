// Загрузка профилей local runtime (без копирования моделей).
// Пути поддерживают $HOME / ${HOME} / ~ и ${ENV_VAR}.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface RuntimeProfile {
  role: 'chat' | 'embed' | 'fim';
  description?: string;
  binary: string;
  model: string;
  port: number;
  startScript?: string;
  args?: string[];
}

export interface ProfilesFile {
  modelsDir: string;
  defaults: {
    chatProfile: string;
    embedProfile: string;
    fimProfile?: string;
    corePort: number;
    mode: 'attach' | 'spawn';
    autoStartFim?: boolean;
  };
  profiles: Record<string, RuntimeProfile>;
  keep?: {
    binaries?: string[];
    models?: string[];
  };
}

/** Expand ~, $VAR, ${VAR} in path-like strings. */
export function expandPath(input: string): string {
  if (!input) return input;
  let out = input.trim();
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir() || '';

  if (out === '~') return home;
  if (out.startsWith('~/') || out.startsWith('~\\')) {
    out = path.join(home, out.slice(2));
  }

  out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name: string) => {
    if (name === 'HOME' || name === 'USERPROFILE') return home;
    return process.env[name] ?? '';
  });
  out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, name: string) => {
    if (name === 'HOME' || name === 'USERPROFILE') return home;
    const v = process.env[name];
    return v !== undefined && v !== '' ? v : match;
  });

  return out;
}

function expandProfile(p: RuntimeProfile): RuntimeProfile {
  return {
    ...p,
    binary: expandPath(p.binary),
    model: expandPath(p.model),
    startScript: p.startScript ? expandPath(p.startScript) : undefined,
  };
}

function expandFile(file: ProfilesFile): ProfilesFile {
  const profiles: Record<string, RuntimeProfile> = {};
  for (const [id, p] of Object.entries(file.profiles || {})) {
    profiles[id] = expandProfile(p);
  }
  return {
    ...file,
    modelsDir: expandPath(file.modelsDir || ''),
    profiles,
    keep: file.keep
      ? {
          ...file.keep,
          binaries: (file.keep.binaries || []).map(expandPath),
        }
      : file.keep,
  };
}

const CANDIDATES = [
  () => path.resolve(process.cwd(), 'config/profiles.json'),
  () => path.resolve(__dirname, '../../config/profiles.json'),
  () =>
    process.env.EVOCODE_PROFILES
      ? expandPath(process.env.EVOCODE_PROFILES)
      : '',
  () =>
    process.env.EVOCODE_ROOT
      ? path.join(expandPath(process.env.EVOCODE_ROOT), 'config/profiles.json')
      : '',
];

function deepMergeProfiles(base: ProfilesFile, local: Partial<ProfilesFile>): ProfilesFile {
  return {
    ...base,
    ...local,
    modelsDir: local.modelsDir ?? base.modelsDir,
    defaults: { ...base.defaults, ...(local.defaults || {}) },
    profiles: { ...base.profiles, ...(local.profiles || {}) },
    keep: local.keep
      ? {
          binaries: local.keep.binaries ?? base.keep?.binaries,
          models: local.keep.models ?? base.keep?.models,
        }
      : base.keep,
  };
}

/** Directory that holds profiles.json (for writing profiles.local.json). */
export function profilesConfigDir(): string {
  for (const get of CANDIDATES) {
    const p = get();
    if (p && fs.existsSync(p)) return path.dirname(p);
  }
  // fallback monorepo / cwd
  if (process.env.EVOCODE_ROOT) {
    return path.join(expandPath(process.env.EVOCODE_ROOT), 'config');
  }
  return path.resolve(process.cwd(), 'config');
}

export function profilesLocalPath(): string {
  return path.join(profilesConfigDir(), 'profiles.local.json');
}

/** Expanded models directory from profiles (or default under $HOME). */
export function resolveModelsDir(override?: string): string {
  if (override) return expandPath(override);
  const file = loadProfilesRaw();
  if (file?.modelsDir) return expandPath(file.modelsDir);
  return expandPath('$HOME/llama.cpp/models');
}

function loadProfilesRaw(): ProfilesFile | null {
  for (const get of CANDIDATES) {
    const p = get();
    if (!p) continue;
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as ProfilesFile;
      const localPath = path.join(path.dirname(p), 'profiles.local.json');
      if (fs.existsSync(localPath)) {
        try {
          const local = JSON.parse(fs.readFileSync(localPath, 'utf-8')) as Partial<ProfilesFile>;
          return deepMergeProfiles(raw, local);
        } catch {
          return raw;
        }
      }
      return raw;
    }
  }
  // local-only install
  const localOnly = path.join(profilesConfigDir(), 'profiles.local.json');
  if (fs.existsSync(localOnly)) {
    try {
      return JSON.parse(fs.readFileSync(localOnly, 'utf-8')) as ProfilesFile;
    } catch {
      return null;
    }
  }
  return null;
}

export function loadProfiles(): ProfilesFile | null {
  const raw = loadProfilesRaw();
  return raw ? expandFile(raw) : null;
}

/**
 * Merge-write profiles.local.json next to profiles.json.
 * Does not overwrite profiles.json (operator source of truth).
 */
export function writeProfilesLocal(partial: Partial<ProfilesFile>): string {
  const dir = profilesConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'profiles.local.json');
  let existing: Partial<ProfilesFile> = {};
  if (fs.existsSync(dest)) {
    try {
      existing = JSON.parse(fs.readFileSync(dest, 'utf-8')) as Partial<ProfilesFile>;
    } catch {
      existing = {};
    }
  }
  const merged: Partial<ProfilesFile> = {
    ...existing,
    ...partial,
    defaults: { ...(existing.defaults || {} as ProfilesFile['defaults']), ...(partial.defaults || {}) },
    profiles: { ...(existing.profiles || {}), ...(partial.profiles || {}) },
  };
  // stamp
  (merged as { $comment?: string }).$comment =
    'Auto-written by Evocode hardware stack apply. Safe to edit. Merged over profiles.json.';
  fs.writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  return dest;
}

export function resolveChatProfile(name?: string): RuntimeProfile | null {
  const file = loadProfiles();
  if (!file) return null;
  const key = name || process.env.EVOCODE_CHAT_PROFILE || file.defaults.chatProfile;
  return file.profiles[key] || null;
}

export function listProfiles(): { id: string; profile: RuntimeProfile }[] {
  const file = loadProfiles();
  if (!file) return [];
  return Object.entries(file.profiles).map(([id, profile]) => ({ id, profile }));
}

export function resolveEmbedProfile(): RuntimeProfile | null {
  const file = loadProfiles();
  if (!file) return null;
  const key = process.env.EVOCODE_EMBED_PROFILE || file.defaults.embedProfile;
  return file.profiles[key] || null;
}

export function resolveFimProfile(name?: string): RuntimeProfile | null {
  const file = loadProfiles();
  if (!file) return null;
  const key =
    name ||
    process.env.EVOCODE_FIM_PROFILE ||
    file.defaults.fimProfile ||
    'fim-small';
  return file.profiles[key] || null;
}

export function profileExists(p: RuntimeProfile): { binary: boolean; model: boolean } {
  return {
    binary: fs.existsSync(p.binary),
    model: fs.existsSync(p.model),
  };
}
