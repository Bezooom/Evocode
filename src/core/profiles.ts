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

export function loadProfiles(): ProfilesFile | null {
  for (const get of CANDIDATES) {
    const p = get();
    if (!p) continue;
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as ProfilesFile;
      return expandFile(raw);
    }
  }
  return null;
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
