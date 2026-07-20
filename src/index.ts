/**
 * Эвокод Core — privacy brain для IDE (VSCodium + fork kilo-vscode).
 * HTTP API: health, chat, index-file, OpenAI-compatible /v1/*
 */
import { inferenceEngine, InferenceError } from './engine/inference';
import { runtimeManager } from './engine/runtime-manager';
import { smartRouter } from './router/smart-router';
import { skillSyncEngine } from './sync/skill-sync';
import { DLPBlockedError } from './guard/dlp-guard';
import { vectorIndex } from './indexer/vector-index';
import { skillLoader } from './skills/skill-loader';
import { defaultConfig, initConfig, saveConfig } from './core/config';
import { contentToText } from './core/text';
import * as http from 'http';
import { ProxyAgent } from 'undici';

export interface ChatResult {
  answer: string;
  model: string;
  source: string;
  route: string;
  reason: string;
  skills: string[];
  dlpChanges: number;
  latency: number;
}

async function initialize(): Promise<void> {
  initConfig();
  console.log('🧬 Инициализация Эвокод Core...');
  console.log(`   mode=${defaultConfig.mode}, privacy=${defaultConfig.router.privacyMode}`);

  try {
    await inferenceEngine.startLocalServer();
  } catch (err) {
    console.warn(
      '⚠️ Локальный llama-server не запущен. Local-запросы будут ошибкой; cloud — при наличии ключа.',
      (err as Error).message
    );
  }

  if (defaultConfig.sync.enabled) {
    console.log('📚 Синхронизация навыков...');
    try {
      await skillSyncEngine.sync();
      skillLoader.invalidate();
    } catch (err) {
      console.warn('Skill sync пропущен:', (err as Error).message);
    }
  }

  const skills = skillLoader.loadAll();
  console.log(`✅ Эвокод готов (${skills.length} навыков на диске)`);
}

/** Полный pipeline: skills → RAG → router → (DLP only if cloud) → inference */
export async function handleRequest(query: string | unknown): Promise<ChatResult> {
  const text = contentToText(query);
  const skillInj = skillLoader.buildInjection(text);

  let ragContext = '';
  try {
    const queryEmbedding = await inferenceEngine.getEmbeddings(text.slice(0, 2000));
    const relevantChunks = vectorIndex.search(queryEmbedding, 3);
    if (relevantChunks.length > 0) {
      ragContext =
        'Контекст из кодовой базы:\n' +
        relevantChunks.map((c) => `[${c.filePath}]\n${c.content}`).join('\n\n') +
        '\n\n';
    }
  } catch {
    // RAG optional when embeddings unavailable
    ragContext = '';
  }

  const systemPrompt = [skillInj.text, ragContext].filter(Boolean).join('\n\n');

  const context = smartRouter.analyzeTask({
    prompt: text,
    systemPrompt,
  });

  const { response, meta } = await smartRouter.processRequest(
    { prompt: text, systemPrompt: systemPrompt || undefined },
    context
  );

  return {
    answer: response.text,
    model: response.model,
    source: response.source,
    route: meta.decision,
    reason: meta.reason,
    skills: skillInj.skills.map((s) => s.name),
    dlpChanges: meta.dlpChanges,
    latency: response.latency,
  };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 2 * 1024 * 1024;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function mapError(err: unknown): { status: number; body: Record<string, unknown> } {
  if (err instanceof DLPBlockedError) {
    return {
      status: 403,
      body: {
        error: {
          message: err.message,
          type: 'dlp_blocked',
          changes: err.changes.length,
        },
      },
    };
  }
  if (err instanceof InferenceError) {
    return {
      status: 503,
      body: {
        error: {
          message: err.message,
          type: err.code.toLowerCase(),
        },
      },
    };
  }
  const code = (err as { code?: string })?.code;
  if (code === 'UNKNOWN_PROFILE') {
    return {
      status: 404,
      body: { error: { message: (err as Error).message, type: 'unknown_profile' } },
    };
  }
  if (code === 'BINARY_MISSING' || code === 'MODEL_MISSING') {
    return {
      status: 400,
      body: { error: { message: (err as Error).message, type: code.toLowerCase() } },
    };
  }
  return {
    status: 500,
    body: { error: { message: String((err as Error)?.message || err), type: 'internal' } },
  };
}

/** После start chat-профиля — синхронизировать InferenceEngine */
async function applyRuntimeToInference(profileId: string, online: boolean): Promise<void> {
  const p = runtimeManager.getProfile(profileId);
  if (!p) return;
  if (p.role === 'chat') {
    inferenceEngine.bindChatProfile(p, online);
    if (online) {
      await inferenceEngine.refreshLocalReady();
    }
  } else if (p.role === 'embed') {
    inferenceEngine.bindEmbedProfile(p);
  }
}

export function isAuthorized(
  remoteAddress: string | undefined,
  headers: http.IncomingHttpHeaders,
  authToken: string
): boolean {
  if (!authToken) return true;

  const ip = remoteAddress || '';
  const isLocal =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost';

  if (isLocal) return true;

  const authHeader = headers['authorization'] || '';
  const expected = `Bearer ${authToken}`;
  return authHeader === expected;
}

async function main(): Promise<void> {
  await initialize();

  const server = http.createServer(async (req, res) => {
    if (!isAuthorized(req.socket.remoteAddress, req.headers, defaultConfig.security.authToken)) {
      sendJson(res, 401, { error: { message: 'Unauthorized (invalid or missing token)', type: 'unauthorized' } });
      return;
    }

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    const url = req.url?.split('?')[0] || '/';

    try {
      if (req.method === 'GET' && url === '/health') {
        await inferenceEngine.refreshLocalReady();
        sendJson(res, 200, {
          status: 'ok',
          version: defaultConfig.appVersion,
          product: 'evocode-core',
          localReady: inferenceEngine.isLocalReady(),
          skills: skillLoader.loadAll().length,
          runtime: inferenceEngine.getRuntimeInfo(),
        });
        return;
      }

      // ─── P0 Runtime: модели / llama из UI ───────────────────────────
      if (req.method === 'GET' && (url === '/v1/runtime' || url === '/v1/runtime/status')) {
        await inferenceEngine.refreshLocalReady();
        const status = await runtimeManager.getStatus(inferenceEngine.isLocalReady());
        sendJson(res, 200, status);
        return;
      }

      if (req.method === 'GET' && url === '/v1/runtime/profiles') {
        const status = await runtimeManager.getStatus(inferenceEngine.isLocalReady());
        sendJson(res, 200, {
          profiles: status.profiles,
          forks: status.forks,
          modelsDir: status.modelsDir,
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/runtime/start') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const profileId = body.profile || body.profileId || body.id;
        if (!profileId || typeof profileId !== 'string') {
          sendJson(res, 400, {
            error: {
              message: 'Укажите profile (например coder, chat-buun, embed-nomic)',
              type: 'invalid_request',
            },
          });
          return;
        }
        const result = await runtimeManager.start(profileId, {
          force: !!body.force,
          waitSec: body.waitSec,
        });
        await applyRuntimeToInference(profileId, result.ok || result.profile.online);
        sendJson(res, result.ok ? 200 : 202, result);
        return;
      }

      if (req.method === 'POST' && url === '/v1/runtime/stop') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const profileId = body.profile || body.profileId || body.id;
        if (!profileId && !body.all) {
          sendJson(res, 400, {
            error: {
              message: 'Укажите profile или all:true',
              type: 'invalid_request',
            },
          });
          return;
        }
        const result = await runtimeManager.stop(
          body.all || profileId === 'all' ? undefined : String(profileId)
        );
        await inferenceEngine.refreshLocalReady();
        sendJson(res, 200, {
          ...result,
          localReady: inferenceEngine.isLocalReady(),
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/runtime/switch') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const profileId = body.profile || body.profileId || body.id;
        if (!profileId) {
          sendJson(res, 400, {
            error: { message: 'Укажите profile для переключения', type: 'invalid_request' },
          });
          return;
        }
        // stop same-role peers via start(force)
        const result = await runtimeManager.start(profileId, { force: true });
        await applyRuntimeToInference(profileId, result.ok || result.profile.online);
        sendJson(res, result.ok ? 200 : 202, { ...result, switched: true });
        return;
      }

      if (req.method === 'POST' && url === '/v1/skills/sync') {
        const result = await skillSyncEngine.sync();
        skillLoader.invalidate();
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'GET' && url === '/v1/skills') {
        const all = skillLoader.loadAll(true);
        sendJson(res, 200, { skills: all });
        return;
      }

      if (req.method === 'POST' && url === '/v1/skills/user') {
        const body = JSON.parse(await readBody(req) || '{}');
        const name = String(body.name || '').trim();
        const content = String(body.content || '');
        if (!name) {
          sendJson(res, 400, { error: { message: 'Имя навыка обязательно', type: 'invalid_request' } });
          return;
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
          sendJson(res, 400, { error: { message: 'Имя: только латиница, цифры, . _ -', type: 'invalid_request' } });
          return;
        }
        const fs = await import('fs');
        const pathModule = await import('path');
        const userSkillDir = pathModule.join(defaultConfig.skills.userPath, name);
        fs.mkdirSync(userSkillDir, { recursive: true });
        const skillFile = pathModule.join(userSkillDir, 'SKILL.md');

        let finalContent = content;
        if (!finalContent) {
          finalContent = [
            '---',
            `name: ${name}`,
            'description: Описание вашего кастомного навыка',
            `triggers: [${name}]`,
            '---',
            `# Навык: ${name}`,
            '',
            'Инструкции для AI-агента...',
            '',
          ].join('\n');
        }

        fs.writeFileSync(skillFile, finalContent, 'utf-8');
        skillLoader.invalidate();
        sendJson(res, 200, { success: true, path: pathModule.resolve(skillFile) });
        return;
      }

      if (req.method === 'DELETE' && url === '/v1/skills/user') {
        const body = JSON.parse(await readBody(req) || '{}');
        const name = String(body.name || '').trim();
        if (!name) {
          sendJson(res, 400, { error: { message: 'Имя навыка обязательно', type: 'invalid_request' } });
          return;
        }
        const fs = await import('fs');
        const pathModule = await import('path');
        const userSkillDir = pathModule.join(defaultConfig.skills.userPath, name);
        const skillFile = pathModule.join(userSkillDir, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          fs.unlinkSync(skillFile);
        }
        if (fs.existsSync(userSkillDir)) {
          try {
            const files = fs.readdirSync(userSkillDir);
            if (files.length === 0) {
              fs.rmdirSync(userSkillDir);
            }
          } catch {
            /* */
          }
        }
        skillLoader.invalidate();
        sendJson(res, 200, { success: true });
        return;
      }

      if (req.method === 'GET' && url === '/v1/config') {
        sendJson(res, 200, {
          inference: {
            cloud: defaultConfig.inference.cloud,
          },
          router: {
            privacyMode: defaultConfig.router.privacyMode,
            localMaxTokens: defaultConfig.router.localMaxTokens,
            cloudMinTokens: defaultConfig.router.cloudMinTokens,
          },
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/config') {
        const body = JSON.parse(await readBody(req) || '{}');
        if (body.inference?.cloud) {
          Object.assign(defaultConfig.inference.cloud, body.inference.cloud);
        }
        if (body.router) {
          if (body.router.privacyMode !== undefined) {
            defaultConfig.router.privacyMode = body.router.privacyMode;
          }
          if (body.router.localMaxTokens !== undefined) {
            defaultConfig.router.localMaxTokens = Number(body.router.localMaxTokens);
          }
          if (body.router.cloudMinTokens !== undefined) {
            defaultConfig.router.cloudMinTokens = Number(body.router.cloudMinTokens);
          }
        }
        saveConfig(defaultConfig);
        sendJson(res, 200, { success: true });
        return;
      }

      if (req.method === 'GET' && (url === '/v1/models' || url === '/models')) {
        sendJson(res, 200, {
          object: 'list',
          data: [
            {
              id: 'evocode-local',
              object: 'model',
              owned_by: 'evocode',
            },
            {
              id: 'evocode-auto',
              object: 'model',
              owned_by: 'evocode',
            },
            {
              id: defaultConfig.inference.local.model,
              object: 'model',
              owned_by: 'evocode-local',
            },
          ],
        });
        return;
      }

      if (req.method === 'POST' && url === '/chat') {
        const body = JSON.parse(await readBody(req));
        const query = contentToText(body.query || body.message || body.prompt);
        if (!query) {
          sendJson(res, 400, { error: 'No query provided' });
          return;
        }
        const result = await handleRequest(query);
        sendJson(res, 200, {
          ...result,
          answer: `🤖 Эвокод (${result.source}/${result.route}): ${result.answer}`,
        });
        return;
      }

      // OpenAI-compatible — точка входа для fork kilo-vscode / любых SDK
      if (req.method === 'POST' && url === '/v1/chat/completions') {
        const body = JSON.parse(await readBody(req));
        const messages: { role: string; content: unknown }[] = body.messages || [];
        const userRaw = [...messages].reverse().find((m) => m.role === 'user')?.content;
        const userText = contentToText(userRaw);
        if (!userText) {
          sendJson(res, 400, {
            error: { message: 'messages must include a user turn', type: 'invalid_request' },
          });
          return;
        }

        const systemFromClient = messages
          .filter((m) => m.role === 'system')
          .map((m) => contentToText(m.content))
          .join('\n');

        const skillInj = skillLoader.buildInjection(userText);
        let ragContext = '';
        
        const uaRaw = req.headers['user-agent'] || '';
        const userAgent = (Array.isArray(uaRaw) ? uaRaw.join(' ') : uaRaw).toLowerCase();
        const clientRaw = req.headers['x-client'] || req.headers['x-title'] || '';
        const clientHeader = (Array.isArray(clientRaw) ? clientRaw.join(' ') : clientRaw).toLowerCase();
        const isAgent =
          userAgent.includes('kilo') ||
          userAgent.includes('evocode') ||
          clientHeader.includes('kilo') ||
          clientHeader.includes('evocode');
          
        const skipCoreRag = defaultConfig.router.preferKiloIndexing && isAgent;

        if (!skipCoreRag) {
          try {
            const emb = await inferenceEngine.getEmbeddings(userText.slice(0, 2000));
            const chunks = vectorIndex.search(emb, 3);
            if (chunks.length) {
              ragContext = chunks.map((c) => `[${c.filePath}]\n${c.content}`).join('\n\n');
            }
          } catch {
            /* optional */
          }
        }

        const systemPrompt = [systemFromClient, skillInj.text, ragContext]
          .filter(Boolean)
          .join('\n\n');

        // Normalize message content to strings for local inference / router
        const updatedMessages = messages.map((m) => ({
          role: m.role,
          content: contentToText(m.content),
        }));
        const sysIndex = updatedMessages.findIndex((m) => m.role === 'system');
        if (sysIndex !== -1) {
          updatedMessages[sysIndex] = { role: 'system', content: systemPrompt };
        } else if (systemPrompt) {
          updatedMessages.unshift({ role: 'system', content: systemPrompt });
        }

        // Решение о маршрутизации
        const context = smartRouter.analyzeTask({
          prompt: userText,
          systemPrompt,
          maxTokens: body.max_tokens,
          temperature: body.temperature,
        });

        let { decision, reason } = await smartRouter.route(context);
        // Hard safety: never hit cloud without a real key (OpenRouter 401 Missing Authentication header)
        if (decision === 'cloud' && !defaultConfig.inference.cloud.apiKey) {
          decision = 'local';
          reason = `${reason}; forced local (no OPENROUTER_API_KEY)`;
        }
        console.log(`Маршрутизация: ${decision} (${reason})`);

        let targetUrl = '';
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        let requestBody: Record<string, unknown> = { ...body, messages: updatedMessages };

        if (decision === 'local') {
          const port = defaultConfig.inference.local.port;
          targetUrl = `http://127.0.0.1:${port}/v1/chat/completions`;
        } else {
          // Применяем DLP Guard на облачном пути
          const { dlpGuard } = await import('./guard/dlp-guard');
          const dlpResult = await dlpGuard.processRequest({
            prompt: userText,
            systemPrompt,
          });

          // Обновляем сообщения с замаскированным промптом
          const maskedMessages = updatedMessages.map((m) => {
            if (m.role === 'user') return { ...m, content: dlpResult.prompt };
            if (m.role === 'system') return { ...m, content: dlpResult.systemPrompt || '' };
            return m;
          });

          const cloud = defaultConfig.inference.cloud;
          const isAnthropic = cloud.provider === 'anthropic' || cloud.baseUrl.includes('api.anthropic.com');
          const isGemini = cloud.provider === 'gemini' || cloud.baseUrl.includes('googleapis.com');

          if (isAnthropic) {
            targetUrl = `${cloud.baseUrl}/messages`;
            headers['x-api-key'] = cloud.apiKey;
            headers['anthropic-version'] = '2023-06-01';

            const systemMsg = maskedMessages.find(m => m.role === 'system')?.content || '';
            const userMsgs = maskedMessages
              .filter(m => m.role !== 'system')
              .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
              }));

            requestBody = {
              model: body.model || cloud.model || 'claude-3-5-sonnet-20241022',
              messages: userMsgs,
              system: systemMsg || undefined,
              max_tokens: body.max_tokens || 4096,
              temperature: body.temperature ?? 0.7,
              stream: body.stream || false
            };
          } else {
            let actualBaseUrl = cloud.baseUrl;
            if (actualBaseUrl.endsWith('/')) {
              actualBaseUrl = actualBaseUrl.slice(0, -1);
            }
            targetUrl = `${actualBaseUrl}/chat/completions`;
            if (isGemini && !actualBaseUrl.includes('key=')) {
              targetUrl += `?key=${cloud.apiKey}`;
            } else {
              headers['Authorization'] = `Bearer ${cloud.apiKey}`;
            }

            if (cloud.provider === 'openrouter' || actualBaseUrl.includes('openrouter.ai')) {
              headers['HTTP-Referer'] = 'https://github.com/evocode/evocode';
              headers['X-Title'] = 'Evocode';
            }

            requestBody = { ...body, messages: maskedMessages };
          }
        }

        const startTime = Date.now();
        const doFetch = async (url: string, hdrs: Record<string, string>, bodyObj: unknown) => {
          const fetchOptions: any = {
            method: 'POST',
            headers: hdrs,
            body: JSON.stringify(bodyObj),
            signal: AbortSignal.timeout(defaultConfig.inference.local.timeout * 1000),
          };
          const proxyUrl =
            defaultConfig.inference.cloud.proxyUrl ||
            process.env.HTTP_PROXY ||
            process.env.HTTPS_PROXY;
          if (proxyUrl && decision === 'cloud') {
            fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
          }
          return fetch(url, fetchOptions);
        };

        let response = await doFetch(targetUrl, headers, requestBody);

        // Cloud 401/403 without valid key → retry local once
        if (
          !response.ok &&
          decision === 'cloud' &&
          (response.status === 401 || response.status === 403)
        ) {
          console.warn(`Cloud ${response.status} → fallback local`);
          decision = 'local';
          reason = `${reason}; fallback local after cloud ${response.status}`;
          const port = defaultConfig.inference.local.port;
          targetUrl = `http://127.0.0.1:${port}/v1/chat/completions`;
          headers = { 'Content-Type': 'application/json' };
          requestBody = { ...body, messages: updatedMessages };
          response = await doFetch(targetUrl, headers, requestBody);
        }

        if (!response.ok) {
          const errText = await response.text();
          sendJson(res, response.status >= 400 && response.status < 600 ? response.status : 502, {
            error: { message: `Inference failed: ${errText}`, type: 'inference_failed' },
          });
          return;
        }

        const latency = Date.now() - startTime;

        // Добавляем заголовки Evocode
        res.setHeader('X-Evocode-Route', decision);
        res.setHeader('X-Evocode-Source', decision);
        res.setHeader('X-Evocode-Latency', String(latency));

        if (body.stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          });

          if (response.body) {
            let buffer = '';
            const decoder = new TextDecoder();
            
            const cloud = defaultConfig.inference.cloud;
            const isAnthropic = cloud.provider === 'anthropic' || cloud.baseUrl.includes('api.anthropic.com');

            if (decision === 'cloud' && isAnthropic) {
              for await (const byteChunk of response.body as any) {
                buffer += decoder.decode(byteChunk, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  if (trimmed.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(trimmed.slice(6));
                      if (data.type === 'content_block_delta' && data.delta?.text) {
                        const openaiChunk = {
                          id: 'chatcmpl-anthropic',
                          object: 'chat.completion.chunk',
                          created: Math.floor(Date.now() / 1000),
                          model: body.model || cloud.model,
                          choices: [
                            {
                              index: 0,
                              delta: {
                                content: data.delta.text
                              },
                              finish_reason: null
                            }
                          ]
                        };
                        res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);
                      } else if (data.type === 'message_stop') {
                        res.write('data: [DONE]\n\n');
                      }
                    } catch {
                      /* */
                    }
                  }
                }
              }
              res.end();
              return;
            }

            // Читаем поток из fetch
            for await (const byteChunk of response.body as any) {
              buffer += decoder.decode(byteChunk, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed === 'data: [DONE]') {
                  res.write('data: [DONE]\n\n');
                  continue;
                }
                if (trimmed.startsWith('data: ')) {
                  try {
                    const jsonText = trimmed.slice(6);
                    const data = JSON.parse(jsonText);
                    
                    // Инжектируем id и type в tool_calls в choices.delta
                    if (data.choices) {
                      for (const choice of data.choices) {
                        if (choice.delta && choice.delta.tool_calls) {
                          for (const tc of choice.delta.tool_calls) {
                            if (!tc.id) {
                              tc.id = `call_${Math.random().toString(36).substring(2, 12)}`;
                            }
                            if (!tc.type) {
                              tc.type = 'function';
                            }
                          }
                        }
                      }
                    }
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                  } catch (err) {
                    res.write(`${line}\n`);
                  }
                } else {
                  res.write(`${line}\n`);
                }
              }
            }
          }
          res.end();
          return;
        } else {
          // Не-стриминговый ответ
          let data = (await response.json()) as any;

          const cloud = defaultConfig.inference.cloud;
          const isAnthropic = cloud.provider === 'anthropic' || cloud.baseUrl.includes('api.anthropic.com');

          if (decision === 'cloud' && isAnthropic) {
            data = {
              id: data.id || 'msg-anthropic',
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: data.model || body.model || cloud.model,
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: data.content?.[0]?.text || ''
                  },
                  finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
                }
              ],
              usage: {
                prompt_tokens: data.usage?.input_tokens || 0,
                completion_tokens: data.usage?.output_tokens || 0,
                total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
              }
            };
          }
          
          // Корректируем tool_calls
          if (data.choices) {
            for (const choice of data.choices) {
              if (choice.message && choice.message.tool_calls) {
                for (const tc of choice.message.tool_calls) {
                  if (!tc.id) {
                    tc.id = `call_${Math.random().toString(36).substring(2, 12)}`;
                  }
                  if (!tc.type) {
                    tc.type = 'function';
                  }
                }
              }
            }
          }

          // Добавляем метаданные Evocode
          data.evocode = {
            route: decision,
            reason,
            source: decision,
            skills: skillInj.skills.map((s) => s.name),
            latency,
          };

          sendJson(res, 200, data);
          return;
        }
      }

      if (req.method === 'POST' && url === '/index-file') {
        const body = JSON.parse(await readBody(req));
        const { filePath, content } = body;
        if (!filePath || !content) {
          sendJson(res, 400, { error: 'Missing filePath or content' });
          return;
        }
        const embedding = await inferenceEngine.getEmbeddings(
          String(content).substring(0, 1000)
        );
        const id = vectorIndex.insertChunk(filePath, content, embedding);
        sendJson(res, 200, { success: true, id });
        return;
      }

      if (req.method === 'POST' && url === '/v1/embeddings') {
        const body = JSON.parse(await readBody(req));
        const input = body.input;
        const texts = Array.isArray(input) ? input : [input];
        const data = [];
        for (let i = 0; i < texts.length; i++) {
          const emb = await inferenceEngine.getEmbeddings(String(texts[i]).slice(0, 8000));
          data.push({ object: 'embedding', index: i, embedding: emb });
        }
        sendJson(res, 200, { object: 'list', data, model: body.model || 'evocode-embed' });
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (error) {
      const mapped = mapError(error);
      sendJson(res, mapped.status, mapped.body);
    }
  });

  // 8083 — не конфликтует с chat:8080 и legacy embed:8081
  const PORT = Number(process.env.PORT || 8083);
  server.listen(PORT, () => {
    console.log(`🚀 Evocode Core :${PORT}`);
    console.log(`   OpenAI-compat: POST http://127.0.0.1:${PORT}/v1/chat/completions`);
    console.log(`   Health:        GET  http://127.0.0.1:${PORT}/health`);
    console.log(`   Runtime API:   GET  /v1/runtime  POST /v1/runtime/start|stop|switch`);
    console.log(`   Runtime:       ${JSON.stringify(inferenceEngine.getRuntimeInfo())}`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { initialize, inferenceEngine, runtimeManager, smartRouter, skillLoader };
