/**
 * Hardware probe + model profile recommendations (foundation for v1.0).
 * Pure Node + optional nvidia-smi — no heavy deps.
 */
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { promisify } from 'util';

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
  recommendations: HardwareRecommendations;
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
      { timeout: 3000 }
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

export function recommendForHardware(input: {
  logicalCores: number;
  totalMb: number;
  gpus: GpuInfo[];
}): HardwareRecommendations {
  const maxVram = input.gpus.reduce((m, g) => Math.max(m, g.vramMb), 0);
  const tier = classifyTier(input.logicalCores, input.totalMb, maxVram);
  // Leave headroom for IDE + dual CPU models
  const cpuThreads = Math.max(4, Math.min(16, Math.floor(input.logicalCores / 2)));
  const notes: string[] = [];
  const tunables: HardwareRecommendations['tunables'] = [
    { key: '-t / --threads (FIM+embed)', value: cpuThreads, why: 'CPU inference; not all logical cores (bandwidth)' },
    { key: '-ngl chat', value: maxVram > 0 ? 99 : 0, why: 'GPU layers for chat if VRAM allows' },
    { key: '-ngl FIM/embed', value: 0, why: 'Keep VRAM for chat 35B when dual-model' },
  ];

  let chatClass = '7–14B Q4 CPU/GPU';
  let chatCtxHint = 8192;
  let suggestedProfiles = ['coder'];
  let secondaryOnCpu = true;

  if (tier === 'beast' || maxVram >= 22000) {
    chatClass = '30–35B Q4 on GPU (ornith / similar), optional ctx 128k–262k with quantized KV';
    chatCtxHint = 131072;
    suggestedProfiles = ['coder', 'chat-buun', 'fim-small', 'embed-nomic'];
    notes.push('24GB+ VRAM: dedicate GPU to chat; run FIM+embed on CPU (-ngl 0).');
    notes.push('Large ctx (262k) needs free VRAM — do not put embed/FIM on GPU.');
    tunables.push({ key: '--ctx-size chat', value: 131072, why: 'Start conservative; raise if VRAM free' });
    tunables.push({ key: '--reasoning-budget', value: 512, why: 'Thinking models eat max_tokens; avoid empty content' });
  } else if (tier === 'workstation' || maxVram >= 12000) {
    chatClass = '14–32B Q4_K on GPU, ctx 16k–64k';
    chatCtxHint = 32768;
    suggestedProfiles = ['coder', 'fim-small', 'embed-nomic'];
    notes.push('12–16GB VRAM: prefer fit-mode ik_llama or smaller ctx; dual CPU secondaries.');
    tunables.push({ key: '--ctx-size chat', value: 32768, why: 'Safer default on 12–16GB' });
  } else if (tier === 'dev') {
    chatClass = '7–14B Q4, or cloud for hard tasks';
    chatCtxHint = 16384;
    suggestedProfiles = ['fim-small', 'embed-nomic'];
    notes.push('Limited VRAM/RAM: use smaller chat GGUF; privacyMode=always-local only if model fits.');
  } else {
    chatClass = 'CPU-only small model (1–3B) or cloud';
    chatCtxHint = 8192;
    suggestedProfiles = ['fim-small'];
    secondaryOnCpu = true;
    notes.push('minimal: FIM-class models only locally; prefer attach to external server or cloud via DLP.');
  }

  notes.push(`Detected ~${input.logicalCores} logical CPUs → recommend -t ${cpuThreads} for CPU models (not all ${input.logicalCores}).`);
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

export async function probeHardware(): Promise<HardwareReport> {
  const logicalCores = os.cpus().length || 1;
  const memory = memMb();
  const gpus = await probeNvidia();
  const tier = classifyTier(
    logicalCores,
    memory.totalMb,
    gpus.reduce((m, g) => Math.max(m, g.vramMb), 0)
  );
  const recommendations = recommendForHardware({
    logicalCores,
    totalMb: memory.totalMb,
    gpus,
  });

  return {
    cpu: {
      model: readCpuModel(),
      logicalCores,
      physicalHint: Math.max(1, Math.floor(logicalCores / 2)),
    },
    memory,
    gpus,
    tier,
    recommendations,
    probedAt: new Date().toISOString(),
  };
}
