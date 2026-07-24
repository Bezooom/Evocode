/**
 * Hardware probe + model stack recommendations + apply profiles.local.
 * Pure Node + optional nvidia-smi — no heavy deps.
 */
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import {
  getCatalogModel,
  listCatalog,
  pickForTier,
  type CatalogModel,
} from './model-catalog';
import {
  expandPath,
  loadProfiles,
  profilesConfigDir,
  resolveModelsDir,
  type ProfilesFile,
  type RuntimeProfile,
  writeProfilesLocal,
} from './profiles';

const execFileAsync = promisify(execFile);

export type HardwareTier = 'minimal' | 'dev' | 'workstation' | 'beast';

export interface GpuInfo {
  name: string;
  vramMb: number;
  index: number;
}

export interface HardwareReport {
  cpu: {
    model: string;
    logicalCores: number;
    physicalHint: number;
  };
  memory: {
    totalMb: number;
    freeMb: number;
  };
  gpus: GpuInfo[];
  tier: HardwareTier;
  ports: Record<number, 'free' | 'busy' | 'unknown'>;
  recommendations: HardwareRecommendations;
  stack: ModelStackRecommendation;
  catalog: CatalogAvailability[];
  modelsDir: string;
  probedAt: string;
}

export interface HardwareRecommendations {
  /** Suggested chat model class */
  chatClass: string;
  /** Suggested max context for GPU chat (tokens, rough) */
  chatCtxHint: number;
  /** Threads for CPU-side FIM/embed (-t) */
  cpuThreads: number;
  /** Put FIM/embed on CPU to free VRAM for chat */
  secondaryOnCpu: boolean;
  /** Profile ids that usually fit */
  suggestedProfiles: string[];
  notes: string[];
  /** Tunable knobs operator can set in profiles.json */
  tunables: Array<{ key: string; value: string | number; why: string }>;
}

export interface StackSlot {
  role: 'chat' | 'fim' | 'embed';
  catalogId: string | null;
  profileId: string;
  name: string;
  filename: string | null;
  approxSizeGb: number;
  present: boolean;
  path: string | null;
  downloadable: boolean;
  reason: string;
}

export interface ModelStackRecommendation {
  tier: HardwareTier;
  chat: StackSlot;
  fim: StackSlot;
  embed: StackSlot;
  totalDownloadGb: number;
  missing: string[];
  notes: string[];
}

export interface CatalogAvailability {
  id: string;
  role: CatalogModel['role'];
  name: string;
  filename: string;
  approxSizeGb: number;
  minVramMb: number;
  tiers: HardwareTier[];
  present: boolean;
  path: string | null;
  recommended: boolean;
  description: string;
  profileId: string;
}

function readCpuModel(): string {
  try {
    const raw = fs.readFileSync('/proc/cpuinfo', 'utf-8');
    const m = raw.match(/model name\s*:\s*(.+)/);
    if (m) return m[1].trim();
  } catch {
    /* */
  }
  return os.cpus()[0]?.model || 'unknown';
}

function memMb(): { totalMb: number; freeMb: number } {
  const totalMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeMb = Math.round(os.freemem() / (1024 * 1024));
  return { totalMb, freeMb };
}

async function probeNvidia(): Promise<GpuInfo[]> {
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      ['--query-gpu=index,name,memory.total', '--format=csv,noheader,nounits'],
      { timeout: 3000 },
    );
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((s) => s.trim());
        return {
          index: Number(parts[0]) || 0,
          name: parts[1] || 'NVIDIA GPU',
          vramMb: Number(parts[2]) || 0,
        };
      });
  } catch {
    return [];
  }
}

function classifyTier(logicalCores: number, totalMb: number, maxVramMb: number): HardwareTier {
  if (maxVramMb >= 22000 && logicalCores >= 16 && totalMb >= 48000) return 'beast';
  if (maxVramMb >= 12000 && logicalCores >= 8 && totalMb >= 24000) return 'workstation';
  if (maxVramMb >= 6000 || (logicalCores >= 8 && totalMb >= 16000)) return 'dev';
  return 'minimal';
}

async function probePort(port: number): Promise<'free' | 'busy' | 'unknown'> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve('busy'));
    server.once('listening', () => {
      server.close(() => resolve('free'));
    });
    try {
      server.listen(port, '127.0.0.1');
    } catch {
      resolve('unknown');
    }
    setTimeout(() => {
      try {
        server.close();
      } catch {
        /* */
      }
      resolve('unknown');
    }, 800);
  });
}

export function recommendForHardware(input: {
  logicalCores: number;
  totalMb: number;
  gpus: GpuInfo[];
}): HardwareRecommendations {
  const maxVram = input.gpus.reduce((m, g) => Math.max(m, g.vramMb), 0);
  const tier = classifyTier(input.logicalCores, input.totalMb, maxVram);
  const cpuThreads = Math.max(4, Math.min(16, Math.floor(input.logicalCores / 2)));
  const notes: string[] = [];
  const tunables: HardwareRecommendations['tunables'] = [
    { key: '-t / --threads (FIM+embed)', value: cpuThreads, why: 'CPU inference; not all logical cores (bandwidth)' },
    { key: '-ngl chat', value: maxVram > 0 ? 99 : 0, why: 'GPU layers for chat if VRAM allows' },
    { key: '-ngl FIM/embed', value: 0, why: 'Keep VRAM for chat when dual-model' },
  ];

  let chatClass = '7–14B Q4 CPU/GPU';
  let chatCtxHint = 8192;
  let suggestedProfiles = ['coder'];
  let secondaryOnCpu = true;

  if (tier === 'beast' || maxVram >= 22000) {
    chatClass = '30–35B Q4 on GPU (or Qwen2.5-32B), optional ctx 64k–128k';
    chatCtxHint = 65536;
    suggestedProfiles = ['chat-32b', 'coder', 'fim-small', 'embed-nomic'];
    notes.push('24GB+ VRAM: dedicate GPU to chat; run FIM+embed on CPU (-ngl 0).');
    notes.push('Large ctx needs free VRAM — do not put embed/FIM on GPU.');
    tunables.push({ key: '--ctx-size chat', value: 65536, why: 'Start conservative; raise if VRAM free' });
    tunables.push({ key: '--reasoning-budget', value: 512, why: 'Thinking models eat max_tokens; avoid empty content' });
  } else if (tier === 'workstation' || maxVram >= 12000) {
    chatClass = '14–32B Q4_K on GPU, ctx 16k–64k';
    chatCtxHint = 32768;
    suggestedProfiles = ['chat-14b', 'fim-small', 'embed-nomic'];
    notes.push('12–16GB VRAM: prefer smaller ctx; dual CPU secondaries.');
    tunables.push({ key: '--ctx-size chat', value: 32768, why: 'Safer default on 12–16GB' });
  } else if (tier === 'dev') {
    chatClass = '7–14B Q4, or cloud for hard tasks';
    chatCtxHint = 16384;
    suggestedProfiles = ['chat-7b', 'fim-small', 'embed-nomic'];
    notes.push('Limited VRAM/RAM: use 7B Q4 chat; privacyMode=always-local only if model fits.');
  } else {
    chatClass = 'CPU-only small model (1–3B) or cloud';
    chatCtxHint = 8192;
    suggestedProfiles = ['chat-small', 'fim-small'];
    secondaryOnCpu = true;
    notes.push('minimal: small chat + FIM locally; prefer cloud via DLP for hard tasks.');
  }

  notes.push(
    `Detected ~${input.logicalCores} logical CPUs → recommend -t ${cpuThreads} for CPU models (not all ${input.logicalCores}).`,
  );
  if (input.gpus.length === 0) {
    notes.push('No NVIDIA GPU via nvidia-smi — chat defaults to CPU/remote.');
  }

  return {
    chatClass,
    chatCtxHint,
    cpuThreads,
    secondaryOnCpu,
    suggestedProfiles,
    notes,
    tunables,
  };
}

function modelPathOnDisk(modelsDir: string, filename: string): string {
  return path.join(modelsDir, filename);
}

function isPresent(modelsDir: string, filename: string): { present: boolean; path: string | null } {
  const p = modelPathOnDisk(modelsDir, filename);
  if (fs.existsSync(p)) return { present: true, path: p };
  // also check existing profile absolute paths
  const file = loadProfiles();
  if (file) {
    for (const prof of Object.values(file.profiles)) {
      if (prof.model.endsWith(filename) && fs.existsSync(prof.model)) {
        return { present: true, path: prof.model };
      }
    }
  }
  return { present: false, path: null };
}

function slotFromCatalog(
  role: 'chat' | 'fim' | 'embed',
  model: CatalogModel | null,
  modelsDir: string,
  fallbackProfileId: string,
  reason: string,
): StackSlot {
  if (!model) {
    return {
      role,
      catalogId: null,
      profileId: fallbackProfileId,
      name: '—',
      filename: null,
      approxSizeGb: 0,
      present: false,
      path: null,
      downloadable: false,
      reason,
    };
  }
  const { present, path: p } = isPresent(modelsDir, model.filename);
  return {
    role,
    catalogId: model.id,
    profileId: model.profileId,
    name: model.name,
    filename: model.filename,
    approxSizeGb: model.approxSizeGb,
    present,
    path: p,
    downloadable: Boolean(model.url),
    reason,
  };
}

/** Prefer an already-installed chat/fim/embed profile when GGUF is on disk. */
function preferInstalledProfile(
  role: 'chat' | 'fim' | 'embed',
  fallback: StackSlot,
  modelsDir: string,
): StackSlot {
  const file = loadProfiles();
  if (!file) return fallback;
  const preferredOrder =
    role === 'chat'
      ? [file.defaults.chatProfile, 'coder', 'chat-buun', 'chat-ornith', 'chat-32b', 'chat-14b', 'chat-7b']
      : role === 'fim'
        ? [file.defaults.fimProfile || 'fim-small', 'fim-small', 'fim-medium']
        : [file.defaults.embedProfile, 'embed-nomic'];

  const seen = new Set<string>();
  const candidates = [
    ...preferredOrder.filter(Boolean) as string[],
    ...Object.keys(file.profiles),
  ];
  for (const id of candidates) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const p = file.profiles[id];
    if (!p || p.role !== role) continue;
    if (!fs.existsSync(p.model)) continue;
    let sizeGb = 0;
    try {
      sizeGb = fs.statSync(p.model).size / (1024 ** 3);
    } catch {
      /* */
    }
    // skip empty stubs
    if (sizeGb < 0.01) continue;
    return {
      role,
      catalogId: fallback.catalogId, // keep download alt if user wants catalog
      profileId: id,
      name: p.description || path.basename(p.model),
      filename: path.basename(p.model),
      approxSizeGb: Math.round(sizeGb * 100) / 100,
      present: true,
      path: p.model,
      downloadable: Boolean(fallback.catalogId),
      reason: `Уже установлен профиль «${id}» (${sizeGb.toFixed(1)} GiB) — приоритет над каталогом`,
    };
  }
  return fallback;
}

export function buildModelStack(input: {
  tier: HardwareTier;
  logicalCores: number;
  totalMb: number;
  gpus: GpuInfo[];
  modelsDir: string;
}): ModelStackRecommendation {
  const maxVram = input.gpus.reduce((m, g) => Math.max(m, g.vramMb), 0);
  const chat = pickForTier('chat', input.tier, maxVram, input.totalMb);
  const fim = pickForTier('fim', input.tier, maxVram, input.totalMb);
  const embed = pickForTier('embed', input.tier, maxVram, input.totalMb);

  let chatSlot = slotFromCatalog(
    'chat',
    chat,
    input.modelsDir,
    'coder',
    chat ? `tier=${input.tier}, VRAM=${maxVram}MB` : 'no catalog fit',
  );
  let fimSlot = slotFromCatalog(
    'fim',
    fim,
    input.modelsDir,
    'fim-small',
    'CPU FIM keeps VRAM for chat',
  );
  let embedSlot = slotFromCatalog(
    'embed',
    embed,
    input.modelsDir,
    'embed-nomic',
    'CPU embeddings for router/RAG',
  );

  chatSlot = preferInstalledProfile('chat', chatSlot, input.modelsDir);
  fimSlot = preferInstalledProfile('fim', fimSlot, input.modelsDir);
  embedSlot = preferInstalledProfile('embed', embedSlot, input.modelsDir);

  const missing: string[] = [];
  let totalDownloadGb = 0;
  for (const s of [chatSlot, fimSlot, embedSlot]) {
    if (s.catalogId && !s.present) {
      missing.push(s.catalogId);
      totalDownloadGb += s.approxSizeGb;
    }
  }

  const notes: string[] = [
    `Рекомендуемый стек для tier «${input.tier}».`,
  ];
  if (input.tier === 'beast' || input.tier === 'workstation') {
    notes.push('Chat на GPU; FIM и embed — на CPU (-ngl 0).');
  }
  if (missing.length) {
    notes.push(`Не скачано: ${missing.join(', ')} (~${totalDownloadGb.toFixed(1)} GiB).`);
  } else {
    notes.push('Все рекомендованные GGUF уже на диске.');
  }

  return {
    tier: input.tier,
    chat: chatSlot,
    fim: fimSlot,
    embed: embedSlot,
    totalDownloadGb: Math.round(totalDownloadGb * 100) / 100,
    missing,
    notes,
  };
}

export function catalogWithAvailability(
  modelsDir: string,
  stack: ModelStackRecommendation,
): CatalogAvailability[] {
  const recommended = new Set(
    [stack.chat.catalogId, stack.fim.catalogId, stack.embed.catalogId].filter(Boolean) as string[],
  );
  return listCatalog().map((m) => {
    const { present, path: p } = isPresent(modelsDir, m.filename);
    return {
      id: m.id,
      role: m.role,
      name: m.name,
      filename: m.filename,
      approxSizeGb: m.approxSizeGb,
      minVramMb: m.minVramMb,
      tiers: m.tiers,
      present,
      path: p,
      recommended: recommended.has(m.id),
      description: m.description,
      profileId: m.profileId,
    };
  });
}

function defaultBinary(): string {
  const file = loadProfiles();
  // Prefer an existing profile's binary
  for (const id of ['coder', 'fim-small', 'embed-nomic']) {
    const p = file?.profiles[id];
    if (p?.binary && fs.existsSync(expandPath(p.binary))) return p.binary;
  }
  for (const p of Object.values(file?.profiles || {})) {
    if (p.binary && fs.existsSync(expandPath(p.binary))) return p.binary;
  }
  return '$HOME/llama.cpp/build/bin/llama-server';
}

function portForRole(role: 'chat' | 'fim' | 'embed'): number {
  if (role === 'chat') return 8080;
  if (role === 'fim') return 8082;
  return 8084;
}

function buildProfileFromCatalog(
  model: CatalogModel,
  modelsDir: string,
  rec: HardwareRecommendations,
): RuntimeProfile {
  const args = [...(model.defaultArgs || [])];
  // inject cpu threads for -t / --threads if present
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '-t' || args[i] === '--threads') && args[i + 1] != null) {
      args[i + 1] = String(rec.cpuThreads);
    }
  }
  if (model.role === 'chat') {
    // ensure ctx hint
    const ctxIdx = args.indexOf('--ctx-size');
    if (ctxIdx >= 0 && args[ctxIdx + 1]) {
      args[ctxIdx + 1] = String(rec.chatCtxHint);
    }
    if (rec.secondaryOnCpu === false) {
      /* chat keeps GPU */
    }
  }
  const relModel = path.join(modelsDir, model.filename);
  // store with $HOME-friendly path when under home
  let modelPath = relModel;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (home && relModel.startsWith(home)) {
    modelPath = path.join('$HOME', path.relative(home, relModel));
  }

  return {
    role: model.role,
    description: `${model.name} · auto from hardware stack`,
    binary: defaultBinary(),
    model: modelPath,
    port: portForRole(model.role),
    args,
  };
}

export interface ApplyStackResult {
  ok: boolean;
  path: string;
  defaults: ProfilesFile['defaults'];
  profilesWritten: string[];
  stack: ModelStackRecommendation;
  message: string;
}

/**
 * Write recommended stack into config/profiles.local.json (merge).
 * Does not download GGUF — only wires paths/args/defaults.
 */
export function applyRecommendedStackFromReport(
  report: HardwareReport,
  opts?: { modelsDir?: string },
): ApplyStackResult {
  const modelsDir = expandPath(opts?.modelsDir || report.modelsDir || resolveModelsDir());
  const stack = report.stack;
  const rec = report.recommendations;
  const profiles: Record<string, RuntimeProfile> = {};
  const profilesWritten: string[] = [];
  const existing = loadProfiles();

  for (const slot of [stack.chat, stack.fim, stack.embed]) {
    // Already installed local profile (e.g. ornith coder) — only pin defaults, don't rewrite path
    if (slot.present && existing?.profiles[slot.profileId]) {
      profilesWritten.push(slot.profileId);
      continue;
    }
    if (!slot.catalogId) continue;
    const cat = getCatalogModel(slot.catalogId);
    if (!cat) continue;
    // Use slot.profileId when catalog profileId differs after prefer-installed edge cases
    const profile = buildProfileFromCatalog(cat, modelsDir, rec);
    profiles[cat.profileId] = profile;
    profilesWritten.push(cat.profileId);
  }

  const defaults: ProfilesFile['defaults'] = {
    chatProfile: stack.chat.profileId,
    embedProfile: stack.embed.profileId,
    fimProfile: stack.fim.profileId,
    corePort: existing?.defaults.corePort ?? 8083,
    mode: existing?.defaults.mode === 'attach' ? 'attach' : 'spawn',
    autoStartFim: true,
  };

  const partial: Partial<ProfilesFile> = {
    modelsDir: (() => {
      const home = process.env.HOME || '';
      if (home && modelsDir.startsWith(home)) {
        return path.join('$HOME', path.relative(home, modelsDir));
      }
      return modelsDir;
    })(),
    defaults,
    profiles,
  };

  const outPath = writeProfilesLocal(partial);
  return {
    ok: true,
    path: outPath,
    defaults,
    profilesWritten,
    stack,
    message: `Стек tier=${stack.tier} → defaults chat=${defaults.chatProfile}, fim=${defaults.fimProfile}, embed=${defaults.embedProfile}. Файл: ${outPath}.`,
  };
}

export async function probeHardware(): Promise<HardwareReport> {
  const logicalCores = os.cpus().length || 1;
  const memory = memMb();
  const gpus = await probeNvidia();
  const maxVram = gpus.reduce((m, g) => Math.max(m, g.vramMb), 0);
  const tier = classifyTier(logicalCores, memory.totalMb, maxVram);
  const recommendations = recommendForHardware({
    logicalCores,
    totalMb: memory.totalMb,
    gpus,
  });
  const modelsDir = resolveModelsDir();
  const stack = buildModelStack({
    tier,
    logicalCores,
    totalMb: memory.totalMb,
    gpus,
    modelsDir,
  });
  const catalog = catalogWithAvailability(modelsDir, stack);

  const portList = [8080, 8082, 8083, 8084];
  const ports: Record<number, 'free' | 'busy' | 'unknown'> = {};
  await Promise.all(
    portList.map(async (p) => {
      ports[p] = await probePort(p);
    }),
  );

  return {
    cpu: {
      model: readCpuModel(),
      logicalCores,
      physicalHint: Math.max(1, Math.floor(logicalCores / 2)),
    },
    memory,
    gpus,
    tier,
    ports,
    recommendations,
    stack,
    catalog,
    modelsDir,
    probedAt: new Date().toISOString(),
  };
}

// re-export for tests
export { classifyTier, profilesConfigDir };
