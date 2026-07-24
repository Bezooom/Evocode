/**
 * Curated GGUF catalog for hardware-aware recommendations + optional download.
 * Direct HF resolve URLs — download only after explicit user consent.
 */
import type { HardwareTier } from './hardware';

export type ModelRole = 'chat' | 'fim' | 'embed';

export interface CatalogModel {
  id: string;
  role: ModelRole;
  name: string;
  filename: string;
  /** Approximate download size in GiB */
  approxSizeGb: number;
  /** 0 = runs on CPU */
  minVramMb: number;
  minRamMb: number;
  /** Tiers where this model is a primary suggestion */
  tiers: HardwareTier[];
  /** Direct download URL (Hugging Face resolve) */
  url: string;
  license?: string;
  description: string;
  /** Profile id written/updated on apply */
  profileId: string;
  /** Default llama-server args (merged with hardware tunables) */
  defaultArgs?: string[];
}

/** Stable curated set — prefer Q4_K_M for quality/size balance. */
export const MODEL_CATALOG: CatalogModel[] = [
  // ─── embed ───────────────────────────────────────────────────────────
  {
    id: 'nomic-embed-q4',
    role: 'embed',
    name: 'Nomic Embed Text v1.5 Q4',
    filename: 'nomic-embed-text-v1.5.Q4_K_M.gguf',
    approxSizeGb: 0.08,
    minVramMb: 0,
    minRamMb: 1024,
    tiers: ['minimal', 'dev', 'workstation', 'beast'],
    url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf',
    license: 'Apache-2.0',
    description: 'Embeddings для skill router / RAG. CPU (-ngl 0), ~80 MB.',
    profileId: 'embed-nomic',
    defaultArgs: [
      '-ngl',
      '0',
      '--embedding',
      '-t',
      '8',
      '-c',
      '8192',
      '--parallel',
      '2',
      '--host',
      '127.0.0.1',
    ],
  },
  // ─── FIM / autocomplete ──────────────────────────────────────────────
  {
    id: 'qwen25-coder-1.5b-q4',
    role: 'fim',
    name: 'Qwen2.5-Coder 1.5B Instruct Q4',
    filename: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    approxSizeGb: 1.1,
    minVramMb: 0,
    minRamMb: 4096,
    tiers: ['minimal', 'dev', 'workstation', 'beast'],
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    license: 'Apache-2.0',
    description: 'Лёгкий FIM/autocomplete (~1 GB). CPU, не занимает VRAM chat.',
    profileId: 'fim-small',
    defaultArgs: [
      '-ngl',
      '0',
      '-c',
      '8192',
      '-t',
      '8',
      '--jinja',
      '--no-warmup',
      '--host',
      '127.0.0.1',
    ],
  },
  {
    id: 'qwen25-coder-3b-q4',
    role: 'fim',
    name: 'Qwen2.5-Coder 3B Instruct Q4',
    filename: 'qwen2.5-coder-3b-instruct-q4_k_m.gguf',
    approxSizeGb: 2.0,
    minVramMb: 0,
    minRamMb: 6144,
    tiers: ['workstation', 'beast'],
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_k_m.gguf',
    license: 'Apache-2.0',
    description: 'Чуть сильнее FIM для workstation+, всё ещё CPU-friendly.',
    profileId: 'fim-medium',
    defaultArgs: [
      '-ngl',
      '0',
      '-c',
      '8192',
      '-t',
      '12',
      '--jinja',
      '--no-warmup',
      '--host',
      '127.0.0.1',
    ],
  },
  // ─── chat ────────────────────────────────────────────────────────────
  {
    id: 'qwen25-coder-1.5b-chat-q4',
    role: 'chat',
    name: 'Qwen2.5-Coder 1.5B (chat, CPU)',
    filename: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    approxSizeGb: 1.1,
    minVramMb: 0,
    minRamMb: 4096,
    tiers: ['minimal'],
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    license: 'Apache-2.0',
    description: 'Минимальный chat на CPU / слабом GPU. Для hard tasks — cloud.',
    profileId: 'chat-small',
    defaultArgs: [
      '-ngl',
      '0',
      '--ctx-size',
      '8192',
      '-t',
      '8',
      '--jinja',
      '--no-warmup',
      '--reasoning-budget',
      '256',
    ],
  },
  {
    id: 'qwen25-coder-7b-q4',
    role: 'chat',
    name: 'Qwen2.5-Coder 7B Instruct Q4',
    filename: 'qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    approxSizeGb: 4.7,
    minVramMb: 6000,
    minRamMb: 12000,
    tiers: ['dev'],
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    license: 'Apache-2.0',
    description: '7B coding chat для 6–12 GB VRAM. Хороший dev-default.',
    profileId: 'chat-7b',
    defaultArgs: [
      '-ngl',
      '99',
      '--ctx-size',
      '16384',
      '--jinja',
      '--no-warmup',
      '--reasoning-budget',
      '512',
    ],
  },
  {
    id: 'qwen25-coder-14b-q4',
    role: 'chat',
    name: 'Qwen2.5-Coder 14B Instruct Q4',
    filename: 'qwen2.5-coder-14b-instruct-q4_k_m.gguf',
    approxSizeGb: 9.0,
    minVramMb: 12000,
    minRamMb: 24000,
    tiers: ['workstation'],
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct-GGUF/resolve/main/qwen2.5-coder-14b-instruct-q4_k_m.gguf',
    license: 'Apache-2.0',
    description: '14B на 12–16 GB VRAM, ctx 16–32k. FIM/embed на CPU.',
    profileId: 'chat-14b',
    defaultArgs: [
      '-ngl',
      '99',
      '--ctx-size',
      '32768',
      '--jinja',
      '--no-warmup',
      '--reasoning-budget',
      '512',
    ],
  },
  {
    id: 'qwen25-32b-q4',
    role: 'chat',
    name: 'Qwen2.5 32B Instruct Q4',
    filename: 'qwen2.5-32b-instruct-q4_k_m.gguf',
    approxSizeGb: 19.0,
    minVramMb: 22000,
    minRamMb: 32000,
    tiers: ['beast'],
    url: 'https://huggingface.co/Qwen/Qwen2.5-32B-Instruct-GGUF/resolve/main/qwen2.5-32b-instruct-q4_k_m.gguf',
    license: 'Apache-2.0',
    description: '32B Q4 на 24 GB+ VRAM. FIM+embed строго на CPU.',
    profileId: 'chat-32b',
    defaultArgs: [
      '-ngl',
      '99',
      '--ctx-size',
      '65536',
      '--jinja',
      '--no-warmup',
      '--reasoning-budget',
      '512',
      '--parallel',
      '1',
    ],
  },
];

export function getCatalogModel(id: string): CatalogModel | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function listCatalog(role?: ModelRole): CatalogModel[] {
  if (!role) return [...MODEL_CATALOG];
  return MODEL_CATALOG.filter((m) => m.role === role);
}

export function pickForTier(
  role: ModelRole,
  tier: HardwareTier,
  maxVramMb: number,
  totalRamMb: number,
): CatalogModel | null {
  const candidates = MODEL_CATALOG.filter(
    (m) =>
      m.role === role &&
      m.minVramMb <= maxVramMb &&
      m.minRamMb <= totalRamMb + 4096, // soft: allow slight over if free later
  );
  // Prefer models that list this tier
  const preferred = candidates.filter((m) => m.tiers.includes(tier));
  const pool = preferred.length ? preferred : candidates;
  if (!pool.length) return null;
  // For chat: largest that still fits; for fim/embed: smallest suitable first preferred
  if (role === 'chat') {
    return pool.sort((a, b) => b.approxSizeGb - a.approxSizeGb)[0];
  }
  return pool.sort((a, b) => a.approxSizeGb - b.approxSizeGb)[0];
}
