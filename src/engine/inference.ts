// Inference Engine — attach-first к уже запущенному llama-server
// Профили: config/profiles.json (пути к бинарникам/GGUF без копий)
import { defaultConfig, EvocodeConfig } from '../core/config';
import {
  loadProfiles,
  profileExists,
  resolveChatProfile,
  resolveEmbedProfile,
  RuntimeProfile,
} from '../core/profiles';
import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';

export interface InferenceRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  messages?: { role: string; content: string }[];
}

export interface InferenceResponse {
  text: string;
  model: string;
  latency: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  source: 'local' | 'cloud' | 'local-fim';
}

export class InferenceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'LOCAL_UNAVAILABLE'
      | 'CLOUD_UNAVAILABLE'
      | 'EMBEDDING_FAILED'
      | 'STARTUP_FAILED',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'InferenceError';
  }
}

export class InferenceEngine {
  private config: EvocodeConfig;
  private localServerProcess: ChildProcess | null = null;
  private fimServerProcess: ChildProcess | null = null;
  private localReady = false;
  private chatProfile: RuntimeProfile | null;
  private embedProfile: RuntimeProfile | null;
  /** attach = не spawn, только HTTP; spawn = поднять через startScript или binary */
  private runtimeMode: 'attach' | 'spawn';

  constructor(config?: Partial<EvocodeConfig>) {
    this.config = config
      ? ({ ...defaultConfig, ...config } as EvocodeConfig)
      : defaultConfig;

    const profiles = loadProfiles();
    this.runtimeMode =
      (process.env.EVOCODE_LLAMA_MODE as 'attach' | 'spawn') ||
      profiles?.defaults.mode ||
      'attach';

    this.chatProfile = resolveChatProfile();
    this.embedProfile = resolveEmbedProfile();

    // Профиль перекрывает port/host/binary/model, если задан
    if (this.chatProfile) {
      this.config.inference.local.port = this.chatProfile.port;
      this.config.inference.local.binary = this.chatProfile.binary;
      this.config.inference.local.model = this.chatProfile.model;
    }
  }

  getConfig(): EvocodeConfig {
    return this.config;
  }

  isLocalReady(): boolean {
    return this.localReady;
  }

  getRuntimeInfo(): Record<string, unknown> {
    return {
      mode: this.runtimeMode,
      chatProfile: this.chatProfile
        ? {
            port: this.chatProfile.port,
            model: this.chatProfile.model,
            binary: this.chatProfile.binary,
            exists: profileExists(this.chatProfile),
          }
        : null,
      embedProfile: this.embedProfile
        ? {
            port: this.embedProfile.port,
            model: this.embedProfile.model,
            exists: profileExists(this.embedProfile),
          }
        : null,
      localReady: this.localReady,
    };
  }

  /** После RuntimeManager.start(chat) — переключить порт/модель и probe */
  bindChatProfile(profile: RuntimeProfile, online?: boolean): void {
    this.chatProfile = profile;
    this.config.inference.local.port = profile.port;
    this.config.inference.local.binary = profile.binary;
    this.config.inference.local.model = profile.model;
    if (typeof online === 'boolean') {
      this.localReady = online;
    }
  }

  bindEmbedProfile(profile: RuntimeProfile): void {
    this.embedProfile = profile;
  }

  async refreshLocalReady(): Promise<boolean> {
    this.localReady = await this.probe(this.chatBaseUrl());
    return this.localReady;
  }

  setLocalReady(v: boolean): void {
    this.localReady = v;
  }

  private chatBaseUrl(): string {
    const { host, port } = this.config.inference.local;
    return `${host}:${port}`;
  }

  private fimBaseUrl(): string {
    const { host, port } = this.config.inference.fim;
    // host may be "http://127.0.0.1" or "127.0.0.1"
    const h = host.includes('://') ? host : `http://${host}`;
    return `${h.replace(/\/$/, '')}:${port}`;
  }

  isFimEnabled(): boolean {
    return !!this.config.inference.fim.enabled;
  }

  async isFimReady(): Promise<boolean> {
    if (!this.config.inference.fim.enabled) return false;
    return this.probe(this.fimBaseUrl());
  }

  getFimInfo(): Record<string, unknown> {
    const f = this.config.inference.fim;
    return {
      enabled: f.enabled,
      modelId: f.modelId || 'evocode-fim',
      model: f.model,
      port: f.port,
      host: f.host,
      profileId: f.profileId || 'fim-small',
      baseUrl: this.fimBaseUrl(),
    };
  }

  private embedBaseUrl(): string {
    if (this.embedProfile) {
      return `http://127.0.0.1:${this.embedProfile.port}`;
    }
    return this.chatBaseUrl();
  }

  private async fetchJson(url: string, init: RequestInit, timeoutSec: number): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutSec * 1000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private async probe(url: string): Promise<boolean> {
    try {
      const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(100) });
      if (r.ok) return true;
    } catch {
      /* try models */
    }
    try {
      const r = await fetch(`${url}/v1/models`, { signal: AbortSignal.timeout(100) });
      return r.ok;
    } catch {
      return false;
    }
  }

  /**
   * Attach-first: если llama уже на порту — используем.
   * Spawn только при EVOCODE_LLAMA_MODE=spawn (вызов startScript или binary).
   * Никогда не копирует GGUF.
   */
  async startLocalServer(): Promise<void> {
    const { local } = this.config.inference;
    if (!local.enabled) {
      console.log('Локальный inference отключён');
      return;
    }

    if (await this.probe(this.chatBaseUrl())) {
      this.localReady = true;
      console.log(`✅ Attach: llama-server уже на ${this.chatBaseUrl()}`);
      this.logProfileHint();
      return;
    }

    if (this.runtimeMode === 'attach') {
      this.localReady = false;
      console.warn(
        `⚠️  Attach mode: llama-server не слушает ${this.chatBaseUrl()}.\n` +
          `   Запустите вручную, например:\n` +
          `     ${this.chatProfile?.startScript || '/home/bezoom/start_ik_ai_coder.sh'}\n` +
          `   или: EVOCODE_LLAMA_MODE=spawn npm start`
      );
      this.logProfileHint();
      return;
    }

    // spawn mode
    if (this.chatProfile?.startScript && fs.existsSync(this.chatProfile.startScript)) {
      console.log(`Spawn через startScript: ${this.chatProfile.startScript}`);
      await this.spawnScript(this.chatProfile.startScript);
    } else {
      await this.spawnBinary(this.chatProfile);
    }

    // wait ready
    for (let i = 0; i < local.startupTimeout; i++) {
      if (await this.probe(this.chatBaseUrl())) {
        this.localReady = true;
        console.log(`✅ llama-server ready ${this.chatBaseUrl()}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    this.localReady = false;
    console.warn(`⚠️  Таймаут готовности ${local.startupTimeout}s`);
  }

  private logProfileHint(): void {
    if (!this.chatProfile) return;
    const ex = profileExists(this.chatProfile);
    console.log(
      `   profile chat: port=${this.chatProfile.port} model=${ex.model ? 'OK' : 'MISSING'} binary=${ex.binary ? 'OK' : 'MISSING'}`
    );
    console.log(`   model path: ${this.chatProfile.model}`);
  }

  private spawnScript(script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [script], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
        env: { ...process.env, GGML_TURBO_DECODE_NATIVE: '1' },
      });
      this.localServerProcess = proc;
      proc.unref();
      proc.stdout?.on('data', (d) => console.log(`[startScript] ${d.toString().trim()}`));
      proc.stderr?.on('data', (d) => console.error(`[startScript] ${d.toString().trim()}`));
      proc.on('error', (e) => reject(new InferenceError(e.message, 'STARTUP_FAILED', e)));
      // скрипты сами ждут ready — даём старт
      setTimeout(() => resolve(), 2000);
    });
  }

  private spawnBinary(profile: RuntimeProfile | null): Promise<void> {
    const local = this.config.inference.local;
    const binary = profile?.binary || local.binary;
    const model = profile?.model || local.model;
    const port = profile?.port || local.port;
    const extra = profile?.args || [];

    if (!fs.existsSync(binary)) {
      return Promise.reject(
        new InferenceError(`binary not found: ${binary}`, 'STARTUP_FAILED')
      );
    }
    if (!fs.existsSync(model)) {
      return Promise.reject(
        new InferenceError(`model not found: ${model}`, 'STARTUP_FAILED')
      );
    }

    console.log(`Spawn ${binary} -m ${model} --port ${port}`);
    const args = ['-m', model, '--port', String(port), '--host', '127.0.0.1', ...extra];
    const proc = spawn(binary, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GGML_TURBO_DECODE_NATIVE: '1' },
    });
    this.localServerProcess = proc;
    proc.stdout?.on('data', (d) => console.log(`[llama] ${d.toString().trim()}`));
    proc.stderr?.on('data', (d) => console.error(`[llama] ${d.toString().trim()}`));
    proc.on('exit', () => {
      this.localServerProcess = null;
      this.localReady = false;
    });
    return Promise.resolve();
  }

  async stopLocalServer(): Promise<void> {
    // В attach mode не убиваем чужой llama-server
    if (this.runtimeMode === 'attach' && !this.localServerProcess) {
      console.log('Attach mode: stopLocalServer no-op (чужой процесс не трогаем)');
      this.localReady = false;
      return;
    }
    console.log('Остановка локального inference...');
    for (const proc of [this.localServerProcess, this.fimServerProcess]) {
      if (!proc) continue;
      proc.kill('SIGTERM');
    }
    await new Promise((r) => setTimeout(r, 500));
    for (const proc of [this.localServerProcess, this.fimServerProcess]) {
      if (proc && !proc.killed) proc.kill('SIGKILL');
    }
    this.localServerProcess = null;
    this.fimServerProcess = null;
    this.localReady = false;
  }

  async fim(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    const { local, fim } = this.config.inference;
    if (!fim.enabled) {
      throw new InferenceError(
        'FIM отключён (inference.fim.enabled=false / LLAMA_FIM_ENABLED=false)',
        'LOCAL_UNAVAILABLE'
      );
    }
    const url = `${this.fimBaseUrl()}/v1/completions`;
    // llama-server accepts path or any id; expose short id to clients
    const model = request.model || fim.modelId || fim.model;

    try {
      const data = await this.fetchJson(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: request.prompt,
            max_tokens: request.maxTokens || 256,
            temperature: request.temperature ?? 0.1,
            model: fim.model, // physical GGUF path/name for server
            stop: (request as any).stop,
          }),
        },
        Math.min(local.timeout, 120)
      );

      return {
        text: data.content || data.choices?.[0]?.text || '',
        model: fim.modelId || model,
        latency: Date.now() - startTime,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        source: 'local-fim',
      };
    } catch (error) {
      throw new InferenceError(
        `FIM недоступен (${this.fimBaseUrl()}): ${(error as Error).message}. Запустите профиль fim-small (порт ${fim.port}).`,
        'LOCAL_UNAVAILABLE',
        error
      );
    }
  }

  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    const { local } = this.config.inference;

    const messages =
      request.messages ||
      [
        ...(request.systemPrompt
          ? [{ role: 'system', content: request.systemPrompt }]
          : []),
        { role: 'user', content: request.prompt },
      ];

    // Fail fast if we already know local is down (avoid 600s hang → Core unresponsive)
    if (!this.localReady) {
      const up = await this.probe(this.chatBaseUrl());
      if (!up) {
        throw new InferenceError(
          `Локальный llama не на ${this.chatBaseUrl()}. Запустите coder / start_ik_*.sh`,
          'LOCAL_UNAVAILABLE'
        );
      }
      this.localReady = true;
    }

    try {
      const data = await this.fetchJson(
        `${this.chatBaseUrl()}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            max_tokens: request.maxTokens || local.nPredict,
            temperature: request.temperature ?? 0.7,
            model: request.model || local.model,
          }),
        },
        // Cap wait so Core event loop stays responsive for /health and IDE launch
        Math.min(local.timeout, 120)
      );

      return {
        text: data.choices?.[0]?.message?.content || '',
        model: request.model || local.model,
        latency: Date.now() - startTime,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        source: 'local',
      };
    } catch (error) {
      throw new InferenceError(
        `Локальный chat недоступен (${this.chatBaseUrl()}): ${(error as Error).message}`,
        'LOCAL_UNAVAILABLE',
        error
      );
    }
  }

  async chatCloud(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    const { cloud } = this.config.inference;

    if (!cloud.apiKey) {
      throw new InferenceError(
        'OPENROUTER_API_KEY не задан — облачный маршрут недоступен',
        'CLOUD_UNAVAILABLE'
      );
    }

    const messages =
      request.messages ||
      [
        ...(request.systemPrompt
          ? [{ role: 'system', content: request.systemPrompt }]
          : []),
        { role: 'user', content: request.prompt },
      ];

    try {
      const data = await this.fetchJson(
        `${cloud.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cloud.apiKey}`,
            'HTTP-Referer': 'https://github.com/evocode/evocode',
            'X-Title': 'Evocode',
          },
          body: JSON.stringify({
            messages,
            model: request.model || cloud.model,
            max_tokens: request.maxTokens,
            temperature: request.temperature ?? 0.7,
          }),
        },
        this.config.inference.local.timeout
      );

      return {
        text: data.choices?.[0]?.message?.content || '',
        model: request.model || cloud.model,
        latency: Date.now() - startTime,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        source: 'cloud',
      };
    } catch (error) {
      throw new InferenceError(
        `Cloud chat failed: ${(error as Error).message}`,
        'CLOUD_UNAVAILABLE',
        error
      );
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    const { local } = this.config.inference;
    const base = this.embedBaseUrl();
    try {
      const data = await this.fetchJson(
        `${base}/v1/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: text,
            model: this.embedProfile?.model || local.model,
          }),
        },
        Math.min(local.timeout, 30)
      );
      const emb = data.data?.[0]?.embedding;
      if (!Array.isArray(emb) || emb.length === 0) {
        throw new Error('empty embedding');
      }
      return emb;
    } catch (error) {
      throw new InferenceError(
        `Embeddings failed (${base}): ${(error as Error).message}`,
        'EMBEDDING_FAILED',
        error
      );
    }
  }
}

export const inferenceEngine = new InferenceEngine();
