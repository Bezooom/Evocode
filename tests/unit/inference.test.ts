// Тесты для Inference Engine (без реального llama — ожидаем явные ошибки)
import { InferenceEngine, InferenceError } from '../../src/engine/inference';
import { spawn } from 'child_process';

jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    on: jest.fn(),
    kill: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
  }),
}));

describe('InferenceEngine', () => {
  let engine: InferenceEngine;

  beforeEach(() => {
    engine = new InferenceEngine({
      inference: {
        local: {
          enabled: true,
          port: 9999, // offline port
          host: 'http://127.0.0.1',
          model: 'dummy',
          nPredict: 10,
          timeout: 1,
          startupTimeout: 1,
          binary: 'dummy',
        },
        fim: {
          enabled: true,
          port: 9998, // offline port
          host: 'http://127.0.0.1',
          model: 'dummy',
        },
        cloud: {
          provider: 'dummy',
          model: 'dummy',
          apiKey: '',
          baseUrl: 'http://127.0.0.1',
        },
      },
    } as any);
    // profiles.json otherwise overrides port → live :8080 on this machine
    engine.bindChatProfile(
      {
        role: 'chat',
        binary: 'dummy',
        model: 'dummy',
        port: 9999,
        args: [],
      },
      false
    );
    jest.clearAllMocks();
  });

  it('создаёт инстанс', () => {
    expect(engine).toBeDefined();
    expect(spawn).toBeDefined();
  });

  it('stopLocalServer без процесса — ok', async () => {
    await expect(engine.stopLocalServer()).resolves.toBeUndefined();
  });

  it('fim бросает InferenceError если сервер недоступен', async () => {
    await expect(engine.fim({ prompt: 'def hello():\n    ' })).rejects.toBeInstanceOf(
      InferenceError
    );
  });

  it('chat бросает InferenceError если сервер недоступен', async () => {
    await expect(engine.chat({ prompt: 'Привет!' })).rejects.toBeInstanceOf(InferenceError);
  });

  it('chatCloud без API-ключа — CLOUD_UNAVAILABLE', async () => {
    try {
      await engine.chatCloud({ prompt: 'Привет!' });
      fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(InferenceError);
      expect((e as InferenceError).code).toBe('CLOUD_UNAVAILABLE');
    }
  });

  it('getEmbeddings бросает при недоступном сервере', async () => {
    await expect(engine.getEmbeddings('test')).rejects.toBeInstanceOf(InferenceError);
  });
});
