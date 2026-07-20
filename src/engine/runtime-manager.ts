/**
 * P0 Runtime Manager — запуск/остановка local llama из Core (profiles.json).
 * Без копий GGUF: только spawn бинаря (ik_llama / buun) по абсолютным путям.
 */
import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadProfiles,
  profileExists,
  ProfilesFile,
  RuntimeProfile,
} from '../core/profiles';

export type ProfileRole = 'chat' | 'embed' | 'fim';

export interface ProfileView {
  id: string;
  role: ProfileRole;
  description: string;
  /** Человекочитаемое имя (RU) */
  label: string;
  /** Какой форк: ik_llama | buun | other */
  fork: string;
  port: number;
  binary: string;
  model: string;
  modelName: string;
  online: boolean;
  ready: { binary: boolean; model: boolean };
  active: boolean;
  pid: number | null;
  startScript?: string;
}

export interface RuntimeStatus {
  core: 'ok';
  localReady: boolean;
  activeChatProfile: string | null;
  activeEmbedProfile: string | null;
  profiles: ProfileView[];
  forks: Record<string, string>;
  modelsDir: string | null;
  message: string;
}

interface ProcRecord {
  pid: number;
  port: number;
  profileId: string;
  role: ProfileRole;
  startedAt: string;
  via: 'binary' | 'script';
}

interface StateFile {
  processes: Record<string, ProcRecord>;
  activeChatProfile: string | null;
  activeEmbedProfile: string | null;
}

const STATE_DIR = path.resolve(process.cwd(), '.evocode');
const STATE_PATH = path.join(STATE_DIR, 'runtime-state.json');
const LOG_DIR = path.join(STATE_DIR, 'logs');

const FORK_HINTS: Record<string, string> = {
  'ik_llama.cpp': 'ik_llama — основной chat/agent (fit, MTP, KV q4)',
  'buun-llama-cpp': 'buun — turbo KV / embeddings',
  'llama.cpp': 'vanilla llama.cpp',
};

function detectFork(binary: string): string {
  if (binary.includes('ik_llama')) return 'ik_llama';
  if (binary.includes('buun')) return 'buun';
  if (binary.includes('llama.cpp')) return 'llama.cpp';
  return 'other';
}

function labelFor(id: string, p: RuntimeProfile): string {
  const roleRu =
    p.role === 'chat'
      ? 'Чат / агент'
      : p.role === 'embed'
        ? 'Эмбеддинги'
        : 'FIM / autocomplete';
  const fork = detectFork(p.binary);
  const model = path.basename(p.model).replace(/\.gguf$/i, '');
  const short = model.length > 28 ? model.slice(0, 26) + '…' : model;
  if (p.role === 'fim' || id === 'fim-small') {
    return `${roleRu}: Neurocontrol ~2G · :${p.port}`;
  }
  return `${roleRu}: ${short} (${fork})`;
}

function emptyState(): StateFile {
  return { processes: {}, activeChatProfile: null, activeEmbedProfile: null };
}

function readState(): StateFile {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return { ...emptyState(), ...JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) };
    }
  } catch {
    /* ignore */
  }
  return emptyState();
}

function writeState(s: StateFile): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2) + '\n');
}

async function probePort(port: number): Promise<boolean> {
  const bases = [`http://127.0.0.1:${port}`];
  for (const base of bases) {
    try {
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(100) });
      if (r.ok) return true;
    } catch {
      /* */
    }
    try {
      const r = await fetch(`${base}/v1/models`, { signal: AbortSignal.timeout(100) });
      if (r.ok) return true;
    } catch {
      /* */
    }
  }
  return false;
}

function killPort(port: number): void {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore', timeout: 8000 });
  } catch {
    /* nothing on port */
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export class RuntimeManager {
  private children = new Map<string, ChildProcess>();

  private file(): ProfilesFile | null {
    return loadProfiles();
  }

  listProfileIds(): string[] {
    const f = this.file();
    return f ? Object.keys(f.profiles) : [];
  }

  getProfile(id: string): RuntimeProfile | null {
    return this.file()?.profiles[id] ?? null;
  }

  async buildProfileView(id: string, p: RuntimeProfile, state: StateFile): Promise<ProfileView> {
    const online = await probePort(p.port);
    const rec = state.processes[id];
    const pid = rec && isPidAlive(rec.pid) ? rec.pid : null;
    return {
      id,
      role: p.role,
      description: p.description || '',
      label: labelFor(id, p),
      fork: detectFork(p.binary),
      port: p.port,
      binary: p.binary,
      model: p.model,
      modelName: path.basename(p.model),
      online,
      ready: profileExists(p),
      active:
        (p.role === 'chat' && state.activeChatProfile === id) ||
        (p.role === 'embed' && state.activeEmbedProfile === id) ||
        online,
      pid,
      startScript: p.startScript,
    };
  }

  async getStatus(localReadyHint?: boolean): Promise<RuntimeStatus> {
    const file = this.file();
    const state = readState();
    const profiles: ProfileView[] = [];
    const portCache = new Map<number, boolean>();
    if (file) {
      for (const [id, p] of Object.entries(file.profiles)) {
        let online = portCache.get(p.port);
        if (online === undefined) {
          online = await probePort(p.port);
          portCache.set(p.port, online);
        }
        const rec = state.processes[id];
        const pid = rec && isPidAlive(rec.pid) ? rec.pid : null;
        profiles.push({
          id,
          role: p.role,
          description: p.description || '',
          label: labelFor(id, p),
          fork: detectFork(p.binary),
          port: p.port,
          binary: p.binary,
          model: p.model,
          modelName: path.basename(p.model),
          online,
          ready: profileExists(p),
          active:
            (p.role === 'chat' && state.activeChatProfile === id) ||
            (p.role === 'embed' && state.activeEmbedProfile === id) ||
            online,
          pid,
          startScript: p.startScript,
        });
      }
    }

    const chatOnline = profiles.find((x) => x.role === 'chat' && x.online);
    const localReady =
      typeof localReadyHint === 'boolean'
        ? localReadyHint || !!chatOnline
        : !!chatOnline;

    const forks: Record<string, string> = {};
    for (const p of profiles) {
      if (!forks[p.fork]) {
        forks[p.fork] =
          FORK_HINTS[
            p.binary.includes('ik_llama')
              ? 'ik_llama.cpp'
              : p.binary.includes('buun')
                ? 'buun-llama-cpp'
                : 'llama.cpp'
          ] || p.fork;
      }
    }

    return {
      core: 'ok',
      localReady,
      activeChatProfile: state.activeChatProfile,
      activeEmbedProfile: state.activeEmbedProfile,
      profiles,
      forks,
      modelsDir: file?.modelsDir ?? null,
      message: localReady
        ? 'Локальная модель отвечает'
        : 'Локальная модель не запущена — выберите профиль и нажмите «Запустить»',
    };
  }

  /**
   * Запуск профиля. Для chat на том же порту — останавливает предыдущий.
   */
  async start(
    profileId: string,
    opts: { force?: boolean; waitSec?: number } = {}
  ): Promise<{ ok: boolean; profile: ProfileView; message: string }> {
    const file = this.file();
    const p = file?.profiles[profileId];
    if (!p) {
      throw Object.assign(new Error(`Неизвестный профиль: ${profileId}`), {
        code: 'UNKNOWN_PROFILE',
      });
    }

    const ready = profileExists(p);
    if (!ready.binary) {
      throw Object.assign(new Error(`Бинарник не найден: ${p.binary}`), {
        code: 'BINARY_MISSING',
      });
    }
    if (!ready.model) {
      throw Object.assign(new Error(`Модель (GGUF) не найдена: ${p.model}`), {
        code: 'MODEL_MISSING',
      });
    }

    const waitSec = opts.waitSec ?? 90;
    const already = await probePort(p.port);
    if (already && !opts.force) {
      const state = readState();
      if (p.role === 'chat') state.activeChatProfile = profileId;
      if (p.role === 'embed') state.activeEmbedProfile = profileId;
      writeState(state);
      const view = await this.buildProfileView(profileId, p, state);
      return {
        ok: true,
        profile: view,
        message: `Уже запущено на :${p.port} (attach). Профиль «${profileId}» отмечен активным.`,
      };
    }

    // Освободить порт
    if (already || opts.force) {
      await this.stopByPort(p.port, profileId);
      await sleep(1500);
    }

    // Если другой chat-профиль активен на том же порту — снять
    const state = readState();
    for (const [id, rec] of Object.entries(state.processes)) {
      if (rec.port === p.port && id !== profileId) {
        await this.stop(id);
      }
    }

    fs.mkdirSync(LOG_DIR, { recursive: true });
    const logPath = path.join(LOG_DIR, `${profileId}.log`);
    const logFd = fs.openSync(logPath, 'a');

    let via: 'binary' | 'script' = 'binary';
    let child: ChildProcess;

    if (p.startScript && fs.existsSync(p.startScript) && p.role === 'chat') {
      via = 'script';
      // start scripts themselves fuser-kill 8080
      child = spawn('bash', [p.startScript], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env, GGML_TURBO_DECODE_NATIVE: '1' },
      });
    } else {
      const args = [
        '-m',
        p.model,
        '--port',
        String(p.port),
        '--host',
        '127.0.0.1',
        ...(p.args || []),
      ];
      child = spawn(p.binary, args, {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env, GGML_TURBO_DECODE_NATIVE: '1' },
      });
    }

    child.unref();
    this.children.set(profileId, child);
    try {
      fs.closeSync(logFd);
    } catch {
      /* */
    }

    const pid = child.pid ?? 0;
    const next = readState();
    next.processes[profileId] = {
      pid,
      port: p.port,
      profileId,
      role: p.role,
      startedAt: new Date().toISOString(),
      via,
    };
    if (p.role === 'chat') next.activeChatProfile = profileId;
    if (p.role === 'embed') next.activeEmbedProfile = profileId;
    writeState(next);

    // wait ready
    let online = false;
    for (let i = 0; i < waitSec; i++) {
      if (await probePort(p.port)) {
        online = true;
        break;
      }
      // process died early?
      if (pid && !isPidAlive(pid) && i > 3) {
        break;
      }
      await sleep(1000);
    }

    const view = await this.buildProfileView(profileId, p, readState());
    if (!online) {
      return {
        ok: false,
        profile: view,
        message:
          `Профиль «${profileId}» запущен (pid=${pid}), но порт :${p.port} ещё не отвечает. ` +
          `Смотрите лог: ${logPath}. Модели 27B+ греются 30–90 с.`,
      };
    }

    return {
      ok: true,
      profile: view,
      message: `Запущен «${view.label}» на :${p.port} (${view.fork}, ${via})`,
    };
  }

  async stop(profileId?: string): Promise<{ ok: boolean; message: string }> {
    const state = readState();
    if (!profileId) {
      // stop all tracked
      const ids = Object.keys(state.processes);
      for (const id of ids) {
        await this.stop(id);
      }
      // also free common ports
      for (const port of [8080, 8082, 8084]) {
        killPort(port);
      }
      const cleared = emptyState();
      writeState(cleared);
      return { ok: true, message: 'Все локальные runtime остановлены' };
    }

    const p = this.getProfile(profileId);
    const rec = state.processes[profileId];
    const port = rec?.port ?? p?.port;

    if (port) killPort(port);
    if (rec?.pid && isPidAlive(rec.pid)) {
      try {
        process.kill(rec.pid, 'SIGTERM');
      } catch {
        /* */
      }
    }
    const child = this.children.get(profileId);
    if (child && !child.killed) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* */
      }
    }
    this.children.delete(profileId);

    const next = readState();
    delete next.processes[profileId];
    if (next.activeChatProfile === profileId) next.activeChatProfile = null;
    if (next.activeEmbedProfile === profileId) next.activeEmbedProfile = null;
    writeState(next);

    await sleep(500);
    return {
      ok: true,
      message: port
        ? `Профиль «${profileId}» остановлен (порт :${port})`
        : `Профиль «${profileId}» снят с учёта`,
    };
  }

  private async stopByPort(port: number, exceptId?: string): Promise<void> {
    const state = readState();
    for (const [id, rec] of Object.entries(state.processes)) {
      if (rec.port === port && id !== exceptId) {
        await this.stop(id);
      }
    }
    killPort(port);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const runtimeManager = new RuntimeManager();
