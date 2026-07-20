// Конфигурация приложения Эвокод (Core — privacy brain для IDE-форка)
export type RuntimeMode = 'strict' | 'degraded';

export interface EvocodeConfig {
  appName: string;
  appVersion: string;
  language: string;
  /** strict: ошибки наружу; degraded: явные error-ответы, без фейкового «успеха» */
  mode: RuntimeMode;

  inference: {
    local: {
      enabled: boolean;
      model: string;
      nPredict: number;
      /** таймаут HTTP-запроса к llama-server, секунды */
      timeout: number;
      /** таймаут старта llama-server, секунды */
      startupTimeout: number;
      port: number;
      host: string;
      binary: string;
    };
    /** Лёгкая модель для FIM / autocomplete (dual-model, Neurocontrol-class) */
    fim: {
      enabled: boolean;
      model: string;
      /** short id for OpenAI clients: evocode-fim */
      modelId: string;
      port: number;
      host: string;
      /** profiles.json key, default fim-small */
      profileId: string;
    };
    cloud: {
      provider: string;
      model: string;
      apiKey: string;
      baseUrl: string;
      proxyUrl?: string;
    };
  };

  skills: {
    systemPath: string;
    userPath: string;
    backupPath: string;
    archivePath: string;
    /** Макс. символов skills в system prompt (глобальный budget inject) */
    maxInjectChars: number;
    /** Сколько skills активировать за запрос (Router v2 default 2) */
    maxSkills: number;
    /** Жёсткий cap на core одного skill */
    maxSkillCoreChars: number;
    /** lab/offensive skills в auto-route */
    enableLab: boolean;
    /** Включённые pack id; пусто = все non-lab */
    enabledPacks: string[];
    /** v1 = legacy bag-of-words; v2 = Skill Router */
    routerVersion: 'v1' | 'v2';
    /** Минимальный score для auto-activate */
    minScore: number;
    /** Кэш индекса (относительно cwd) */
    indexPath: string;
    /** Hybrid embed rank (M4) */
    useEmbeddings: boolean;
    /** Max points from cosine similarity (0..embedWeight) */
    embedWeight: number;
    /** Min cosine to apply embed boost / rescue */
    embedMinCosine: number;
    /** SQLite path for skill vectors */
    embeddingsDbPath: string;
    /** hash = offline deterministic; inference = llama embed endpoint when available */
    embedBackend: 'hash' | 'inference';
  };

  sync: {
    enabled: boolean;
    interval: number;
    sources: SyncSource[];
  };

  dlp: {
    enabled: boolean;
    /** true = блокировать cloud-запрос при критичных находках */
    blockOnCritical: boolean;
    rules: DLPRule[];
  };

  router: {
    enabled: boolean;
    /** Макс. оценка размера контекста (токены) для local-first simple/medium */
    localMaxTokens: number;
    /** Порог токенов, выше которого — cloud (если complex/medium) */
    cloudMinTokens: number;
    /** always-local | auto | always-cloud */
    privacyMode: 'always-local' | 'auto' | 'always-cloud';
    preferKiloIndexing: boolean;
  };
  security: {
    authToken: string;
  };
}

export interface SyncSource {
  name: string;
  url: string;
  path: string;
  branch: string;
  type: 'github';
}

export interface DLPRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
  critical?: boolean;
}

function env(name: string, fallback: string): string {
  return process.env[name] && process.env[name]!.length > 0
    ? process.env[name]!
    : fallback;
}

export const defaultConfig: EvocodeConfig = {
  appName: 'Эвокод',
  appVersion: '0.95.0',
  language: 'ru',
  mode: (env('EVOCODE_MODE', 'strict') as RuntimeMode) === 'degraded' ? 'degraded' : 'strict',

  inference: {
    local: {
      enabled: true,
      // Абсолютный путь по умолчанию — без копии в Evocode/
      model: env(
        'LLAMA_MODEL',
        '/home/bezoom/llama.cpp/models/ornith-1.0-35b-Q4_K.gguf'
      ),
      nPredict: 8192,
      timeout: 600,
      startupTimeout: 90,
      // Chat llama-server (как start_ik_ai_coder) — :8080
      port: Number(env('LLAMA_PORT', '8080')),
      host: env('LLAMA_HOST', 'http://127.0.0.1'),
      binary: env(
        'LLAMA_BINARY',
        '/home/bezoom/ik_llama.cpp/build/bin/llama-server'
      ),
    },
    fim: {
      // dual-model: лёгкий FIM/autocomplete (Neurocontrol ~2G) на :8082
      enabled: env('LLAMA_FIM_ENABLED', 'true') === 'true',
      model: env(
        'LLAMA_FIM_MODEL',
        '/home/bezoom/storage/Projects/Neurocontrol/models/Qwen1.5B-Instruct-Upscale-3.5B.Q4_K_M.gguf'
      ),
      /** short OpenAI model id for clients (autocomplete) */
      modelId: env('LLAMA_FIM_MODEL_ID', 'evocode-fim'),
      port: Number(env('LLAMA_FIM_PORT', '8082')),
      host: env('LLAMA_FIM_HOST', 'http://127.0.0.1'),
      profileId: env('EVOCODE_FIM_PROFILE', 'fim-small'),
    },
    cloud: {
      provider: 'openrouter',
      model: env('OPENROUTER_MODEL', 'anthropic/claude-sonnet-4'),
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
      proxyUrl: env('EVOCODE_PROXY_URL', ''),
    },
  },

  skills: {
    systemPath: 'skills/system',
    userPath: 'skills/user',
    backupPath: 'skills/.backup',
    archivePath: 'skills/.archive',
    maxInjectChars: Number(env('EVOCODE_SKILLS_MAX_INJECT', '8000')),
    maxSkills: Number(env('EVOCODE_SKILLS_MAX', '2')),
    maxSkillCoreChars: Number(env('EVOCODE_SKILLS_CORE_CHARS', '4000')),
    enableLab: env('EVOCODE_SKILLS_ALLOW_LAB', 'false') === 'true',
    enabledPacks: env(
      'EVOCODE_SKILLS_PACKS',
      'evocode-core,dev-frontend,dev-backend,security,docs,devops,agent,data,general'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    routerVersion: env('EVOCODE_SKILL_ROUTER', 'v2') === 'v1' ? 'v1' : 'v2',
    minScore: Number(env('EVOCODE_SKILLS_MIN_SCORE', '15')),
    indexPath: env('EVOCODE_SKILLS_INDEX', '.evocode/skills-index.json'),
    useEmbeddings: env('EVOCODE_SKILLS_EMBED', 'true') === 'true',
    embedWeight: Number(env('EVOCODE_SKILLS_EMBED_WEIGHT', '40')),
    embedMinCosine: Number(env('EVOCODE_SKILLS_EMBED_MIN', '0.18')),
    embeddingsDbPath: env('EVOCODE_SKILLS_EMBED_DB', '.evocode/skills-embeddings.db'),
    embedBackend: env('EVOCODE_SKILLS_EMBED_BACKEND', 'hash') === 'inference' ? 'inference' : 'hash',
  },

  sync: {
    enabled: env('SKILL_SYNC_ENABLED', 'true') === 'true',
    interval: 86_400_000,
    sources: [
      {
        name: 'evocode-skills',
        url: 'https://github.com/evocode/skills',
        path: 'skills/',
        branch: 'main',
        type: 'github',
      },
      {
        name: 'kilocode-skills',
        url: 'https://github.com/kilocode/skills',
        path: 'skills/',
        branch: 'main',
        type: 'github',
      },
    ],
  },

  dlp: {
    enabled: true,
    blockOnCritical: true,
    rules: [
      {
        name: 'api-key',
        pattern: /api[_-]?key[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
        replacement: 'api_key: "[REDACTED_API_KEY]"',
        description: 'Маскировка API-ключей',
        critical: true,
      },
      {
        name: 'token',
        pattern: /(?:bearer\s+|token[:=]\s*["']?)([a-zA-Z0-9._-]{20,})/gi,
        replacement: '[REDACTED_TOKEN]',
        description: 'Маскировка токенов',
        critical: true,
      },
      {
        name: 'password',
        pattern: /password[:=]\s*["']?([^\s"']{8,})["']?/gi,
        replacement: 'password: "[REDACTED_PASSWORD]"',
        description: 'Маскировка паролей',
        critical: true,
      },
      {
        name: 'secret',
        pattern: /secret[:=]\s*["']?([^\s"']{10,})["']?/gi,
        replacement: 'secret: "[REDACTED_SECRET]"',
        description: 'Маскировка секретов',
        critical: true,
      },
      {
        name: 'private-key',
        pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
        replacement: '[REDACTED_PRIVATE_KEY]',
        description: 'Маскировка PEM private keys',
        critical: true,
      },
      {
        name: 'jwt',
        pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
        replacement: '[REDACTED_JWT]',
        description: 'Маскировка JWT',
        critical: true,
      },
    ],
  },

  router: {
    enabled: true,
    /** ~400 tokens — мелкие правки остаются local */
    localMaxTokens: 400,
    /** > 3000 tokens — склоняем к cloud при complex */
    cloudMinTokens: 3000,
    privacyMode: 'auto',
    preferKiloIndexing: true,
  },
  security: {
    authToken: env('EVOCODE_AUTH_TOKEN', ''),
  },
};

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const v = override[key];
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof RegExp) &&
      base[key] &&
      typeof base[key] === 'object'
    ) {
      out[key as string] = deepMerge(
        base[key] as Record<string, unknown>,
        v as Record<string, unknown>
      );
    } else if (v !== undefined) {
      out[key as string] = v;
    }
  }
  return out as T;
}

export async function loadConfig(path: string): Promise<EvocodeConfig> {
  const fs = await import('fs');
  const pathModule = await import('path');

  const configPath = pathModule.resolve(path);
  const content = fs.readFileSync(configPath, 'utf-8');
  const partial = JSON.parse(content) as Partial<EvocodeConfig>;
  return deepMerge(defaultConfig as unknown as Record<string, unknown>, partial as Record<string, unknown>) as unknown as EvocodeConfig;
}

export function saveConfig(config: EvocodeConfig): void {
  const fs = require('fs');
  const pathModule = require('path');
  const dir = pathModule.join(process.cwd(), '.evocode');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(
    pathModule.join(dir, 'config.json'),
    JSON.stringify(
      {
        inference: {
          cloud: config.inference.cloud,
        },
        router: {
          privacyMode: config.router.privacyMode,
          localMaxTokens: config.router.localMaxTokens,
          cloudMinTokens: config.router.cloudMinTokens,
        },
        skills: {
          maxInjectChars: config.skills.maxInjectChars,
          maxSkills: config.skills.maxSkills,
          maxSkillCoreChars: config.skills.maxSkillCoreChars,
          enableLab: config.skills.enableLab,
          enabledPacks: config.skills.enabledPacks,
          routerVersion: config.skills.routerVersion,
          minScore: config.skills.minScore,
          useEmbeddings: config.skills.useEmbeddings,
          embedBackend: config.skills.embedBackend,
          embedWeight: config.skills.embedWeight,
        },
        fim: {
          enabled: config.inference.fim.enabled,
          port: config.inference.fim.port,
          modelId: config.inference.fim.modelId,
          profileId: config.inference.fim.profileId,
        },
      },
      null,
      2
    ),
    { encoding: 'utf-8', mode: 0o600 }
  );
}

export function initConfig(): void {
  const fs = require('fs');
  const pathModule = require('path');
  const filePath = pathModule.join(process.cwd(), '.evocode', 'config.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data.inference?.cloud) {
        Object.assign(defaultConfig.inference.cloud, data.inference.cloud);
      }
      if (data.router) {
        Object.assign(defaultConfig.router, data.router);
      }
      if (data.skills) {
        if (data.skills.enableLab !== undefined) defaultConfig.skills.enableLab = !!data.skills.enableLab;
        if (Array.isArray(data.skills.enabledPacks)) {
          defaultConfig.skills.enabledPacks = data.skills.enabledPacks.map(String);
        }
        if (data.skills.maxSkills !== undefined) {
          defaultConfig.skills.maxSkills = Number(data.skills.maxSkills) || defaultConfig.skills.maxSkills;
        }
        if (data.skills.maxInjectChars !== undefined) {
          defaultConfig.skills.maxInjectChars =
            Number(data.skills.maxInjectChars) || defaultConfig.skills.maxInjectChars;
        }
        if (data.skills.minScore !== undefined) {
          defaultConfig.skills.minScore = Number(data.skills.minScore) || defaultConfig.skills.minScore;
        }
        if (data.skills.routerVersion === 'v1' || data.skills.routerVersion === 'v2') {
          defaultConfig.skills.routerVersion = data.skills.routerVersion;
        }
      }
      if (data.fim) {
        if (data.fim.enabled !== undefined) defaultConfig.inference.fim.enabled = !!data.fim.enabled;
        if (data.fim.port !== undefined) defaultConfig.inference.fim.port = Number(data.fim.port) || 8082;
        if (data.fim.modelId) defaultConfig.inference.fim.modelId = String(data.fim.modelId);
        if (data.fim.profileId) defaultConfig.inference.fim.profileId = String(data.fim.profileId);
      }
      console.log('✅ Конфигурация загружена из .evocode/config.json');
    } catch (e) {
      console.error('⚠️ Ошибка загрузки .evocode/config.json:', e);
    }
  }
}

