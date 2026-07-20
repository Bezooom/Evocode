// Загрузка профилей local runtime (без копирования моделей)
import * as fs from 'fs';
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
}

const CANDIDATES = [
  path.resolve(process.cwd(), 'config/profiles.json'),
  path.resolve(__dirname, '../../config/profiles.json'),
  path.join(process.env.HOME || '', 'storage/Projects/Evocode/config/profiles.json'),
];

export function loadProfiles(): ProfilesFile | null {
  for (const p of CANDIDATES) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as ProfilesFile;
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
